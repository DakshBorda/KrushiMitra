from random import randint
import uuid
from datetime import datetime
from django.db.models import Max

from django.contrib.auth.models import AbstractUser
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from django.db import models
from rest_framework_simplejwt.tokens import RefreshToken

from django.contrib.auth.models import BaseUserManager


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email must be set")

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_verified", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """
    Default custom user model for Kex.
    If adding fields that need to be filled at user signup,
    check forms.SignupForm and forms.SocialSignupForms accordingly.
    """

    email = models.EmailField(_("email address"), unique=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []
    objects = UserManager()

    user_id = models.CharField(editable=False, max_length=10)

    uuid = models.UUIDField(default=uuid.uuid4, editable=False, db_index=True)
    address = models.CharField(_("Address of User"), max_length=100, blank=True)
    city = models.CharField(_("City of User"), max_length=50, blank=True)
    state = models.CharField(_("State of User"), max_length=50, blank=True)
    pin_code = models.IntegerField(_("Pincode of User"), blank=True, null=True)
    profile_picture = models.ImageField(_("Image of User"), blank=True)
    phone_number = models.CharField(max_length=15, unique=True, blank=True, null=True)
    secondary_phone_number = models.CharField(
        max_length=10, blank=True, null=True,
    )

    is_verified = models.BooleanField(default=False)

    twilio_user_id = models.CharField(max_length=50, blank=True, null=True)

    def tokens(self):
        refresh = RefreshToken.for_user(self)
        return {"refresh": str(refresh), "access": str(refresh.access_token)}


    @property
    def is_profile_complete(self):
        """Check if user has filled all required profile fields."""
        return all([
            self.first_name,
            self.last_name,
            self.address,
            self.city,
            self.state,
            self.pin_code,
        ])

    def save(self, *args, **kwargs):
        if not self.username:
            username = "%s.%s" % (self.first_name.lower(), self.last_name.lower())
            is_valid = False

            while not is_valid:
                try:
                    User.objects.get(username=username)
                    username += str(randint(0, 9))
                except User.DoesNotExist:
                    is_valid = True
            self.username = username

        if not self.user_id:
            max = User.objects.aggregate(id_max=Max("id"))["id_max"]
            self.user_id = "{}{:05d}".format("UR", (max + 1) if max is not None else 1)
        super().save(*args, **kwargs)


class PasswordResetOTP(models.Model):
    """
    Stores time-limited OTP codes for password reset via email.
    Industry standard: 6-digit code, 10-minute expiry, max 5 attempts.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="password_reset_otps")
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    attempts = models.IntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Password Reset OTP"
        verbose_name_plural = "Password Reset OTPs"

    def __str__(self):
        return f"OTP for {self.user.email} ({'used' if self.is_used else 'active'})"

    @property
    def is_expired(self):
        from django.utils import timezone
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
        return not self.is_used and not self.is_expired and self.attempts < 5

    @classmethod
    def generate_otp(cls):
        """Generate a cryptographically random 6-digit OTP."""
        import secrets
        return f"{secrets.randbelow(900000) + 100000}"

    @classmethod
    def create_for_user(cls, user):
        """Invalidate old OTPs and create a fresh one."""
        from django.utils import timezone
        from datetime import timedelta

        # Invalidate all existing unused OTPs for this user
        cls.objects.filter(user=user, is_used=False).update(is_used=True)

        otp_code = cls.generate_otp()
        otp_obj = cls.objects.create(
            user=user,
            otp=otp_code,
            expires_at=timezone.now() + timedelta(minutes=10),
        )
        return otp_obj

    @classmethod
    def cleanup_expired(cls):
        """Remove OTPs older than 24 hours."""
        from django.utils import timezone
        from datetime import timedelta
        cls.objects.filter(created_at__lt=timezone.now() - timedelta(hours=24)).delete()
