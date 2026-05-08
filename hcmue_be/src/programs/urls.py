from django.urls import path

from src.programs import views


# Combination routes are mounted under /api/v1/combinations/ in core.urls.
urlpatterns = [
    path('', views.CombinationListCreateView.as_view(), name='combinations'),
    path('import/', views.CombinationImportView.as_view(), name='combination-import'),
    path('import-async/', views.CombinationImportAsyncView.as_view(), name='combination-import-async'),
    path('<str:pk>/', views.CombinationDetailView.as_view(), name='combination-detail'),
]


# Subject routes are mounted under /api/v1/subjects/ in core.urls.
subject_urlpatterns = [
    path('', views.SubjectListCreateView.as_view(), name='subjects'),
    path('import/', views.SubjectImportView.as_view(), name='subject-import'),
    path('import-async/', views.SubjectImportAsyncView.as_view(), name='subject-import-async'),
    path('<str:pk>/', views.SubjectDetailView.as_view(), name='subject-detail'),
]


# Major routes are mounted under /api/v1/majors/ in core.urls.
major_urlpatterns = [
    path('', views.MajorListCreateView.as_view(), name='majors'),
    path('import/', views.MajorImportView.as_view(), name='major-import'),
    path('import-async/', views.MajorImportAsyncView.as_view(), name='major-import-async'),
    path('<str:pk>/', views.MajorDetailView.as_view(), name='major-detail'),
]


# Criteria routes are mounted under /api/v1/criteria/ in core.urls.
criteria_urlpatterns = [
    path('', views.CriteriaListCreateView.as_view(), name='criteria'),
    path('import/', views.CriteriaImportView.as_view(), name='criteria-import'),
    path('import-async/', views.CriteriaImportAsyncView.as_view(), name='criteria-import-async'),
    path('<int:pk>/', views.CriteriaDetailView.as_view(), name='criteria-detail'),
]
