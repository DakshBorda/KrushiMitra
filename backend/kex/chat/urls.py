from django.urls import path
from kex.chat.views import (
    ConversationListView,
    StartConversationView,
    MessageListView,
    SendMessageView,
    MarkReadView,
    UnreadChatCountView,
)

app_name = "chat"

urlpatterns = [
    path("conversations/", ConversationListView.as_view(), name="conversation-list"),
    path("conversations/start/", StartConversationView.as_view(), name="conversation-start"),
    path("conversations/<int:conversation_id>/messages/", MessageListView.as_view(), name="message-list"),
    path("conversations/<int:conversation_id>/messages/send/", SendMessageView.as_view(), name="message-send"),
    path("conversations/<int:conversation_id>/read/", MarkReadView.as_view(), name="mark-read"),
    path("unread-count/", UnreadChatCountView.as_view(), name="chat-unread-count"),
]
