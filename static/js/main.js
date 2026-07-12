document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('shorten-form');
    const urlInput = document.getElementById('url-input');
    const customInput = document.getElementById('custom-input');
    const titleInput = document.getElementById('title-input');
    const passwordInput = document.getElementById('password-input');
    const expiresInput = document.getElementById('expires-input');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = document.getElementById('btn-text');
    const qrSubmitBtn = document.getElementById('qr-submit-btn');
    const qrBtnText = document.getElementById('qr-btn-text');
    const recentTableBody = document.getElementById('recent-table-body');
    const noDataRow = document.getElementById('no-data-row');

    // Result Card Elements
    const resultCard = document.getElementById('result-card');
    const resultLink = document.getElementById('result-link');
    const copyResultBtn = document.getElementById('copy-result-btn');
    const qrResultBtn = document.getElementById('qr-result-btn');

    // QR Modal elements
    const qrModal = document.getElementById('qr-modal');
    const qrImage = document.getElementById('qr-image');
    const qrLink = document.getElementById('qr-link');
    const closeModalBtn = document.getElementById('close-modal');
    const downloadQrBtn = document.getElementById('download-qr-btn');

    // Toast Container
    const toastContainer = document.getElementById('toast-container');

    // Theme Toggle Elements
    const themeToggle = document.getElementById('theme-toggle');

    if (document.documentElement.classList.contains('light-theme')) {
        if (themeToggle) themeToggle.innerHTML = '<i class="ph ph-moon"></i>';
    } else {
        if (themeToggle) themeToggle.innerHTML = '<i class="ph ph-sun"></i>';
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isLight = document.documentElement.classList.toggle('light-theme');
            if (isLight) {
                themeToggle.innerHTML = '<i class="ph ph-moon"></i>';
                localStorage.setItem('theme', 'light');
            } else {
                themeToggle.innerHTML = '<i class="ph ph-sun"></i>';
                localStorage.setItem('theme', 'dark');
            }
        });
    }

    // Convert QR Only Link to Normal Link
    window.convertToLink = function(urlId, btn) {
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Shortening...';
        btn.disabled = true;
        
        const formData = new FormData();
        formData.append('url_id', urlId);
        
        // Fallback URL hardcoded here since we can't use Django template tag in static JS
        fetch('/convert-qr/', {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            },
            body: formData
        }).then(res => res.json()).then(data => {
            if (data.success) {
                location.reload();
            } else {
                btn.innerHTML = '<i class="ph ph-link"></i> Shorten';
                btn.disabled = false;
                alert(data.error || 'Failed to convert');
            }
        }).catch(() => {
            btn.innerHTML = '<i class="ph ph-link"></i> Shorten';
            btn.disabled = false;
            alert('An error occurred.');
        });
    };

    // Show Toast Notification
    const showToast = (message, type = 'success') => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<i class="ph ${type === 'success' ? 'ph-check-circle' : 'ph-info'}"></i> <span>${message}</span>`;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 50);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    // Dynamic Add Link Row
    const addLinkBtn = document.getElementById('add-link-btn');
    const linkRowsContainer = document.getElementById('link-rows-container');

    if (addLinkBtn && linkRowsContainer) {
        addLinkBtn.addEventListener('click', () => {
            const rowCount = linkRowsContainer.querySelectorAll('.link-row').length;
            if (rowCount >= 10) {
                showToast('Maximum 10 links allowed at once.', 'error');
                return;
            }

            const newRow = document.createElement('div');
            newRow.className = 'link-row added-row';
            newRow.style.paddingTop = '1rem';
            newRow.style.borderTop = '1px solid rgba(255,255,255,0.05)';
            
            newRow.innerHTML = `
                <div style="display: flex; gap: 0.75rem; margin-bottom: 1rem; align-items: center;">
                    <div class="input-wrapper" style="flex: 1;">
                        <input type="url" name="original_url" class="glass-input url-input-field" placeholder="Paste your next long URL here..." required style="padding: 1rem 1.25rem; font-size: 1.05rem;">
                    </div>
                    <button type="button" class="remove-link-btn icon-btn tooltip-trigger" aria-label="Remove link" style="border-radius: 12px; width: 52px; height: 52px; border: 1px solid rgba(231, 76, 60, 0.3); color: #e74c3c; background: rgba(231, 76, 60, 0.05); display: flex; justify-content: center; align-items: center; cursor: pointer; transition: all 0.2s; flex-shrink: 0;">
                        <i class="ph ph-trash" style="font-size: 1.5rem;"></i>
                    </button>
                </div>
                <div class="form-row" style="margin-bottom: 1.5rem;">
                    <div style="flex: 1; visibility: hidden; pointer-events: none;">
                        <!-- Placeholder to keep layout aligned with Bookmark Title -->
                    </div>
                    <div class="input-wrapper" style="flex: 1;">
                        <input type="text" name="custom_code" class="glass-input alias-input-field" placeholder="Custom Alias (Optional)">
                    </div>
                </div>
            `;
            
            newRow.querySelector('.remove-link-btn').addEventListener('click', function() {
                newRow.remove();
            });
            
            linkRowsContainer.appendChild(newRow);
        });
    }

    const copyAllBtn = document.getElementById('copy-all-btn');
    if (copyAllBtn) {
        copyAllBtn.addEventListener('click', () => {
            const resultsList = document.getElementById('results-list');
            const links = Array.from(resultsList.querySelectorAll('a')).map(a => a.href).join('\\n');
            if (!links) return;
            
            navigator.clipboard.writeText(links).then(() => {
                const originalHtml = copyAllBtn.innerHTML;
                copyAllBtn.innerHTML = '<i class="ph ph-check"></i> Copied All';
                setTimeout(() => copyAllBtn.innerHTML = originalHtml, 2000);
            });
        });
    }


    // Copy to Clipboard Action
    window.copyToClipboard = (text, button) => {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied to clipboard!', 'success');
            if (button.innerHTML.includes('ph-copy')) {
                const originalHtml = button.innerHTML;
                button.innerHTML = '<i class="ph ph-check"></i>';
                button.classList.add('btn-copy-success');
                setTimeout(() => {
                    button.innerHTML = originalHtml;
                    button.classList.remove('btn-copy-success');
                }, 2000);
            } else {
                button.classList.add('btn-copy-success');
                button.textContent = 'Copied';
                setTimeout(() => {
                    button.classList.remove('btn-copy-success');
                    button.textContent = 'Copy';
                }, 2000);
            }
        }).catch(() => {
            showToast('Failed to copy.', 'error');
        });
    };

    // Open QR Code Modal
    window.showQRCode = (url) => {
        const encodedUrl = encodeURIComponent(url);
        qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodedUrl}`;
        if(qrLink) {
            qrLink.href = url;
            qrLink.textContent = url;
        }
        qrModal.classList.add('active');
    };

    // Close QR Code Modal
    const closeModal = () => {
        qrModal.classList.remove('active');
        setTimeout(() => qrImage.src = '', 200);
    };

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (qrModal) qrModal.addEventListener('click', (e) => {
        if (e.target === qrModal) closeModal();
    });

    if (downloadQrBtn) {
        downloadQrBtn.addEventListener('click', () => {
            const imgSrc = qrImage.src;
            if (!imgSrc) return;
            
            downloadQrBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Saving...';
            
            fetch(imgSrc)
                .then(response => response.blob())
                .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'qrcode.png';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                    showToast('QR Code saved!', 'success');
                })
                .catch(() => {
                    showToast('Failed to download.', 'error');
                })
                .finally(() => {
                    downloadQrBtn.innerHTML = '<i class="ph ph-download-simple"></i> Download PNG';
                });
        });
    }

    // Form Submission Handling
    const submitForm = (isQrOnly) => {
        const urlInputs = Array.from(document.querySelectorAll('.url-input-field')).map(input => input.value.trim());
        const aliasInputs = Array.from(document.querySelectorAll('.alias-input-field')).map(input => input.value.trim());
        
        let validUrls = [];
        let validAliases = [];
        for (let i = 0; i < urlInputs.length; i++) {
            if (urlInputs[i]) {
                validUrls.push(urlInputs[i]);
                validAliases.push(aliasInputs[i]);
            }
        }

        if (validUrls.length === 0) {
            if (form.reportValidity) {
                form.reportValidity();
            }
            return;
        }

        submitBtn.disabled = true;
        if (qrSubmitBtn) qrSubmitBtn.disabled = true;
        
        if (isQrOnly) {
            if (qrBtnText) qrBtnText.textContent = 'Creating...';
        } else {
            if (btnText) btnText.textContent = 'Shortening...';
        }

        const formData = new FormData();
        validUrls.forEach((url, i) => {
            formData.append('original_url', url);
            formData.append('custom_code', validAliases[i] || '');
        });

        if (titleInput && titleInput.value.trim()) {
            formData.append('title', titleInput.value.trim());
        }
        if (passwordInput && passwordInput.value.trim()) {
            formData.append('password', passwordInput.value.trim());
        }
        if (expiresInput && expiresInput.value.trim()) {
            formData.append('expires_at', expiresInput.value.trim());
        }
        if (isQrOnly) {
            formData.append('is_qr_only', 'true');
        }

        fetch('', {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            },
            body: formData
        })
        .then(async response => {
            const data = await response.json();
            if (response.ok && data.success) {
                showToast(isQrOnly ? 'QR Codes created!' : 'URLs shortened!', 'success');
                
                form.reset();
                if (linkRowsContainer) {
                    const extraRows = linkRowsContainer.querySelectorAll('.link-row:not(:first-child)');
                    extraRows.forEach(row => row.remove());
                }

                const resultsList = document.getElementById('results-list');
                
                if (resultsList && resultCard) {
                    resultsList.innerHTML = '';
                    
                    data.results.forEach(result => {
                        const item = document.createElement('div');
                        item.className = 'bulk-result-item';
                        item.style.cssText = 'padding: 0.75rem; background: rgba(255,255,255,0.05); border-radius: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.1);';
                        if (document.documentElement.classList.contains('light-theme')) {
                            item.style.background = 'rgba(0,0,0,0.03)';
                        }
                        
                        let actionsHtml = '';
                        if (data.is_qr_only) {
                            actionsHtml = `
                                <button type="button" class="icon-btn tooltip-trigger outline-icon-btn" onclick="window.showQRCode('${result.original_url}')" aria-label="View QR" style="flex-shrink: 0; width: 32px; height: 32px;">
                                    <i class="ph ph-qr-code"></i>
                                </button>
                            `;
                        } else {
                            actionsHtml = `
                                <div style="display: flex; gap: 0.5rem;">
                                    <button type="button" class="icon-btn tooltip-trigger" onclick="window.copyToClipboard('${result.short_url}', this)" aria-label="Copy" style="flex-shrink: 0; width: 32px; height: 32px;">
                                        <i class="ph ph-copy"></i>
                                    </button>
                                    <button type="button" class="icon-btn tooltip-trigger outline-icon-btn" onclick="window.showQRCode('${result.short_url}')" aria-label="View QR" style="flex-shrink: 0; width: 32px; height: 32px;">
                                        <i class="ph ph-qr-code"></i>
                                    </button>
                                </div>
                            `;
                        }
                        
                        item.innerHTML = `
                            <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%;">
                                <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.2rem;">${result.original_url}</div>
                                ${!data.is_qr_only ? `<a href="${result.short_url}" target="_blank" style="color: var(--primary-color); text-decoration: none; font-weight: 500;">${result.short_url}</a>` : `<span style="color: var(--text-muted);">QR Code Only</span>`}
                            </div>
                            ${actionsHtml}
                        `;
                        resultsList.appendChild(item);
                    });
                    
                    if (data.is_qr_only) {
                        const copyAllBtn = document.getElementById('copy-all-btn');
                        if (copyAllBtn) copyAllBtn.style.display = 'none';
                    } else {
                        const copyAllBtn = document.getElementById('copy-all-btn');
                        if (copyAllBtn) copyAllBtn.style.display = 'flex';
                    }

                    resultCard.style.display = 'flex';
                }

                if (isQrOnly && data.results.length > 0) {
                    showQRCode(data.results[0].original_url);
                }
            } else {
                showToast(data.error || 'Failed to process URLs.', 'error');
            }
        })
        .catch(err => {
            showToast('An error occurred. Please try again.', 'error');
            console.error(err);
        })
        .finally(() => {
            submitBtn.disabled = false;
            if (qrSubmitBtn) qrSubmitBtn.disabled = false;
            if (btnText) btnText.textContent = 'Shorten URL';
            if (qrBtnText) qrBtnText.textContent = 'Create QR';
        });
    };

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            submitForm(false);
        });
    }

    if (qrSubmitBtn) {
        qrSubmitBtn.addEventListener('click', () => {
            submitForm(true);
        });
    }

    // --- Dashboard Search (Levenshtein Distance) ---
    const searchInput = document.getElementById('dashboard-search');
    const rows = document.querySelectorAll('.history-row');

    const getLevenshteinDistance = (a, b) => {
        if (!a.length) return b.length;
        if (!b.length) return a.length;
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    };

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            rows.forEach(row => {
                const alias = (row.dataset.alias || '').toLowerCase();
                const title = (row.dataset.title || '').toLowerCase();
                
                if (!query) {
                    row.style.display = '';
                    return;
                }
                // Check direct substring match first (fastest)
                if (alias.includes(query) || title.includes(query)) {
                    row.style.display = '';
                } else {
                    // Check Levenshtein for typos
                    const distanceAlias = getLevenshteinDistance(query, alias);
                    const distanceTitle = title ? getLevenshteinDistance(query, title) : Infinity;
                    
                    const minDistance = Math.min(distanceAlias, distanceTitle);
                    
                    // allow up to 2 typos if query is somewhat long
                    const maxTypos = query.length > 3 ? 2 : 1; 
                    if (minDistance <= maxTypos) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                }
            });
        });
    }

    // --- Inline Alias Editing ---
    document.querySelectorAll('.edit-alias-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            document.getElementById(`alias-display-${id}`).style.display = 'none';
            document.getElementById(`alias-edit-${id}`).style.display = 'flex';
        });
    });

    document.querySelectorAll('.cancel-alias-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            document.getElementById(`alias-edit-${id}`).style.display = 'none';
            document.getElementById(`alias-display-${id}`).style.display = 'flex';
        });
    });

    document.querySelectorAll('.save-alias-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const input = document.getElementById(`alias-input-${id}`);
            const newAlias = input.value.trim();
            const originalAlias = document.querySelector(`.edit-alias-btn[data-id="${id}"]`).dataset.shortcode;

            if (newAlias === originalAlias) {
                document.querySelector(`.cancel-alias-btn[data-id="${id}"]`).click();
                return;
            }

            const formData = new FormData();
            formData.append('url_id', id);
            formData.append('new_alias', newAlias);
            formData.append('csrfmiddlewaretoken', document.querySelector('[name=csrfmiddlewaretoken]').value);

            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';

            fetch('/edit-alias/', {
                method: 'POST',
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showToast('Alias updated successfully', 'success');
                    // Update DOM
                    const link = document.getElementById(`alias-link-${id}`);
                    link.href = data.absolute_short_url;
                    link.textContent = data.absolute_short_url;
                    document.querySelector(`.edit-alias-btn[data-id="${id}"]`).dataset.shortcode = data.new_alias;
                    input.value = data.new_alias;
                    
                    document.getElementById(`alias-edit-${id}`).style.display = 'none';
                    document.getElementById(`alias-display-${id}`).style.display = 'flex';
                    
                    // Update dataset for search
                    const row = document.querySelector(`.history-row[data-alias="${originalAlias}"]`);
                    if(row) row.dataset.alias = data.new_alias;
                } else {
                    showToast(data.error || 'Update failed', 'error');
                }
            })
            .catch(() => showToast('Server error', 'error'))
            .finally(() => {
                btn.disabled = false;
                btn.innerHTML = '<i class="ph ph-check"></i>';
            });
        });
    });
});
