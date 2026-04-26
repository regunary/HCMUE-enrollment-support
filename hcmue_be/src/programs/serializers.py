from rest_framework import serializers

from core.choices import ScoreTypeChoices
from src.programs.models import Subject, SubjectCombination


class ImportFileSerializer(serializers.Serializer):
    """
    Validate multipart import uploads.

    Fields:
        file: Uploaded Excel file passed to the import service.
    """

    file = serializers.FileField(required=True)


class CombinationSubjectInputSerializer(serializers.Serializer):
    """
    Validate one subject row in a manual combination form.

    Fields:
        score_type: Score source selected from ScoreTypeChoices.
        subject_id: Subject.id selected from subject master data.
        weight: Subject weight used by the combination scoring formula.
    """

    score_type = serializers.ChoiceField(choices=ScoreTypeChoices.choices)
    subject_id = serializers.CharField(max_length=10)
    weight = serializers.DecimalField(max_digits=5, decimal_places=3, min_value=0)

    def validate_subject_id(self, value):
        """
        Ensure selected subject exists.

        Args:
            value: Subject id selected by the operator.

        Returns:
            Trimmed Subject.id.
        """

        subject_id = value.strip()
        if not Subject.objects.filter(id=subject_id).exists():
            raise serializers.ValidationError('Môn học không tồn tại.')
        return subject_id


class CombinationManualSerializer(serializers.Serializer):
    """
    Validate manual subject-combination create/update payloads.

    Fields:
        id: Combination code, required on create and immutable on update.
        name: Optional display name.
        subjects: Replace-all list of subject rows for this combination.
    """

    id = serializers.CharField(required=False, max_length=20)
    name = serializers.CharField(required=False, allow_blank=True, max_length=100)
    subjects = CombinationSubjectInputSerializer(many=True, required=False)

    def validate_id(self, value):
        """
        Normalize the combination code before uniqueness checks.

        Args:
            value: Combination code from request body.

        Returns:
            Trimmed combination code.
        """

        return value.strip()

    def validate(self, attrs):
        """
        Validate create/update rules and duplicate subject rows.

        Args:
            attrs: Field-level validated data from DRF.

        Returns:
            Validated attrs when cross-field checks pass.
        """

        errors = {}
        instance = self.context.get('combination')
        is_create = instance is None
        if is_create and not attrs.get('id'):
            errors['id'] = ['Mã tổ hợp là bắt buộc.']
        if is_create and attrs.get('id') and SubjectCombination.objects.filter(id=attrs['id']).exists():
            errors['id'] = ['Mã tổ hợp đã tồn tại.']
        if not is_create and 'id' in attrs and attrs['id'] != instance.id:
            errors['id'] = ['Không được thay đổi mã tổ hợp.']

        seen_subjects = set()
        total_weight = 0
        for index, row in enumerate(attrs.get('subjects', [])):
            subject_id = row['subject_id']
            if subject_id in seen_subjects:
                errors[f'subjects.{index}'] = ['Trùng môn trong tổ hợp.']
            seen_subjects.add(subject_id)
            total_weight += row['weight']
        if 'subjects' in attrs and total_weight <= 0:
            errors['subjects'] = ['Tổng trọng số phải lớn hơn 0.']

        if errors:
            raise serializers.ValidationError(errors)
        return attrs
