from pathlib import PurePath

from django.core.files.storage import default_storage


def save_upload_for_task(upload, batch_id):
    filename = PurePath(upload.name).name or 'upload.bin'
    return default_storage.save(f'async-imports/{batch_id}-{filename}', upload)
