from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema, inline_serializer, OpenApiResponse
from rest_framework import serializers, status
from rest_framework.generics import GenericAPIView, ListCreateAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .permissions import IsAdmin
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserMeSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    UserListSerializer,
)

User = get_user_model()


class LoginView(TokenObtainPairView):
    """POST /api/auth/login/ — username + password → access + refresh + user profile."""
    permission_classes = [AllowAny]
    serializer_class   = CustomTokenObtainPairSerializer


class RefreshView(TokenRefreshView):
    """POST /api/auth/refresh/ — refresh token → new access token."""
    permission_classes = [AllowAny]


class LogoutView(GenericAPIView):
    """POST /api/auth/logout/ — blacklist the refresh token."""
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=inline_serializer('LogoutRequest', fields={'refresh': serializers.CharField()}),
        responses={204: OpenApiResponse(description='Logged out successfully.')},
    )
    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'detail': 'refresh token required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError:
            return Response({'detail': 'Token invalid or expired.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(GenericAPIView):
    """GET /api/auth/me/ — current user profile."""
    permission_classes = [IsAuthenticated]
    serializer_class   = UserMeSerializer

    def get(self, request):
        return Response(self.get_serializer(request.user).data)


class UserListCreateView(ListCreateAPIView):
    """
    GET  /api/auth/users/ — list all users (admin only)
    POST /api/auth/users/ — create a user account (admin only)
    """
    permission_classes = [IsAdmin]
    queryset           = User.objects.filter(is_deleted=False).order_by('create_date')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserListSerializer


class UserDetailView(RetrieveUpdateAPIView):
    """
    GET   /api/auth/users/{id}/ — get user (admin only)
    PATCH /api/auth/users/{id}/ — update user / reset password (admin only)
    """
    permission_classes = [IsAdmin]
    queryset           = User.objects.filter(is_deleted=False)
    http_method_names  = ['get', 'patch']

    def get_serializer_class(self):
        if self.request.method == 'PATCH':
            return UserUpdateSerializer
        return UserListSerializer
