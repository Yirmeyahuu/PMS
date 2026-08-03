from rest_framework.test import APITestCase
from rest_framework import status
from apps.accounts.models import User
from apps.support.models import UserFeedback

class SupportTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='reporter@test.com', 
            password='Password123!', 
            first_name='Test', 
            last_name='Reporter'
        )
        self.other_user = User.objects.create_user(
            email='other@test.com', 
            password='Password123!', 
            first_name='Other', 
            last_name='User'
        )
        
        self.admin = User.objects.create_user(
            email='admin@test.com', 
            password='Password123!', 
            first_name='Admin', 
            last_name='User'
        )
        # Assuming permissions are mocked or admin role is given in actual codebase.
        # We will test basic auth for now.

    def test_create_feedback(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/support/feedback/', {
            'type': 'BUG',
            'title': 'Test Bug',
            'description': 'Description',
            'module': 'DASHBOARD'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(UserFeedback.objects.count(), 1)

    def test_unauthenticated(self):
        response = self.client.post('/api/support/feedback/', {
            'type': 'BUG',
            'title': 'Test Bug',
            'description': 'Description',
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_view_own_feedback(self):
        feedback = UserFeedback.objects.create(submitted_by=self.user, title="My Bug")
        self.client.force_authenticate(user=self.user)
        
        response = self.client.get(f'/api/support/feedback/{feedback.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_cannot_view_others_feedback(self):
        feedback = UserFeedback.objects.create(submitted_by=self.user, title="My Bug")
        self.client.force_authenticate(user=self.other_user)
        
        response = self.client.get(f'/api/support/feedback/{feedback.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND) # Because get_queryset filters it out
