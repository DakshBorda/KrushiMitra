from rest_framework import serializers
from kex.chat.models import Conversation, Message
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
        request = self.context.get("request")
        if request:
            return obj.unread_count(request.user)
        return 0

    def get_booking_id(self, obj):
        return obj.booking.booking_id if obj.booking else None

    def get_equipment_title(self, obj):
        return obj.booking.equipment.title if obj.booking else None


class StartConversationSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(help_text="ID of the other user to chat with")
    booking_id = serializers.IntegerField(required=False, help_text="Optional booking ID for context")
