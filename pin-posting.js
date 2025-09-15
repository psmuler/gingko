/**
 * 俳句鑑賞＆記録アプリ - ピン投稿機能
 * Phase 2.1: 地図中心のピン投稿システム
 */

// =============================================================================
// グローバル変数
// =============================================================================

let inlineFormContainer = null;
let isInlineFormVisible = false;
let currentPinLocation = null;
let touchStartY = 0;
let touchStartTime = 0;

// 一時的なピン表示用
let temporaryPin = null;
let temporaryPinTimeout = null;

// 一時ピンの状態管理
let temporaryPinState = {
    pin: null,
    isCreating: false,
    isRemoving: false,
    timeout: null,
    location: null
};

// 地図クリックのデバウンス用変数
let mapClickDebounceTimeout = null;
let lastMapClickTime = 0;

// =============================================================================
// ピン投稿システム初期化
// =============================================================================

/**
 * ピン投稿システムの初期化
 */
function initializePinPosting() {
    createInlineFormHTML();
    setupMapClickHandler();
    setupSwipeHandlers();
    console.log('✅ ピン投稿システム初期化完了');
}

/**
 * 地図クリックハンドラーの設定
 */
function setupMapClickHandler() {
    map.on('click', handleMapClick);
}

/**
 * 地図クリック処理（デバウンス対応）
 * @param {Object} e - Leafletクリックイベント
 */
function handleMapClick(e) {
    const currentTime = Date.now();
    const { lat, lng } = e.latlng;

    // デバウンス処理：前回クリックから300ms以内の場合は無視
    if (currentTime - lastMapClickTime < 300) {
        console.log('⏳ 地図クリック無視（デバウンス）');
        return;
    }

    // 既存のデバウンスタイムアウトをクリア
    if (mapClickDebounceTimeout) {
        clearTimeout(mapClickDebounceTimeout);
    }

    // デバウンス処理：300ms後に実際の処理を実行
    mapClickDebounceTimeout = setTimeout(async () => {
        await handleMapClickAsync(lat, lng);
        lastMapClickTime = Date.now();
    }, 300);

    console.log(`📍 地図クリック受付: ${lat.toFixed(6)}, ${lng.toFixed(6)} (300ms後に処理)`);
}

/**
 * 地図クリック処理の実際の実行部分
 * @param {number} lat - 緯度
 * @param {number} lng - 経度
 */
async function handleMapClickAsync(lat, lng) {
    console.log(`📍 地図クリック処理開始: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);

    currentPinLocation = { lat, lng };

    // 一時的なピンを表示
    showTemporaryPin(lat, lng);

    // 既存俳句があるかチェック
    const existingHaikus = await checkExistingHaikusAtLocation(lat, lng);

    if (existingHaikus.length > 0) {
        // 既存俳句表示
        showExistingHaikuPopup(existingHaikus);
        // 一時的ピンを削除（既存俳句があるため）
        removeTemporaryPin();
    } else {
        // フォームが既に表示されている場合は位置情報を更新、そうでなければフォーム表示
        if (isInlineFormVisible) {
            updateFormLocationInfo(lat, lng);
            console.log(`📍 フォーム位置情報更新: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        } else {
            // 新句入力フォーム表示
            showInlineForm(lat, lng);
        }
    }
}

/**
 * 指定位置の既存俳句をチェック
 * @param {number} lat - 緯度
 * @param {number} lng - 経度
 * @param {number} radius - 検索半径（メートル）
 * @returns {Array} 既存俳句配列
 */
async function checkExistingHaikusAtLocation(lat, lng, radius = 100) {
    try {
        // 近接範囲での俳句検索
        const bounds = {
            north: lat + (radius / 111111),
            south: lat - (radius / 111111),
            east: lng + (radius / (111111 * Math.cos(lat * Math.PI / 180))),
            west: lng - (radius / (111111 * Math.cos(lat * Math.PI / 180)))
        };

        const haikus = await apiAdapter.getHaikusInBounds(bounds);
        return haikus || [];
    } catch (error) {
        console.error('❌ 既存俳句チェックエラー:', error);
        return [];
    }
}

// =============================================================================
// 一時的ピン表示機能
// =============================================================================

/**
 * 一時的なピンを表示（状態管理対応版）
 * @param {number} lat - 緯度
 * @param {number} lng - 経度
 * @returns {Promise} ピン表示完了のPromise
 */
async function showTemporaryPin(lat, lng) {
    console.log(`📍 一時的ピン表示開始: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);

    // 既に作成中の場合は待機
    if (temporaryPinState.isCreating) {
        console.log('⏳ 既にピン作成中、待機します...');
        return;
    }

    // 同じ位置の場合は何もしない
    if (temporaryPinState.location &&
        Math.abs(temporaryPinState.location.lat - lat) < 0.000001 &&
        Math.abs(temporaryPinState.location.lng - lng) < 0.000001) {
        console.log('📍 同じ位置のため、ピン表示をスキップ');
        return;
    }

    // 既存ピンがある場合は、スムーズ遷移を実行
    if (temporaryPinState.pin && temporaryPinState.location) {
        await performSmoothPinTransition(lat, lng);
        return;
    }

    temporaryPinState.isCreating = true;

    // 既存の一時的ピンを削除（削除完了を待機）
    await removeTemporaryPinAsync();

    // 一時的ピンのアイコンを作成
    const tempPinIcon = L.divIcon({
        html: `
            <div class="temporary-pin pin-initial">
                <div class="pin-pulse"></div>
                <div class="pin-icon">📍</div>
            </div>
        `,
        className: 'temporary-pin-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 35]
    });

    // 一時的ピンを作成
    temporaryPin = L.marker([lat, lng], {
        icon: tempPinIcon,
        zIndexOffset: 1000 // 他のマーカーより前面に表示
    }).addTo(map);

    // 状態を更新
    temporaryPinState.pin = temporaryPin;
    temporaryPinState.location = { lat, lng };
    temporaryPinState.isCreating = false;

    console.log(`📍 一時的ピン作成完了:`, temporaryPin);

    // DOMに追加されるのを待ってからアニメーション開始
    setTimeout(() => {
        if (temporaryPin && temporaryPin._icon) {
            const pinElement = temporaryPin._icon.querySelector('.temporary-pin');
            if (pinElement) {
                pinElement.classList.remove('pin-initial');
                pinElement.classList.add('pin-appear');
                console.log(`📍 アニメーション開始: pin-appear クラス追加`);
            } else {
                console.error('❌ temporary-pin要素が見つかりません');
            }
        } else {
            console.error('❌ temporaryPin._icon が見つかりません');
        }
    }, 100);

    // 10秒後に自動削除
    temporaryPinTimeout = setTimeout(async () => {
        await removeTemporaryPinAsync();
    }, 10000);

    temporaryPinState.timeout = temporaryPinTimeout;

    console.log(`📍 一時的ピン表示完了: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
}

/**
 * スムーズなピン遷移アニメーション
 * @param {number} newLat - 新しい緯度
 * @param {number} newLng - 新しい経度
 * @returns {Promise} 遷移完了のPromise
 */
async function performSmoothPinTransition(newLat, newLng) {
    return new Promise(async (resolve) => {
        console.log(`🎯 スムーズピン遷移開始: ${newLat.toFixed(6)}, ${newLng.toFixed(6)}`);

        const currentPin = temporaryPinState.pin;
        if (!currentPin || !currentPin._icon) {
            console.warn('⚠️ 遷移対象のピンが見つかりません');
            resolve();
            return;
        }

        // Step 1: 現在のピンに短縮遷移アウトアニメーションを適用
        const pinElement = currentPin._icon.querySelector('.temporary-pin');
        if (pinElement) {
            pinElement.classList.add('pin-transition-out', 'moving');
        }

        // Step 2: 100ms後に即座に位置を変更（高速化）
        setTimeout(() => {
            // Leafletマーカーの位置を変更
            currentPin.setLatLng([newLat, newLng]);

            // 状態を更新
            temporaryPinState.location = { lat: newLat, lng: newLng };

            // Step 3: 遷移インアニメーションを適用
            if (pinElement) {
                pinElement.classList.remove('pin-transition-out', 'moving');
                pinElement.classList.add('pin-transition-in');

                // Step 4: すぐに到着アニメーションを開始
                setTimeout(() => {
                    pinElement.classList.add('arriving');

                    // Step 5: 位置更新パルスエフェクトを追加
                    setTimeout(() => {
                        pinElement.classList.remove('pin-transition-in', 'arriving');
                        pinElement.classList.add('pin-location-update');

                        // アニメーション完了後にクラスをクリア
                        setTimeout(() => {
                            pinElement.classList.remove('pin-location-update');
                            console.log(`🎯 スムーズピン遷移完了: ${newLat.toFixed(6)}, ${newLng.toFixed(6)}`);
                            resolve();
                        }, 400); // location-update-pulse animation duration (短縮)
                    }, 200); // pin-transition-in animation duration (短縮)
                }, 30);
            } else {
                resolve();
            }
        }, 100); // pin-transition-out animation duration (大幅短縮)
    });
}

/**
 * 一時的なピンを削除（旧関数 - 互換性のため保持）
 */
function removeTemporaryPin() {
    return removeTemporaryPinAsync();
}

/**
 * 一時的なピンを非同期で削除（即座に削除・即応性重視）
 * @returns {Promise} 削除完了のPromise
 */
function removeTemporaryPinAsync() {
    return new Promise((resolve) => {
        // 既に削除中の場合は何もしない
        if (temporaryPinState.isRemoving) {
            resolve();
            return;
        }

        // ピンが存在しない場合は即座に完了
        if (!temporaryPin && !temporaryPinState.pin) {
            temporaryPinState.isRemoving = false;
            resolve();
            return;
        }

        temporaryPinState.isRemoving = true;
        const pinToRemove = temporaryPin || temporaryPinState.pin;

        if (pinToRemove) {
            // アニメーションなしで即座に削除
            if (map.hasLayer(pinToRemove)) {
                map.removeLayer(pinToRemove);
            }

            // 状態をリセット
            temporaryPin = null;
            temporaryPinState.pin = null;
            temporaryPinState.isRemoving = false;
            temporaryPinState.location = null;

            console.log('📍 一時的ピン即座削除完了');
        } else {
            temporaryPinState.isRemoving = false;
        }

        // タイムアウトをクリア
        if (temporaryPinTimeout) {
            clearTimeout(temporaryPinTimeout);
            temporaryPinTimeout = null;
        }
        if (temporaryPinState.timeout) {
            clearTimeout(temporaryPinState.timeout);
            temporaryPinState.timeout = null;
        }

        // 即座に完了
        resolve();
    });
}

/**
 * 一時的ピンを永続ピンに変換
 * @param {string} season - 季節
 * @returns {L.Marker} 新しい永続マーカー
 */
function convertTemporaryPinToPermanent(season = 'その他') {
    if (!temporaryPin || !currentPinLocation) return null;

    const { lat, lng } = currentPinLocation;

    // 一時的ピンを削除
    removeTemporaryPin();

    // 季節に応じた色を取得
    const seasonConfig = {
        '春': { color: '#3498db', textColor: '#ffffff' },
        '夏': { color: '#e74c3c', textColor: '#ffffff' },
        '秋': { color: '#ffffff', textColor: '#333333' },
        '冬': { color: '#2c3e50', textColor: '#ffffff' },
        '暮・新年': { color: '#f1c40f', textColor: '#333333' },
        'その他': { color: '#95a5a6', textColor: '#ffffff' }
    }[season] || { color: '#95a5a6', textColor: '#ffffff' };

    // 永続マーカーのアイコンを作成
    const permanentIcon = L.divIcon({
        html: `
            <div class="permanent-haiku-pin" style="
                background-color: ${seasonConfig.color};
                color: ${seasonConfig.textColor};
                border: 2px solid rgba(0,0,0,0.3);
            ">
                <div class="pin-content">俳</div>
            </div>
        `,
        className: 'permanent-pin-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });

    // 永続マーカーを作成
    const permanentMarker = L.marker([lat, lng], {
        icon: permanentIcon,
        season: season
    }).addTo(map);

    console.log(`✅ 永続ピン作成: ${season} - ${lat.toFixed(6)}, ${lng.toFixed(6)}`);

    return permanentMarker;
}

// =============================================================================
// インラインフォーム管理
// =============================================================================

/**
 * インラインフォームHTMLの作成
 */
function createInlineFormHTML() {
    const formHTML = `
        <div id="inline-form-container" class="inline-form">
            <div class="swipe-indicator"></div>
            <div class="form-header">
                <h3>俳句を投稿</h3>
                <button class="close-btn" onclick="hideInlineForm()">×</button>
            </div>

            <form id="inline-haiku-form" onsubmit="handleInlineSubmit(event)">
                <div class="form-group">
                    <label for="inline-haiku-text">俳句 *</label>
                    <textarea id="inline-haiku-text" name="haiku_text" required
                              placeholder="古池や&#10;蛙飛び込む&#10;水の音"
                              rows="3"></textarea>
                </div>

                <div id="season-suggest-container" class="season-suggest">
                    <!-- 季語サジェストボタンがここに表示される -->
                </div>

                <div class="form-row">
                    <div class="form-group half">
                        <label for="inline-poet-name">詠み人</label>
                        <input type="text" id="inline-poet-name" name="poet_name"
                               placeholder="松尾芭蕉">
                    </div>
                    <div class="form-group half">
                        <label for="inline-season">季節</label>
                        <select id="inline-season" name="season">
                            <option value="">選択</option>
                            <option value="春">春</option>
                            <option value="夏">夏</option>
                            <option value="秋">秋</option>
                            <option value="冬">冬</option>
                            <option value="暮・新年">暮・新年</option>
                            <option value="その他">その他</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label for="inline-location-name">場所名</label>
                    <input type="text" id="inline-location-name" name="location_name"
                           placeholder="深川">
                </div>

                <div class="form-actions">
                    <button type="button" onclick="hideInlineForm()" class="secondary-btn">
                        キャンセル
                    </button>
                    <button type="submit" class="primary-btn">
                        投稿
                    </button>
                </div>
            </form>
        </div>
    `;

    // body に追加
    document.body.insertAdjacentHTML('beforeend', formHTML);
    inlineFormContainer = document.getElementById('inline-form-container');
}

/**
 * インラインフォームの表示
 * @param {number} lat - 緯度
 * @param {number} lng - 経度
 */
function showInlineForm(lat, lng) {
    if (!inlineFormContainer) return;

    // 位置情報をフォームにセット
    currentPinLocation = { lat, lng };

    // フォームリセット
    document.getElementById('inline-haiku-form').reset();
    document.getElementById('season-suggest-container').innerHTML = '';

    // フォーム表示
    inlineFormContainer.classList.add('active');
    isInlineFormVisible = true;

    // フォーカス設定
    setTimeout(() => {
        document.getElementById('inline-haiku-text').focus();
    }, 300);

    console.log(`📍 インラインフォーム表示: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
}

/**
 * インラインフォームの非表示
 */
function hideInlineForm() {
    if (!inlineFormContainer) return;

    inlineFormContainer.classList.remove('active');
    isInlineFormVisible = false;

    // 一時的ピンを削除
    removeTemporaryPin();

    currentPinLocation = null;

    console.log('📍 インラインフォーム非表示');
}

/**
 * フォーム表示中の位置情報自動更新
 * @param {number} lat - 新しい緯度
 * @param {number} lng - 新しい経度
 */
function updateFormLocationInfo(lat, lng) {
    // 位置情報をグローバル変数に更新
    currentPinLocation = { lat, lng };

    // フォームの位置表示を更新（もし位置表示フィールドがあれば）
    const locationDisplayElements = document.querySelectorAll('.location-display');
    locationDisplayElements.forEach(element => {
        element.textContent = `緯度: ${lat.toFixed(6)}, 経度: ${lng.toFixed(6)}`;
    });

    // フォーム内の隠し位置フィールドを更新（もしあれば）
    const latField = document.getElementById('inline-latitude');
    const lngField = document.getElementById('inline-longitude');
    if (latField) latField.value = lat;
    if (lngField) lngField.value = lng;

    // フォームヘッダーに位置更新の視覚的フィードバックを追加
    const formHeader = inlineFormContainer?.querySelector('.form-header h3');
    if (formHeader) {
        const originalText = formHeader.textContent;
        formHeader.textContent = '位置更新しました';
        formHeader.style.color = '#2ecc71';

        // 2秒後に元に戻す
        setTimeout(() => {
            formHeader.textContent = originalText;
            formHeader.style.color = '';
        }, 2000);
    }

    console.log(`📍 フォーム位置情報更新完了: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
}

/**
 * インラインフォーム投稿処理
 * @param {Event} event - submitイベント
 */
async function handleInlineSubmit(event) {
    event.preventDefault();

    if (!currentPinLocation) {
        showErrorMessage('位置情報が取得できません');
        return;
    }

    if (isSubmittingHaiku) return;

    try {
        isSubmittingHaiku = true;
        const formData = new FormData(event.target);

        // 俳句データの構築
        const haikuData = {
            haiku_text: formData.get('haiku_text'),
            poet_name: formData.get('poet_name') || '詠み人知らず',
            latitude: currentPinLocation.lat,
            longitude: currentPinLocation.lng,
            location_type: 'ゆかりの地', // デフォルト
            location_name: formData.get('location_name') || '',
            season: formData.get('season') || 'その他',
            seasonal_term: formData.get('seasonal_term') || ''
        };

        console.log('📍 俳句投稿開始:', haikuData);

        // API投稿
        await submitHaikuData(haikuData);

        // 一時的ピンを永続ピンに変換
        convertTemporaryPinToPermanent(haikuData.season);

        // 成功処理
        showSuccessMessage('俳句を投稿しました！');
        hideInlineForm();

        // 地図データ更新
        await loadHaikuData();

    } catch (error) {
        console.error('❌ 俳句投稿エラー:', error);
        showErrorMessage('投稿に失敗しました: ' + error.message);
    } finally {
        isSubmittingHaiku = false;
    }
}

// =============================================================================
// スワイプ遷移機能
// =============================================================================

/**
 * スワイプハンドラーの設定
 */
function setupSwipeHandlers() {
    if (!inlineFormContainer) return;

    inlineFormContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
    inlineFormContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
    inlineFormContainer.addEventListener('touchend', handleTouchEnd, { passive: true });
}

/**
 * タッチ開始処理
 * @param {TouchEvent} e - タッチイベント
 */
function handleTouchStart(e) {
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
}

/**
 * タッチ移動処理
 * @param {TouchEvent} e - タッチイベント
 */
function handleTouchMove(e) {
    const currentY = e.touches[0].clientY;
    const deltaY = touchStartY - currentY;

    // 上スワイプ検出（50px以上）
    if (deltaY > 50) {
        e.preventDefault(); // スクロール防止
    }
}

/**
 * タッチ終了処理
 * @param {TouchEvent} e - タッチイベント
 */
function handleTouchEnd(e) {
    const touchEndY = e.changedTouches[0].clientY;
    const deltaY = touchStartY - touchEndY;
    const touchDuration = Date.now() - touchStartTime;

    // 上スワイプ判定：50px以上、500ms以内
    if (deltaY > 50 && touchDuration < 500) {
        transitionToDetailForm();
    }
}

/**
 * 詳細フォーム画面への遷移
 */
function transitionToDetailForm() {
    console.log('📱 詳細フォーム遷移');

    // 既存の投稿フォームを表示
    if (typeof toggleHaikuForm === 'function') {
        // 現在の入力値を移行
        const haikuText = document.getElementById('inline-haiku-text').value;
        const poetName = document.getElementById('inline-poet-name').value;
        const season = document.getElementById('inline-season').value;
        const locationName = document.getElementById('inline-location-name').value;

        // インラインフォーム非表示
        hideInlineForm();

        // 詳細フォーム表示
        toggleHaikuForm();

        // データ移行
        setTimeout(() => {
            const detailForm = document.getElementById('haiku-form');
            if (detailForm) {
                detailForm.querySelector('#haiku-text').value = haikuText;
                detailForm.querySelector('#poet-name').value = poetName;
                detailForm.querySelector('#location-name').value = locationName;
                if (currentPinLocation) {
                    detailForm.querySelector('#latitude').value = currentPinLocation.lat;
                    detailForm.querySelector('#longitude').value = currentPinLocation.lng;
                }

                // 季節設定
                const seasonSelect = detailForm.querySelector('select[name="location_type"]');
                if (seasonSelect && season) {
                    seasonSelect.value = season;
                }
            }
        }, 100);
    }
}

// =============================================================================
// 既存俳句ポップアップ
// =============================================================================

/**
 * 既存俳句ポップアップの表示
 * @param {Array} haikus - 俳句データ配列
 */
function showExistingHaikuPopup(haikus) {
    if (haikus.length === 0) return;

    const haiku = haikus[0]; // 最初の俳句を表示

    const popupContent = `
        <div class="haiku-popup">
            <div class="haiku-text">${haiku.haiku_text}</div>
            <div class="haiku-info">
                <div class="poet-name">${haiku.poet_name}</div>
                <div class="location-info">${haiku.location_name || ''}</div>
            </div>
        </div>
    `;

    // Leafletポップアップで表示
    L.popup()
        .setLatLng([currentPinLocation.lat, currentPinLocation.lng])
        .setContent(popupContent)
        .openOn(map);
}

// =============================================================================
// ユーティリティ関数
// =============================================================================

/**
 * 俳句データの投稿
 * @param {Object} haikuData - 俳句データ
 */
async function submitHaikuData(haikuData) {
    // 詠み人の処理
    let poetId = null;
    if (haikuData.poet_name && haikuData.poet_name !== '詠み人知らず') {
        const existingPoets = await apiAdapter.searchPoets(haikuData.poet_name);
        if (existingPoets.length > 0) {
            poetId = existingPoets[0].id;
        }
    }

    // 投稿データの構築
    const submitData = {
        haiku_text: haikuData.haiku_text,
        poet_id: poetId,
        latitude: haikuData.latitude,
        longitude: haikuData.longitude,
        location_type: haikuData.location_type,
        location_name: haikuData.location_name,
        season: haikuData.season,
        seasonal_term: haikuData.seasonal_term
    };

    const result = await apiAdapter.createHaiku(submitData);
    if (!result.success) {
        throw new Error('投稿に失敗しました');
    }

    return result;
}

// =============================================================================
// デバッグ・テスト機能
// =============================================================================

/**
 * デバッグ用のシンプルピン表示
 * @param {number} lat - 緯度
 * @param {number} lng - 経度
 */
function showDebugPin(lat, lng) {
    console.log(`🔧 デバッグピン表示開始: ${lat}, ${lng}`);

    // シンプルなHTMLでピンを作成
    const debugIcon = L.divIcon({
        html: `
            <div style="
                width: 30px;
                height: 30px;
                background: red;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 14px;
            ">
                📍
            </div>
        `,
        className: 'debug-pin-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });

    const debugPin = L.marker([lat, lng], {
        icon: debugIcon,
        zIndexOffset: 2000
    }).addTo(map);

    console.log(`🔧 デバッグピン作成:`, debugPin);

    // 5秒後に削除
    setTimeout(() => {
        map.removeLayer(debugPin);
        console.log(`🔧 デバッグピン削除`);
    }, 5000);

    return debugPin;
}

// =============================================================================
// 初期化時の自動実行
// =============================================================================

// 地図初期化完了後にピン投稿システムを初期化
document.addEventListener('DOMContentLoaded', () => {
    // 地図初期化の完了を待つ
    const checkMapInitialized = setInterval(() => {
        if (window.map && window.map._leaflet_id) {
            initializePinPosting();
            clearInterval(checkMapInitialized);
        }
    }, 100);
});