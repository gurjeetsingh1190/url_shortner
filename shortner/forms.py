from django import forms
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