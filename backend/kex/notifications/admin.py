from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from datetime import timedelta
from kex.notifications.models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "recipient",
        "notification_type_badge",
        "title",
        "booking_link",
        "is_read_badge",
        "created_at",
    ]
    list_filter = ["notification_type", "is_read", "created_at"]
    search_fields = [
        "recipient__username",
        "recipient__email",
        "recipient__first_name",
        "recipient__last_name",
        "title",
        "message",
    ]
    list_per_page = 30
    readonly_fields = ["created_at"]
    raw_id_fields = ["recipient", "booking"]
    date_hierarchy = "created_at"
    list_select_related = ["recipient", "booking"]

    def notification_type_badge(self, obj):
        colors = {
            "new_booking_request": "#3b82f6",
            "booking_accepted": "#22c55e",
            "booking_rejected": "#ef4444",
            "booking_auto_rejected": "#f97316",
            "booking_expired": "#6b7280",
            "booking_cancelled": "#78716c",
            "booking_cancelled_by_owner": "#dc2626",
            "booking_inprogress": "#eab308",
            "booking_completed": "#2563eb",
        }
        color = colors.get(obj.notification_type, "#999")
        label = obj.get_notification_type_display()
        return format_html(
            '<span style="background:{}; color:white; padding:3px 8px; '
            'border-radius:4px; font-size:11px; font-weight:600;">{}</span>',
            color,
            label,
        )
    notification_type_badge.short_description = "Type"

    def is_read_badge(self, obj):
        if obj.is_read:
            return format_html(
                '<span style="color:#22c55e; font-weight:600;">Read</span>'
            )
        return format_html(
            '<span style="color:#ef4444; font-weight:600;">Unread</span>'
        )
    is_read_badge.short_description = "Status"

    def booking_link(self, obj):
        if obj.booking:
            return format_html(
                '<a href="/admin/booking/booking/{}/change/">{}</a>',
                obj.booking.pk,
                obj.booking.booking_id,
            )
        return "—"
    booking_link.short_description = "Booking"

    # ── Bulk Actions ──
    actions = ["mark_as_read", "mark_as_unread", "cleanup_old_read"]

    @admin.action(description="Mark selected notifications as read")
    def mark_as_read(self, request, queryset):
        count = queryset.filter(is_read=False).update(is_read=True)
        self.message_user(request, f"Marked {count} notification(s) as read.")

    @admin.action(description="Mark selected notifications as unread")
    def mark_as_unread(self, request, queryset):
        count = queryset.filter(is_read=True).update(is_read=False)
        self.message_user(request, f"Marked {count} notification(s) as unread.")

    @admin.action(description="Delete read notifications older than 30 days")
    def cleanup_old_read(self, request, queryset):
        cutoff = timezone.now() - timedelta(days=30)
        old_read = Notification.objects.filter(
            is_read=True,
            created_at__lt=cutoff,
        )
        count = old_read.count()
        old_read.delete()
        self.message_user(request, f"Deleted {count} old read notification(s).")
