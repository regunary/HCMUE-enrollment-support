from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation
from pathlib import Path
from zipfile import BadZipFile, ZipFile
import re
import xml.etree.ElementTree as ET

from django.db import transaction
from django.utils import timezone

from core.choices import ActionsChoices, ImportStatusChoices
from src.imports.models import ImportBatch
from src.programs.models import Subject
from src.candidates.models import (
    Candidate,
    CandidateLog,
    Region,
    RegionLog,
    RegionPriority,
    RegionPriorityLog,
    ScoreBoard,
    ScoreBoardLog,
    SubjectScore,
    SubjectScoreLog,
)


CELL_REF_RE = re.compile(r'([A-Z]+)(\d+)')
NS = {'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

REGION_HEADERS = {'KV', 'DiemUT'}
CANDIDATE_HEADERS = {'CCCD', 'KV', 'DT', 'NamTN', 'HocLuc12', 'DiemTN'}
SCORE_HEADERS = {
    'TO', 'VA', 'LI', 'LY', 'HO', 'SI', 'SU', 'DI', 'GDCD', 'GDKTPL', 'TI', 'CNNN', 'CNCN',
    'N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7',
    'TO_NL', 'VA_NL', 'LI_NL', 'LY_NL', 'HO_NL', 'SI_NL', 'TA_NL',
    'NK2', 'NK3', 'NK4', 'NK5',
    'TO_HB', 'VA_HB', 'LI_HB', 'LY_HB', 'HO_HB', 'SI_HB', 'SU_HB', 'DI_HB', 'TA_HB',
    'TI_HB', 'CNNN_HB', 'CNCN_HB', 'GDCD_HB', 'GDKTPL_HB',
}
THPT_SCORE_COLUMNS = {
    'TO': 'TO',
    'VA': 'VA',
    'LI': 'LI',
    'LY': 'LI',
    'HO': 'HO',
    'SI': 'SI',
    'SU': 'SU',
    'DI': 'DI',
    'GDCD': 'GDCD',
    'GDKTPL': 'GDKTPL',
    'TI': 'TI',
    'CNNN': 'CNNN',
    'CNCN': 'CNCN',
    'N1': 'N1',
    'N2': 'N2',
    'N3': 'N3',
    'N4': 'N4',
    'N5': 'N5',
    'N6': 'N6',
    'N7': 'N7',
}
DGNL_SCORE_COLUMNS = {
    'TO_NL': 'TO',
    'VA_NL': 'VA',
    'LI_NL': 'LI',
    'LY_NL': 'LI',
    'HO_NL': 'HO',
    'SI_NL': 'SI',
    'TA_NL': 'TA',
}
HOCBA_SCORE_COLUMNS = {
    'TO_HB': 'TO',
    'VA_HB': 'VA',
    'LI_HB': 'LI',
    'LY_HB': 'LI',
    'HO_HB': 'HO',
    'SI_HB': 'SI',
    'SU_HB': 'SU',
    'DI_HB': 'DI',
    'TA_HB': 'TA',
    'TI_HB': 'TI',
    'CNNN_HB': 'CNNN',
    'CNCN_HB': 'CNCN',
    'GDCD_HB': 'GDCD',
    'GDKTPL_HB': 'GDKTPL',
}
APTITUDE_SCORE_COLUMNS = {
    'NK2': 'NK2',
    'NK3': 'NK3',
    'NK4': 'NK4',
    'NK5': 'NK5',
}

@dataclass
class RowError:
    """
    Represents a validation error for one row in an import file.

    Args:
        row: 1-based Excel row number. Data rows start at 2 because row 1 is the header.
        code: Stable machine-readable error code returned by the API.
        message: Human-readable Vietnamese error message for the operator.
        identifier: Optional field/value context that helps locate the invalid cell.

    Methods:
        as_dict: Convert the RowError to a dictionary for API response or JSON serialization.
    """

    row: int
    code: str
    message: str
    identifier: dict = field(default_factory=dict)

    def as_dict(self):
        data = {'row': self.row, 'code': self.code, 'message': self.message}
        if self.identifier:
            data['identifier'] = self.identifier
        return data

@dataclass
class ImportSummary:
    """
    Aggregates import counters and row-level validation errors.

    Args:
        created: Number of rows that created new database records.
        updated: Number of rows that changed existing database records.
        skipped: Number of valid rows that produced no data change.
        errors: Row-level errors collected while processing the import file.

    Methods:
        as_response: Convert the summary to the API response payload.
    """

    created: int = 0
    updated: int = 0
    skipped: int = 0
    errors: list[RowError] = field(default_factory=list)

    def as_response(self):
        return {
            'success': True,
            'created': self.created,
            'updated': self.updated,
            'skipped': self.skipped,
            'errors': [error.as_dict() for error in self.errors],
        }


def import_regions(file_obj, user=None):
    """
    Import region master data from the KV/DiemUT Excel template.

    Args:
        file_obj: Uploaded .xlsx file object from the multipart request.
        user: Authenticated user that initiated the import, stored on ImportBatch.

    Returns:
        Dictionary containing success status, counters, and row-level errors.

    Raises:
        ValueError: Raised with FILE_INVALID when the uploaded file is not a readable .xlsx file.
    """

    rows = _read_xlsx(file_obj)
    summary = ImportSummary()
    batch = _create_batch(file_obj, user)

    headers, data_rows = _split_rows(rows)
    missing = REGION_HEADERS - set(headers)
    if missing:
        return _fail_batch(batch, summary, 'MISSING_REQUIRED_COLUMNS', f'Thiếu cột: {", ".join(sorted(missing))}')

    for row_number, row in data_rows:
        values = _row_values(headers, row)
        code = _clean(values.get('KV'))
        bonus_score = _to_decimal(values.get('DiemUT'))
        if not code:
            summary.errors.append(RowError(row_number, 'KV_REQUIRED', 'KV là bắt buộc', {'field': 'KV', 'value': code}))
            continue
        if bonus_score is None or bonus_score < 0:
            summary.errors.append(RowError(row_number, 'SCORE_OUT_OF_RANGE', 'DiemUT không hợp lệ', {'field': 'DiemUT', 'value': values.get('DiemUT')}))
            continue

        with transaction.atomic():
            region, created = Region.objects.get_or_create(code=code, defaults={'bonus_score': bonus_score})
            changed = []
            if not created and region.bonus_score != bonus_score:
                region.bonus_score = bonus_score
                region.action = ActionsChoices.UPDATE
                changed.append('bonus_score')
                region.field_changed = ','.join(changed)
                region.save(update_fields=['bonus_score', 'action', 'field_changed', 'update_date'])
            if created:
                summary.created += 1
                _log_region(region, ActionsChoices.CREATE)
            elif changed:
                summary.updated += 1
                _log_region(region, ActionsChoices.UPDATE, ','.join(changed))
            else:
                summary.skipped += 1

    _complete_batch(batch, summary)
    return summary.as_response()


def import_candidate_basic_info(file_obj, user=None):
    """
    Import candidate basic information from the ThongTinCoBan Excel template.

    Args:
        file_obj: Uploaded .xlsx file object from the multipart request.
        user: Authenticated user that initiated the import, stored on ImportBatch.

    Returns:
        Dictionary containing success status, counters, and row-level errors.

    Raises:
        ValueError: Raised with FILE_INVALID when the uploaded file is not a readable .xlsx file.
    """

    rows = _read_xlsx(file_obj)
    summary = ImportSummary()
    batch = _create_batch(file_obj, user)

    headers, data_rows = _split_rows(rows)
    if 'CCCD' not in headers:
        return _fail_batch(batch, summary, 'MISSING_REQUIRED_COLUMNS', 'Thiếu cột: CCCD')
    if set(headers) & SCORE_HEADERS:
        return _fail_batch(batch, summary, 'FILE_MIXED_TYPES', 'File thông tin thí sinh không được chứa cột điểm')

    for row_number, row in data_rows:
        values = _row_values(headers, row)
        error = _validate_candidate_row(row_number, values)
        if error:
            summary.errors.append(error)
            continue
        row_result = _upsert_candidate(values, batch)
        if row_result == 'created':
            summary.created += 1
        elif row_result == 'updated':
            summary.updated += 1
        else:
            summary.skipped += 1

    _complete_batch(batch, summary)
    return summary.as_response()


def import_candidate_scores(file_obj, score_type, column_subject_map, max_score, user=None):
    """
    Import candidate subject scores from an Excel score template.

    Args:
        file_obj: Uploaded .xlsx file object from the multipart request.
        score_type: ScoreBoard.score_type value to write.
        column_subject_map: Mapping from Excel score columns to Subject.id values.
        max_score: Maximum allowed score for this score type.
        user: Authenticated user that initiated the import, stored on ImportBatch.

    Returns:
        Dictionary containing success status, counters, and row-level errors.

    Raises:
        ValueError: Raised with FILE_INVALID when the uploaded file is not a readable .xlsx file.
    """

    rows = _read_xlsx(file_obj)
    summary = ImportSummary()
    batch = _create_batch(file_obj, user)

    headers, data_rows = _split_rows(rows)
    if 'CCCD' not in headers:
        return _fail_batch(batch, summary, 'MISSING_REQUIRED_COLUMNS', 'Thiếu cột: CCCD')
    score_columns = [header for header in headers if header in column_subject_map]
    if not score_columns:
        return _fail_batch(batch, summary, 'MISSING_REQUIRED_COLUMNS', 'File không có cột điểm phù hợp')

    for row_number, row in data_rows:
        values = _row_values(headers, row)
        error = _validate_score_row(row_number, values, score_columns, column_subject_map, max_score)
        if error:
            summary.errors.append(error)
            continue
        row_result = _upsert_candidate_scores(values, score_type, score_columns, column_subject_map)
        summary.created += row_result['created']
        summary.updated += row_result['updated']
        summary.skipped += row_result['skipped']

    _complete_batch(batch, summary)
    return summary.as_response()


def create_region_manually(validated_data):
    """
    Create one Region row from a JSON request.

    Args:
        validated_data: RegionSerializer validated data.

    Returns:
        API response payload containing the created region.
    """

    with transaction.atomic():
        region = Region.objects.create(**validated_data)
        _log_region(region, ActionsChoices.CREATE)
    return {'success': True, 'data': serialize_region(region)}


def delete_region_manually(region):
    """
    Hard-delete one Region after writing a DELETE audit snapshot.

    Args:
        region: Region instance resolved by the detail API.

    Returns:
        API response payload confirming the deletion.
    """

    with transaction.atomic():
        region.is_deleted = True
        region.deleted_at = timezone.now()
        region.action = ActionsChoices.DELETE
        region.field_changed = 'deleted'
        _log_region(region, ActionsChoices.DELETE, region.field_changed)
        region.delete()
    return {'success': True}


def create_candidate_manually(validated_data):
    """
    Create a candidate, optional region priority, and optional score rows from JSON.

    Args:
        validated_data: CandidateManualSerializer validated data.

    Returns:
        API response payload containing the created candidate.
    """

    scores = validated_data.pop('scores', [])
    region_priority = validated_data.pop('region_priority', None)
    with transaction.atomic():
        candidate = Candidate.objects.create(**validated_data)
        _log_candidate(candidate, ActionsChoices.CREATE)
        _save_manual_region_priority(candidate, region_priority)
        _replace_manual_scores(candidate, scores)
    return {'success': True, 'data': serialize_candidate(candidate)}


def update_candidate_manually(candidate, validated_data):
    """
    Update a candidate from JSON; scores are replaced when the scores field is supplied.

    Args:
        candidate: Existing Candidate instance to update.
        validated_data: CandidateManualSerializer validated data.

    Returns:
        API response payload containing the updated candidate.
    """

    scores = validated_data.pop('scores', None)
    region_priority = validated_data.pop('region_priority', None)
    changed = []
    with transaction.atomic():
        for field_name, value in validated_data.items():
            if getattr(candidate, field_name) != value:
                setattr(candidate, field_name, value)
                changed.append(field_name)
        if changed:
            candidate.action = ActionsChoices.UPDATE
            candidate.field_changed = ','.join(changed)
            candidate.save()
            _log_candidate(candidate, ActionsChoices.UPDATE, candidate.field_changed)
        if region_priority is not None:
            _save_manual_region_priority(candidate, region_priority)
        if scores is not None:
            _replace_manual_scores(candidate, scores)
    return {'success': True, 'data': serialize_candidate(candidate)}


def delete_candidate_manually(candidate):
    """
    Hard-delete one Candidate after writing a DELETE audit snapshot.

    Args:
        candidate: Candidate instance resolved by the detail API.

    Returns:
        API response payload confirming the deletion.
    """

    with transaction.atomic():
        candidate.is_deleted = True
        candidate.deleted_at = timezone.now()
        candidate.action = ActionsChoices.DELETE
        candidate.field_changed = 'deleted'
        _log_candidate(candidate, ActionsChoices.DELETE, candidate.field_changed)
        candidate.delete()
    return {'success': True}


def serialize_region(region):
    """
    Serialize Region for API responses.

    Args:
        region: Region instance to serialize.

    Returns:
        Dictionary containing region code and bonus score.
    """

    return {'code': region.code, 'bonus_score': region.bonus_score}


def serialize_candidate(candidate):
    """
    Serialize Candidate with nested region priority and score rows.

    Args:
        candidate: Candidate instance to serialize.

    Returns:
        Dictionary matching the manual candidate API contract.
    """

    candidate.refresh_from_db()
    priority = getattr(candidate, 'region_priority', None)
    scores = []
    for board in candidate.score_boards.prefetch_related('scores__subject').order_by('score_type'):
        for subject_score in board.scores.all().order_by('subject_id'):
            scores.append({
                'score_type': board.score_type,
                'subject_id': subject_score.subject_id,
                'score': subject_score.score,
            })
    return {
        'id': str(candidate.id),
        'cccd': candidate.cccd,
        'ticket_number': candidate.ticket_number,
        'graduation_year': candidate.graduation_year,
        'academic_level': candidate.academic_level,
        'graduation_score': candidate.graduation_score,
        'region_priority': None if priority is None else {
            'region_code': priority.region_code,
            'bonus_score': priority.bonus_score,
            'special_code': priority.special_code,
        },
        'scores': scores,
    }


def _save_manual_region_priority(candidate, data):
    """
    Create or update RegionPriority from manual candidate form data.

    Args:
        candidate: Candidate that owns the priority record.
        data: Nested region_priority payload validated by CandidateManualSerializer.

    Returns:
        RegionPriority when data is provided; otherwise None.
    """

    if not data:
        return None
    region_code = _clean(data.get('region_code'))
    special_code = _clean(data.get('special_code'))
    if not region_code:
        return None

    region = Region.objects.get(code=region_code)
    priority, created = RegionPriority.objects.get_or_create(
        candidate=candidate,
        defaults={
            'region': region,
            'special_code': special_code or None,
            'bonus_score': region.bonus_score,
        },
    )
    if created:
        _log_region_priority(priority, ActionsChoices.CREATE)
        return priority

    changed = []
    if priority.region_code != region.code:
        priority.region = region
        priority.bonus_score = region.bonus_score
        changed.extend(['region_code', 'bonus_score'])
    if priority.special_code != (special_code or None):
        priority.special_code = special_code or None
        changed.append('special_code')
    if changed:
        priority.action = ActionsChoices.UPDATE
        priority.field_changed = ','.join(changed)
        priority.save(update_fields=['region', 'special_code', 'bonus_score', 'action', 'field_changed', 'update_date'])
        _log_region_priority(priority, ActionsChoices.UPDATE, priority.field_changed)
    return priority


def _replace_manual_scores(candidate, rows):
    """
    Replace all score rows for a candidate with the submitted score list.

    Args:
        candidate: Candidate that owns the score boards.
        rows: List of validated score rows from CandidateManualSerializer.
    """

    ScoreBoard.objects.filter(candidate=candidate).delete()
    boards_by_type = {}
    for row in rows:
        board = boards_by_type.get(row['score_type'])
        if board is None:
            board = ScoreBoard.objects.create(candidate=candidate, score_type=row['score_type'])
            boards_by_type[row['score_type']] = board
            _log_score_board(board, ActionsChoices.CREATE)
        subject_score = SubjectScore.objects.create(
            score_board=board,
            subject=Subject.objects.get(id=row['subject_id']),
            score=row.get('score'),
        )
        _log_subject_score(subject_score, ActionsChoices.CREATE)


def _read_xlsx(file_obj):
    """
    Read the first worksheet from a simple .xlsx file into a list of row values.

    Args:
        file_obj: Uploaded file object positioned anywhere in the stream.

    Returns:
        List of rows, where each row is a list of raw cell values.

    Raises:
        ValueError: Raised with FILE_INVALID for non-.xlsx or malformed Excel files.
    """

    # The project currently has no Excel dependency; this parser supports simple worksheet tables.
    suffix = Path(file_obj.name).suffix.lower()
    if suffix != '.xlsx':
        raise ValueError('FILE_INVALID')
    try:
        file_obj.seek(0)
        with ZipFile(file_obj) as archive:
            shared_strings = _read_shared_strings(archive)
            sheet_name = _first_sheet_name(archive)
            xml = archive.read(sheet_name)
    except (BadZipFile, KeyError):
        raise ValueError('FILE_INVALID') from None

    root = ET.fromstring(xml)
    rows = []
    for row in root.findall('.//main:sheetData/main:row', NS):
        values = []
        for cell in row.findall('main:c', NS):
            index = _column_index(cell.attrib.get('r', 'A1'))
            while len(values) < index:
                values.append('')
            values[index - 1] = _cell_value(cell, shared_strings)
        rows.append(values)
    return rows


def _read_shared_strings(archive):
    """
    Extract the shared string table used by .xlsx worksheets.

    Args:
        archive: Open ZipFile for the uploaded .xlsx file.

    Returns:
        Ordered list of shared string values; empty when the workbook does not use shared strings.
    """

    if 'xl/sharedStrings.xml' not in archive.namelist():
        return []
    root = ET.fromstring(archive.read('xl/sharedStrings.xml'))
    values = []
    for item in root.findall('main:si', NS):
        texts = [node.text or '' for node in item.findall('.//main:t', NS)]
        values.append(''.join(texts))
    return values


def _first_sheet_name(archive):
    """
    Resolve the worksheet XML path to read from the workbook archive.

    Args:
        archive: Open ZipFile for the uploaded .xlsx file.

    Returns:
        Path inside the archive for the first worksheet.

    Raises:
        KeyError: Raised when the archive does not contain any worksheet XML.
    """

    if 'xl/worksheets/sheet1.xml' in archive.namelist():
        return 'xl/worksheets/sheet1.xml'
    sheet_names = [name for name in archive.namelist() if name.startswith('xl/worksheets/sheet')]
    if not sheet_names:
        raise KeyError('sheet')
    return sorted(sheet_names)[0]


def _column_index(cell_ref):
    """
    Convert an Excel cell reference to a 1-based column index.

    Args:
        cell_ref: Excel cell reference such as A1, B2, or AA10.

    Returns:
        1-based column index used to place sparse cell values into row lists.
    """

    match = CELL_REF_RE.match(cell_ref)
    letters = match.group(1) if match else 'A'
    index = 0
    for char in letters:
        index = index * 26 + ord(char) - ord('A') + 1
    return index


def _cell_value(cell, shared_strings):
    """
    Read the string or numeric value from a worksheet cell XML node.

    Args:
        cell: XML element for a worksheet cell.
        shared_strings: Shared string values loaded from xl/sharedStrings.xml.

    Returns:
        Cell value as a string, or an empty string for blank cells.
    """

    cell_type = cell.attrib.get('t')
    if cell_type == 'inlineStr':
        text_node = cell.find('main:is/main:t', NS)
        return text_node.text if text_node is not None else ''
    value_node = cell.find('main:v', NS)
    if value_node is None or value_node.text is None:
        return ''
    if cell_type == 's':
        return shared_strings[int(value_node.text)]
    return value_node.text


def _split_rows(rows):
    """
    Split worksheet rows into headers and non-empty data rows.

    Args:
        rows: Raw worksheet rows returned by _read_xlsx.

    Returns:
        Tuple of headers and data rows. Data rows include the 1-based Excel row number.
    """

    if not rows:
        return [], []
    headers = [_clean(value) for value in rows[0]]
    data_rows = [(index, row) for index, row in enumerate(rows[1:], start=2) if any(_clean(value) for value in row)]
    return headers, data_rows


def _row_values(headers, row):
    """
    Map one worksheet row to a dictionary keyed by header names.

    Args:
        headers: Header values from the first worksheet row.
        row: Raw cell values for one data row.

    Returns:
        Dictionary containing only non-empty header keys.
    """

    return {
        header: row[index] if index < len(row) else ''
        for index, header in enumerate(headers)
        if header
    }


def _validate_candidate_row(row_number, values):
    """
    Validate one candidate import row before database writes.

    Args:
        row_number: 1-based Excel row number for the current data row.
        values: Row values keyed by Excel header.

    Returns:
        RowError when validation fails, otherwise None.
    """

    cccd = _clean_cccd(values.get('CCCD'))
    if not cccd:
        return RowError(row_number, 'CCCD_REQUIRED', 'CCCD là bắt buộc', {'field': 'CCCD', 'value': cccd})
    if not re.fullmatch(r'\d{12}', cccd):
        return RowError(row_number, 'CCCD_FORMAT', 'CCCD không đúng 12 chữ số', {'field': 'CCCD', 'value': cccd})

    region_code = _clean(values.get('KV'))
    if region_code and not Region.objects.filter(code=region_code, is_deleted=False).exists():
        return RowError(row_number, 'KV_NOT_FOUND', 'KV chưa tồn tại trong danh mục khu vực', {'field': 'KV', 'value': region_code})

    academic_level = _clean(values.get('HocLuc12'))
    if academic_level and academic_level not in {'0', '1'}:
        return RowError(row_number, 'HOC_LUC_INVALID', 'HocLuc12 chỉ nhận 0 hoặc 1', {'field': 'HocLuc12', 'value': academic_level})

    graduation_year = _clean(values.get('NamTN'))
    if graduation_year and not graduation_year.isdigit():
        return RowError(row_number, 'FIELD_INVALID', 'NamTN không hợp lệ', {'field': 'NamTN', 'value': graduation_year})

    graduation_score = _to_decimal(values.get('DiemTN'))
    if _clean(values.get('DiemTN')) and (graduation_score is None or graduation_score < 0 or graduation_score > 10):
        return RowError(row_number, 'SCORE_OUT_OF_RANGE', 'DiemTN phải trong khoảng 0..10', {'field': 'DiemTN', 'value': values.get('DiemTN')})
    return None


def _validate_score_row(row_number, values, score_columns, column_subject_map, max_score):
    """
    Validate one score import row before database writes.

    Args:
        row_number: 1-based Excel row number for the current data row.
        values: Row values keyed by Excel header.
        score_columns: Score columns detected in the uploaded template.
        column_subject_map: Mapping from Excel score columns to Subject.id values.
        max_score: Maximum allowed score for this score type.

    Returns:
        RowError when validation fails, otherwise None.
    """

    cccd = _clean_cccd(values.get('CCCD'))
    if not cccd:
        return RowError(row_number, 'CCCD_REQUIRED', 'CCCD là bắt buộc', {'field': 'CCCD', 'value': cccd})
    if not re.fullmatch(r'\d{12}', cccd):
        return RowError(row_number, 'CCCD_FORMAT', 'CCCD không đúng 12 chữ số', {'field': 'CCCD', 'value': cccd})
    if not Candidate.objects.filter(cccd=cccd, is_deleted=False).exists():
        return RowError(row_number, 'CANDIDATE_NOT_FOUND', 'Không tìm thấy thí sinh theo CCCD', {'field': 'CCCD', 'value': cccd})

    for column in score_columns:
        subject_id = column_subject_map[column]
        if not Subject.objects.filter(id=subject_id).exists():
            return RowError(row_number, 'SUBJECT_NOT_FOUND', 'Môn học không tồn tại', {'field': column, 'value': subject_id})
        raw_score = _clean(values.get(column))
        if not raw_score:
            continue
        score = _to_decimal(raw_score)
        if score is None or score < 0 or score > max_score:
            return RowError(row_number, 'SCORE_OUT_OF_RANGE', 'Điểm không hợp lệ', {'field': column, 'value': values.get(column)})
    return None


def _upsert_candidate_scores(values, score_type, score_columns, column_subject_map):
    """
    Create or update score rows for one candidate import row.

    Args:
        values: Validated row values keyed by Excel header.
        score_type: ScoreBoard.score_type value to write.
        score_columns: Score columns detected in the uploaded template.
        column_subject_map: Mapping from Excel score columns to Subject.id values.

    Returns:
        Dictionary with created, updated, and skipped counters.
    """

    candidate = Candidate.objects.get(cccd=_clean_cccd(values.get('CCCD')), is_deleted=False)
    counters = {'created': 0, 'updated': 0, 'skipped': 0}
    wrote_any_score = False
    with transaction.atomic():
        board = None
        for column in score_columns:
            score = _to_decimal(values.get(column))
            if score is None:
                continue
            if board is None:
                board, board_created = ScoreBoard.objects.get_or_create(candidate=candidate, score_type=score_type)
                if board_created:
                    _log_score_board(board, ActionsChoices.CREATE)
            subject = Subject.objects.get(id=column_subject_map[column])
            subject_score, created = SubjectScore.objects.get_or_create(
                score_board=board,
                subject=subject,
                defaults={'score': score},
            )
            wrote_any_score = True
            if created:
                counters['created'] += 1
                _log_subject_score(subject_score, ActionsChoices.CREATE)
            elif subject_score.score != score:
                subject_score.score = score
                subject_score.action = ActionsChoices.UPDATE
                subject_score.field_changed = 'score'
                subject_score.save(update_fields=['score', 'action', 'field_changed', 'update_date'])
                counters['updated'] += 1
                _log_subject_score(subject_score, ActionsChoices.UPDATE, subject_score.field_changed)
        if not wrote_any_score:
            counters['skipped'] += 1
    return counters


def _upsert_candidate(values, batch):
    """
    Create or update a candidate and its region priority from one valid row.

    Args:
        values: Validated row values keyed by Excel header.
        batch: ImportBatch tracking this import run.

    Returns:
        One of created, updated, or skipped for counter aggregation.
    """

    cccd = _clean_cccd(values.get('CCCD'))
    candidate, created = Candidate.objects.get_or_create(cccd=cccd, defaults={'import_batch': batch})
    candidate_changes = []
    _assign_if_present(candidate, 'graduation_year', _to_int(values.get('NamTN')), candidate_changes)
    _assign_if_present(candidate, 'academic_level', _clean(values.get('HocLuc12')), candidate_changes)
    _assign_if_present(candidate, 'graduation_score', _to_decimal(values.get('DiemTN')), candidate_changes)
    if candidate.import_batch_id != batch.id and (created or candidate_changes):
        candidate.import_batch = batch
        candidate_changes.append('import_batch')

    priority_changed = _upsert_region_priority(candidate, values)
    with transaction.atomic():
        if created:
            candidate.action = ActionsChoices.CREATE
            candidate.field_changed = ','.join(candidate_changes)
            candidate.save()
            _log_candidate(candidate, ActionsChoices.CREATE, candidate.field_changed)
            return 'created'
        if candidate_changes:
            candidate.action = ActionsChoices.UPDATE
            candidate.field_changed = ','.join(candidate_changes)
            candidate.save()
            _log_candidate(candidate, ActionsChoices.UPDATE, candidate.field_changed)
        if priority_changed and not candidate_changes:
            candidate.import_batch = batch
            candidate.action = ActionsChoices.UPDATE
            candidate.field_changed = 'region_priority'
            candidate.save(update_fields=['import_batch', 'action', 'field_changed', 'update_date'])
            _log_candidate(candidate, ActionsChoices.UPDATE, candidate.field_changed)
        return 'updated' if candidate_changes or priority_changed else 'skipped'


def _upsert_region_priority(candidate, values):
    """
    Create or update the candidate's region priority from KV and DT values.

    Args:
        candidate: Candidate instance being imported.
        values: Validated row values keyed by Excel header.

    Returns:
        True when region priority was created or changed; otherwise False.
    """

    region_code = _clean(values.get('KV'))
    special_code = _clean(values.get('DT'))
    if not region_code and not special_code:
        return False

    defaults = {}
    if region_code:
        region = Region.objects.get(code=region_code)
        defaults['region'] = region
        defaults['bonus_score'] = region.bonus_score
    if special_code:
        defaults['special_code'] = special_code

    priority, created = RegionPriority.objects.get_or_create(candidate=candidate, defaults=defaults)
    changed = []
    if not created:
        if region_code and priority.region_code != region_code:
            region = Region.objects.get(code=region_code)
            priority.region = region
            priority.bonus_score = region.bonus_score
            changed.extend(['region_code', 'bonus_score'])
        if special_code and priority.special_code != special_code:
            priority.special_code = special_code
            changed.append('special_code')

    if created:
        _log_region_priority(priority, ActionsChoices.CREATE)
        return True
    if changed:
        priority.action = ActionsChoices.UPDATE
        priority.field_changed = ','.join(changed)
        priority.save(update_fields=['region', 'special_code', 'bonus_score', 'action', 'field_changed', 'update_date'])
        _log_region_priority(priority, ActionsChoices.UPDATE, priority.field_changed)
        return True
    return False


def _assign_if_present(instance, field_name, value, changes):
    """
    Assign a model field only when the imported cell contains a value.

    Args:
        instance: Django model instance being updated.
        field_name: Name of the model field to update.
        value: Parsed import value; None or empty string means no update.
        changes: Mutable list that receives field names that changed.
    """

    # Import merge rule: blank cells must not overwrite existing candidate data.
    if value in (None, ''):
        return
    if getattr(instance, field_name) != value:
        setattr(instance, field_name, value)
        changes.append(field_name)


def _create_batch(file_obj, user):
    """
    Create an ImportBatch before row processing starts.

    Args:
        file_obj: Uploaded file object used to store the source file name.
        user: Authenticated user that initiated the import.

    Returns:
        ImportBatch with processing status.
    """

    return ImportBatch.objects.create(
        file_name=getattr(file_obj, 'name', ''),
        imported_by=user if getattr(user, 'is_authenticated', False) else None,
        status=ImportStatusChoices.PROCESSING,
    )


def _complete_batch(batch, summary):
    """
    Persist final import counters to the ImportBatch.

    Args:
        batch: ImportBatch created for the current import run.
        summary: ImportSummary containing counters and errors.
    """

    batch.status = ImportStatusChoices.DONE
    batch.row_count = summary.created + summary.updated + summary.skipped + len(summary.errors)
    batch.created_count = summary.created
    batch.updated_count = summary.updated
    batch.error_count = len(summary.errors)
    batch.save(update_fields=['status', 'row_count', 'created_count', 'updated_count', 'error_count', 'update_date'])


def _fail_batch(batch, summary, code, message):
    """
    Mark an ImportBatch as failed before row-level processing can continue.

    Args:
        batch: ImportBatch created for the current import run.
        summary: ImportSummary that receives the file-level error.
        code: Stable machine-readable error code.
        message: Human-readable Vietnamese error message.

    Returns:
        API response payload built from the updated summary.
    """

    summary.errors.append(RowError(1, code, message))
    batch.status = ImportStatusChoices.FAILED
    batch.error_count = 1
    batch.save(update_fields=['status', 'error_count', 'update_date'])
    return summary.as_response()


def _log_region(region, action, field_changed=''):
    """
    Snapshot a Region change into RegionLog.

    Args:
        region: Region instance after the create or update.
        action: Audit action from ActionsChoices.
        field_changed: Comma-separated list of changed fields.
    """

    RegionLog.objects.create(
        region=region,
        code=region.code,
        bonus_score=region.bonus_score,
        is_deleted=region.is_deleted,
        deleted_at=region.deleted_at,
        action=action,
        field_changed=field_changed,
    )


def _log_candidate(candidate, action, field_changed=''):
    """
    Snapshot a Candidate change into CandidateLog.

    Args:
        candidate: Candidate instance after the create or update.
        action: Audit action from ActionsChoices.
        field_changed: Comma-separated list of changed fields.
    """

    CandidateLog.objects.create(
        candidate=candidate,
        cccd=candidate.cccd,
        ticket_number=candidate.ticket_number,
        graduation_year=candidate.graduation_year,
        academic_level=candidate.academic_level,
        graduation_score=candidate.graduation_score,
        import_batch_id=candidate.import_batch_id,
        is_deleted=candidate.is_deleted,
        deleted_at=candidate.deleted_at,
        action=action,
        field_changed=field_changed,
    )


def _log_region_priority(priority, action, field_changed=''):
    """
    Snapshot a RegionPriority change into RegionPriorityLog.

    Args:
        priority: RegionPriority instance after the create or update.
        action: Audit action from ActionsChoices.
        field_changed: Comma-separated list of changed fields.
    """

    RegionPriorityLog.objects.create(
        region_priority=priority,
        candidate_id=priority.candidate_id,
        region_code=priority.region_code,
        special_code=priority.special_code,
        bonus_score=priority.bonus_score,
        action=action,
        field_changed=field_changed,
    )


def _log_score_board(score_board, action, field_changed=''):
    """
    Snapshot a ScoreBoard change into ScoreBoardLog.

    Args:
        score_board: ScoreBoard instance after the create or update.
        action: Audit action from ActionsChoices.
        field_changed: Comma-separated list of changed fields.
    """

    ScoreBoardLog.objects.create(
        score_board=score_board,
        candidate_id=score_board.candidate_id,
        score_type=score_board.score_type,
        action=action,
        field_changed=field_changed,
    )


def _log_subject_score(subject_score, action, field_changed=''):
    """
    Snapshot a SubjectScore change into SubjectScoreLog.

    Args:
        subject_score: SubjectScore instance after the create or update.
        action: Audit action from ActionsChoices.
        field_changed: Comma-separated list of changed fields.
    """

    SubjectScoreLog.objects.create(
        subject_score=subject_score,
        score_board_id=subject_score.score_board_id,
        subject_id=subject_score.subject_id,
        score=subject_score.score,
        action=action,
        field_changed=field_changed,
    )


def _clean(value):
    """
    Normalize raw Excel cell values before validation.

    Args:
        value: Raw cell value from the worksheet parser.

    Returns:
        Trimmed string value; numeric-looking strings ending in .0 are normalized.
    """

    if value is None:
        return ''
    text = str(value).strip()
    if text.endswith('.0'):
        text = text[:-2]
    return text


def _clean_cccd(value):
    """
    Normalize CCCD values coming from Excel before validation and lookup.

    Args:
        value: Raw CCCD cell value from the worksheet parser.

    Returns:
        CCCD string with Excel text apostrophe removed and one lost leading zero restored.
    """

    text = _clean(value)
    if text.startswith("'"):
        text = text[1:].strip()
    if text.isdigit() and len(text) == 11:
        text = text.zfill(12)
    return text


def _to_decimal(value):
    """
    Convert a raw Excel cell value to Decimal when possible.

    Args:
        value: Raw cell value from the worksheet parser.

    Returns:
        Decimal value, or None for blank/invalid input.
    """

    text = _clean(value)
    if not text:
        return None
    try:
        return Decimal(text)
    except InvalidOperation:
        return None


def _to_int(value):
    """
    Convert a raw Excel cell value to int when present.

    Args:
        value: Raw cell value from the worksheet parser.

    Returns:
        Integer value, or None for blank input.
    """

    text = _clean(value)
    return int(text) if text else None
