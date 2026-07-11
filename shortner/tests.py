from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from .models import URL
from .forms import URLForm


class URLShortenerTests(TestCase):
    def setUp(self):
        self.user_a = User.objects.create_user(username="usera", password="passworda")
        self.user_b = User.objects.create_user(username="userb", password="passwordb")
        self.url = URL.objects.create(
            original_url="https://www.youtube.com",
            short_code="yt12"
        )

    def test_url_model_saves_with_clicks_zero(self):
        """Verify new URLs start with 0 clicks."""
        self.assertEqual(self.url.clicks, 0)
        self.assertIsNotNone(self.url.short_code)

    def test_homepage_loads_successfully(self):
        """Verify the homepage renders the shortening form successfully."""
        response = self.client.get(reverse('home'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'id="shorten-form"')

    def test_ajax_shorten_url(self):
        """Verify shortening a URL via AJAX works and returns JSON."""
        response = self.client.post(
            reverse('home'),
            {'original_url': 'https://github.com'},
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['original_url'], 'https://github.com')
        self.assertEqual(data['clicks'], 0)
        
        db_url = URL.objects.get(short_code=data['short_code'])
        self.assertEqual(db_url.original_url, 'https://github.com')

    def test_redirect_and_click_increment(self):
        """Verify redirections redirect and increment the clicks counter."""
        self.assertEqual(self.url.clicks, 0)
        
        response = self.client.get(reverse('redirect', args=[self.url.short_code]))
        
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, "https://www.youtube.com")
        
        self.url.refresh_from_db()
        self.assertEqual(self.url.clicks, 1)

    def test_authenticated_user_shortens_url(self):
        """Verify URLs shortened by logged-in users link to their account."""
        self.client.login(username="usera", password="passworda")
        response = self.client.post(
            reverse('home'),
            {'original_url': 'https://google.com'},
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        db_url = URL.objects.get(short_code=data['short_code'])
        self.assertEqual(db_url.user, self.user_a)

    def test_dashboard_isolates_user_urls(self):
        """Verify User A's dashboard displays only User A's links."""
        url_a = URL.objects.create(original_url="https://google.com/usera", user=self.user_a, short_code="ua12")
        url_b = URL.objects.create(original_url="https://google.com/userb", user=self.user_b, short_code="ub12")
        
        # Log in User A
        self.client.login(username="usera", password="passworda")
        response = self.client.get(reverse('dashboard'))
        
        self.assertEqual(response.status_code, 200)
        # Should contain User A's URL but not User B's
        self.assertContains(response, "https://google.com/usera")
        self.assertNotContains(response, "https://google.com/userb")

    def test_user_signup_flow(self):
        """Verify user signup creates account and redirects to login."""
        response = self.client.post(reverse('signup'), {
            'username': 'newuser',
            'password1': 'newpassword123',
            'password2': 'newpassword123'
        })
        # Check redirect on success
        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, reverse('login'))
        self.assertTrue(User.objects.filter(username='newuser').exists())

    def test_url_protocol_validation(self):
        """Verify URL validation blocks non-http/https protocols."""
        form_data = {'original_url': 'javascript:alert(1)'}
        form = URLForm(data=form_data)
        self.assertFalse(form.is_valid())
        self.assertIn('original_url', form.errors)
        
        # Test valid url
        form_data = {'original_url': 'https://google.com'}
        form = URLForm(data=form_data)
        self.assertTrue(form.is_valid())

    def test_ajax_create_qr_only_url(self):
        """Verify direct QR creation via AJAX works and flags the model."""
        response = self.client.post(
            reverse('home'),
            {
                'original_url': 'https://github.com/django',
                'is_qr_only': 'true'
            },
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertTrue(data['is_qr_only'])
        
        db_url = URL.objects.get(original_url='https://github.com/django')
        self.assertTrue(db_url.is_qr_only)

    def test_dashboard_renders_qr_only_label(self):
        """Verify QR-only URLs display the correct text in the dashboard."""
        URL.objects.create(
            original_url="https://google.com/qronly",
            is_qr_only=True,
            short_code="qrxx",
            user=self.user_a
        )
        self.client.login(username="usera", password="passworda")
        response = self.client.get(reverse('dashboard'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "QR Code Only")
        self.assertNotContains(response, "/qrxx/")

    def test_dashboard_redirects_anonymous_user(self):
        """Verify dashboard view redirects anonymous users to login."""
        response = self.client.get(reverse('dashboard'))
        self.assertEqual(response.status_code, 302)
        self.assertIn(reverse('login'), response.url)

    def test_dashboard_renders_statistics(self):
        """Verify the dashboard displays correct metrics sums."""
        URL.objects.create(original_url="https://google.com/link1", user=self.user_a, short_code="l1xx", clicks=10)
        URL.objects.create(original_url="https://google.com/link2", user=self.user_a, short_code="l2xx", clicks=5)
        URL.objects.create(original_url="https://google.com/qr1", user=self.user_a, short_code="qr1x", is_qr_only=True)
        
        self.client.login(username="usera", password="passworda")
        response = self.client.get(reverse('dashboard'))
        self.assertEqual(response.status_code, 200)
        
        self.assertContains(response, "<h4>Total Links</h4><p>2</p>", html=True)
        self.assertContains(response, "<h4>Total Clicks</h4><p>15</p>", html=True)
        self.assertContains(response, "<h4>QR Codes Created</h4><p>1</p>", html=True)
