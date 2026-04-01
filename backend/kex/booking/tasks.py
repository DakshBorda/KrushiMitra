import logging

from celery import shared_task
from django.utils import timezone

from kex.booking.models import Booking

logger = logging.getLogger(__name__)


@shared_task(name="booking.expire_stale_bookings")
def expire_stale_bookings():
    """
    Find all Pending bookings whose response_deadline has passed
    and expire them. Creates a notification for each affected customer.

    Scheduled via Celery beat to run every 30 minutes.
    Can also be triggered manually via:
        python manage.py expire_bookings
    """
    now = timezone.now()

    stale_bookings = Booking.objects.filter(
        status="Pending",
        response_deadline__lt=now,
    )

    count = stale_bookings.count()

    if count == 0:
        logger.info("No stale bookings to expire.")
        return 0

    # Import here to avoid circular imports
    from kex.notifications.models import create_notification

    for booking in stale_bookings:
        booking.status = "Expired"
        booking.expired_at = now
        booking.save(update_fields=["status", "expired_at"])

        # Notify the customer
        create_notification(
            recipient=booking.customer,
            notification_type="booking_expired",
            title="Booking Request Expired",
            message=(
                f"Your booking request {booking.booking_id} for "
                f"{booking.equipment.title} has expired because the "
                f"owner did not respond within the deadline. "
                f"Please try booking another equipment."
            ),
            booking=booking,
        )

        logger.info(
            "Expired booking %s (customer=%s, equipment=%s)",
            booking.booking_id,
            booking.customer.username,
            booking.equipment.title,
        )

    logger.info("Expired %d stale booking(s).", count)
    return count
