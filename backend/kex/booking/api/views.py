import logging

from rest_framework.filters import (
    SearchFilter,
    OrderingFilter,
)
from rest_framework.generics import (
    CreateAPIView,
    ListAPIView,
    UpdateAPIView,
    RetrieveAPIView,
)
from rest_framework.views import APIView
from rest_framework.throttling import UserRateThrottle
from django.db.models import Q, Count
from datetime import date

from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
)
from kex.booking.api.serializers import (
    BookingCreateSerializer,
    BookingDetailSerializer,
    BookingListSerializer,
    BookingSerializer,
    BookingUpdateSerializer,
)

from kex.booking.models import Booking
from kex.booking.models import CALENDAR_BLOCKING_STATUSES
from rest_framework import status
from rest_framework.response import Response

from kex.core.utils import response_payload
from rest_framework.exceptions import NotFound
from kex.equipment.api.pagination import LimitOffsetPagination

logger = logging.getLogger(__name__)


# ── Rate limiter for booking creation (prevents spam) ──
class BookingCreateThrottle(UserRateThrottle):
    rate = '10/hour'


class BookingListAPIView(ListAPIView):
    """List bookings where the current user is the CUSTOMER."""
    queryset = Booking.objects.select_related(
        'customer', 'equipment', 'equipment__owner',
        'equipment__manufacturer', 'equipment__equipment_type',
    ).all()
    serializer_class = BookingListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    pagination_class = LimitOffsetPagination

    search_fields = [
        "equipment__title",
        "equipment__equipment_type__name",
        "equipment__manufacturer__name",
        "customer__username",
        "equipment__eq_id",
        "customer__first_name",
        "customer__last_name",
    ]

    def get_queryset(self, *args, **kwargs):
        return self.queryset.filter(customer=self.request.user)


class BookingCreateAPIView(CreateAPIView):
    queryset = Booking.objects.all()
    serializer_class = BookingCreateSerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = [BookingCreateThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.serializer_class(
            data=request.data, context={"user": request.user}
        )
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()
        return Response(
            response_payload(
                success=True,
                data=BookingCreateSerializer(booking, context={"user": request.user}).data,
                msg="Booking has been created",
            ),
            status=status.HTTP_201_CREATED,
        )


class BookingUpdateAPIView(UpdateAPIView):
    """
    Handles all booking status transitions.
    Accepts: status, rejection_reason, rejection_note,
             owner_cancellation_reason, owner_cancellation_note
    """
    queryset = Booking.objects.select_related(
        'customer', 'equipment', 'equipment__owner',
        'equipment__manufacturer', 'equipment__equipment_type',
        'cancelled_by',
    ).all()
    serializer_class = BookingUpdateSerializer
    lookup_field = "pk"
    permission_classes = [IsAuthenticated]

    def get_object(self):
        """Allow both the equipment owner AND the booking customer to access."""
        pk = self.kwargs.get("pk")
        try:
            booking = self.queryset.get(
                Q(pk=pk),
                Q(equipment__owner=self.request.user) | Q(customer=self.request.user),
            )
            return booking
        except Booking.DoesNotExist:
            raise NotFound(
                f"Booking with id {pk} doesn't exist for this user"
            )

    def patch(self, request, *args, **kwargs):
        booking = self.get_object()
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Pass user context so the serializer can determine role
        serializer.context["user"] = request.user
        booking = serializer.update(
            booking, serializer.validated_data,
        )
        return Response(
            response_payload(
                success=True,
                data=BookingSerializer(booking, context={"request": request}).data,
                msg="Booking has been updated",
            ),
            status=status.HTTP_200_OK,
        )


class BookingRetrieveAPIView(RetrieveAPIView):
    queryset = Booking.objects.select_related(
        'customer', 'equipment', 'equipment__owner',
        'equipment__manufacturer', 'equipment__equipment_type',
        'cancelled_by',
    ).all()
    serializer_class = BookingDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self, *args, **kwargs):
        return self.queryset.filter(
            Q(customer=self.request.user) | Q(equipment__owner=self.request.user)
        )

    def get_serializer_context(self):
        """Ensure request context propagates to nested serializers."""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
        except Exception:
            return Response(
                {"detail": "Booking not found or you don't have access."},
                status=status.HTTP_404_NOT_FOUND,
            )
        try:
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        except Exception as e:
            logger.error(
                "BookingRetrieveAPIView serialization error for pk=%s: %s",
                kwargs.get('pk'), e,
            )
            return Response(
                {"detail": "Error loading booking details. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class BookingRequestListAPIView(ListAPIView):
    """List bookings where the current user is the EQUIPMENT OWNER."""
    queryset = Booking.objects.select_related(
        'customer', 'equipment', 'equipment__owner',
        'equipment__manufacturer', 'equipment__equipment_type',
    ).all()
    serializer_class = BookingListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    pagination_class = LimitOffsetPagination

    search_fields = [
        "equipment__title",
        "equipment__equipment_type__name",
        "equipment__manufacturer__name",
        "customer__username",
        "equipment__eq_id",
        "customer__first_name",
        "customer__last_name",
    ]

    def get_queryset(self, *args, **kwargs):
        return self.queryset.filter(equipment__owner=self.request.user)


class OwnerStatsView(APIView):
    """
    Public endpoint returning owner reliability metrics.
    GET /api/booking/owner-stats/<owner_id>/
    """
    permission_classes = [AllowAny]

    def get(self, request, owner_id):
        from kex.users.models import User

        try:
            User.objects.get(id=owner_id)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        # All bookings received by this owner
        owner_bookings = Booking.objects.filter(equipment__owner_id=owner_id)
        total = owner_bookings.count()

        if total == 0:
            return Response({
                "total_bookings_received": 0,
                "response_rate": 0,
                "avg_response_hours": None,
                "completion_rate": 0,
            })

        # Response rate: bookings NOT expired / total
        expired = owner_bookings.filter(status="Expired").count()
        response_rate = round(((total - expired) / total) * 100)

        # Average response time (hours) — from created_at to accepted_at/rejected_at
        responded = owner_bookings.filter(
            Q(accepted_at__isnull=False) | Q(rejected_at__isnull=False)
        )
        avg_hours = None
        if responded.exists():
            resp_times = []
            for b in responded.values("created_at", "accepted_at", "rejected_at"):
                response_time = b.get("accepted_at") or b.get("rejected_at")
                if response_time and b["created_at"]:
                    diff = (response_time - b["created_at"]).total_seconds() / 3600
                    resp_times.append(diff)
            if resp_times:
                avg_hours = round(sum(resp_times) / len(resp_times), 1)

        # Completion rate: completed / accepted
        accepted = owner_bookings.filter(
            status__in=["Accepted", "Inprogress", "Completed"]
        ).count()
        completed = owner_bookings.filter(status="Completed").count()
        completion_rate = round((completed / accepted) * 100) if accepted > 0 else 0

        return Response({
            "total_bookings_received": total,
            "response_rate": response_rate,
            "avg_response_hours": avg_hours,
            "completion_rate": completion_rate,
        })


class AdminDashboardView(APIView):
    """
    Admin-only endpoint returning platform analytics.
    GET /api/booking/admin/dashboard/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response(
                {"error": "Admin access required."},
                status=status.HTTP_403_FORBIDDEN,
            )


        from django.utils import timezone
        from datetime import timedelta

        all_bookings = Booking.objects.all()
        now = timezone.now()

        # Status counts
        status_counts = dict(
            all_bookings.values_list("status").annotate(c=Count("id")).values_list("status", "c")
        )

        # Revenue (completed bookings) — optimized with select_related
        completed_bookings = all_bookings.filter(
            status="Completed"
        ).select_related("equipment")
        total_revenue = 0
        for b in completed_bookings:
            days = (b.end_date - b.start_date).days + 1
            daily_rate = b.equipment.daily_rental if b.equipment else 0
            total_revenue += days * daily_rate

        # This week / month counts
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        bookings_this_week = all_bookings.filter(created_at__gte=week_ago).count()
        bookings_this_month = all_bookings.filter(created_at__gte=month_ago).count()

        # Top 5 most-booked equipment
        top_equipment = list(
            all_bookings.values(
                "equipment__title", "equipment__id"
            ).annotate(
                booking_count=Count("id")
            ).order_by("-booking_count")[:5]
        )

        # Top 5 owners by booking count
        top_owners = list(
            all_bookings.values(
                "equipment__owner__first_name",
                "equipment__owner__last_name",
                "equipment__owner__id",
            ).annotate(
                booking_count=Count("id")
            ).order_by("-booking_count")[:5]
        )

        return Response({
            "total_bookings": all_bookings.count(),
            "status_counts": status_counts,
            "total_revenue": total_revenue,
            "bookings_this_week": bookings_this_week,
            "bookings_this_month": bookings_this_month,
            "top_equipment": top_equipment,
            "top_owners": top_owners,
        })


class BlockedDatesView(APIView):
    """
    Public endpoint returning date ranges blocked by confirmed bookings
    for a specific equipment. Used by the Product page calendar.
    GET /api/booking/blocked-dates/<equipment_id>/
    Returns: [{"start_date": "2025-04-01", "end_date": "2025-04-05", "status": "Accepted"}, ...]
    """
    permission_classes = [AllowAny]

    def get(self, request, equipment_id):
        from kex.equipment.models import Equipment

        try:
            Equipment.objects.get(id=equipment_id)
        except Equipment.DoesNotExist:
            return Response(
                {"error": "Equipment not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Only return dates blocked by Accepted / Inprogress bookings
        blocked_bookings = Booking.objects.filter(
            equipment_id=equipment_id,
            status__in=CALENDAR_BLOCKING_STATUSES,
            end_date__gte=date.today(),  # Only future/ongoing blocks
        ).values("start_date", "end_date", "status", "booking_id")

        return Response(list(blocked_bookings))
