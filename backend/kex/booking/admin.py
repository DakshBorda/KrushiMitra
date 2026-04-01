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
        "customer",
        "equipment",
        "equipment_owner",
        "start_date",
        "end_date",
        "total_cost_display",
        "status_badge",
        "response_deadline",
        "created_at",
    ]
    list_filter = ["status", "created_at", "start_date"]
    search_fields = [
        "booking_id",
        "customer__username",
        "customer__first_name",
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

    # ── FIX BUG 4: Eliminate N+1 queries ──
    list_select_related = ["equipment", "equipment__owner", "customer"]

    fieldsets = (
        ("Booking Info", {
            "fields": ("booking_id", "customer", "equipment", "status"),
        }),
        ("Schedule", {
            "fields": ("start_date", "end_date", "start_time", "end_time"),
        }),
        ("Rejection / Cancellation Details", {
            "fields": (
                "rejection_reason", "rejection_note",
                "owner_cancellation_reason", "owner_cancellation_note",
                "auto_rejection_note",
                "cancelled_by",
            ),
            "classes": ("collapse",),
        }),
        ("Lifecycle Timestamps", {
            "fields": (
                "created_at", "response_deadline",
                "accepted_at", "rejected_at",
                "cancelled_at", "started_at",
                "completed_at", "expired_at",
            ),
            "classes": ("collapse",),
        }),
    )

    def equipment_owner(self, obj):
        owner = obj.equipment.owner
        name = f"{owner.first_name} {owner.last_name}".strip() or owner.email
        return name
    equipment_owner.short_description = "Equipment Owner"

    def total_cost_display(self, obj):
        """Calculate total cost from dates and daily rate. 
        NOTE: total_daily_rent is NOT a model field — it's a SerializerMethodField.
        We must always compute it here from the actual model fields."""
        try:
            days = (obj.end_date - obj.start_date).days + 1
            if days < 1:
                days = 1
            cost = days * obj.equipment.daily_rental
            return format_html('<strong>₹{:,}</strong>', cost)
        except Exception:
            return "—"
    total_cost_display.short_description = "Total Cost"

    def status_badge(self, obj):
        colors = {
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
        labels = {
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
        color = colors.get(obj.status, "#999")
        label = labels.get(obj.status, obj.status)
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 12px; font-size: 11px; font-weight: bold;">{}</span>',
            color, label
        )
    status_badge.short_description = "Status"

    # ── Admin Actions ──
    actions = ["expire_stale_bookings", "export_bookings_csv"]

    @admin.action(description="Expire stale pending bookings (past response deadline)")
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
        self.message_user(request, f"Expired {count} stale pending booking(s).")

    @admin.action(description="Export selected bookings to CSV")
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
                f"{b.customer.first_name} {b.customer.last_name}".strip(),
                b.equipment.title,
                f"{owner.first_name} {owner.last_name}".strip(),
                b.start_date, b.end_date, days,
                b.equipment.daily_rental, cost,
                b.status,
                b.created_at.strftime("%Y-%m-%d %H:%M"),
                b.response_deadline.strftime("%Y-%m-%d %H:%M") if b.response_deadline else "—",
            ])
        return response
