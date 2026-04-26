from io import BytesIO
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from core.choices import RoleChoices, ScoreTypeChoices
from src.programs.models import CombinationSubject, Subject, SubjectCombination


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
