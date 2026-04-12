from datetime import datetime


from django.contrib.auth import get_user_model
from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth.password_validation import validate_password as django_validate_password

from rest_framework.exceptions import AuthenticationFailed
from django.contrib import auth
from kex.core.validators import validator_mobile_number
from kex.core.utils import response_payload
from kex.users.utils import TwilioHandler

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "uuid",
            "user_id",
            "first_name",
            "last_name",
            "email",
            "address",
            "city",
            "state",
            "pin_code",
            "profile_picture",
            "phone_number",
        ]


class UserUpdateSerializer(serializers.ModelSerializer):
    is_profile_complete = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "uuid",
            "user_id",
            "first_name",
            "last_name",
            "email",
            "address",
            "city",
            "state",
            "pin_code",
            "profile_picture",
            "phone_number",
            "is_profile_complete",
        ]
        read_only_fields = ["uuid", "id", "user_id", "email", "phone_number", "is_profile_complete"]

    def get_is_profile_complete(self, obj):
        return obj.is_profile_complete

    def validate_pin_code(self, value):
        if value is not None:
            pin_str = str(value)
            if len(pin_str) != 6 or not pin_str.isdigit():
                raise serializers.ValidationError("Pin code must be exactly 6 digits.")
        return value

    def validate_profile_picture(self, value):
        if value:
            # Max 5MB
            if value.size > 5 * 1024 * 1024:
                raise serializers.ValidationError("Profile picture must be under 5MB.")
            # Only allow JPEG/PNG
            content_type = getattr(value, 'content_type', '')
            if content_type not in ['image/jpeg', 'image/png', 'image/jpg']:
                raise serializers.ValidationError("Only JPG and PNG images are allowed.")
        return value


class UserSignupSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)
    pin_code = serializers.IntegerField(required=True)
    phone_number = serializers.CharField(
    required=True, validators=[validator_mobile_number]
    )

    email = serializers.EmailField(required=False)
    password = serializers.CharField(required=True, write_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "user_id",
            "uuid",
            "email",
            "password",
            "first_name",
            "last_name",
            "address",
            "city",
            "state",
            "pin_code",
            "phone_number",
            "secondary_phone_number",
        ]
        read_only_fields = ["id", "user_id", "uuid"]

    # def validate_email(self, email):
    #     if User.objects.filter(email=email).exists():
    #         raise serializers.ValidationError(
    #             response_payload(success=False, msg="Email already exists!")
    #         )
    #     return email
    def validate_email(self, email):
        user = User.objects.filter(email=email).first()
        if user and user.is_verified:
            raise serializers.ValidationError(
                response_payload(success=False, msg="Email already exists!")
            )
        return email

    def validate_phone_number(self, phone_number):
        if User.objects.filter(phone_number=phone_number).exists():
            raise serializers.ValidationError(
                response_payload(success=False, msg="Phone Number already exists!")
            )
        return phone_number

    def validate_password(self, password):
        """
        Enforce Django's built-in password validators for stronger security.
        """
        try:
            django_validate_password(password)
        except DjangoValidationError as e:
            # Combine messages into one and wrap in our standard payload
            msg = " ".join(e.messages)
            raise serializers.ValidationError(
                response_payload(success=False, msg=msg)
            )
        return password


    def create(self, validated_data):
        phone_number = validated_data.get("phone_number")
        password = validated_data.pop("password")

        twilio_handler = TwilioHandler()

        # 🔍 Check if user already exists
        existing_user = User.objects.filter(phone_number=phone_number).first()

        # ============================
        # CASE 1: USER EXISTS
        # ============================
        if existing_user is not None:
            if existing_user.is_verified:
                raise serializers.ValidationError(
                    response_payload(success=False, msg="User already exists")
                )

            # 🔁 User exists but not verified → resend OTP safely
            response = twilio_handler.send_otp(existing_user.phone_number)

            # ⛔ OTP rate-limited → still allow frontend to continue
            if isinstance(response, dict) and response.get("status") == "blocked":
                return existing_user

            return existing_user

        # ============================
        # CASE 2: NEW USER
        # ============================
        user = User(**validated_data)
        user.set_password(password)
        user.is_active = True
        user.is_verified = False
        user.save()

        response = twilio_handler.send_otp(user.phone_number)

        # ⛔ OTP rate-limited → user still created, frontend continues
        if isinstance(response, dict) and response.get("status") == "blocked":
            return user

        return user



class UserSignUpOtpSerializer(serializers.ModelSerializer):
    otp = serializers.CharField(required=True, write_only=True)

    phone_number = serializers.CharField(
        required=True, validators=[validator_mobile_number]
    )
    email = serializers.EmailField(read_only=True)

    class Meta:
        model = User
        fields = [
            "phone_number",
            "otp",
            "first_name",
            "last_name",
            "email",
            "uuid",
            "user_id",
            "id",
            "address",
            "city",
            "state",
            "pin_code",
            "secondary_phone_number",
        ]
        read_only_fields = [
            "uuid",
            "user_id",
            "id",
            "first_name",
            "last_name",
            "email",
            "address",
            "city",
            "state",
            "pin_code",
            "secondary_phone_number",
        ]

    def validate(self, data):
        phone_number = data.get("phone_number", "")
        otp = data.get("otp")

        user = User.objects.filter(phone_number=phone_number)
        if not user.exists():
            raise AuthenticationFailed(
                response_payload(success=False, msg="Invalid credentials, try again")
            )

        user = user.first()

        if not user.is_active:

            raise AuthenticationFailed(
                response_payload(success=False, msg="Account disabled, contact admin")
            )
        if user.is_verified:
            raise AuthenticationFailed(
                response_payload(success=False, msg="Account already Verified")
            )

        twilio_handler = TwilioHandler()
        # otp_verified = twilio_handler.verify_otp(auth_id=user.twilio_user_id, otp=otp)
        otp_verified = twilio_handler.verify_otp(phone_number=user.phone_number,otp=otp)

        if otp_verified:
            user.is_verified = True
            user.save()
        else:
            raise AuthenticationFailed(
                response_payload(success=False, msg="Incorrect Otp, Try Again")
            )

        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get("email").lower()
        password = attrs.get("password")

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise AuthenticationFailed(
                response_payload(success=False, msg="Invalid Email or Password")
            )

        if not user.check_password(password):
            raise AuthenticationFailed(
                response_payload(success=False, msg="Invalid Email or Password")
            )

        if not user.is_active:
            raise AuthenticationFailed(
                response_payload(success=False, msg="Account disabled")
            )

        if not user.is_verified:
            raise AuthenticationFailed(
                response_payload(
                    success=False,
                    msg="Please verify your phone number via OTP."
                )
            )

        return {
            "email": user.email,
            "tokens": user.tokens(),
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone_number": user.phone_number,
            "uuid": user.uuid,
            "user_id": user.user_id,
            "id": user.id,
        }


class LoginWithOtpSerializer(serializers.Serializer):
    phone_number = serializers.CharField(required=True)

    def validate(self, attrs):
        try:
            user = User.objects.get(phone_number=attrs.get("phone_number", ""))
        except User.DoesNotExist:
            raise serializers.ValidationError(
                f"User with phone_number {attrs.get('phone_number', '')} doesn't exist."
            )
        twilio_handler = TwilioHandler()
        twilio_handler.send_otp(user.phone_number)
        return attrs


class LoginVerifyOtpSerializer(serializers.ModelSerializer):
    otp = serializers.CharField(required=True, write_only=True)
    phone_number = serializers.CharField(required=True)
    tokens = serializers.SerializerMethodField()
    email = serializers.EmailField(read_only=True)

    class Meta:
        model = User
        fields = [
            "phone_number",
            "tokens",
            "otp",
            "first_name",
            "last_name",
            "email",
            "user_id",
            "uuid",
            "id",
        ]
        read_only_fields = ["user_id", "uuid", "id", "email"]

    def get_tokens(self, obj):
        try:
            user = User.objects.get(phone_number=obj["phone_number"])
        except:
            raise serializers.ValidationError(
                f"User with phone_number {obj['phone_number']} doesn't exists."
            )

        return {"refresh": user.tokens()["refresh"], "access": user.tokens()["access"]}

    def validate(self, data):
        phone_number = data.get("phone_number", "")
        otp = data.get("otp", "")

        user = User.objects.filter(phone_number=phone_number)
        if not user.exists():
            raise AuthenticationFailed(
                response_payload(success=False, msg="Invalid credentials, try again")
            )
        user = user.first()
        if not user.is_active:
            raise AuthenticationFailed(
                response_payload(success=False, msg="Account disabled, contact admin")
            )
        if not user.is_verified:
            raise AuthenticationFailed(
                response_payload(success=False, msg="User is not Verified.")
            )
        twilio_handler = TwilioHandler()
        otp_verified = twilio_handler.verify_otp(phone_number=user.phone_number,otp=otp)

        if not otp_verified:
            raise AuthenticationFailed(
                response_payload(success=False, msg="Incorrect Otp, Try Again")
            )

        return {
            "tokens": user.tokens(),
            "email": user.email,
            "phone_number": user.phone_number,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "uuid": user.uuid,
            "user_id": user.user_id,
            "id": user.id,
        }


# ═══════════════════════════════════════════════════════════
#  PASSWORD RESET SERIALIZERS
# ═══════════════════════════════════════════════════════════

class ForgotPasswordSerializer(serializers.Serializer):
    """Step 1: User provides email → we send a 6-digit OTP to that email."""
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        email = value.lower().strip()
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Security: don't reveal if email exists or not
            # We still return success to prevent email enumeration
            return email

        if not user.is_active:
            raise serializers.ValidationError("This account has been deactivated.")
        return email

    def save(self):
        from kex.users.models import PasswordResetOTP
        from django.core.mail import send_mail
        from django.conf import settings
        import logging

        logger = logging.getLogger(__name__)
        email = self.validated_data["email"].lower().strip()

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Don't reveal that user doesn't exist — silently succeed
            logger.info(f"Password reset requested for non-existent email: {email}")
            return None

        # Rate limit: max 3 OTPs per hour
        from django.utils import timezone
        from datetime import timedelta
        recent_count = PasswordResetOTP.objects.filter(
            user=user,
            created_at__gte=timezone.now() - timedelta(hours=1),
        ).count()
        if recent_count >= 3:
            raise serializers.ValidationError(
                "Too many reset requests. Please wait before trying again."
            )

        # Create OTP
        otp_obj = PasswordResetOTP.create_for_user(user)

        # Send email
        subject = "KrushiMitra — Password Reset Code"
        message = (
            f"Hello {user.first_name or 'User'},\n\n"
            f"Your password reset code is: {otp_obj.otp}\n\n"
            f"This code expires in 10 minutes.\n"
            f"If you did not request this, please ignore this email.\n\n"
            f"— KrushiMitra Team"
        )
        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
            logger.info(f"Password reset OTP sent to {user.email}")
        except Exception as e:
            logger.error(f"Failed to send password reset email to {user.email}: {e}")
            # In dev, OTP is logged to console anyway
            # Don't fail the request — user can retry

        return otp_obj


class ForgotPasswordVerifySerializer(serializers.Serializer):
    """Step 2: User provides email + OTP → we verify and return a reset token."""
    email = serializers.EmailField(required=True)
    otp = serializers.CharField(required=True, max_length=6)

    def validate(self, attrs):
        from kex.users.models import PasswordResetOTP
        import uuid as uuid_lib

        email = attrs["email"].lower().strip()
        otp_code = attrs["otp"].strip()

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid email or OTP.")

        # Find the latest valid OTP for this user
        otp_obj = PasswordResetOTP.objects.filter(
            user=user, is_used=False
        ).order_by("-created_at").first()

        if not otp_obj:
            raise serializers.ValidationError("No active reset code found. Please request a new one.")

        if otp_obj.is_expired:
            otp_obj.is_used = True
            otp_obj.save(update_fields=["is_used"])
            raise serializers.ValidationError("Reset code has expired. Please request a new one.")

        # Increment attempts
        otp_obj.attempts += 1
        otp_obj.save(update_fields=["attempts"])

        if otp_obj.attempts > 5:
            otp_obj.is_used = True
            otp_obj.save(update_fields=["is_used"])
            raise serializers.ValidationError("Too many incorrect attempts. Please request a new code.")

        if otp_obj.otp != otp_code:
            remaining = 5 - otp_obj.attempts
            raise serializers.ValidationError(
                f"Incorrect code. {remaining} attempt(s) remaining."
            )

        # Mark OTP as used
        otp_obj.is_used = True
        otp_obj.save(update_fields=["is_used"])

        # Generate a one-time reset token (stored in session/frontend)
        reset_token = str(uuid_lib.uuid4())

        # Store the reset token temporarily on the user
        # We use the cache for this (or a simple approach: store on the OTP record)
        from django.core.cache import cache
        cache.set(f"pwd_reset_{reset_token}", user.pk, timeout=600)  # 10 min

        attrs["reset_token"] = reset_token
        attrs["user"] = user
        return attrs


class ResetPasswordSerializer(serializers.Serializer):
    """Step 3: User provides reset_token + new password → we update the password."""
    email = serializers.EmailField(required=True)
    reset_token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)
    confirm_password = serializers.CharField(required=True, min_length=8)

    def validate(self, attrs):
        from django.core.cache import cache
        from django.contrib.auth.password_validation import validate_password as django_validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError

        email = attrs["email"].lower().strip()
        reset_token = attrs["reset_token"]
        new_password = attrs["new_password"]
        confirm_password = attrs["confirm_password"]

        if new_password != confirm_password:
            raise serializers.ValidationError("Passwords do not match.")

        # Validate password strength
        try:
            django_validate_password(new_password)
        except DjangoValidationError as e:
            raise serializers.ValidationError(" ".join(e.messages))

        # Verify reset token
        user_pk = cache.get(f"pwd_reset_{reset_token}")
        if not user_pk:
            raise serializers.ValidationError(
                "Reset session has expired. Please start over."
            )

        try:
            user = User.objects.get(pk=user_pk, email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid reset request.")

        # Clear the token so it can't be reused
        cache.delete(f"pwd_reset_{reset_token}")

        attrs["user"] = user
        return attrs

    def save(self):
        user = self.validated_data["user"]
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user
