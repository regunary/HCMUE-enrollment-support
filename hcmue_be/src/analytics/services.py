from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction

from core.choices import ActionsChoices
from src.analytics.models import PercentileSnapshot, PercentileSnapshotLog
from src.aspirations.models import Aspiration
from src.candidates.models import Candidate
from src.programs.models import MajorCombination


TWO_PLACES = Decimal('0.01')


def calculate_percentile(scores, percentile):
    values = sorted(Decimal(str(score)) for score in scores if score is not None)
    count = len(values)
    if count == 0:
        return None
    percentile = Decimal(str(percentile))
    if percentile <= 0:
        return values[0].quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    if percentile >= 100:
        return values[-1].quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

    position = (percentile / Decimal('100')) * Decimal(count + 1)
    if position <= 1:
        return values[0].quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    if position >= count:
        return values[-1].quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

    lower_position = int(position)
    lower_index = lower_position - 1
    upper_index = lower_index + 1
    fraction = position - Decimal(lower_position)
    interpolated = values[lower_index] + fraction * (values[upper_index] - values[lower_index])
    return interpolated.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def calculate_candidate_score_for_major_combination(candidate, major_combination):
    score_boards = {
        board.score_type: board
        for board in candidate.score_boards.all()
    }
    numerator = Decimal('0')
    denominator = Decimal('0')

    for entry in major_combination.subject_combination.subjects.all():
        board = score_boards.get(entry.score_type)
        if board is None:
            return None
        subject_score = next(
            (score for score in board.scores.all() if score.subject_id == entry.subject_id),
            None,
        )
        if subject_score is None or subject_score.score is None:
            return None
        numerator += subject_score.score * entry.weight
        denominator += entry.weight

    if denominator == 0:
        return None

    score = numerator / denominator
    score += major_combination.score_offset
    priority = getattr(candidate, 'region_priority', None)
    if priority is not None:
        score += priority.bonus_score
    return score.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def scores_for_major_combination(major_combination):
    candidate_ids = Aspiration.objects.filter(
        major=major_combination.major,
        candidate__is_deleted=False,
    ).values_list('candidate_id', flat=True)
    candidates = Candidate.objects.filter(id__in=candidate_ids).select_related('region_priority').prefetch_related(
        'score_boards__scores',
    )
    scores = []
    for candidate in candidates:
        score = calculate_candidate_score_for_major_combination(candidate, major_combination)
        if score is not None:
            scores.append(score)
    return scores


def build_percentile_points(scores, percentiles):
    points = []
    for percentile in percentiles:
        score = calculate_percentile(scores, percentile)
        if score is not None:
            points.append({'percentile': int(percentile), 'score': score})
    return points


@transaction.atomic
def recompute_major_combination_percentiles(round_number=1, percentiles=None, major_combination_id=None):
    percentiles = percentiles or [10, 25, 50, 75, 90]
    combinations = MajorCombination.objects.select_related('major', 'subject_combination').prefetch_related(
        'subject_combination__subjects',
    )
    if major_combination_id is not None:
        combinations = combinations.filter(id=major_combination_id)
    combinations = combinations.order_by('major_id', 'subject_combination_id', 'id')

    results = []
    for major_combination in combinations:
        scores = scores_for_major_combination(major_combination)
        points = build_percentile_points(scores, percentiles)
        response_points = []
        for point in points:
            snapshot, created = PercentileSnapshot.objects.update_or_create(
                major_combination=major_combination,
                percentile=point['percentile'],
                round=round_number,
                defaults={
                    'score': point['score'],
                    'action': ActionsChoices.CREATE,
                    'field_changed': '',
                },
            )
            if not created:
                snapshot.action = ActionsChoices.UPDATE
                snapshot.field_changed = 'score'
                snapshot.save(update_fields=['action', 'field_changed', 'update_date'])
            _log_percentile_snapshot(
                snapshot,
                ActionsChoices.CREATE if created else ActionsChoices.UPDATE,
                snapshot.field_changed or '',
            )
            response_points.append({'percentile': point['percentile'], 'score': f'{point["score"]:.2f}'})
        if response_points:
            results.append({
                'major_combination_id': major_combination.id,
                'major_id': major_combination.major_id,
                'combination_id': major_combination.subject_combination_id,
                'round': round_number,
                'count': len(scores),
                'points': response_points,
            })
    return results


def build_percentile_tables(round_number=1, percentiles=None):
    percentiles = percentiles or [10, 25, 50, 75, 90]
    snapshots = list(
        PercentileSnapshot.objects.filter(round=round_number, percentile__in=percentiles)
        .select_related('major_combination__major', 'major_combination__subject_combination')
        .order_by(
            'major_combination__major_id',
            'major_combination__subject_combination_id',
            'major_combination_id',
            'percentile',
        )
    )
    return {
        'round': round_number,
        'percentiles': [int(percentile) for percentile in percentiles],
        'all': _build_all_table(snapshots, percentiles),
        'majors': _build_major_tables(snapshots, percentiles),
    }


def _build_all_table(snapshots, percentiles):
    by_combination = {}
    for snapshot in snapshots:
        combination_id = snapshot.major_combination.subject_combination_id
        by_combination.setdefault(combination_id, {}).setdefault(snapshot.percentile, []).append(snapshot.score)

    columns = [
        {'key': combination_id, 'combination_id': combination_id, 'label': combination_id}
        for combination_id in sorted(by_combination)
    ]
    rows = []
    for percentile in percentiles:
        values = {}
        for column in columns:
            scores = by_combination[column['key']].get(percentile, [])
            percentile_score = calculate_percentile(scores, 50) if scores else None
            values[column['key']] = _format_score(percentile_score)
        rows.append({'percentile': int(percentile), 'label': f'P{int(percentile)}', 'values': values})
    return {'title': 'Tất cả ngành', 'columns': columns, 'rows': rows}


def _build_major_tables(snapshots, percentiles):
    tables_by_major = {}
    for snapshot in snapshots:
        major = snapshot.major_combination.major
        table = tables_by_major.setdefault(major.id, {
            'major_id': major.id,
            'major_name': major.name,
            'title': major.name,
            'columns_by_key': {},
            'values': {},
        })
        column_key = str(snapshot.major_combination_id)
        table['columns_by_key'].setdefault(column_key, {
            'key': column_key,
            'major_combination_id': snapshot.major_combination_id,
            'combination_id': snapshot.major_combination.subject_combination_id,
            'label': snapshot.major_combination.subject_combination_id,
        })
        table['values'].setdefault(snapshot.percentile, {})[column_key] = _format_score(snapshot.score)

    tables = []
    for table in tables_by_major.values():
        columns = sorted(table['columns_by_key'].values(), key=lambda column: (column['combination_id'], column['major_combination_id']))
        rows = []
        for percentile in percentiles:
            row_values = {column['key']: table['values'].get(percentile, {}).get(column['key']) for column in columns}
            rows.append({'percentile': int(percentile), 'label': f'P{int(percentile)}', 'values': row_values})
        tables.append({
            'major_id': table['major_id'],
            'major_name': table['major_name'],
            'title': table['title'],
            'columns': columns,
            'rows': rows,
        })
    return sorted(tables, key=lambda table: table['major_id'])


def _format_score(score):
    if score is None:
        return None
    return f'{score:.2f}'


def _log_percentile_snapshot(snapshot, action, field_changed=''):
    PercentileSnapshotLog.objects.create(
        percentile_snapshot=snapshot,
        major_combination_id=snapshot.major_combination_id,
        percentile=snapshot.percentile,
        score=snapshot.score,
        round=snapshot.round,
        computed_at=snapshot.computed_at,
        action=action,
        field_changed=field_changed,
    )
