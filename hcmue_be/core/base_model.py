from django.db import models
from core.choices import ActionsChoices


class AuditModel(models.Model):
    action        = models.CharField(max_length=10, choices=ActionsChoices.choices, default=ActionsChoices.CREATE)
    field_changed = models.CharField(max_length=500, null=True, blank=True)
    create_date   = models.DateTimeField(auto_now_add=True)
    update_date   = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
