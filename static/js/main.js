document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('shorten-form');
    const urlInput = document.getElementById('url-input');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = document.getElementById('btn-text');
    const qrSubmitBtn = document.getElementById('qr-submit-btn');
    const qrBtnText = document.getElementById('qr-btn-text');
    const recentTableBody = document.getElementById('recent-table-body');
    const noDataRow = document.getElementById('no-data-row');

    // QR Modal elements
    const qrModal = document.getElementById('qr-modal');
    const qrImage = document.getElementById('qr-image');
    const qrLink = document.getElementById('qr-link');
    const closeModalBtn = document.getElementById('close-modal');
    const downloadQrBtn = document.getElementById('download-qr-btn');

    // Toast Container
    const toastContainer = document.getElementById('toast-container');



    // Show Toast Notification
    const showToast = (message, type = 'success') => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span>${message}</span>`;
        
        toastContainer.appendChild(toast);
        
        // Trigger transition
        setTimeout(() => toast.classList.add('show'), 50);
        
        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    // Copy to Clipboard Action
    window.copyToClipboard = (text, button) => {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied to clipboard!', 'success');
            button.classList.add('btn-copy-success');
            button.textContent = 'Copied';
            
            setTimeout(() => {
                button.classList.remove('btn-copy-success');
                button.textContent = 'Copy';
            }, 2000);
        }).catch(() => {
            showToast('Failed to copy.', 'error');
        });
    };

    // Open QR Code Modal
    window.showQRCode = (url) => {
        const encodedUrl = encodeURIComponent(url);
        qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodedUrl}`;
        qrLink.href = url;
        qrLink.textContent = url;
        qrModal.classList.add('active');
    };

    // Close QR Code Modal
    const closeModal = () => {
        qrModal.classList.remove('active');
        setTimeout(() => qrImage.src = '', 200);
    };

    closeModalBtn.addEventListener('click', closeModal);
    qrModal.addEventListener('click', (e) => {
        if (e.target === qrModal) closeModal();
    });

    if (downloadQrBtn) {
        downloadQrBtn.addEventListener('click', () => {
            const imgSrc = qrImage.src;
            if (!imgSrc) return;
            
            downloadQrBtn.textContent = 'Saving...';
            
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
                    downloadQrBtn.textContent = 'Download';
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
                
                if (noDataRow) {
                    noDataRow.remove();
                }

                const newRow = document.createElement('tr');
                
                let shortUrlCell = '';
                let actionsCell = '';
                let clicksCell = '';
                
                if (data.is_qr_only) {
                    shortUrlCell = `<span style="color: var(--text-muted);">QR Code Only</span>`;
                    clicksCell = `-`;
                    actionsCell = `
                        <button class="btn-icon" onclick="showQRCode('${data.original_url}')">
                            QR Code
                        </button>
                    `;
                } else {
                    shortUrlCell = `<a href="${data.short_url}" target="_blank" rel="noopener noreferrer">${data.short_url}</a>`;
                    clicksCell = `${data.clicks} clicks`;
                    actionsCell = `
                        <button class="btn-icon" onclick="copyToClipboard('${data.short_url}', this)">
                            Copy
                        </button>
                        <button class="btn-icon" onclick="showQRCode('${data.short_url}')">
                            QR Code
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

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        submitForm(false);
    });

    if (qrSubmitBtn) {
        qrSubmitBtn.addEventListener('click', () => {
            submitForm(true);
        });
    }
});
