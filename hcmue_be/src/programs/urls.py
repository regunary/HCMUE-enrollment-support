from django.urls import path

from src.programs import views


# Combination routes are mounted under /api/v1/combinations/ in core.urls.
urlpatterns = [
    path('', views.CombinationListCreateView.as_view(), name='combinations'),
    path('import/', views.CombinationImportView.as_view(), name='combination-import'),
    path('<str:pk>/', views.CombinationDetailView.as_view(), name='combination-detail'),
]
