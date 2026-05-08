from celery import shared_task
from django.core.files.storage import default_storage

from core.choices import ImportStatusChoices
from src.candidates.services import fail_import_batch
from src.imports.models import ImportBatch
from src.programs.services import import_admission_conditions, import_combinations, import_majors, import_subjects


IMPORT_HANDLERS = {
    'combinations': import_combinations,
    'subjects': import_subjects,
    'majors': import_majors,
    'criteria': import_admission_conditions,
}


def _open_upload(storage_path):
    return default_storage.open(storage_path, 'rb')


def _delete_upload(storage_path):
    if default_storage.exists(storage_path):
        default_storage.delete(storage_path)


def _complete_import_batch_from_summary(batch, summary):
    batch.status = ImportStatusChoices.DONE
    batch.row_count = int(summary.get('created', 0)) + int(summary.get('updated', 0)) + int(summary.get('skipped', 0)) + len(summary.get('errors', []))
    batch.created_count = int(summary.get('created', 0))
    batch.updated_count = int(summary.get('updated', 0))
    batch.error_count = len(summary.get('errors', []))
    batch.save(update_fields=['status', 'row_count', 'created_count', 'updated_count', 'error_count', 'update_date'])


@shared_task(name='programs.import_master_data')
def import_program_master_data_task(batch_id, storage_path, import_kind):
    batch = ImportBatch.objects.get(pk=batch_id)
    try:
        with _open_upload(storage_path) as upload:
            summary = IMPORT_HANDLERS[import_kind](upload)
        _complete_import_batch_from_summary(batch, summary)
    except (KeyError, ValueError):
        fail_import_batch(batch)
    except Exception:
        fail_import_batch(batch)
        raise
    finally:
        _delete_upload(storage_path)
