from django.urls import path

from src.analytics import views


urlpatterns = [
    path('percentiles/tables/', views.PercentileTableView.as_view(), name='analytics-percentile-tables'),
    path('percentiles/recompute/', views.PercentileRecomputeView.as_view(), name='analytics-percentile-recompute'),
]
