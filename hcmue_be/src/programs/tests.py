from io import BytesIO
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from core.choices import ActionsChoices, RoleChoices, ScoreTypeChoices
from src.imports.models import ImportBatch
from src.programs.models import (
    AdmissionCondition,
    CombinationSubject,
    Major,
    MajorCombination,
    Subject,
    SubjectCombination,
    SubjectCombinationLog,
    SubjectLog,
)
from src.programs.tasks import _complete_import_batch_from_summary


def make_xlsx(headers, rows):
    """
    Build a minimal .xlsx file for import API tests.

    Args:
        headers: Header row values.
        rows: Data rows to append after the header.

    Returns:
        Uploaded file object accepted by DRF multipart tests.
    """

    content = BytesIO()
    sheet_rows = []
    for row_index, row in enumerate([headers] + rows, 1):
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
        'combinations.xlsx',
        content.read(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )


class SubjectApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username='subject-admin',
            password='password123',
            fullname='Subject Admin',
            role=RoleChoices.ADMIN,
        )
        self.client.force_authenticate(self.user)

    def test_create_subject_manually(self):
        response = self.client.post(
            '/api/v1/subjects/',
            {'id': 'TO', 'name': 'Toán'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['id'], 'TO')
        self.assertEqual(response.data['data']['name'], 'Toán')
        self.assertTrue(Subject.objects.filter(id='TO', name='Toán').exists())

    def test_import_subjects_creates_subject_master_data(self):
        file = make_xlsx(['MaMon', 'TenMon'], [['TO', 'Toán'], ['LI', 'Lí']])

        response = self.client.post('/api/v1/subjects/import/', {'file': file}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 2)
        self.assertEqual(response.data['errors'], [])
        self.assertTrue(Subject.objects.filter(id='TO', name='Toán').exists())
        self.assertTrue(Subject.objects.filter(id='LI', name='Lí').exists())

    def test_patch_subject_updates_name(self):
        Subject.objects.create(id='TO', name='Old')

        response = self.client.patch('/api/v1/subjects/TO/', {'name': 'Toán'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['name'], 'Toán')
        self.assertEqual(Subject.objects.get(id='TO').name, 'Toán')

    def test_delete_subject_hard_deletes_record_and_keeps_delete_log(self):
        Subject.objects.create(id='TO', name='Toán')

        response = self.client.delete('/api/v1/subjects/TO/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Subject.objects.filter(id='TO').exists())
        log = SubjectLog.objects.get(name='Toán', action=ActionsChoices.DELETE)
        self.assertIsNone(log.subject_id)


class CombinationApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username='program-admin',
            password='password123',
            fullname='Program Admin',
            role=RoleChoices.ADMIN,
        )
        self.client.force_authenticate(self.user)
        self.math = Subject.objects.create(id='TO', name='Toán')
        self.physics = Subject.objects.create(id='LI', name='Lí')
        self.chemistry = Subject.objects.create(id='HO', name='Hóa')
        self.literature = Subject.objects.create(id='VA', name='Văn')
        self.aptitude = Subject.objects.create(id='NK2', name='Năng khiếu 2')

    def test_import_combinations_creates_combination_with_subjects(self):
        file = make_xlsx(
            ['MaTH', 'Mon1', 'Mon2', 'Mon3', 'TrongSo1', 'TrongSo2', 'TrongSo3'],
            [['A00', 'TO', 'LI', 'HO', 1, 1, 1]],
        )

        response = self.client.post('/api/v1/combinations/import/', {'file': file}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 1)
        combination = SubjectCombination.objects.get(id='A00')
        entries = list(CombinationSubject.objects.filter(subject_combination=combination).order_by('position'))
        self.assertEqual([entry.subject_id for entry in entries], ['TO', 'LI', 'HO'])
        self.assertTrue(all(entry.score_type == ScoreTypeChoices.THPT for entry in entries))

    def test_import_combinations_parses_legacy_score_type_suffixes(self):
        file = make_xlsx(
            ['MaTH', 'Mon1', 'Mon2', 'Mon3', 'TrongSo1', 'TrongSo2', 'TrongSo3'],
            [['A00HO', 'TO_HB', 'LI_NL', 'NK2', 1, 1, 1]],
        )

        response = self.client.post('/api/v1/combinations/import/', {'file': file}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 1)
        combination = SubjectCombination.objects.get(id='A00HO')
        entries = list(CombinationSubject.objects.filter(subject_combination=combination).order_by('position'))
        self.assertEqual([entry.subject_id for entry in entries], ['TO', 'LI', 'NK2'])
        self.assertEqual(
            [entry.score_type for entry in entries],
            [ScoreTypeChoices.HOCBA, ScoreTypeChoices.DGNL, ScoreTypeChoices.CB],
        )

    def test_import_combinations_rejects_duplicate_subjects(self):
        file = make_xlsx(
            ['MaTH', 'Mon1', 'Mon2', 'Mon3', 'TrongSo1', 'TrongSo2', 'TrongSo3'],
            [['A00', 'TO', 'TO', 'HO', 1, 1, 1]],
        )

        response = self.client.post('/api/v1/combinations/import/', {'file': file}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 0)
        self.assertEqual(response.data['errors'][0]['code'], 'SUBJECTS_DUPLICATE')
        self.assertFalse(SubjectCombination.objects.filter(id='A00').exists())

    def test_create_combination_manually(self):
        payload = {
            'id': 'A00',
            'name': 'Toán Lí Hóa',
            'subjects': [
                {'score_type': 'THPT', 'subject_id': 'TO', 'weight': 1},
                {'score_type': 'THPT', 'subject_id': 'LI', 'weight': 1},
                {'score_type': 'THPT', 'subject_id': 'HO', 'weight': 1},
            ],
        }

        response = self.client.post('/api/v1/combinations/', payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['id'], 'A00')
        self.assertEqual(len(response.data['data']['subjects']), 3)
        self.assertTrue(SubjectCombination.objects.filter(id='A00').exists())

    def test_create_combination_rejects_duplicate_subject_rows(self):
        payload = {
            'id': 'A00',
            'subjects': [
                {'score_type': 'THPT', 'subject_id': 'TO', 'weight': 1},
                {'score_type': 'THPT', 'subject_id': 'TO', 'weight': 1},
            ],
        }

        response = self.client.post('/api/v1/combinations/', payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertEqual(response.data['error'], 'VALIDATION_ERROR')
        self.assertIn('subjects.1', response.data['details'])

    def test_patch_combination_replaces_subjects(self):
        combination = SubjectCombination.objects.create(id='A00', name='Old')
        CombinationSubject.objects.create(
            subject_combination=combination,
            subject=self.math,
            weight=1,
            score_type=ScoreTypeChoices.THPT,
            position=1,
        )
        payload = {
            'name': 'Updated',
            'subjects': [
                {'score_type': 'THPT', 'subject_id': 'VA', 'weight': 2},
                {'score_type': 'THPT', 'subject_id': 'TO', 'weight': 1},
            ],
        }

        response = self.client.patch('/api/v1/combinations/A00/', payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        combination.refresh_from_db()
        self.assertEqual(combination.name, 'Updated')
        self.assertEqual(
            list(CombinationSubject.objects.filter(subject_combination=combination).order_by('position').values_list('subject_id', flat=True)),
            ['VA', 'TO'],
        )

    def test_delete_combination_hard_deletes_record_and_keeps_delete_log(self):
        combination = SubjectCombination.objects.create(id='A00', name='Toán Lí Hóa')

        response = self.client.delete('/api/v1/combinations/A00/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(SubjectCombination.objects.filter(id=combination.id).exists())
        log = SubjectCombinationLog.objects.get(name='Toán Lí Hóa', action=ActionsChoices.DELETE)
        self.assertIsNone(log.subject_combination_id)


class MajorAndCriteriaApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username='major-admin',
            password='password123',
            fullname='Major Admin',
            role=RoleChoices.ADMIN,
        )
        self.client.force_authenticate(self.user)
        self.subject = Subject.objects.create(id='TO', name='Toan')
        self.combination = SubjectCombination.objects.create(id='A00', name='A00')

    def test_import_majors_creates_major_combinations(self):
        file = make_xlsx(
            ['MaXT', 'TenNganh', 'MaTH', 'DiemSan', 'DiemLech', 'Goc'],
            [['7140101', 'Su pham Toan', 'A00', 18, 0.5, 1]],
        )

        response = self.client.post('/api/v1/majors/import/', {'file': file}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 2)
        major = Major.objects.get(id='7140101')
        entry = MajorCombination.objects.get(major=major, subject_combination=self.combination)
        self.assertEqual(major.name, 'Su pham Toan')
        self.assertEqual(entry.min_score, 18)
        self.assertEqual(entry.score_offset, 0.5)
        self.assertTrue(entry.is_primary)

    def test_import_majors_accepts_ma_nganh_without_primary_column(self):
        other_combination = SubjectCombination.objects.create(id='A01', name='A01')
        file = make_xlsx(
            ['MaNganh', 'TenNganh', 'MaTH', 'DiemSan', 'DiemLech'],
            [
                ['7140101', 'Su pham Toan', 'A00', 18, 0.5],
                ['7140101', 'Su pham Toan', 'A01', 17, 0],
            ],
        )

        response = self.client.post('/api/v1/majors/import/', {'file': file}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 3)
        major = Major.objects.get(id='7140101')
        primary_entry = MajorCombination.objects.get(major=major, subject_combination=self.combination)
        secondary_entry = MajorCombination.objects.get(major=major, subject_combination=other_combination)
        self.assertTrue(primary_entry.is_primary)
        self.assertFalse(secondary_entry.is_primary)

    def test_import_majors_accepts_major_code_up_to_model_limit(self):
        major_id = 'M' * 50
        file = make_xlsx(
            ['MaXT', 'TenNganh', 'MaTH', 'DiemSan', 'DiemLech', 'Goc'],
            [[major_id, 'Su pham Toan', 'A00', 18, 0.5, 1]],
        )

        response = self.client.post('/api/v1/majors/import/', {'file': file}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 2)
        self.assertEqual(response.data['errors'], [])
        self.assertTrue(Major.objects.filter(id=major_id).exists())

    def test_import_majors_rejects_major_code_longer_than_model_limit(self):
        major_id = 'M' * 51
        file = make_xlsx(
            ['MaXT', 'TenNganh', 'MaTH', 'DiemSan', 'DiemLech', 'Goc'],
            [[major_id, 'Su pham Toan', 'A00', 18, 0.5, 1]],
        )

        response = self.client.post('/api/v1/majors/import/', {'file': file}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 0)
        self.assertEqual(response.data['errors'][0]['code'], 'MAJOR_CODE_TOO_LONG')
        self.assertEqual(Major.objects.count(), 0)

    def test_program_async_batch_status_persists_row_errors(self):
        batch = ImportBatch.objects.create(file_name='majors.xlsx', imported_by=self.user)
        summary = {
            'success': False,
            'created': 0,
            'updated': 0,
            'skipped': 0,
            'errors': [{'row': 2, 'code': 'MAJOR_CODE_TOO_LONG', 'message': 'MaXT tối đa 50 ký tự'}],
        }

        _complete_import_batch_from_summary(batch, summary)

        batch.refresh_from_db()
        self.assertEqual(batch.error_count, 1)
        self.assertEqual(batch.error_details, summary['errors'])

    def test_import_criteria_creates_condition_json_rule(self):
        major = Major.objects.create(id='7140101', name='Su pham Toan')
        MajorCombination.objects.create(major=major, subject_combination=self.combination, min_score=18, is_primary=True)
        file = make_xlsx(
            ['MaXT', 'MaTH', 'MaMon', 'DiemMonToiThieu', 'DiemTongToiThieu', 'GhiChu', 'DieuKienJson'],
            [['7140101', 'A00', 'TO', 6.5, 18, 'Dieu kien mon chinh', '{"main_subject":"TO"}']],
        )

        response = self.client.post('/api/v1/criteria/import/', {'file': file}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 1)
        condition = AdmissionCondition.objects.get()
        self.assertEqual(condition.subject_id, 'TO')
        self.assertEqual(condition.condition_json, {'main_subject': 'TO'})
