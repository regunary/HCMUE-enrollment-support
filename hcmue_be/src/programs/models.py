from django.conf import settings
from django.db import models
from core.base_model import AuditModel
from core.choices import ActionsChoices, ScoreTypeChoices


class Subject(AuditModel):
    id   = models.CharField(max_length=10, primary_key=True)  # TO, VA, LI, HO…
    name = models.CharField(max_length=100)

    class Meta:
        db_table = 'subject'


class SubjectLog(models.Model):
    subject       = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True, db_column='subject_id')
    name          = models.CharField(max_length=100)
    action        = models.CharField(max_length=10, choices=ActionsChoices.choices)
    field_changed = models.CharField(max_length=500, null=True, blank=True)
    create_date   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'subject_log'


class SubjectCombination(AuditModel):
    id   = models.CharField(max_length=20, primary_key=True)  # A00, C03, A00_CB_T…
    name = models.CharField(max_length=100, blank=True, default='')

    class Meta:
        db_table = 'subject_combination'


class SubjectCombinationLog(models.Model):
    subject_combination = models.ForeignKey(SubjectCombination, on_delete=models.SET_NULL, null=True, blank=True, db_column='subject_combination_id')
    name                = models.CharField(max_length=100)
    action              = models.CharField(max_length=10, choices=ActionsChoices.choices)
    field_changed       = models.CharField(max_length=500, null=True, blank=True)
    create_date         = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'subject_combination_log'


class CombinationSubject(AuditModel):
    """
    Per-subject weight + score source for each combination.

    A00_CB_T example:
      (A00_CB_T, TO, weight=1.5, score_type=CB,   position=1)
      (A00_CB_T, LI, weight=1.0, score_type=THPT, position=2)
      (A00_CB_T, HO, weight=1.0, score_type=THPT, position=3)

    Score formula: SUM(score_i * weight_i) / SUM(weight_i)
    """
    subject_combination = models.ForeignKey(SubjectCombination, on_delete=models.CASCADE, related_name='subjects')
    subject             = models.ForeignKey(Subject, on_delete=models.PROTECT, related_name='combination_entries')
    weight              = models.DecimalField(max_digits=5, decimal_places=3, default=1)
    score_type          = models.CharField(max_length=10, choices=ScoreTypeChoices.choices, default=ScoreTypeChoices.THPT)
    position            = models.PositiveSmallIntegerField()

    class Meta:
        db_table        = 'combination_subject'
        unique_together = [('subject_combination', 'subject')]
        ordering        = ['position']
        indexes         = [
            models.Index(fields=['subject_combination']),
            models.Index(fields=['subject']),
        ]


class CombinationSubjectLog(models.Model):
    combination_subject    = models.ForeignKey(CombinationSubject, on_delete=models.SET_NULL, null=True, blank=True, db_column='combination_subject_id')
    subject_combination_id = models.CharField(max_length=20)
    subject_id             = models.CharField(max_length=10)
    weight                 = models.DecimalField(max_digits=5, decimal_places=3)
    score_type             = models.CharField(max_length=10, choices=ScoreTypeChoices.choices)
    position               = models.PositiveSmallIntegerField()
    action                 = models.CharField(max_length=10, choices=ActionsChoices.choices)
    field_changed          = models.CharField(max_length=500, null=True, blank=True)
    create_date            = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'combination_subject_log'


class Major(AuditModel):
    id    = models.CharField(max_length=10, primary_key=True)  # 7140101
    name  = models.CharField(max_length=200)
    quota = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        db_table = 'major'
        indexes  = [models.Index(fields=['id'])]


class MajorLog(models.Model):
    major         = models.ForeignKey(Major, on_delete=models.SET_NULL, null=True, blank=True, db_column='major_id')
    name          = models.CharField(max_length=200)
    quota         = models.PositiveIntegerField(null=True, blank=True)
    action        = models.CharField(max_length=10, choices=ActionsChoices.choices)
    field_changed = models.CharField(max_length=500, null=True, blank=True)
    create_date   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'major_log'


class MajorCombination(AuditModel):
    major               = models.ForeignKey(Major, on_delete=models.CASCADE, related_name='combinations')
    subject_combination = models.ForeignKey(SubjectCombination, on_delete=models.PROTECT, related_name='major_combinations')
    min_score           = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    dgnl_offset         = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    is_primary          = models.BooleanField(default=False)

    class Meta:
        db_table        = 'major_combination'
        unique_together = [('major', 'subject_combination')]
        indexes         = [
            models.Index(fields=['major']),
            models.Index(fields=['subject_combination']),
        ]


class MajorCombinationLog(models.Model):
    major_combination      = models.ForeignKey(MajorCombination, on_delete=models.SET_NULL, null=True, blank=True, db_column='major_combination_id')
    major_id               = models.CharField(max_length=10)
    subject_combination_id = models.CharField(max_length=20)
    min_score              = models.DecimalField(max_digits=5, decimal_places=2)
    dgnl_offset            = models.DecimalField(max_digits=4, decimal_places=2)
    is_primary             = models.BooleanField()
    action                 = models.CharField(max_length=10, choices=ActionsChoices.choices)
    field_changed          = models.CharField(max_length=500, null=True, blank=True)
    create_date            = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'major_combination_log'


class CutoffScore(AuditModel):
    major_combination = models.ForeignKey(MajorCombination, on_delete=models.CASCADE, related_name='cutoffs')
    cutoff            = models.DecimalField(max_digits=5, decimal_places=2)
    round             = models.PositiveSmallIntegerField(default=1)
    set_by            = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='cutoffs_set')

    class Meta:
        db_table        = 'cutoff_score'
        unique_together = [('major_combination', 'round')]


class CutoffScoreLog(models.Model):
    cutoff_score         = models.ForeignKey(CutoffScore, on_delete=models.SET_NULL, null=True, blank=True, db_column='cutoff_score_id')
    major_combination_id = models.IntegerField()
    cutoff               = models.DecimalField(max_digits=5, decimal_places=2)
    round                = models.PositiveSmallIntegerField()
    set_by_id            = models.UUIDField(null=True, blank=True)
    action               = models.CharField(max_length=10, choices=ActionsChoices.choices)
    field_changed        = models.CharField(max_length=500, null=True, blank=True)
    create_date          = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'cutoff_score_log'


class AdmissionCondition(AuditModel):
    major_combination = models.ForeignKey(MajorCombination, on_delete=models.CASCADE, related_name='conditions')
    subject           = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True, related_name='conditions')
    min_subject_score = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    min_total_score   = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    note              = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'admission_condition'


class AdmissionConditionLog(models.Model):
    admission_condition  = models.ForeignKey(AdmissionCondition, on_delete=models.SET_NULL, null=True, blank=True, db_column='admission_condition_id')
    major_combination_id = models.IntegerField()
    subject_id           = models.CharField(max_length=10, null=True, blank=True)
    min_subject_score    = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    min_total_score      = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    note                 = models.TextField(blank=True, default='')
    action               = models.CharField(max_length=10, choices=ActionsChoices.choices)
    field_changed        = models.CharField(max_length=500, null=True, blank=True)
    create_date          = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'admission_condition_log'
