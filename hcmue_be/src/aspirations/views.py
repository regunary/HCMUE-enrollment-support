from django.db import IntegrityError
from threading import Thread

from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.generics import GenericAPIView, get_object_or_404
from rest_framework.response import Response

from auth.permissions import IsAdmin
from src.aspirations.models import Aspiration, ExcludedCandidate
from src.aspirations.serializers import ExclusionManualSerializer, ImportFileSerializer, WishManualSerializer
from src.aspirations.services import (
    create_exclusion_manually,
    create_wish_manually,
    delete_exclusion_manually,
    delete_wish_manually,
    import_exclusions,
    import_wishes,
    serialize_exclusion,
    serialize_wish,
    update_exclusion_manually,
    update_wish_manually,
)
from src.candidates.services import create_import_batch, fail_import_batch
from src.imports.models import ImportBatch
from core.choices import ImportStatusChoices
from src.programs.views import validation_error_response


def conflict_response(detail):
    return Response({'success': False, 'error': 'CONFLICT', 'detail': detail}, status=status.HTTP_409_CONFLICT)


def complete_import_batch_from_summary(batch, summary):
    batch.status = ImportStatusChoices.DONE
    batch.row_count = int(summary.get('created', 0)) + int(summary.get('updated', 0)) + int(summary.get('skipped', 0)) + len(summary.get('errors', []))
    batch.created_count = int(summary.get('created', 0))
    batch.updated_count = int(summary.get('updated', 0))
    batch.error_count = len(summary.get('errors', []))
    batch.save(update_fields=['status', 'row_count', 'created_count', 'updated_count', 'error_count', 'update_date'])


class WishListCreateView(GenericAPIView):
    permission_classes = [IsAdmin]
    serializer_class = WishManualSerializer

    def get(self, request):
        wishes = Aspiration.objects.select_related('candidate', 'major').all().order_by('candidate__cccd', 'rank')
        return Response({'success': True, 'results': [serialize_wish(wish) for wish in wishes]})

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return validation_error_response(serializer.errors)
        try:
            data = create_wish_manually(serializer.validated_data)
        except IntegrityError:
            return conflict_response('Thí sinh đã có nguyện vọng trùng thứ tự hoặc mã ngành.')
        return Response(data, status=status.HTTP_201_CREATED)


class WishDetailView(GenericAPIView):
    permission_classes = [IsAdmin]
    serializer_class = WishManualSerializer

    def get_object(self, pk):
        return get_object_or_404(Aspiration.objects.all(), pk=pk)

    def get(self, request, pk):
        return Response({'success': True, 'data': serialize_wish(self.get_object(pk))})

    def patch(self, request, pk):
        wish = self.get_object(pk)
        serializer = self.get_serializer(data=request.data, partial=True, context={'wish': wish})
        if not serializer.is_valid():
            return validation_error_response(serializer.errors)
        try:
            data = update_wish_manually(wish, serializer.validated_data)
        except IntegrityError:
            return conflict_response('Thí sinh đã có nguyện vọng trùng thứ tự hoặc mã ngành.')
        return Response(data)

    def delete(self, request, pk):
        return Response(delete_wish_manually(self.get_object(pk)))


class WishImportView(GenericAPIView):
    permission_classes = [IsAdmin]
    serializer_class = ImportFileSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            data = import_wishes(serializer.validated_data['file'])
        except ValueError:
            return Response(
                {'success': False, 'error': 'FILE_INVALID', 'detail': 'Không nhận ra loại file hoặc header không hợp lệ.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(data)


class WishImportAsyncView(GenericAPIView):
    permission_classes = [IsAdmin]
    serializer_class = ImportFileSerializer

    @staticmethod
    def _run_async_import(batch_id, file_name, file_bytes):
        batch = ImportBatch.objects.get(pk=batch_id)
        upload = SimpleUploadedFile(file_name, file_bytes)
        try:
            summary = import_wishes(upload)
            complete_import_batch_from_summary(batch, summary)
        except ValueError:
            fail_import_batch(batch)
        except Exception:
            fail_import_batch(batch)

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        upload = serializer.validated_data['file']
        batch = create_import_batch(upload, request.user)
        file_name = upload.name
        file_bytes = upload.read()
        Thread(target=self._run_async_import, args=(batch.id, file_name, file_bytes), daemon=True).start()
        return Response({'success': True, 'job_id': str(batch.id), 'status': batch.status}, status=status.HTTP_202_ACCEPTED)


class ExclusionListCreateView(GenericAPIView):
    permission_classes = [IsAdmin]
    serializer_class = ExclusionManualSerializer

    def get(self, request):
        exclusions = ExcludedCandidate.objects.select_related('candidate').all().order_by('candidate__cccd')
        return Response({'success': True, 'results': [serialize_exclusion(exclusion) for exclusion in exclusions]})

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return validation_error_response(serializer.errors)
        try:
            data = create_exclusion_manually(serializer.validated_data)
        except IntegrityError:
            return conflict_response('Thí sinh đã nằm trong danh sách loại bỏ.')
        return Response(data, status=status.HTTP_201_CREATED)


class ExclusionDetailView(GenericAPIView):
    permission_classes = [IsAdmin]
    serializer_class = ExclusionManualSerializer

    def get_object(self, pk):
        return get_object_or_404(ExcludedCandidate.objects.all(), pk=pk)

    def get(self, request, pk):
        return Response({'success': True, 'data': serialize_exclusion(self.get_object(pk))})

    def patch(self, request, pk):
        exclusion = self.get_object(pk)
        serializer = self.get_serializer(data=request.data, partial=True, context={'exclusion': exclusion})
        if not serializer.is_valid():
            return validation_error_response(serializer.errors)
        try:
            data = update_exclusion_manually(exclusion, serializer.validated_data)
        except IntegrityError:
            return conflict_response('Thí sinh đã nằm trong danh sách loại bỏ.')
        return Response(data)

    def delete(self, request, pk):
        return Response(delete_exclusion_manually(self.get_object(pk)))


class ExclusionImportView(GenericAPIView):
    permission_classes = [IsAdmin]
    serializer_class = ImportFileSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            data = import_exclusions(serializer.validated_data['file'])
        except ValueError:
            return Response(
                {'success': False, 'error': 'FILE_INVALID', 'detail': 'Không nhận ra loại file hoặc header không hợp lệ.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(data)


class ExclusionImportAsyncView(GenericAPIView):
    permission_classes = [IsAdmin]
    serializer_class = ImportFileSerializer

    @staticmethod
    def _run_async_import(batch_id, file_name, file_bytes):
        batch = ImportBatch.objects.get(pk=batch_id)
        upload = SimpleUploadedFile(file_name, file_bytes)
        try:
            summary = import_exclusions(upload)
            complete_import_batch_from_summary(batch, summary)
        except ValueError:
            fail_import_batch(batch)
        except Exception:
            fail_import_batch(batch)

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        upload = serializer.validated_data['file']
        batch = create_import_batch(upload, request.user)
        file_name = upload.name
        file_bytes = upload.read()
        Thread(target=self._run_async_import, args=(batch.id, file_name, file_bytes), daemon=True).start()
        return Response({'success': True, 'job_id': str(batch.id), 'status': batch.status}, status=status.HTTP_202_ACCEPTED)
