from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response

from auth.permissions import IsAdminOrCouncil
from src.analytics.serializers import PercentileRecomputeSerializer, PercentileTableQuerySerializer
from src.analytics.services import build_percentile_tables, recompute_major_combination_percentiles


class PercentileRecomputeView(GenericAPIView):
    permission_classes = [IsAdminOrCouncil]
    serializer_class = PercentileRecomputeSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'success': False, 'error': 'VALIDATION_ERROR', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = serializer.validated_data
        snapshots = recompute_major_combination_percentiles(
            round_number=data['round'],
            percentiles=data['percentiles'],
            major_combination_id=data.get('major_combination_id'),
        )
        return Response({'success': True, 'data': snapshots})


class PercentileTableView(GenericAPIView):
    permission_classes = [IsAdminOrCouncil]
    serializer_class = PercentileTableQuerySerializer

    def get(self, request):
        serializer = self.get_serializer(data=request.query_params)
        if not serializer.is_valid():
            return Response(
                {'success': False, 'error': 'VALIDATION_ERROR', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = serializer.validated_data
        return Response({
            'success': True,
            'data': build_percentile_tables(
                round_number=data['round'],
                percentiles=data['percentiles'],
            ),
        })
