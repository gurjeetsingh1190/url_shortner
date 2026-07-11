from django import forms
# pyrefly: ignore [missing-import]
from .models import URL


class URLForm(forms.ModelForm):
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