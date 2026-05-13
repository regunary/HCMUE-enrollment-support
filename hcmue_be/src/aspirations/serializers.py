from rest_framework import serializers

from src.candidates.models import Candidate
from src.programs.models import Major


class ImportFileSerializer(serializers.Serializer):
    file = serializers.FileField(required=True)


class WishManualSerializer(serializers.Serializer):
    cccd = serializers.CharField(required=False, max_length=12)
    major_id = serializers.CharField(required=False, max_length=50)
    rank = serializers.IntegerField(required=False, min_value=1)

    def validate_cccd(self, value):
        cccd = value.strip()
        if not Candidate.objects.filter(cccd=cccd, is_deleted=False).exists():
            raise serializers.ValidationError('Không tìm thấy thí sinh theo CCCD.')
        return cccd

    def validate_major_id(self, value):
        major_id = value.strip()
        if not Major.objects.filter(id=major_id).exists():
            raise serializers.ValidationError('Mã ngành không tồn tại.')
        return major_id

    def validate(self, attrs):
        errors = {}
        instance = self.context.get('wish')
        if instance is None:
            for field_name in ('cccd', 'major_id', 'rank'):
                if field_name not in attrs:
                    errors[field_name] = ['Trường này là bắt buộc.']
        if errors:
            raise serializers.ValidationError(errors)
        return attrs


class ExclusionManualSerializer(serializers.Serializer):
    cccd = serializers.CharField(required=False, max_length=12)
    reason = serializers.CharField(required=False, allow_blank=False)

    def validate_cccd(self, value):
        cccd = value.strip()
        if not Candidate.objects.filter(cccd=cccd, is_deleted=False).exists():
            raise serializers.ValidationError('Không tìm thấy thí sinh theo CCCD.')
        return cccd

    def validate(self, attrs):
        errors = {}
        instance = self.context.get('exclusion')
        if instance is None and 'cccd' not in attrs:
            errors['cccd'] = ['CCCD là bắt buộc.']
        if instance is None and 'reason' not in attrs:
            errors['reason'] = ['Lý do là bắt buộc.']
        if errors:
            raise serializers.ValidationError(errors)
        return attrs
