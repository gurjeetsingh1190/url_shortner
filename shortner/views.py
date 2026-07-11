from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse
from .forms import URLForm
from .models import URL


def home(request):
    if request.method == 'POST':
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            form = URLForm(request.POST)
            if form.is_valid():
                url_obj = form.save()
                short_url = request.build_absolute_uri(f'/{url_obj.short_code}/')
                return JsonResponse({
                    'success': True,
                    'short_url': short_url,
                    'original_url': url_obj.original_url,
                    'short_code': url_obj.short_code,
                    'clicks': url_obj.clicks,
                })
            else:
                errors = [v[0] for k, v in form.errors.items()]
                return JsonResponse({'success': False, 'error': errors[0] if errors else 'Invalid URL'}, status=400)
        else:
            form = URLForm(request.POST)
            if form.is_valid():
                form.save()
                return redirect('home')

    form = URLForm()
    recent_urls = URL.objects.all().order_by('-created_at')
    for u in recent_urls:
        u.absolute_short_url = request.build_absolute_uri(f'/{u.short_code}/')

    return render(request, 'home.html', {'form': form, 'recent_urls': recent_urls})


def redirect_url(request, short_code):
    url_obj = get_object_or_404(URL, short_code=short_code)
    url_obj.clicks += 1
    url_obj.save()
    return redirect(url_obj.original_url)
