import { MAP_CONFIG } from '../config.js';
import { map } from '../script.js';
import { pinState, resetTemporaryPinSnapshot } from './state.js';

const PIN_APPEAR_DELAY = 100;
const AUTO_REMOVE_DELAY = 15000;
const PIN_TRANSITION_CHECK_INTERVAL = 10;

export async function showTemporaryPin(lat, lng) {
    const currentTime = Date.now();
    const { temporaryPinState } = pinState;

    console.log(`📍 一時的ピン表示開始: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);

    if (!isValidCoordinate(lat, lng)) {
        console.error('❌ 無効な座標値:', { lat, lng });
        return;
    }

    if (temporaryPinState.isCreating) {
        console.log('⏳ 既存の作成処理をキャンセルして新しい作成を開始');
        temporaryPinState.isCreating = false;
    }

    if (temporaryPinState.location &&
        Math.abs(temporaryPinState.location.lat - lat) < 0.000001 &&
        Math.abs(temporaryPinState.location.lng - lng) < 0.000001 &&
        temporaryPinState.pin) {
        console.log('📍 同じ位置のため、ピン表示をスキップ');
        return;
    }

    if (temporaryPinState.pin && temporaryPinState.location) {
        await performSmoothPinTransition(lat, lng);
        return;
    }

    temporaryPinState.isCreating = true;
    temporaryPinState.lastUpdate = currentTime;

    try {
        await removeTemporaryPinAsync();

        const tempPinIcon = L.divIcon({
            html: `
                <div class="temporary-pin pin-initial">
                    <div class="pin-pulse"></div>
                    <div class="pin-teardrop temporary">
                        <div class="pin-dot"></div>
                    </div>
                </div>
            `,
            className: 'temporary-pin-marker',
            iconSize: [32, 40],
            iconAnchor: [16, 40]
        });

        pinState.temporaryPin = L.marker([lat, lng], {
            icon: tempPinIcon,
            zIndexOffset: 1000
        }).addTo(map);

        temporaryPinState.pin = pinState.temporaryPin;
        temporaryPinState.location = { lat, lng };
        temporaryPinState.isCreating = false;
        temporaryPinState.lastUpdate = Date.now();

        console.log('📍 一時的ピン作成完了', pinState.temporaryPin);

        setTimeout(() => {
            const marker = pinState.temporaryPin;
            if (marker && marker._icon) {
                const pinElement = marker._icon.querySelector('.temporary-pin');
                if (pinElement) {
                    pinElement.classList.remove('pin-initial');
                    pinElement.classList.add('pin-appear');
                    console.log('📍 アニメーション開始: pin-appear クラス追加');
                } else {
                    console.error('❌ temporary-pin要素が見つかりません');
                }
            } else {
                console.error('❌ temporaryPin._icon が見つかりません');
            }
        }, PIN_APPEAR_DELAY);

        clearExistingTimeouts();

        pinState.temporaryPinTimeout = setTimeout(async () => {
            console.log('⏰ 一時ピン自動削除タイマー実行');
            await removeTemporaryPinAsync();
        }, AUTO_REMOVE_DELAY);

        temporaryPinState.timeout = pinState.temporaryPinTimeout;

        console.log(`📍 一時的ピン表示完了: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } catch (error) {
        console.error('❌ 一時ピン作成エラー:', error);
        temporaryPinState.isCreating = false;
        throw error;
    }
}

export function removeTemporaryPin() {
    return removeTemporaryPinAsync();
}

export function removeTemporaryPinAsync() {
    return new Promise((resolve) => {
        const { temporaryPinState } = pinState;

        try {
            if (temporaryPinState.isRemoving) {
                console.log('⏳ 既に削除処理中、前の処理完了を待機');
                const checkInterval = setInterval(() => {
                    if (!temporaryPinState.isRemoving) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, PIN_TRANSITION_CHECK_INTERVAL);
                return;
            }

            if (!pinState.temporaryPin && !temporaryPinState.pin) {
                resetTemporaryPinState();
                resolve();
                return;
            }

            temporaryPinState.isRemoving = true;
            const pinToRemove = pinState.temporaryPin || temporaryPinState.pin;

            if (pinToRemove) {
                try {
                    if (map && map.hasLayer(pinToRemove)) {
                        map.removeLayer(pinToRemove);
                    }
                } catch (removeError) {
                    console.error('❌ ピン削除エラー:', removeError);
                }

                console.log('📍 一時的ピン即座削除完了');
            }

            resetTemporaryPinState();
            resolve();
        } catch (error) {
            console.error('❌ 一時ピン削除処理エラー:', error);
            resetTemporaryPinState();
            resolve();
        }
    });
}

export function convertTemporaryPinToPermanent(season = 'その他') {
    if (!pinState.temporaryPin || !pinState.currentPinLocation) return null;

    const { lat, lng } = pinState.currentPinLocation;
    removeTemporaryPin();

    const seasonColor = MAP_CONFIG.MARKER_COLORS[season] || MAP_CONFIG.MARKER_COLORS['その他'];

    const permanentIcon = L.divIcon({
        html: `
            <div class="permanent-pin pin-appear">
                <div class="pin-teardrop ${season || 'その他'}" style="background-color: ${seasonColor};">
                    <div class="pin-dot"></div>
                </div>
            </div>
        `,
        className: 'permanent-pin-marker',
        iconSize: [24, 30],
        iconAnchor: [12, 30]
    });

    const permanentMarker = L.marker([lat, lng], {
        icon: permanentIcon,
        season
    }).addTo(map);

    console.log(`✅ 永続ピン作成: ${season} - ${lat.toFixed(6)}, ${lng.toFixed(6)}`);

    return permanentMarker;
}

export function resetTemporaryPinState() {
    try {
        clearExistingTimeouts();
        pinState.temporaryPin = null;

        resetTemporaryPinSnapshot();

        console.log('🔄 一時ピン状態リセット完了');
    } catch (error) {
        console.error('❌ 一時ピン状態リセットエラー:', error);
    }
}

async function performSmoothPinTransition(newLat, newLng) {
    const { temporaryPinState } = pinState;

    return new Promise((resolve) => {
        try {
            const currentPin = temporaryPinState.pin;
            if (!currentPin || !currentPin._icon) {
                console.warn('⚠️ スムーズ遷移: 現在のピンが見つかりません');
                resolve();
                return;
            }

            const iconElement = currentPin._icon.querySelector('.temporary-pin');
            if (!iconElement) {
                console.warn('⚠️ スムーズ遷移: ピン要素が見つかりません');
                resolve();
                return;
            }

            iconElement.classList.add('pin-transition-out', 'moving');

            setTimeout(() => {
                currentPin.setLatLng([newLat, newLng]);

                const pinElement = currentPin._icon?.querySelector('.temporary-pin');
                if (!pinElement) {
                    console.warn('⚠️ スムーズ遷移: ピン要素が見つかりません (更新後)');
                    resolve();
                    return;
                }

                pinElement.classList.remove('pin-transition-out', 'moving');
                pinElement.classList.add('pin-transition-in');

                temporaryPinState.location = { lat: newLat, lng: newLng };

                requestAnimationFrame(() => {
                    pinElement.classList.add('arriving');

                    setTimeout(() => {
                        pinElement.classList.remove('pin-transition-in', 'arriving');
                        pinElement.classList.add('pin-location-update');

                        setTimeout(() => {
                            pinElement.classList.remove('pin-location-update');
                            console.log(`🎯 スムーズピン遷移完了: ${newLat.toFixed(6)}, ${newLng.toFixed(6)}`);
                            resolve();
                        }, 400);
                    }, 200);
                });
            }, 100);
        } catch (error) {
            console.error('❌ スムーズピン遷移エラー:', error);
            resolve();
        }
    });
}

function clearExistingTimeouts() {
    if (pinState.temporaryPinTimeout) {
        clearTimeout(pinState.temporaryPinTimeout);
        pinState.temporaryPinTimeout = null;
    }
    if (pinState.temporaryPinState.timeout) {
        clearTimeout(pinState.temporaryPinState.timeout);
        pinState.temporaryPinState.timeout = null;
    }
}

function isValidCoordinate(lat, lng) {
    return typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);
}
