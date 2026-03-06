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
    # phone_number = models.CharField(
    #     _("Phone Number"), max_length=10, null=True, unique=True
    # )
    # secondary_phone_number = models.CharField(
    #     _("Secondary Phone Number"), max_length=10, blank=True, null=True
    # )
    phone_number = models.CharField(max_length=15, unique=True)
    # phone_number = serializers.CharField(
    # required=True, validators=[validator_mobile_number]
    # )

    secondary_phone_number = models.CharField(
    max_length=10, blank=True, null=True
     )

    is_verified = models.BooleanField(default=False)

    twilio_user_id = models.CharField(max_length=50, blank=True, null=True)
    # twilio_user_id = models.CharField(max_length=9, blank=True, null=True)

    def tokens(self):
        refresh = RefreshToken.for_user(self)
        return {"refresh": str(refresh), "access": str(refresh.access_token)}

    # def get_absolute_url(self):
    #     """Get url for user's detail view.

    #     Returns:
    #         str: URL for user detail.

    #     """
    #     return reverse("users:detail", kwargs={"username": self.username})

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
