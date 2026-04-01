from django.db import models
from kex.users.models import User
from kex.booking.models import Booking


NOTIFICATION_TYPES = (
    ("new_booking_request", "New Booking Request"),
    ("booking_accepted", "Booking Accepted"),
    ("booking_rejected", "Booking Rejected"),
    ("booking_auto_rejected", "Booking Auto-Rejected"),
    ("booking_expired", "Booking Expired"),
    ("booking_cancelled", "Booking Cancelled"),
    ("booking_cancelled_by_owner", "Booking Cancelled By Owner"),
    ("booking_inprogress", "Rental Started"),
    ("booking_completed", "Rental Completed"),
)


class Notification(models.Model):
    """In-app notification for booking lifecycle events."""

    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(
        max_length=40,
        choices=NOTIFICATION_TYPES,
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
    )
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "-created_at"]),
            models.Index(fields=["recipient", "is_read"]),
        ]

    def __str__(self):
        return f"[{self.notification_type}] {self.title} → {self.recipient.username}"


def create_notification(recipient, notification_type, title, message, booking=None):
    """
    Convenience helper to create a notification.

    Usage:
        from kex.notifications.models import create_notification
        create_notification(
            recipient=user,
            notification_type="booking_accepted",
            title="Booking Accepted",
            message="Your booking BK00001 for Tractor has been accepted.",
            booking=booking_instance,
        )
    """
    return Notification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        title=title,
        message=message,
        booking=booking,
    )
