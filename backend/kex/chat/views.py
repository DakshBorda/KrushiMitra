from django.db.models import Q
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from kex.booking.models import Booking
from kex.chat.models import Conversation, Message
from kex.chat.serializers import (
    ConversationListSerializer,
    MessageSerializer,
    StartConversationSerializer,
)
from kex.users.models import User


class ConversationListView(ListAPIView):
    """List all conversations for the current user, sorted by most recent activity."""
    serializer_class = ConversationListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(
            Q(user_1=self.request.user) | Q(user_2=self.request.user)
        ).select_related("user_1", "user_2", "booking", "booking__equipment")


class StartConversationView(APIView):
    """Start a new conversation or return existing one between current user and target user."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = StartConversationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        other_user_id = serializer.validated_data["user_id"]
        booking_id = serializer.validated_data.get("booking_id")

        # Prevent chatting with yourself
        if other_user_id == request.user.id:
            return Response(
                {"error": "Cannot start a conversation with yourself."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate other user exists
        try:
            other_user = User.objects.get(id=other_user_id)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check for existing conversation between these two users
        existing = Conversation.objects.filter(
            (Q(user_1=request.user, user_2=other_user) |
             Q(user_1=other_user, user_2=request.user))
        ).first()

        if existing:
            data = ConversationListSerializer(existing, context={"request": request}).data
            return Response(data, status=status.HTTP_200_OK)

        # Create new conversation
        booking = None
        if booking_id:
            try:
                booking = Booking.objects.get(id=booking_id)
            except Booking.DoesNotExist:
                pass

        conversation = Conversation.objects.create(
            user_1=request.user,
            user_2=other_user,
            booking=booking,
        )

        data = ConversationListSerializer(conversation, context={"request": request}).data
        return Response(data, status=status.HTTP_201_CREATED)


class MessageListView(APIView):
    """Get all messages in a conversation and mark them as read."""
    permission_classes = [IsAuthenticated]

    def get(self, request, conversation_id):
        try:
            conversation = Conversation.objects.get(
                Q(id=conversation_id),
                Q(user_1=request.user) | Q(user_2=request.user),
            )
        except Conversation.DoesNotExist:
            return Response(
                {"error": "Conversation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        messages = conversation.messages.select_related("sender").all()

        # Mark all messages from the other user as read
        messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)

        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)


class SendMessageView(APIView):
    """Send a new message in a conversation."""
    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_id):
        try:
            conversation = Conversation.objects.get(
                Q(id=conversation_id),
                Q(user_1=request.user) | Q(user_2=request.user),
            )
        except Conversation.DoesNotExist:
            return Response(
                {"error": "Conversation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        text = request.data.get("text", "").strip()
        if not text:
            return Response(
                {"error": "Message text cannot be empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            text=text,
        )

        # Update conversation timestamp
        conversation.save()  # triggers auto_now on updated_at

        serializer = MessageSerializer(message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MarkReadView(APIView):
    """Mark all messages in a conversation as read for the current user."""
    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_id):
        try:
            conversation = Conversation.objects.get(
                Q(id=conversation_id),
                Q(user_1=request.user) | Q(user_2=request.user),
            )
        except Conversation.DoesNotExist:
            return Response(
                {"error": "Conversation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        updated = conversation.messages.filter(
            is_read=False
        ).exclude(sender=request.user).update(is_read=True)

        return Response({"marked_read": updated})
