from django.db import models
from django.utils import timezone
from datetime import timedelta

from kex.equipment.models import Equipment
from kex.users.models import User
from django.db.models import Max


booking_status_choice = (
    ("Pending", "Pending"),
    ("Accepted", "Accepted"),
    ("Rejected", "Rejected"),
    ("AutoRejected", "Auto Rejected"),
    ("Cancelled", "Cancelled"),
    ("CancelledByOwner", "Cancelled By Owner"),
    ("Expired", "Expired"),
    ("Inprogress", "Inprogress"),
    ("Completed", "Completed"),
)

# Terminal statuses — bookings in these states don't block the calendar
TERMINAL_STATUSES = [
    "Rejected", "AutoRejected", "Cancelled", "CancelledByOwner", "Expired", "Completed",
]

# Statuses that actually block the equipment calendar (confirmed bookings)
CALENDAR_BLOCKING_STATUSES = ["Accepted", "Inprogress"]

REJECTION_REASONS = (
    (1, "Equipment not available on these dates"),
    (2, "Equipment under maintenance/repair"),
    (3, "Location too far"),
    (4, "Booking duration too short/long"),
    (5, "Other"),
)

OWNER_CANCEL_REASONS = (
    (1, "Equipment breakdown"),
    (2, "Personal/family emergency"),
    (3, "Scheduling conflict / double booking"),
    (4, "Other"),
)

# How long the owner has to respond before auto-expiry (hours)
RESPONSE_DEADLINE_HOURS = 48


class Booking(models.Model):
    booking_id = models.CharField(editable=False, max_length=10)
    customer = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="bookings_as_customer"
    )
    equipment = models.ForeignKey(Equipment, on_delete=models.CASCADE)
    start_date = models.DateField()
    end_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    status = models.CharField(
        choices=booking_status_choice, max_length=20, default="Pending"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    # ── Rejection / Cancellation reason fields ──
    rejection_reason = models.PositiveIntegerField(
        choices=REJECTION_REASONS, null=True, blank=True
    )
    rejection_note = models.CharField(max_length=500, blank=True, default="")

    owner_cancellation_reason = models.PositiveIntegerField(
        choices=OWNER_CANCEL_REASONS, null=True, blank=True
    )
    owner_cancellation_note = models.CharField(max_length=500, blank=True, default="")

    cancelled_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="cancelled_bookings",
    )

    auto_rejection_note = models.CharField(
        max_length=200, blank=True, default="",
        help_text="System-generated note when auto-rejected due to conflicting acceptance.",
    )

    # ── Lifecycle timestamp fields ──
    accepted_at = models.DateTimeField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    expired_at = models.DateTimeField(null=True, blank=True)

    response_deadline = models.DateTimeField(
        null=True, blank=True,
        help_text="Owner must respond before this time, otherwise booking auto-expires.",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.booking_id} — {self.customer.username} → {self.equipment.title}"

    def save(self, *args, **kwargs):
        if not self.booking_id:
            max_id = Booking.objects.aggregate(id_max=Max("id"))["id_max"]
            self.booking_id = "{}{:05d}".format(
                "BK", (max_id + 1) if max_id is not None else 1
            )
        # Auto-set response deadline on first save (creation)
        if not self.pk and not self.response_deadline:
            self.response_deadline = timezone.now() + timedelta(
                hours=RESPONSE_DEADLINE_HOURS
            )
        super().save(*args, **kwargs)

    @property
    def is_terminal(self):
        """Check if booking is in a terminal (final) state."""
        return self.status in TERMINAL_STATUSES

    @property
    def rejection_reason_display(self):
        """Human-readable rejection reason."""
        if self.rejection_reason:
            return dict(REJECTION_REASONS).get(self.rejection_reason, "")
        return ""

    @property
    def owner_cancellation_reason_display(self):
        """Human-readable owner cancellation reason."""
        if self.owner_cancellation_reason:
            return dict(OWNER_CANCEL_REASONS).get(self.owner_cancellation_reason, "")
        return ""
