from django.contrib import admin
from django.utils.html import format_html
from kex.chat.models import Conversation, Message


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ["sender", "text", "is_read", "created_at"]
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ["id", "user_1", "user_2", "booking_link", "message_count", "updated_at"]
    list_filter = ["created_at"]
    search_fields = ["user_1__first_name", "user_2__first_name", "user_1__email", "user_2__email"]
    readonly_fields = ["created_at", "updated_at"]
    inlines = [MessageInline]

    def booking_link(self, obj):
        if obj.booking:
            return format_html(
                '<span style="color: #68AC5D; font-weight: bold;">{}</span>',
                obj.booking.booking_id
            )
        return format_html('<span style="color: #999;">—</span>')
    booking_link.short_description = "Booking"

    def message_count(self, obj):
        count = obj.messages.count()
        return format_html(
            '<span style="background: #68AC5D; color: white; padding: 2px 8px; border-radius: 10px;">{}</span>',
            count
        )
    message_count.short_description = "Messages"


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["sender", "text_preview", "conversation", "is_read", "created_at"]
    list_filter = ["is_read", "created_at"]
    search_fields = ["text", "sender__first_name"]
    readonly_fields = ["created_at"]

    def text_preview(self, obj):
        return obj.text[:60] + "..." if len(obj.text) > 60 else obj.text
    text_preview.short_description = "Message"
