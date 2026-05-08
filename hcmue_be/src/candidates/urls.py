from django.urls import path

from src.candidates import views


# Candidate import routes are kept under /api/v1/candidates/ in core.urls.
urlpatterns = [
    path('import-batches/<uuid:pk>/', views.ImportBatchStatusView.as_view(), name='candidate-import-batch-status'),
    path('regions/', views.RegionListCreateView.as_view(), name='candidate-regions'),
    path('regions/import/', views.RegionImportView.as_view(), name='candidate-region-import'),
    path('regions/import-async/', views.RegionImportAsyncView.as_view(), name='candidate-region-import-async'),
    path('regions/<str:pk>/', views.RegionDetailView.as_view(), name='candidate-region-detail'),
    path('priority-objects/', views.PriorityObjectListCreateView.as_view(), name='candidate-priority-objects'),
    path('priority-objects/import/', views.PriorityObjectImportView.as_view(), name='candidate-priority-object-import'),
    path('priority-objects/import-async/', views.PriorityObjectImportAsyncView.as_view(), name='candidate-priority-object-import-async'),
    path('priority-objects/<str:pk>/', views.PriorityObjectDetailView.as_view(), name='candidate-priority-object-detail'),
    path('scores/thpt/import/', views.CandidateThptScoreImportView.as_view(), name='candidate-thpt-score-import'),
    path('scores/thpt/import-async/', views.CandidateThptScoreImportAsyncView.as_view(), name='candidate-thpt-score-import-async'),
    path('scores/hoc-ba/import/', views.CandidateHocBaScoreImportView.as_view(), name='candidate-hoc-ba-score-import'),
    path('scores/hoc-ba/import-async/', views.CandidateHocBaScoreImportAsyncView.as_view(), name='candidate-hoc-ba-score-import-async'),
    path('scores/nang-luc/import/', views.CandidateNangLucScoreImportView.as_view(), name='candidate-nang-luc-score-import'),
    path('scores/nang-luc/import-async/', views.CandidateNangLucScoreImportAsyncView.as_view(), name='candidate-nang-luc-score-import-async'),
    path('scores/nang-khieu/import/', views.CandidateNangKhieuScoreImportView.as_view(), name='candidate-nang-khieu-score-import'),
    path('scores/nang-khieu/import-async/', views.CandidateNangKhieuScoreImportAsyncView.as_view(), name='candidate-nang-khieu-score-import-async'),
    path('', views.CandidateListCreateView.as_view(), name='candidates'),
    path('import/', views.CandidateImportView.as_view(), name='candidate-import'),
    path('import-async/', views.CandidateImportAsyncView.as_view(), name='candidate-import-async'),
    path('<uuid:pk>/', views.CandidateDetailView.as_view(), name='candidate-detail'),
]
