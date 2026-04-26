from django.urls import path

from src.candidates import views


# Candidate import routes are kept under /api/v1/candidates/ in core.urls.
urlpatterns = [
    path('regions/', views.RegionListCreateView.as_view(), name='candidate-regions'),
    path('regions/import/', views.RegionImportView.as_view(), name='candidate-region-import'),
    path('', views.CandidateListCreateView.as_view(), name='candidates'),
    path('import/', views.CandidateImportView.as_view(), name='candidate-import'),
    path('<uuid:pk>/', views.CandidateDetailView.as_view(), name='candidate-detail'),
]
