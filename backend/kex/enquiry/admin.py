from django.contrib import admin
from kex.enquiry.models import HelpCentre, FeedbackForm, PartnerDispute, CancelForm, ReportEquipment


@admin.register(HelpCentre)
class HelpCentreAdmin(admin.ModelAdmin):
    list_display = ["name", "phone_number", "email"]
    search_fields = ["name", "phone_number", "email"]
    list_per_page = 20


@admin.register(PartnerDispute)
class PartnerDisputeAdmin(admin.ModelAdmin):
    list_display = ["name", "phone_number", "equipment_id", "partner_id"]
    search_fields = ["name", "phone_number"]
    list_per_page = 20


@admin.register(CancelForm)
class CancelFormAdmin(admin.ModelAdmin):
    list_display = ["user", "booking_id", "cancel_reason"]
    search_fields = ["user__username", "booking_id"]
    list_filter = ["cancel_reason"]
    list_per_page = 20


@admin.register(ReportEquipment)
class ReportEquipmentAdmin(admin.ModelAdmin):
    list_display = ["user", "equipment", "report_reason"]
    search_fields = ["user__username", "equipment__title"]
    list_filter = ["report_reason"]
    list_per_page = 20


@admin.register(FeedbackForm)
class FeedbackFormAdmin(admin.ModelAdmin):
    list_display = ["name", "phone_number", "description"]
    search_fields = ["name", "phone_number"]
    list_per_page = 20
