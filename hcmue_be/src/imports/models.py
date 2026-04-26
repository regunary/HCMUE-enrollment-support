import uuid
from django.conf import settings
from django.db import models
from core.base_model import AuditModel
from core.choices import ActionsChoices, ImportStatusChoices


class ImportBatch(AuditModel):
    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file_name     = models.CharField(max_length=255)
    imported_by   = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='import_batches')
    status        = models.CharField(max_length=15, choices=ImportStatusChoices.choices, default=ImportStatusChoices.PENDING)
    row_count     = models.PositiveIntegerField(default=0)
    created_count = models.PositiveIntegerField(default=0)
    updated_count = models.PositiveIntegerField(default=0)
    error_count   = models.PositiveIntegerField(default=0)
    is_deleted    = models.BooleanField(default=False)
    deleted_at    = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'import_batch'


class ImportBatchLog(models.Model):
    import_batch   = models.ForeignKey(ImportBatch, on_delete=models.CASCADE, db_column='import_batch_id')
    file_name      = models.CharField(max_length=255)
    imported_by_id = models.UUIDField(null=True, blank=True)
    status         = models.CharField(max_length=15, choices=ImportStatusChoices.choices)
    row_count      = models.PositiveIntegerField()
    created_count  = models.PositiveIntegerField()
    updated_count  = models.PositiveIntegerField()
    error_count    = models.PositiveIntegerField()
    is_deleted     = models.BooleanField()
    deleted_at     = models.DateTimeField(null=True, blank=True)
    action         = models.CharField(max_length=10, choices=ActionsChoices.choices)
    field_changed  = models.CharField(max_length=500, null=True, blank=True)
    create_date    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'import_batch_log'
