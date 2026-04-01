from django.forms import ValidationError
from rest_framework import serializers
from kex.booking.models import Booking, TERMINAL_STATUSES
from kex.enquiry.models import CancelForm, HelpCentre, PartnerDispute, ReportEquipment,FeedbackForm
from kex.equipment.models import Equipment
from kex.users.models import User


class HelpCentreSerializer(serializers.ModelSerializer):
    class Meta:
        model = HelpCentre
        fields = "__all__"


class PartnerDisputeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartnerDispute
        fields = "__all__"

    def validate_partner_id(self, partner_id):
        if not User.objects.filter(user_id=partner_id).exists():
            raise ValidationError("Partner doesn't exists")

        return partner_id

    def validate_equipment_id(self, equipment_id):
        if not Equipment.objects.filter(eq_id=equipment_id).exists():
            raise ValidationError("Equipment ID doesn't exists")

        return equipment_id


class CancelFormSerializer(serializers.ModelSerializer):
    class Meta:
        model = CancelForm
        exclude = ["user"]

    def validate_booking_id(self, booking_id):
        user = self.context["user"]
        booking = Booking.objects.filter(
            booking_id=booking_id, customer=user
        ).exclude(status__in=TERMINAL_STATUSES).first()

        if not booking:
            raise ValidationError(
                "No active booking found with this ID for your account."
            )

        return booking_id

    def create(self, validated_data):
        # Only store the cancellation reason — do NOT change booking status directly.
        # The user must cancel via the booking update API which enforces the
        # 24-hour rule and proper state machine transitions.
        cancelform = CancelForm.objects.create(
            user=self.context["user"], **validated_data
        )
        return cancelform


class ReportEquipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportEquipment
        exclude = ["user"]

    def validate_equipment(self, equipment):
        # Business Rule: Cannot report your own equipment
        if equipment.owner == self.context["user"]:
            raise ValidationError("You cannot report your own equipment.")
        return equipment

    def create(self,validated_data):

        report_equipment = ReportEquipment.objects.create(user=self.context["user"],**validated_data)
        return report_equipment

class FeedbackFormSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedbackForm
        fields = "__all__"

