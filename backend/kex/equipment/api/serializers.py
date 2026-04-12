from django.forms import ValidationError
from rest_framework.serializers import (
    ModelSerializer,
    SerializerMethodField,
)
from kex.booking.models import Booking
from kex.equipment.models import Equipment, EquipmentRating
from kex.equipment_type.api.serializers import EquipmentTypeListSerializer
from kex.users.api.serializers import UserSerializer
from kex.brand.api.serializers import BrandSerializer


class EquipmentListSerializer(ModelSerializer):
    image = SerializerMethodField()
    url = SerializerMethodField()
    manufacturer = SerializerMethodField()

    class Meta:
        model = Equipment
        fields = [
            "id",
            "eq_id",
            "url",
            "owner",
            "manufacturer",
            "title",
            "image",
            "daily_rental",
            "hourly_rental",
            "is_available",
            "equipment_type",
            "equipment_location",
            "condition",
            "available_start_time",
            "available_end_time",
            "description",
            "manufacturing_year",
            "model",
            "horsepower",
            "width",
            "height",
            "weight",
            "show_phone_number",
        ]

    def get_url(self, obj):
        """Build equipment detail URL — safe for nested serializer contexts."""
        request = self.context.get('request')
        if request and obj.eq_id:
            try:
                from rest_framework.reverse import reverse
                return reverse('equipment-api:detail', kwargs={'eq_id': obj.eq_id}, request=request)
            except Exception:
                pass
        return None

    def get_manufacturer(self, obj):
        if obj.manufacturer:
            return obj.manufacturer.name
        return None

    def get_image(self, obj):
        try:
            image = obj.image_1.url
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(image)
            return image
        except:
            return None


class EquipmentDetailSerializer(ModelSerializer):
    url = SerializerMethodField()
    # owner = UserSerializer(read_only=True)
    owner = SerializerMethodField()
    image_1 = SerializerMethodField()
    image_2 = SerializerMethodField()
    image_3 = SerializerMethodField()
    image_4 = SerializerMethodField()
    image_5 = SerializerMethodField()
    manufacturer = SerializerMethodField()
    equipment_type = EquipmentTypeListSerializer(read_only=True)
    is_owner = SerializerMethodField()

    class Meta:
        model = Equipment
        fields = [
            "id",
            "url",
            "owner",
            "is_owner",
            "manufacturer",
            "title",
            "description",
            "daily_rental",
            "hourly_rental",
            "image_1",
            "image_2",
            "image_3",
            "image_4",
            "image_5",
            "equipment_type",
            "equipment_location",
            "manufacturing_year",
            "model",
            "condition",
            "horsepower",
            "width",
            "height",
            "weight",
            "is_available",
            "available_start_time",
            "available_end_time",
            "show_phone_number",
            "created_at",
        ]

    def get_url(self, obj):
        request = self.context.get('request')
        if request and obj.eq_id:
            try:
                from rest_framework.reverse import reverse
                return reverse('equipment-api:detail', kwargs={'eq_id': obj.eq_id}, request=request)
            except Exception:
                pass
        return None

    def get_manufacturer(self, obj):
        if obj.manufacturer:
            return obj.manufacturer.name
        return None

    def get_image_1(self, obj):
        try:
            image = obj.image_1.url
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(image)
            return image
        except:
            return None

    def get_image_2(self, obj):
        try:
            image = obj.image_2.url
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(image)
            return image
        except:
            return None

    def get_image_3(self, obj):
        try:
            image = obj.image_3.url
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(image)
            return image
        except:
            return None

    def get_image_4(self, obj):
        try:
            image = obj.image_4.url
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(image)
            return image
        except:
            return None

    def get_image_5(self, obj):
        try:
            image = obj.image_5.url
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(image)
            return image
        except:
            return None

    def get_owner(self, obj):
        owner = obj.owner
        detail = {
            "id": owner.id,
            "first_name": owner.first_name,
            "last_name": owner.last_name,
            "address": owner.address,
            "city": owner.city,
            "state": owner.state,
            "pin_code": owner.pin_code,
        }
        if obj.show_phone_number:
            detail["phone_number"] = owner.phone_number

        return detail

    def get_is_owner(self, obj):
        """Returns True if the requesting user is the owner of this equipment."""
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            return obj.owner == request.user
        return False


class EquipmentCreateSerializer(ModelSerializer):

    class Meta:
        model = Equipment
        fields = [
            "id",
            "owner",
            "manufacturer",
            "title",
            "description",
            "daily_rental",
            "hourly_rental",
            "image_1",
            "image_2",
            "image_3",
            "image_4",
            "image_5",
            "equipment_type",
            "equipment_location",
            "manufacturing_year",
            "model",
            "condition",
            "horsepower",
            "width",
            "height",
            "weight",
            "is_available",
            "available_start_time",
            "available_end_time",
            "show_phone_number",
            "created_at",
        ]
        extra_kwargs = {
            "owner": {"required": False},
            "image_1": {"required": False},
            "image_2": {"required": False},
            "image_3": {"required": False},
            "image_4": {"required": False},
            "image_5": {"required": False},
        }

    def validate_title(self, value):
        if len(value.strip()) < 3:
            raise ValidationError("Title must be at least 3 characters.")
        if len(value.strip()) > 200:
            raise ValidationError("Title must be under 200 characters.")
        return value.strip()

    def validate_description(self, value):
        if len(value.strip()) < 10:
            raise ValidationError("Description must be at least 10 characters.")
        return value.strip()

    def validate_manufacturing_year(self, value):
        from datetime import datetime
        current_year = datetime.now().year
        if value and (value < 1950 or value > current_year):
            raise ValidationError(f"Manufacturing year must be between 1950 and {current_year}.")
        return value

    def _validate_image_file(self, value):
        """Shared image validation: max 5MB, JPG/PNG only."""
        if value:
            if value.size > 5 * 1024 * 1024:
                raise ValidationError("Image must be under 5MB.")
            content_type = getattr(value, 'content_type', '')
            if content_type and content_type not in ['image/jpeg', 'image/png', 'image/jpg']:
                raise ValidationError("Only JPG and PNG images are allowed.")
        return value

    def validate_image_1(self, value):
        return self._validate_image_file(value)

    def validate_image_2(self, value):
        return self._validate_image_file(value)

    def validate_image_3(self, value):
        return self._validate_image_file(value)

    def validate_image_4(self, value):
        return self._validate_image_file(value)

    def validate_image_5(self, value):
        return self._validate_image_file(value)

    def validate(self, data):
        is_partial = self.instance is not None and getattr(self, 'partial', False)

        # ── Rental price validation ──
        # On partial update: only validate if rental fields are being changed
        # On creation: always validate
        if not is_partial or 'daily_rental' in data or 'hourly_rental' in data:
            if is_partial:
                daily = data.get("daily_rental", getattr(self.instance, 'daily_rental', 0)) or 0
                hourly = data.get("hourly_rental", getattr(self.instance, 'hourly_rental', 0)) or 0
            else:
                daily = data.get("daily_rental", 0) or 0
                hourly = data.get("hourly_rental", 0) or 0
            if daily <= 0 and hourly <= 0:
                raise ValidationError({"daily_rental": "At least one rental price (daily or hourly) must be greater than ₹0."})

        # ── Date validation ──
        # On partial update: only validate if date fields are being changed
        if not is_partial or 'available_start_time' in data or 'available_end_time' in data:
            if is_partial:
                start = data.get("available_start_time", getattr(self.instance, 'available_start_time', None))
                end = data.get("available_end_time", getattr(self.instance, 'available_end_time', None))
            else:
                start = data.get("available_start_time")
                end = data.get("available_end_time")
            if start and end and end <= start:
                raise ValidationError({"available_end_time": "End date must be after start date."})

        # ── Image validation — only on creation ──
        if not self.instance:
            if not data.get("image_1"):
                raise ValidationError({"image_1": "At least one equipment image is required."})

        # ── Brand ↔ EquipmentType match validation ──
        # Only validate on creation or when these fields are being changed
        manufacturer = data.get("manufacturer")
        equipment_type = data.get("equipment_type")
        if manufacturer and equipment_type:
            # Check if this brand supports the selected equipment type
            if manufacturer.equipment_type.exists() and not manufacturer.equipment_type.filter(pk=equipment_type.pk).exists():
                supported = ", ".join(t.name for t in manufacturer.equipment_type.all())
                raise ValidationError({
                    "manufacturer": (
                        f"{manufacturer.name} does not produce {equipment_type.name} equipment. "
                        f"Supported categories: {supported}."
                    )
                })

        return data


class EquipmentRatingSerializer(ModelSerializer):
    class Meta:
        model = EquipmentRating
        fields = "__all__"
        read_only_fields = ["user"]

    def validate_equipment(self, equipment):
        # Business Rule: Cannot rate your own equipment
        if equipment.owner == self.context["user"]:
            raise ValidationError("You cannot rate your own equipment.")

        if not Booking.objects.filter(
            customer=self.context["user"], status="Completed", equipment=equipment
        ).exists():
            raise ValidationError("No Booking with this Equipment")

        return equipment

    def create(self, validated_data):
        equipment_rating = EquipmentRating.objects.create(
            **validated_data, user=self.context["user"]
        )
        return equipment_rating