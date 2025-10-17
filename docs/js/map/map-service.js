import { MAP_CONFIG, UI_CONFIG } from '../config.js';
import { appState, setMap, setMarkersLayer, setCurrentLocationMarker } from '../core/app-state.js';
import { initializeTileLayer } from './tile-manager.js';
import { createClusterIconOptions, loadHaikuData } from './markers.js';
import { showInfoMessage, showErrorMessage, showLoadingState, hideLoadingState } from '../ui/messages.js';

export function initializeMap() {
    if (appState.map) {
        console.warn('⚠️ 地図は既に初期化済みです');
        return;
    }

    const center = MAP_CONFIG.DEFAULT_CENTER;
    const zoom = MAP_CONFIG.DEFAULT_ZOOM;

    try {
        const mapInstance = L.map('map').setView(center, zoom);
        setMap(mapInstance);
    } catch (error) {
        console.error('❌ 地図初期化エラー:', error);
        throw error;
    }

    initializeTileLayer();

    const markersLayer = L.markerClusterGroup(createClusterIconOptions()).addTo(appState.map);
    setMarkersLayer(markersLayer);

    console.log('地図の初期化が完了しました');
}

export async function initializeMapWithLocation() {
    try {
        initializeMap();
        await setupLocationBasedView();
    } catch (error) {
        handleMapInitializationError(error);
    }
}

export async function setupLocationBasedView() {
    const userLocation = await getUserLocation();

    if (userLocation) {
        setupMapWithUserLocation(userLocation);
    } else {
        showDefaultLocationMessage();
    }
}

export function setupMapWithUserLocation(userLocation) {
    if (!appState.map) return;

    console.log('📍 現在地を取得しました:', userLocation);
    appState.map.setView([userLocation.latitude, userLocation.longitude], 12);
    addCurrentLocationMarker(userLocation);
    showInfoMessage('現在地を中心に地図を表示しています');
}

export function showDefaultLocationMessage() {
    console.log('📍 現在地取得に失敗、デフォルト位置を使用');
    showInfoMessage('デフォルト位置（東京駅周辺）を表示しています');
}

export function handleMapInitializationError(error) {
    console.error('❌ 地図初期化エラー:', error);
    initializeMap();
    showInfoMessage('デフォルト位置を表示しています');
}

export function addCurrentLocationMarker(location) {
    if (!location || !appState.map) return;

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

    if (appState.currentLocationMarker) {
        appState.map.removeLayer(appState.currentLocationMarker);
    }

    const marker = L.marker([location.latitude, location.longitude], { icon: currentLocationIcon }).addTo(appState.map);
    marker.bindPopup(`
        <div class="current-location-popup">
            <h4>📍 現在地</h4>
            <p>緯度: ${location.latitude.toFixed(6)}</p>
            <p>経度: ${location.longitude.toFixed(6)}</p>
            <p>精度: 約${Math.round(location.accuracy)}m</p>
        </div>
    `, { offset: L.point(0, -30) });

    marker.on('click', function () {
        appState.map.setView([location.latitude, location.longitude], 15);
    });

    setCurrentLocationMarker(marker);
    console.log('現在地マーカーを追加しました');
}

export async function executeInitializationSequence() {
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

export function handleInitializationError(error) {
    console.error('❌ アプリケーションの初期化に失敗:', error);
    showErrorMessage(`初期化に失敗しました: ${error.message}`);
    hideLoadingState();
}

export function getUserLocation() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            console.warn('このブラウザでは位置情報がサポートされていません');
            resolve(null);
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                };
                console.log('位置情報取得成功:', location);
                resolve(location);
            },
            (error) => {
                console.warn('位置情報の取得に失敗:', error);
                resolve(null);
            },
            options
        );
    });
}

export async function goToCurrentLocation() {
    try {
        showLoadingState('現在地を取得中...');

        const location = await getUserLocation();

        if (location && appState.map) {
            appState.map.setView([location.latitude, location.longitude], 15);
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

export async function refreshData() {
    try {
        await loadHaikuData();
        showInfoMessage('データを更新しました');
    } catch (error) {
        showErrorMessage('データの更新に失敗しました: ' + error.message);
    }
}
