from django.conf import settings
from django.db import models
from core.base_model import AuditModel
from core.choices import ActionsChoices, AdmissionStatusChoices


class Aspiration(AuditModel):
    candidate         = models.ForeignKey('candidates.Candidate', on_delete=models.CASCADE, related_name='aspirations')
    major_combination = models.ForeignKey('programs.MajorCombination', on_delete=models.PROTECT, related_name='aspirations')
    rank              = models.PositiveSmallIntegerField()
    computed_score    = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table    = 'aspiration'
        constraints = [
            models.UniqueConstraint(fields=['candidate', 'rank'], name='uq_aspiration_rank'),
            models.UniqueConstraint(fields=['candidate', 'major_combination'], name='uq_aspiration_major_combination'),
        ]
        indexes = [
            models.Index(fields=['candidate']),
            models.Index(fields=['major_combination', 'computed_score']),
        ]


class AspirationLog(models.Model):
    aspiration           = models.ForeignKey(Aspiration, on_delete=models.CASCADE, db_column='aspiration_id')
    candidate_id         = models.UUIDField()
    major_combination_id = models.IntegerField()
    rank                 = models.PositiveSmallIntegerField()
    computed_score       = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    action               = models.CharField(max_length=10, choices=ActionsChoices.choices)
    field_changed        = models.CharField(max_length=500, null=True, blank=True)
    create_date          = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'aspiration_log'


class AdmissionResult(AuditModel):
    aspiration  = models.OneToOneField(Aspiration, on_delete=models.CASCADE, related_name='result')
    status      = models.CharField(max_length=10, choices=AdmissionStatusChoices.choices, default=AdmissionStatusChoices.PENDING)
    admitted_at = models.DateTimeField(null=True, blank=True)
    round       = models.PositiveSmallIntegerField(default=1)
    note        = models.TextField(blank=True, default='')
    is_deleted  = models.BooleanField(default=False)
    deleted_at  = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'admission_result'
        indexes  = [models.Index(fields=['status', 'round'])]


class AdmissionResultLog(models.Model):
    admission_result = models.ForeignKey(AdmissionResult, on_delete=models.CASCADE, db_column='admission_result_id')
    aspiration_id    = models.IntegerField()
    status           = models.CharField(max_length=10, choices=AdmissionStatusChoices.choices)
    admitted_at      = models.DateTimeField(null=True, blank=True)
    round            = models.PositiveSmallIntegerField()
    note             = models.TextField(blank=True, default='')
    is_deleted       = models.BooleanField()
    deleted_at       = models.DateTimeField(null=True, blank=True)
    action           = models.CharField(max_length=10, choices=ActionsChoices.choices)
    field_changed    = models.CharField(max_length=500, null=True, blank=True)
    create_date      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'admission_result_log'


class PassedCandidate(AuditModel):
    candidate         = models.ForeignKey('candidates.Candidate', on_delete=models.CASCADE, related_name='passed_entries')
    major_combination = models.ForeignKey('programs.MajorCombination', on_delete=models.CASCADE, related_name='passed_candidates')
    reason            = models.TextField(blank=True, default='')
    approved_by       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_passes')

    class Meta:
        db_table    = 'passed_candidate'
        constraints = [
            models.UniqueConstraint(fields=['candidate', 'major_combination'], name='uq_passed_candidate'),
        ]


class PassedCandidateLog(models.Model):
    passed_candidate     = models.ForeignKey(PassedCandidate, on_delete=models.CASCADE, db_column='passed_candidate_id')
    candidate_id         = models.UUIDField()
    major_combination_id = models.IntegerField()
    reason               = models.TextField(blank=True, default='')
    approved_by_id       = models.UUIDField(null=True, blank=True)
    action               = models.CharField(max_length=10, choices=ActionsChoices.choices)
    field_changed        = models.CharField(max_length=500, null=True, blank=True)
    create_date          = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'passed_candidate_log'
