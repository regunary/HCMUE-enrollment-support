from pathlib import Path
from tempfile import TemporaryDirectory

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, override_settings

from src.imports.upload_storage import save_upload_for_task


class AsyncUploadStorageTests(SimpleTestCase):
    def test_save_upload_uses_flat_batch_prefixed_path_when_batch_name_exists_as_file(self):
        with TemporaryDirectory() as media_root:
            batch_id = 'dfa5e386-37dd-47f5-bffd-20ab8f82d059'
            imports_dir = Path(media_root) / 'async-imports'
            imports_dir.mkdir()
            (imports_dir / batch_id).write_text('stale-file', encoding='utf-8')
            upload = SimpleUploadedFile('DiemUT.xlsx', b'content')

            with override_settings(MEDIA_ROOT=media_root):
                storage_path = save_upload_for_task(upload, batch_id)

            self.assertEqual(storage_path, f'async-imports/{batch_id}-DiemUT.xlsx')
            self.assertTrue((imports_dir / f'{batch_id}-DiemUT.xlsx').is_file())
            self.assertTrue((imports_dir / batch_id).is_file())
