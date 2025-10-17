/**
 * Seasonal suggestion bridge
 * This module now delegates to the unified kigo suggestion engine instead of reimplementing
 * a separate detection flow. It keeps backward compatibility by exposing the same symbols
 * and pre-loading the shared database when the DOM is ready.
 */

import {
    initializeKigoSuggestions,
    attachKigoSuggestionToInput,
    getCurrentKigoSelection,
    resetKigoSelection,
    getKigoDatabaseStats
} from './kigo-suggestions.js';

let isInitialized = false;
const attachedInputs = new Set();

async function ensureInitialized() {
    if (isInitialized) return true;
    const result = await initializeKigoSuggestions();
    isInitialized = result !== false;
    return isInitialized;
}

export async function attachSeasonalSuggestion(inputId, containerId = 'kigo-suggestions') {
    await ensureInitialized();

    const key = `${inputId}:${containerId}`;
    if (attachedInputs.has(key)) {
        return true;
    }

    const input = document.getElementById(inputId);
    const container = document.getElementById(containerId);
    if (!input || !container) {
        return false;
    }

    if (input.dataset.kigoSuggestionAttached === 'true') {
        attachedInputs.add(key);
        return true;
    }

    const attached = attachKigoSuggestionToInput(inputId, containerId);
    if (attached) {
        attachedInputs.add(key);
        input.dataset.kigoSuggestionAttached = 'true';
    }
    return attached;
}

export async function initializeSeasonalSuggest(options = {}) {
    await ensureInitialized();

    const targets = Array.isArray(options.targets) ? options.targets : [];
    for (const target of targets) {
        if (target?.inputId && target?.containerId) {
            await attachSeasonalSuggestion(target.inputId, target.containerId);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    ensureInitialized()
        .then(() => {
            const detailInput = document.getElementById('haiku-text');
            const detailContainer = detailInput?.dataset.kigoContainer || 'kigo-suggestions';
            if (detailInput) {
                attachSeasonalSuggestion('haiku-text', detailContainer);
            }
        })
        .catch(error => {
            console.error('❌ 季語サジェスト初期化エラー:', error);
        });
});

export {
    attachKigoSuggestionToInput,
    getCurrentKigoSelection,
    resetKigoSelection,
    getKigoDatabaseStats
};
