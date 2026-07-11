from django.urls import path
# pyrefly: ignore [missing-import]
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('<str:short_code>/', views.redirect_url, name='redirect'),
]