from django.urls.conf import path, include
from kex.booking.api.views import (
    BookingCreateAPIView,
    BookingRequestListAPIView,
    BookingRetrieveAPIView,
    BookingUpdateAPIView,
    BookingListAPIView,
    OwnerStatsView,
    AdminDashboardView,
    BlockedDatesView,
)

app_name = "brand"

urlpatterns = [
    path("", BookingListAPIView.as_view(), name="booking-list"),
    path("create/", BookingCreateAPIView.as_view(), name="booking-create"),
    path("update/<int:pk>/", BookingUpdateAPIView.as_view(), name="booking-update"),
    path("detail/<int:pk>/", BookingRetrieveAPIView.as_view(), name="booking-detail"),
    path("request/", BookingRequestListAPIView.as_view(), name="booking-list-request"),
    path("owner-stats/<int:owner_id>/", OwnerStatsView.as_view(), name="owner-stats"),
    path("admin/dashboard/", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("blocked-dates/<int:equipment_id>/", BlockedDatesView.as_view(), name="blocked-dates"),
]
