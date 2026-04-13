from django.contrib import admin
from django.urls.conf import path, include
from kex.equipment.api.views import (
    EquipmentListAPIView,
    EquipmentCreateAPIView,
    EquipmentRatingView,
    EquipmentReviewListView,
    EquipmentUpdateAPIView,
    EquipmentDeleteAPIView,
    EquipmentDetailAPIView,
    MyEquipmentListAPIView,
)

app_name = "equipment"

urlpatterns = [
    path("", EquipmentListAPIView.as_view(), name="equipment-list"),
    path("<str:eq_id>", EquipmentDetailAPIView.as_view(), name="detail"),
    path("create/", EquipmentCreateAPIView.as_view(), name="equipment-create"),
    path("update/<int:id>/", EquipmentUpdateAPIView.as_view(), name="equipment-update"),
    path("delete/<int:id>/", EquipmentDeleteAPIView.as_view(), name="equipment-delete"),
    path("rating/", EquipmentRatingView.as_view(), name="equipment-rating"),
    path("reviews/", EquipmentReviewListView.as_view(), name="equipment-reviews"),
    path("my/", MyEquipmentListAPIView.as_view(), name="my-equipment"),
]
