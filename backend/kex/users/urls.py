from django.urls import path
from kex.users.api.views import UserRetrieveUpdateView
from kex.users.api.viewset import (
    LoginVerifyOtpViewset,
    LoginViewset,
    SignUpViewset,
    LoginOtpViewset,
)

app_name = "users"

urlpatterns = [
    path("signup/", SignUpViewset.as_view({"post": "signup"}), name="signup"),

    path(
        "signup/verify-otp",
        SignUpViewset.as_view({"post": "signup_verify_otp"}),
        name="signup_verify_otp",
    ),

    # ✅ FIXED HERE
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

    path(
        "<slug:uuid>/",
        UserRetrieveUpdateView.as_view(),
        name="user_update",
    ),
]
