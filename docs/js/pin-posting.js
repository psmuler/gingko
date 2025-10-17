/**
 * 俳句鑑賞＆記録アプリ - ピン投稿機能 (modularised)
 * Orchestrates map interactions and delegates form/state concerns to dedicated modules.
 */

import { map } from './script.js';
import { getCurrentKigoSelection } from './kigo-suggestions.js';
import {
    initializeInlineForm,
    showInlineForm,
    showInlineFormWithoutPin,
    showInlineFormForEdit,
    hideInlineForm,
    updateFormLocationInfo,
    setupSwipeHandlers
} from './pin/form.js';
import { showTemporaryPin, removeTemporaryPin } from './pin/temporary-pin.js';
import { checkExistingHaikusAtLocation } from './pin/cache.js';
import { pinState } from './pin/state.js';

let mapClickDebounceTimeout = null;
let lastMapClickTime = 0;

function initializePinPosting() {
    console.log('🚀 ピン投稿システム初期化開始');

    try {
        initializeInlineForm();

        setTimeout(() => {
            setupMapClickHandler();
            setupSwipeHandlers(transitionToDetailForm);
            showInlineFormWithoutPin();
            console.log('✅ ピン投稿システム初期化完了');
        }, 100);
    } catch (error) {
        console.error('❌ ピン投稿システム初期化エラー:', error);
    }
}

function setupMapClickHandler() {
    if (!map || typeof map.on !== 'function') {
        console.error('❌ pin-posting: mapが無効です', map);
        return;
    }
    map.on('click', handleMapClick);
    console.log('✅ pin-posting: 地図クリックハンドラー設定完了');
}

function handleMapClick(event) {
    if (!event?.latlng) {
        console.error('❌ 無効な地図クリックイベント:', event);
        return;
    }

    const currentTime = Date.now();
    const { lat, lng } = event.latlng;

    if (currentTime - lastMapClickTime < 50) {
        console.log('⏳ 地図クリック無視（デバウンス）');
        return;
    }

    if (mapClickDebounceTimeout) {
        clearTimeout(mapClickDebounceTimeout);
    }

    mapClickDebounceTimeout = setTimeout(async () => {
        await handleMapClickAsync(lat, lng);
        lastMapClickTime = Date.now();
    }, 50);

    console.log(`📍 地図クリック受付: ${lat.toFixed(6)}, ${lng.toFixed(6)} (50ms後に処理)`);
}

async function handleMapClickAsync(lat, lng) {
    try {
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            console.error('❌ 無効な座標値:', { lat, lng });
            return;
        }

        if (map && map._popup && map.hasLayer(map._popup) && map._popup.isOpen()) {
            map.closePopup();
            return;
        }

        const existingHaikus = await checkExistingHaikusAtLocation(lat, lng);

        if (existingHaikus.length > 0) {
            hideInlineForm();
            await removeTemporaryPin();
            showExistingHaikuPopupWithOptions(existingHaikus, lat, lng);
            return;
        }

        pinState.currentPinLocation = { lat, lng };
        await showTemporaryPin(lat, lng);

        if (pinState.isInlineFormVisible) {
            updateFormLocationInfo(lat, lng);
        } else {
            showInlineForm(lat, lng);
        }
    } catch (error) {
        console.error('❌ 地図クリック処理エラー:', error);
        try {
            hideInlineForm();
            await removeTemporaryPin();
        } catch (cleanupError) {
            console.error('❌ クリック後処理の後始末に失敗:', cleanupError);
        }
    }
}

function transitionToDetailForm() {
    if (typeof toggleHaikuForm !== 'function') return;

    const inlineText = document.getElementById('inline-haiku-text')?.value || '';
    let selectedKigoInfo = { season: null, selectedKigo: null, isSeasonless: false };
    if (typeof getCurrentKigoSelection === 'function') {
        selectedKigoInfo = getCurrentKigoSelection();
    }

    hideInlineForm();
    toggleHaikuForm();

    setTimeout(() => {
        const detailForm = document.getElementById('haiku-form');
        if (!detailForm) return;

        const haikuTextField = detailForm.querySelector('#haiku-text');
        if (haikuTextField) {
            haikuTextField.value = inlineText;
        }

        if (pinState.currentPinLocation) {
            const latField = detailForm.querySelector('#latitude');
            const lngField = detailForm.querySelector('#longitude');
            if (latField) latField.value = pinState.currentPinLocation.lat;
            if (lngField) lngField.value = pinState.currentPinLocation.lng;
        }

        if (selectedKigoInfo.season) {
            const seasonField = detailForm.querySelector('#season, [name="season"]');
            if (seasonField) seasonField.value = selectedKigoInfo.season;
        }

        if (selectedKigoInfo.selectedKigo?.display_name) {
            const seasonalTermField = detailForm.querySelector('#seasonal-term, [name="seasonal_term"]');
            if (seasonalTermField) seasonalTermField.value = selectedKigoInfo.selectedKigo.display_name;
        }
    }, 100);
}

function showExistingHaikuPopup(haikus) {
    if (!haikus.length || !pinState.currentPinLocation) return;

    const haiku = haikus[0];
    const popupContent = `
        <div class="haiku-popup">
            <div class="haiku-text">${haiku.haiku_text}</div>
            <div class="haiku-info">
                <div class="poet-name">${haiku.poet_name}</div>
                <div class="location-info">${haiku.location_name || ''}</div>
            </div>
        </div>
    `;

    L.popup()
        .setLatLng([pinState.currentPinLocation.lat, pinState.currentPinLocation.lng])
        .setContent(popupContent)
        .openOn(map);
}

function showExistingHaikuPopupWithOptions(haikus, lat, lng) {
    if (!haikus.length) return;

    const primary = haikus[0];
    const popupContent = `
        <div class="haiku-popup-with-options">
            <div class="haiku-display">
                <div class="haiku-text">${primary.haiku_text}</div>
                <div class="haiku-info">
                    <div class="poet-name">${primary.poet_name}</div>
                    <div class="location-info">${primary.location_name || ''}</div>
                </div>
                ${haikus.length > 1 ? `<div class="haiku-count">他 ${haikus.length - 1}件の俳句</div>` : ''}
            </div>
            <div class="popup-actions">
                <button class="action-btn secondary" onclick="addNewHaikuAtLocation(${lat}, ${lng})">📝 この位置に新しい俳句を追加</button>
                <button class="action-btn primary" onclick="showAllHaikusAtLocation(${lat}, ${lng})">📜 すべての俳句を表示</button>
                <button class="action-btn close" onclick="map.closePopup()">× 閉じる</button>
            </div>
        </div>
    `;

    L.popup({ maxWidth: 350, className: 'haiku-options-popup' })
        .setLatLng([lat, lng])
        .setContent(popupContent)
        .openOn(map);
}

function addNewHaikuAtLocation(lat, lng) {
    map.closePopup();
    pinState.currentPinLocation = { lat, lng };
    showTemporaryPin(lat, lng);
    showInlineForm(lat, lng);
}

async function showAllHaikusAtLocation(lat, lng) {
    try {
        map.closePopup();
        const allHaikus = await checkExistingHaikusAtLocation(lat, lng);
        if (!allHaikus.length) return;

        const haikuListHTML = allHaikus.map((haiku, index) => `
            <div class="haiku-item" data-index="${index}">
                <div class="haiku-text">${haiku.haiku_text}</div>
                <div class="haiku-meta">
                    <span class="poet">${haiku.poet_name}</span>
                    ${haiku.location_name ? `<span class="location">${haiku.location_name}</span>` : ''}
                    ${haiku.season ? `<span class="season">${haiku.season}</span>` : ''}
                </div>
            </div>
        `).join('');

        const popupContent = `
            <div class="all-haikus-popup">
                <div class="popup-header">
                    <h3>この地点の俳句 (${allHaikus.length}件)</h3>
                    <button class="close-btn" onclick="map.closePopup()">×</button>
                </div>
                <div class="haikus-list">${haikuListHTML}</div>
                <div class="popup-actions">
                    <button class="action-btn secondary" onclick="addNewHaikuAtLocation(${lat}, ${lng})">📝 新しい俳句を追加</button>
                </div>
            </div>
        `;

        L.popup({ maxWidth: 400, maxHeight: 300, className: 'all-haikus-popup' })
            .setLatLng([lat, lng])
            .setContent(popupContent)
            .openOn(map);
    } catch (error) {
        console.error('❌ 全俳句表示エラー:', error);
    }
}

function showDebugPin(lat, lng) {
    const debugIcon = L.divIcon({
        html: `
            <div style="width: 30px; height: 30px; background: red; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">📍</div>
        `,
        className: 'debug-pin-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });

    const debugPin = L.marker([lat, lng], {
        icon: debugIcon,
        zIndexOffset: 2000
    }).addTo(map);

    setTimeout(() => {
        if (map.hasLayer(debugPin)) {
            map.removeLayer(debugPin);
        }
    }, 5000);

    return debugPin;
}

if (typeof window !== 'undefined') {
    window.hideInlineForm = hideInlineForm;
    window.addNewHaikuAtLocation = addNewHaikuAtLocation;
    window.showAllHaikusAtLocation = showAllHaikusAtLocation;
    window.showInlineFormForEdit = showInlineFormForEdit;
    window.showTemporaryPinFromPinPosting = showTemporaryPin;
    window.removeTemporaryPinFromPinPosting = removeTemporaryPin;
    window.showDebugPinFromPinPosting = showDebugPin;
    window.transitionToDetailForm = transitionToDetailForm;
}

export {
    initializePinPosting
};
