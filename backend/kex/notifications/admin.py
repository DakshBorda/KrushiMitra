from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from datetime import timedelta
from kex.notifications.models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = [
        "recipient_name",
        "notification_type_badge",
        "title",
        "booking_link",
        "is_read_badge",
        "created_at",
    ]
    list_filter = ["notification_type", "is_read", "created_at"]
    search_fields = [
        "recipient__first_name",
        "recipient__last_name",
        "recipient__email",
        "title",
        "message",
    ]
    list_per_page = 30
    readonly_fields = ["created_at", "recipient", "notification_type", "title", "message", "booking"]
    date_hierarchy = "created_at"
    list_select_related = ["recipient", "booking"]

    def get_actions(self, request):
        actions = super().get_actions(request)
        if "delete_selected" in actions:
            del actions["delete_selected"]
        return actions

    def recipient_name(self, obj):
        name = "{} {}".format(obj.recipient.first_name, obj.recipient.last_name).strip()
        return name or obj.recipient.email
    recipient_name.short_description = "To"
    recipient_name.admin_order_field = "recipient__first_name"

    NOTIFICATION_COLORS = {
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

    def notification_type_badge(self, obj):
        color = self.NOTIFICATION_COLORS.get(obj.notification_type, "#999")
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
            from django.urls import reverse
            url = reverse("admin:booking_booking_change", args=[obj.booking.pk])
            return format_html(
                '<a href="{}">{}</a>',
                url,
                obj.booking.booking_id,
            )
        return ""
    booking_link.short_description = "Booking"

    actions = ["mark_as_read", "mark_as_unread", "cleanup_old_read"]

    @admin.action(description="Mark selected as Read")
    def mark_as_read(self, request, queryset):
        count = queryset.filter(is_read=False).update(is_read=True)
        self.message_user(request, "Marked {} notification(s) as read.".format(count))

    @admin.action(description="Mark selected as Unread")
    def mark_as_unread(self, request, queryset):
        count = queryset.filter(is_read=True).update(is_read=False)
        self.message_user(request, "Marked {} notification(s) as unread.".format(count))

    @admin.action(description="Clean up old read notifications (30+ days)")
    def cleanup_old_read(self, request, queryset):
        cutoff = timezone.now() - timedelta(days=30)
        old_read = Notification.objects.filter(
            is_read=True,
            created_at__lt=cutoff,
        )
        count = old_read.count()
        old_read.delete()
        self.message_user(request, "Deleted {} old read notification(s).".format(count))

    def has_add_permission(self, request):
        """Notifications are system-generated, admin should not create them."""
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
