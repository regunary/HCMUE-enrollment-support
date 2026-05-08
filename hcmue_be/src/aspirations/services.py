from django.db import IntegrityError, transaction

from core.choices import ActionsChoices
from src.aspirations.models import Aspiration, AspirationLog, ExcludedCandidate, ExcludedCandidateLog
from src.candidates.models import Candidate
from src.candidates.services import ImportSummary, RowError, _clean, _clean_cccd, _read_xlsx, _row_values, _split_rows, _to_int
from src.programs.models import Major


REQUIRED_EXCLUSION_HEADERS = {'CCCD', 'LyDo'}
REQUIRED_WISH_HEADERS = {'CCCD', 'MaXT', 'TTNV'}


def import_wishes(file_obj):
    rows = _read_xlsx(file_obj)
    summary = ImportSummary()
    headers, data_rows = _split_rows(rows)
    missing = REQUIRED_WISH_HEADERS - set(headers)
    if missing:
        summary.errors.append(RowError(1, 'MISSING_REQUIRED_COLUMNS', f'Thiếu cột: {", ".join(sorted(missing))}'))
        return summary.as_response()

    seen_rank = set()
    seen_major = set()
    valid_rows = []
    for row_number, row in data_rows:
        values = _row_values(headers, row)
        error = _validate_wish_import_row(row_number, values)
        if error:
            summary.errors.append(error)
            continue
        key_rank = (_clean_cccd(values.get('CCCD')), _to_int(values.get('TTNV')))
        key_major = (_clean_cccd(values.get('CCCD')), _clean(values.get('MaXT')))
        if key_rank in seen_rank:
            summary.errors.append(RowError(row_number, 'RANK_DUPLICATE', 'Trùng thứ tự nguyện vọng của thí sinh', {'field': 'TTNV', 'value': key_rank[1]}))
            continue
        if key_major in seen_major:
            summary.errors.append(RowError(row_number, 'MAJOR_DUPLICATE', 'Thí sinh đã có nguyện vọng cho mã ngành này', {'field': 'MaXT', 'value': key_major[1]}))
            continue
        seen_rank.add(key_rank)
        seen_major.add(key_major)
        valid_rows.append(values)

    for values in valid_rows:
        result = _upsert_wish_from_values(values)
        if result == 'created':
            summary.created += 1
        elif result == 'updated':
            summary.updated += 1
        else:
            summary.skipped += 1
    return summary.as_response()


def create_wish_manually(validated_data):
    candidate = Candidate.objects.get(cccd=validated_data.pop('cccd'), is_deleted=False)
    major = Major.objects.get(id=validated_data.pop('major_id'))
    with transaction.atomic():
        wish = Aspiration.objects.create(candidate=candidate, major=major, **validated_data)
        _log_wish(wish, ActionsChoices.CREATE)
    return {'success': True, 'data': serialize_wish(wish)}


def update_wish_manually(wish, validated_data):
    if 'cccd' in validated_data:
        validated_data['candidate'] = Candidate.objects.get(cccd=validated_data.pop('cccd'), is_deleted=False)
    if 'major_id' in validated_data:
        validated_data['major'] = Major.objects.get(id=validated_data.pop('major_id'))
    changed = []
    with transaction.atomic():
        for field_name, value in validated_data.items():
            if getattr(wish, field_name) != value:
                setattr(wish, field_name, value)
                changed.append(field_name)
        if changed:
            wish.action = ActionsChoices.UPDATE
            wish.field_changed = ','.join(changed)
            wish.save(update_fields=[*changed, 'action', 'field_changed', 'update_date'])
            _log_wish(wish, ActionsChoices.UPDATE, wish.field_changed)
    return {'success': True, 'data': serialize_wish(wish)}


def delete_wish_manually(wish):
    with transaction.atomic():
        wish.action = ActionsChoices.DELETE
        wish.field_changed = 'deleted'
        _log_wish(wish, ActionsChoices.DELETE, wish.field_changed)
        wish.delete()
    return {'success': True}


def serialize_wish(wish):
    wish.refresh_from_db()
    return {
        'id': wish.id,
        'candidate_id': str(wish.candidate_id),
        'cccd': wish.candidate.cccd,
        'major_id': wish.major_id,
        'rank': wish.rank,
        'computed_score': wish.computed_score,
    }


def import_exclusions(file_obj):
    rows = _read_xlsx(file_obj)
    summary = ImportSummary()
    headers, data_rows = _split_rows(rows)
    missing = REQUIRED_EXCLUSION_HEADERS - set(headers)
    if missing:
        summary.errors.append(RowError(1, 'MISSING_REQUIRED_COLUMNS', f'Thiếu cột: {", ".join(sorted(missing))}'))
        return summary.as_response()

    for row_number, row in data_rows:
        values = _row_values(headers, row)
        error = _validate_exclusion_import_row(row_number, values)
        if error:
            summary.errors.append(error)
            continue
        result = _upsert_exclusion_from_values(values)
        if result == 'created':
            summary.created += 1
        elif result == 'updated':
            summary.updated += 1
        else:
            summary.skipped += 1
    return summary.as_response()


def create_exclusion_manually(validated_data):
    candidate = Candidate.objects.get(cccd=validated_data.pop('cccd'), is_deleted=False)
    with transaction.atomic():
        exclusion = ExcludedCandidate.objects.create(candidate=candidate, **validated_data)
        _log_exclusion(exclusion, ActionsChoices.CREATE)
    return {'success': True, 'data': serialize_exclusion(exclusion)}


def update_exclusion_manually(exclusion, validated_data):
    if 'cccd' in validated_data:
        validated_data['candidate'] = Candidate.objects.get(cccd=validated_data.pop('cccd'), is_deleted=False)
    changed = []
    with transaction.atomic():
        for field_name, value in validated_data.items():
            if getattr(exclusion, field_name) != value:
                setattr(exclusion, field_name, value)
                changed.append(field_name)
        if changed:
            exclusion.action = ActionsChoices.UPDATE
            exclusion.field_changed = ','.join(changed)
            exclusion.save(update_fields=[*changed, 'action', 'field_changed', 'update_date'])
            _log_exclusion(exclusion, ActionsChoices.UPDATE, exclusion.field_changed)
    return {'success': True, 'data': serialize_exclusion(exclusion)}


def delete_exclusion_manually(exclusion):
    with transaction.atomic():
        exclusion.action = ActionsChoices.DELETE
        exclusion.field_changed = 'deleted'
        _log_exclusion(exclusion, ActionsChoices.DELETE, exclusion.field_changed)
        exclusion.delete()
    return {'success': True}


def serialize_exclusion(exclusion):
    exclusion.refresh_from_db()
    return {
        'id': exclusion.id,
        'candidate_id': str(exclusion.candidate_id),
        'cccd': exclusion.candidate.cccd,
        'reason': exclusion.reason,
    }


def _validate_wish_import_row(row_number, values):
    cccd = _clean_cccd(values.get('CCCD'))
    major_id = _clean(values.get('MaXT'))
    rank = _to_int(values.get('TTNV'))
    if not cccd:
        return RowError(row_number, 'CCCD_REQUIRED', 'CCCD là bắt buộc', {'field': 'CCCD', 'value': cccd})
    if not Candidate.objects.filter(cccd=cccd, is_deleted=False).exists():
        return RowError(row_number, 'CANDIDATE_NOT_FOUND', 'Không tìm thấy thí sinh theo CCCD', {'field': 'CCCD', 'value': cccd})
    if not major_id:
        return RowError(row_number, 'MAJOR_REQUIRED', 'MaXT là bắt buộc', {'field': 'MaXT', 'value': major_id})
    if not Major.objects.filter(id=major_id).exists():
        return RowError(row_number, 'MAJOR_NOT_FOUND', 'Mã ngành không tồn tại', {'field': 'MaXT', 'value': major_id})
    if rank is None or rank < 1:
        return RowError(row_number, 'RANK_INVALID', 'TTNV không hợp lệ', {'field': 'TTNV', 'value': values.get('TTNV')})
    return None


def _upsert_wish_from_values(values):
    candidate = Candidate.objects.get(cccd=_clean_cccd(values.get('CCCD')), is_deleted=False)
    rank = _to_int(values.get('TTNV'))
    major_id = _clean(values.get('MaXT'))
    wish, created = Aspiration.objects.get_or_create(candidate=candidate, rank=rank, defaults={'major_id': major_id})
    if created:
        _log_wish(wish, ActionsChoices.CREATE)
        return 'created'
    if wish.major_id != major_id:
        wish.major_id = major_id
        wish.action = ActionsChoices.UPDATE
        wish.field_changed = 'major'
        try:
            wish.save(update_fields=['major', 'action', 'field_changed', 'update_date'])
        except IntegrityError:
            return 'skipped'
        _log_wish(wish, ActionsChoices.UPDATE, wish.field_changed)
        return 'updated'
    return 'skipped'


def _validate_exclusion_import_row(row_number, values):
    cccd = _clean_cccd(values.get('CCCD'))
    reason = _clean(values.get('LyDo'))
    if not cccd:
        return RowError(row_number, 'CCCD_REQUIRED', 'CCCD là bắt buộc', {'field': 'CCCD', 'value': cccd})
    if not Candidate.objects.filter(cccd=cccd, is_deleted=False).exists():
        return RowError(row_number, 'CANDIDATE_NOT_FOUND', 'Không tìm thấy thí sinh theo CCCD', {'field': 'CCCD', 'value': cccd})
    if not reason:
        return RowError(row_number, 'REASON_REQUIRED', 'LyDo là bắt buộc', {'field': 'LyDo', 'value': reason})
    return None


def _upsert_exclusion_from_values(values):
    candidate = Candidate.objects.get(cccd=_clean_cccd(values.get('CCCD')), is_deleted=False)
    reason = _clean(values.get('LyDo'))
    exclusion, created = ExcludedCandidate.objects.get_or_create(candidate=candidate, defaults={'reason': reason})
    if created:
        _log_exclusion(exclusion, ActionsChoices.CREATE)
        return 'created'
    if exclusion.reason != reason:
        exclusion.reason = reason
        exclusion.action = ActionsChoices.UPDATE
        exclusion.field_changed = 'reason'
        exclusion.save(update_fields=['reason', 'action', 'field_changed', 'update_date'])
        _log_exclusion(exclusion, ActionsChoices.UPDATE, exclusion.field_changed)
        return 'updated'
    return 'skipped'


def _log_wish(wish, action, field_changed=''):
    AspirationLog.objects.create(
        aspiration=wish,
        candidate_id=wish.candidate_id,
        major_id=wish.major_id,
        rank=wish.rank,
        computed_score=wish.computed_score,
        action=action,
        field_changed=field_changed,
    )


def _log_exclusion(exclusion, action, field_changed=''):
    ExcludedCandidateLog.objects.create(
        excluded_candidate=exclusion,
        candidate_id=exclusion.candidate_id,
        cccd=exclusion.candidate.cccd,
        reason=exclusion.reason,
        action=action,
        field_changed=field_changed,
    )
