# Django imports
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from kex.equipment.models import Equipment

from kex.users.models import User


# ── Status choices for support tickets ──
TICKET_STATUS = (
    ("new", "New"),
    ("in_progress", "In Progress"),
    ("resolved", "Resolved"),
    ("closed", "Closed"),
)


class HelpCentre(models.Model):
    name = models.CharField(_("Name"), max_length=50, blank=False)
    email = models.EmailField(_("Email"), blank=True, null=True)
    phone_number = models.CharField(
        _("Phone Number"),
        max_length=10,
    )
    title = models.CharField(_("Title"), max_length=50, blank=True)
    reason = models.TextField(_("Enquiry Reason"), blank=False)
    status = models.CharField(
        _("Status"), max_length=20, choices=TICKET_STATUS, default="new",
    )
    created_at = models.DateTimeField(_("Submitted At"), default=timezone.now)

    class Meta:
        verbose_name = "Help Desk Enquiry"
        verbose_name_plural = "Help Desk Enquiries"
        ordering = ["-created_at"]

    def __str__(self):
        return str(self.name)


class PartnerDispute(models.Model):
    name = models.CharField(_("Name"), max_length=50, blank=False)
    email = models.EmailField(_("Email"), blank=True, null=True)
    phone_number = models.CharField(
        _("Phone Number"),
        max_length=10,
    )
    equipment_id = models.CharField(_("Product Id"), max_length=10)
    partner_id = models.CharField(_("Partner Id"), max_length=10)
    TOPIC = (
        (10, "Financial related"),
        (20, "Commercial and product related"),
        (30, "Breach of contract related"),
    )
    topic = models.PositiveIntegerField(choices=TOPIC)
    description = models.TextField(_("Description"), blank=False)
    status = models.CharField(
        _("Status"), max_length=20, choices=TICKET_STATUS, default="new",
    )
    created_at = models.DateTimeField(_("Submitted At"), default=timezone.now)

    class Meta:
        verbose_name = "Partner Dispute"
        verbose_name_plural = "Partner Disputes"
        ordering = ["-created_at"]

    def __str__(self):
        return str(self.name)

class CancelForm(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    booking_id = models.CharField(max_length=10)
    CANCEL_REASON = (
        (10, "Others"),
        (20, "Quality Related"),
        (30, "Found a better deal"),
        (40, "Owner Related"),
    )
    cancel_reason = models.PositiveIntegerField(choices=CANCEL_REASON)
    description = models.TextField(_("Description"), blank=True)
    created_at = models.DateTimeField(_("Submitted At"), default=timezone.now)

    class Meta:
        verbose_name = "Cancellation Request"
        verbose_name_plural = "Cancellation Requests"
        ordering = ["-created_at"]

    def __str__(self):
        return str(self.booking_id)


class ReportEquipment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    equipment = models.ForeignKey(Equipment, on_delete=models.CASCADE)
    REPORT_REASON = (
        (10, "Others"),
        (20, "Belongs to another person"),
        (30, "Is misleading in any way"),
        (40, "harasses or advocates harassment of another person;"),
    )
    report_reason = models.PositiveIntegerField(choices=REPORT_REASON)
    description = models.TextField(_("Description"), blank=True)
    created_at = models.DateTimeField(_("Submitted At"), default=timezone.now)

    class Meta:
        verbose_name = "Equipment Report"
        verbose_name_plural = "Equipment Reports"
        ordering = ["-created_at"]

    def __str__(self):
        return str(self.user.first_name)


class FeedbackForm(models.Model):
    name = models.CharField(_("Name"), max_length=50, blank=False)
    phone_number = models.CharField(
        _("Phone Number"),
        max_length=10,
    )
    description = models.TextField(_("Description"), blank=False)
    created_at = models.DateTimeField(_("Submitted At"), default=timezone.now)

    class Meta:
        verbose_name = "User Feedback"
        verbose_name_plural = "User Feedback"
        ordering = ["-created_at"]

    def __str__(self):
        return str(self.name)