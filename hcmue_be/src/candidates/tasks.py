from celery import shared_task
from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage

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


def _open_upload(storage_path):
    return default_storage.open(storage_path, 'rb')


def _delete_upload(storage_path):
    if default_storage.exists(storage_path):
        default_storage.delete(storage_path)


def _user_from_id(user_id):
    if not user_id:
        return None
    return get_user_model().objects.filter(pk=user_id).first()


@shared_task(name='candidates.import_regions')
def import_regions_task(batch_id, storage_path, user_id=None):
    batch = ImportBatch.objects.get(pk=batch_id)
    try:
        with _open_upload(storage_path) as upload:
            import_regions(upload, _user_from_id(user_id), batch=batch)
    except ValueError:
        fail_import_batch(batch)
    except Exception:
        fail_import_batch(batch)
        raise
    finally:
        _delete_upload(storage_path)


@shared_task(name='candidates.import_priority_objects')
def import_priority_objects_task(batch_id, storage_path, user_id=None):
    batch = ImportBatch.objects.get(pk=batch_id)
    try:
        with _open_upload(storage_path) as upload:
            import_priority_objects(upload, _user_from_id(user_id), batch=batch)
    except ValueError:
        fail_import_batch(batch)
    except Exception:
        fail_import_batch(batch)
        raise
    finally:
        _delete_upload(storage_path)


@shared_task(name='candidates.import_basic_info')
def import_candidate_basic_info_task(batch_id, storage_path, user_id=None):
    batch = ImportBatch.objects.get(pk=batch_id)
    try:
        with _open_upload(storage_path) as upload:
            import_candidate_basic_info(upload, _user_from_id(user_id), batch=batch)
    except ValueError:
        fail_import_batch(batch)
    except Exception:
        fail_import_batch(batch)
        raise
    finally:
        _delete_upload(storage_path)


@shared_task(name='candidates.import_scores')
def import_candidate_scores_task(batch_id, storage_path, import_kind, user_id=None):
    batch = ImportBatch.objects.get(pk=batch_id)
    try:
        score_type, column_subject_map, max_score = SCORE_IMPORT_CONFIG[import_kind]
        with _open_upload(storage_path) as upload:
            import_candidate_scores(
                upload,
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
    finally:
        _delete_upload(storage_path)
