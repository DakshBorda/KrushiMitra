from rest_framework import serializers
from datetime import datetime, date, time, timedelta
from django.db.models import Q
from django.utils import timezone
from django.utils.html import strip_tags

from kex.booking.models import (
    Booking,
    booking_status_choice,
    REJECTION_REASONS,
    OWNER_CANCEL_REASONS,
    CALENDAR_BLOCKING_STATUSES,
    TERMINAL_STATUSES,
)
from kex.equipment.api.serializers import EquipmentListSerializer
from kex.users.api.serializers import UserSerializer
from kex.notifications.models import create_notification


# ────────────────────────────────────────────────────────────
# Constants
# ────────────────────────────────────────────────────────────
MAX_BOOKING_DURATION_DAYS = 30
MAX_ACTIVE_PENDING_PER_CUSTOMER = 5
MIN_ADVANCE_BOOKING_DAYS = 1  # Customer must book at least 1 day in advance
MAX_FUTURE_BOOKING_DAYS = 365  # Cannot book more than 1 year in advance


def _sanitize_text(value):
    """Strip HTML tags and excessive whitespace from user-provided text."""
    if not value:
        return ""
    return strip_tags(value).strip()


# ────────────────────────────────────────────────────────────
# List serializer (used in booking history tables)
# ────────────────────────────────────────────────────────────
class BookingListSerializer(serializers.ModelSerializer):
    equipment = EquipmentListSerializer()
    customer = UserSerializer()
    total_daily_rent = serializers.SerializerMethodField()
    number_of_days = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id",
            "booking_id",
            "equipment",
            "customer",
            "status",
            "created_at",
            "start_date",
            "end_date",
            "response_deadline",
            "total_daily_rent",
            "number_of_days",
        ]

    def get_number_of_days(self, obj):
        """Inclusive day count: start_date to end_date."""
        return max((obj.end_date - obj.start_date).days + 1, 1)

    def get_total_daily_rent(self, obj):
        """Total cost based on inclusive day count."""
        days = max((obj.end_date - obj.start_date).days + 1, 1)
        return obj.equipment.daily_rental * days


# ────────────────────────────────────────────────────────────
# Read serializer (used in update response)
# ────────────────────────────────────────────────────────────
class BookingSerializer(serializers.ModelSerializer):
    """Full booking serializer used in update responses."""

    equipment_type = serializers.SerializerMethodField()
    brand = serializers.SerializerMethodField()
    equipment = EquipmentListSerializer()
    customer = UserSerializer()

    class Meta:
        model = Booking
        fields = [
            "id",
            "booking_id",
            "customer",
            "equipment",
            "equipment_type",
            "brand",
            "start_date",
            "end_date",
            "status",
            "created_at",
            "start_time",
            "end_time",
            # New fields
            "rejection_reason",
            "rejection_note",
            "owner_cancellation_reason",
            "owner_cancellation_note",
            "auto_rejection_note",
            "accepted_at",
            "rejected_at",
            "cancelled_at",
            "started_at",
            "completed_at",
            "response_deadline",
        ]
        read_only_fields = [
            "booking_id",
            "equipment_type",
            "brand",
            "created_at",
            "status",
        ]

    def get_equipment_type(self, obj):
        return obj.equipment.equipment_type.name

    def get_brand(self, obj):
        return obj.equipment.manufacturer.name


# ────────────────────────────────────────────────────────────
# Create serializer
# ────────────────────────────────────────────────────────────
class BookingCreateSerializer(serializers.ModelSerializer):
    """
    Handles booking creation with all business rules:
    - A1: Profile complete
    - A2: Cannot book own equipment
    - A3: Equipment must exist and be available
    - A4: start_date <= end_date
    - A5: Dates within equipment availability window
    - A6: No duplicate active booking (same user + equipment + dates)
    - A7: Only Accepted/Inprogress block calendar (NOT Pending)
    - A8: No past-date booking
    - A9: Max 5 active pending bookings per customer
    - A10: Max 30-day booking duration
    - A11: Max 365 days in the future
    """

    equipment_type = serializers.SerializerMethodField()
    brand = serializers.SerializerMethodField()

    # start_time / end_time are optional — default to 00:00
    start_time = serializers.TimeField(required=False, default=time(0, 0))
    end_time = serializers.TimeField(required=False, default=time(0, 0))

    class Meta:
        model = Booking
        fields = [
            "id",
            "booking_id",
            "equipment",
            "equipment_type",
            "brand",
            "start_date",
            "end_date",
            "status",
            "created_at",
            "start_time",
            "end_time",
            "customer",
            "response_deadline",
        ]
        read_only_fields = [
            "booking_id",
            "customer",
            "equipment_type",
            "brand",
            "created_at",
            "status",
            "response_deadline",
        ]

    def validate(self, attrs):
        """All booking creation validation happens here for consistent DRF error responses."""
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")
        equipment = attrs.get("equipment")
        user = self.context["user"]

        errors = {}

        # ── A1: Profile must be complete before booking ──
        if not user.is_profile_complete:
            errors["non_field_errors"] = [
                "Please complete your profile (address, city, state, pincode) before booking."
            ]

        # ── A4: start_date must be before or equal to end_date ──
        if start_date and end_date and start_date > end_date:
            errors["end_date"] = ["Start date cannot be after end date."]

        # ── A8: No past-date bookings ──
        if start_date and start_date < date.today():
            errors["start_date"] = ["Start date cannot be in the past."]

        # ── C1: Minimum advance booking (owner needs preparation time) ──
        if start_date:
            days_until_start = (start_date - date.today()).days
            if days_until_start < MIN_ADVANCE_BOOKING_DAYS:
                errors["start_date"] = [
                    f"Bookings must be made at least {MIN_ADVANCE_BOOKING_DAYS} day(s) in advance. "
                    "Equipment owners need time to prepare the equipment for rental."
                ]

        # ── A11: Max future booking limit ──
        if start_date:
            days_in_future = (start_date - date.today()).days
            if days_in_future > MAX_FUTURE_BOOKING_DAYS:
                errors["start_date"] = [
                    f"Bookings cannot be made more than {MAX_FUTURE_BOOKING_DAYS} days in advance."
                ]

        # ── A10: Max booking duration ──
        if start_date and end_date:
            duration = (end_date - start_date).days
            if duration > MAX_BOOKING_DURATION_DAYS:
                errors["end_date"] = [
                    f"Booking duration cannot exceed {MAX_BOOKING_DURATION_DAYS} days."
                ]

        # ── A2: Cannot book your own equipment ──
        if equipment and equipment.owner == user:
            errors["equipment"] = ["You cannot book your own equipment."]

        # ── A3: Equipment must be available ──
        if equipment and not equipment.is_available:
            errors["equipment"] = ["Equipment is not available for booking."]

        # ── A5: Dates fall within equipment availability window ──
        if equipment and start_date and end_date:
            if not (
                equipment.available_start_time <= start_date <= equipment.available_end_time
                and equipment.available_start_time <= end_date <= equipment.available_end_time
            ):
                errors["non_field_errors"] = [
                    "Selected dates are outside the equipment's availability window."
                ]

        if errors:
            raise serializers.ValidationError(errors)

        # ── A9: Max active pending bookings per customer ──
        active_pending_count = Booking.objects.filter(
            customer=user,
            status="Pending",
        ).count()
        if active_pending_count >= MAX_ACTIVE_PENDING_PER_CUSTOMER:
            raise serializers.ValidationError({
                "non_field_errors": [
                    f"You can have at most {MAX_ACTIVE_PENDING_PER_CUSTOMER} pending booking requests at a time. "
                    "Please wait for existing requests to be accepted/rejected, or cancel some."
                ]
            })

        # ── A6: No duplicate active booking by same customer for same equipment ──
        active_for_equipment = Booking.objects.filter(
            customer=user,
            equipment=equipment,
        ).exclude(
            status__in=TERMINAL_STATUSES
        )
        if active_for_equipment.exists():
            raise serializers.ValidationError({
                "non_field_errors": [
                    "You already have an active booking request for this equipment. "
                    "Please wait for it to be resolved or cancel it first."
                ]
            })

        # ── A7: Only Accepted/Inprogress bookings block the calendar ──
        overlapping_confirmed = Booking.objects.filter(
            equipment__id=equipment.id,
            status__in=CALENDAR_BLOCKING_STATUSES,
        ).filter(
            Q(start_date__lte=start_date, end_date__gte=start_date)
            | Q(start_date__lte=end_date, end_date__gte=end_date)
            | Q(start_date__gte=start_date, end_date__lte=end_date)
        )

        if overlapping_confirmed.exists():
            raise serializers.ValidationError({
                "non_field_errors": [
                    "This equipment is already booked for the selected dates. Please choose another slot."
                ]
            })

        return attrs

    def create(self, validated_data):
        user = self.context["user"]
        equipment = validated_data.get("equipment")
        start_date = validated_data.get("start_date")
        end_date = validated_data.get("end_date")

        booking = Booking.objects.create(
            **validated_data, customer=user
        )

        # ── Notify the equipment owner about the new booking request ──
        create_notification(
            recipient=equipment.owner,
            notification_type="new_booking_request",
            title="New Booking Request",
            message=(
                f"{user.first_name} {user.last_name} has requested to book "
                f"your {equipment.title} from {start_date} to {end_date}."
            ),
            booking=booking,
        )

        return booking

    def get_equipment_type(self, obj):
        return obj.equipment.equipment_type.name

    def get_brand(self, obj):
        return obj.equipment.manufacturer.name


# ────────────────────────────────────────────────────────────
# Update serializer (full state machine)
# ────────────────────────────────────────────────────────────
class BookingUpdateSerializer(serializers.Serializer):
    """
    Handles ALL booking status transitions with role-based access control.

    Owner transitions:
        Pending   → Accepted  (auto-rejects conflicting Pending bookings)
        Pending   → Rejected  (rejection_reason required)
        Accepted  → Inprogress (only on/after start_date)
        Accepted  → CancelledByOwner (owner_cancellation_reason required)
        Inprogress → Completed
    
    Customer transitions:
        Pending   → Cancelled
        Accepted  → Cancelled (only if start_date is ≥ 24h away)
    """

    status = serializers.ChoiceField(choices=booking_status_choice, required=True)

    # Rejection fields (required when rejecting)
    rejection_reason = serializers.ChoiceField(
        choices=REJECTION_REASONS, required=False, allow_null=True,
    )
    rejection_note = serializers.CharField(
        max_length=500, required=False, allow_blank=True, default="",
    )

    # Owner cancellation fields (required when owner cancels)
    owner_cancellation_reason = serializers.ChoiceField(
        choices=OWNER_CANCEL_REASONS, required=False, allow_null=True,
    )
    owner_cancellation_note = serializers.CharField(
        max_length=500, required=False, allow_blank=True, default="",
    )

    OWNER_TRANSITIONS = {
        "Pending": ["Accepted", "Rejected"],
        "Accepted": ["Inprogress", "CancelledByOwner"],
        "Inprogress": ["Completed"],
    }

    CUSTOMER_TRANSITIONS = {
        "Pending": ["Cancelled"],
        "Accepted": ["Cancelled"],
    }

    def validate(self, attrs):
        """Cross-field validation for rejection/cancellation reasons."""
        new_status = attrs.get("status")

        # Sanitize text fields to prevent stored XSS
        if attrs.get("rejection_note"):
            attrs["rejection_note"] = _sanitize_text(attrs["rejection_note"])
        if attrs.get("owner_cancellation_note"):
            attrs["owner_cancellation_note"] = _sanitize_text(attrs["owner_cancellation_note"])

        # If rejecting, rejection_reason is REQUIRED
        if new_status == "Rejected":
            rejection_reason = attrs.get("rejection_reason")
            if not rejection_reason:
                raise serializers.ValidationError({
                    "rejection_reason": "Rejection reason is required when rejecting a booking."
                })
            # If reason is "Other" (5), note is required
            if int(rejection_reason) == 5 and not attrs.get("rejection_note", "").strip():
                raise serializers.ValidationError({
                    "rejection_note": "Please provide a note when selecting 'Other' as the rejection reason."
                })

        # If owner is cancelling, owner_cancellation_reason is REQUIRED
        if new_status == "CancelledByOwner":
            cancel_reason = attrs.get("owner_cancellation_reason")
            if not cancel_reason:
                raise serializers.ValidationError({
                    "owner_cancellation_reason": "Cancellation reason is required when owner cancels a booking."
                })
            # If reason is "Other" (4), note is required
            if int(cancel_reason) == 4 and not attrs.get("owner_cancellation_note", "").strip():
                raise serializers.ValidationError({
                    "owner_cancellation_note": "Please provide a note when selecting 'Other' as the cancellation reason."
                })

        return attrs

    def update(self, instance, validated_data):
        new_status = validated_data.get("status")
        user = self.context.get("user")
        is_owner = (instance.equipment.owner == user)
        is_customer = (instance.customer == user)
        now = timezone.now()

        # ── Authorization check ──
        if not is_owner and not is_customer:
            raise serializers.ValidationError(
                {"status": False, "message": "You are not authorized to update this booking."}
            )

        # ── State transition validation ──
        if is_owner:
            allowed = self.OWNER_TRANSITIONS.get(instance.status, [])
            if new_status not in allowed:
                raise serializers.ValidationError(
                    {"status": False, "message": f"Cannot change from '{instance.status}' to '{new_status}' as owner."}
                )
        elif is_customer:
            allowed = self.CUSTOMER_TRANSITIONS.get(instance.status, [])
            if new_status not in allowed:
                raise serializers.ValidationError(
                    {"status": False, "message": f"Cannot change from '{instance.status}' to '{new_status}' as customer."}
                )

        # ──────────────────────────────────────────────
        # OWNER: Accept
        # ──────────────────────────────────────────────
        if is_owner and new_status == "Accepted":
            # ── C2: Cannot accept if the entire booking window has passed ──
            if instance.end_date < date.today():
                raise serializers.ValidationError({
                    "status": False,
                    "message": "Cannot accept this booking — the booking window has already passed. "
                               "Please decline it instead."
                })

            # ── C3: Equipment must still be available ──
            if not instance.equipment.is_available:
                raise serializers.ValidationError({
                    "status": False,
                    "message": "Cannot accept — this equipment is currently marked as unavailable. "
                               "Please re-enable availability first, or decline the request."
                })

            instance.status = "Accepted"
            instance.accepted_at = now
            instance.save()

            # ── Notify the customer that their booking was accepted ──
            create_notification(
                recipient=instance.customer,
                notification_type="booking_accepted",
                title="Booking Confirmed",
                message=(
                    f"Your booking {instance.booking_id} for "
                    f"{instance.equipment.title} has been accepted by the owner."
                ),
                booking=instance,
            )

            # ── Auto-reject all other Pending bookings with overlapping dates ──
            conflicting_pending = Booking.objects.filter(
                equipment=instance.equipment,
                status="Pending",
            ).exclude(
                pk=instance.pk,
            ).filter(
                Q(start_date__lte=instance.start_date, end_date__gte=instance.start_date)
                | Q(start_date__lte=instance.end_date, end_date__gte=instance.end_date)
                | Q(start_date__gte=instance.start_date, end_date__lte=instance.end_date)
            )

            # Notify each auto-rejected customer individually
            auto_reject_note = f"Another booking (#{instance.booking_id}) was accepted for overlapping dates."
            for rejected_booking in conflicting_pending:
                create_notification(
                    recipient=rejected_booking.customer,
                    notification_type="booking_auto_rejected",
                    title="Booking Auto-Rejected",
                    message=(
                        f"Your booking {rejected_booking.booking_id} for "
                        f"{rejected_booking.equipment.title} was auto-rejected "
                        f"because another booking was accepted for overlapping dates."
                    ),
                    booking=rejected_booking,
                )

            conflicting_pending.update(
                status="AutoRejected",
                auto_rejection_note=auto_reject_note,
                rejected_at=now,
            )

            return instance

        # ──────────────────────────────────────────────
        # OWNER: Reject (reason required)
        # ──────────────────────────────────────────────
        if is_owner and new_status == "Rejected":
            instance.status = "Rejected"
            instance.rejection_reason = validated_data.get("rejection_reason")
            instance.rejection_note = validated_data.get("rejection_note", "")
            instance.rejected_at = now
            instance.save()

            # ── Notify customer of rejection with reason ──
            reason_display = dict(REJECTION_REASONS).get(
                int(instance.rejection_reason), "Not specified"
            )
            create_notification(
                recipient=instance.customer,
                notification_type="booking_rejected",
                title="Booking Declined",
                message=(
                    f"Your booking {instance.booking_id} for "
                    f"{instance.equipment.title} was rejected. "
                    f"Reason: {reason_display}."
                ),
                booking=instance,
            )

            return instance

        # ──────────────────────────────────────────────
        # OWNER: Mark Inprogress (date guard)
        # ──────────────────────────────────────────────
        if is_owner and new_status == "Inprogress":
            # Guard: can only mark Inprogress on or after start_date
            if date.today() < instance.start_date:
                raise serializers.ValidationError({
                    "status": False,
                    "message": f"Cannot start rental before the booking start date ({instance.start_date}). Please wait until the start date."
                })
            # ── C4: Cannot start rental after end_date has passed ──
            if date.today() > instance.end_date:
                raise serializers.ValidationError({
                    "status": False,
                    "message": f"Cannot start rental — the booking window ended on {instance.end_date}. "
                               "The rental period has passed. Please mark as completed or contact the customer."
                })
            instance.status = "Inprogress"
            instance.started_at = now
            instance.save()

            # ── Notify customer that rental has started ──
            create_notification(
                recipient=instance.customer,
                notification_type="booking_inprogress",
                title="Rental Started",
                message=(
                    f"Your booking {instance.booking_id} for "
                    f"{instance.equipment.title} is now in progress."
                ),
                booking=instance,
            )

            return instance

        # ──────────────────────────────────────────────
        # OWNER: Mark Completed (date guard)
        # ──────────────────────────────────────────────
        if is_owner and new_status == "Completed":
            # Guard: can only mark Completed on or after start_date
            if date.today() < instance.start_date:
                raise serializers.ValidationError({
                    "status": False,
                    "message": "Cannot mark booking as completed before the start date."
                })
            instance.status = "Completed"
            instance.completed_at = now
            instance.save()

            # ── Notify customer that rental is completed ──
            create_notification(
                recipient=instance.customer,
                notification_type="booking_completed",
                title="Rental Completed",
                message=(
                    f"Your booking {instance.booking_id} for "
                    f"{instance.equipment.title} has been marked as completed. "
                    f"Thank you for using KrushiMitra!"
                ),
                booking=instance,
            )

            return instance

        # ──────────────────────────────────────────────
        # OWNER: Cancel accepted booking (reason required)
        # ──────────────────────────────────────────────
        if is_owner and new_status == "CancelledByOwner":
            instance.status = "CancelledByOwner"
            instance.owner_cancellation_reason = validated_data.get("owner_cancellation_reason")
            instance.owner_cancellation_note = validated_data.get("owner_cancellation_note", "")
            instance.cancelled_by = user
            instance.cancelled_at = now
            instance.save()

            # ── Notify customer that owner cancelled ──
            reason_display = dict(OWNER_CANCEL_REASONS).get(
                int(instance.owner_cancellation_reason), "Not specified"
            )
            create_notification(
                recipient=instance.customer,
                notification_type="booking_cancelled_by_owner",
                title="Booking Cancelled by Owner",
                message=(
                    f"The owner has cancelled your booking {instance.booking_id} "
                    f"for {instance.equipment.title}. Reason: {reason_display}."
                ),
                booking=instance,
            )

            return instance

        # ──────────────────────────────────────────────
        # CUSTOMER: Cancel
        # ──────────────────────────────────────────────
        if is_customer and new_status == "Cancelled":
            # 24-hour cancellation rule for accepted bookings
            if instance.status == "Accepted":
                hours_until_start = (
                    datetime.combine(instance.start_date, time.min) - datetime.now()
                ).total_seconds() / 3600
                if hours_until_start < 24:
                    raise serializers.ValidationError({
                        "status": False,
                        "message": "Accepted bookings can only be cancelled at least 24 hours before the start date."
                    })
            instance.status = "Cancelled"
            instance.cancelled_by = user
            instance.cancelled_at = now
            instance.save()

            # ── Notify equipment owner that customer cancelled ──
            create_notification(
                recipient=instance.equipment.owner,
                notification_type="booking_cancelled",
                title="Booking Cancelled",
                message=(
                    f"{user.first_name} {user.last_name} has cancelled "
                    f"booking {instance.booking_id} for {instance.equipment.title}."
                ),
                booking=instance,
            )

            return instance

        # Fallback — should not reach here
        raise serializers.ValidationError(
            {"status": False, "message": "Invalid status transition."}
        )


# ────────────────────────────────────────────────────────────
# Detail serializer (single booking view)
# ────────────────────────────────────────────────────────────
class BookingDetailSerializer(serializers.ModelSerializer):
    equipment = EquipmentListSerializer()
    total_daily_rent = serializers.SerializerMethodField()
    total_hourly_rent = serializers.SerializerMethodField()
    number_of_days = serializers.SerializerMethodField()
    owner = serializers.SerializerMethodField()
    customer = UserSerializer()
    cancelled_by_detail = serializers.SerializerMethodField()
    rejection_reason_display = serializers.SerializerMethodField()
    owner_cancellation_reason_display = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id",
            "customer",
            "created_at",
            "booking_id",
            "equipment",
            "start_date",
            "end_date",
            "total_daily_rent",
            "total_hourly_rent",
            "status",
            "number_of_days",
            "owner",
            # Rejection / Cancellation details
            "rejection_reason",
            "rejection_reason_display",
            "rejection_note",
            "owner_cancellation_reason",
            "owner_cancellation_reason_display",
            "owner_cancellation_note",
            "auto_rejection_note",
            "cancelled_by_detail",
            # Lifecycle timestamps
            "accepted_at",
            "rejected_at",
            "cancelled_at",
            "started_at",
            "completed_at",
            "expired_at",
            "response_deadline",
        ]

    def get_total_daily_rent(self, obj):
        """Inclusive day count: booking from May 1 to May 3 = 3 days."""
        days = max((obj.end_date - obj.start_date).days + 1, 1)
        return obj.equipment.daily_rental * days

    def get_total_hourly_rent(self, obj):
        """Hourly rent based on time range (if start_time/end_time are set)."""
        if obj.start_time and obj.end_time:
            diff = (
                datetime.combine(date.today(), obj.end_time)
                - datetime.combine(date.today(), obj.start_time)
            ).total_seconds() / 3600
            if diff > 0:
                return round(obj.equipment.hourly_rental * diff)
        return 0

    def get_number_of_days(self, obj):
        """Inclusive day count."""
        return max((obj.end_date - obj.start_date).days + 1, 1)

    def get_rejection_reason_display(self, obj):
        return obj.rejection_reason_display

    def get_owner_cancellation_reason_display(self, obj):
        return obj.owner_cancellation_reason_display

    def get_cancelled_by_detail(self, obj):
        """Safely serialize cancelled_by user as a dict instead of raw FK."""
        if obj.cancelled_by:
            return {
                "id": obj.cancelled_by.id,
                "first_name": obj.cancelled_by.first_name,
                "last_name": obj.cancelled_by.last_name,
            }
        return None

    def get_owner(self, obj):
        owner = obj.equipment.owner
        detail = {
            "id": owner.id,
            "first_name": owner.first_name,
            "last_name": owner.last_name,
            "address": owner.address,
            "city": owner.city,
            "state": owner.state,
            "pin_code": owner.pin_code,
        }
        if obj.equipment.show_phone_number:
            detail["phone_number"] = owner.phone_number

        return detail
