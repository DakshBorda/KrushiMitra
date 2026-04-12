from rest_framework import serializers
from kex.brand.models import Brand
from kex.equipment_type.api.serializers import EquipmentTypeListSerializer


class BrandSerializer(serializers.ModelSerializer):
    """Read serializer — returns nested equipment_type objects for display."""
    equipment_type = EquipmentTypeListSerializer(many=True, read_only=True)

    class Meta:
        model = Brand
        fields = "__all__"


class BrandWriteSerializer(serializers.ModelSerializer):
    """Write serializer — accepts equipment_type IDs for create/update."""

    class Meta:
        model = Brand
        fields = "__all__"
