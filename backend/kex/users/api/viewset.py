from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import viewsets
from .serializers import (
    LoginSerializer,
    LoginVerifyOtpSerializer,
    LoginWithOtpSerializer,
    UserSerializer,
    UserSignupSerializer,
    UserSignUpOtpSerializer,
    ForgotPasswordSerializer,
    ForgotPasswordVerifySerializer,
    ResetPasswordSerializer,
)
from rest_framework.permissions import IsAuthenticated

from kex.core.utils import response_payload

User = get_user_model()


class UserViewset(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "username"

    def get_queryset(self):
        return self.queryset.all()


class SignUpViewset(viewsets.ViewSet):
    queryset = User.objects.all()
    serializer_class = UserSignupSerializer

    @action(detail=False, methods=["post"])
    def signup(self, request):
        serializer = UserSignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response(
            {
                "success": True,
                "next": "VERIFY_OTP",
                "phone_number": user.phone_number,
                "message": "OTP sent successfully"
            },
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=["post"])
    def signup_verify_otp(self, request, *args, **kwargs):
        serializer = UserSignUpOtpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        return Response(
            response_payload(
                success=True,
                data=serializer.data,
                msg="Otp Has been verified",
            )
        )


class LoginViewset(viewsets.ViewSet):
    queryset = User.objects.all()
    serializer_class = LoginSerializer

    @action(detail=False, methods=["post"], url_path="email")
    def email(self, request, *args, **kwargs):
        serializer = self.serializer_class(
            data=request.data,
            context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        return Response(
            response_payload(
                success=True,
                data=serializer.validated_data,
                msg="Logged in Successfully!"
            ),
            status=status.HTTP_200_OK,
        )


class LoginOtpViewset(viewsets.ViewSet):
    queryset = User.objects.all()
    serializer_class = LoginWithOtpSerializer

    @action(detail=False, methods=["post"])
    def otp_login(self, request, *args, **kwargs):
        serializer = LoginWithOtpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            response_payload(
                success=True,
                msg="OTP has been sent Successfully",
                data={"phone_number": serializer.validated_data["phone_number"]}
            ),
            status=status.HTTP_200_OK,
        )


class LoginVerifyOtpViewset(viewsets.ViewSet):
    queryset = User.objects.all()
    serializer_class = LoginVerifyOtpSerializer

    @action(detail=False, methods=["post"])
    def verify_otp_login(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            response_payload(
                success=True, data=serializer.validated_data, msg="Logged in Successfully"
            )
        )


# ═══════════════════════════════════════════════════════════
#  PASSWORD RESET VIEWSET
# ═══════════════════════════════════════════════════════════

class ForgotPasswordViewset(viewsets.ViewSet):
    """
    3-step password reset via email OTP:
      POST /users/forgot-password/request-otp    → sends OTP to email
      POST /users/forgot-password/verify-otp     → verifies OTP, returns reset_token
      POST /users/forgot-password/reset          → sets new password
    """

    @action(detail=False, methods=["post"], url_path="request-otp")
    def request_otp(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            response_payload(
                success=True,
                msg="If an account exists with this email, a reset code has been sent.",
            ),
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="verify-otp")
    def verify_otp(self, request):
        serializer = ForgotPasswordVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            response_payload(
                success=True,
                data={"reset_token": serializer.validated_data["reset_token"]},
                msg="Code verified successfully. You can now set a new password.",
            ),
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="reset")
    def reset_password(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            response_payload(
                success=True,
                msg="Password has been reset successfully. You can now login.",
            ),
            status=status.HTTP_200_OK,
        )
