/**
 * 俳句鑑賞＆記録アプリ メインスクリプト
 * リファクタリング版 - 責任分離と可読性向上
 */

// =============================================================================
// グローバル変数と定数
// =============================================================================

let map;
let markersLayer;
let currentLocationMarker;
let isLoading = false;
let isSubmittingHaiku = false;

const APP_STATE = {
    INITIALIZING: 'initializing',
    READY: 'ready',
    ERROR: 'error'
};

// =============================================================================
// アプリケーション初期化
// =============================================================================

document.addEventListener('DOMContentLoaded', initializeApp);

/**
 * アプリケーション初期化メイン関数
 */
async function initializeApp() {
    try {
        // 設定の検証
        if (!validateConfig()) {
            throw new Error('設定が不正です。config.jsを確認してください。');
        }
        
        // APIアダプターの初期化
        await apiAdapter.initialize();
        console.log(`🔧 API初期化完了: ${apiAdapter.getAPIType()}`);
        
        await executeInitializationSequence();
        console.log('✅ アプリケーションの初期化が完了しました');
    } catch (error) {
        handleInitializationError(error);
    }
}

/**
 * 初期化シーケンスの実行
 */
async function executeInitializationSequence() {
    const steps = [
        { message: '地図を初期化中...', action: initializeMapWithLocation },
        { message: '俳句データを読み込み中...', action: loadHaikuData }
    ];

    for (const step of steps) {
        showLoadingState(step.message);
        await step.action();
    }
    
    hideLoadingState();
}

/**
 * 初期化エラーの処理
 */
function handleInitializationError(error) {
    console.error('❌ アプリケーションの初期化に失敗:', error);
    showErrorMessage(`初期化に失敗しました: ${error.message}`);
    hideLoadingState();
}

// =============================================================================
// 地図初期化と管理
// =============================================================================

/**
 * 位置情報付き地図初期化
 */
async function initializeMapWithLocation() {
    try {
        initializeMap();
        await setupLocationBasedView();
    } catch (error) {
        handleMapInitializationError(error);
    }
}

/**
 * 位置情報ベースの地図ビュー設定
 */
async function setupLocationBasedView() {
    const userLocation = await getUserLocation();
    
    if (userLocation) {
        setupMapWithUserLocation(userLocation);
    } else {
        showDefaultLocationMessage();
    }
}

/**
 * ユーザー位置情報での地図設定
 */
function setupMapWithUserLocation(userLocation) {
    console.log('📍 現在地を取得しました:', userLocation);
    
    map.setView([userLocation.latitude, userLocation.longitude], 12);
    addCurrentLocationMarker(userLocation);
    showInfoMessage('現在地を中心に地図を表示しています');
}

/**
 * デフォルト位置メッセージ表示
 */
function showDefaultLocationMessage() {
    console.log('📍 現在地取得に失敗、デフォルト位置を使用');
    showInfoMessage('デフォルト位置（東京駅周辺）を表示しています');
}

/**
 * 地図初期化エラー処理
 */
function handleMapInitializationError(error) {
    console.error('❌ 地図初期化エラー:', error);
    initializeMap(); // フォールバック
    showInfoMessage('デフォルト位置を表示しています');
}

// 基本的な地図初期化
function initializeMap() {
    // 地図設定を使用
    const center = MAP_CONFIG.DEFAULT_CENTER;
    const zoom = MAP_CONFIG.DEFAULT_ZOOM;
    
    map = L.map('map').setView(center, zoom);

    // OpenStreetMapタイルレイヤーを追加
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: MAP_CONFIG.MAX_ZOOM,
        minZoom: MAP_CONFIG.MIN_ZOOM
    }).addTo(map);

    // マーカー用のレイヤーグループを作成
    markersLayer = L.layerGroup().addTo(map);

    console.log('地図の初期化が完了しました');
}

// APIから俳句データを読み込み
async function loadHaikuData() {
    try {
        console.log('俳句データの読み込みを開始...');
        
        // API接続テスト
        const isConnected = await apiAdapter.testConnection();
        if (!isConnected) {
            throw new Error('APIサーバーに接続できません');
        }

        // 地図用俳句データを取得
        const haikuData = await apiAdapter.getHaikusForMap();
        console.log(`${haikuData.length}件の俳句データを取得しました`);

        // 既存のマーカーをクリア
        markersLayer.clearLayers();

        // 俳句データをマーカーとして追加
        haikuData.forEach(haiku => {
            addHaikuMarkerFromAPI(haiku);
        });

        console.log('俳句データの読み込みが完了しました');
        
        // データが0件の場合の対応
        if (haikuData.length === 0) {
            showInfoMessage('俳句データが見つかりませんでした');
        }

    } catch (error) {
        console.error('俳句データの読み込みに失敗:', error);
        throw error;
    }
}

// APIデータから俳句マーカーを地図に追加
function addHaikuMarkerFromAPI(haikuData) {
    const { id, latitude, longitude, location_name, haiku_text, poet_name, location_type, description, season } = haikuData;
    
    // 緯度経度の検証
    if (!latitude || !longitude || latitude === 0 || longitude === 0) {
        console.warn('無効な座標データ:', haikuData);
        return;
    }

    // マーカーアイコンの色を場所種別に応じて設定
    // 句季による色分け
    const iconColor = MAP_CONFIG.MARKER_COLORS[season] || MAP_CONFIG.MARKER_COLORS['その他'];

    // カスタムアイコンを作成
    const customIcon = L.divIcon({
        className: `haiku-marker season-${season || 'other'}`,
        html: `<div style="background-color: ${iconColor}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    // マーカーを作成してレイヤーグループに追加
    const marker = L.marker([latitude, longitude], { icon: customIcon });
    
    // ポップアップコンテンツを作成
    const popupContent = createHaikuPopupContent({
        id,
        location_name,
        haiku_text,
        poet_name,
        location_type,
        season,
        description
    });

    marker.bindPopup(popupContent, {
        maxWidth: UI_CONFIG.POPUP_MAX_WIDTH,
        className: 'haiku-popup-container'
    });

    // マーカーをレイヤーグループに追加
    markersLayer.addLayer(marker);
}

// 俳句ポップアップコンテンツを作成
function createHaikuPopupContent(haiku) {
    const { id, location_name, haiku_text, poet_name, location_type, description, season } = haiku;
    
    return `
        <div class="haiku-popup" data-haiku-id="${id}">
            <div class="popup-header">
                <h3 class="location-name">${location_name || '場所不明'}</h3>
                <span class="season-badge season-${season || 'other'}">${season || 'その他'}</span>
            </div>
            <div class="haiku-content">
                <div class="haiku-text">${haiku_text}</div>
                <div class="poet-name">― ${poet_name || '不明'} ―</div>
            </div>
            ${description ? `<div class="haiku-description">${description}</div>` : ''}
            <div class="popup-actions">
                <button class="btn-detail" onclick="showHaikuDetail(${id})">詳細を見る</button>
            </div>
        </div>
    `;
}

// 俳句詳細表示
async function showHaikuDetail(haikuId) {
    try {
        showLoadingState('俳句詳細を読み込み中...');
        
        const haiku = await apiAdapter.getHaiku(haikuId);
        
        // 詳細モーダルまたは別画面を表示（今後実装予定）
        console.log('俳句詳細:', haiku);
        alert(`俳句詳細\n\n${haiku.haiku_text}\n\n詠み人: ${haiku.poet ? haiku.poet.name : '不明'}\n場所: ${haiku.location_name}`);
        
        hideLoadingState();
    } catch (error) {
        console.error('俳句詳細の取得に失敗:', error);
        showErrorMessage('俳句詳細を取得できませんでした');
        hideLoadingState();
    }
}

// ローディング状態表示
function showLoadingState(message = '読み込み中...') {
    if (isLoading) return;
    
    isLoading = true;
    
    // ローディング要素を作成
    const loadingEl = document.createElement('div');
    loadingEl.id = 'loading-overlay';
    loadingEl.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <div class="loading-message">${message}</div>
        </div>
    `;
    
    document.body.appendChild(loadingEl);
}

// ローディング状態非表示
function hideLoadingState() {
    isLoading = false;
    
    const loadingEl = document.getElementById('loading-overlay');
    if (loadingEl) {
        loadingEl.remove();
    }
}

// エラーメッセージ表示
function showErrorMessage(message) {
    showMessage(message, 'error');
}

// 情報メッセージ表示
function showInfoMessage(message) {
    showMessage(message, 'info');
}

// メッセージ表示（共通）
function showMessage(message, type = 'info') {
    const messageEl = document.createElement('div');
    messageEl.className = `message-overlay ${type}`;
    messageEl.innerHTML = `
        <div class="message-content">
            <span class="message-text">${message}</span>
            <button class="message-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    document.body.appendChild(messageEl);
    
    // 自動削除
    setTimeout(() => {
        if (messageEl.parentElement) {
            messageEl.remove();
        }
    }, UI_CONFIG.ERROR_DISPLAY_TIME);
}

// ユーザーの現在地を取得（Promise版）
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            console.warn('このブラウザでは位置情報がサポートされていません');
            resolve(null);
            return;
        }

        // 位置情報取得のオプション
        const options = {
            enableHighAccuracy: true,  // 高精度を要求
            timeout: 10000,           // 10秒でタイムアウト
            maximumAge: 300000        // 5分間はキャッシュを使用
        };

        navigator.geolocation.getCurrentPosition(
            function(position) {
                const location = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                };
                console.log('位置情報取得成功:', location);
                resolve(location);
            },
            function(error) {
                console.warn('位置情報の取得に失敗:', error);
                
                // エラーの種類に応じてメッセージを変更
                let errorMessage = '';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = '位置情報の使用が拒否されました';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = '位置情報を取得できませんでした';
                        break;
                    case error.TIMEOUT:
                        errorMessage = '位置情報の取得がタイムアウトしました';
                        break;
                    default:
                        errorMessage = '位置情報の取得中にエラーが発生しました';
                        break;
                }
                
                console.warn(errorMessage, error);
                resolve(null); // エラーでもnullを返してアプリを継続
            },
            options
        );
    });
}

// 現在地マーカーを追加
function addCurrentLocationMarker(location) {
    if (!location) return;

    // 現在地用のカスタムアイコンを作成
    const currentLocationIcon = L.divIcon({
        className: 'current-location-marker',
        html: `
            <div class="current-location-icon">
                <div class="location-dot"></div>
                <div class="location-pulse"></div>
            </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    // 現在地マーカーを追加
    const currentLocationMarker = L.marker(
        [location.latitude, location.longitude], 
        { icon: currentLocationIcon }
    ).addTo(map);

    // ポップアップを追加
    const popupContent = `
        <div class="current-location-popup">
            <h4>📍 現在地</h4>
            <p>緯度: ${location.latitude.toFixed(6)}</p>
            <p>経度: ${location.longitude.toFixed(6)}</p>
            <p>精度: 約${Math.round(location.accuracy)}m</p>
        </div>
    `;
    
    currentLocationMarker.bindPopup(popupContent);

    // 現在地マーカーをクリックできるようにする
    currentLocationMarker.on('click', function() {
        map.setView([location.latitude, location.longitude], 15);
    });

    console.log('現在地マーカーを追加しました');
}

// 現在地へ移動（手動実行用）
async function goToCurrentLocation() {
    try {
        showLoadingState('現在地を取得中...');
        
        const location = await getUserLocation();
        
        if (location) {
            map.setView([location.latitude, location.longitude], 15);
            showInfoMessage('現在地に移動しました');
        } else {
            showErrorMessage('現在地を取得できませんでした');
        }
        
        hideLoadingState();
    } catch (error) {
        console.error('現在地取得エラー:', error);
        showErrorMessage('現在地の取得に失敗しました');
        hideLoadingState();
    }
}

// データリフレッシュ
async function refreshData() {
    try {
        await loadHaikuData();
        showInfoMessage('データを更新しました');
    } catch (error) {
        showErrorMessage('データの更新に失敗しました: ' + error.message);
    }
}

// =============================================================================
// 俳句投稿フォーム管理
// =============================================================================

/**
 * 俳句投稿フォームの表示/非表示切り替え
 */
function toggleHaikuForm() {
    const formContainer = getFormContainer();
    const isVisible = formContainer.style.display !== 'none';
    
    isVisible ? closeHaikuForm() : openHaikuForm();
}

/**
 * 俳句投稿フォームを開く
 */
function openHaikuForm() {
    const formContainer = getFormContainer();
    const form = getHaikuForm();
    
    formContainer.style.display = 'flex';
    form.reset();
    
    // 現在地を非同期で取得
    getCurrentLocationForForm();
}

/**
 * 俳句投稿フォームを閉じる
 */
function closeHaikuForm() {
    const formContainer = getFormContainer();
    formContainer.style.display = 'none';
}

/**
 * フォーム用の現在地取得
 */
async function getCurrentLocationForForm() {
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

/**
 * 位置情報をフォーム入力に設定
 */
function setLocationInputs(location) {
    const latInput = document.getElementById('latitude');
    const lngInput = document.getElementById('longitude');
    
    if (latInput && lngInput) {
        latInput.value = location.latitude.toFixed(6);
        lngInput.value = location.longitude.toFixed(6);
    }
}

/**
 * 位置情報入力エラー表示
 */
function showLocationInputError() {
    showErrorMessage('現在地を取得できませんでした。手動で座標を入力してください');
}

// =============================================================================
// 俳句投稿処理
// =============================================================================

/**
 * 俳句投稿フォームの送信処理
 */
async function submitHaiku(event) {
    event.preventDefault();
    
    if (isSubmittingHaiku) {
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

/**
 * 俳句投稿の実行
 */
async function executeHaikuSubmission(event) {
    isSubmittingHaiku = true;
    
    const form = event.target;
    const formData = prepareFormData(form);
    
    disableFormButtons(form);
    showLoadingState('俳句を投稿中...');
    
    console.log('📤 送信データ:', formData);
    
    const response = await apiAdapter.createHaiku(formData);
    
    if (response.success) {
        handleSubmissionSuccess(response);
    } else {
        throw new Error(response.message || '投稿に失敗しました');
    }
}

/**
 * フォームデータの準備
 */
function prepareFormData(form) {
    const formData = new FormData(form);
    const postData = {};
    
    for (let [key, value] of formData.entries()) {
        postData[key] = value;
    }
    
    return postData;
}

/**
 * フォームボタンの無効化
 */
function disableFormButtons(form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const allButtons = form.querySelectorAll('button');
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '送信中...';
    }
    
    allButtons.forEach(btn => btn.disabled = true);
}

/**
 * 投稿成功時の処理
 */
async function handleSubmissionSuccess(response) {
    showInfoMessage('俳句の投稿が完了しました');
    console.log('✅ 投稿成功:', response);
    
    closeHaikuForm();
    await refreshData();
}

/**
 * 投稿エラー処理
 */
function handleSubmissionError(error) {
    console.error('❌ 俳句投稿エラー:', error);
    showErrorMessage(`俳句の投稿に失敗しました: ${error.message}`);
}

/**
 * 投稿状態のクリーンアップ
 */
function cleanupSubmissionState() {
    isSubmittingHaiku = false;
    hideLoadingState();
    enableFormButtons();
}

/**
 * フォームボタンの有効化
 */
function enableFormButtons() {
    const form = getHaikuForm();
    if (!form) return;
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const allButtons = form.querySelectorAll('button');
    
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '投稿';
    }
    
    allButtons.forEach(btn => btn.disabled = false);
}

// =============================================================================
// DOM要素取得ヘルパー
// =============================================================================

/**
 * フォームコンテナ要素取得
 */
function getFormContainer() {
    return document.getElementById('haiku-form-container');
}

/**
 * 俳句フォーム要素取得
 */
function getHaikuForm() {
    return document.getElementById('haiku-form');
}