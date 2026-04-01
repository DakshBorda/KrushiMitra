from django.contrib import admin
from django.contrib.auth import admin as auth_admin
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from django.utils.html import format_html
from django.db.models import Count
import csv
from django.http import HttpResponse

from kex.users.forms import UserAdminChangeForm, UserAdminCreationForm

User = get_user_model()


@admin.register(User)
class UserAdmin(auth_admin.UserAdmin):

    form = UserAdminChangeForm
    add_form = UserAdminCreationForm
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "profile_picture",
                    "username",
                    "password",
                    "is_verified",
                )
            },
        ),
        (
            _("Personal info"),
            {"fields": ("first_name", "last_name", "email", "phone_number")},
        ),
        (
            _("Secondary info"),
            {
                "fields": (
                    "secondary_phone_number",
                    "address",
                    "city",
                    "state",
                    "pin_code",
                )
            },
        ),
        (
            _("Permissions"),
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
            },
        ),
        (_("Important dates"), {"fields": ("last_login", "date_joined")}),
    )
    list_display = [
        "email",
        "first_name",
        "last_name",
        "phone_number",
        "is_verified",
        "is_active",
        "equipment_count",
        "booking_count",
        "date_joined",
    ]
    list_filter = ["is_verified", "is_active", "is_staff", "is_superuser", "date_joined"]
    search_fields = ["first_name", "last_name", "email", "phone_number", "user_id"]
    list_per_page = 25
    date_hierarchy = "date_joined"
    ordering = ["-date_joined"]

    def get_queryset(self, request):
        """Annotate equipment and booking counts to avoid N+1 queries."""
        qs = super().get_queryset(request)
        qs = qs.annotate(
            _equipment_count=Count("equipment", distinct=True),
            _booking_count=Count("bookings_as_customer", distinct=True),
        )
        return qs

    def equipment_count(self, obj):
        count = obj._equipment_count
        if count > 0:
            return format_html(
                '<span style="background:#68AC5D; color:white; padding:2px 8px; '
                'border-radius:10px; font-size:12px; font-weight:600;">{}</span>',
                count,
            )
        return format_html('<span style="color:#999;">0</span>')
    equipment_count.short_description = "Equipment"
    equipment_count.admin_order_field = "_equipment_count"

    def booking_count(self, obj):
        count = obj._booking_count
        if count > 0:
            return format_html(
                '<span style="background:#3b82f6; color:white; padding:2px 8px; '
                'border-radius:10px; font-size:12px; font-weight:600;">{}</span>',
                count,
            )
        return format_html('<span style="color:#999;">0</span>')
    booking_count.short_description = "Bookings"
    booking_count.admin_order_field = "_booking_count"

    # ── Bulk Actions ──
    actions = ["deactivate_users", "activate_users", "verify_users", "export_users_csv"]

    @admin.action(description="Deactivate selected users")
    def deactivate_users(self, request, queryset):
        # Safety: never deactivate superusers
        count = queryset.exclude(is_superuser=True).update(is_active=False)
        self.message_user(request, f"Deactivated {count} user(s). Superusers were skipped.")

    @admin.action(description="Activate selected users")
    def activate_users(self, request, queryset):
        count = queryset.update(is_active=True)
        self.message_user(request, f"Activated {count} user(s).")

    @admin.action(description="Mark selected users as verified")
    def verify_users(self, request, queryset):
        count = queryset.update(is_verified=True)
        self.message_user(request, f"Verified {count} user(s).")

    @admin.action(description="Export selected users to CSV")
    def export_users_csv(self, request, queryset):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="krushimitra_users.csv"'
        writer = csv.writer(response)
        writer.writerow(["Email", "First Name", "Last Name", "Phone", "Verified", "Active", "Joined"])
        for user in queryset:
            writer.writerow([
                user.email, user.first_name, user.last_name,
                user.phone_number, user.is_verified, user.is_active,
                user.date_joined.strftime("%Y-%m-%d"),
            ])
        return response
