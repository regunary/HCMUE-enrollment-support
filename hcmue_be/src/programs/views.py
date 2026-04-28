from rest_framework import status
from rest_framework.generics import GenericAPIView, get_object_or_404
from rest_framework.response import Response
from django.db.models.deletion import ProtectedError

from auth.permissions import IsAdmin
from src.programs.models import Subject, SubjectCombination
from src.programs.serializers import CombinationManualSerializer, ImportFileSerializer, SubjectSerializer
from src.programs.services import (
    create_combination_manually,
    create_subject_manually,
    delete_combination_manually,
    delete_subject_manually,
    import_combinations,
    import_subjects,
    serialize_combination,
    serialize_subject,
    update_combination_manually,
    update_subject_manually,
)


def validation_error_response(errors):
    """
    Build the validation error shape consumed by frontend forms.

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
        Dictionary whose keys match frontend form paths such as subjects.0.subject_id.
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


class CombinationListCreateView(GenericAPIView):
    """
    List and create subject combinations manually.

    Request:
        GET has no body. POST expects id, optional name, and subject rows.

    Response:
        Combination payloads with nested subject rows.
    """

    permission_classes = [IsAdmin]
    serializer_class = CombinationManualSerializer

    def get(self, request):
        """
        Return subject combinations for management screens.

        Args:
            request: DRF request.

        Returns:
            DRF Response containing serialized combinations.
        """

        combinations = SubjectCombination.objects.all().order_by('id')
        return Response({'success': True, 'results': [serialize_combination(combination) for combination in combinations]})

    def post(self, request):
        """
        Validate and create one subject combination from JSON.

        Args:
            request: DRF request containing combination JSON payload.

        Returns:
            DRF Response with created combination or validation errors.
        """

        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return validation_error_response(serializer.errors)
        return Response(create_combination_manually(serializer.validated_data), status=status.HTTP_201_CREATED)


class SubjectListCreateView(GenericAPIView):
    """
    List and create subject master data manually.

    Request:
        GET has no body. POST expects id and name.

    Response:
        Subject payloads used by score and combination dropdowns.
    """

    permission_classes = [IsAdmin]
    serializer_class = SubjectSerializer

    def get(self, request):
        """
        Return subjects for frontend dropdowns.

        Args:
            request: DRF request.

        Returns:
            DRF Response containing serialized subjects.
        """

        subjects = Subject.objects.all().order_by('id')
        return Response({'success': True, 'results': [serialize_subject(subject) for subject in subjects]})

    def post(self, request):
        """
        Validate and create one subject from JSON.

        Args:
            request: DRF request containing subject JSON payload.

        Returns:
            DRF Response with created subject or validation errors.
        """

        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return validation_error_response(serializer.errors)
        return Response(create_subject_manually(serializer.validated_data), status=status.HTTP_201_CREATED)


class SubjectDetailView(GenericAPIView):
    """
    Retrieve or update one subject manually.

    Request:
        GET has no body. PATCH accepts partial subject JSON.

    Response:
        Subject payload used by score and combination dropdowns.
    """

    permission_classes = [IsAdmin]
    serializer_class = SubjectSerializer

    def get_object(self, pk):
        """
        Resolve a subject by code.

        Args:
            pk: Subject.id from the URL.

        Returns:
            Subject instance.
        """

        return get_object_or_404(Subject.objects.all(), pk=pk)

    def get(self, request, pk):
        """
        Return one subject by code.

        Args:
            request: DRF request.
            pk: Subject.id from the URL.

        Returns:
            DRF Response with serialized subject.
        """

        return Response({'success': True, 'data': serialize_subject(self.get_object(pk))})

    def patch(self, request, pk):
        """
        Validate and update one subject.

        Args:
            request: DRF request containing partial subject JSON.
            pk: Subject.id from the URL.

        Returns:
            DRF Response with updated subject or validation errors.
        """

        subject = self.get_object(pk)
        serializer = self.get_serializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return validation_error_response(serializer.errors)
        return Response(update_subject_manually(subject, serializer.validated_data))

    def delete(self, request, pk):
        """
        Hard-delete one subject after writing its DELETE log.

        Args:
            request: DRF request.
            pk: Subject.id from the URL.

        Returns:
            DRF Response confirming deletion, or DELETE_PROTECTED if referenced.
        """

        try:
            return Response(delete_subject_manually(self.get_object(pk)))
        except ProtectedError:
            return Response(
                {'success': False, 'error': 'DELETE_PROTECTED', 'detail': 'Dữ liệu đang được tham chiếu, không thể xoá.'},
                status=status.HTTP_409_CONFLICT,
            )


class CombinationDetailView(GenericAPIView):
    """
    Retrieve or update one subject combination manually.

    Request:
        GET has no body. PATCH accepts partial combination JSON; subjects replace all existing rows when supplied.

    Response:
        Combination payload with nested subject rows.
    """

    permission_classes = [IsAdmin]
    serializer_class = CombinationManualSerializer

    def get_object(self, pk):
        """
        Resolve a subject combination by code.

        Args:
            pk: SubjectCombination.id from the URL.

        Returns:
            SubjectCombination instance.
        """

        return get_object_or_404(SubjectCombination.objects.all(), pk=pk)

    def get(self, request, pk):
        """
        Return one subject combination by code.

        Args:
            request: DRF request.
            pk: SubjectCombination.id from the URL.

        Returns:
            DRF Response with serialized combination.
        """

        return Response({'success': True, 'data': serialize_combination(self.get_object(pk))})

    def patch(self, request, pk):
        """
        Validate and partially update one subject combination.

        Args:
            request: DRF request containing partial combination JSON.
            pk: SubjectCombination.id from the URL.

        Returns:
            DRF Response with updated combination or validation errors.
        """

        combination = self.get_object(pk)
        serializer = self.get_serializer(data=request.data, partial=True, context={'combination': combination})
        if not serializer.is_valid():
            return validation_error_response(serializer.errors)
        return Response(update_combination_manually(combination, serializer.validated_data))

    def delete(self, request, pk):
        """
        Hard-delete one subject combination after writing its DELETE log.

        Args:
            request: DRF request.
            pk: SubjectCombination.id from the URL.

        Returns:
            DRF Response confirming deletion, or DELETE_PROTECTED if referenced.
        """

        try:
            return Response(delete_combination_manually(self.get_object(pk)))
        except ProtectedError:
            return Response(
                {'success': False, 'error': 'DELETE_PROTECTED', 'detail': 'Dữ liệu đang được tham chiếu, không thể xoá.'},
                status=status.HTTP_409_CONFLICT,
            )


class CombinationImportView(GenericAPIView):
    """
    Handle subject-combination Excel import requests.

    Request:
        multipart/form-data with required file field containing MaTH/Mon/TrongSo columns.

    Response:
        Import summary with created, updated, skipped, and row-level errors.
    """

    permission_classes = [IsAdmin]
    serializer_class = ImportFileSerializer

    def post(self, request):
        """
        Validate the uploaded file and delegate import work to the combination service.

        Args:
            request: DRF request containing multipart upload data.

        Returns:
            DRF Response with import summary or FILE_INVALID error.
        """

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            data = import_combinations(serializer.validated_data['file'])
        except ValueError:
            return Response(
                {'success': False, 'error': 'FILE_INVALID', 'detail': 'Không nhận ra loại file hoặc header không hợp lệ.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(data)


class SubjectImportView(GenericAPIView):
    """
    Handle subject Excel import requests.

    Request:
        multipart/form-data with required file field containing MaMon/TenMon columns.

    Response:
        Import summary with created, updated, skipped, and row-level errors.
    """

    permission_classes = [IsAdmin]
    serializer_class = ImportFileSerializer

    def post(self, request):
        """
        Validate the uploaded file and delegate import work to the subject service.

        Args:
            request: DRF request containing multipart upload data.

        Returns:
            DRF Response with import summary or FILE_INVALID error.
        """

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            data = import_subjects(serializer.validated_data['file'])
        except ValueError:
            return Response(
                {'success': False, 'error': 'FILE_INVALID', 'detail': 'Không nhận ra loại file hoặc header không hợp lệ.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(data)
