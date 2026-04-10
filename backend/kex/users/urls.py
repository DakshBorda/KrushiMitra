from django.urls import path
from kex.users.api.views import UserRetrieveUpdateView
from kex.users.api.viewset import (
    LoginVerifyOtpViewset,
    LoginViewset,
    SignUpViewset,
    LoginOtpViewset,
    ForgotPasswordViewset,
)

app_name = "users"

urlpatterns = [
    path("signup/", SignUpViewset.as_view({"post": "signup"}), name="signup"),

    path(
        "signup/verify-otp",
        SignUpViewset.as_view({"post": "signup_verify_otp"}),
        name="signup_verify_otp",
    ),

    path(
        "login/email",
        LoginViewset.as_view({"post": "email"}),
        name="email_login",
    ),

    path(
        "login/otp",
        LoginOtpViewset.as_view({"post": "otp_login"}),
        name="otp_login",
    ),

    path(
        "login/verify-otp",
        LoginVerifyOtpViewset.as_view({"post": "verify_otp_login"}),
        name="verify_otp_login",
    ),

    # ── Password Reset (3-step) ──
    path(
        "forgot-password/request-otp",
        ForgotPasswordViewset.as_view({"post": "request_otp"}),
        name="forgot_password_request",
    ),
    path(
        "forgot-password/verify-otp",
        ForgotPasswordViewset.as_view({"post": "verify_otp"}),
        name="forgot_password_verify",
    ),
    path(
        "forgot-password/reset",
        ForgotPasswordViewset.as_view({"post": "reset_password"}),
        name="forgot_password_reset",
    ),

    path(
        "<slug:uuid>/",
        UserRetrieveUpdateView.as_view(),
        name="user_update",
    ),
]
