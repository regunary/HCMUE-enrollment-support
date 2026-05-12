from rest_framework import serializers


class PercentileRecomputeSerializer(serializers.Serializer):
    round = serializers.IntegerField(required=False, min_value=1, default=1)
    percentiles = serializers.ListField(
        child=serializers.IntegerField(min_value=0, max_value=100),
        required=False,
        allow_empty=False,
        default=[10, 25, 50, 75, 90],
    )
    major_combination_id = serializers.IntegerField(required=False)


class PercentileTableQuerySerializer(serializers.Serializer):
    round = serializers.IntegerField(required=False, min_value=1, default=1)
    percentiles = serializers.CharField(required=False, default='10,25,50,75,90')

    def validate_percentiles(self, value):
        percentiles = []
        for item in value.split(','):
            item = item.strip()
            if not item:
                continue
            try:
                percentile = int(item)
            except ValueError as exc:
                raise serializers.ValidationError('Danh sách bách phân vị không hợp lệ.') from exc
            if percentile < 0 or percentile > 100:
                raise serializers.ValidationError('Bách phân vị phải trong khoảng 0..100.')
            percentiles.append(percentile)
        if not percentiles:
            raise serializers.ValidationError('Cần ít nhất một mốc bách phân vị.')
        return percentiles
