from django.db import models
from core.base_model import AuditModel
from core.choices import ActionsChoices


class PercentileSnapshot(AuditModel):
    major_combination = models.ForeignKey('programs.MajorCombination', on_delete=models.CASCADE, related_name='percentile_snapshots')
    percentile        = models.PositiveSmallIntegerField()
    score             = models.DecimalField(max_digits=5, decimal_places=2)
    round             = models.PositiveSmallIntegerField(default=1)
    computed_at       = models.DateTimeField(auto_now=True)

    class Meta:
        db_table    = 'percentile_snapshot'
        constraints = [
            models.UniqueConstraint(fields=['major_combination', 'percentile', 'round'], name='uq_percentile_snapshot'),
        ]
        indexes = [models.Index(fields=['major_combination', 'round'])]


class PercentileSnapshotLog(models.Model):
    percentile_snapshot  = models.ForeignKey(PercentileSnapshot, on_delete=models.CASCADE, db_column='percentile_snapshot_id')
    major_combination_id = models.IntegerField()
    percentile           = models.PositiveSmallIntegerField()
    score                = models.DecimalField(max_digits=5, decimal_places=2)
    round                = models.PositiveSmallIntegerField()
    computed_at          = models.DateTimeField()
    action               = models.CharField(max_length=10, choices=ActionsChoices.choices)
    field_changed        = models.CharField(max_length=500, null=True, blank=True)
    create_date          = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'percentile_snapshot_log'
