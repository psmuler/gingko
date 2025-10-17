/**
 * Pin Posting State
 * Centralised state container for the pin-posting workflow.
 * Modules should import { pinState } and mutate properties intentionally
 * to keep the overall architecture predictable.
 */

export const pinState = {
    inlineFormContainer: null,
    isInlineFormVisible: false,
    currentPinLocation: null,
    currentEditingHaiku: null,
    touchStartY: 0,
    touchStartTime: 0,
    temporaryPin: null,
    temporaryPinTimeout: null,
    temporaryPinState: {
        pin: null,
        isCreating: false,
        isRemoving: false,
        timeout: null,
        location: null,
        lastUpdate: 0
    },
    mapClickDebounceTimeout: null,
    lastMapClickTime: 0,
    haikuDataCache: [],
    pinCacheLastUpdated: 0,
    PIN_CACHE_REFRESH_INTERVAL: 60000,
    formState: {
        isVisible: false,
        hasUnsavedData: false,
        lastInputTime: 0,
        inputData: {},
        autoSaveInterval: null
    },
    isSubmittingHaiku: false
};

export function resetFormState() {
    const { formState } = pinState;
    formState.isVisible = false;
    formState.hasUnsavedData = false;
    formState.lastInputTime = 0;
    formState.inputData = {};

    if (formState.autoSaveInterval) {
        clearInterval(formState.autoSaveInterval);
        formState.autoSaveInterval = null;
    }

    localStorage.removeItem('haiku_draft_backup');
}

export function resetTemporaryPinSnapshot() {
    const { temporaryPinState } = pinState;

    if (temporaryPinState.timeout) {
        clearTimeout(temporaryPinState.timeout);
        temporaryPinState.timeout = null;
    }

    temporaryPinState.pin = null;
    temporaryPinState.isCreating = false;
    temporaryPinState.isRemoving = false;
    temporaryPinState.location = null;
    temporaryPinState.lastUpdate = 0;
}

export function clearInlineFormMetadata() {
    const form = document.getElementById('inline-haiku-form');
    if (!form) return;

    delete form.dataset.locationType;
    delete form.dataset.locationName;
    delete form.dataset.status;
    delete form.dataset.originalSeason;
    delete form.dataset.originalSeasonalTerm;
}
