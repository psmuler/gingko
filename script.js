// 俳句鑑賞＆記録アプリ メインスクリプト

let map;
let markersLayer;
let isLoading = false;

// アプリ初期化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// アプリケーション初期化
async function initializeApp() {
    try {
        showLoadingState('地図を初期化中...');
        initializeMap();
        
        showLoadingState('俳句データを読み込み中...');
        await loadHaikuData();
        
        hideLoadingState();
        console.log('アプリケーションの初期化が完了しました');
    } catch (error) {
        console.error('アプリケーションの初期化に失敗:', error);
        showErrorMessage('データの読み込みに失敗しました: ' + error.message);
        hideLoadingState();
    }
}

// 地図初期化
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
        const isConnected = await apiClient.testConnection();
        if (!isConnected) {
            throw new Error('APIサーバーに接続できません');
        }

        // 地図用俳句データを取得
        const haikuData = await apiClient.getHaikusForMap();
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
    const { id, latitude, longitude, location_name, haiku_text, poet_name, location_type, description } = haikuData;
    
    // 緯度経度の検証
    if (!latitude || !longitude || latitude === 0 || longitude === 0) {
        console.warn('無効な座標データ:', haikuData);
        return;
    }

    // マーカーアイコンの色を場所種別に応じて設定
    const iconColor = MAP_CONFIG.MARKER_COLORS[location_type] || '#95a5a6';

    // カスタムアイコンを作成
    const customIcon = L.divIcon({
        className: `haiku-marker ${location_type}`,
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
    const { id, location_name, haiku_text, poet_name, location_type, description } = haiku;
    
    return `
        <div class="haiku-popup" data-haiku-id="${id}">
            <div class="popup-header">
                <h3 class="location-name">${location_name || '場所不明'}</h3>
                <span class="location-type-badge ${location_type}">${location_type}</span>
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
        
        const haiku = await apiClient.getHaiku(haikuId);
        
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

// 現在地を取得して地図の中心に設定
function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                map.setView([lat, lng], 13);
                
                // 現在地マーカーを追加
                L.marker([lat, lng])
                    .addTo(map)
                    .bindPopup('現在地')
                    .openPopup();
            },
            function(error) {
                console.error('位置情報の取得に失敗しました:', error);
                showErrorMessage('位置情報の取得に失敗しました');
            }
        );
    } else {
        showErrorMessage('このブラウザでは位置情報がサポートされていません');
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