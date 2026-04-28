from rest_framework import serializers

from core.choices import ScoreTypeChoices
from src.programs.models import Subject
from src.candidates.models import Candidate, PriorityObject, Region


class ImportFileSerializer(serializers.Serializer):
    """
    Validate multipart import uploads.

    Fields:
        file: Uploaded Excel file passed to the import service.
    """

    file = serializers.FileField(required=True)


class RegionSerializer(serializers.ModelSerializer):
    """
    Validate and serialize manually managed region master data.

    Fields:
        code: Region code used by candidate region_priority.region_code.
        bonus_score: Priority score copied to RegionPriority during candidate entry.
    """

    class Meta:
        model = Region
        fields = ['code', 'bonus_score']

    def validate_code(self, value):
        """
        Normalize the region code before uniqueness validation.

        Args:
            value: Raw region code from the request body.

        Returns:
            Trimmed region code.
        """

        return value.strip()


class PriorityObjectSerializer(serializers.ModelSerializer):
    """
    Validate and serialize manually managed priority object master data.

    Fields:
        code: Priority object code used by candidate region_priority.special_code.
        bonus_score: Priority score copied to RegionPriority during candidate entry.
    """

    class Meta:
        model = PriorityObject
        fields = ['code', 'bonus_score']

    def validate_code(self, value):
        """
        Normalize the priority object code before uniqueness validation.

        Args:
            value: Raw priority object code from the request body.

        Returns:
            Trimmed priority object code.
        """

        return value.strip()


class RegionPriorityInputSerializer(serializers.Serializer):
    """
    Validate candidate priority-region input.

    Fields:
        region_code: Optional Region.code selected by the operator.
        special_code: Optional free-text priority group code from field DT.
    """

    region_code = serializers.CharField(required=False, allow_blank=True, max_length=20)
    special_code = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=10)

    def validate_region_code(self, value):
        """
        Ensure selected region exists in Region master data.

        Args:
            value: Region code selected by the operator.

        Returns:
            Trimmed region code, or an empty string when no region was selected.
        """

        code = value.strip()
        if code and not Region.objects.filter(code=code, is_deleted=False).exists():
            raise serializers.ValidationError('Khu vực không tồn tại.')
        return code

    def validate_special_code(self, value):
        """
        Ensure selected priority object exists in PriorityObject master data.

        Args:
            value: Priority object code selected by the operator.

        Returns:
            Trimmed priority object code, or an empty string when no object was selected.
        """

        code = value.strip() if value else ''
        if code and not PriorityObject.objects.filter(code=code, is_deleted=False).exists():
            raise serializers.ValidationError('Đối tượng ưu tiên không tồn tại.')
        return code


class ScoreInputSerializer(serializers.Serializer):
    """
    Validate one dynamic score row from the manual candidate form.

    Fields:
        score_type: Admission score source selected from ScoreTypeChoices.
        subject_id: Subject.id selected from subject master data.
        score: Optional score value for the selected source and subject.
    """

    score_type = serializers.ChoiceField(choices=ScoreTypeChoices.choices)
    subject_id = serializers.CharField(max_length=10)
    score = serializers.DecimalField(max_digits=6, decimal_places=2, min_value=0, required=False, allow_null=True)

    def validate_subject_id(self, value):
        """
        Ensure selected subject exists in subject master data.

        Args:
            value: Subject id selected by the operator.

        Returns:
            Trimmed subject id.
        """

        subject_id = value.strip()
        if not Subject.objects.filter(id=subject_id).exists():
            raise serializers.ValidationError('Môn học không tồn tại.')
        return subject_id

    def validate(self, attrs):
        """
        Validate score range with the scale used by the selected score type.

        Args:
            attrs: Field-level validated score row data.

        Returns:
            Validated score row when its value fits the selected score type.
        """

        score = attrs.get('score')
        score_type = attrs.get('score_type')
        max_score = 10
        if score is not None and score > max_score:
            raise serializers.ValidationError({'score': [f'Điểm {score_type} phải trong khoảng 0..{max_score}.']})
        return attrs


class CandidateManualSerializer(serializers.Serializer):
    """
    Validate manual candidate create/update payloads.

    Fields:
        cccd: Candidate citizen id, required on create and immutable on update.
        graduation_year: Optional graduation year.
        academic_level: Optional grade-12 academic level; only 0 or 1 is accepted.
        graduation_score: Optional graduation score in the 0..10 range.
        region_priority: Optional nested region priority input.
        scores: Optional replace-all list of dynamic score rows.
    """

    cccd = serializers.CharField(required=False, max_length=12)
    graduation_year = serializers.IntegerField(required=False, allow_null=True, min_value=1900, max_value=2200)
    academic_level = serializers.ChoiceField(choices=[('0', 'Khá'), ('1', 'Giỏi')], required=False, allow_null=True)
    graduation_score = serializers.DecimalField(max_digits=4, decimal_places=2, min_value=0, max_value=10, required=False, allow_null=True)
    region_priority = RegionPriorityInputSerializer(required=False, allow_null=True)
    scores = ScoreInputSerializer(many=True, required=False)

    def validate_cccd(self, value):
        """
        Validate CCCD format before database uniqueness checks.

        Args:
            value: Candidate CCCD from the request body.

        Returns:
            Trimmed CCCD string.
        """

        cccd = value.strip()
        if not cccd.isdigit() or len(cccd) != 12:
            raise serializers.ValidationError('CCCD phải đúng 12 chữ số.')
        return cccd

    def validate(self, attrs):
        """
        Validate cross-field create/update rules.

        Args:
            attrs: Field-level validated data from DRF.

        Returns:
            Validated attrs when cross-field checks pass.
        """

        errors = {}
        instance = self.context.get('candidate')
        is_create = instance is None
        if is_create and not attrs.get('cccd'):
            errors['cccd'] = ['CCCD là bắt buộc.']
        if is_create and attrs.get('cccd') and Candidate.objects.filter(cccd=attrs['cccd']).exists():
            errors['cccd'] = ['CCCD đã tồn tại.']
        if not is_create and 'cccd' in attrs and attrs['cccd'] != instance.cccd:
            errors['cccd'] = ['Không được thay đổi CCCD.']

        seen_scores = set()
        for index, score in enumerate(attrs.get('scores', [])):
            key = (score['score_type'], score['subject_id'])
            if key in seen_scores:
                errors[f'scores.{index}'] = ['Trùng score_type và subject_id.']
            seen_scores.add(key)

        if errors:
            raise serializers.ValidationError(errors)
        return attrs
