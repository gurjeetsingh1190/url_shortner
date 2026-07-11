from django.db import models
from django.contrib.auth.models import User
import random
import string


class URL(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='urls')
    original_url = models.URLField(max_length=2000)
    short_code = models.CharField(max_length=50, unique=True, blank=True)
    clicks = models.PositiveIntegerField(default=0)
    is_qr_only = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.short_code:
            self.short_code = self._generate_code()
        super().save(*args, **kwargs)

    def _generate_code(self):
        chars = string.ascii_letters + string.digits
        while True:
            code = ''.join(random.choices(chars, k=6))
            if not URL.objects.filter(short_code=code).exists():
                return code

    def __str__(self):
        return f"{self.short_code} -> {self.original_url}"