from django.contrib import admin
from django.utils.html import format_html
from kex.equipment.models import Equipment, EquipmentRating


@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):
    list_display = [
        "eq_id",
        "title",
        "owner",
        "manufacturer",
        "equipment_type",
        "condition",
        "daily_rental_display",
        "is_available",
        "image_preview",
        "created_at",
    ]
    list_filter = ["manufacturer", "equipment_type", "condition", "is_available", "created_at"]
    search_fields = ["title", "eq_id", "owner__username", "owner__first_name", "description", "equipment_location"]
    list_editable = ["is_available"]
    list_per_page = 20
    readonly_fields = ["eq_id", "created_at", "image_preview_large"]
    ordering = ["-created_at"]
    date_hierarchy = "created_at"

    # ── Fix N+1: eager-load related objects ──
    list_select_related = ["owner", "manufacturer", "equipment_type"]

    fieldsets = (
        ("Basic Information", {
            "fields": ("eq_id", "title", "owner", "manufacturer", "equipment_type", "equipment_location", "description"),
        }),
        ("Pricing", {
            "fields": ("daily_rental", "hourly_rental"),
        }),
        ("Specifications", {
            "fields": ("model", "manufacturing_year", "condition", "horsepower", "width", "height", "weight"),
        }),
        ("Availability", {
            "fields": ("is_available", "available_start_time", "available_end_time", "show_phone_number"),
        }),
        ("Images", {
            "fields": ("image_1", "image_2", "image_3", "image_4", "image_5", "image_preview_large"),
        }),
        ("Metadata", {
            "fields": ("created_at",),
            "classes": ("collapse",),
        }),
    )

    # ── Bulk Actions ──
    actions = ["mark_available", "mark_unavailable"]

    @admin.action(description="Mark selected equipment as available")
    def mark_available(self, request, queryset):
        count = queryset.update(is_available=True)
        self.message_user(request, f"Marked {count} equipment as available.")

    @admin.action(description="Mark selected equipment as unavailable")
    def mark_unavailable(self, request, queryset):
        count = queryset.update(is_available=False)
        self.message_user(request, f"Marked {count} equipment as unavailable.")

    def daily_rental_display(self, obj):
        return format_html('<strong>₹{:,}</strong>', obj.daily_rental)
    daily_rental_display.short_description = "Daily Rate"

    def image_preview(self, obj):
        if obj.image_1:
            return format_html(
                '<img src="{}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;" />',
                obj.image_1.url
            )
        return format_html('<span style="color: #999;">No image</span>')
    image_preview.short_description = "Photo"

    def image_preview_large(self, obj):
        images = [obj.image_1, obj.image_2, obj.image_3, obj.image_4, obj.image_5]
        html = ""
        for img in images:
            if img:
                html += format_html(
                    '<img src="{}" style="width: 120px; height: 120px; object-fit: cover; '
                    'border-radius: 8px; margin-right: 10px; border: 2px solid #68AC5D;" />',
                    img.url
                )
        return format_html(html) if html else "No images uploaded"
    image_preview_large.short_description = "Image Preview"


@admin.register(EquipmentRating)
class EquipmentRatingAdmin(admin.ModelAdmin):
    list_display = ["user", "equipment", "rating_display", "rating"]
    list_filter = ["rating"]
    search_fields = ["user__username", "user__first_name", "equipment__title"]
    list_per_page = 20
    list_select_related = ["user", "equipment"]

    def rating_display(self, obj):
        stars = "★" * obj.rating + "☆" * (5 - obj.rating)
        return format_html('<span style="color: #f59e0b; font-size: 14px;">{}</span>', stars)
    rating_display.short_description = "Rating"
