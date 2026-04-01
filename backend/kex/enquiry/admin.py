from django.contrib import admin
from django.utils.html import format_html
from kex.enquiry.models import HelpCentre, FeedbackForm, PartnerDispute, CancelForm, ReportEquipment


@admin.register(HelpCentre)
class HelpCentreAdmin(admin.ModelAdmin):
    list_display = ["name", "email", "phone_number", "title", "reason_preview", "created_display"]
    search_fields = ["name", "phone_number", "email", "title"]
    list_per_page = 20
    readonly_fields = ["name", "email", "phone_number", "title", "reason"]

    def reason_preview(self, obj):
        text = obj.reason or ""
        return text[:80] + "..." if len(text) > 80 else text
    reason_preview.short_description = "Enquiry Reason"

    def created_display(self, obj):
        return format_html('<span style="color: #6b7280;">#{}</span>', obj.pk)
    created_display.short_description = "ID"


@admin.register(PartnerDispute)
class PartnerDisputeAdmin(admin.ModelAdmin):
    list_display = ["name", "phone_number", "equipment_id", "partner_id", "topic_display", "description_preview"]
    search_fields = ["name", "phone_number", "equipment_id", "partner_id"]
    list_filter = ["topic"]
    list_per_page = 20
    readonly_fields = ["name", "email", "phone_number", "equipment_id", "partner_id"]

    def topic_display(self, obj):
        return obj.get_topic_display()
    topic_display.short_description = "Topic"

    def description_preview(self, obj):
        text = obj.description or ""
        return text[:80] + "..." if len(text) > 80 else text
    description_preview.short_description = "Description"


@admin.register(CancelForm)
class CancelFormAdmin(admin.ModelAdmin):
    list_display = ["user", "booking_id", "cancel_reason_display", "description_preview"]
    search_fields = ["user__username", "user__first_name", "booking_id"]
    list_filter = ["cancel_reason"]
    list_per_page = 20
    readonly_fields = ["user", "booking_id"]

    def cancel_reason_display(self, obj):
        return obj.get_cancel_reason_display()
    cancel_reason_display.short_description = "Reason"

    def description_preview(self, obj):
        text = obj.description or ""
        return text[:80] + "..." if len(text) > 80 else text
    description_preview.short_description = "Description"


@admin.register(ReportEquipment)
class ReportEquipmentAdmin(admin.ModelAdmin):
    list_display = ["user", "equipment", "report_reason_display", "description_preview"]
    search_fields = ["user__username", "user__first_name", "equipment__title"]
    list_filter = ["report_reason"]
    list_per_page = 20
    readonly_fields = ["user", "equipment"]

    def report_reason_display(self, obj):
        return obj.get_report_reason_display()
    report_reason_display.short_description = "Reason"

    def description_preview(self, obj):
        text = obj.description or ""
        return text[:80] + "..." if len(text) > 80 else text
    description_preview.short_description = "Description"


@admin.register(FeedbackForm)
class FeedbackFormAdmin(admin.ModelAdmin):
    list_display = ["name", "phone_number", "description_preview"]
    search_fields = ["name", "phone_number"]
    list_per_page = 20
    readonly_fields = ["name", "phone_number"]

    def description_preview(self, obj):
        text = obj.description or ""
        return text[:100] + "..." if len(text) > 100 else text
    description_preview.short_description = "Feedback"
