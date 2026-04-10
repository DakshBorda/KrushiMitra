# Data migration: backfill unique eq_id for all existing equipment records
import uuid
from django.db import migrations


def backfill_eq_ids(apps, schema_editor):
    Equipment = apps.get_model('equipment', 'Equipment')
    seen = set()
    for eq in Equipment.objects.all():
        if not eq.eq_id or eq.eq_id in seen:
            # Generate a unique eq_id
            new_id = "EQ" + uuid.uuid4().hex[:8].upper()
            while new_id in seen:
                new_id = "EQ" + uuid.uuid4().hex[:8].upper()
            eq.eq_id = new_id
            eq.save(update_fields=['eq_id'])
        seen.add(eq.eq_id)


class Migration(migrations.Migration):

    dependencies = [
        ('equipment', '0007_alter_equipmentrating_options'),
    ]

    operations = [
        migrations.RunPython(backfill_eq_ids, migrations.RunPython.noop),
    ]
