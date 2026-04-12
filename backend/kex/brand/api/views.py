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

from kex.brand.api.serializers import BrandSerializer, BrandWriteSerializer
from django_filters import rest_framework as filters
from kex.brand.models import Brand
from rest_framework import status
from rest_framework.response import Response

from kex.core.utils import response_payload


class BrandCreateAPIView(CreateAPIView):
    """Admin-only: create a new manufacturer/brand."""
    queryset = Brand.objects.all()
    serializer_class = BrandWriteSerializer
    permission_classes = [IsAdminUser]

    def create(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        brand = serializer.save()
        return Response(
            response_payload(
                success=True,
                data=BrandSerializer(brand).data,
                msg="Brand has been created",
            ),
            status=status.HTTP_201_CREATED,
        )


class BrandUpdateAPIView(UpdateAPIView):
    """Admin-only: update an existing manufacturer/brand."""
    queryset = Brand.objects.all()
    serializer_class = BrandWriteSerializer
    lookup_field = "pk"
    permission_classes = [IsAdminUser]

    def patch(self, request, *args, **kwargs):
        brand = self.get_object()
        serializer = self.serializer_class(
            brand, data=request.data, partial=True,
        )
        serializer.is_valid(raise_exception=True)
        brand = serializer.save()
        return Response(
            response_payload(
                success=True,
                data=BrandSerializer(brand).data,
                msg="Brand has been updated",
            ),
            status=status.HTTP_200_OK,
        )


class BrandListAPIView(ListAPIView):
    """
    Public: list all brands.
    Supports ?equipment_type=<id> to filter brands by equipment category.
    """
    serializer_class = BrandSerializer
    filter_backends = [SearchFilter, OrderingFilter, filters.DjangoFilterBackend]
    permission_classes = [AllowAny]
    search_fields = ["name", "equipment_type__name"]

    def get_queryset(self):
        qs = Brand.objects.all()
        # Filter by equipment type if provided (for cascading dropdowns)
        equipment_type_id = self.request.query_params.get("equipment_type")
        if equipment_type_id:
            qs = qs.filter(equipment_type__id=equipment_type_id)
        return qs
