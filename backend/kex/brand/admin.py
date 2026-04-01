from django.contrib import admin
from django.db.models import Count
from kex.brand.models import Brand


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ["name", "equipment_types_display", "equipment_count"]
    search_fields = ["name"]
    list_per_page = 20

    def get_queryset(self, request):
        """Annotate equipment count to avoid N+1 queries."""
        qs = super().get_queryset(request)
        qs = qs.prefetch_related("equipment_type").annotate(
            _equipment_count=Count("equipment", distinct=True),
        )
        return qs

    def equipment_types_display(self, obj):
        types = obj.equipment_type.all()
        return ", ".join(t.name for t in types) if types.exists() else "—"
    equipment_types_display.short_description = "Equipment Categories"

    def equipment_count(self, obj):
        return obj._equipment_count
    equipment_count.short_description = "Equipment Listed"
    equipment_count.admin_order_field = "_equipment_count"
