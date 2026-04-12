from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from django.http import HttpResponse
from kex.booking.models import Booking
import csv


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = [
        "booking_id",
        "customer_name",
        "equipment",
        "owner_name",
        "start_date",
        "end_date",
        "total_cost_display",
        "status_badge",
        "created_at",
    ]
    list_filter = ["status", "start_date"]
    search_fields = [
        "booking_id",
        "customer__first_name",
        "customer__last_name",
        "equipment__title",
        "equipment__owner__first_name",
    ]
    list_per_page = 20
    readonly_fields = [
        "booking_id", "created_at", "accepted_at", "rejected_at",
        "cancelled_at", "started_at", "completed_at", "expired_at",
        "response_deadline",
    ]
    ordering = ["-created_at"]
    date_hierarchy = "created_at"
    list_select_related = ["equipment", "equipment__owner", "customer"]

    fieldsets = (
        ("Booking Details", {
            "fields": ("booking_id", "customer", "equipment", "status"),
            "description": "Who booked what equipment and current status.",
        }),
        ("Rental Period", {
            "fields": ("start_date", "end_date", "start_time", "end_time"),
            "description": "When the equipment is needed.",
        }),
        ("Rejection / Cancellation Info", {
            "fields": (
                "rejection_reason", "rejection_note",
                "owner_cancellation_reason", "owner_cancellation_note",
                "auto_rejection_note",
                "cancelled_by",
            ),
            "classes": ("collapse",),
            "description": "Only relevant if the booking was rejected or cancelled.",
        }),
        ("Timeline", {
            "fields": (
                "created_at", "response_deadline",
                "accepted_at", "rejected_at",
                "cancelled_at", "started_at",
                "completed_at", "expired_at",
            ),
            "classes": ("collapse",),
            "description": "Automatic timestamps for booking lifecycle events.",
        }),
    )

    def get_actions(self, request):
        actions = super().get_actions(request)
        if "delete_selected" in actions:
            del actions["delete_selected"]
        return actions

    def customer_name(self, obj):
        name = "{} {}".format(obj.customer.first_name, obj.customer.last_name).strip()
        return name or obj.customer.email
    customer_name.short_description = "Customer"
    customer_name.admin_order_field = "customer__first_name"

    def owner_name(self, obj):
        owner = obj.equipment.owner
        name = "{} {}".format(owner.first_name, owner.last_name).strip()
        return name or owner.email
    owner_name.short_description = "Owner"

    def total_cost_display(self, obj):
        try:
            days = (obj.end_date - obj.start_date).days + 1
            if days < 1:
                days = 1
            cost = days * obj.equipment.daily_rental
            formatted = "Rs. {:,}".format(cost)
            return format_html('<strong>{}</strong>', formatted)
        except Exception:
            return "—"
    total_cost_display.short_description = "Total Cost"

    STATUS_COLORS = {
        "Pending": "#f0ad4e",
        "Accepted": "#5cb85c",
        "Rejected": "#d9534f",
        "AutoRejected": "#e67e22",
        "Cancelled": "#777",
        "CancelledByOwner": "#c0392b",
        "Expired": "#95a5a6",
        "Inprogress": "#5bc0de",
        "Completed": "#28a745",
    }
    STATUS_LABELS = {
        "Pending": "Pending",
        "Accepted": "Confirmed",
        "Rejected": "Declined",
        "AutoRejected": "Auto-Declined",
        "Cancelled": "Cancelled",
        "CancelledByOwner": "Owner Cancelled",
        "Expired": "Expired",
        "Inprogress": "In Progress",
        "Completed": "Completed",
    }

    def status_badge(self, obj):
        color = self.STATUS_COLORS.get(obj.status, "#999")
        label = self.STATUS_LABELS.get(obj.status, obj.status)
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 12px; font-size: 11px; font-weight: bold;">{}</span>',
            color, label
        )
    status_badge.short_description = "Status"
    status_badge.admin_order_field = "status"

    actions = ["expire_stale_bookings", "export_bookings_csv"]

    @admin.action(description="Expire overdue pending bookings")
    def expire_stale_bookings(self, request, queryset):
        now = timezone.now()
        stale = Booking.objects.filter(
            status="Pending",
            response_deadline__lt=now,
        )
        count = stale.count()
        for booking in stale:
            booking.status = "Expired"
            booking.expired_at = now
            booking.save(update_fields=["status", "expired_at"])
        self.message_user(request, "Expired {} stale pending booking(s).".format(count))

    @admin.action(description="Download selected as CSV")
    def export_bookings_csv(self, request, queryset):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="krushimitra_bookings.csv"'
        writer = csv.writer(response)
        writer.writerow([
            "Booking ID", "Customer", "Equipment", "Owner",
            "Start Date", "End Date", "Days", "Daily Rate", "Total Cost",
            "Status", "Created", "Response Deadline",
        ])
        for b in queryset.select_related("equipment", "equipment__owner", "customer"):
            days = max((b.end_date - b.start_date).days + 1, 1)
            cost = days * b.equipment.daily_rental
            owner = b.equipment.owner
            writer.writerow([
                b.booking_id,
                "{} {}".format(b.customer.first_name, b.customer.last_name).strip(),
                b.equipment.title,
                "{} {}".format(owner.first_name, owner.last_name).strip(),
                b.start_date, b.end_date, days,
                b.equipment.daily_rental, cost,
                b.status,
                b.created_at.strftime("%Y-%m-%d %H:%M"),
                b.response_deadline.strftime("%Y-%m-%d %H:%M") if b.response_deadline else "",
            ])
        return response

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_add_permission(self, request):
        """Bookings are created by users via the website, not by admin."""
        return False
