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

// 一時ピンの状態管理（Phase 2 強化版）
let temporaryPinState = {
    pin: null,
    isCreating: false,
    isRemoving: false,
    timeout: null,
    location: null,
    lastUpdate: 0,          // タイムスタンプ追加
    creationId: null        // 作成ID追加（競合状態防止）
};

// 地図クリックのデバウンス用変数
let mapClickDebounceTimeout = null;
let lastMapClickTime = 0;

// 既存俳句データのメモリキャッシュ（高速検索用）
let haikuDataCache = [];
let pinCacheLastUpdated = 0;
const PIN_CACHE_REFRESH_INTERVAL = 60000; // 1分間キャッシュを保持

// フォーム状態管理用変数（入力データ保護機能）
let formState = {
    isVisible: false,
    hasUnsavedData: false,      // 未保存データの有無
    lastInputTime: 0,           // 最終入力時刻
    inputData: {},              // 入力データのバックアップ
    autoSaveInterval: null      // 自動保存タイマー
};

// =============================================================================
// ピン投稿システム初期化
// =============================================================================

/**
 * ピン投稿システムの初期化
 */
function initializePinPosting() {
    console.log('🚀 ピン投稿システム初期化開始');

    try {
        createInlineFormHTML();
        console.log('✅ インラインフォームHTML作成完了');

        // DOM追加の完了を少し待つ
        setTimeout(() => {
            setupMapClickHandler();
            console.log('✅ 地図クリックハンドラー設定完了');

            setupSwipeHandlers();
            console.log('✅ ピン投稿システム初期化完了');
        }, 100);

    } catch (error) {
        console.error('❌ ピン投稿システム初期化エラー:', error);
    }
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
    // 防御的チェック: イベントオブジェクトの検証
    if (!e || !e.latlng || typeof e.latlng.lat !== 'number' || typeof e.latlng.lng !== 'number') {
        console.error('❌ 無効な地図クリックイベント:', e);
        console.error('📍 イベント詳細:', {
            event: e,
            latlng: e?.latlng,
            latType: typeof e?.latlng?.lat,
            lngType: typeof e?.latlng?.lng
        });
        return;
    }

    const currentTime = Date.now();
    const { lat, lng } = e.latlng;

    // デバウンス処理：前回クリックから50ms以内の場合は無視（高速化）
    if (currentTime - lastMapClickTime < 50) {
        console.log('⏳ 地図クリック無視（デバウンス）');
        return;
    }

    // 既存のデバウンスタイムアウトをクリア
    if (mapClickDebounceTimeout) {
        clearTimeout(mapClickDebounceTimeout);
    }

    // デバウンス処理：50ms後に実際の処理を実行（高速化）
    mapClickDebounceTimeout = setTimeout(async () => {
        await handleMapClickAsync(lat, lng);
        lastMapClickTime = Date.now();
    }, 50);

    console.log(`📍 地図クリック受付: ${lat.toFixed(6)}, ${lng.toFixed(6)} (50ms後に処理)`);
}

/**
 * 地図クリック処理の実際の実行部分
 * @param {number} lat - 緯度
 * @param {number} lng - 経度
 */
async function handleMapClickAsync(lat, lng) {
    try {
        // 入力値の検証
        if (typeof lat !== 'number' || typeof lng !== 'number' ||
            isNaN(lat) || isNaN(lng) ||
            Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            console.error('❌ 無効な座標値:', { lat, lng });
            return;
        }

        console.log(`📍 地図クリック処理開始: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);

    // ポップアップが開いている場合は、ポップアップを閉じるだけで新規フォームは表示しない
    if (map && map._popup && map.hasLayer(map._popup) && map._popup.isOpen()) {
        console.log(`📍 ポップアップ開いているため、クリック処理をスキップ`);
        map.closePopup();
        return;
    }

    // 既存俳句があるかを先にチェック
    const existingHaikus = await checkExistingHaikusAtLocation(lat, lng);

    if (existingHaikus.length > 0) {
        // 既存俳句がある場合
        console.log(`📍 既存俳句発見: ${existingHaikus.length}件`);

        // 既存のフォームや一時ピンをクリア
        hideInlineForm();
        removeTemporaryPin();

        // 既存俳句表示（オプション付き）
        showExistingHaikuPopupWithOptions(existingHaikus, lat, lng);
    } else {
        // 既存俳句がない場合のみ新規入力処理
        console.log(`📍 新規入力エリア: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);

        currentPinLocation = { lat, lng };

        // 一時的なピンを表示
        showTemporaryPin(lat, lng);

        // フォームが既に表示されている場合は位置情報を更新、そうでなければフォーム表示
        if (isInlineFormVisible) {
            updateFormLocationInfo(lat, lng);
            console.log(`📍 フォーム位置情報更新: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        } else {
            // 新句入力フォーム表示
            showInlineForm(lat, lng);
        }
    }
    } catch (error) {
        console.error('❌ 地図クリック処理エラー:', error);
        console.error('📍 エラー詳細:', { lat, lng, error: error.message, stack: error.stack });

        // エラー時のフォールバック処理
        try {
            hideInlineForm();
            removeTemporaryPin();
        } catch (fallbackError) {
            console.error('❌ フォールバック処理も失敗:', fallbackError);
        }
    }
}

/**
 * 俳句データキャッシュを更新
 */
async function refreshHaikuCache() {
    try {
        const currentTime = Date.now();
        if (currentTime - pinCacheLastUpdated < PIN_CACHE_REFRESH_INTERVAL && haikuDataCache.length > 0) {
            return; // キャッシュがまだ有効
        }

        console.log('🔄 俳句データキャッシュ更新中...');
        const haikus = await apiAdapter.getHaikusForMap();
        haikuDataCache = haikus || [];
        pinCacheLastUpdated = currentTime;
        console.log(`✅ 俳句データキャッシュ更新完了: ${haikuDataCache.length}件`);
    } catch (error) {
        console.error('❌ 俳句データキャッシュ更新エラー:', error);
    }
}

/**
 * 指定位置の既存俳句をチェック（高速キャッシュ版）
 * @param {number} lat - 緯度
 * @param {number} lng - 経度
 * @param {number} radius - 検索半径（メートル）
 * @returns {Array} 既存俳句配列
 */
async function checkExistingHaikusAtLocation(lat, lng, radius = 100) {
    try {
        // キャッシュを確認・更新
        await refreshHaikuCache();

        // メモリキャッシュから高速検索
        const radiusInDegrees = radius / 111111; // メートルを度に変換
        const lngRadiusInDegrees = radiusInDegrees / Math.cos(lat * Math.PI / 180);

        const nearbyHaikus = haikuDataCache.filter(haiku => {
            if (!haiku.latitude || !haiku.longitude) return false;

            const latDiff = Math.abs(haiku.latitude - lat);
            const lngDiff = Math.abs(haiku.longitude - lng);

            return latDiff <= radiusInDegrees && lngDiff <= lngRadiusInDegrees;
        });

        console.log(`📍 高速検索結果: ${nearbyHaikus.length}件 (キャッシュから)`);
        return nearbyHaikus;
    } catch (error) {
        console.error('❌ 既存俳句チェックエラー:', error);
        return [];
    }
}

// =============================================================================
// 一時的ピン表示機能
// =============================================================================

/**
 * 一時的なピンを表示（状態管理対応版・競合状態解消）
 * @param {number} lat - 緯度
 * @param {number} lng - 経度
 * @returns {Promise} ピン表示完了のPromise
 */
async function showTemporaryPin(lat, lng) {
    const currentTime = Date.now();
    const creationId = currentTime; // 一意のID生成

    console.log(`📍 一時的ピン表示開始: ${lat.toFixed(6)}, ${lng.toFixed(6)} [ID: ${creationId}]`);

    // 入力値検証
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
        console.error('❌ 無効な座標値:', { lat, lng });
        return;
    }

    // 既に作成中の場合は前の作成をキャンセル
    if (temporaryPinState.isCreating) {
        console.log('⏳ 既存の作成処理をキャンセルして新しい作成を開始');
        temporaryPinState.isCreating = false;
    }

    // 同じ位置の場合は何もしない（精度向上）
    if (temporaryPinState.location &&
        Math.abs(temporaryPinState.location.lat - lat) < 0.000001 &&
        Math.abs(temporaryPinState.location.lng - lng) < 0.000001 &&
        temporaryPinState.pin) {
        console.log('📍 同じ位置のため、ピン表示をスキップ');
        return;
    }

    // 既存ピンがある場合は、スムーズ遷移を実行
    if (temporaryPinState.pin && temporaryPinState.location) {
        await performSmoothPinTransition(lat, lng);
        return;
    }

    // 排他制御フラグ設定
    temporaryPinState.isCreating = true;
    temporaryPinState.creationId = creationId;
    temporaryPinState.lastUpdate = currentTime;

    try {
        // 既存の一時的ピンを削除（削除完了を待機）
        await removeTemporaryPinAsync();

    // 一時的ピンのアイコンを作成（涙型デザイン）
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

        // 作成ID確認（競合状態チェック）
        if (temporaryPinState.creationId !== creationId) {
            console.log('⚠️ 作成ID不一致、ピン作成を中止');
            return;
        }

        // 一時的ピンを作成
        temporaryPin = L.marker([lat, lng], {
            icon: tempPinIcon,
            zIndexOffset: 1000 // 他のマーカーより前面に表示
        }).addTo(map);

        // 状態を更新
        temporaryPinState.pin = temporaryPin;
        temporaryPinState.location = { lat, lng };
        temporaryPinState.isCreating = false;
        temporaryPinState.lastUpdate = Date.now();

        console.log(`📍 一時的ピン作成完了: [ID: ${creationId}]`, temporaryPin);

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

        // 自動削除タイムアウトをクリア（既存のものがあれば）
        if (temporaryPinState.timeout) {
            clearTimeout(temporaryPinState.timeout);
        }
        if (temporaryPinTimeout) {
            clearTimeout(temporaryPinTimeout);
        }

        // 15秒後に自動削除（延長）
        temporaryPinTimeout = setTimeout(async () => {
            console.log('⏰ 一時ピン自動削除タイマー実行');
            await removeTemporaryPinAsync();
        }, 15000);

        temporaryPinState.timeout = temporaryPinTimeout;

        console.log(`📍 一時的ピン表示完了: ${lat.toFixed(6)}, ${lng.toFixed(6)} [ID: ${creationId}]`);

    } catch (error) {
        console.error('❌ 一時ピン作成エラー:', error);
        temporaryPinState.isCreating = false;
        temporaryPinState.creationId = null;
        throw error;
    }
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
 * 一時的なピンを非同期で削除（競合状態防止・安全性強化）
 * @returns {Promise} 削除完了のPromise
 */
function removeTemporaryPinAsync() {
    return new Promise((resolve) => {
        try {
            // 既に削除中の場合は前の削除完了を待つ
            if (temporaryPinState.isRemoving) {
                console.log('⏳ 既に削除処理中、前の処理完了を待機');
                const checkInterval = setInterval(() => {
                    if (!temporaryPinState.isRemoving) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 10);
                return;
            }

            // ピンが存在しない場合は即座に完了
            if (!temporaryPin && !temporaryPinState.pin) {
                // 状態を確実にリセット
                resetTemporaryPinState();
                resolve();
                return;
            }

            temporaryPinState.isRemoving = true;
            const pinToRemove = temporaryPin || temporaryPinState.pin;

            if (pinToRemove) {
                // アニメーションなしで即座に削除
                try {
                    if (map && map.hasLayer(pinToRemove)) {
                        map.removeLayer(pinToRemove);
                    }
                } catch (removeError) {
                    console.error('❌ ピン削除エラー:', removeError);
                }

                console.log('📍 一時的ピン即座削除完了');
            }

            // 状態を安全にリセット
            resetTemporaryPinState();

            // 即座に完了
            resolve();

        } catch (error) {
            console.error('❌ 一時ピン削除処理エラー:', error);
            // エラー時も状態をリセット
            resetTemporaryPinState();
            resolve();
        }
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

    // 季節に応じた色を取得（configから）
    const seasonColor = MAP_CONFIG.MARKER_COLORS[season] || MAP_CONFIG.MARKER_COLORS['その他'];

    // 永続マーカーのアイコンを作成（涙型デザイン）
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

    // 永続マーカーを作成
    const permanentMarker = L.marker([lat, lng], {
        icon: permanentIcon,
        season: season
    }).addTo(map);

    console.log(`✅ 永続ピン作成: ${season} - ${lat.toFixed(6)}, ${lng.toFixed(6)}`);

    return permanentMarker;
}

/**
 * 一時ピン状態を安全にリセット
 */
function resetTemporaryPinState() {
    try {
        // タイムアウトをクリア
        if (temporaryPinTimeout) {
            clearTimeout(temporaryPinTimeout);
            temporaryPinTimeout = null;
        }
        if (temporaryPinState.timeout) {
            clearTimeout(temporaryPinState.timeout);
            temporaryPinState.timeout = null;
        }

        // 状態をリセット
        temporaryPin = null;
        temporaryPinState.pin = null;
        temporaryPinState.isRemoving = false;
        temporaryPinState.isCreating = false;
        temporaryPinState.location = null;
        temporaryPinState.lastUpdate = 0;
        temporaryPinState.creationId = null;

        console.log('🔄 一時ピン状態リセット完了');
    } catch (error) {
        console.error('❌ 一時ピン状態リセットエラー:', error);
    }
}

// =============================================================================
// インラインフォーム管理
// =============================================================================

/**
 * インラインフォームHTMLの作成（Phase 2: 季語サジェスト対応）
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
                    <textarea id="inline-haiku-text" name="haiku_text" required
                              placeholder="斧入れて香に驚くや冬木立"
                              rows="1"></textarea>
                </div>

                <!-- 季語サジェスト機能 -->
                <div class="kigo-section">
                    <div id="kigo-suggestions" class="kigo-suggestions">
                        <!-- 動的に生成される季語ボタン -->
                    </div>
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

    if (inlineFormContainer) {
        console.log('✅ インラインフォームコンテナDOMに追加成功');
    } else {
        console.error('❌ インラインフォームコンテナの追加に失敗');
    }
}

/**
 * インラインフォームの表示
 * @param {number} lat - 緯度
 * @param {number} lng - 経度
 */
function showInlineForm(lat, lng) {
    console.log(`📍 インラインフォーム表示開始: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);

    if (!inlineFormContainer) {
        console.error('❌ inlineFormContainer が見つかりません');
        return;
    }

    // 位置情報をフォームにセット
    currentPinLocation = { lat, lng };

    // フォームリセット（簡素化版）
    const form = document.getElementById('inline-haiku-form');
    if (form) {
        form.reset();
        console.log('✅ フォームリセット完了');
    } else {
        console.error('❌ inline-haiku-form が見つかりません');
        return;
    }

    // フォーム表示
    inlineFormContainer.classList.add('active');
    isInlineFormVisible = true;
    console.log('✅ フォーム表示クラス追加完了');

    // フォーカス設定と季語サジェスト機能のアタッチ
    setTimeout(() => {
        const textArea = document.getElementById('inline-haiku-text');
        if (textArea) {
            textArea.focus();
            console.log('✅ フォーカス設定完了');

            // 季語サジェスト機能をアタッチ
            if (typeof attachKigoSuggestionToInput === 'function') {
                attachKigoSuggestionToInput('inline-haiku-text', 'kigo-suggestions');
                console.log('✅ 季語サジェスト機能アタッチ完了');
            } else {
                console.warn('⚠️ 季語サジェスト機能が利用できません');
            }
        } else {
            console.error('❌ inline-haiku-text が見つかりません');
        }
    }, 300);

    console.log(`✅ インラインフォーム表示完了: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
}

/**
 * インラインフォームの非表示
 */
function hideInlineForm() {
    if (!inlineFormContainer) return;

    inlineFormContainer.classList.remove('active');
    isInlineFormVisible = false;

    // 一時的ピンを削除（非同期で安全に）
    removeTemporaryPinAsync().catch(error => {
        console.error('❌ フォーム非表示時のピン削除エラー:', error);
    });

    // 一時ピンの状態も確実にリセット
    resetTemporaryPinState();

    currentPinLocation = null;

    // 季語選択状態もリセット
    if (typeof resetKigoSelection === 'function') {
        resetKigoSelection();
        console.log('✅ 季語選択状態リセット完了');
    }

    console.log('📍 インラインフォーム非表示 + 一時ピン状態リセット');
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

        // 季語選択状態を取得
        let selectedKigoInfo = { season: 'その他', selectedKigo: null, isSeasonless: false };
        if (typeof getCurrentKigoSelection === 'function') {
            selectedKigoInfo = getCurrentKigoSelection();
        }

        // 俳句データの構築（Phase 2: 季語情報統合）
        const haikuData = {
            haiku_text: formData.get('haiku_text'),
            poet_name: '詠み人知らず',              // デフォルト
            latitude: currentPinLocation.lat,
            longitude: currentPinLocation.lng,
            location_type: 'ゆかりの地',           // デフォルト
            location_name: '',                     // 空文字
            season: selectedKigoInfo.season || 'その他',
            seasonal_term: selectedKigoInfo.selectedKigo?.display_name || '',
            description: '',                       // 空文字
            date_composed: new Date().toISOString().split('T')[0] // 今日の日付
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
// 入力データ保護機能
// =============================================================================

/**
 * 未保存フォームデータがあるかチェック
 * @returns {boolean} 未保存データの有無
 */
function hasUnsavedFormData() {
    if (!isInlineFormVisible) return false;

    const textArea = document.getElementById('inline-haiku-text');
    if (!textArea) return false;

    const currentText = textArea.value.trim();
    return currentText.length > 0;
}

/**
 * フォームデータ保護機能のセットアップ
 * @param {HTMLTextAreaElement} textArea - テキストエリア要素
 */
function setupFormDataProtection(textArea) {
    if (!textArea) return;

    // 入力イベントリスナーを設定
    textArea.addEventListener('input', function() {
        formState.lastInputTime = Date.now();
        formState.hasUnsavedData = this.value.trim().length > 0;

        // 入力データをバックアップ
        formState.inputData.haikuText = this.value;

        console.log('📝 入力データ更新:', {
            hasData: formState.hasUnsavedData,
            length: this.value.length
        });
    });

    // 自動保存タイマーを設定（5秒間隔）
    if (formState.autoSaveInterval) {
        clearInterval(formState.autoSaveInterval);
    }

    formState.autoSaveInterval = setInterval(() => {
        if (formState.hasUnsavedData && textArea.value.trim()) {
            // ローカルストレージに自動保存
            localStorage.setItem('haiku_draft_backup', JSON.stringify({
                text: textArea.value,
                timestamp: Date.now(),
                location: currentPinLocation
            }));
            console.log('💾 自動保存実行');
        }
    }, 5000);

    console.log('🛡️ フォームデータ保護機能セットアップ完了');
}

/**
 * フォーム状態をリセット
 */
function resetFormState() {
    formState.isVisible = false;
    formState.hasUnsavedData = false;
    formState.lastInputTime = 0;
    formState.inputData = {};

    if (formState.autoSaveInterval) {
        clearInterval(formState.autoSaveInterval);
        formState.autoSaveInterval = null;
    }

    // バックアップデータをクリア
    localStorage.removeItem('haiku_draft_backup');

    console.log('🔄 フォーム状態リセット完了');
}

/**
 * 確認プロンプトなしでフォームを強制非表示
 */
function forceHideInlineForm() {
    if (!inlineFormContainer) return;

    inlineFormContainer.classList.remove('active');
    isInlineFormVisible = false;

    resetFormState();

    console.log('📍 フォーム強制非表示完了');
}

/**
 * バックアップデータから復元
 * @returns {Object|null} 復元されたデータまたはnull
 */
function restoreFromBackup() {
    try {
        const backupData = localStorage.getItem('haiku_draft_backup');
        if (!backupData) return null;

        const parsed = JSON.parse(backupData);
        const age = Date.now() - parsed.timestamp;

        // 1時間以内のバックアップのみ有効
        if (age > 60 * 60 * 1000) {
            localStorage.removeItem('haiku_draft_backup');
            return null;
        }

        return parsed;
    } catch (error) {
        console.error('❌ バックアップ復元エラー:', error);
        return null;
    }
}

// =============================================================================
// スワイプ遷移機能
// =============================================================================

/**
 * スワイプハンドラーの設定
 */
function setupSwipeHandlers() {
    console.log('📱 スワイプハンドラー設定開始');

    if (!inlineFormContainer) {
        console.warn('⚠️ スワイプハンドラー設定をスキップ: inlineFormContainer が未初期化');
        return;
    }

    try {
        inlineFormContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
        inlineFormContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
        inlineFormContainer.addEventListener('touchend', handleTouchEnd, { passive: true });
        console.log('✅ スワイプハンドラー設定完了');
    } catch (error) {
        console.error('❌ スワイプハンドラー設定エラー:', error);
    }
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
 * 詳細フォーム画面への遷移（季語選択状態対応）
 */
function transitionToDetailForm() {
    console.log('📱 詳細フォーム遷移');

    // 既存の投稿フォームを表示
    if (typeof toggleHaikuForm === 'function') {
        // 現在の入力値を移行
        const haikuText = document.getElementById('inline-haiku-text')?.value || '';

        // 季語選択状態を取得
        let selectedKigoInfo = { season: null, selectedKigo: null, isSeasonless: false };
        if (typeof getCurrentKigoSelection === 'function') {
            selectedKigoInfo = getCurrentKigoSelection();
        }

        // インラインフォーム非表示
        hideInlineForm();

        // 詳細フォーム表示
        toggleHaikuForm();

        // データ移行
        setTimeout(() => {
            const detailForm = document.getElementById('haiku-form');
            if (detailForm) {
                // 俳句本文を移行
                const haikuTextField = detailForm.querySelector('#haiku-text');
                if (haikuTextField) {
                    haikuTextField.value = haikuText;
                }

                // 位置情報を移行
                if (currentPinLocation) {
                    const latField = detailForm.querySelector('#latitude');
                    const lngField = detailForm.querySelector('#longitude');
                    if (latField) latField.value = currentPinLocation.lat;
                    if (lngField) lngField.value = currentPinLocation.lng;
                }

                // 季語・季節情報を移行
                if (selectedKigoInfo.season) {
                    const seasonField = detailForm.querySelector('#season, [name="season"]');
                    if (seasonField) {
                        seasonField.value = selectedKigoInfo.season;
                    }
                }

                if (selectedKigoInfo.selectedKigo?.display_name) {
                    const seasonalTermField = detailForm.querySelector('#seasonal-term, [name="seasonal_term"]');
                    if (seasonalTermField) {
                        seasonalTermField.value = selectedKigoInfo.selectedKigo.display_name;
                    }
                }

                console.log('✅ データ移行完了:', {
                    haiku: haikuText,
                    season: selectedKigoInfo.season,
                    seasonalTerm: selectedKigoInfo.selectedKigo?.display_name
                });
            }
        }, 100);
    }
}

// =============================================================================
// 既存俳句ポップアップ
// =============================================================================

/**
 * 既存俳句ポップアップの表示（従来版・互換性維持）
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

/**
 * 既存俳句ポップアップの表示（オプション付き版）
 * @param {Array} haikus - 俳句データ配列
 * @param {number} lat - 緯度
 * @param {number} lng - 経度
 */
function showExistingHaikuPopupWithOptions(haikus, lat, lng) {
    if (haikus.length === 0) return;

    const haiku = haikus[0]; // 最初の俳句を表示

    const popupContent = `
        <div class="haiku-popup-with-options">
            <div class="haiku-display">
                <div class="haiku-text">${haiku.haiku_text}</div>
                <div class="haiku-info">
                    <div class="poet-name">${haiku.poet_name}</div>
                    <div class="location-info">${haiku.location_name || ''}</div>
                </div>
                ${haikus.length > 1 ? `<div class="haiku-count">他 ${haikus.length - 1}件の俳句</div>` : ''}
            </div>

            <div class="popup-actions">
                <button class="action-btn secondary" onclick="addNewHaikuAtLocation(${lat}, ${lng})">
                    📝 この位置に新しい俳句を追加
                </button>
                <button class="action-btn primary" onclick="showAllHaikusAtLocation(${lat}, ${lng})">
                    📜 すべての俳句を表示
                </button>
                <button class="action-btn close" onclick="map.closePopup()">
                    × 閉じる
                </button>
            </div>
        </div>
    `;

    // Leafletポップアップで表示
    L.popup({
        maxWidth: 350,
        className: 'haiku-options-popup'
    })
        .setLatLng([lat, lng])
        .setContent(popupContent)
        .openOn(map);
}

/**
 * 既存ピン位置での新俳句追加
 * @param {number} lat - 緯度
 * @param {number} lng - 経度
 */
function addNewHaikuAtLocation(lat, lng) {
    console.log(`📝 既存位置での新俳句追加: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);

    // ポップアップを閉じる
    map.closePopup();

    // 一時ピンを表示してフォームを表示
    currentPinLocation = { lat, lng };

    // 一時ピンを表示
    showTemporaryPin(lat, lng);

    // フォームを表示
    showInlineForm(lat, lng);
}

/**
 * 指定位置のすべての俳句を表示
 * @param {number} lat - 緯度
 * @param {number} lng - 経度
 */
async function showAllHaikusAtLocation(lat, lng) {
    console.log(`📜 全俳句表示: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);

    try {
        // ポップアップを閉じる
        map.closePopup();

        // 指定位置のすべての俳句を取得
        const allHaikus = await checkExistingHaikusAtLocation(lat, lng);

        if (allHaikus.length === 0) {
            console.warn('⚠️ 俳句が見つかりません');
            return;
        }

        // 詳細表示用のポップアップを作成
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
                <div class="haikus-list">
                    ${haikuListHTML}
                </div>
                <div class="popup-actions">
                    <button class="action-btn secondary" onclick="addNewHaikuAtLocation(${lat}, ${lng})">
                        📝 新しい俳句を追加
                    </button>
                </div>
            </div>
        `;

        // ポップアップ表示
        L.popup({
            maxWidth: 400,
            maxHeight: 300,
            className: 'all-haikus-popup'
        })
            .setLatLng([lat, lng])
            .setContent(popupContent)
            .openOn(map);

    } catch (error) {
        console.error('❌ 全俳句表示エラー:', error);
    }
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
// グローバル関数の公開
// =============================================================================

// Phase2統合のために必要な関数をグローバルに公開
window.showTemporaryPinFromPinPosting = showTemporaryPin;
window.removeTemporaryPinFromPinPosting = removeTemporaryPin;
window.showDebugPinFromPinPosting = showDebugPin;

// =============================================================================
// 初期化時の自動実行
// =============================================================================

// AppManagerが初期化を管理するため、自動初期化は削除
// AppManagerの initializePinPosting() から呼び出される