from rest_framework import serializers
from kex.notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """Read-only serializer for notifications."""

    booking_display_id = serializers.SerializerMethodField()
    booking_pk = serializers.SerializerMethodField()
    time_ago = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "title",
            "message",
            "booking_pk",
            "booking_display_id",
            "is_read",
            "created_at",
            "time_ago",
        ]
        read_only_fields = fields

    def get_booking_display_id(self, obj):
        """Return the human-readable booking ID (e.g. BK00001)."""
        if obj.booking:
            return obj.booking.booking_id
        return None

    def get_booking_pk(self, obj):
        """Return the booking primary key for frontend navigation."""
        if obj.booking:
            return obj.booking.pk
        return None

    def get_time_ago(self, obj):
        """Return a human-readable time-ago string."""
        from django.utils import timezone

        now = timezone.now()
        diff = now - obj.created_at
        seconds = diff.total_seconds()

        if seconds < 60:
            return "Just now"
        elif seconds < 3600:
            minutes = int(seconds // 60)
            return f"{minutes}m ago"
        elif seconds < 86400:
            hours = int(seconds // 3600)
            return f"{hours}h ago"
        elif seconds < 604800:
            days = int(seconds // 86400)
            return f"{days}d ago"
        else:
            return obj.created_at.strftime("%b %d, %Y")
