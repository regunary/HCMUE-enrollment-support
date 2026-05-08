from django.urls import path

from src.aspirations import views


wish_urlpatterns = [
    path('', views.WishListCreateView.as_view(), name='wishes'),
    path('import/', views.WishImportView.as_view(), name='wish-import'),
    path('<int:pk>/', views.WishDetailView.as_view(), name='wish-detail'),
]


exclusion_urlpatterns = [
    path('', views.ExclusionListCreateView.as_view(), name='exclusions'),
    path('import/', views.ExclusionImportView.as_view(), name='exclusion-import'),
    path('<int:pk>/', views.ExclusionDetailView.as_view(), name='exclusion-detail'),
]
