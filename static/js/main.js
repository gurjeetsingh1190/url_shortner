document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('shorten-form');
    const urlInput = document.getElementById('url-input');
    const customInput = document.getElementById('custom-input');
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
        const originalUrl = urlInput.value.trim();
        if (!originalUrl) {
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
        formData.append('original_url', originalUrl);
        if (customInput && customInput.value.trim()) {
            formData.append('custom_code', customInput.value.trim());
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
                showToast(isQrOnly ? 'QR Code created!' : 'URL shortened!', 'success');
                urlInput.value = '';
                if (customInput) customInput.value = '';

                // Handle Dashboard Table (if it exists)
                if (recentTableBody) {
                    if (noDataRow) noDataRow.remove();
                    const newRow = document.createElement('tr');
                    
                    let shortUrlCell = '';
                    let actionsCell = '';
                    let clicksCell = '';
                    
                    if (data.is_qr_only) {
                        shortUrlCell = `<span style="color: var(--text-muted);">QR Code Only</span>`;
                        clicksCell = `-`;
                        actionsCell = `
                            <button class="table-icon-btn tooltip-trigger" onclick="showQRCode('${data.original_url}')">
                                <i class="ph ph-qr-code"></i>
                            </button>
                        `;
                    } else {
                        shortUrlCell = `<a href="${data.short_url}" target="_blank" rel="noopener noreferrer">${data.short_url}</a>`;
                        clicksCell = `${data.clicks} clicks`;
                        actionsCell = `
                            <button class="table-icon-btn tooltip-trigger" onclick="copyToClipboard('${data.short_url}', this)">
                                <i class="ph ph-copy"></i>
                            </button>
                            <button class="table-icon-btn tooltip-trigger" onclick="showQRCode('${data.short_url}')">
                                <i class="ph ph-qr-code"></i>
                            </button>
                        `;
                    }

                    newRow.innerHTML = `
                        <td class="original-url-cell" data-label="Original">
                            <a href="${data.original_url}" target="_blank" rel="noopener noreferrer">${data.original_url}</a>
                        </td>
                        <td class="short-url-cell" data-label="Short URL">
                            ${shortUrlCell}
                        </td>
                        <td data-label="Clicks">
                            <span class="clicks-badge">${clicksCell}</span>
                        </td>
                        <td data-label="Actions">
                            <div class="actions-cell">
                                ${actionsCell}
                            </div>
                        </td>
                    `;

                    recentTableBody.insertBefore(newRow, recentTableBody.firstChild);
                }

                // Handle Home Page Result Card
                if (resultCard) {
                    if (data.is_qr_only) {
                        resultLink.textContent = "QR Code Generated";
                        resultLink.href = "#";
                        resultLink.onclick = (e) => { e.preventDefault(); showQRCode(data.original_url); };
                        copyResultBtn.style.display = 'none';
                        qrResultBtn.onclick = () => showQRCode(data.original_url);
                    } else {
                        resultLink.textContent = data.short_url;
                        resultLink.href = data.short_url;
                        resultLink.onclick = null;
                        copyResultBtn.style.display = 'flex';
                        copyResultBtn.onclick = () => copyToClipboard(data.short_url, copyResultBtn);
                        qrResultBtn.onclick = () => showQRCode(data.short_url);
                    }
                    resultCard.style.display = 'flex';
                }

                if (isQrOnly) {
                    showQRCode(data.original_url);
                }
            } else {
                showToast(data.error || 'Failed to process.', 'error');
            }
        })
        .catch(error => {
            console.error(error);
            showToast('Server connection error.', 'error');
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
});
