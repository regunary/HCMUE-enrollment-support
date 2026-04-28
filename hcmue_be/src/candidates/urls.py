from django.urls import path

from src.candidates import views


# Candidate import routes are kept under /api/v1/candidates/ in core.urls.
urlpatterns = [
    path('regions/', views.RegionListCreateView.as_view(), name='candidate-regions'),
    path('regions/import/', views.RegionImportView.as_view(), name='candidate-region-import'),
    path('regions/<str:pk>/', views.RegionDetailView.as_view(), name='candidate-region-detail'),
    path('priority-objects/', views.PriorityObjectListCreateView.as_view(), name='candidate-priority-objects'),
    path('priority-objects/import/', views.PriorityObjectImportView.as_view(), name='candidate-priority-object-import'),
    path('priority-objects/<str:pk>/', views.PriorityObjectDetailView.as_view(), name='candidate-priority-object-detail'),
    path('scores/thpt/import/', views.CandidateThptScoreImportView.as_view(), name='candidate-thpt-score-import'),
    path('scores/hoc-ba/import/', views.CandidateHocBaScoreImportView.as_view(), name='candidate-hoc-ba-score-import'),
    path('scores/nang-luc/import/', views.CandidateNangLucScoreImportView.as_view(), name='candidate-nang-luc-score-import'),
    path('scores/nang-khieu/import/', views.CandidateNangKhieuScoreImportView.as_view(), name='candidate-nang-khieu-score-import'),
    path('', views.CandidateListCreateView.as_view(), name='candidates'),
    path('import/', views.CandidateImportView.as_view(), name='candidate-import'),
    path('<uuid:pk>/', views.CandidateDetailView.as_view(), name='candidate-detail'),
]
