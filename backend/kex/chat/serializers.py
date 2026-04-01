from rest_framework import serializers
from kex.chat.models import Conversation, Message, MESSAGE_MAX_LENGTH
from kex.users.models import User


class ChatUserSerializer(serializers.ModelSerializer):
    """Minimal user info for chat display."""
    class Meta:
        model = User
        fields = ["id", "uuid", "first_name", "last_name", "profile_picture"]


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ["id", "conversation", "sender", "sender_name", "text", "is_read", "created_at"]
        read_only_fields = ["id", "sender", "sender_name", "is_read", "created_at"]

    def get_sender_name(self, obj):
        return f"{obj.sender.first_name} {obj.sender.last_name}".strip() or obj.sender.email


class ConversationListSerializer(serializers.ModelSerializer):
    """
    Conversation list serializer.
    Uses pre-annotated _unread_count when available (from ConversationListView),
    falls back to per-object query for single-conversation responses.
    """
    other_user = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    booking_id = serializers.SerializerMethodField()
    equipment_title = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id", "other_user", "last_message", "unread_count",
            "booking_id", "equipment_title", "updated_at", "created_at",
        ]

    def get_other_user(self, obj):
        request = self.context.get("request")
        if request:
            other = obj.other_user(request.user)
            return ChatUserSerializer(other).data
        return None

    def get_last_message(self, obj):
        msg = obj.last_message()
        if msg:
            return {
                "text": msg.text[:80],
                "sender_id": msg.sender_id,
                "created_at": msg.created_at.isoformat(),
                "is_read": msg.is_read,
            }
        return None

    def get_unread_count(self, obj):
        # Use pre-annotated value if available (from ConversationListView)
        if hasattr(obj, "_unread_count"):
            return obj._unread_count
        # Fallback for single conversation responses
        request = self.context.get("request")
        if request:
            return obj.unread_count(request.user)
        return 0

    def get_booking_id(self, obj):
        return obj.booking.booking_id if obj.booking else None

    def get_equipment_title(self, obj):
        try:
            return obj.booking.equipment.title if obj.booking else None
        except AttributeError:
            return None


class StartConversationSerializer(serializers.Serializer):
    """
    Serializer for starting/finding a conversation.

    C1: equipment_id is optional — used when starting chat from equipment page.
    """
    user_id = serializers.IntegerField(help_text="ID of the other user to chat with")
    booking_id = serializers.IntegerField(
        required=False, help_text="Optional booking ID for context"
    )
    equipment_id = serializers.IntegerField(
        required=False, help_text="Equipment ID when starting chat from equipment page"
    )
