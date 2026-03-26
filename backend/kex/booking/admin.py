from django.contrib import admin
from django.utils.html import format_html
from kex.booking.models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = [
        "booking_id",
        "customer",
        "equipment",
        "start_date",
        "end_date",
        "status_badge",
        "created_at",
    ]
    list_filter = ["status", "created_at", "start_date"]
    search_fields = ["booking_id", "customer__username", "customer__first_name", "equipment__title"]
    list_editable = []
    list_per_page = 20
    readonly_fields = ["booking_id", "created_at"]
    ordering = ["-created_at"]

    fieldsets = (
        ("Booking Info", {
            "fields": ("booking_id", "customer", "equipment", "status"),
        }),
        ("Schedule", {
            "fields": ("start_date", "end_date", "start_time", "end_time"),
        }),
        ("Metadata", {
            "fields": ("created_at",),
            "classes": ("collapse",),
        }),
    )

    def status_badge(self, obj):
        colors = {
            "Pending": "#f0ad4e",
            "Accepted": "#5cb85c",
            "Rejected": "#d9534f",
            "Cancelled": "#777",
            "Inprogress": "#5bc0de",
            "Completed": "#28a745",
        }
        color = colors.get(obj.status, "#999")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: bold;">{}</span>',
            color, obj.status
        )
    status_badge.short_description = "Status"
