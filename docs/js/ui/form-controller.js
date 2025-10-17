import { apiAdapter } from '../api-adapter.js';
import { appState } from '../core/app-state.js';
import { showLoadingState, hideLoadingState, showInfoMessage, showErrorMessage } from './messages.js';
import { getUserLocation, refreshData } from '../map/map-service.js';

export function toggleHaikuForm() {
    const container = getFormContainer();
    if (!container) return;

    const isVisible = container.style.display !== 'none' && container.style.display !== '';
    isVisible ? closeHaikuForm() : openHaikuForm();
}

export function openHaikuForm() {
    const container = getFormContainer();
    const form = getHaikuForm();
    if (!container || !form) return;

    container.style.display = 'flex';
    form.reset();
    getCurrentLocationForForm();
}

export function closeHaikuForm() {
    const container = getFormContainer();
    if (container) {
        container.style.display = 'none';
    }
}

export async function getCurrentLocationForForm() {
    try {
        const location = await getUserLocation();

        if (location) {
            setLocationInputs(location);
            showInfoMessage('現在地を取得してフォームに設定しました');
        } else {
            showLocationInputError();
        }
    } catch (error) {
        console.error('❌ フォーム用現在地取得エラー:', error);
        showErrorMessage('現在地の取得に失敗しました');
    }
}

export async function submitHaiku(event) {
    event.preventDefault();

    if (appState.isSubmittingHaiku) {
        console.log('⚠️ 投稿処理中のため、重複送信をブロックしました');
        return;
    }

    try {
        await executeHaikuSubmission(event);
    } catch (error) {
        handleSubmissionError(error);
    } finally {
        cleanupSubmissionState();
    }
}

async function executeHaikuSubmission(event) {
    appState.isSubmittingHaiku = true;

    const form = event.target;
    const payload = prepareFormData(form);

    disableFormButtons(form);
    showLoadingState('俳句を投稿中...');

    console.log('📤 送信データ:', payload);

    const response = await apiAdapter.createHaiku(payload);

    if (response.success) {
        await handleSubmissionSuccess(response);
    } else {
        throw new Error(response.message || '投稿に失敗しました');
    }
}

async function handleSubmissionSuccess(response) {
    showInfoMessage('俳句の投稿が完了しました');
    console.log('✅ 投稿成功:', response);

    closeHaikuForm();
    await refreshData();
}

function handleSubmissionError(error) {
    console.error('❌ 俳句投稿エラー:', error);
    showErrorMessage(`俳句の投稿に失敗しました: ${error.message}`);
}

function cleanupSubmissionState() {
    appState.isSubmittingHaiku = false;
    hideLoadingState();
    enableFormButtons();
}

function prepareFormData(form) {
    const formData = new FormData(form);
    const postData = {};

    for (const [key, value] of formData.entries()) {
        postData[key] = value;
    }

    return postData;
}

function disableFormButtons(form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const allButtons = form.querySelectorAll('button');

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '送信中...';
    }

    allButtons.forEach(btn => {
        btn.disabled = true;
    });
}

function enableFormButtons() {
    const form = getHaikuForm();
    if (!form) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    const allButtons = form.querySelectorAll('button');

    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '投稿';
    }

    allButtons.forEach(btn => {
        btn.disabled = false;
    });
}

function setLocationInputs(location) {
    const latInput = document.getElementById('latitude');
    const lngInput = document.getElementById('longitude');

    if (latInput && lngInput) {
        latInput.value = location.latitude.toFixed(6);
        lngInput.value = location.longitude.toFixed(6);
    }
}

function showLocationInputError() {
    showErrorMessage('現在地を取得できませんでした。手動で座標を入力してください');
}

function getFormContainer() {
    return document.getElementById('haiku-form-container');
}

function getHaikuForm() {
    return document.getElementById('haiku-form');
}
