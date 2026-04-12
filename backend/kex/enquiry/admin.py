from django.contrib import admin
from django.utils.html import format_html
from kex.enquiry.models import (
    HelpCentre,
    PartnerDispute,
    CancelForm,
    ReportEquipment,
    FeedbackForm,
)


# ── Shared status badge helper ──
def _status_badge(obj):
    colors = {
        "new": "#3b82f6",
        "in_progress": "#f59e0b",
        "resolved": "#22c55e",
        "closed": "#6b7280",
    }
    labels = {
        "new": "New",
        "in_progress": "In Progress",
        "resolved": "Resolved",
        "closed": "Closed",
    }
    color = colors.get(obj.status, "#6b7280")
    label = labels.get(obj.status, obj.get_status_display())
    return format_html(
        '<span style="background:{};color:#fff;padding:3px 10px;border-radius:12px;'
        'font-size:11px;font-weight:600;">{}</span>',
        color, label
    )


# ── Shared admin actions (no emojis) ──
@admin.action(description="Mark as In Progress")
def mark_in_progress(modeladmin, request, queryset):
    count = queryset.update(status="in_progress")
    modeladmin.message_user(request, "Marked {} item(s) as In Progress.".format(count))


@admin.action(description="Mark as Resolved")
def mark_resolved(modeladmin, request, queryset):
    count = queryset.update(status="resolved")
    modeladmin.message_user(request, "Marked {} item(s) as Resolved.".format(count))


@admin.action(description="Mark as Closed")
def mark_closed(modeladmin, request, queryset):
    count = queryset.update(status="closed")
    modeladmin.message_user(request, "Marked {} item(s) as Closed.".format(count))


class BaseEnquiryAdmin(admin.ModelAdmin):
    """Shared admin config for all enquiry/support models."""

    def get_actions(self, request):
        actions = super().get_actions(request)
        if "delete_selected" in actions:
            del actions["delete_selected"]
        return actions

    def has_add_permission(self, request):
        """Enquiries come from users, admins don't create them."""
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(HelpCentre)
class HelpCentreAdmin(BaseEnquiryAdmin):
    list_display = ["name", "phone_number", "email", "title", "status_badge", "created_at"]
    list_filter = ["status", "created_at"]
    search_fields = ["name", "email", "phone_number", "title", "reason"]
    readonly_fields = ["name", "email", "phone_number", "title", "reason", "created_at"]
    date_hierarchy = "created_at"
    list_per_page = 25
    actions = [mark_in_progress, mark_resolved, mark_closed]

    fieldsets = (
        ("Enquiry From", {
            "fields": ("name", "email", "phone_number"),
        }),
        ("Details", {
            "fields": ("title", "reason", "status", "created_at"),
        }),
    )

    def status_badge(self, obj):
        return _status_badge(obj)
    status_badge.short_description = "Status"
    status_badge.admin_order_field = "status"


@admin.register(PartnerDispute)
class PartnerDisputeAdmin(BaseEnquiryAdmin):
    list_display = ["name", "phone_number", "topic_display", "equipment_id", "partner_id", "status_badge", "created_at"]
    list_filter = ["status", "topic", "created_at"]
    search_fields = ["name", "email", "phone_number", "equipment_id", "partner_id"]
    readonly_fields = [
        "name", "email", "phone_number", "equipment_id",
        "partner_id", "topic", "description", "created_at",
    ]
    date_hierarchy = "created_at"
    list_per_page = 25
    actions = [mark_in_progress, mark_resolved, mark_closed]

    fieldsets = (
        ("Dispute From", {
            "fields": ("name", "email", "phone_number"),
        }),
        ("Dispute Details", {
            "fields": ("topic", "equipment_id", "partner_id", "description", "status", "created_at"),
        }),
    )

    def topic_display(self, obj):
        return obj.get_topic_display()
    topic_display.short_description = "Topic"

    def status_badge(self, obj):
        return _status_badge(obj)
    status_badge.short_description = "Status"
    status_badge.admin_order_field = "status"


@admin.register(CancelForm)
class CancelFormAdmin(BaseEnquiryAdmin):
    list_display = ["booking_id", "user_name", "cancel_reason_display", "created_at"]
    list_filter = ["cancel_reason", "created_at"]
    search_fields = ["booking_id", "user__first_name", "user__last_name", "user__phone_number"]
    readonly_fields = ["user", "booking_id", "cancel_reason", "description", "created_at"]
    date_hierarchy = "created_at"
    list_per_page = 25
    list_select_related = ["user"]
    actions = None

    def user_name(self, obj):
        name = "{} {}".format(obj.user.first_name, obj.user.last_name).strip()
        return name or obj.user.email
    user_name.short_description = "User"

    def cancel_reason_display(self, obj):
        return obj.get_cancel_reason_display()
    cancel_reason_display.short_description = "Reason"


@admin.register(ReportEquipment)
class ReportEquipmentAdmin(BaseEnquiryAdmin):
    list_display = ["reporter_name", "equipment", "report_reason_display", "created_at"]
    list_filter = ["report_reason", "created_at"]
    search_fields = ["user__first_name", "user__last_name", "equipment__title"]
    readonly_fields = ["user", "equipment", "report_reason", "description", "created_at"]
    date_hierarchy = "created_at"
    list_per_page = 25
    list_select_related = ["user", "equipment"]
    actions = None

    def reporter_name(self, obj):
        name = "{} {}".format(obj.user.first_name, obj.user.last_name).strip()
        return name or obj.user.email
    reporter_name.short_description = "Reported By"

    def report_reason_display(self, obj):
        return obj.get_report_reason_display()
    report_reason_display.short_description = "Reason"


@admin.register(FeedbackForm)
class FeedbackFormAdmin(BaseEnquiryAdmin):
    list_display = ["name", "phone_number", "description_preview", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["name", "phone_number", "description"]
    readonly_fields = ["name", "phone_number", "description", "created_at"]
    date_hierarchy = "created_at"
    list_per_page = 25
    actions = None

    def description_preview(self, obj):
        return obj.description[:80] + "..." if len(obj.description) > 80 else obj.description
    description_preview.short_description = "Feedback"
