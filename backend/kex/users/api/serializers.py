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

    # extra_kwargs = {"url": {"view_name": "api:user-detail", "lookup_field": "username"}}


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

    # def create(self, validated_data):
    #     print("VALIDATED DATA:", validated_data)
    #     password = validated_data.pop("password")
    #     user = User.objects.create(**validated_data)
    #     user.set_password(password)
    #     user.is_active = True
    #     user.save()

    #     twilio_handler = TwilioHandler()
    #     twilio_user_id = twilio_handler.create_or_get_user(
    #         email=user.email if user.email else "test@test.com",
    #         phone_number=user.phone_number,
    #     )

    #     user.twilio_user_id = twilio_user_id
    #     user.save()

    #     twilio_handler.send_otp(twilio_user_id)
    #     return user
    # def create(self, validated_data):
    #     password = validated_data.pop("password")
    #     user = User.objects.create(**validated_data)
    #     user.set_password(password)
    #     user.is_active = True
    #     user.save()

    #     # ✅ Send OTP using Twilio Verify (phone-based)
    #     twilio_handler = TwilioHandler()
    #     twilio_handler.send_otp(user.phone_number)

    #     return user
    # def create(self, validated_data):
    #     password = validated_data.pop("password")

    #     user = User(**validated_data)   # ✅ DO NOT use objects.create
    #     user.set_password(password)     # ✅ hash BEFORE save
    #     user.is_active = True
    #     user.save()

    #     twilio_handler = TwilioHandler()
    #     twilio_handler.send_otp(user.phone_number)

    #     return user
    # def create(self, validated_data):
    #     phone_number = validated_data.get("phone_number")
    #     email = validated_data.get("email")
    #     password = validated_data.pop("password")

    #     # 🔁 USER ALREADY EXISTS BUT NOT VERIFIED
    #     existing_user = User.objects.filter(phone_number=phone_number).first()

    #     if existing_user:
    #         if existing_user.is_verified:
    #             raise serializers.ValidationError(
    #                 response_payload(success=False, msg="User already exists")
    #             )

    #         # 🔁 Resend OTP
    #     twilio_handler = TwilioHandler()
    #     response = twilio_handler.send_otp(existing_user.phone_number)

    #     if isinstance(response, dict) and response.get("status") == "blocked":
    #         # OTP already sent recently — allow frontend to continue
    #         return existing_user

    #     return existing_user if existing_user else self._create_new_user(validated_data, password)  


    #     # ✅ CREATE NEW USER
    #     user = User.objects.create(**validated_data)
    #     user.set_password(password)
    #     user.is_active = True
    #     user.is_verified = False
    #     user.save()

    #     twilio_handler = TwilioHandler()
    #     twilio_handler.send_otp(user.phone_number)

    #     return user
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

        # otp_verified = twilio_handler.verify_otp(auth_id=user.twilio_user_id, otp=otp)
        # if user.otp == 1000:
        #     raise AuthenticationFailed(
        #         response_payload(success=False, msg="Try Resending the otp.")
        #     )
        # elif user.otp_expired():
        #     raise AuthenticationFailed(
        #         response_payload(success=False, msg="Otp has been Expired. Try Again")
        #     )
        # if user.otp == otp:
        #     user.otp = 1000
        #     user.save()
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
