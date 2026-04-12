from django.contrib import admin
from django.db.models import Count
from django.utils.html import format_html
from kex.chat.models import Conversation, Message


class MessageInline(admin.TabularInline):
    """Show recent messages inside a conversation (read-only)."""
    model = Message
    extra = 0
    max_num = 20
    readonly_fields = ["sender", "text", "is_read", "created_at"]
    fields = ["sender", "text", "is_read", "created_at"]
    ordering = ["-created_at"]
    show_change_link = False

    def has_add_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = [
        "id", "user_1_name", "user_2_name", "booking_link",
        "message_count", "created_at",
    ]
    list_filter = ["created_at"]
    search_fields = [
        "user_1__first_name", "user_1__last_name",
        "user_2__first_name", "user_2__last_name",
        "booking__booking_id",
    ]
    list_select_related = ["user_1", "user_2", "booking"]
    list_per_page = 25
    inlines = [MessageInline]
    actions = None

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.annotate(_message_count=Count("messages"))

    def user_1_name(self, obj):
        name = "{} {}".format(obj.user_1.first_name, obj.user_1.last_name).strip()
        return name or obj.user_1.email
    user_1_name.short_description = "User 1"

    def user_2_name(self, obj):
        name = "{} {}".format(obj.user_2.first_name, obj.user_2.last_name).strip()
        return name or obj.user_2.email
    user_2_name.short_description = "User 2"

    def message_count(self, obj):
        count = obj._message_count
        return format_html(
            '<span style="background:#68AC5D; color:white; padding:2px 8px; '
            'border-radius:10px; font-size:12px; font-weight:600;">{}</span>',
            count,
        )
    message_count.short_description = "Messages"
    message_count.admin_order_field = "_message_count"

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

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["sender_name", "conversation_display", "text_preview", "is_read_badge", "created_at"]
    list_filter = ["is_read", "created_at"]
    search_fields = ["sender__first_name", "sender__last_name", "text"]
    list_select_related = ["sender", "conversation"]
    list_per_page = 25
    actions = None
    readonly_fields = ["sender", "conversation", "text", "is_read", "created_at"]

    def sender_name(self, obj):
        name = "{} {}".format(obj.sender.first_name, obj.sender.last_name).strip()
        return name or obj.sender.email
    sender_name.short_description = "From"

    def text_preview(self, obj):
        return obj.text[:60] + "..." if len(obj.text) > 60 else obj.text
    text_preview.short_description = "Message"

    def conversation_display(self, obj):
        return "Chat #{}".format(obj.conversation.id)
    conversation_display.short_description = "Conversation"

    def is_read_badge(self, obj):
        if obj.is_read:
            return format_html('<span style="color:#22c55e; font-weight:600;">Read</span>')
        return format_html('<span style="color:#ef4444; font-weight:600;">Unread</span>')
    is_read_badge.short_description = "Status"

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
