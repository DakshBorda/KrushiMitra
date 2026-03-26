from django.contrib import admin
from kex.brand.models import Brand


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ["name", "equipment_count"]
    search_fields = ["name"]
    list_per_page = 20

    def equipment_count(self, obj):
        return obj.equipment_set.count()
    equipment_count.short_description = "Equipment Listed"
