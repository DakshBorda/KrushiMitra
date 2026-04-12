from django.db import models

from kex.equipment_type.models import EquipmentType


class Brand(models.Model):

    name = models.CharField(
        max_length=200,
        unique=True,
        help_text="Manufacturer name (e.g. Mahindra, John Deere, TAFE)",
    )
    equipment_type = models.ManyToManyField(
        EquipmentType,
        blank=True,
        help_text="Select which equipment categories this manufacturer produces. "
                  "Only selected categories will appear when users list equipment for this brand.",
    )

    class Meta:
        verbose_name = "Manufacturer"
        verbose_name_plural = "Manufacturers"
        ordering = ["name"]

    def __str__(self):
        return self.name

