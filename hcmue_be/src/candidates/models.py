import uuid
from django.db import models
from core.base_model import AuditModel
from core.choices import ActionsChoices, ScoreTypeChoices


class Candidate(AuditModel):
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cccd             = models.CharField(max_length=12, unique=True)
    ticket_number    = models.CharField(max_length=20, unique=True, null=True, blank=True)
    graduation_year  = models.PositiveSmallIntegerField(null=True, blank=True)
    academic_level   = models.CharField(max_length=1, null=True, blank=True)  # 0=Khá, 1=Giỏi
    graduation_score = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    import_batch     = models.ForeignKey('imports.ImportBatch', on_delete=models.SET_NULL, null=True, blank=True, related_name='candidates')
    is_deleted       = models.BooleanField(default=False)
    deleted_at       = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'candidate'
        indexes  = [
            models.Index(fields=['cccd']),
            models.Index(fields=['ticket_number']),
        ]


class CandidateLog(models.Model):
    candidate        = models.ForeignKey(Candidate, on_delete=models.CASCADE, db_column='candidate_id')
    cccd             = models.CharField(max_length=12)
    ticket_number    = models.CharField(max_length=20, null=True, blank=True)
    graduation_year  = models.PositiveSmallIntegerField(null=True, blank=True)
    academic_level   = models.CharField(max_length=1, null=True, blank=True)
    graduation_score = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    import_batch_id  = models.UUIDField(null=True, blank=True)
    is_deleted       = models.BooleanField()
    deleted_at       = models.DateTimeField(null=True, blank=True)
    action           = models.CharField(max_length=10, choices=ActionsChoices.choices)
    field_changed    = models.CharField(max_length=500, null=True, blank=True)
    create_date      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'candidate_log'


class RegionPriority(AuditModel):
    candidate    = models.OneToOneField(Candidate, on_delete=models.CASCADE, related_name='region_priority')
    region_code  = models.CharField(max_length=5)   # 1, 2, 2NT, 3
    special_code = models.CharField(max_length=10, null=True, blank=True)
    bonus_score  = models.DecimalField(max_digits=4, decimal_places=2, default=0)

    class Meta:
        db_table = 'region_priority'


class RegionPriorityLog(models.Model):
    region_priority = models.ForeignKey(RegionPriority, on_delete=models.CASCADE, db_column='region_priority_id')
    candidate_id    = models.UUIDField()
    region_code     = models.CharField(max_length=5)
    special_code    = models.CharField(max_length=10, null=True, blank=True)
    bonus_score     = models.DecimalField(max_digits=4, decimal_places=2)
    action          = models.CharField(max_length=10, choices=ActionsChoices.choices)
    field_changed   = models.CharField(max_length=500, null=True, blank=True)
    create_date     = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'region_priority_log'


class ScoreBoard(AuditModel):
    candidate  = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='score_boards')
    score_type = models.CharField(max_length=10, choices=ScoreTypeChoices.choices)

    class Meta:
        db_table        = 'score_board'
        unique_together = [('candidate', 'score_type')]
        indexes         = [models.Index(fields=['candidate'])]


class ScoreBoardLog(models.Model):
    score_board   = models.ForeignKey(ScoreBoard, on_delete=models.CASCADE, db_column='score_board_id')
    candidate_id  = models.UUIDField()
    score_type    = models.CharField(max_length=10, choices=ScoreTypeChoices.choices)
    action        = models.CharField(max_length=10, choices=ActionsChoices.choices)
    field_changed = models.CharField(max_length=500, null=True, blank=True)
    create_date   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'score_board_log'


class SubjectScore(AuditModel):
    score_board = models.ForeignKey(ScoreBoard, on_delete=models.CASCADE, related_name='scores')
    subject     = models.ForeignKey('programs.Subject', on_delete=models.PROTECT, related_name='scores')
    score       = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table        = 'subject_score'
        unique_together = [('score_board', 'subject')]
        indexes         = [models.Index(fields=['score_board', 'subject'])]


class SubjectScoreLog(models.Model):
    subject_score  = models.ForeignKey(SubjectScore, on_delete=models.CASCADE, db_column='subject_score_id')
    score_board_id = models.IntegerField()
    subject_id     = models.CharField(max_length=10)
    score          = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    action         = models.CharField(max_length=10, choices=ActionsChoices.choices)
    field_changed  = models.CharField(max_length=500, null=True, blank=True)
    create_date    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'subject_score_log'
