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
            status=status.HTTP_200_OK,
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
                msg="Thanks for the Rating",
            ),
            status=status.HTTP_200_OK,
        )