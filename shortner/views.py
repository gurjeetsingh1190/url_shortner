from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone
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
            original_urls = request.POST.getlist('original_url')
            custom_codes = request.POST.getlist('custom_code')
            title = request.POST.get('title')
            password = request.POST.get('password')
            expires_at = request.POST.get('expires_at')
            is_qr_only = request.POST.get('is_qr_only') == 'true'

            if not original_urls:
                return JsonResponse({'success': False, 'error': 'No URLs provided'}, status=400)

            if len(original_urls) > 10:
                return JsonResponse({'success': False, 'error': 'Maximum 10 URLs allowed'}, status=400)

            for i, custom_code in enumerate(custom_codes):
                if custom_code and URL.objects.filter(short_code=custom_code).exists():
                    return JsonResponse({'success': False, 'error': f'Custom alias "{custom_code}" is already taken.'}, status=400)

            results = []
            for i, original_url in enumerate(original_urls):
                original_url = original_url.strip()
                if not original_url:
                    continue
                    
                if not (original_url.startswith('http://') or original_url.startswith('https://')):
                    original_url = 'https://' + original_url

                url_obj = URL(original_url=original_url)
                if i < len(custom_codes) and custom_codes[i].strip():
                    url_obj.short_code = custom_codes[i].strip()
                if title:
                    url_obj.title = title
                if password:
                    url_obj.password = make_password(password)
                if expires_at:
                    url_obj.expires_at = expires_at
                if request.user.is_authenticated:
                    url_obj.user = request.user
                if is_qr_only:
                    url_obj.is_qr_only = True
                
                url_obj.save()
                short_url = request.build_absolute_uri(f'/{url_obj.short_code}/')
                
                results.append({
                    'original_url': url_obj.original_url,
                    'short_url': short_url,
                    'short_code': url_obj.short_code,
                    'clicks': url_obj.clicks,
                    'id': url_obj.id,
                })
                
            return JsonResponse({
                'success': True,
                'results': results,
                'is_qr_only': is_qr_only
            })
        else:
            return redirect('home')

    form = URLForm()
    return render(request, 'home.html', {'form': form})

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
    
    if url_obj.expires_at and timezone.now() > url_obj.expires_at:
        return render(request, 'shortner/expired.html', {'url_obj': url_obj})
        
    if url_obj.password:
        session_key = f'url_auth_{short_code}'
        if not request.session.get(session_key):
            if request.method == 'POST':
                entered_password = request.POST.get('password', '')
                if check_password(entered_password, url_obj.password):
                    request.session[session_key] = True
                    return redirect('redirect', short_code=short_code)
                else:
                    return render(request, 'shortner/password_prompt.html', {
                        'url_obj': url_obj, 
                        'error': 'Incorrect password.'
                    })
            return render(request, 'shortner/password_prompt.html', {'url_obj': url_obj})
            
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

@login_required
def convert_qr_to_link(request):
    if request.method == 'POST' and request.headers.get('x-requested-with') == 'XMLHttpRequest':
        url_id = request.POST.get('url_id')
        url_obj = get_object_or_404(URL, id=url_id, user=request.user)
        url_obj.is_qr_only = False
        url_obj.save()
        return JsonResponse({'success': True})
    return JsonResponse({'success': False, 'error': 'Invalid request'})
