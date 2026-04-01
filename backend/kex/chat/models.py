from django.db import models
from django.db.models import Q, F
from kex.users.models import User
from kex.booking.models import Booking


class Conversation(models.Model):
    """
    A chat conversation between two users.
    Optionally linked to a specific booking for context.

    Business Rules:
        C2: user_1 != user_2 (enforced by CheckConstraint)
        C3: Only one conversation per user pair (UniqueConstraint)
            save() normalises order — lower PK always goes in user_1
        C9: Conversations are never deleted (no delete endpoint)
    """

    user_1 = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="conversations_as_user1"
    )
    user_2 = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="conversations_as_user2"
    )
    booking = models.ForeignKey(
        Booking, on_delete=models.SET_NULL, null=True, blank=True, related_name="conversations"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            # C2: Prevent self-conversations at DB level
            models.CheckConstraint(
                check=~Q(user_1=F("user_2")),
                name="chat_no_self_conversation",
            ),
            # C3: Only one conversation per user pair
            models.UniqueConstraint(
                fields=["user_1", "user_2"],
                name="chat_unique_conversation_pair",
            ),
        ]
        indexes = [
            models.Index(fields=["user_1", "-updated_at"]),
            models.Index(fields=["user_2", "-updated_at"]),
        ]

    def save(self, *args, **kwargs):
        """
        Normalise user order so the lower PK is always user_1.
        This ensures the UniqueConstraint works regardless of who starts the chat.
        """
        if self.user_1_id and self.user_2_id and self.user_1_id > self.user_2_id:
            self.user_1_id, self.user_2_id = self.user_2_id, self.user_1_id
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Chat: {self.user_1.first_name} ↔ {self.user_2.first_name}"

    def other_user(self, current_user):
        """Return the other participant in the conversation."""
        return self.user_2 if self.user_1 == current_user else self.user_1

    def last_message(self):
        """Return the most recent message in this conversation."""
        return self.messages.order_by("-created_at").first()

    def unread_count(self, user):
        """Count unread messages for a given user."""
        return self.messages.filter(is_read=False).exclude(sender=user).count()


# ── Constants ──
MESSAGE_MAX_LENGTH = 2000


class Message(models.Model):
    """
    A single message within a conversation.

    Business Rules:
        C4: max 2000 characters
        C5: text cannot be empty (enforced in view)
        C8: Messages cannot be edited or deleted by users
    """

    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="messages"
    )
    sender = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="sent_messages"
    )
    text = models.TextField(max_length=MESSAGE_MAX_LENGTH)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["conversation", "-created_at"]),
            models.Index(fields=["conversation", "is_read"]),
        ]

    def __str__(self):
        preview = self.text[:40] + "..." if len(self.text) > 40 else self.text
        return f"{self.sender.first_name}: {preview}"
