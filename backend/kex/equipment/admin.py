from django.contrib import admin
from django.utils.html import format_html, format_html_join
from kex.equipment.models import Equipment, EquipmentRating


@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):
    list_display = [
        "eq_id",
        "title",
        "owner_name",
        "equipment_type",
        "daily_rental_display",
        "availability_badge",
        "image_preview",
        "created_at",
    ]
    list_filter = ["manufacturer", "equipment_type", "condition", "is_available"]
    search_fields = ["title", "eq_id", "owner__first_name", "owner__last_name", "description", "equipment_location"]
    list_per_page = 20
    readonly_fields = ["eq_id", "created_at", "image_preview_large"]
    ordering = ["-created_at"]
    date_hierarchy = "created_at"

    # Eager-load related objects to fix N+1 queries
    list_select_related = ["owner", "manufacturer", "equipment_type"]

    fieldsets = (
        ("Basic Information", {
            "fields": ("eq_id", "title", "owner", "manufacturer", "equipment_type", "equipment_location", "description"),
            "description": "Core details about this equipment listing.",
        }),
        ("Pricing", {
            "fields": ("daily_rental", "hourly_rental"),
            "description": "Rental rates in Indian Rupees.",
        }),
        ("Specifications", {
            "fields": ("model", "manufacturing_year", "condition", "horsepower", "width", "height", "weight"),
            "classes": ("collapse",),
            "description": "Technical specifications — click to expand.",
        }),
        ("Availability", {
            "fields": ("is_available", "available_start_time", "available_end_time", "show_phone_number"),
            "description": "When this equipment can be rented.",
        }),
        ("Photos", {
            "fields": ("image_1", "image_2", "image_3", "image_4", "image_5", "image_preview_large"),
            "description": "Upload up to 5 photos of the equipment.",
        }),
    )

    actions = ["mark_available", "mark_unavailable"]

    def get_actions(self, request):
        """Remove the default 'Delete selected' action — too dangerous."""
        actions = super().get_actions(request)
        if "delete_selected" in actions:
            del actions["delete_selected"]
        return actions

    @admin.action(description="Set as Available")
    def mark_available(self, request, queryset):
        count = queryset.update(is_available=True)
        self.message_user(request, "Marked {} equipment as available.".format(count))

    @admin.action(description="Set as Unavailable")
    def mark_unavailable(self, request, queryset):
        count = queryset.update(is_available=False)
        self.message_user(request, "Marked {} equipment as unavailable.".format(count))

    def owner_name(self, obj):
        name = "{} {}".format(obj.owner.first_name, obj.owner.last_name).strip()
        return name or obj.owner.email
    owner_name.short_description = "Owner"
    owner_name.admin_order_field = "owner__first_name"

    def daily_rental_display(self, obj):
        """Format currency — pre-format to avoid Django 3.2 format_html bug."""
        formatted = "{:,}".format(obj.daily_rental)
        return format_html('<strong>Rs. {}</strong>', formatted)
    daily_rental_display.short_description = "Daily Rate"
    daily_rental_display.admin_order_field = "daily_rental"

    def availability_badge(self, obj):
        if obj.is_available:
            return format_html(
                '<span style="background:#22c55e; color:white; padding:3px 10px; '
                'border-radius:12px; font-size:11px; font-weight:700;">Available</span>'
            )
        return format_html(
            '<span style="background:#ef4444; color:white; padding:3px 10px; '
            'border-radius:12px; font-size:11px; font-weight:700;">Unavailable</span>'
        )
    availability_badge.short_description = "Status"
    availability_badge.admin_order_field = "is_available"

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
        images = [img for img in images if img]
        if not images:
            return "No images uploaded"
        return format_html_join(
            " ",
            '<img src="{}" style="width: 120px; height: 120px; object-fit: cover; '
            'border-radius: 8px; margin-right: 10px; border: 2px solid #68AC5D;" />',
            ((img.url,) for img in images),
        )
    image_preview_large.short_description = "Image Preview"

    def has_delete_permission(self, request, obj=None):
        """Only superusers can delete equipment from admin."""
        return request.user.is_superuser


@admin.register(EquipmentRating)
class EquipmentRatingAdmin(admin.ModelAdmin):
    list_display = ["user_name", "equipment", "rating_display", "created_at"]
    list_filter = ["rating"]
    search_fields = ["user__first_name", "user__last_name", "equipment__title"]
    list_per_page = 20
    list_select_related = ["user", "equipment"]
    actions = None
    readonly_fields = ["user", "equipment", "rating"]

    def user_name(self, obj):
        name = "{} {}".format(obj.user.first_name, obj.user.last_name).strip()
        return name or obj.user.email
    user_name.short_description = "User"

    def rating_display(self, obj):
        stars = "★" * obj.rating + "☆" * (5 - obj.rating)
        return format_html('<span style="color: #f59e0b; font-size: 14px;">{}</span>', stars)
    rating_display.short_description = "Rating"

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
