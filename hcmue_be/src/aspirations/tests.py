from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from core.choices import RoleChoices
from src.aspirations.models import Aspiration, ExcludedCandidate
from src.candidates.models import Candidate
from src.programs.models import Major
from src.programs.tests import make_xlsx


class WishAndExclusionApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username='aspiration-admin',
            password='password123',
            fullname='Aspiration Admin',
            role=RoleChoices.ADMIN,
        )
        self.client.force_authenticate(self.user)
        self.candidate = Candidate.objects.create(cccd='012345678901')
        self.major = Major.objects.create(id='7140101', name='Su pham Toan')

    def test_import_wishes_creates_major_level_aspiration(self):
        file = make_xlsx(['CCCD', 'MaXT', 'TTNV'], [['012345678901', '7140101', 1]])

        response = self.client.post('/api/v1/wishes/import/', {'file': file}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 1)
        wish = Aspiration.objects.get()
        self.assertEqual(wish.candidate, self.candidate)
        self.assertEqual(wish.major, self.major)
        self.assertEqual(wish.rank, 1)
        self.assertIsNone(wish.computed_score)

    def test_import_exclusions_creates_excluded_candidate(self):
        file = make_xlsx(['CCCD', 'LyDo'], [['012345678901', 'Khong du dieu kien']])

        response = self.client.post('/api/v1/exclusions/import/', {'file': file}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 1)
        exclusion = ExcludedCandidate.objects.get()
        self.assertEqual(exclusion.candidate, self.candidate)
        self.assertEqual(exclusion.reason, 'Khong du dieu kien')
