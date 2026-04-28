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
    candidate        = models.ForeignKey(Candidate, on_delete=models.SET_NULL, null=True, blank=True, db_column='candidate_id')
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


class Region(AuditModel):
    """
    Master data for admission priority regions imported from the KV template.

    Fields:
        code: Region code from Excel column KV.
        bonus_score: Priority score applied when a candidate references this region.
        is_deleted: Soft-delete marker for keeping historical imports auditable.
        deleted_at: Timestamp when the region was soft-deleted.
    """

    code        = models.CharField(max_length=20, primary_key=True)
    bonus_score = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    is_deleted  = models.BooleanField(default=False)
    deleted_at  = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'region'


class PriorityObject(AuditModel):
    """
    Master data for special admission priority objects imported from the DT template.

    Fields:
        code: Priority object code from Excel column DT.
        bonus_score: Priority score applied when a candidate references this object.
        is_deleted: Soft-delete marker used before hard delete logging.
        deleted_at: Timestamp copied into logs when the row is deleted.
    """

    code        = models.CharField(max_length=20, primary_key=True)
    bonus_score = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    is_deleted  = models.BooleanField(default=False)
    deleted_at  = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'priority_object'


class RegionPriority(AuditModel):
    """
    Candidate-specific priority region and special group information.

    Fields:
        candidate: Candidate that owns this priority record.
        region: Foreign key to Region, stored in the existing region_code DB column.
        priority_object: Optional foreign key to PriorityObject, stored in special_code DB column.
        bonus_score: Total priority score copied from Region and PriorityObject.

    Properties:
        region_code: Excel-facing KV code for callers that do not need the Region object.
    """

    candidate    = models.OneToOneField(Candidate, on_delete=models.CASCADE, related_name='region_priority')
    # Reuse the existing region_code DB column while enforcing Region as master data.
    region       = models.ForeignKey(Region, to_field='code', db_column='region_code', on_delete=models.PROTECT, related_name='candidate_priorities')
    priority_object = models.ForeignKey(
        PriorityObject,
        to_field='code',
        db_column='special_code',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='candidate_priorities',
    )
    bonus_score  = models.DecimalField(max_digits=4, decimal_places=2, default=0)

    @property
    def region_code(self):
        # Keep callers working with the Excel-facing KV code instead of the Region object.
        return self.region_id

    @region_code.setter
    def region_code(self, value):
        self.region_id = value

    @property
    def special_code(self):
        # Keep callers working with the Excel-facing DT code instead of the PriorityObject object.
        return self.priority_object_id

    @special_code.setter
    def special_code(self, value):
        self.priority_object_id = value

    class Meta:
        db_table = 'region_priority'


class RegionLog(models.Model):
    """
    Immutable audit snapshot for Region create/update/delete actions.

    Fields:
        region: Region row that was changed.
        code: Region code at the time of the action.
        bonus_score: Priority score at the time of the action.
        is_deleted: Soft-delete state at the time of the action.
        deleted_at: Soft-delete timestamp at the time of the action.
        action: Audit action from ActionsChoices.
        field_changed: Comma-separated list of changed fields.
        create_date: Timestamp when the log row was written.
    """

    region        = models.ForeignKey(Region, on_delete=models.SET_NULL, null=True, blank=True, db_column='region_code')
    code          = models.CharField(max_length=20)
    bonus_score   = models.DecimalField(max_digits=4, decimal_places=2)
    is_deleted    = models.BooleanField()
    deleted_at    = models.DateTimeField(null=True, blank=True)
    action        = models.CharField(max_length=10, choices=ActionsChoices.choices)
    field_changed = models.CharField(max_length=500, null=True, blank=True)
    create_date   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'region_log'


class PriorityObjectLog(models.Model):
    """
    Immutable audit snapshot for PriorityObject create/update/delete actions.

    Fields:
        priority_object: PriorityObject row that was changed.
        code: Priority object code at the time of the action.
        bonus_score: Priority object score at the time of the action.
        is_deleted: Soft-delete state at the time of the action.
        deleted_at: Soft-delete timestamp at the time of the action.
        action: Audit action from ActionsChoices.
        field_changed: Comma-separated list of changed fields.
        create_date: Timestamp when the log row was written.
    """

    priority_object = models.ForeignKey(PriorityObject, on_delete=models.SET_NULL, null=True, blank=True, db_column='priority_object_code')
    code            = models.CharField(max_length=20)
    bonus_score     = models.DecimalField(max_digits=4, decimal_places=2)
    is_deleted      = models.BooleanField()
    deleted_at      = models.DateTimeField(null=True, blank=True)
    action          = models.CharField(max_length=10, choices=ActionsChoices.choices)
    field_changed   = models.CharField(max_length=500, null=True, blank=True)
    create_date     = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'priority_object_log'


class RegionPriorityLog(models.Model):
    region_priority = models.ForeignKey(RegionPriority, on_delete=models.SET_NULL, null=True, blank=True, db_column='region_priority_id')
    candidate_id    = models.UUIDField()
    region_code     = models.CharField(max_length=20)
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
    score_board   = models.ForeignKey(ScoreBoard, on_delete=models.SET_NULL, null=True, blank=True, db_column='score_board_id')
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
    subject_score  = models.ForeignKey(SubjectScore, on_delete=models.SET_NULL, null=True, blank=True, db_column='subject_score_id')
    score_board_id = models.IntegerField()
    subject_id     = models.CharField(max_length=10)
    score          = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    action         = models.CharField(max_length=10, choices=ActionsChoices.choices)
    field_changed  = models.CharField(max_length=500, null=True, blank=True)
    create_date    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'subject_score_log'
