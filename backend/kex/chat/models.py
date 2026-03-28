from django.db import models
from kex.users.models import User
from kex.booking.models import Booking


class Conversation(models.Model):
    """
    A chat conversation between two users.
    Optionally linked to a specific booking for context.
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


class Message(models.Model):
    """A single message within a conversation."""
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="messages"
    )
    sender = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="sent_messages"
    )
    text = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        preview = self.text[:40] + "..." if len(self.text) > 40 else self.text
        return f"{self.sender.first_name}: {preview}"
