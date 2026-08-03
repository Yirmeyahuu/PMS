import json
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.accounts.models import User
from django.core.cache import cache

class LoginThrottlingTests(APITestCase):
    def setUp(self):
        self.login_url = '/api/auth/login/'
        self.user = User.objects.create_user(
            email='test@example.com',
            password='Password123!',
            first_name='Test',
            last_name='User'
        )
        self.user2 = User.objects.create_user(
            email='test2@example.com',
            password='Password123!',
            first_name='Test2',
            last_name='User2'
        )
        # Ensure cache is clean before tests
        cache.clear()

    def test_normal_login(self):
        """TEST 1 — Normal Login"""
        response = self.client.post(self.login_url, {
            'email': 'test@example.com',
            'password': 'Password123!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)

    def test_invalid_login(self):
        """TEST 2 — Invalid Login (Generic error)"""
        response = self.client.post(self.login_url, {
            'email': 'test@example.com',
            'password': 'WrongPassword123!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data['detail'], 'Invalid email or password')

    def test_repeated_failed_attempts(self):
        """TEST 3 — Repeated Failed Attempts"""
        # Fail 5 times
        for _ in range(5):
            response = self.client.post(self.login_url, {
                'email': 'test@example.com',
                'password': 'WrongPassword123!'
            }, format='json')
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # 6th attempt should be throttled
        response = self.client.post(self.login_url, {
            'email': 'test@example.com',
            'password': 'WrongPassword123!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(response.data['detail'], 'Too many login attempts. Please wait a few minutes before trying again.')

    def test_different_users(self):
        """TEST 6 — Different Users"""
        # Fail 5 times for User 1
        for _ in range(5):
            self.client.post(self.login_url, {
                'email': 'test@example.com',
                'password': 'WrongPassword123!'
            }, format='json')

        # User 1 is throttled
        response = self.client.post(self.login_url, {
            'email': 'test@example.com',
            'password': 'Password123!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

        # User 2 logs in successfully from the same IP
        response = self.client.post(self.login_url, {
            'email': 'test2@example.com',
            'password': 'Password123!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)

    def test_successful_login_resets_counter(self):
        """TEST 5 — Successful Login"""
        # Fail 3 times
        for _ in range(3):
            self.client.post(self.login_url, {
                'email': 'test@example.com',
                'password': 'WrongPassword123!'
            }, format='json')
            
        # Log in successfully
        response = self.client.post(self.login_url, {
            'email': 'test@example.com',
            'password': 'Password123!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Fail 3 times again
        for _ in range(3):
            resp2 = self.client.post(self.login_url, {
                'email': 'test@example.com',
                'password': 'WrongPassword123!'
            }, format='json')
            self.assertEqual(resp2.status_code, status.HTTP_401_UNAUTHORIZED)
            
        # If it wasn't reset, this would be the 6th fail and we would get 429
        # But since it was reset, we still get 401
