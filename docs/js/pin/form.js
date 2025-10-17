import '../utils.js';
import { showErrorMessage, showSuccessMessage, loadHaikuData } from '../script.js';
import { apiAdapter } from '../api-adapter.js';
import { getCurrentKigoSelection, resetKigoSelection } from '../kigo-suggestions.js';
import { createHaikuForm, initializeKigoSuggestion, setupFormCloseHandlers } from '../haiku-form-component.js';
import { pinState, clearInlineFormMetadata } from './state.js';
import { removeTemporaryPinAsync, convertTemporaryPinToPermanent } from './temporary-pin.js';
import { updateHaikuInCache } from './cache.js';

const utils = window.utils || {};
const debounceFn = typeof utils.debounce === 'function' ? utils.debounce : (fn) => fn;
const saveDraftToLocal = typeof utils.saveDraftToLocal === 'function' ? utils.saveDraftToLocal : null;
const loadDraftFromLocal = typeof utils.loadDraftFromLocal === 'function' ? utils.loadDraftFromLocal : null;
const clearDraftFromLocal = typeof utils.clearDraftFromLocal === 'function' ? utils.clearDraftFromLocal : null;
const hasLocalStorageSupport = typeof utils.hasLocalStorageSupport === 'function'
    ? utils.hasLocalStorageSupport
    : () => false;

const DRAFT_STORAGE_KEY = utils.DEFAULT_DRAFT_STORAGE_KEY || 'gingko_current_draft';
const draftStorageOptions = { key: DRAFT_STORAGE_KEY };
const inlineDraftCreateContext = 'inline';
const inlineDraftEditContext = 'inline-edit';

const canUseDraftStorage = hasLocalStorageSupport();

let inlineDraftRestored = false;

function draftStorageAvailable() {
    return canUseDraftStorage && saveDraftToLocal && loadDraftFromLocal && clearDraftFromLocal;
}

function clearInlineDraftStorage() {
    if (draftStorageAvailable()) {
        clearDraftFromLocal(draftStorageOptions);
    } else {
        try {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch (error) {
            console.warn('⚠️ Failed to clear inline draft storage fallback:', error);
        }
    }
}

function loadInlineDraft() {
    if (draftStorageAvailable()) {
        return loadDraftFromLocal(draftStorageOptions);
    }

    try {
        const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        console.warn('⚠️ Failed to load inline draft fallback:', error);
        return null;
    }
}

function saveInlineDraft(payload) {
    if (!payload) return;

    if (draftStorageAvailable()) {
        saveDraftToLocal({ ...payload, timestamp: payload.timestamp || Date.now() }, draftStorageOptions);
        return;
    }

    try {
        const data = { ...payload, timestamp: payload.timestamp || Date.now() };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('❌ Failed to persist inline draft via fallback:', error);
    }
}

function getInlineDraftContext(isEditMode) {
    return isEditMode ? inlineDraftEditContext : inlineDraftCreateContext;
}

function persistInlineDraftSnapshot() {
    const storageSupported = canUseDraftStorage || typeof localStorage !== 'undefined';
    if (!storageSupported) {
        return;
    }

    const textArea = document.getElementById('inline-haiku-text');
    if (!textArea) {
        return;
    }

    const textValue = textArea.value || '';
    const trimmedText = textValue.trim();

    if (!trimmedText) {
        clearInlineDraftStorage();
        return;
    }

    const form = document.getElementById('inline-haiku-form');
    const isEditMode = form?.dataset?.editMode === 'true';
    const haikuId = isEditMode && form?.dataset?.editId ? parseInt(form.dataset.editId, 10) : null;

    let location = pinState.currentPinLocation;

    if (!location && pinState.currentEditingHaiku) {
        const { latitude, longitude } = pinState.currentEditingHaiku;
        if (typeof latitude === 'number' && typeof longitude === 'number') {
            location = { lat: latitude, lng: longitude };
        }
    }

    const payload = {
        text: trimmedText,
        rawText: textValue,
        context: getInlineDraftContext(isEditMode),
        mode: isEditMode ? 'edit' : 'create',
        haikuId: haikuId || null,
        location
    };

    saveInlineDraft(payload);
}

function maybeRestoreInlineDraft({ editMode = false, haikuId = null } = {}) {
    const storageSupported = canUseDraftStorage || typeof localStorage !== 'undefined';
    if (!storageSupported) {
        return false;
    }

    if (inlineDraftRestored) {
        return false;
    }

    const storedDraft = loadInlineDraft();
    if (!storedDraft || !storedDraft.text) {
        return false;
    }

    const expectedContext = getInlineDraftContext(editMode);
    if (storedDraft.context && storedDraft.context !== expectedContext) {
        return false;
    }

    if (editMode) {
        if (storedDraft.mode !== 'edit') {
            return false;
        }

        if (haikuId && storedDraft.haikuId && parseInt(storedDraft.haikuId, 10) !== parseInt(haikuId, 10)) {
            return false;
        }
    } else if (storedDraft.mode === 'edit') {
        return false;
    }

    const shouldRestore = confirm('前回の入力を復元しますか？');
    if (!shouldRestore) {
        clearInlineDraftStorage();
        return false;
    }

    const textArea = document.getElementById('inline-haiku-text');
    if (textArea) {
        const restoredText = storedDraft.rawText || storedDraft.text;
        textArea.value = restoredText || '';
        pinState.formState.hasUnsavedData = Boolean(textArea.value.trim());
        pinState.formState.inputData.haikuText = textArea.value;
    }

    if (storedDraft.location && typeof storedDraft.location.lat === 'number' && typeof storedDraft.location.lng === 'number') {
        updateFormLocationInfo(storedDraft.location.lat, storedDraft.location.lng);
    }

    inlineDraftRestored = true;
    persistInlineDraftSnapshot();
    return true;
}

/**
 * Inline form initialisation. Creates the form HTML and wires up handlers.
 */
export function initializeInlineForm() {
    const formContent = createHaikuForm({
        formId: 'inline-haiku-form',
        textAreaId: 'inline-haiku-text',
        suggestionsId: 'kigo-suggestions',
        showPoetField: false,
        showHeader: true,
        showSwipeIndicator: true,
        submitButtonText: '投稿',
        showDraftButton: true,
        placeholder: '斧入れて香に驚くや冬木立'
    });

    const formHTML = `
        <div id="inline-form-container" class="inline-form">
            ${formContent}
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', formHTML);
    pinState.inlineFormContainer = document.getElementById('inline-form-container');

    if (!pinState.inlineFormContainer) {
        console.error('❌ インラインフォームコンテナの追加に失敗');
        return;
    }

    console.log('✅ インラインフォームコンテナDOMに追加成功 (component化)');

    setupFormCloseHandlers('inline-form-container', hideInlineForm, 'inline-haiku-text');

    const form = document.getElementById('inline-haiku-form');
    if (!form) {
        console.error('❌ inline-haiku-form が見つかりません');
        return;
    }

    form.addEventListener('submit', handleInlineSubmit);

    const draftBtn = document.getElementById('inline-haiku-form-draft-btn');
    if (draftBtn) {
        draftBtn.addEventListener('click', handleDraftSave);
        console.log('✅ 下書き保存ボタンハンドラー設定完了');
    }

    const textArea = document.getElementById('inline-haiku-text');
    if (textArea) {
        setupFormDataProtection(textArea);
    }
}

export function showInlineForm(lat, lng) {
    if (!pinState.inlineFormContainer) {
        console.error('❌ inlineFormContainer が見つかりません');
        return;
    }

    pinState.currentEditingHaiku = null;
    pinState.currentPinLocation = { lat, lng };

    const form = document.getElementById('inline-haiku-form');
    if (!form) {
        console.error('❌ inline-haiku-form が見つかりません');
        return;
    }

    form.reset();
    console.log('✅ フォームリセット完了');

    maybeRestoreInlineDraft({ editMode: false });

    pinState.inlineFormContainer.classList.add('active');
    pinState.isInlineFormVisible = true;

    setTimeout(async () => {
        const textArea = document.getElementById('inline-haiku-text');
        if (textArea) {
            textArea.focus();
            await initializeKigoSuggestion('inline-haiku-text', 'kigo-suggestions');
        }
    }, 300);

    console.log(`✅ インラインフォーム表示完了: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
}

export function showInlineFormWithoutPin() {
    if (!pinState.inlineFormContainer) {
        console.error('❌ inlineFormContainer が見つかりません');
        return;
    }

    pinState.currentPinLocation = null;
    pinState.currentEditingHaiku = null;

    const form = document.getElementById('inline-haiku-form');
    if (!form) {
        console.error('❌ inline-haiku-form が見つかりません');
        return;
    }

    form.reset();

    maybeRestoreInlineDraft({ editMode: false });

    pinState.inlineFormContainer.classList.add('active');
    pinState.isInlineFormVisible = true;

    setTimeout(async () => {
        const textArea = document.getElementById('inline-haiku-text');
        if (textArea) {
            textArea.focus();
            await initializeKigoSuggestion('inline-haiku-text', 'kigo-suggestions');
        }
    }, 300);

    console.log('✅ 初期フォーム表示完了（現在地は投稿時に取得）');
}

export function showInlineFormForEdit(haikuData) {
    if (!pinState.inlineFormContainer) {
        console.error('❌ inlineFormContainer が見つかりません');
        return;
    }

    const rawLatitude = typeof haikuData.latitude === 'number'
        ? haikuData.latitude
        : (haikuData.latitude !== undefined && haikuData.latitude !== null
            ? parseFloat(haikuData.latitude)
            : null);

    const rawLongitude = typeof haikuData.longitude === 'number'
        ? haikuData.longitude
        : (haikuData.longitude !== undefined && haikuData.longitude !== null
            ? parseFloat(haikuData.longitude)
            : null);

    const sanitizedLatitude = Number.isFinite(rawLatitude) ? rawLatitude : null;
    const sanitizedLongitude = Number.isFinite(rawLongitude) ? rawLongitude : null;

    pinState.currentEditingHaiku = {
        id: haikuData.id,
        latitude: sanitizedLatitude,
        longitude: sanitizedLongitude,
        location_type: haikuData.location_type || 'ゆかりの地',
        location_name: haikuData.location_name || '',
        status: haikuData.status || 'draft',
        season: haikuData.season || null,
        seasonal_term: haikuData.seasonal_term || ''
    };

    if (sanitizedLatitude !== null && sanitizedLongitude !== null) {
        pinState.currentPinLocation = {
            lat: sanitizedLatitude,
            lng: sanitizedLongitude
        };
    } else {
        pinState.currentPinLocation = null;
    }

    pinState.inlineFormContainer.classList.add('active');
    pinState.isInlineFormVisible = true;

    const form = document.getElementById('inline-haiku-form');
    if (!form) {
        console.error('❌ inline-haiku-form が見つかりません');
        return;
    }

    form.dataset.editMode = 'true';
    form.dataset.editId = haikuData.id;
    form.dataset.locationType = pinState.currentEditingHaiku.location_type;
    form.dataset.locationName = pinState.currentEditingHaiku.location_name;
    form.dataset.status = pinState.currentEditingHaiku.status;
    form.dataset.originalSeason = pinState.currentEditingHaiku.season || '';
    form.dataset.originalSeasonalTerm = pinState.currentEditingHaiku.seasonal_term || '';

    const haikuTextArea = document.getElementById('inline-haiku-text');
    if (haikuTextArea) {
        haikuTextArea.value = haikuData.haiku_text || '';
    }

    const latField = document.getElementById('inline-latitude');
    const lngField = document.getElementById('inline-longitude');
    if (latField) {
        latField.value = pinState.currentEditingHaiku.latitude ?? '';
    }
    if (lngField) {
        lngField.value = pinState.currentEditingHaiku.longitude ?? '';
    }

    const locationDisplayElements = document.querySelectorAll('.location-display');
    if (locationDisplayElements.length > 0) {
        if (pinState.currentPinLocation) {
            locationDisplayElements.forEach((element) => {
                element.textContent = `緯度: ${pinState.currentPinLocation.lat.toFixed(6)}, 経度: ${pinState.currentPinLocation.lng.toFixed(6)}`;
            });
        } else {
            locationDisplayElements.forEach((element) => {
                element.textContent = '位置情報が設定されていません';
            });
        }
    }

    setTimeout(async () => {
        if (haikuTextArea) {
            haikuTextArea.focus();
            await initializeKigoSuggestion('inline-haiku-text', 'kigo-suggestions');
        }
    }, 300);

    maybeRestoreInlineDraft({ editMode: true, haikuId: haikuData.id });

    console.log('✅ 編集モードフォーム設定完了');
}

export function hideInlineForm() {
    if (!pinState.inlineFormContainer) return;

    pinState.inlineFormContainer.classList.remove('active');
    pinState.isInlineFormVisible = false;

    removeTemporaryPinAsync().catch((error) => {
        console.error('❌ フォーム非表示時のピン削除エラー:', error);
    });

    pinState.currentPinLocation = null;
    pinState.currentEditingHaiku = null;

    if (typeof resetKigoSelection === 'function') {
        resetKigoSelection();
    }

    clearInlineFormMetadata();
}

export function updateFormLocationInfo(lat, lng) {
    pinState.currentPinLocation = { lat, lng };

    const locationDisplayElements = document.querySelectorAll('.location-display');
    locationDisplayElements.forEach((element) => {
        element.textContent = `緯度: ${lat.toFixed(6)}, 経度: ${lng.toFixed(6)}`;
    });

    const latField = document.getElementById('inline-latitude');
    const lngField = document.getElementById('inline-longitude');
    if (latField) latField.value = lat;
    if (lngField) lngField.value = lng;

    const formHeader = pinState.inlineFormContainer?.querySelector('.form-header h3');
    if (formHeader) {
        const originalText = formHeader.textContent;
        formHeader.textContent = '位置更新しました';
        formHeader.style.color = '#2ecc71';

        setTimeout(() => {
            formHeader.textContent = originalText;
            formHeader.style.color = '';
        }, 2000);
    }

    persistInlineDraftSnapshot();

    console.log(`📍 フォーム位置情報更新完了: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
}

export function hasUnsavedFormData() {
    if (!pinState.isInlineFormVisible) return false;

    const textArea = document.getElementById('inline-haiku-text');
    if (!textArea) return false;

    const currentText = textArea.value.trim();
    return currentText.length > 0;
}

export function setupSwipeHandlers(onSwipeUp) {
    if (!pinState.inlineFormContainer) return;

    const formContainer = pinState.inlineFormContainer;

    formContainer.addEventListener('touchstart', (event) => {
        pinState.touchStartY = event.touches[0].clientY;
        pinState.touchStartTime = Date.now();
    }, { passive: true });

    formContainer.addEventListener('touchmove', (event) => {
        if (!pinState.isInlineFormVisible) return;

        const currentY = event.touches[0].clientY;
        const downwardDelta = currentY - pinState.touchStartY;
        const upwardDelta = pinState.touchStartY - currentY;

        if (upwardDelta > 50) {
            event.preventDefault();
        }

        if (downwardDelta > 0 && downwardDelta < 200) {
            formContainer.style.transform = `translateY(${downwardDelta}px)`;
            formContainer.style.opacity = `${Math.max(0, 1 - downwardDelta / 200)}`;
        }
    }, { passive: false });

    formContainer.addEventListener('touchend', (event) => {
        const touchDuration = Date.now() - pinState.touchStartTime;
        const endY = event.changedTouches[0].clientY;
        const downwardDelta = endY - pinState.touchStartY;
        const upwardDelta = pinState.touchStartY - endY;

        formContainer.style.transform = '';
        formContainer.style.opacity = '';

        if (downwardDelta > 120 && touchDuration < 500) {
            hideInlineForm();
            return;
        }

        if (onSwipeUp && upwardDelta > 50 && touchDuration < 500) {
            onSwipeUp();
        }
    }, { passive: true });
}

async function handleInlineSubmit(event) {
    event.preventDefault();

    if (pinState.isSubmittingHaiku) return;

    const form = event.target;
    const isEditMode = form.dataset.editMode === 'true';
    const editId = form.dataset.editId;

    try {
        pinState.isSubmittingHaiku = true;
        const formData = new FormData(form);
        const haikuText = formData.get('haiku_text');

        if (!haikuText || haikuText.trim() === '') {
            showErrorMessage('俳句を入力してください');
            return;
        }

        let selectedKigoInfo = { season: 'その他', selectedKigo: null, isSeasonless: false };
        if (typeof getCurrentKigoSelection === 'function') {
            selectedKigoInfo = getCurrentKigoSelection();
        }

        if (isEditMode) {
            await updateExistingHaiku(form, editId, haikuText, selectedKigoInfo);
        } else {
            await submitNewHaiku(form, haikuText, selectedKigoInfo);
        }

    } catch (error) {
        console.error('❌ 俳句投稿/更新エラー:', error);
        showErrorMessage('投稿に失敗しました: ' + error.message);
    } finally {
        pinState.isSubmittingHaiku = false;
    }
}

async function handleDraftSave(event) {
    event.preventDefault();

    if (pinState.isSubmittingHaiku) return;

    try {
        pinState.isSubmittingHaiku = true;
        const form = document.getElementById('inline-haiku-form');
        if (!form) {
            throw new Error('フォームが見つかりません');
        }

        const formData = new FormData(form);
        const haikuText = formData.get('haiku_text');

        if (!haikuText || haikuText.trim() === '') {
            showErrorMessage('俳句を入力してください');
            return;
        }

        const isEditMode = form.dataset.editMode === 'true';
        const editId = form.dataset.editId ? parseInt(form.dataset.editId, 10) : null;

        let location;
        if (pinState.currentPinLocation) {
            location = pinState.currentPinLocation;
        } else if (isEditMode && pinState.currentEditingHaiku &&
            typeof pinState.currentEditingHaiku.latitude === 'number' &&
            typeof pinState.currentEditingHaiku.longitude === 'number') {
            location = {
                lat: pinState.currentEditingHaiku.latitude,
                lng: pinState.currentEditingHaiku.longitude
            };
        } else {
            location = await getCurrentLocationForSubmit();
        }

        let selectedKigoInfo = { season: 'その他', selectedKigo: null, isSeasonless: false };
        if (typeof getCurrentKigoSelection === 'function') {
            selectedKigoInfo = getCurrentKigoSelection();
        }

        if (isEditMode && editId) {
            await updateDraftHaiku(editId, haikuText, location, selectedKigoInfo);
            return;
        }

        await createNewDraft(haikuText, location, selectedKigoInfo);

    } catch (error) {
        console.error('❌ 下書き保存エラー:', error);
        showErrorMessage('下書き保存に失敗しました: ' + error.message);
    } finally {
        pinState.isSubmittingHaiku = false;
    }
}

async function updateExistingHaiku(form, editId, haikuText, selectedKigoInfo) {
    const editingMetadata = pinState.currentEditingHaiku || {};
    const hasStoredLocation = typeof editingMetadata.latitude === 'number' && typeof editingMetadata.longitude === 'number';

    const locationSource = pinState.currentPinLocation || (hasStoredLocation
        ? { lat: editingMetadata.latitude, lng: editingMetadata.longitude }
        : null);

    const normalizedLatitude = locationSource ? Number(locationSource.lat) : null;
    const normalizedLongitude = locationSource ? Number(locationSource.lng) : null;

    const latitudeForUpdate = Number.isFinite(normalizedLatitude) ? normalizedLatitude : null;
    const longitudeForUpdate = Number.isFinite(normalizedLongitude) ? normalizedLongitude : null;

    const updatedSeason = (selectedKigoInfo?.season && selectedKigoInfo.season !== '')
        ? selectedKigoInfo.season
        : (editingMetadata.season || 'その他');

    const updatedSeasonalTerm = selectedKigoInfo?.selectedKigo?.display_name
        || editingMetadata.seasonal_term
        || '';

    const originalStatus = editingMetadata.status || 'published';
    const statusForUpdate = originalStatus === 'draft' ? 'published' : originalStatus;

    const updateData = {
        haiku_text: haikuText.trim(),
        season: updatedSeason,
        seasonal_term: updatedSeasonalTerm,
        latitude: latitudeForUpdate,
        longitude: longitudeForUpdate,
        location_type: editingMetadata.location_type || 'ゆかりの地',
        location_name: editingMetadata.location_name || '',
        status: statusForUpdate
    };

    const result = await apiAdapter.updateHaiku(parseInt(editId, 10), updateData);

    if (!result.success) {
        throw new Error('更新に失敗しました');
    }

    showSuccessMessage('俳句を更新しました！');

    clearInlineDraftStorage();
    pinState.formState.hasUnsavedData = false;

    delete form.dataset.editMode;
    delete form.dataset.editId;

    form.reset();
    clearInlineFormMetadata();

    resetKigoSelection();

    const suggestionsContainer = document.getElementById('kigo-suggestions');
    if (suggestionsContainer) {
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.className = 'kigo-suggestions';
    }

    pinState.currentPinLocation = null;
    pinState.currentEditingHaiku = null;

    await loadHaikuData();
    await updateHaikuInCache(parseInt(editId, 10));

    console.log('✅ 更新完了、フォームを新規投稿モードに戻しました');
}

async function submitNewHaiku(form, haikuText, selectedKigoInfo) {
    let location;
    if (pinState.currentPinLocation) {
        location = pinState.currentPinLocation;
        console.log('📍 ピンの位置で投稿:', location);
    } else {
        location = await getCurrentLocationForSubmit();
        console.log('📍 投稿時の現在地を取得:', location);
    }

    const haikuData = {
        haiku_text: haikuText.trim(),
        poet_name: '詠み人知らず',
        latitude: location.lat,
        longitude: location.lng,
        location_type: 'ゆかりの地',
        location_name: '',
        season: selectedKigoInfo.season || 'その他',
        seasonal_term: selectedKigoInfo.selectedKigo?.display_name || '',
        description: '',
        date_composed: new Date().toISOString().split('T')[0]
    };

    const result = await submitHaikuData(haikuData);

    if (pinState.currentPinLocation) {
        convertTemporaryPinToPermanent(haikuData.season);
    }

    showSuccessMessage('俳句を投稿しました！');

    clearInlineDraftStorage();
    pinState.formState.hasUnsavedData = false;

    form.reset();
    resetKigoSelection();

    const suggestionsContainer = document.getElementById('kigo-suggestions');
    if (suggestionsContainer) {
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.className = 'kigo-suggestions';
    }

    pinState.currentPinLocation = null;
    await removeTemporaryPinAsync();
    await loadHaikuData();

    if (result.data && result.data.id) {
        await updateHaikuInCache(result.data.id);
    }

    console.log('✅ 投稿完了、フォームは表示したまま次の句を入力可能');
}

async function updateDraftHaiku(editId, haikuText, location, selectedKigoInfo) {
    const editingMetadata = pinState.currentEditingHaiku || {};

    const normalizedLat = location ? Number(location.lat) : null;
    const normalizedLng = location ? Number(location.lng) : null;

    const latitudeForUpdate = Number.isFinite(normalizedLat) ? normalizedLat : null;
    const longitudeForUpdate = Number.isFinite(normalizedLng) ? normalizedLng : null;

    const seasonCandidate = selectedKigoInfo?.season || '';
    const seasonalTermCandidate = selectedKigoInfo?.selectedKigo?.display_name || '';

    const shouldUseDetectedSeason = Boolean(
        selectedKigoInfo?.selectedKigo ||
        selectedKigoInfo?.isSeasonless ||
        (seasonCandidate && seasonCandidate !== 'その他')
    );

    const updatedSeason = shouldUseDetectedSeason
        ? (seasonCandidate || 'その他')
        : (editingMetadata.season || 'その他');

    const updatedSeasonalTerm = shouldUseDetectedSeason
        ? seasonalTermCandidate
        : (editingMetadata.seasonal_term || '');

    const updateData = {
        haiku_text: haikuText.trim(),
        latitude: latitudeForUpdate,
        longitude: longitudeForUpdate,
        location_type: editingMetadata.location_type || 'ゆかりの地',
        location_name: editingMetadata.location_name || '',
        season: updatedSeason,
        seasonal_term: updatedSeasonalTerm,
        status: 'draft'
    };

    const result = await apiAdapter.updateHaiku(editId, updateData);

    if (!result.success) {
        throw new Error('下書きの更新に失敗しました');
    }

    showSuccessMessage('下書きを更新しました！');

    pinState.currentEditingHaiku = {
        ...editingMetadata,
        id: editId,
        latitude: latitudeForUpdate,
        longitude: longitudeForUpdate,
        location_type: updateData.location_type,
        location_name: updateData.location_name,
        season: updateData.season,
        seasonal_term: updateData.seasonal_term,
        status: 'draft'
    };

    if (Number.isFinite(latitudeForUpdate) && Number.isFinite(longitudeForUpdate)) {
        pinState.currentPinLocation = {
            lat: latitudeForUpdate,
            lng: longitudeForUpdate
        };

        const latField = document.getElementById('inline-latitude');
        const lngField = document.getElementById('inline-longitude');
        if (latField) latField.value = latitudeForUpdate;
        if (lngField) lngField.value = longitudeForUpdate;

        const locationDisplayElements = document.querySelectorAll('.location-display');
        locationDisplayElements.forEach((element) => {
            element.textContent = `緯度: ${latitudeForUpdate.toFixed(6)}, 経度: ${longitudeForUpdate.toFixed(6)}`;
        });
    }

    clearInlineDraftStorage();
    pinState.formState.hasUnsavedData = false;

    await updateHaikuInCache(editId);
    await loadHaikuData();

    console.log('✅ 下書き更新完了');
}

async function createNewDraft(haikuText, location, selectedKigoInfo) {
    const draftData = {
        haiku_text: haikuText.trim(),
        poet_name: '詠み人知らず',
        latitude: location.lat,
        longitude: location.lng,
        location_type: 'ゆかりの地',
        location_name: '',
        season: selectedKigoInfo.season || 'その他',
        seasonal_term: selectedKigoInfo.selectedKigo?.display_name || '',
        description: '',
        date_composed: new Date().toISOString().split('T')[0],
        status: 'draft'
    };

    const result = await submitHaikuData(draftData);

    showSuccessMessage('下書きを保存しました！');

    const form = document.getElementById('inline-haiku-form');
    if (form) {
        form.reset();
    }

    resetKigoSelection();

    const suggestionsContainer = document.getElementById('kigo-suggestions');
    if (suggestionsContainer) {
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.className = 'kigo-suggestions';
    }

    pinState.currentPinLocation = null;
    await removeTemporaryPinAsync();
    clearInlineDraftStorage();
    pinState.formState.hasUnsavedData = false;

    if (result.data && result.data.id) {
        await updateHaikuInCache(result.data.id);
    }

    await loadHaikuData();
    console.log('✅ 下書き保存完了');
}

function setupFormDataProtection(textArea) {
    if (!textArea) return;

    if (pinState.formState.autoSaveInterval) {
        clearInterval(pinState.formState.autoSaveInterval);
        pinState.formState.autoSaveInterval = null;
    }

    const storageSupported = canUseDraftStorage || typeof localStorage !== 'undefined';
    const debouncedSave = storageSupported ? debounceFn(() => {
        persistInlineDraftSnapshot();
    }, 300) : null;

    textArea.addEventListener('input', function () {
        pinState.formState.lastInputTime = Date.now();
        pinState.formState.hasUnsavedData = this.value.trim().length > 0;
        pinState.formState.inputData.haikuText = this.value;

        if (debouncedSave) {
            debouncedSave();
        } else {
            persistInlineDraftSnapshot();
        }
    });

    if (inlineDraftRestored) {
        if (debouncedSave) {
            debouncedSave();
        } else {
            persistInlineDraftSnapshot();
        }
    }
}

async function submitHaikuData(haikuData) {
    let poetId = null;
    if (haikuData.poet_name && haikuData.poet_name !== '詠み人知らず') {
        const existingPoets = await apiAdapter.searchPoets(haikuData.poet_name);
        if (existingPoets.length > 0) {
            poetId = existingPoets[0].id;
        }
    }

    const submitData = {
        haiku_text: haikuData.haiku_text,
        poet_id: poetId,
        latitude: haikuData.latitude,
        longitude: haikuData.longitude,
        location_type: haikuData.location_type,
        location_name: haikuData.location_name,
        season: haikuData.season,
        seasonal_term: haikuData.seasonal_term,
        status: haikuData.status || 'published'
    };

    const result = await apiAdapter.createHaiku(submitData);
    if (!result.success) {
        throw new Error('投稿に失敗しました');
    }

    return result;
}

function getCurrentLocationForSubmit() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            console.warn('⚠️ 位置情報がサポートされていません。デフォルト位置を使用します。');
            resolve({ lat: 35.6809591, lng: 139.7673068 });
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            },
            (error) => {
                console.warn('⚠️ 位置情報取得失敗:', error.message);
                resolve({ lat: 35.6809591, lng: 139.7673068 });
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}
