import json
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.db.models import Q


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time chat.
    URL: ws://host/ws/chat/<conversation_id>/
    """

    async def connect(self):
        self.conversation_id = self.scope["url_route"]["kwargs"]["conversation_id"]
        self.room_group_name = f"chat_{self.conversation_id}"
        self.user = self.scope.get("user")

        # Reject anonymous users
        if not self.user or self.user.is_anonymous:
            await self.close()
            return

        # Verify user is a participant in this conversation
        is_participant = await self.check_participant()
        if not is_participant:
            await self.close()
            return

        # Join the conversation group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name,
        )
        await self.accept()

    async def disconnect(self, close_code):
        # Leave the conversation group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name,
        )

    async def receive(self, text_data):
        """Handle incoming WebSocket message — save to DB and broadcast."""
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        text = data.get("text", "").strip()
        if not text:
            return

        # Save message to database
        message_data = await self.save_message(text)

        # Broadcast to the conversation group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "message": message_data,
            },
        )

    async def chat_message(self, event):
        """Send message to WebSocket client."""
        await self.send(text_data=json.dumps({
            "type": "new_message",
            "message": event["message"],
        }))

    @database_sync_to_async
    def check_participant(self):
        """Verify the user is part of this conversation."""
        from kex.chat.models import Conversation
        return Conversation.objects.filter(
            Q(id=self.conversation_id),
            Q(user_1=self.user) | Q(user_2=self.user),
        ).exists()

    @database_sync_to_async
    def save_message(self, text):
        """Save a message to the database and return serialized data."""
        from kex.chat.models import Conversation, Message
        conversation = Conversation.objects.get(id=self.conversation_id)
        message = Message.objects.create(
            conversation=conversation,
            sender=self.user,
            text=text,
        )
        # Update conversation timestamp
        conversation.save()

        return {
            "id": message.id,
            "conversation": conversation.id,
            "sender": self.user.id,
            "sender_name": f"{self.user.first_name} {self.user.last_name}".strip() or self.user.email,
            "text": message.text,
            "is_read": message.is_read,
            "created_at": message.created_at.isoformat(),
        }
