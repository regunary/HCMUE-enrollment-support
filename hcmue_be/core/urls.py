"""
URL configuration for hcmue_be project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from src.aspirations.urls import exclusion_urlpatterns, wish_urlpatterns
from src.programs.urls import criteria_urlpatterns, major_urlpatterns, subject_urlpatterns

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/auth/', include('auth.urls')),
    path('api/v1/candidates/', include('candidates.urls')),
    path('api/v1/combinations/', include('src.programs.urls')),
    path('api/v1/subjects/', include(subject_urlpatterns)),
    path('api/v1/majors/', include(major_urlpatterns)),
    path('api/v1/wishes/', include(wish_urlpatterns)),
    path('api/v1/exclusions/', include(exclusion_urlpatterns)),
    path('api/v1/criteria/', include(criteria_urlpatterns)),
    path('api/v1/analytics/', include('src.analytics.urls')),
]
