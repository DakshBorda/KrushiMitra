from django.db.models import Q
from rest_framework.filters import (
    SearchFilter,
    OrderingFilter,
)
from rest_framework.generics import (
    CreateAPIView,
    DestroyAPIView,
    ListAPIView,
    UpdateAPIView,
    RetrieveAPIView,
)
from rest_framework.views import APIView

from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
    IsAuthenticatedOrReadOnly,
)

from kex.equipment.api.serializers import (
    EquipmentCreateSerializer,
    EquipmentListSerializer,
    EquipmentDetailSerializer,
    EquipmentRatingSerializer,
)
from .pagination import LimitOffsetPagination
from .permissions import IsOwnerOrReadOnly
from django_filters import rest_framework as filters
from .filters import EquipmentFilter
from kex.equipment.models import Equipment, EquipmentRating
from rest_framework.response import Response
from rest_framework import status
from kex.core.utils import response_payload
from rest_framework.exceptions import NotFound
from kex.booking.models import Booking


from rest_framework.parsers import MultiPartParser, FormParser


class EquipmentDetailAPIView(RetrieveAPIView):
    queryset = Equipment.objects.all()
    serializer_class = EquipmentDetailSerializer
    lookup_field = "eq_id"
    permission_classes = [AllowAny]


class EquipmentCreateAPIView(CreateAPIView):
    queryset = Equipment.objects.all()
    serializer_class = EquipmentCreateSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def create(self, request, *args, **kwargs):
        # Business Rule: Profile must be complete to list equipment
        if not request.user.is_profile_complete:
            return Response(
                response_payload(
                    success=False,
                    msg="Please complete your profile (address, city, state, pincode) before listing equipment.",
                ),
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Business Rule: Max 15 equipment listings per user
        current_count = Equipment.objects.filter(owner=request.user).count()
        if current_count >= 15:
            return Response(
                response_payload(
                    success=False,
                    msg=f"You have reached the maximum limit of 15 equipment listings. Please delete an existing listing first.",
                ),
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.serializer_class(data=request.data)
        if not serializer.is_valid():
            return Response(
                response_payload(
                    success=False,
                    errors=serializer.errors,
                    msg="Validation failed",
                ),
                status=status.HTTP_400_BAD_REQUEST,
            )

        equipment = serializer.save(owner=request.user)

        return Response(
            response_payload(
                success=True,
                data=EquipmentCreateSerializer(equipment).data,
                msg="Equipment has been created",
            ),
            status=status.HTTP_201_CREATED,
        )


class EquipmentUpdateAPIView(UpdateAPIView):
    queryset = Equipment.objects.all()
    serializer_class = EquipmentCreateSerializer
    lookup_field = "id"
    permission_classes = [IsOwnerOrReadOnly, IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def patch(self, request, *args, **kwargs):
        equipment = self.get_object()
        serializer = self.serializer_class(
            equipment, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        equipment = serializer.save()
        return Response(
            response_payload(
                success=True,
                data=EquipmentCreateSerializer(equipment).data,
                msg="Equipment has been updated",
            ),
            status=status.HTTP_200_OK,
        )


class EquipmentDeleteAPIView(DestroyAPIView):
    queryset = Equipment.objects.all()
    serializer_class = EquipmentDetailSerializer
    lookup_field = "id"
    permission_classes = [IsOwnerOrReadOnly, IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        equipment = self.get_object()
        # Business Rule: Cannot delete equipment with active bookings
        active_bookings = Booking.objects.filter(
            equipment=equipment,
            status__in=["Pending", "Accepted", "Inprogress"]
        ).count()
        if active_bookings > 0:
            return Response(
                response_payload(
                    success=False,
                    msg=f"Cannot delete equipment with {active_bookings} active booking(s). Cancel or complete them first.",
                ),
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)


class EquipmentListAPIView(ListAPIView):
    serializer_class = EquipmentListSerializer
    filter_backends = [SearchFilter, OrderingFilter, filters.DjangoFilterBackend]
    permission_classes = [AllowAny]
    search_fields = [
        "title",
        "description",
        "manufacturer__name",
        "equipment_type__name",
        "horsepower",
        "hourly_rental",
        "daily_rental",
        "owner__username",
        "owner__first_name",
        "owner__last_name",
    ]
    filterset_class = EquipmentFilter
    pagination_class = LimitOffsetPagination

    def get_queryset(self, *args, **kwargs):
        queryset_list = Equipment.objects.all()  # filter(user=self.request.user)
        query = self.request.GET.get("q")
        if query:
            queryset_list = queryset_list.filter(
                Q(title__icontains=query)
                | Q(description__icontains=query)
                | Q(manufacturer__name__icontains=query)
                | Q(equipment_type__name__icontains=query)
                | Q(horsepower__icontains=query)
            ).distinct()
        return queryset_list


class MyEquipmentListAPIView(ListAPIView):
    serializer_class = EquipmentListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Equipment.objects.filter(owner=self.request.user).order_by("-created_at")


class EquipmentRatingView(CreateAPIView):
    queryset = EquipmentRating.objects.all()
    serializer_class = EquipmentRatingSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.serializer_class(
            data=request.data, context={"user": request.user}
        )
        serializer.is_valid(raise_exception=True)
        equipment_rating = serializer.create(serializer.validated_data)
        return Response(
            response_payload(
                success=True,
                data=EquipmentRatingSerializer(equipment_rating).data,
                msg="Thanks for your review!",
            ),
            status=status.HTTP_200_OK,
        )


class EquipmentReviewListView(APIView):
    """
    GET /api/equipment/reviews/?equipment_id=<id>
    Returns all reviews for an equipment plus average rating and review eligibility.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from kex.equipment.api.serializers import EquipmentRatingReadSerializer
        from django.db.models import Avg

        equipment_id = request.query_params.get("equipment_id")
        if not equipment_id:
            return Response(
                {"error": "equipment_id is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        reviews = EquipmentRating.objects.filter(equipment_id=equipment_id).select_related("user")
        serialized = EquipmentRatingReadSerializer(reviews, many=True).data

        avg = reviews.aggregate(avg_rating=Avg("rating"))["avg_rating"]
        avg_rating = round(avg, 1) if avg else 0

        # Check if current user can review
        can_review = False
        has_reviewed = False
        if request.user and request.user.is_authenticated:
            has_reviewed = reviews.filter(user=request.user).exists()
            if not has_reviewed:
                has_completed_booking = Booking.objects.filter(
                    customer=request.user, equipment_id=equipment_id, status="Completed"
                ).exists()
                # Also check they don't own the equipment
                try:
                    eq = Equipment.objects.get(id=equipment_id)
                    is_owner = eq.owner == request.user
                except Equipment.DoesNotExist:
                    is_owner = True
                can_review = has_completed_booking and not is_owner

        return Response({
            "reviews": serialized,
            "average_rating": avg_rating,
            "total_reviews": reviews.count(),
            "can_review": can_review,
            "has_reviewed": has_reviewed,
        })