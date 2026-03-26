from django.contrib import admin
from kex.equipment_type.models import EquipmentType


@admin.register(EquipmentType)
class EquipmentTypeAdmin(admin.ModelAdmin):
    list_display = ["name", "equipment_count"]
    list_filter = ["name"]
    search_fields = ["name"]
    list_per_page = 20

    def equipment_count(self, obj):
        return obj.equipment_set.count()
    equipment_count.short_description = "Equipment Listed"
