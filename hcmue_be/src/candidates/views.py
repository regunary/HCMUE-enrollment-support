from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from auth.permissions import IsAdmin
from src.candidates.models import Candidate, Region
from src.candidates.serializers import CandidateManualSerializer, ImportFileSerializer, RegionSerializer
from src.candidates.services import (
    APTITUDE_SCORE_COLUMNS,
    DGNL_SCORE_COLUMNS,
    HOCBA_SCORE_COLUMNS,
    THPT_SCORE_COLUMNS,
    create_candidate_manually,
    create_region_manually,
    import_candidate_basic_info,
    import_candidate_scores,
    import_regions,
    serialize_candidate,
    serialize_region,
    update_candidate_manually,
)
from core.choices import ScoreTypeChoices


def validation_error_response(errors):
    """
    Build the validation error shape consumed by the frontend forms.

    Args:
        errors: DRF serializer.errors object.

    Returns:
        DRF Response with success=false, VALIDATION_ERROR, and flattened details.
    """

    return Response(
        {'success': False, 'error': 'VALIDATION_ERROR', 'details': flatten_errors(errors)},
        status=status.HTTP_400_BAD_REQUEST,
    )


def flatten_errors(errors, prefix=''):
    """
    Flatten nested DRF validation errors into dot-path keys.

    Args:
        errors: Nested dict/list/string error structure from DRF.
        prefix: Current dot-path prefix while recursing.

    Returns:
        Dictionary whose keys match frontend form paths such as scores.0.subject_id.
    """

    if isinstance(errors, dict):
        flattened = {}
        for key, value in errors.items():
            path = f'{prefix}.{key}' if prefix else str(key)
            flattened.update(flatten_errors(value, path))
        return flattened
    if isinstance(errors, list):
        if errors and all(not isinstance(item, (dict, list)) for item in errors):
            return {prefix: [str(item) for item in errors]}
        flattened = {}
        for index, value in enumerate(errors):
            path = f'{prefix}.{index}' if prefix else str(index)
            flattened.update(flatten_errors(value, path))
        return flattened
    return {prefix: [str(errors)]}


class RegionListCreateView(GenericAPIView):
    """
    List and create region master data manually.

    Request:
        GET has no body. POST expects JSON with code and bonus_score.

    Response:
        GET returns dropdown-ready region rows. POST returns the created region.
    """

    permission_classes = [IsAdmin]
    serializer_class = RegionSerializer

    def get(self, request):
        """
        Return active regions for frontend dropdowns.

        Args:
            request: DRF request.

        Returns:
            DRF Response with success flag and region results.
        """

        regions = Region.objects.filter(is_deleted=False).order_by('code')
        return Response({'success': True, 'results': [serialize_region(region) for region in regions]})

    def post(self, request):
        """
        Validate and create one region from JSON.

        Args:
            request: DRF request containing region JSON payload.

        Returns:
            DRF Response with created region or validation errors.
        """

        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return validation_error_response(serializer.errors)
        return Response(create_region_manually(serializer.validated_data), status=status.HTTP_201_CREATED)


class CandidateListCreateView(GenericAPIView):
    """
    List candidates and create candidates manually.

    Request:
        GET supports the default unpaginated list for current FE mapping.
        POST expects candidate JSON with optional region_priority and scores.

    Response:
        Candidate payloads matching the manual candidate API contract.
    """

    permission_classes = [IsAdmin]
    serializer_class = CandidateManualSerializer

    def get(self, request):
        """
        Return candidates with nested priority and score data.

        Args:
            request: DRF request.

        Returns:
            DRF Response containing serialized candidates.
        """

        candidates = Candidate.objects.filter(is_deleted=False).order_by('create_date')
        return Response({'success': True, 'results': [serialize_candidate(candidate) for candidate in candidates]})

    def post(self, request):
        """
        Validate and create one candidate from JSON.

        Args:
            request: DRF request containing candidate JSON payload.

        Returns:
            DRF Response with created candidate or validation errors.
        """

        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return validation_error_response(serializer.errors)
        return Response(create_candidate_manually(serializer.validated_data), status=status.HTTP_201_CREATED)


class CandidateDetailView(GenericAPIView):
    """
    Retrieve or update a single candidate manually.

    Request:
        GET has no body. PATCH accepts partial candidate JSON; scores replace all existing scores when supplied.

    Response:
        Candidate payload matching the manual candidate API contract.
    """

    permission_classes = [IsAdmin]
    serializer_class = CandidateManualSerializer

    def get_object(self, pk):
        """
        Resolve a non-deleted candidate by UUID.

        Args:
            pk: Candidate UUID from the URL.

        Returns:
            Candidate instance.
        """

        return get_object_or_404(Candidate.objects.filter(is_deleted=False), pk=pk)

    def get(self, request, pk):
        """
        Return one candidate by id.

        Args:
            request: DRF request.
            pk: Candidate UUID from the URL.

        Returns:
            DRF Response with serialized candidate.
        """

        return Response({'success': True, 'data': serialize_candidate(self.get_object(pk))})

    def patch(self, request, pk):
        """
        Validate and partially update one candidate.

        Args:
            request: DRF request containing partial candidate JSON.
            pk: Candidate UUID from the URL.

        Returns:
            DRF Response with updated candidate or validation errors.
        """

        candidate = self.get_object(pk)
        serializer = self.get_serializer(data=request.data, partial=True, context={'candidate': candidate})
        if not serializer.is_valid():
            return validation_error_response(serializer.errors)
        return Response(update_candidate_manually(candidate, serializer.validated_data))


class RegionImportView(GenericAPIView):
    """
    Handle region master-data import requests.

    Request:
        multipart/form-data with required file field containing the KV/DiemUT .xlsx file.

    Response:
        Import summary with created, updated, skipped, and row-level errors.
    """

    permission_classes = [IsAdmin]
    serializer_class = ImportFileSerializer

    def post(self, request):
        """
        Validate the uploaded file and delegate import work to the region service.

        Args:
            request: DRF request containing multipart upload data.

        Returns:
            DRF Response with import summary or FILE_INVALID error.
        """

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            data = import_regions(serializer.validated_data['file'], request.user)
        except ValueError:
            return Response(
                {'success': False, 'error': 'FILE_INVALID', 'detail': 'Không nhận ra loại file hoặc header không hợp lệ.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(data)


class CandidateImportView(GenericAPIView):
    """
    Handle candidate basic-information import requests.

    Request:
        multipart/form-data with required file field containing the ThongTinCoBan .xlsx file.

    Response:
        Import summary with created, updated, skipped, and row-level errors.
    """

    permission_classes = [IsAdmin]
    serializer_class = ImportFileSerializer

    def post(self, request):
        """
        Validate the uploaded file and delegate import work to the candidate service.

        Args:
            request: DRF request containing multipart upload data.

        Returns:
            DRF Response with import summary or FILE_INVALID error.
        """

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            data = import_candidate_basic_info(serializer.validated_data['file'], request.user)
        except ValueError:
            return Response(
                {'success': False, 'error': 'FILE_INVALID', 'detail': 'Không nhận ra loại file hoặc header không hợp lệ.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(data)


class CandidateScoreImportView(GenericAPIView):
    """
    Handle candidate score import requests for one score type.

    Request:
        multipart/form-data with required file field containing CCCD and score columns.

    Response:
        Import summary with created, updated, skipped, and row-level errors.
    """

    permission_classes = [IsAdmin]
    serializer_class = ImportFileSerializer
    score_type = None
    column_subject_map = None
    max_score = 10

    def post(self, request):
        """
        Validate the uploaded file and delegate score writes to the import service.

        Args:
            request: DRF request containing multipart upload data.

        Returns:
            DRF Response with import summary or FILE_INVALID error.
        """

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            data = import_candidate_scores(
                serializer.validated_data['file'],
                self.score_type,
                self.column_subject_map,
                self.max_score,
                request.user,
            )
        except ValueError:
            return Response(
                {'success': False, 'error': 'FILE_INVALID', 'detail': 'Không nhận ra loại file hoặc header không hợp lệ.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(data)


class CandidateThptScoreImportView(CandidateScoreImportView):
    """
    Import THPT exam scores from DiemThiTHPT.xlsx.
    """

    score_type = ScoreTypeChoices.THPT
    column_subject_map = THPT_SCORE_COLUMNS
    max_score = 10


class CandidateNangLucScoreImportView(CandidateScoreImportView):
    """
    Import specialized competency scores from DiemThiNangLuc.xlsx.
    """

    score_type = ScoreTypeChoices.DGNL
    column_subject_map = DGNL_SCORE_COLUMNS
    max_score = 10


class CandidateNangKhieuScoreImportView(CandidateScoreImportView):
    """
    Import aptitude/specialized scores from DiemThiNangKhieu.xlsx.
    """

    score_type = ScoreTypeChoices.CB
    column_subject_map = APTITUDE_SCORE_COLUMNS
    max_score = 10


class CandidateHocBaScoreImportView(CandidateScoreImportView):
    """
    Import high-school transcript scores from DiemHoBa.xlsx.
    """

    score_type = ScoreTypeChoices.HOCBA
    column_subject_map = HOCBA_SCORE_COLUMNS
    max_score = 10
