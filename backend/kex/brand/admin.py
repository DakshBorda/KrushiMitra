from django.contrib import admin
from django.db.models import Count
from django.forms import CheckboxSelectMultiple
from kex.brand.models import Brand


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ["name", "equipment_types_display", "equipment_count"]
    search_fields = ["name"]
    list_per_page = 20

    # No filter_horizontal — we use checkboxes instead (much simpler UX)
    # No actions bar — not needed for a small list of manufacturers
    actions = None

    fieldsets = (
        (None, {
            "fields": ("name",),
        }),
        ("Equipment Categories", {
            "fields": ("equipment_type",),
            "description": (
                "Tick the equipment types this manufacturer produces. "
                "Users listing equipment will only see this brand if the "
                "selected equipment type is ticked below."
            ),
        }),
    )

    def formfield_for_manytomany(self, db_field, request, **kwargs):
        """Render M2M as simple checkboxes instead of the confusing dual-list widget."""
        if db_field.name == "equipment_type":
            kwargs["widget"] = CheckboxSelectMultiple
        return super().formfield_for_manytomany(db_field, request, **kwargs)

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

    # ── Protect against accidental deletion ──
    def has_delete_permission(self, request, obj=None):
        """
        Only superusers can delete brands.
        Prevents non-technical admins from accidentally deleting.
        """
        return request.user.is_superuser
