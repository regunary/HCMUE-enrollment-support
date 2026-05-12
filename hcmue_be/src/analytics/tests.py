from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from core.choices import RoleChoices, ScoreTypeChoices
from src.analytics.models import PercentileSnapshot
from src.analytics.services import calculate_percentile
from src.aspirations.models import Aspiration
from src.candidates.models import Candidate, ScoreBoard, SubjectScore
from src.programs.models import CombinationSubject, Major, MajorCombination, Subject, SubjectCombination


class PercentileCalculationTests(TestCase):
    def test_calculate_percentile_uses_exclusive_position_with_interpolation(self):
        score = calculate_percentile([4, 5, 6, 6, 7, 7, 8, 8, 9, 10], 75)

        self.assertEqual(score, Decimal('8.25'))


class MajorCombinationPercentileApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username='analytics-admin',
            password='password123',
            fullname='Analytics Admin',
            role=RoleChoices.ADMIN,
        )
        self.client.force_authenticate(self.user)
        self.math = Subject.objects.create(id='TO', name='Toán')
        self.physics = Subject.objects.create(id='LI', name='Lí')
        self.chemistry = Subject.objects.create(id='HO', name='Hóa')
        self.combination = SubjectCombination.objects.create(id='A00', name='Toán Lí Hóa')
        for position, subject in enumerate([self.math, self.physics, self.chemistry], 1):
            CombinationSubject.objects.create(
                subject_combination=self.combination,
                subject=subject,
                weight=1,
                score_type=ScoreTypeChoices.THPT,
                position=position,
            )
        self.math_major = Major.objects.create(id='7140209', name='Sư phạm Toán')
        self.physics_major = Major.objects.create(id='7140211', name='Sư phạm Vật lý')
        self.math_major_combination = MajorCombination.objects.create(
            major=self.math_major,
            subject_combination=self.combination,
            score_offset=0,
        )
        self.physics_major_combination = MajorCombination.objects.create(
            major=self.physics_major,
            subject_combination=self.combination,
            score_offset=Decimal('1.00'),
        )
        self._create_candidate('012345678901', Decimal('6.00'), [self.math_major, self.physics_major])
        self._create_candidate('012345678902', Decimal('8.00'), [self.math_major, self.physics_major])
        self._create_candidate('012345678903', Decimal('10.00'), [self.math_major, self.physics_major])

    def test_recompute_percentiles_keeps_same_combination_separate_per_major_combination(self):
        response = self.client.post(
            '/api/v1/analytics/percentiles/recompute/',
            {
                'round': 1,
                'percentiles': [50],
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        math_snapshot = PercentileSnapshot.objects.get(
            major_combination=self.math_major_combination,
            percentile=50,
            round=1,
        )
        physics_snapshot = PercentileSnapshot.objects.get(
            major_combination=self.physics_major_combination,
            percentile=50,
            round=1,
        )
        self.assertEqual(math_snapshot.score, Decimal('8.00'))
        self.assertEqual(physics_snapshot.score, Decimal('9.00'))
        self.assertEqual(response.data['data'][0]['points'][0]['score'], '8.00')
        self.assertEqual(response.data['data'][1]['points'][0]['score'], '9.00')

    def test_percentile_tables_pivots_columns_by_combination_and_tables_by_major(self):
        self.client.post(
            '/api/v1/analytics/percentiles/recompute/',
            {'round': 1, 'percentiles': [50]},
            format='json',
        )

        response = self.client.get('/api/v1/analytics/percentiles/tables/?round=1&percentiles=50')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['all']['title'], 'Tất cả ngành')
        self.assertEqual(response.data['data']['all']['columns'][0]['key'], 'A00')
        self.assertEqual(response.data['data']['all']['rows'][0]['percentile'], 50)
        self.assertEqual(response.data['data']['all']['rows'][0]['values']['A00'], '8.50')
        self.assertEqual(len(response.data['data']['majors']), 2)
        math_table = response.data['data']['majors'][0]
        physics_table = response.data['data']['majors'][1]
        self.assertEqual(math_table['major_id'], '7140209')
        self.assertEqual(math_table['columns'][0]['key'], str(self.math_major_combination.id))
        self.assertEqual(math_table['columns'][0]['combination_id'], 'A00')
        self.assertEqual(math_table['rows'][0]['values'][str(self.math_major_combination.id)], '8.00')
        self.assertEqual(physics_table['major_id'], '7140211')
        self.assertEqual(physics_table['rows'][0]['values'][str(self.physics_major_combination.id)], '9.00')

    def _create_candidate(self, cccd, score, majors):
        candidate = Candidate.objects.create(cccd=cccd)
        board = ScoreBoard.objects.create(candidate=candidate, score_type=ScoreTypeChoices.THPT)
        for subject in [self.math, self.physics, self.chemistry]:
            SubjectScore.objects.create(score_board=board, subject=subject, score=score)
        for rank, major in enumerate(majors, 1):
            Aspiration.objects.create(candidate=candidate, major=major, rank=rank)
        return candidate
