import base64

from celery import shared_task
from django.core.files.uploadedfile import SimpleUploadedFile

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


def _upload_from_payload(file_name, file_payload):
    return SimpleUploadedFile(file_name, base64.b64decode(file_payload.encode('ascii')))


def _complete_import_batch_from_summary(batch, summary):
    batch.status = ImportStatusChoices.DONE
    batch.row_count = int(summary.get('created', 0)) + int(summary.get('updated', 0)) + int(summary.get('skipped', 0)) + len(summary.get('errors', []))
    batch.created_count = int(summary.get('created', 0))
    batch.updated_count = int(summary.get('updated', 0))
    batch.error_count = len(summary.get('errors', []))
    batch.save(update_fields=['status', 'row_count', 'created_count', 'updated_count', 'error_count', 'update_date'])


@shared_task(name='programs.import_master_data')
def import_program_master_data_task(batch_id, file_name, file_payload, import_kind):
    batch = ImportBatch.objects.get(pk=batch_id)
    try:
        summary = IMPORT_HANDLERS[import_kind](_upload_from_payload(file_name, file_payload))
        _complete_import_batch_from_summary(batch, summary)
    except (KeyError, ValueError):
        fail_import_batch(batch)
    except Exception:
        fail_import_batch(batch)
        raise
