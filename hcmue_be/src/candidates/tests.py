from io import BytesIO
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from core.choices import ActionsChoices, RoleChoices, ScoreTypeChoices
from src.programs.models import Subject
from src.candidates.models import Candidate, CandidateLog, PriorityObject, PriorityObjectLog, Region, RegionLog, RegionPriority, ScoreBoard, SubjectScore


def make_xlsx(headers, rows):
    content = BytesIO()
    all_rows = [headers] + rows
    sheet_rows = []
    for row_index, row in enumerate(all_rows, 1):
        cells = []
        for column_index, value in enumerate(row, 1):
            column = chr(ord('A') + column_index - 1)
            ref = f'{column}{row_index}'
            if value is None or value == '':
                cells.append(f'<c r="{ref}"/>')
            elif isinstance(value, (int, float)):
                cells.append(f'<c r="{ref}"><v>{value}</v></c>')
            else:
                cells.append(f'<c r="{ref}" t="inlineStr"><is><t>{escape(str(value))}</t></is></c>')
        sheet_rows.append(f'<row r="{row_index}">{"".join(cells)}</row>')
    worksheet = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        f'<sheetData>{"".join(sheet_rows)}</sheetData>'
        '</worksheet>'
    )
    with ZipFile(content, 'w', ZIP_DEFLATED) as archive:
        archive.writestr('[Content_Types].xml', (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            '</Types>'
        ))
        archive.writestr('_rels/.rels', (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            '</Relationships>'
        ))
        archive.writestr('xl/workbook.xml', (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            '<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>'
            '</workbook>'
        ))
        archive.writestr('xl/_rels/workbook.xml.rels', (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            '</Relationships>'
        ))
        archive.writestr('xl/worksheets/sheet1.xml', worksheet)
    content.seek(0)
    return SimpleUploadedFile(
        'import.xlsx',
        content.read(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )


class CandidateImportApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username='admin',
            password='password123',
            fullname='Admin',
            role=RoleChoices.ADMIN,
        )
        self.client.force_authenticate(self.user)

    def test_import_regions_creates_region_master_data(self):
        file = make_xlsx(['KV', 'DiemUT'], [['KVX', 0.75]])

        response = self.client.post(
            '/api/v1/candidates/regions/import/',
            {'file': file},
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 1)
        self.assertEqual(response.data['updated'], 0)
        self.assertEqual(response.data['errors'], [])

    def test_import_priority_objects_creates_priority_object_master_data(self):
        file = make_xlsx(['DT', 'DiemUT'], [['DT1', 1.0]])

        response = self.client.post(
            '/api/v1/candidates/priority-objects/import/',
            {'file': file},
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 1)
        self.assertEqual(response.data['errors'], [])
        self.assertTrue(PriorityObject.objects.filter(code='DT1', bonus_score=1.0).exists())

    def test_candidate_import_rejects_unknown_region_code(self):
        file = make_xlsx(
            ['CCCD', 'KV', 'DT', 'NamTN', 'HocLuc12', 'DiemTN'],
            [['012345678901', 'UNKNOWN', '', 2025, 1, 8.5]],
        )

        response = self.client.post(
            '/api/v1/candidates/import/',
            {'file': file},
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 0)
        self.assertEqual(response.data['errors'][0]['code'], 'KV_NOT_FOUND')
        self.assertFalse(Candidate.objects.filter(cccd='012345678901').exists())

    def test_candidate_import_rejects_invalid_academic_level(self):
        region_file = make_xlsx(['KV', 'DiemUT'], [['KV1', 0.25]])
        self.client.post('/api/v1/candidates/regions/import/', {'file': region_file}, format='multipart')
        file = make_xlsx(
            ['CCCD', 'KV', 'DT', 'NamTN', 'HocLuc12', 'DiemTN'],
            [['012345678901', 'KV1', '', 2025, 2, 8.5]],
        )

        response = self.client.post(
            '/api/v1/candidates/import/',
            {'file': file},
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 0)
        self.assertEqual(response.data['errors'][0]['code'], 'HOC_LUC_INVALID')
        self.assertFalse(Candidate.objects.filter(cccd='012345678901').exists())

    def test_candidate_import_rejects_unknown_priority_object_code(self):
        region_file = make_xlsx(['KV', 'DiemUT'], [['KV1', 0.25]])
        self.client.post('/api/v1/candidates/regions/import/', {'file': region_file}, format='multipart')
        file = make_xlsx(
            ['CCCD', 'KV', 'DT', 'NamTN', 'HocLuc12', 'DiemTN'],
            [['012345678901', 'KV1', 'UNKNOWN', 2025, 1, 8.5]],
        )

        response = self.client.post('/api/v1/candidates/import/', {'file': file}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 0)
        self.assertEqual(response.data['errors'][0]['code'], 'DT_NOT_FOUND')
        self.assertFalse(Candidate.objects.filter(cccd='012345678901').exists())

    def test_candidate_import_creates_candidate_and_region_priority(self):
        region_file = make_xlsx(['KV', 'DiemUT'], [['KV1', 0.25]])
        self.client.post('/api/v1/candidates/regions/import/', {'file': region_file}, format='multipart')
        priority_file = make_xlsx(['DT', 'DiemUT'], [['DT1', 1.0]])
        self.client.post('/api/v1/candidates/priority-objects/import/', {'file': priority_file}, format='multipart')
        file = make_xlsx(
            ['CCCD', 'KV', 'DT', 'NamTN', 'HocLuc12', 'DiemTN'],
            [['012345678901', 'KV1', 'DT1', 2025, 1, 8.5]],
        )

        response = self.client.post(
            '/api/v1/candidates/import/',
            {'file': file},
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 1)
        self.assertEqual(response.data['updated'], 0)
        self.assertEqual(response.data['errors'], [])
        candidate = Candidate.objects.get(cccd='012345678901')
        self.assertEqual(candidate.graduation_year, 2025)
        self.assertEqual(candidate.academic_level, '1')
        self.assertEqual(candidate.graduation_score, 8.5)
        priority = RegionPriority.objects.get(candidate=candidate)
        self.assertEqual(priority.region_code, 'KV1')
        self.assertEqual(priority.special_code, 'DT1')
        self.assertEqual(priority.bonus_score, 1.25)

    def test_candidate_import_blank_cells_do_not_overwrite_existing_values(self):
        region_file = make_xlsx(['KV', 'DiemUT'], [['KV1', 0.25]])
        self.client.post('/api/v1/candidates/regions/import/', {'file': region_file}, format='multipart')
        priority_file = make_xlsx(['DT', 'DiemUT'], [['DT1', 1.0]])
        self.client.post('/api/v1/candidates/priority-objects/import/', {'file': priority_file}, format='multipart')
        first_file = make_xlsx(
            ['CCCD', 'KV', 'DT', 'NamTN', 'HocLuc12', 'DiemTN'],
            [['012345678901', 'KV1', 'DT1', 2025, 1, 8.5]],
        )
        self.client.post('/api/v1/candidates/import/', {'file': first_file}, format='multipart')
        second_file = make_xlsx(
            ['CCCD', 'KV', 'DT', 'NamTN', 'HocLuc12', 'DiemTN'],
            [['012345678901', '', '', '', '', '']],
        )

        response = self.client.post(
            '/api/v1/candidates/import/',
            {'file': second_file},
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 0)
        self.assertEqual(response.data['updated'], 0)
        candidate = Candidate.objects.get(cccd='012345678901')
        priority = RegionPriority.objects.get(candidate=candidate)
        self.assertEqual(candidate.graduation_year, 2025)
        self.assertEqual(candidate.academic_level, '1')
        self.assertEqual(candidate.graduation_score, 8.5)
        self.assertEqual(priority.region_code, 'KV1')
        self.assertEqual(priority.special_code, 'DT1')

    def test_candidate_import_normalizes_excel_text_cccd_with_apostrophe(self):
        region_file = make_xlsx(['KV', 'DiemUT'], [['KV1', 0.25]])
        self.client.post('/api/v1/candidates/regions/import/', {'file': region_file}, format='multipart')
        file = make_xlsx(
            ['CCCD', 'KV', 'DT', 'NamTN', 'HocLuc12', 'DiemTN'],
            [["'012345678901", 'KV1', '', 2025, 1, 8.5]],
        )

        response = self.client.post('/api/v1/candidates/import/', {'file': file}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 1)
        self.assertTrue(Candidate.objects.filter(cccd='012345678901').exists())

    def test_candidate_import_restores_single_leading_zero_lost_by_numeric_excel_cell(self):
        region_file = make_xlsx(['KV', 'DiemUT'], [['KV1', 0.25]])
        self.client.post('/api/v1/candidates/regions/import/', {'file': region_file}, format='multipart')
        file = make_xlsx(
            ['CCCD', 'KV', 'DT', 'NamTN', 'HocLuc12', 'DiemTN'],
            [[12345678901, 'KV1', '', 2025, 1, 8.5]],
        )

        response = self.client.post('/api/v1/candidates/import/', {'file': file}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 1)
        self.assertTrue(Candidate.objects.filter(cccd='012345678901').exists())


class CandidateScoreImportApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username='score-admin',
            password='password123',
            fullname='Score Admin',
            role=RoleChoices.ADMIN,
        )
        self.client.force_authenticate(self.user)
        self.candidate = Candidate.objects.create(cccd='012345678901')
        self.math = Subject.objects.create(id='TO', name='Toán')
        self.literature = Subject.objects.create(id='VA', name='Văn')
        self.physics = Subject.objects.create(id='LI', name='Lí')
        self.chemistry = Subject.objects.create(id='HO', name='Hóa')
        self.aptitude = Subject.objects.create(id='NK2', name='Năng khiếu 2')

    def test_import_thpt_scores_by_cccd(self):
        file = make_xlsx(['CCCD', 'TO', 'VA'], [['012345678901', 8.5, 7.25]])

        response = self.client.post('/api/v1/candidates/scores/thpt/import/', {'file': file}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 2)
        board = ScoreBoard.objects.get(candidate=self.candidate, score_type=ScoreTypeChoices.THPT)
        self.assertEqual(SubjectScore.objects.get(score_board=board, subject=self.math).score, 8.5)
        self.assertEqual(SubjectScore.objects.get(score_board=board, subject=self.literature).score, 7.25)

    def test_import_nang_luc_scores_maps_columns_to_base_subjects(self):
        file = make_xlsx(['CCCD', 'TO_NL', 'VA_NL'], [['012345678901', 9.5, 8.75]])

        response = self.client.post('/api/v1/candidates/scores/nang-luc/import/', {'file': file}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 2)
        board = ScoreBoard.objects.get(candidate=self.candidate, score_type=ScoreTypeChoices.DGNL)
        self.assertEqual(SubjectScore.objects.get(score_board=board, subject=self.math).score, 9.5)
        self.assertEqual(SubjectScore.objects.get(score_board=board, subject=self.literature).score, 8.75)

    def test_import_nang_luc_scores_rejects_score_above_ten(self):
        file = make_xlsx(['CCCD', 'TO_NL'], [['012345678901', 11]])

        response = self.client.post('/api/v1/candidates/scores/nang-luc/import/', {'file': file}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 0)
        self.assertEqual(response.data['errors'][0]['code'], 'SCORE_OUT_OF_RANGE')

    def test_import_nang_khieu_scores_uses_cb_score_type(self):
        file = make_xlsx(['CCCD', 'NK2'], [['012345678901', 9.5]])

        response = self.client.post('/api/v1/candidates/scores/nang-khieu/import/', {'file': file}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 1)
        board = ScoreBoard.objects.get(candidate=self.candidate, score_type=ScoreTypeChoices.CB)
        self.assertEqual(SubjectScore.objects.get(score_board=board, subject=self.aptitude).score, 9.5)

    def test_import_hoc_ba_scores_maps_hb_columns_to_base_subjects(self):
        file = make_xlsx(['CCCD', 'TO_HB', 'VA_HB'], [['012345678901', 9.0, 8.75]])

        response = self.client.post('/api/v1/candidates/scores/hoc-ba/import/', {'file': file}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 2)
        board = ScoreBoard.objects.get(candidate=self.candidate, score_type=ScoreTypeChoices.HOCBA)
        self.assertEqual(SubjectScore.objects.get(score_board=board, subject=self.math).score, 9.0)
        self.assertEqual(SubjectScore.objects.get(score_board=board, subject=self.literature).score, 8.75)

    def test_import_scores_rejects_unknown_candidate(self):
        file = make_xlsx(['CCCD', 'TO'], [['999999999999', 8.5]])

        response = self.client.post('/api/v1/candidates/scores/thpt/import/', {'file': file}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 0)
        self.assertEqual(response.data['errors'][0]['code'], 'CANDIDATE_NOT_FOUND')

    def test_import_scores_normalizes_excel_text_cccd_with_apostrophe(self):
        file = make_xlsx(['CCCD', 'TO'], [["'012345678901", 8.5]])

        response = self.client.post('/api/v1/candidates/scores/thpt/import/', {'file': file}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 1)
        board = ScoreBoard.objects.get(candidate=self.candidate, score_type=ScoreTypeChoices.THPT)
        self.assertEqual(SubjectScore.objects.get(score_board=board, subject=self.math).score, 8.5)

    def test_import_scores_blank_cells_do_not_overwrite_existing_scores(self):
        board = ScoreBoard.objects.create(candidate=self.candidate, score_type=ScoreTypeChoices.THPT)
        SubjectScore.objects.create(score_board=board, subject=self.math, score=8.0)
        file = make_xlsx(['CCCD', 'TO'], [['012345678901', '']])

        response = self.client.post('/api/v1/candidates/scores/thpt/import/', {'file': file}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['skipped'], 1)
        self.assertEqual(SubjectScore.objects.get(score_board=board, subject=self.math).score, 8.0)


class CandidateManualApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username='manual-admin',
            password='password123',
            fullname='Manual Admin',
            role=RoleChoices.ADMIN,
        )
        self.client.force_authenticate(self.user)
        self.region = Region.objects.create(code='KV1', bonus_score=0.25)
        self.priority_object = PriorityObject.objects.create(code='DT1', bonus_score=1.0)
        self.math = Subject.objects.create(id='TO', name='Toán')
        self.literature = Subject.objects.create(id='VA', name='Văn')

    def test_create_region_manually(self):
        response = self.client.post(
            '/api/v1/candidates/regions/',
            {'code': 'KV2', 'bonus_score': 0.5},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['code'], 'KV2')
        self.assertEqual(response.data['data']['bonus_score'], 0.5)
        self.assertTrue(Region.objects.filter(code='KV2', bonus_score=0.5).exists())

    def test_create_priority_object_manually(self):
        response = self.client.post(
            '/api/v1/candidates/priority-objects/',
            {'code': 'DT2', 'bonus_score': 1.5},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['code'], 'DT2')
        self.assertEqual(response.data['data']['bonus_score'], 1.5)
        self.assertTrue(PriorityObject.objects.filter(code='DT2', bonus_score=1.5).exists())

    def test_create_candidate_manually_with_region_priority_and_scores(self):
        payload = {
            'cccd': '012345678901',
            'graduation_year': 2025,
            'academic_level': '1',
            'graduation_score': 8.5,
            'region_priority': {'region_code': 'KV1', 'special_code': 'DT1'},
            'scores': [
                {'score_type': 'THPT', 'subject_id': 'TO', 'score': 8.5},
                {'score_type': 'HOCBA', 'subject_id': 'VA', 'score': 9.0},
            ],
        }

        response = self.client.post('/api/v1/candidates/', payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        candidate = Candidate.objects.get(cccd='012345678901')
        self.assertEqual(response.data['data']['cccd'], candidate.cccd)
        self.assertEqual(response.data['data']['region_priority']['region_code'], 'KV1')
        self.assertEqual(response.data['data']['region_priority']['bonus_score'], 1.25)
        self.assertEqual(len(response.data['data']['scores']), 2)
        self.assertEqual(RegionPriority.objects.get(candidate=candidate).special_code, 'DT1')
        self.assertEqual(ScoreBoard.objects.filter(candidate=candidate).count(), 2)
        self.assertEqual(SubjectScore.objects.filter(score_board__candidate=candidate).count(), 2)

    def test_create_candidate_manually_accepts_dgnl_score_scale(self):
        payload = {
            'cccd': '012345678901',
            'scores': [
                {'score_type': 'DGNL', 'subject_id': 'TO', 'score': 9.5},
            ],
        }

        response = self.client.post('/api/v1/candidates/', payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        candidate = Candidate.objects.get(cccd='012345678901')
        board = ScoreBoard.objects.get(candidate=candidate, score_type=ScoreTypeChoices.DGNL)
        self.assertEqual(SubjectScore.objects.get(score_board=board, subject=self.math).score, 9.5)

    def test_create_candidate_manually_rejects_dgnl_score_above_ten(self):
        payload = {
            'cccd': '012345678901',
            'scores': [
                {'score_type': 'DGNL', 'subject_id': 'TO', 'score': 11},
            ],
        }

        response = self.client.post('/api/v1/candidates/', payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertIn('scores.0.score', response.data['details'])

    def test_create_candidate_manually_rejects_thpt_score_above_ten(self):
        payload = {
            'cccd': '012345678901',
            'scores': [
                {'score_type': 'THPT', 'subject_id': 'TO', 'score': 11},
            ],
        }

        response = self.client.post('/api/v1/candidates/', payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertIn('scores.0.score', response.data['details'])

    def test_create_candidate_rejects_duplicate_score_rows(self):
        payload = {
            'cccd': '012345678901',
            'region_priority': {'region_code': 'KV1'},
            'scores': [
                {'score_type': 'THPT', 'subject_id': 'TO', 'score': 8.5},
                {'score_type': 'THPT', 'subject_id': 'TO', 'score': 9.0},
            ],
        }

        response = self.client.post('/api/v1/candidates/', payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertEqual(response.data['error'], 'VALIDATION_ERROR')
        self.assertIn('scores.1', response.data['details'])
        self.assertFalse(Candidate.objects.filter(cccd='012345678901').exists())

    def test_patch_candidate_replaces_scores(self):
        candidate = Candidate.objects.create(cccd='012345678901', graduation_year=2025, academic_level='1')
        next_priority_object = PriorityObject.objects.create(code='DT2', bonus_score=1.5)
        RegionPriority.objects.create(
            candidate=candidate,
            region=self.region,
            priority_object=self.priority_object,
            bonus_score=self.region.bonus_score + self.priority_object.bonus_score,
        )
        board = ScoreBoard.objects.create(candidate=candidate, score_type='THPT')
        SubjectScore.objects.create(score_board=board, subject=self.math, score=8.0)
        payload = {
            'graduation_score': 8.75,
            'region_priority': {'region_code': 'KV1', 'special_code': 'DT2'},
            'scores': [
                {'score_type': 'HOCBA', 'subject_id': 'VA', 'score': 9.25},
            ],
        }

        response = self.client.patch(f'/api/v1/candidates/{candidate.id}/', payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        candidate.refresh_from_db()
        self.assertEqual(candidate.graduation_score, 8.75)
        self.assertEqual(RegionPriority.objects.get(candidate=candidate).special_code, 'DT2')
        self.assertEqual(RegionPriority.objects.get(candidate=candidate).bonus_score, self.region.bonus_score + next_priority_object.bonus_score)
        self.assertFalse(ScoreBoard.objects.filter(candidate=candidate, score_type='THPT').exists())
        self.assertEqual(SubjectScore.objects.get(score_board__candidate=candidate).subject_id, 'VA')
        self.assertEqual(response.data['data']['scores'][0]['score_type'], 'HOCBA')

    def test_delete_candidate_hard_deletes_record_and_keeps_delete_log(self):
        candidate = Candidate.objects.create(cccd='012345678901', graduation_year=2025)

        response = self.client.delete(f'/api/v1/candidates/{candidate.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Candidate.objects.filter(id=candidate.id).exists())
        log = CandidateLog.objects.get(cccd='012345678901', action=ActionsChoices.DELETE)
        self.assertIsNone(log.candidate_id)
        self.assertTrue(log.is_deleted)

    def test_delete_region_hard_deletes_record_and_keeps_delete_log(self):
        region = Region.objects.create(code='KV2', bonus_score=0.5)

        response = self.client.delete('/api/v1/candidates/regions/KV2/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Region.objects.filter(code=region.code).exists())
        log = RegionLog.objects.get(code='KV2', action=ActionsChoices.DELETE)
        self.assertIsNone(log.region_id)
        self.assertTrue(log.is_deleted)

    def test_delete_priority_object_hard_deletes_record_and_keeps_delete_log(self):
        priority_object = PriorityObject.objects.create(code='DT2', bonus_score=1.5)

        response = self.client.delete('/api/v1/candidates/priority-objects/DT2/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(PriorityObject.objects.filter(code=priority_object.code).exists())
        log = PriorityObjectLog.objects.get(code='DT2', action=ActionsChoices.DELETE)
        self.assertIsNone(log.priority_object_id)
        self.assertTrue(log.is_deleted)
