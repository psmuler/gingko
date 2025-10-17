import { MAP_CONFIG } from '../config.js';
import { appState, setCurrentTileLayer, setTileServerIndex } from '../core/app-state.js';
import { showInfoMessage } from '../ui/messages.js';

export function initializeTileLayer() {
    const primaryServer = MAP_CONFIG.TILE_SERVERS.primary;

    try {
        console.log(`🗺️ プライマリタイルサーバーを試行: ${primaryServer.name}`);
        loadTileLayer(primaryServer);
        setTileServerIndex(-1);
    } catch (error) {
        console.warn('⚠️ プライマリタイルサーバー失敗、フォールバックを試行');
        tryFallbackTileServer();
    }
}

export function loadTileLayer(serverConfig) {
    const map = appState.map;
    if (!map) {
        throw new Error('Map instance is not initialized');
    }

    if (appState.currentTileLayer) {
        map.removeLayer(appState.currentTileLayer);
    }

    const tileLayerOptions = {
        attribution: serverConfig.attribution,
        maxZoom: Math.min(serverConfig.maxZoom || 18, MAP_CONFIG.MAX_ZOOM),
        minZoom: MAP_CONFIG.MIN_ZOOM,
        subdomains: serverConfig.subdomains || 'abc'
    };

    if (MAP_CONFIG.REQUEST_HEADERS) {
        tileLayerOptions.headers = MAP_CONFIG.REQUEST_HEADERS;
    }

    const tileLayer = L.tileLayer(serverConfig.url, tileLayerOptions);

    tileLayer.on('tileerror', function (error) {
        console.error(`❌ タイル読み込みエラー (${serverConfig.name}):`, error);

        if (!tileLayer._errorCount) {
            tileLayer._errorCount = 0;
        }
        tileLayer._errorCount++;

        if (tileLayer._errorCount >= 3) {
            console.warn('⚠️ タイル読み込みエラーが続くため、フォールバックを試行');
            tryFallbackTileServer();
        }
    });

    tileLayer.addTo(map);
    setCurrentTileLayer(tileLayer);

    console.log(`✅ タイルレイヤー追加: ${serverConfig.name}`);
}

export function tryFallbackTileServer() {
    const fallbackServers = MAP_CONFIG.TILE_SERVERS.fallback;
    let index = appState.tileServerIndex + 1;
    setTileServerIndex(index);

    if (index < fallbackServers.length) {
        const fallbackServer = fallbackServers[index];
        console.log(`🔄 フォールバック試行 [${index + 1}/${fallbackServers.length}]: ${fallbackServer.name}`);
        loadTileLayer(fallbackServer);
    } else {
        console.error('⚠️ 利用可能なフォールバックサーバーがありません。緊急レイヤーを使用します。');
        loadEmergencyTileLayer();
    }
}

export function loadEmergencyTileLayer() {
    console.warn('🚨 緊急用タイルレイヤーを読み込み');

    const map = appState.map;
    if (!map) return;

    const emergencyConfig = {
        name: 'Emergency OSM',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
        subdomains: 'abc'
    };

    const tileLayerOptions = {
        attribution: emergencyConfig.attribution + ' | <strong>俳句鑑賞アプリ「吟行」</strong>',
        maxZoom: emergencyConfig.maxZoom,
        minZoom: MAP_CONFIG.MIN_ZOOM,
        subdomains: emergencyConfig.subdomains
    };

    if (appState.currentTileLayer) {
        map.removeLayer(appState.currentTileLayer);
    }

    const tileLayer = L.tileLayer(emergencyConfig.url, tileLayerOptions);
    tileLayer.addTo(map);
    setCurrentTileLayer(tileLayer);
    showInfoMessage('地図は表示されましたが、一部制限がある可能性があります。');
}

export function switchTileServer(serverType) {
    if (serverType === 'primary') {
        setTileServerIndex(-1);
        loadTileLayer(MAP_CONFIG.TILE_SERVERS.primary);
        return;
    }

    if (typeof serverType === 'number') {
        const fallbackServers = MAP_CONFIG.TILE_SERVERS.fallback;
        if (serverType >= 0 && serverType < fallbackServers.length) {
            setTileServerIndex(serverType);
            loadTileLayer(fallbackServers[serverType]);
        }
    }
}

export function getCurrentTileServerInfo() {
    if (appState.tileServerIndex === -1) {
        return {
            type: 'primary',
            server: MAP_CONFIG.TILE_SERVERS.primary,
            index: -1
        };
    }

    return {
        type: 'fallback',
        server: MAP_CONFIG.TILE_SERVERS.fallback[appState.tileServerIndex],
        index: appState.tileServerIndex
    };
}
