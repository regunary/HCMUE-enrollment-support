from django.urls import path
from . import views

urlpatterns = [
    path('login/',        views.LoginView.as_view(),       name='auth-login'),
    path('refresh/',      views.RefreshView.as_view(),     name='auth-refresh'),
    path('logout/',       views.LogoutView.as_view(),      name='auth-logout'),
    path('me/',           views.MeView.as_view(),          name='auth-me'),
    path('users/',        views.UserListCreateView.as_view(), name='auth-users'),
    path('users/<uuid:pk>/', views.UserDetailView.as_view(),  name='auth-user-detail'),
]
