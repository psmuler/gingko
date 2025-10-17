/**
 * Haiku Form Component - Reusable haiku input form
 * Base design from pin-posting.js inline form
 */

import { attachKigoSuggestionToInput, getCurrentKigoSelection } from './kigo-suggestions.js';

/**
 * Create haiku input form HTML
 * @param {Object} options - Configuration options
 * @param {string} options.formId - Form element ID
 * @param {string} options.textAreaId - Textarea element ID
 * @param {string} options.suggestionsId - Kigo suggestions container ID
 * @param {boolean} options.showPoetField - Whether to show poet name field (default: false)
 * @param {boolean} options.showHeader - Whether to show form header (default: true)
 * @param {boolean} options.showSwipeIndicator - Whether to show swipe indicator (default: false)
 * @param {string} options.submitButtonText - Submit button text (default: "投稿")
 * @param {boolean} options.showDraftButton - Whether to show draft save button (default: false)
 * @param {string} options.placeholder - Textarea placeholder
 * @param {number} options.rows - Textarea rows (default: 1)
 * @returns {string} Form HTML string
 */
export function createHaikuForm(options = {}) {
    const {
        formId = 'haiku-form',
        textAreaId = 'haiku-text',
        suggestionsId = 'kigo-suggestions',
        showPoetField = false,
        showHeader = true,
        showSwipeIndicator = false,
        submitButtonText = '投稿',
        showDraftButton = false,
        placeholder = '斧入れて香に驚くや冬木立',
        rows = 1
    } = options;

    const closeButtonHTML = showHeader ? `
        <button class="close-btn" type="button" onclick="window.closeHaikuForm && window.closeHaikuForm()" style="position: absolute; top: 10px; right: 10px; background: transparent; border: none; font-size: 24px; cursor: pointer; color: #666; z-index: 1000;">×</button>
    ` : '';

    const swipeIndicatorHTML = showSwipeIndicator ? `
        <div class="swipe-indicator"></div>
    ` : '';

    const poetFieldHTML = showPoetField ? `
        <div class="form-group">
            <label for="poet-name">詠み人</label>
            <input type="text" id="poet-name" name="poet_name" required placeholder="あなたの名前">
        </div>
    ` : '';

    return `
        ${swipeIndicatorHTML}
        ${closeButtonHTML}
        <form id="${formId}">
            <div class="form-group">
                <label for="${textAreaId}">新句</label>
                <textarea id="${textAreaId}" name="haiku_text" required
                          placeholder="${placeholder}" rows="${rows}"></textarea>
            </div>

            <!-- Kigo suggestions area -->
            <div class="kigo-section">
                <div id="${suggestionsId}" class="kigo-suggestions">
                    <!-- Dynamically generated kigo buttons -->
                </div>
            </div>

            ${poetFieldHTML}

            <!-- Hidden fields for kigo data -->
            <input type="hidden" id="inline-season" name="season">
            <input type="hidden" id="inline-seasonal-term" name="seasonal_term">
            <input type="hidden" id="inline-keyword-id" name="keyword_id">

            <div class="form-actions">
                ${showDraftButton ? `
                <button type="button" class="secondary-btn draft-btn" id="${formId}-draft-btn">
                    下書き保存
                </button>
                ` : ''}
                <button type="submit" class="primary-btn" id="${formId}-submit-btn">
                    ${submitButtonText}
                </button>
            </div>
        </form>
    `;
}

/**
 * Initialize kigo suggestion feature for a form
 * @param {string} textAreaId - Textarea element ID
 * @param {string} suggestionsId - Suggestions container ID
 * @returns {Promise<boolean>} Success status
 */
export async function initializeKigoSuggestion(textAreaId, suggestionsId) {
    try {
        if (typeof attachKigoSuggestionToInput !== 'function') {
            console.warn('⚠️ Kigo suggestion function not available');
            return false;
        }

        // Wait for DOM element to be available
        await waitForElement(textAreaId);

        const attached = attachKigoSuggestionToInput(textAreaId, suggestionsId);
        if (attached) {
            const textArea = document.getElementById(textAreaId);
            if (textArea) {
                textArea.dataset.kigoSuggestionAttached = 'true';
            }
        }
        console.log(`✅ Kigo suggestion attached: ${textAreaId} -> ${suggestionsId}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize kigo suggestion:', error);
        return false;
    }
}

/**
 * Get current kigo selection from form
 * @returns {Object} Kigo selection info
 */
export function getKigoSelection() {
    if (typeof getCurrentKigoSelection === 'function') {
        return getCurrentKigoSelection();
    }
    return { season: 'その他', selectedKigo: null, isSeasonless: false };
}

/**
 * Wait for DOM element to be available
 * @param {string} elementId - Element ID
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<HTMLElement>} Element
 */
function waitForElement(elementId, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const checkElement = () => {
            const element = document.getElementById(elementId);
            if (element) {
                resolve(element);
            } else if (Date.now() - startTime > timeout) {
                reject(new Error(`Element ${elementId} not found within ${timeout}ms`));
            } else {
                setTimeout(checkElement, 50);
            }
        };

        checkElement();
    });
}

/**
 * Setup form close handlers
 * @param {string} containerId - Container element ID
 * @param {Function} closeCallback - Close callback function
 * @param {string} textAreaId - Textarea ID to check for unsaved content
 */
export function setupFormCloseHandlers(containerId, closeCallback, textAreaId = null) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`⚠️ Container ${containerId} not found`);
        return;
    }

    // Close button handler
    const closeButtons = container.querySelectorAll('.close-btn, .close-form-btn');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();

            // Check for unsaved content
            if (textAreaId) {
                const textArea = document.getElementById(textAreaId);
                if (textArea && textArea.value.trim().length > 0) {
                    // Confirm deletion of draft
                    const confirmDelete = confirm('入力中の内容を破棄しますか？');
                    if (!confirmDelete) {
                        return; // Cancel closing
                    }
                }
            }

            if (closeCallback) closeCallback();
        });
    });

    console.log(`✅ Form close handlers setup for ${containerId}`);
}

/**
 * Get form data including kigo selection
 * @param {string} formId - Form element ID
 * @returns {Object} Form data
 */
export function getHaikuFormData(formId) {
    const form = document.getElementById(formId);
    if (!form) {
        throw new Error(`Form ${formId} not found`);
    }

    const formData = new FormData(form);
    const kigoSelection = getKigoSelection();

    return {
        haiku_text: formData.get('haiku_text'),
        poet_name: formData.get('poet_name') || '詠み人知らず',
        season: kigoSelection.season || 'その他',
        seasonal_term: kigoSelection.selectedKigo?.display_name || '',
        keyword_id: kigoSelection.selectedKigo?.id || null
    };
}
