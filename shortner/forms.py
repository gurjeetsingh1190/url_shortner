from django import forms
# pyrefly: ignore [missing-import]
from .models import URL


class URLForm(forms.ModelForm):
    custom_code = forms.CharField(
        max_length=50, 
        required=False,
        label='Custom Alias (Optional)',
        widget=forms.TextInput(attrs={
            'placeholder': 'e.g. my-custom-link',
            'class': 'glass-input'
        })
    )
    title = forms.CharField(
        max_length=100, 
        required=False,
        label='Bookmark Title (Optional)',
        widget=forms.TextInput(attrs={
            'placeholder': 'e.g. Google Docs',
            'class': 'glass-input'
        })
    )
    password = forms.CharField(
        max_length=50,
        required=False,
        label='Password Protect (Optional)',
        widget=forms.PasswordInput(attrs={
            'placeholder': 'Enter a secret password',
            'class': 'glass-input'
        })
    )
    expires_at = forms.DateTimeField(
        required=False,
        label='Expiration Date (Optional)',
        widget=forms.DateTimeInput(attrs={
            'type': 'datetime-local',
            'class': 'glass-input'
        })
    )

    class Meta:
        model = URL
        fields = ['original_url']
        labels = {'original_url': 'Enter URL'}
        widgets = {
            'original_url': forms.URLInput(attrs={
                'placeholder': 'https://example.com/very-long-url',
                'class': 'url-input',
            })
        }

    def clean_original_url(self):
        url = self.cleaned_data.get('original_url')
        if url and not (url.startswith('http://') or url.startswith('https://')):
            raise forms.ValidationError("URL must start with http:// or https://")
        return url

    def clean_custom_code(self):
        custom_code = self.cleaned_data.get('custom_code')
        if custom_code:
            if URL.objects.filter(short_code=custom_code).exists():
                raise forms.ValidationError(f"The alias '{custom_code}' is already taken.")
            import re
            if not re.match(r'^[\w-]+$', custom_code):
                raise forms.ValidationError("Alias can only contain letters, numbers, hyphens, and underscores.")
        return custom_code