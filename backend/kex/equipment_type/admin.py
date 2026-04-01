from django.contrib import admin
from django.db.models import Count
from kex.equipment_type.models import EquipmentType


@admin.register(EquipmentType)
class EquipmentTypeAdmin(admin.ModelAdmin):
    list_display = ["name", "equipment_count"]
    search_fields = ["name"]
    list_per_page = 20

    def get_queryset(self, request):
        """Annotate equipment count to avoid N+1 queries."""
        qs = super().get_queryset(request)
        qs = qs.annotate(_equipment_count=Count("equipment", distinct=True))
        return qs

    def equipment_count(self, obj):
        return obj._equipment_count
    equipment_count.short_description = "Equipment Listed"
    equipment_count.admin_order_field = "_equipment_count"
