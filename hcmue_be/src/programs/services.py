from django.db import transaction

from core.choices import ActionsChoices, ScoreTypeChoices
from src.candidates.services import ImportSummary, RowError, _clean, _read_xlsx, _row_values, _split_rows, _to_decimal
from src.programs.models import (
    CombinationSubject,
    CombinationSubjectLog,
    Subject,
    SubjectCombination,
    SubjectCombinationLog,
)


REQUIRED_COMBINATION_HEADERS = {'MaTH', 'Mon1', 'Mon2', 'Mon3', 'TrongSo1', 'TrongSo2', 'TrongSo3'}


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

    subjects = [_clean(values.get(f'Mon{index}')) for index in range(1, 4)]
    if any(not subject_id for subject_id in subjects):
        return RowError(row_number, 'FIELD_REQUIRED', 'Mon1, Mon2, Mon3 là bắt buộc')
    if len(set(subjects)) != len(subjects):
        return RowError(row_number, 'SUBJECTS_DUPLICATE', 'Các môn trong tổ hợp không được trùng nhau')
    missing_subjects = [subject_id for subject_id in subjects if not Subject.objects.filter(id=subject_id).exists()]
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
        {
            'score_type': ScoreTypeChoices.THPT,
            'subject_id': _clean(values.get(f'Mon{index}')),
            'weight': _to_decimal(values.get(f'TrongSo{index}')),
        }
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
