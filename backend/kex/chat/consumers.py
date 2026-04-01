import json
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.db.models import Q


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time chat — RECEIVE ONLY.
    Messages are sent via REST API, which broadcasts to this consumer's group.
    This consumer does NOT accept incoming messages from the client.
    URL: ws://host/ws/chat/<conversation_id>/?token=<jwt>
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
        # Only leave group if we successfully joined one
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name,
            )

    async def receive(self, text_data):
        """Ignore client-sent messages — all sending goes through REST API."""
        pass

    async def chat_message(self, event):
        """Receive broadcast from channel layer and forward to WebSocket client."""
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
