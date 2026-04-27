from django.urls import path

from src.programs import views


# Combination routes are mounted under /api/v1/combinations/ in core.urls.
urlpatterns = [
    path('', views.CombinationListCreateView.as_view(), name='combinations'),
    path('import/', views.CombinationImportView.as_view(), name='combination-import'),
    path('<str:pk>/', views.CombinationDetailView.as_view(), name='combination-detail'),
]


# Subject routes are mounted under /api/v1/subjects/ in core.urls.
subject_urlpatterns = [
    path('', views.SubjectListCreateView.as_view(), name='subjects'),
    path('import/', views.SubjectImportView.as_view(), name='subject-import'),
    path('<str:pk>/', views.SubjectDetailView.as_view(), name='subject-detail'),
]
