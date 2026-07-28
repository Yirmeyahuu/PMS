import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.apps import apps
from apps.patients.models import Patient
import json

relations = []

# Get all fields that reference Patient
for rel in Patient._meta.related_objects:
    field = rel.field
    model = rel.related_model
    app_label = model._meta.app_label
    model_name = model._meta.object_name
    field_name = field.name
    on_delete = field.remote_field.on_delete.__name__ if hasattr(field.remote_field, 'on_delete') and field.remote_field.on_delete else 'None'
    
    # Check if model has soft delete
    has_soft_delete = hasattr(model, 'is_deleted')

    relations.append({
        "app": app_label,
        "model": model_name,
        "field": field_name,
        "on_delete": on_delete,
        "related_name": rel.related_name or rel.name,
        "has_soft_delete": has_soft_delete
    })

# Dump as JSON
with open('patient_deps.json', 'w') as f:
    json.dump({
        "relations": relations,
        "patient_indexes": [str(idx) for idx in Patient._meta.indexes],
        "patient_constraints": [str(c) for c in Patient._meta.constraints]
    }, f, indent=2)

print("Done")
