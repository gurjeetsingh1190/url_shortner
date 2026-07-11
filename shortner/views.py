from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse
from django.contrib.auth.forms import UserCreationForm
from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.db.models import Sum
from .forms import URLForm
from .models import URL


def home(request):
    if request.method == 'POST':
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            form = URLForm(request.POST)
            if form.is_valid():
                url_obj = form.save(commit=False)
                custom_code = form.cleaned_data.get('custom_code')
                title = form.cleaned_data.get('title')
                if custom_code:
                    url_obj.short_code = custom_code
                if title:
                    url_obj.title = title
                if request.user.is_authenticated:
                    url_obj.user = request.user
                if request.POST.get('is_qr_only') == 'true':
                    url_obj.is_qr_only = True
                url_obj.save()
                short_url = request.build_absolute_uri(f'/{url_obj.short_code}/')
                return JsonResponse({
                    'success': True,
                    'short_url': short_url,
                    'original_url': url_obj.original_url,
                    'short_code': url_obj.short_code,
                    'clicks': url_obj.clicks,
                    'is_qr_only': url_obj.is_qr_only,
                })
            else:
                errors = [v[0] for k, v in form.errors.items()]
                return JsonResponse({'success': False, 'error': errors[0] if errors else 'Invalid URL'}, status=400)
        else:
            form = URLForm(request.POST)
            if form.is_valid():
                url_obj = form.save(commit=False)
                custom_code = form.cleaned_data.get('custom_code')
                title = form.cleaned_data.get('title')
                if custom_code:
                    url_obj.short_code = custom_code
                if title:
                    url_obj.title = title
                if request.user.is_authenticated:
                    url_obj.user = request.user
                if request.POST.get('is_qr_only') == 'true':
                    url_obj.is_qr_only = True
                url_obj.save()
                return redirect('home')

    form = URLForm()
    return render(request, 'home.html', {'form': form, 'recent_urls': []})

@login_required
def dashboard(request):
    recent_urls = URL.objects.filter(user=request.user).order_by('-created_at')
    for u in recent_urls:
        u.absolute_short_url = request.build_absolute_uri(f'/{u.short_code}/')
    
    total_links = recent_urls.filter(is_qr_only=False).count()
    total_clicks = recent_urls.aggregate(Sum('clicks'))['clicks__sum'] or 0
    total_qrs = recent_urls.filter(is_qr_only=True).count()
    
    context = {
        'recent_urls': recent_urls,
        'total_links': total_links,
        'total_clicks': total_clicks,
        'total_qrs': total_qrs,
    }
    return render(request, 'dashboard.html', context)


def signup(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "Account created successfully! Please login below.")
            return redirect('login')
    else:
        form = UserCreationForm()
    return render(request, 'registration/signup.html', {'form': form})


def redirect_url(request, short_code):
    url_obj = get_object_or_404(URL, short_code=short_code)
    url_obj.clicks += 1
    url_obj.save()
    return redirect(url_obj.original_url)

@login_required
def edit_alias(request):
    if request.method == 'POST' and request.headers.get('x-requested-with') == 'XMLHttpRequest':
        url_id = request.POST.get('url_id')
        new_alias = request.POST.get('new_alias', '').strip()
        
        if not new_alias:
            return JsonResponse({'success': False, 'error': 'Alias cannot be empty'})
            
        url_obj = get_object_or_404(URL, id=url_id, user=request.user)
        
        if new_alias == url_obj.short_code:
            return JsonResponse({'success': True, 'new_alias': new_alias})
            
        if URL.objects.filter(short_code=new_alias).exists():
            return JsonResponse({'success': False, 'error': f"The alias '{new_alias}' is already taken."})
            
        import re
        if not re.match(r'^[\w-]+$', new_alias):
            return JsonResponse({'success': False, 'error': 'Alias can only contain letters, numbers, hyphens, and underscores.'})
            
        url_obj.short_code = new_alias
        url_obj.save()
        
        return JsonResponse({
            'success': True, 
            'new_alias': new_alias,
            'absolute_short_url': request.build_absolute_uri(f'/{new_alias}/')
        })
        
    return JsonResponse({'success': False, 'error': 'Invalid request'})
