from django.contrib import admin
from django.contrib.auth import admin as auth_admin
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from django.utils.html import format_html
from django.db.models import Count
import csv
from django.http import HttpResponse

from kex.users.forms import UserAdminChangeForm, UserAdminCreationForm
from kex.users.models import PasswordResetOTP

User = get_user_model()


@admin.register(User)
class UserAdmin(auth_admin.UserAdmin):

    form = UserAdminChangeForm
    add_form = UserAdminCreationForm
    fieldsets = (
        (
            _("Profile"),
            {
                "fields": (
                    "profile_picture",
                    "email",
                    "first_name",
                    "last_name",
                    "phone_number",
                    "is_verified",
                ),
                "description": "Basic profile information for this user.",
            },
        ),
        (
            _("Address"),
            {
                "fields": (
                    "secondary_phone_number",
                    "address",
                    "city",
                    "state",
                    "pin_code",
                ),
            },
        ),
        (
            _("Account Security"),
            {
                "fields": (
                    "password",
                ),
                "classes": ("collapse",),
                "description": "Click to change password. Current password is securely encrypted and cannot be viewed.",
            },
        ),
        (
            _("Admin Access"),
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                ),
                "classes": ("collapse",),
                "description": "Control what this user can access. Only modify if you know what you are doing.",
            },
        ),
        (_("Important Dates"), {
            "fields": ("last_login", "date_joined"),
            "classes": ("collapse",),
        }),
    )

    # Fields shown when ADDING a new user (simplified)
    add_fieldsets = (
        (
            _("New User"),
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2", "first_name", "last_name"),
                "description": "Create a new user account. They can update their profile later.",
            },
        ),
    )

    list_display = [
        "email",
        "first_name",
        "last_name",
        "phone_number",
        "role_badge",
        "is_verified_badge",
        "is_active_badge",
        "equipment_count",
        "booking_count",
        "date_joined",
    ]
    list_filter = ["is_verified", "is_active", "is_staff", "date_joined"]
    search_fields = ["first_name", "last_name", "email", "phone_number"]
    list_per_page = 25
    date_hierarchy = "date_joined"
    ordering = ["-date_joined"]

    # Hide the username field from the change form entirely
    exclude = ("username",)

    def get_queryset(self, request):
        """Annotate equipment and booking counts to avoid N+1 queries."""
        qs = super().get_queryset(request)
        qs = qs.annotate(
            _equipment_count=Count("equipment", distinct=True),
            _booking_count=Count("bookings_as_customer", distinct=True),
        )
        return qs

    def get_actions(self, request):
        """Remove the default 'Delete selected' action — too dangerous for users."""
        actions = super().get_actions(request)
        if "delete_selected" in actions:
            del actions["delete_selected"]
        return actions

    def role_badge(self, obj):
        """Show whether the user is an Admin or a regular User."""
        if obj.is_superuser:
            return format_html(
                '<span style="background:#dc2626; color:white; padding:3px 10px; '
                'border-radius:12px; font-size:11px; font-weight:700;">Super Admin</span>'
            )
        if obj.is_staff:
            return format_html(
                '<span style="background:#f59e0b; color:white; padding:3px 10px; '
                'border-radius:12px; font-size:11px; font-weight:700;">Staff</span>'
            )
        return format_html(
            '<span style="background:#3b82f6; color:white; padding:3px 10px; '
            'border-radius:12px; font-size:11px; font-weight:700;">User</span>'
        )
    role_badge.short_description = "Role"
    role_badge.admin_order_field = "is_staff"

    def is_verified_badge(self, obj):
        if obj.is_verified:
            return format_html(
                '<span style="color:#22c55e; font-weight:600;">Verified</span>'
            )
        return format_html(
            '<span style="color:#ef4444; font-weight:600;">Unverified</span>'
        )
    is_verified_badge.short_description = "Verified"
    is_verified_badge.admin_order_field = "is_verified"

    def is_active_badge(self, obj):
        if obj.is_active:
            return format_html(
                '<span style="color:#22c55e; font-weight:600;">Active</span>'
            )
        return format_html(
            '<span style="color:#ef4444; font-weight:600;">Blocked</span>'
        )
    is_active_badge.short_description = "Status"
    is_active_badge.admin_order_field = "is_active"

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

    # Bulk Actions — clean text, no emojis
    actions = ["deactivate_users", "activate_users", "verify_users", "export_users_csv"]

    @admin.action(description="Block selected users")
    def deactivate_users(self, request, queryset):
        count = queryset.exclude(is_superuser=True).update(is_active=False)
        self.message_user(request, "Blocked {} user(s). Superusers were skipped.".format(count))

    @admin.action(description="Activate selected users")
    def activate_users(self, request, queryset):
        count = queryset.update(is_active=True)
        self.message_user(request, "Activated {} user(s).".format(count))

    @admin.action(description="Mark selected as Verified")
    def verify_users(self, request, queryset):
        count = queryset.update(is_verified=True)
        self.message_user(request, "Verified {} user(s).".format(count))

    @admin.action(description="Download selected as CSV")
    def export_users_csv(self, request, queryset):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="krushimitra_users.csv"'
        writer = csv.writer(response)
        writer.writerow(["Email", "First Name", "Last Name", "Phone", "Role", "Verified", "Active", "Joined"])
        for user in queryset:
            role = "Super Admin" if user.is_superuser else ("Staff" if user.is_staff else "User")
            writer.writerow([
                user.email, user.first_name, user.last_name,
                user.phone_number, role, user.is_verified, user.is_active,
                user.date_joined.strftime("%Y-%m-%d"),
            ])
        return response

    def has_delete_permission(self, request, obj=None):
        """Only superusers can delete users."""
        return request.user.is_superuser


# PasswordResetOTP is hidden from sidebar via hide_models
@admin.register(PasswordResetOTP)
class PasswordResetOTPAdmin(admin.ModelAdmin):
    list_display = ["user", "otp", "is_used", "attempts", "created_at", "expires_at"]
    list_filter = ["is_used", "created_at"]
    search_fields = ["user__email", "user__first_name"]
    readonly_fields = ["user", "otp", "created_at", "expires_at"]
    list_per_page = 30
    ordering = ["-created_at"]
    actions = None
