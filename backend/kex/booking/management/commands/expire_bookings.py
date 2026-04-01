from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Expire all pending bookings whose response deadline has passed (48h)."

    def handle(self, *args, **options):
        from kex.booking.tasks import expire_stale_bookings

        count = expire_stale_bookings()
        if count:
            self.stdout.write(
                self.style.SUCCESS(f"Successfully expired {count} booking(s).")
            )
        else:
            self.stdout.write(
                self.style.WARNING("No stale bookings found to expire.")
            )
