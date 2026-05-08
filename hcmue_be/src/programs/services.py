import json

from django.db import transaction

from core.choices import ActionsChoices, ScoreTypeChoices
from src.candidates.services import ImportSummary, RowError, _clean, _read_xlsx, _row_values, _split_rows, _to_decimal
from src.programs.models import (
    AdmissionCondition,
    AdmissionConditionLog,
    CombinationSubject,
    CombinationSubjectLog,
    Major,
    MajorCombination,
    MajorCombinationLog,
    MajorLog,
    Subject,
    SubjectLog,
    SubjectCombination,
    SubjectCombinationLog,
)


REQUIRED_COMBINATION_HEADERS = {'MaTH', 'Mon1', 'Mon2', 'Mon3', 'TrongSo1', 'TrongSo2', 'TrongSo3'}
REQUIRED_CRITERIA_HEADERS = {'MaXT', 'MaTH'}
REQUIRED_MAJOR_HEADERS = {'TenNganh', 'MaTH', 'DiemSan', 'DiemLech'}
MAJOR_ID_HEADERS = {'MaXT', 'MaNganh'}
REQUIRED_SUBJECT_HEADERS = {'MaMon', 'TenMon'}
LEGACY_COMBINATION_SUFFIXES = {
    '_HB': ScoreTypeChoices.HOCBA,
    '_NL': ScoreTypeChoices.DGNL,
}


def import_subjects(file_obj):
    """
    Import subject master data from the MaMon/TenMon Excel template.

    Args:
        file_obj: Uploaded .xlsx file object from the multipart request.

    Returns:
        Dictionary containing success status, counters, and row-level errors.

    Raises:
        ValueError: Raised with FILE_INVALID when the uploaded file is not a readable .xlsx file.
    """

    rows = _read_xlsx(file_obj)
    summary = ImportSummary()
    headers, data_rows = _split_rows(rows)
    missing = REQUIRED_SUBJECT_HEADERS - set(headers)
    if missing:
        summary.errors.append(RowError(1, 'MISSING_REQUIRED_COLUMNS', f'Thiếu cột: {", ".join(sorted(missing))}'))
        return summary.as_response()

    for row_number, row in data_rows:
        values = _row_values(headers, row)
        error = _validate_subject_import_row(row_number, values)
        if error:
            summary.errors.append(error)
            continue
        result = _upsert_subject_from_values(values)
        if result == 'created':
            summary.created += 1
        elif result == 'updated':
            summary.updated += 1
        else:
            summary.skipped += 1
    return summary.as_response()


def create_subject_manually(validated_data):
    """
    Create one Subject row from JSON.

    Args:
        validated_data: SubjectSerializer validated data.

    Returns:
        API response payload containing the created subject.
    """

    with transaction.atomic():
        subject = Subject.objects.create(**validated_data)
        _log_subject(subject, ActionsChoices.CREATE)
    return {'success': True, 'data': serialize_subject(subject)}


def update_subject_manually(subject, validated_data):
    """
    Update one Subject row from JSON.

    Args:
        subject: Existing Subject instance.
        validated_data: SubjectSerializer validated data.

    Returns:
        API response payload containing the updated subject.
    """

    changed = []
    with transaction.atomic():
        if 'name' in validated_data and subject.name != validated_data['name']:
            subject.name = validated_data['name']
            changed.append('name')
        if changed:
            subject.action = ActionsChoices.UPDATE
            subject.field_changed = ','.join(changed)
            subject.save(update_fields=['name', 'action', 'field_changed', 'update_date'])
            _log_subject(subject, ActionsChoices.UPDATE, subject.field_changed)
    return {'success': True, 'data': serialize_subject(subject)}


def delete_subject_manually(subject):
    """
    Hard-delete one Subject after writing a DELETE audit snapshot.

    Args:
        subject: Subject instance resolved by the detail API.

    Returns:
        API response payload confirming the deletion.
    """

    with transaction.atomic():
        subject.action = ActionsChoices.DELETE
        subject.field_changed = 'deleted'
        _log_subject(subject, ActionsChoices.DELETE, subject.field_changed)
        subject.delete()
    return {'success': True}


def serialize_subject(subject):
    """
    Serialize Subject for API responses.

    Args:
        subject: Subject instance to serialize.

    Returns:
        Dictionary containing subject code and name.
    """

    return {'id': subject.id, 'name': subject.name}


def import_combinations(file_obj):
    """
    Import subject combinations from the MaTH/Mon/TrongSo Excel template.

    Args:
        file_obj: Uploaded .xlsx file object from the multipart request.

    Returns:
        Dictionary containing success status, counters, and row-level errors.

    Raises:
        ValueError: Raised with FILE_INVALID when the uploaded file is not a readable .xlsx file.
    """

    rows = _read_xlsx(file_obj)
    summary = ImportSummary()
    headers, data_rows = _split_rows(rows)
    missing = REQUIRED_COMBINATION_HEADERS - set(headers)
    if missing:
        summary.errors.append(RowError(1, 'MISSING_REQUIRED_COLUMNS', f'Thiếu cột: {", ".join(sorted(missing))}'))
        return summary.as_response()

    for row_number, row in data_rows:
        values = _row_values(headers, row)
        error = _validate_import_row(row_number, values)
        if error:
            summary.errors.append(error)
            continue
        result = _upsert_combination_from_values(values)
        if result == 'created':
            summary.created += 1
        elif result == 'updated':
            summary.updated += 1
        else:
            summary.skipped += 1
    return summary.as_response()


def create_combination_manually(validated_data):
    """
    Create one subject combination from JSON.

    Args:
        validated_data: CombinationManualSerializer validated data.

    Returns:
        API response payload containing the created combination.
    """

    subjects = validated_data.pop('subjects', [])
    with transaction.atomic():
        combination = SubjectCombination.objects.create(**validated_data)
        _log_subject_combination(combination, ActionsChoices.CREATE)
        _replace_combination_subjects(combination, subjects)
    return {'success': True, 'data': serialize_combination(combination)}


def update_combination_manually(combination, validated_data):
    """
    Update one subject combination from JSON.

    Args:
        combination: Existing SubjectCombination instance.
        validated_data: CombinationManualSerializer validated data.

    Returns:
        API response payload containing the updated combination.
    """

    subjects = validated_data.pop('subjects', None)
    changed = []
    with transaction.atomic():
        if 'name' in validated_data and combination.name != validated_data['name']:
            combination.name = validated_data['name']
            changed.append('name')
        if changed:
            combination.action = ActionsChoices.UPDATE
            combination.field_changed = ','.join(changed)
            combination.save(update_fields=['name', 'action', 'field_changed', 'update_date'])
            _log_subject_combination(combination, ActionsChoices.UPDATE, combination.field_changed)
        if subjects is not None:
            _replace_combination_subjects(combination, subjects)
    return {'success': True, 'data': serialize_combination(combination)}


def delete_combination_manually(combination):
    """
    Hard-delete one SubjectCombination after writing a DELETE audit snapshot.

    Args:
        combination: SubjectCombination instance resolved by the detail API.

    Returns:
        API response payload confirming the deletion.
    """

    with transaction.atomic():
        combination.action = ActionsChoices.DELETE
        combination.field_changed = 'deleted'
        _log_subject_combination(combination, ActionsChoices.DELETE, combination.field_changed)
        combination.delete()
    return {'success': True}


def import_majors(file_obj):
    rows = _read_xlsx(file_obj)
    summary = ImportSummary()
    headers, data_rows = _split_rows(rows)
    missing = REQUIRED_MAJOR_HEADERS - set(headers)
    has_major_id_header = bool(MAJOR_ID_HEADERS & set(headers))
    has_primary_header = 'Goc' in headers
    if missing:
        summary.errors.append(RowError(1, 'MISSING_REQUIRED_COLUMNS', f'Thiếu cột: {", ".join(sorted(missing))}'))
        return summary.as_response()
    if not has_major_id_header:
        summary.errors.append(RowError(1, 'MISSING_REQUIRED_COLUMNS', 'Thieu cot: MaXT hoac MaNganh'))
        return summary.as_response()

    grouped_rows = {}
    for row_number, row in data_rows:
        values = _row_values(headers, row)
        error = _validate_major_import_row(row_number, values)
        if error:
            summary.errors.append(error)
            continue
        grouped_rows.setdefault(_major_id_from_values(values), []).append((row_number, values))

    for major_id, entries in grouped_rows.items():
        primary_count = sum(1 for _row_number, values in entries if _to_bool(values.get('Goc'))) if has_primary_header else 1
        if has_primary_header and primary_count != 1:
            for row_number, _values in entries:
                summary.errors.append(RowError(row_number, 'PRIMARY_COMBINATION_INVALID', 'Mỗi ngành phải có đúng một tổ hợp gốc', {'field': 'Goc', 'value': major_id}))
            continue
        result = _upsert_major_group(major_id, entries, has_primary_header)
        summary.created += result['created']
        summary.updated += result['updated']
        summary.skipped += result['skipped']
    return summary.as_response()


def create_major_manually(validated_data):
    combinations = validated_data.pop('combinations', [])
    with transaction.atomic():
        major = Major.objects.create(**validated_data)
        _log_major(major, ActionsChoices.CREATE)
        _replace_major_combinations(major, combinations)
    return {'success': True, 'data': serialize_major(major)}


def update_major_manually(major, validated_data):
    combinations = validated_data.pop('combinations', None)
    changed = []
    with transaction.atomic():
        for field_name in ('name', 'quota'):
            if field_name in validated_data and getattr(major, field_name) != validated_data[field_name]:
                setattr(major, field_name, validated_data[field_name])
                changed.append(field_name)
        if changed:
            major.action = ActionsChoices.UPDATE
            major.field_changed = ','.join(changed)
            major.save(update_fields=[*changed, 'action', 'field_changed', 'update_date'])
            _log_major(major, ActionsChoices.UPDATE, major.field_changed)
        if combinations is not None:
            _replace_major_combinations(major, combinations)
    return {'success': True, 'data': serialize_major(major)}


def delete_major_manually(major):
    with transaction.atomic():
        for entry in major.combinations.all():
            _log_major_combination(entry, ActionsChoices.DELETE, 'deleted')
        major.action = ActionsChoices.DELETE
        major.field_changed = 'deleted'
        _log_major(major, ActionsChoices.DELETE, major.field_changed)
        major.delete()
    return {'success': True}


def serialize_major(major):
    major.refresh_from_db()
    entries = major.combinations.select_related('subject_combination').order_by('subject_combination_id')
    return {
        'id': major.id,
        'name': major.name,
        'quota': major.quota,
        'combinations': [
            {
                'id': entry.id,
                'combination_id': entry.subject_combination_id,
                'min_score': entry.min_score,
                'score_offset': entry.score_offset,
                'is_primary': entry.is_primary,
            }
            for entry in entries
        ],
    }


def import_admission_conditions(file_obj):
    rows = _read_xlsx(file_obj)
    summary = ImportSummary()
    headers, data_rows = _split_rows(rows)
    missing = REQUIRED_CRITERIA_HEADERS - set(headers)
    if missing:
        summary.errors.append(RowError(1, 'MISSING_REQUIRED_COLUMNS', f'Thiếu cột: {", ".join(sorted(missing))}'))
        return summary.as_response()

    for row_number, row in data_rows:
        values = _row_values(headers, row)
        error = _validate_condition_import_row(row_number, values)
        if error:
            summary.errors.append(error)
            continue
        result = _upsert_condition_from_values(values)
        if result == 'created':
            summary.created += 1
        elif result == 'updated':
            summary.updated += 1
        else:
            summary.skipped += 1
    return summary.as_response()


def create_admission_condition_manually(validated_data):
    major_combination = _get_major_combination(validated_data.pop('major_id'), validated_data.pop('combination_id'))
    with transaction.atomic():
        condition = AdmissionCondition.objects.create(major_combination=major_combination, **validated_data)
        _log_admission_condition(condition, ActionsChoices.CREATE)
    return {'success': True, 'data': serialize_admission_condition(condition)}


def update_admission_condition_manually(condition, validated_data):
    if 'major_id' in validated_data or 'combination_id' in validated_data:
        major_id = validated_data.pop('major_id', condition.major_combination.major_id)
        combination_id = validated_data.pop('combination_id', condition.major_combination.subject_combination_id)
        validated_data['major_combination'] = _get_major_combination(major_id, combination_id)
    changed = []
    with transaction.atomic():
        for field_name, value in validated_data.items():
            if getattr(condition, field_name) != value:
                setattr(condition, field_name, value)
                changed.append(field_name)
        if changed:
            condition.action = ActionsChoices.UPDATE
            condition.field_changed = ','.join(changed)
            condition.save(update_fields=[*changed, 'action', 'field_changed', 'update_date'])
            _log_admission_condition(condition, ActionsChoices.UPDATE, condition.field_changed)
    return {'success': True, 'data': serialize_admission_condition(condition)}


def delete_admission_condition_manually(condition):
    with transaction.atomic():
        condition.action = ActionsChoices.DELETE
        condition.field_changed = 'deleted'
        _log_admission_condition(condition, ActionsChoices.DELETE, condition.field_changed)
        condition.delete()
    return {'success': True}


def serialize_admission_condition(condition):
    condition.refresh_from_db()
    return {
        'id': condition.id,
        'major_id': condition.major_combination.major_id,
        'combination_id': condition.major_combination.subject_combination_id,
        'subject_id': condition.subject_id,
        'min_subject_score': condition.min_subject_score,
        'min_total_score': condition.min_total_score,
        'note': condition.note,
        'condition_json': condition.condition_json,
    }


def serialize_combination(combination):
    """
    Serialize SubjectCombination with nested subject rows.

    Args:
        combination: SubjectCombination instance to serialize.

    Returns:
        Dictionary matching the combination API contract.
    """

    entries = combination.subjects.select_related('subject').order_by('position')
    return {
        'id': combination.id,
        'name': combination.name,
        'subjects': [
            {
                'score_type': entry.score_type,
                'subject_id': entry.subject_id,
                'weight': entry.weight,
                'position': entry.position,
            }
            for entry in entries
        ],
    }


def _validate_subject_import_row(row_number, values):
    """
    Validate one subject import row before database writes.

    Args:
        row_number: 1-based Excel row number for the current data row.
        values: Row values keyed by Excel header.

    Returns:
        RowError when validation fails, otherwise None.
    """

    subject_id = _clean(values.get('MaMon')).upper()
    name = _clean(values.get('TenMon'))
    if not subject_id:
        return RowError(row_number, 'SUBJECT_CODE_REQUIRED', 'MaMon là bắt buộc', {'field': 'MaMon', 'value': subject_id})
    if not name:
        return RowError(row_number, 'SUBJECT_NAME_REQUIRED', 'TenMon là bắt buộc', {'field': 'TenMon', 'value': name})
    return None


def _major_id_from_values(values):
    return _clean(values.get('MaXT')) or _clean(values.get('MaNganh'))


def _validate_major_import_row(row_number, values):
    major_id = _major_id_from_values(values)
    name = _clean(values.get('TenNganh'))
    combination_id = _clean(values.get('MaTH'))
    min_score = _to_decimal(values.get('DiemSan'))
    score_offset = _to_decimal(values.get('DiemLech'))
    primary = _clean(values.get('Goc'))
    if not major_id:
        return RowError(row_number, 'MAJOR_REQUIRED', 'MaXT là bắt buộc', {'field': 'MaXT', 'value': major_id})
    if not name:
        return RowError(row_number, 'MAJOR_NAME_REQUIRED', 'TenNganh là bắt buộc', {'field': 'TenNganh', 'value': name})
    if not combination_id:
        return RowError(row_number, 'COMBINATION_REQUIRED', 'MaTH là bắt buộc', {'field': 'MaTH', 'value': combination_id})
    if not SubjectCombination.objects.filter(id=combination_id).exists():
        return RowError(row_number, 'COMBINATION_NOT_FOUND', 'Tổ hợp không tồn tại', {'field': 'MaTH', 'value': combination_id})
    if min_score is None or min_score < 0:
        return RowError(row_number, 'MIN_SCORE_INVALID', 'DiemSan không hợp lệ', {'field': 'DiemSan', 'value': values.get('DiemSan')})
    if score_offset is None:
        return RowError(row_number, 'SCORE_OFFSET_INVALID', 'DiemLech không hợp lệ', {'field': 'DiemLech', 'value': values.get('DiemLech')})
    if primary and primary not in {'0', '1', 'true', 'false', 'True', 'False'}:
        return RowError(row_number, 'PRIMARY_INVALID', 'Goc chỉ nhận 0/1 hoặc true/false', {'field': 'Goc', 'value': primary})
    return None


def _upsert_major_group(major_id, entries, has_primary_header=True):
    counters = {'created': 0, 'updated': 0, 'skipped': 0}
    first_values = entries[0][1]
    name = _clean(first_values.get('TenNganh'))
    with transaction.atomic():
        major, created = Major.objects.get_or_create(id=major_id, defaults={'name': name})
        if created:
            counters['created'] += 1
            _log_major(major, ActionsChoices.CREATE)
        elif major.name != name:
            major.name = name
            major.action = ActionsChoices.UPDATE
            major.field_changed = 'name'
            major.save(update_fields=['name', 'action', 'field_changed', 'update_date'])
            counters['updated'] += 1
            _log_major(major, ActionsChoices.UPDATE, major.field_changed)
        else:
            counters['skipped'] += 1

        for index, (_row_number, values) in enumerate(entries):
            result = _upsert_major_combination(major, {
                'combination_id': _clean(values.get('MaTH')),
                'min_score': _to_decimal(values.get('DiemSan')),
                'score_offset': _to_decimal(values.get('DiemLech')),
                'is_primary': _to_bool(values.get('Goc')) if has_primary_header else index == 0,
            })
            counters[result] += 1
    return counters


def _upsert_major_combination(major, row):
    entry, created = MajorCombination.objects.get_or_create(
        major=major,
        subject_combination_id=row['combination_id'],
        defaults={
            'min_score': row['min_score'],
            'score_offset': row['score_offset'],
            'is_primary': row['is_primary'],
        },
    )
    if created:
        _log_major_combination(entry, ActionsChoices.CREATE)
        return 'created'
    changed = []
    for field_name in ('min_score', 'score_offset', 'is_primary'):
        if getattr(entry, field_name) != row[field_name]:
            setattr(entry, field_name, row[field_name])
            changed.append(field_name)
    if changed:
        entry.action = ActionsChoices.UPDATE
        entry.field_changed = ','.join(changed)
        entry.save(update_fields=[*changed, 'action', 'field_changed', 'update_date'])
        _log_major_combination(entry, ActionsChoices.UPDATE, entry.field_changed)
        return 'updated'
    return 'skipped'


def _replace_major_combinations(major, rows):
    existing = {entry.subject_combination_id: entry for entry in major.combinations.all()}
    requested = {row['combination_id'] for row in rows}
    for combination_id, entry in existing.items():
        if combination_id not in requested:
            _log_major_combination(entry, ActionsChoices.DELETE, 'deleted')
            entry.delete()
    for row in rows:
        _upsert_major_combination(major, row)


def _validate_condition_import_row(row_number, values):
    major_id = _clean(values.get('MaXT'))
    combination_id = _clean(values.get('MaTH'))
    subject_id = _clean(values.get('MaMon'))
    if not major_id:
        return RowError(row_number, 'MAJOR_REQUIRED', 'MaXT là bắt buộc', {'field': 'MaXT', 'value': major_id})
    if not combination_id:
        return RowError(row_number, 'COMBINATION_REQUIRED', 'MaTH là bắt buộc', {'field': 'MaTH', 'value': combination_id})
    if not MajorCombination.objects.filter(major_id=major_id, subject_combination_id=combination_id).exists():
        return RowError(row_number, 'MAJOR_COMBINATION_NOT_FOUND', 'Ngành chưa có tổ hợp này', {'field': 'MaTH', 'value': combination_id})
    if subject_id and not Subject.objects.filter(id=subject_id).exists():
        return RowError(row_number, 'SUBJECT_NOT_FOUND', 'Môn học không tồn tại', {'field': 'MaMon', 'value': subject_id})
    for field_name in ('DiemMonToiThieu', 'DiemTongToiThieu'):
        if _clean(values.get(field_name)) and _to_decimal(values.get(field_name)) is None:
            return RowError(row_number, 'SCORE_INVALID', f'{field_name} không hợp lệ', {'field': field_name, 'value': values.get(field_name)})
    raw_json = _clean(values.get('DieuKienJson'))
    if raw_json and _parse_condition_json(raw_json) is None:
        return RowError(row_number, 'JSON_INVALID', 'DieuKienJson không hợp lệ', {'field': 'DieuKienJson', 'value': raw_json})
    if not any(_clean(values.get(field_name)) for field_name in ('DiemMonToiThieu', 'DiemTongToiThieu', 'GhiChu', 'DieuKienJson')):
        return RowError(row_number, 'CONDITION_REQUIRED', 'Cần nhập ít nhất một điều kiện')
    return None


def _upsert_condition_from_values(values):
    major_combination = _get_major_combination(_clean(values.get('MaXT')), _clean(values.get('MaTH')))
    defaults = {
        'subject_id': _clean(values.get('MaMon')) or None,
        'min_subject_score': _to_decimal(values.get('DiemMonToiThieu')),
        'min_total_score': _to_decimal(values.get('DiemTongToiThieu')),
        'note': _clean(values.get('GhiChu')),
        'condition_json': _parse_condition_json(_clean(values.get('DieuKienJson'))),
    }
    condition, created = AdmissionCondition.objects.get_or_create(
        major_combination=major_combination,
        subject_id=defaults['subject_id'],
        defaults=defaults,
    )
    if created:
        _log_admission_condition(condition, ActionsChoices.CREATE)
        return 'created'
    changed = []
    for field_name, value in defaults.items():
        if getattr(condition, field_name) != value:
            setattr(condition, field_name, value)
            changed.append(field_name)
    if changed:
        condition.action = ActionsChoices.UPDATE
        condition.field_changed = ','.join(changed)
        condition.save(update_fields=[*changed, 'action', 'field_changed', 'update_date'])
        _log_admission_condition(condition, ActionsChoices.UPDATE, condition.field_changed)
        return 'updated'
    return 'skipped'


def _get_major_combination(major_id, combination_id):
    return MajorCombination.objects.get(major_id=major_id, subject_combination_id=combination_id)


def _parse_condition_json(value):
    if not value:
        return None
    try:
        return json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return None


def _to_bool(value):
    return str(_clean(value)).lower() in {'1', 'true'}


def _upsert_subject_from_values(values):
    """
    Create or update one subject from an import row.

    Args:
        values: Validated row values keyed by Excel header.

    Returns:
        One of created, updated, or skipped for counter aggregation.
    """

    subject_id = _clean(values.get('MaMon')).upper()
    name = _clean(values.get('TenMon'))
    with transaction.atomic():
        subject, created = Subject.objects.get_or_create(id=subject_id, defaults={'name': name})
        if created:
            _log_subject(subject, ActionsChoices.CREATE)
            return 'created'
        if subject.name != name:
            subject.name = name
            subject.action = ActionsChoices.UPDATE
            subject.field_changed = 'name'
            subject.save(update_fields=['name', 'action', 'field_changed', 'update_date'])
            _log_subject(subject, ActionsChoices.UPDATE, subject.field_changed)
            return 'updated'
    return 'skipped'


def _validate_import_row(row_number, values):
    """
    Validate one combination import row before database writes.

    Args:
        row_number: 1-based Excel row number for the current data row.
        values: Row values keyed by Excel header.

    Returns:
        RowError when validation fails, otherwise None.
    """

    code = _clean(values.get('MaTH'))
    if not code:
        return RowError(row_number, 'CODE_REQUIRED', 'MaTH là bắt buộc', {'field': 'MaTH', 'value': code})

    raw_subjects = [_clean(values.get(f'Mon{index}')) for index in range(1, 4)]
    if any(not subject_id for subject_id in raw_subjects):
        return RowError(row_number, 'FIELD_REQUIRED', 'Mon1, Mon2, Mon3 là bắt buộc')
    subjects = [_parse_legacy_combination_subject(subject_id) for subject_id in raw_subjects]
    if len(set(subject_id for subject_id, _score_type in subjects)) != len(subjects):
        return RowError(row_number, 'SUBJECTS_DUPLICATE', 'Các môn trong tổ hợp không được trùng nhau')
    missing_subjects = [subject_id for subject_id, _score_type in subjects if not Subject.objects.filter(id=subject_id).exists()]
    if missing_subjects:
        return RowError(row_number, 'SUBJECT_NOT_FOUND', 'Môn học không tồn tại', {'field': 'Mon', 'value': ','.join(missing_subjects)})

    weights = [_to_decimal(values.get(f'TrongSo{index}')) for index in range(1, 4)]
    if any(weight is None or weight < 0 for weight in weights):
        return RowError(row_number, 'FIELD_REQUIRED', 'Trọng số phải là số không âm')
    if sum(weights) <= 0:
        return RowError(row_number, 'WEIGHTS_ZERO', 'Tổng trọng số phải lớn hơn 0')
    return None


def _upsert_combination_from_values(values):
    """
    Create or update one combination from an import row.

    Args:
        values: Validated row values keyed by Excel header.

    Returns:
        One of created, updated, or skipped for counter aggregation.
    """

    code = _clean(values.get('MaTH'))
    subjects = [
        _combination_subject_payload(values, index)
        for index in range(1, 4)
    ]
    with transaction.atomic():
        combination, created = SubjectCombination.objects.get_or_create(id=code)
        before = list(combination.subjects.order_by('position').values_list('subject_id', 'weight', 'score_type'))
        _replace_combination_subjects(combination, subjects)
        after = list(combination.subjects.order_by('position').values_list('subject_id', 'weight', 'score_type'))
        if created:
            _log_subject_combination(combination, ActionsChoices.CREATE)
            return 'created'
        if before != after:
            combination.action = ActionsChoices.UPDATE
            combination.field_changed = 'subjects'
            combination.save(update_fields=['action', 'field_changed', 'update_date'])
            _log_subject_combination(combination, ActionsChoices.UPDATE, combination.field_changed)
            return 'updated'
    return 'skipped'


def _combination_subject_payload(values, index):
    """
    Convert legacy Mon columns into the normalized subject + score type payload.

    Legacy exports may encode the score source in the subject code, e.g. TO_HB or
    LI_NL. The new model stores that source separately in CombinationSubject.score_type.
    """

    subject_id, score_type = _parse_legacy_combination_subject(_clean(values.get(f'Mon{index}')))
    return {
        'score_type': score_type,
        'subject_id': subject_id,
        'weight': _to_decimal(values.get(f'TrongSo{index}')),
    }


def _parse_legacy_combination_subject(raw_subject_id):
    """
    Parse old combination subject codes that include score-source suffixes.
    """

    subject_id = _clean(raw_subject_id).upper()
    for suffix, score_type in LEGACY_COMBINATION_SUFFIXES.items():
        if subject_id.endswith(suffix):
            return subject_id[:-len(suffix)], score_type
    if subject_id.startswith('NK'):
        return subject_id, ScoreTypeChoices.CB
    return subject_id, ScoreTypeChoices.THPT


def _replace_combination_subjects(combination, rows):
    """
    Replace all subject rows for a combination.

    Args:
        combination: SubjectCombination that owns the rows.
        rows: Validated subject rows in display/scoring order.
    """

    combination.subjects.all().delete()
    for position, row in enumerate(rows, start=1):
        entry = CombinationSubject.objects.create(
            subject_combination=combination,
            subject=Subject.objects.get(id=row['subject_id']),
            weight=row['weight'],
            score_type=row['score_type'],
            position=position,
        )
        _log_combination_subject(entry, ActionsChoices.CREATE)


def _log_subject_combination(combination, action, field_changed=''):
    """
    Snapshot a SubjectCombination change into SubjectCombinationLog.

    Args:
        combination: SubjectCombination instance after the create or update.
        action: Audit action from ActionsChoices.
        field_changed: Comma-separated list of changed fields.
    """

    SubjectCombinationLog.objects.create(
        subject_combination=combination,
        name=combination.name,
        action=action,
        field_changed=field_changed,
    )


def _log_subject(subject, action, field_changed=''):
    """
    Snapshot a Subject change into SubjectLog.

    Args:
        subject: Subject instance after the create or update.
        action: Audit action from ActionsChoices.
        field_changed: Comma-separated list of changed fields.
    """

    SubjectLog.objects.create(
        subject=subject,
        name=subject.name,
        action=action,
        field_changed=field_changed,
    )


def _log_combination_subject(entry, action, field_changed=''):
    """
    Snapshot a CombinationSubject change into CombinationSubjectLog.

    Args:
        entry: CombinationSubject instance after the create or update.
        action: Audit action from ActionsChoices.
        field_changed: Comma-separated list of changed fields.
    """

    CombinationSubjectLog.objects.create(
        combination_subject=entry,
        subject_combination_id=entry.subject_combination_id,
        subject_id=entry.subject_id,
        weight=entry.weight,
        score_type=entry.score_type,
        position=entry.position,
        action=action,
        field_changed=field_changed,
    )


def _log_major(major, action, field_changed=''):
    MajorLog.objects.create(
        major=major,
        name=major.name,
        quota=major.quota,
        action=action,
        field_changed=field_changed,
    )


def _log_major_combination(entry, action, field_changed=''):
    MajorCombinationLog.objects.create(
        major_combination=entry,
        major_id=entry.major_id,
        subject_combination_id=entry.subject_combination_id,
        min_score=entry.min_score,
        score_offset=entry.score_offset,
        is_primary=entry.is_primary,
        action=action,
        field_changed=field_changed,
    )


def _log_admission_condition(condition, action, field_changed=''):
    AdmissionConditionLog.objects.create(
        admission_condition=condition,
        major_combination_id=condition.major_combination_id,
        subject_id=condition.subject_id,
        min_subject_score=condition.min_subject_score,
        min_total_score=condition.min_total_score,
        note=condition.note,
        condition_json=condition.condition_json,
        action=action,
        field_changed=field_changed,
    )
