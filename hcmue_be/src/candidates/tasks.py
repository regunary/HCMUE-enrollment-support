import base64

from celery import shared_task
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile

from core.choices import ScoreTypeChoices
from src.candidates.services import (
    APTITUDE_SCORE_COLUMNS,
    DGNL_SCORE_COLUMNS,
    HOCBA_SCORE_COLUMNS,
    THPT_SCORE_COLUMNS,
    fail_import_batch,
    import_candidate_basic_info,
    import_candidate_scores,
    import_priority_objects,
    import_regions,
)
from src.imports.models import ImportBatch


SCORE_IMPORT_CONFIG = {
    'thpt': (ScoreTypeChoices.THPT, THPT_SCORE_COLUMNS, 10),
    'hoc-ba': (ScoreTypeChoices.HOCBA, HOCBA_SCORE_COLUMNS, 10),
    'nang-luc': (ScoreTypeChoices.DGNL, DGNL_SCORE_COLUMNS, 10),
    'nang-khieu': (ScoreTypeChoices.CB, APTITUDE_SCORE_COLUMNS, 10),
}


def _upload_from_payload(file_name, file_payload):
    return SimpleUploadedFile(file_name, base64.b64decode(file_payload.encode('ascii')))


def _user_from_id(user_id):
    if not user_id:
        return None
    return get_user_model().objects.filter(pk=user_id).first()


@shared_task(name='candidates.import_regions')
def import_regions_task(batch_id, file_name, file_payload, user_id=None):
    batch = ImportBatch.objects.get(pk=batch_id)
    try:
        import_regions(_upload_from_payload(file_name, file_payload), _user_from_id(user_id), batch=batch)
    except ValueError:
        fail_import_batch(batch)
    except Exception:
        fail_import_batch(batch)
        raise


@shared_task(name='candidates.import_priority_objects')
def import_priority_objects_task(batch_id, file_name, file_payload, user_id=None):
    batch = ImportBatch.objects.get(pk=batch_id)
    try:
        import_priority_objects(_upload_from_payload(file_name, file_payload), _user_from_id(user_id), batch=batch)
    except ValueError:
        fail_import_batch(batch)
    except Exception:
        fail_import_batch(batch)
        raise


@shared_task(name='candidates.import_basic_info')
def import_candidate_basic_info_task(batch_id, file_name, file_payload, user_id=None):
    batch = ImportBatch.objects.get(pk=batch_id)
    try:
        import_candidate_basic_info(_upload_from_payload(file_name, file_payload), _user_from_id(user_id), batch=batch)
    except ValueError:
        fail_import_batch(batch)
    except Exception:
        fail_import_batch(batch)
        raise


@shared_task(name='candidates.import_scores')
def import_candidate_scores_task(batch_id, file_name, file_payload, import_kind, user_id=None):
    batch = ImportBatch.objects.get(pk=batch_id)
    try:
        score_type, column_subject_map, max_score = SCORE_IMPORT_CONFIG[import_kind]
        import_candidate_scores(
            _upload_from_payload(file_name, file_payload),
            score_type,
            column_subject_map,
            max_score,
            _user_from_id(user_id),
            batch=batch,
        )
    except (KeyError, ValueError):
        fail_import_batch(batch)
    except Exception:
        fail_import_batch(batch)
        raise
