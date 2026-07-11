from django.test import TestCase
from django.urls import reverse
from .models import URL


class URLShortenerTests(TestCase):
    def setUp(self):
        self.url = URL.objects.create(
            original_url="https://www.youtube.com",
            short_code="yt12"
        )

    def test_url_model_saves_with_clicks_zero(self):
        """Verify new URLs start with 0 clicks."""
        self.assertEqual(self.url.clicks, 0)
        self.assertIsNotNone(self.url.short_code)

    def test_homepage_lists_recent_urls(self):
        """Verify the homepage renders lists of recent URLs."""
        response = self.client.get(reverse('home'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "https://www.youtube.com")

    def test_ajax_shorten_url(self):
        """Verify shortening a URL via AJAX works and returns JSON."""
        # Simulated AJAX POST request
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
        
        # Verify it exists in database
        db_url = URL.objects.get(short_code=data['short_code'])
        self.assertEqual(db_url.original_url, 'https://github.com')

    def test_redirect_and_click_increment(self):
        """Verify redirections redirect and increment the clicks counter."""
        self.assertEqual(self.url.clicks, 0)
        
        # Hit redirect endpoint
        response = self.client.get(reverse('redirect', args=[self.url.short_code]))
        
        # Verify redirect status
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, "https://www.youtube.com")
        
        # Verify click count is updated in DB
        self.url.refresh_from_db()
        self.assertEqual(self.url.clicks, 1)
