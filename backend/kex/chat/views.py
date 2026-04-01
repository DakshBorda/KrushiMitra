from django.db.models import Q, Count, Subquery, OuterRef, Max
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from kex.booking.models import Booking
from kex.chat.models import Conversation, Message, MESSAGE_MAX_LENGTH
from kex.chat.serializers import (
    ConversationListSerializer,
    MessageSerializer,
    StartConversationSerializer,
)
from kex.users.models import User


class ConversationListView(ListAPIView):
    """
    List all conversations for the current user, sorted by most recent activity.

    Optimised: uses annotate() to load unread_count and last_message_time
    in a single query (fixes N+1 bug).
    """
    serializer_class = ConversationListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return (
            Conversation.objects.filter(
                Q(user_1=user) | Q(user_2=user)
            )
            .select_related("user_1", "user_2", "booking", "booking__equipment")
            .prefetch_related("messages")
            .annotate(
                # Pre-compute unread count for current user
                _unread_count=Count(
                    "messages",
                    filter=Q(messages__is_read=False) & ~Q(messages__sender=user),
                ),
                # Pre-compute latest message timestamp for ordering
                _last_message_time=Max("messages__created_at"),
            )
            .order_by("-updated_at")
        )


class StartConversationView(APIView):
    """
    Start a new conversation or return existing one.

    Business Rules:
        C1 (Strict Access): User can only chat if:
            (a) They navigate from the other user's equipment page (equipment_id provided)
            (b) They have a booking relationship with the other user
        C2: Cannot chat with yourself
        C3: Only one conversation per user pair (normalized order + get_or_create)
        C10: Cannot chat on own equipment
        C12: Booking context updates to the most recent one
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from kex.equipment.models import Equipment

        serializer = StartConversationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        other_user_id = serializer.validated_data["user_id"]
        booking_id = serializer.validated_data.get("booking_id")
        equipment_id = serializer.validated_data.get("equipment_id")

        # ── C2: Prevent chatting with yourself ──
        if other_user_id == request.user.id:
            return Response(
                {"error": "Cannot start a conversation with yourself."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Validate other user exists ──
        try:
            other_user = User.objects.get(id=other_user_id)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # ── C1 (Strict Access): Check direct relationship ──
        has_access = False

        # Path (a): Navigating from equipment page
        if equipment_id:
            equipment_exists = Equipment.objects.filter(
                id=equipment_id,
                owner_id=other_user_id,
            ).exists()
            if equipment_exists:
                # C10: Ensure it's not the user's own equipment
                is_own = Equipment.objects.filter(
                    id=equipment_id,
                    owner=request.user,
                ).exists()
                if is_own:
                    return Response(
                        {"error": "You cannot chat on your own equipment listing."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                has_access = True

        # Path (b): Existing booking relationship
        if not has_access:
            has_booking_relation = Booking.objects.filter(
                Q(customer=request.user, equipment__owner_id=other_user_id) |
                Q(customer_id=other_user_id, equipment__owner=request.user)
            ).exists()
            if has_booking_relation:
                has_access = True

        if not has_access:
            return Response(
                {
                    "error": (
                        "You can only chat with users you have a booking relationship with, "
                        "or via an equipment listing page."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # ── C3: Normalise user order for lookup (lower PK = user_1) ──
        u1_id = min(request.user.id, other_user_id)
        u2_id = max(request.user.id, other_user_id)

        existing = Conversation.objects.filter(
            user_1_id=u1_id, user_2_id=u2_id
        ).first()

        if existing:
            # ── C12: Update booking context if a newer booking is provided ──
            if booking_id:
                try:
                    new_booking = Booking.objects.get(id=booking_id)
                    if existing.booking_id != new_booking.id:
                        existing.booking = new_booking
                        existing.save(update_fields=["booking", "updated_at"])
                except Booking.DoesNotExist:
                    pass

            data = ConversationListSerializer(
                existing, context={"request": request}
            ).data
            return Response(data, status=status.HTTP_200_OK)

        # ── Create new conversation ──
        booking = None
        if booking_id:
            try:
                booking = Booking.objects.get(id=booking_id)
            except Booking.DoesNotExist:
                pass

        conversation = Conversation.objects.create(
            user_1_id=u1_id,
            user_2_id=u2_id,
            booking=booking,
        )

        data = ConversationListSerializer(
            conversation, context={"request": request}
        ).data
        return Response(data, status=status.HTTP_201_CREATED)


class MessageListView(APIView):
    """
    Get messages in a conversation (paginated) and mark them as read.

    Business Rules:
        C6: Only participants can view messages
        C7: Auto mark-read on open

    Query params:
        ?before=<message_id>  — load messages older than this ID (pagination)
        ?limit=50             — number of messages to return (default 50)
    """
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

        messages_qs = conversation.messages.select_related("sender")

        # ── Pagination: load older messages before a given message ID ──
        before_id = request.query_params.get("before")
        if before_id:
            try:
                before_id = int(before_id)
                messages_qs = messages_qs.filter(id__lt=before_id)
            except (ValueError, TypeError):
                pass

        limit = min(int(request.query_params.get("limit", 50)), 100)

        # Get newest N messages (reversed for chronological display)
        messages = list(messages_qs.order_by("-created_at")[:limit])
        messages.reverse()  # Return in chronological order

        has_more = messages_qs.order_by("-created_at")[limit:limit + 1].exists() if not before_id else (
            messages_qs.count() > limit
        )

        serializer = MessageSerializer(messages, many=True)
        response_data = {
            "messages": serializer.data,
            "has_more": has_more,
        }

        # ── C7: Auto mark-read ──
        conversation.messages.filter(
            is_read=False
        ).exclude(sender=request.user).update(is_read=True)

        return Response(response_data)


class SendMessageView(APIView):
    """
    Send a new message in a conversation.

    Business Rules:
        C4: max 2000 characters
        C5: text cannot be empty
        C6: Only participants can send
        C8: Messages cannot be edited or deleted
    """
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

        # ── C5: Empty messages ──
        if not text:
            return Response(
                {"error": "Message text cannot be empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── C4: Length limit ──
        if len(text) > MESSAGE_MAX_LENGTH:
            return Response(
                {"error": f"Message cannot exceed {MESSAGE_MAX_LENGTH} characters."},
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
        message_data = serializer.data

        # Broadcast to WebSocket group for real-time delivery
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"chat_{conversation_id}",
                {
                    "type": "chat_message",
                    "message": message_data,
                },
            )
        except Exception:
            pass  # WebSocket broadcast is best-effort; REST response is primary

        return Response(message_data, status=status.HTTP_201_CREATED)


class MarkReadView(APIView):
    """
    Mark all messages in a conversation as read for the current user.

    Business Rule C6: Only participants can mark messages as read.
    """
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


class UnreadChatCountView(APIView):
    """
    Lightweight endpoint returning total unread chat messages across all conversations.
    Used for the header badge.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Message.objects.filter(
            conversation__in=Conversation.objects.filter(
                Q(user_1=request.user) | Q(user_2=request.user)
            ),
            is_read=False,
        ).exclude(sender=request.user).count()

        return Response({"unread_count": count}, status=status.HTTP_200_OK)
