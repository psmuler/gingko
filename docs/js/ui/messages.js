import { appState } from '../core/app-state.js';

function ensureMessageContainer() {
    let container = document.querySelector('.global-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'global-toast-container';
        document.body.appendChild(container);
    }
    return container;
}

export function showLoadingState(message = '読み込み中...') {
    if (appState.isLoading) return;

    appState.isLoading = true;

    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <div class="loading-message">${message}</div>
        </div>
    `;

    document.body.appendChild(overlay);
}

export function hideLoadingState() {
    appState.isLoading = false;
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}

export function showErrorMessage(message) {
    showMessage(message, 'error');
}

export function showInfoMessage(message) {
    showMessage(message, 'info');
}

export function showSuccessMessage(message) {
    showMessage(message, 'success');
}

export function showMessage(message, type = 'info') {
    const container = ensureMessageContainer();

    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}
