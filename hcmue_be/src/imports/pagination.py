DEFAULT_PAGE_SIZE = 100
MAX_PAGE_SIZE = 500


def get_pagination_params(request):
    page = _positive_int(request.query_params.get('page'), 1)
    page_size = _positive_int(request.query_params.get('page_size'), DEFAULT_PAGE_SIZE)
    return page, min(page_size, MAX_PAGE_SIZE)


def paginated_response_payload(request, queryset, serialize_item):
    page, page_size = get_pagination_params(request)
    count = queryset.count()
    start = (page - 1) * page_size
    end = start + page_size
    return {
        'success': True,
        'count': count,
        'page': page,
        'page_size': page_size,
        'results': [serialize_item(item) for item in queryset[start:end]],
    }


def _positive_int(value, default):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    return parsed if parsed > 0 else default
