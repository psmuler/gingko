/**
 * Modal helper utilities for showing and hiding overlay dialogs.
 */
export function showModal(content) {
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }

    const modalHTML = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                ${content}
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    setTimeout(() => {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.classList.add('active');
        }
    }, 10);
}

export function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (!modal) return;

    modal.classList.remove('active');
    setTimeout(() => {
        modal.remove();
    }, 300);
}
