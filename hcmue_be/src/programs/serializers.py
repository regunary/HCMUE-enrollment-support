from rest_framework import serializers

from core.choices import ScoreTypeChoices
from src.programs.models import Major, MajorCombination, Subject, SubjectCombination


class SubjectSerializer(serializers.ModelSerializer):
    """
    Validate and serialize subject master data.

    Fields:
        id: Subject code used by score and combination imports.
        name: Human-readable subject name.
    """

    class Meta:
        model = Subject
        fields = ['id', 'name']

    def validate_id(self, value):
        """
        Normalize the subject code before uniqueness validation.

        Args:
            value: Raw subject code from the request body.

        Returns:
            Uppercase trimmed subject code.
        """

        return value.strip().upper()


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


class MajorCombinationInputSerializer(serializers.Serializer):
    combination_id = serializers.CharField(max_length=20)
    min_score = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=0)
    score_offset = serializers.DecimalField(max_digits=4, decimal_places=2, required=False, default=0)
    is_primary = serializers.BooleanField(required=False, default=False)

    def validate_combination_id(self, value):
        combination_id = value.strip()
        if not SubjectCombination.objects.filter(id=combination_id).exists():
            raise serializers.ValidationError('Tổ hợp không tồn tại.')
        return combination_id


class MajorManualSerializer(serializers.Serializer):
    id = serializers.CharField(required=False, max_length=50)
    name = serializers.CharField(required=False, max_length=200)
    quota = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    combinations = MajorCombinationInputSerializer(many=True, required=False)

    def validate_id(self, value):
        return value.strip()

    def validate(self, attrs):
        errors = {}
        instance = self.context.get('major')
        is_create = instance is None
        if is_create and not attrs.get('id'):
            errors['id'] = ['Mã ngành là bắt buộc.']
        if is_create and attrs.get('id') and Major.objects.filter(id=attrs['id']).exists():
            errors['id'] = ['Mã ngành đã tồn tại.']
        if is_create and not attrs.get('name'):
            errors['name'] = ['Tên ngành là bắt buộc.']
        if not is_create and 'id' in attrs and attrs['id'] != instance.id:
            errors['id'] = ['Không được thay đổi mã ngành.']

        combinations = attrs.get('combinations')
        if combinations is not None:
            seen = set()
            primary_count = 0
            for index, row in enumerate(combinations):
                combination_id = row['combination_id']
                if combination_id in seen:
                    errors[f'combinations.{index}'] = ['Trùng tổ hợp trong ngành.']
                seen.add(combination_id)
                if row.get('is_primary'):
                    primary_count += 1
            if combinations and primary_count != 1:
                errors['combinations'] = ['Mỗi ngành phải có đúng một tổ hợp gốc.']
        if errors:
            raise serializers.ValidationError(errors)
        return attrs


class AdmissionConditionManualSerializer(serializers.Serializer):
    major_id = serializers.CharField(required=False, max_length=50)
    combination_id = serializers.CharField(required=False, max_length=20)
    subject_id = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=10)
    min_subject_score = serializers.DecimalField(max_digits=4, decimal_places=2, required=False, allow_null=True, min_value=0)
    min_total_score = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True, min_value=0)
    note = serializers.CharField(required=False, allow_blank=True)
    condition_json = serializers.JSONField(required=False, allow_null=True)

    def validate_major_id(self, value):
        return value.strip()

    def validate_combination_id(self, value):
        return value.strip()

    def validate_subject_id(self, value):
        subject_id = (value or '').strip()
        if subject_id and not Subject.objects.filter(id=subject_id).exists():
            raise serializers.ValidationError('Môn học không tồn tại.')
        return subject_id or None

    def validate(self, attrs):
        errors = {}
        instance = self.context.get('condition')
        is_create = instance is None
        major_id = attrs.get('major_id') or (instance.major_combination.major_id if instance else None)
        combination_id = attrs.get('combination_id') or (instance.major_combination.subject_combination_id if instance else None)
        if is_create and not major_id:
            errors['major_id'] = ['Mã ngành là bắt buộc.']
        if is_create and not combination_id:
            errors['combination_id'] = ['Mã tổ hợp là bắt buộc.']
        if major_id and combination_id and not MajorCombination.objects.filter(
            major_id=major_id,
            subject_combination_id=combination_id,
        ).exists():
            errors['combination_id'] = ['Ngành chưa có tổ hợp này.']

        has_rule = any(attrs.get(field) not in (None, '') for field in ('min_subject_score', 'min_total_score', 'note', 'condition_json'))
        if is_create and not has_rule:
            errors['condition'] = ['Cần nhập ít nhất một điều kiện.']
        if errors:
            raise serializers.ValidationError(errors)
        return attrs
