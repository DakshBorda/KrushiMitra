from rest_framework.generics import ListAPIView, UpdateAPIView
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from kex.notifications.models import Notification
from kex.notifications.api.serializers import NotificationSerializer
from kex.equipment.api.pagination import LimitOffsetPagination


class NotificationListAPIView(ListAPIView):
    """List current user's notifications, newest first."""

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = LimitOffsetPagination

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)


class NotificationUnreadCountAPIView(APIView):
    """Lightweight endpoint — returns unread notification count."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(
            recipient=request.user,
            is_read=False,
        ).count()
        return Response({"unread_count": count}, status=status.HTTP_200_OK)


class NotificationMarkReadAPIView(APIView):
    """Mark a single notification as read."""

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            notification = Notification.objects.get(
                pk=pk, recipient=request.user
            )
        except Notification.DoesNotExist:
            return Response(
                {"detail": "Notification not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response(
            NotificationSerializer(notification).data,
            status=status.HTTP_200_OK,
        )


class NotificationMarkAllReadAPIView(APIView):
    """Mark all of current user's notifications as read."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        updated = Notification.objects.filter(
            recipient=request.user,
            is_read=False,
        ).update(is_read=True)
        return Response(
            {"detail": f"Marked {updated} notifications as read."},
            status=status.HTTP_200_OK,
        )
