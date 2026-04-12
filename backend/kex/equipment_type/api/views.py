from rest_framework.filters import (
    SearchFilter,
    OrderingFilter,
)
from rest_framework.generics import (
    CreateAPIView,
    ListAPIView,
    UpdateAPIView,
)

from rest_framework.permissions import (
    AllowAny,
    IsAdminUser,
)
from kex.core.utils import response_payload

from kex.equipment_type.api.serializers import EquipmentTypeListSerializer
from django_filters import rest_framework as filters
from kex.equipment_type.models import EquipmentType
from rest_framework import status
from rest_framework.response import Response


class EquipmentTypeCreateAPIView(CreateAPIView):
    """Admin-only: create a new equipment category."""
    queryset = EquipmentType.objects.all()
    serializer_class = EquipmentTypeListSerializer
    permission_classes = [IsAdminUser]

    def create(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        equipment_type = serializer.save()
        return Response(
            response_payload(
                success=True,
                data=EquipmentTypeListSerializer(equipment_type).data,
                msg="Equipment Type has been created",
            ),
            status=status.HTTP_201_CREATED,
        )


class EquipmentTypeUpdateAPIView(UpdateAPIView):
    """Admin-only: update an existing equipment category."""
    queryset = EquipmentType.objects.all()
    serializer_class = EquipmentTypeListSerializer
    lookup_field = "pk"
    permission_classes = [IsAdminUser]

    def patch(self, request, *args, **kwargs):
        equipment_type = self.get_object()
        serializer = self.serializer_class(
            equipment_type, data=request.data, partial=True,
        )
        serializer.is_valid(raise_exception=True)
        equipment_type = serializer.save()
        return Response(
            response_payload(
                success=True,
                data=EquipmentTypeListSerializer(equipment_type).data,
                msg="Equipment Type has been updated",
            ),
            status=status.HTTP_200_OK,
        )


class EquipmentTypeListAPIView(ListAPIView):
    queryset = EquipmentType.objects.all()
    serializer_class = EquipmentTypeListSerializer
    filter_backends = [SearchFilter, OrderingFilter, filters.DjangoFilterBackend]
    permission_classes = [AllowAny]
    search_fields = ["name", "brand__name"]

