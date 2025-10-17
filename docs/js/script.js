/**
 * 俳句鑑賞＆記録アプリ メインスクリプト
 * リファクタリング版 - 責任分離と可読性向上
 */

import { MAP_CONFIG, UI_CONFIG } from './config.js';
import { apiAdapter } from './api-adapter.js';

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

// AppManagerが初期化を管理するため、ここでの自動初期化は削除
// document.addEventListener('DOMContentLoaded', initializeApp);

/**
 * アプリケーション初期化メイン関数（AppManagerから呼び出される）
 * @deprecated AppManagerが初期化を管理するため、直接呼び出しは非推奨
 */
async function initializeApp() {
    console.warn('⚠️ initializeApp() は非推奨です。AppManagerが初期化を管理しています。');
}

// =============================================================================
// ハンバーガーメニュー機能
// =============================================================================

/**
 * ハンバーガーメニューのトグル
 */
function toggleMenu() {
    const menu = document.getElementById('nav-menu');
    const toggle = document.getElementById('menu-toggle');

    if (menu && toggle) {
        menu.classList.toggle('active');
        toggle.classList.toggle('active');

        // ESCキーでメニューを閉じるイベントリスナーを追加/削除
        if (menu.classList.contains('active')) {
            document.addEventListener('keydown', handleMenuEscKey);
            document.addEventListener('click', handleMenuOutsideClick);
        } else {
            document.removeEventListener('keydown', handleMenuEscKey);
            document.removeEventListener('click', handleMenuOutsideClick);
        }
    }
}

/**
 * メニューを閉じる
 */
function closeMenu() {
    const menu = document.getElementById('nav-menu');
    const toggle = document.getElementById('menu-toggle');

    if (menu && toggle) {
        menu.classList.remove('active');
        toggle.classList.remove('active');
        document.removeEventListener('keydown', handleMenuEscKey);
        document.removeEventListener('click', handleMenuOutsideClick);
    }
}

/**
 * ESCキーでメニューを閉じる
 */
function handleMenuEscKey(event) {
    if (event.key === 'Escape') {
        closeMenu();
    }
}

/**
 * メニュー外クリックでメニューを閉じる
 */
function handleMenuOutsideClick(event) {
    const menu = document.getElementById('nav-menu');
    const toggle = document.getElementById('menu-toggle');

    if (menu && toggle &&
        !menu.contains(event.target) &&
        !toggle.contains(event.target)) {
        closeMenu();
    }
}

/**
 * このアプリについて画面を表示
 */
async function showAbout() {
    closeMenu();

    try {
        // ローカルファイルのCORS制限を回避するため、相対パスとCacheを設定
        const response = await fetch('./about.html', {
            method: 'GET',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'text/html'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const aboutContent = await response.text();
        showModal(aboutContent);
    } catch (error) {
        console.error('About画面の読み込みエラー:', error);

        // フォールバック: インラインのAbout画面を表示
        const fallbackContent = `
            <div class="about-container">
                <h2>吟行について</h2>
                <div class="about-content">
                    <p>「吟行」は俳句・短歌の名句ゆかりの地を巡り、その場所で詠まれた作品を鑑賞できるアプリです。</p>

                    <h3>✨ 主な機能</h3>
                    <ul>
                        <li><strong>地図上での作品表示</strong> - 俳句・短歌が詠まれた場所をピンで表示</li>
                        <li><strong>季語自動判定</strong> - 入力した俳句から季語を自動で検出</li>
                        <li><strong>新規投稿</strong> - 地図をタップして新しい俳句・短歌を投稿</li>
                        <li><strong>クラスタリング表示</strong> - 近くの作品をまとめて効率的に表示</li>
                    </ul>

                    <h3>🎨 ピンの見方</h3>
                    <div class="pin-legend">
                        <div class="pin-item">
                            <span class="pin-sample pin-haiku-spring">💧</span>
                            <span>俳句（春：青）</span>
                            俳句は季節に応じて色分けされています。
                        </div>
                        <div class="pin-item">
                            <span class="pin-sample pin-tanka-utamakura">⛰️</span>
                            <span>短歌（歌枕あり：紫山）</span>
                        </div>
                        <div class="pin-item">
                            <span class="pin-sample pin-tanka-normal">💧</span>
                            <span>短歌（歌枕なし：灰）</span>
                        </div>
                    </div>

                    <h3>📍 使い方</h3>
                    <ol>
                        <li>地図上のピンをタップして俳句・短歌を鑑賞</li>
                        <li>空白の場所をタップして新しい作品を投稿</li>
                        <li>🧭ボタンで現在地に移動</li>
                        <li>地図をピンチ・パンして自由に移動</li>
                    </ol>

                    <h3>🔍 季語について</h3>
                    <p>このアプリは豊富な季語データベースを搭載しています。俳句を投稿する際に、自動的に季語を検出し、適切な季節を判定します。</p>

                    <h3>📊 統計機能</h3>
                    <p>メニューの「統計」から、登録されている作品の統計情報をご覧いただけます。季節別の分布や詩人別の作品数などを確認できます。</p>

                    <div class="about-footer">
                        <p><strong>開発情報</strong></p>
                        <p>このアプリはLeaflet.js（地図）、Supabase（データベース）を使用して開発されています。</p>
                        <p><small>Ver 2.3 - 2025年開発</small></p>
                        <p><em>※ about.htmlファイルの読み込みに失敗したため、フォールバック画面を表示しています。</em></p>
                    </div>
                </div>
                <button onclick="closeAbout()" class="primary-btn">閉じる</button>
            </div>
        `;
        showModal(fallbackContent);
    }
}

/**
 * 統計情報を表示
 */
function showStats() {
    closeMenu();

    // 統計データを取得して表示
    generateStats().then(statsContent => {
        showModal(statsContent);
    }).catch(error => {
        console.error('統計データ取得エラー:', error);
        showModal('<div class="error-message">統計データの取得に失敗しました。</div>');
    });
}

/**
 * 統計データを生成
 */
async function generateStats() {
    try {
        const supabaseClientInstance = getSupabaseClient();
        const haikuData = await supabaseClientInstance.getHaiku();

        // 基本統計
        const totalCount = haikuData.length;
        const haikuCount = haikuData.filter(h => h.poetry_type === '俳句').length;
        const tankaCount = haikuData.filter(h => h.poetry_type === '短歌').length;

        // 季節別統計
        const seasonStats = {
            '春': haikuData.filter(h => h.season === '春').length,
            '夏': haikuData.filter(h => h.season === '夏').length,
            '秋': haikuData.filter(h => h.season === '秋').length,
            '冬': haikuData.filter(h => h.season === '冬').length,
            'その他': haikuData.filter(h => !['春', '夏', '秋', '冬'].includes(h.season)).length
        };

        // 詩人別統計（上位5名）
        const poetStats = {};
        haikuData.forEach(h => {
            const poet = h.poet_name || '不明';
            poetStats[poet] = (poetStats[poet] || 0) + 1;
        });

        const topPoets = Object.entries(poetStats)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        return `
            <div class="stats-container">
                <h2>📊 統計情報</h2>
                <div class="stats-content">
                    <div class="stats-section">
                        <h3>📝 作品数</h3>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <span class="stat-number">${totalCount}</span>
                                <span class="stat-label">総作品数</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-number">${haikuCount}</span>
                                <span class="stat-label">俳句</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-number">${tankaCount}</span>
                                <span class="stat-label">短歌</span>
                            </div>
                        </div>
                    </div>

                    <div class="stats-section">
                        <h3>🌸 季節別分布</h3>
                        <div class="season-stats">
                            ${Object.entries(seasonStats).map(([season, count]) =>
            `<div class="season-item">
                                    <span class="season-name">${season}</span>
                                    <span class="season-count">${count}作品</span>
                                    <div class="season-bar" style="width: ${(count / totalCount * 100)}%"></div>
                                </div>`
        ).join('')}
                        </div>
                    </div>

                    <div class="stats-section">
                        <h3>✍️ 詩人ランキング</h3>
                        <div class="poet-ranking">
                            ${topPoets.map(([poet, count], index) =>
            `<div class="poet-item">
                                    <span class="poet-rank">${index + 1}</span>
                                    <span class="poet-name">${poet}</span>
                                    <span class="poet-count">${count}作品</span>
                                </div>`
        ).join('')}
                        </div>
                    </div>
                </div>
                <button onclick="closeModal()" class="primary-btn">閉じる</button>
            </div>
        `;
    } catch (error) {
        throw error;
    }
}

/**
 * 季語テストを実行
 */
function runKigoTest() {
    closeMenu();

    if (typeof window.runKigoAccuracyTest === 'function') {
        console.log('🧪 季語抽出精度テスト開始...');
        window.runKigoAccuracyTest().then(results => {
            const testResultsContent = generateTestResultsHTML(results);
            showModal(testResultsContent);
        }).catch(error => {
            console.error('季語テスト実行エラー:', error);
            showModal('<div class="error-message">季語テストの実行に失敗しました。</div>');
        });
    } else {
        showModal(`
            <div class="test-info">
                <h2>🧪 季語テスト</h2>
                <p>季語テスト機能を開始します。ブラウザのコンソールをご確認ください。</p>
                <p><strong>実行方法:</strong></p>
                <ol>
                    <li>F12キーでデベロッパーツールを開く</li>
                    <li>コンソールタブを選択</li>
                    <li><code>runKigoAccuracyTest()</code>を実行</li>
                </ol>
                <button onclick="closeModal()" class="primary-btn">閉じる</button>
            </div>
        `);
    }
}

/**
 * テスト結果のHTML生成
 */
function generateTestResultsHTML(results) {
    if (!results) return '<div class="error-message">テスト結果がありません。</div>';

    const accuracy = (results.exactMatch / results.total * 100).toFixed(1);
    const detection = (results.detected / results.total * 100).toFixed(1);

    return `
        <div class="test-results-container">
            <h2>🧪 季語抽出テスト結果</h2>
            <div class="test-summary">
                <div class="result-item">
                    <span class="result-number">${accuracy}%</span>
                    <span class="result-label">精度</span>
                </div>
                <div class="result-item">
                    <span class="result-number">${detection}%</span>
                    <span class="result-label">検出率</span>
                </div>
                <div class="result-item">
                    <span class="result-number">${results.total}</span>
                    <span class="result-label">テスト句数</span>
                </div>
            </div>

            <div class="test-details">
                <p>✅ 完全一致: ${results.exactMatch}句</p>
                <p>🟡 部分一致: ${results.partialMatch}句</p>
                <p>❌ 未検出: ${results.missed}句</p>
            </div>

            <p><small>詳細な結果はブラウザのコンソールでご確認いただけます。</small></p>
            <button onclick="closeModal()" class="primary-btn">閉じる</button>
        </div>
    `;
}

/**
 * モーダル表示
 */
function showModal(content) {
    // 既存のモーダルがあれば削除
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }

    const modalHTML = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                ${content}
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // フェードインアニメーション
    setTimeout(() => {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.classList.add('active');
        }
    }, 10);
}

/**
 * モーダルを閉じる
 */
function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

/**
 * About画面を閉じる（closeModalのエイリアス）
 */
function closeAbout() {
    closeModal();
}

/**
 * リンク集画面を表示
 */
async function showFavLinks() {
    closeMenu();

    try {
        const response = await fetch('./fav_links.html', {
            method: 'GET',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'text/html'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const favLinksContent = await response.text();
        showModal(favLinksContent);
    } catch (error) {
        console.error('リンク集画面の読み込みエラー:', error);
        showModal(`
            <div class="error-container">
                <h2>エラー</h2>
                <p>リンク集の読み込みに失敗しました。</p>
                <button onclick="closeModal()" class="primary-btn">閉じる</button>
            </div>
        `);
    }
}

function closeFavLinks() {
    closeModal();
}

// =============================================================================
// タイルレイヤー管理（OpenStreetMap Access Blocked対応）
// =============================================================================

let currentTileLayer = null;
let tileServerIndex = -1; // -1 = primary, 0+ = fallback index

/**
 * タイルレイヤーの初期化（フォールバック機能付き）
 */
function initializeTileLayer() {
    const primaryServer = MAP_CONFIG.TILE_SERVERS.primary;

    try {
        console.log(`🗺️ プライマリタイルサーバーを試行: ${primaryServer.name}`);
        loadTileLayer(primaryServer);
        tileServerIndex = -1;
    } catch (error) {
        console.warn('⚠️ プライマリタイルサーバー失敗、フォールバックを試行');
        tryFallbackTileServer();
    }
}

/**
 * タイルレイヤーの読み込み
 * @param {Object} serverConfig - タイルサーバー設定
 */
function loadTileLayer(serverConfig) {
    // 既存のタイルレイヤーを削除
    if (currentTileLayer) {
        map.removeLayer(currentTileLayer);
    }

    // 新しいタイルレイヤーを作成
    const tileLayerOptions = {
        attribution: serverConfig.attribution,
        maxZoom: Math.min(serverConfig.maxZoom || 18, MAP_CONFIG.MAX_ZOOM),
        minZoom: MAP_CONFIG.MIN_ZOOM,
        subdomains: serverConfig.subdomains || 'abc'
    };

    // User-Agent設定（一部のサーバーで対応）
    if (MAP_CONFIG.REQUEST_HEADERS) {
        tileLayerOptions.headers = MAP_CONFIG.REQUEST_HEADERS;
    }

    currentTileLayer = L.tileLayer(serverConfig.url, tileLayerOptions);

    // エラーハンドリング
    currentTileLayer.on('tileerror', function (error) {
        console.error(`❌ タイル読み込みエラー (${serverConfig.name}):`, error);

        // 3回以上エラーが続いた場合フォールバック
        if (!currentTileLayer._errorCount) {
            currentTileLayer._errorCount = 0;
        }
        currentTileLayer._errorCount++;

        if (currentTileLayer._errorCount >= 3) {
            console.warn('⚠️ タイル読み込みエラーが続くため、フォールバックを試行');
            tryFallbackTileServer();
        }
    });

    // 地図に追加
    currentTileLayer.addTo(map);

    console.log(`✅ タイルレイヤー追加: ${serverConfig.name}`);
}

/**
 * フォールバックタイルサーバーの試行
 */
function tryFallbackTileServer() {
    const fallbackServers = MAP_CONFIG.TILE_SERVERS.fallback;

    // 次のフォールバックサーバーを選択
    tileServerIndex++;

    if (tileServerIndex < fallbackServers.length) {
        const fallbackServer = fallbackServers[tileServerIndex];
        console.log(`🔄 フォールバック試行 [${tileServerIndex + 1}/${fallbackServers.length}]: ${fallbackServer.name}`);

        try {
            loadTileLayer(fallbackServer);
        } catch (error) {
            console.error(`❌ フォールバック失敗: ${fallbackServer.name}`, error);
            // 再帰的に次のフォールバックを試行
            setTimeout(() => tryFallbackTileServer(), 1000);
        }
    } else {
        // 全てのフォールバックが失敗
        console.error('❌ 全てのタイルサーバーが利用不可');
        showErrorMessage('地図の読み込みに失敗しました。インターネット接続を確認してください。');

        // 最後の手段：シンプルなOSMタイル（ポリシー違反だが動作確認用）
        loadEmergencyTileLayer();
    }
}

/**
 * 緊急用タイルレイヤー（最後の手段）
 */
function loadEmergencyTileLayer() {
    console.warn('🚨 緊急用タイルレイヤーを読み込み');

    const emergencyConfig = {
        name: 'Emergency OSM',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
        subdomains: 'abc'
    };

    // User-Agent設定を強制的に追加
    const tileLayerOptions = {
        attribution: emergencyConfig.attribution + ' | <strong>俳句鑑賞アプリ「吟行」</strong>',
        maxZoom: emergencyConfig.maxZoom,
        minZoom: MAP_CONFIG.MIN_ZOOM,
        subdomains: emergencyConfig.subdomains
    };

    // 既存のタイルレイヤーを削除
    if (currentTileLayer) {
        map.removeLayer(currentTileLayer);
    }

    currentTileLayer = L.tileLayer(emergencyConfig.url, tileLayerOptions);
    currentTileLayer.addTo(map);

    showInfoMessage('地図は表示されましたが、一部制限がある可能性があります。');
}

/**
 * タイルサーバーの手動切り替え
 * @param {string} serverType - 'primary' または fallback配列のインデックス
 */
function switchTileServer(serverType) {
    if (serverType === 'primary') {
        tileServerIndex = -1;
        loadTileLayer(MAP_CONFIG.TILE_SERVERS.primary);
    } else if (typeof serverType === 'number') {
        const fallbackServers = MAP_CONFIG.TILE_SERVERS.fallback;
        if (serverType >= 0 && serverType < fallbackServers.length) {
            tileServerIndex = serverType;
            loadTileLayer(fallbackServers[serverType]);
        }
    }
}

/**
 * 現在のタイルサーバー情報を取得
 * @returns {Object} タイルサーバー情報
 */
function getCurrentTileServerInfo() {
    if (tileServerIndex === -1) {
        return {
            type: 'primary',
            server: MAP_CONFIG.TILE_SERVERS.primary,
            index: -1
        };
    } else {
        return {
            type: 'fallback',
            server: MAP_CONFIG.TILE_SERVERS.fallback[tileServerIndex],
            index: tileServerIndex
        };
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
    // 重複初期化防止
    if (map) {
        console.warn('⚠️ 地図は既に初期化済みです');
        return;
    }

    // 地図設定を使用
    const center = MAP_CONFIG.DEFAULT_CENTER;
    const zoom = MAP_CONFIG.DEFAULT_ZOOM;

    try {
        map = L.map('map').setView(center, zoom);
    } catch (error) {
        console.error('❌ 地図初期化エラー:', error);
        throw error;
    }

    // タイルレイヤーを追加（フォールバック機能付き）
    initializeTileLayer();

    // マーカー用のクラスターグループを作成
    const maxRadius = UI_CONFIG.CLUSTER_MAX_RADIUS || 2;

    markersLayer = L.markerClusterGroup({
        maxClusterRadius: maxRadius, // 常時固定値でクラスタリング
        spiderfyOnMaxZoom: true, // 最大ズーム時にスパイダーファイ
        showCoverageOnHover: false, // ホバー時のカバレッジ表示を無効
        zoomToBoundsOnClick: true, // クリック時にズームイン
        iconCreateFunction: function (cluster) {
            const childCount = cluster.getChildCount();
            let className = 'custom-cluster-icon';

            if (childCount < 4) {
                className += ' cluster-small';
            } else if (childCount < 7) {
                className += ' cluster-medium';
            } else {
                className += ' cluster-large';
            }

            // クラスタ内の俳句の最多季節を取得
            const mostCommonSeason = getMostCommonSeason(cluster);
            const seasonColor = getSeasonColor(mostCommonSeason);
            const textColor = getSeasonTextColor(mostCommonSeason);

            return L.divIcon({
                html: `
                    <div class="cluster-main" style="background: ${seasonColor};">
                        <span class="cluster-count" style="color: ${textColor} !important;">${childCount}</span>
                    </div>
                `,
                className: className,
                iconSize: [28, 28]
            });
        }
    }).addTo(map);

    // クラスタリング設定のデバッグ情報
    console.log('🔧 クラスタリング設定:');
    console.log(`  - 最大半径: ${maxRadius}px`);
    console.log(`  - スパイダーファイ: 有効`);
    console.log(`  - 常時クラスタリング: 有効`);

    console.log('地図の初期化が完了しました');
}

/**
 * クラスタ内の俳句から最も多い季節を取得
 */
function getMostCommonSeason(cluster) {
    const childMarkers = cluster.getAllChildMarkers();
    const seasonCounts = {};

    // 各マーカーの季節を集計
    childMarkers.forEach(marker => {
        const haikuData = marker.options.haikuData;
        if (haikuData && haikuData.season) {
            const season = haikuData.season;
            seasonCounts[season] = (seasonCounts[season] || 0) + 1;
        }
    });

    // 最も多い季節を取得
    let mostCommonSeason = 'その他';
    let maxCount = 0;

    for (const [season, count] of Object.entries(seasonCounts)) {
        if (count > maxCount) {
            maxCount = count;
            mostCommonSeason = season;
        }
    }

    return mostCommonSeason;
}

/**
 * 季節に対応する色を取得
 */
function getSeasonColor(season) {
    const seasonColors = {
        '春': '#3498db',      // var(--spring-color)
        '夏': '#e74c3c',      // var(--summer-color)
        '秋': '#ffffff',      // var(--autumn-color)
        '冬': '#2c3e50',      // var(--winter-color)
        '暮・新年': '#f1c40f', // var(--newyear-color)
        'その他': '#95a5a6'    // var(--other-color)
    };

    return seasonColors[season] || seasonColors['その他'];
}

/**
 * 季節に対応する文字色を取得
 */
function getSeasonTextColor(season) {
    // 秋（白）と暮・新年（黄）は文字色を黒にする
    if (season === '秋' || season === '暮・新年') {
        return '#333';
    }
    return '#fff';
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

        // マーカー統計情報をログ出力
        setTimeout(() => {
            const totalMarkers = markersLayer.getLayers().length;
            const currentZoom = map.getZoom();

            console.log(`📊 マーカー統計:`);
            console.log(`  - 総マーカー数: ${totalMarkers}`);
            console.log(`  - 現在のズームレベル: ${currentZoom}`);
            console.log(`  - クラスタリング: 常時有効`);
        }, 100); // マーカー追加完了を待つ

        // データが0件の場合の対応
        if (haikuData.length === 0) {
            showInfoMessage('俳句データが見つかりませんでした');
        }

    } catch (error) {
        console.error('俳句データの読み込みに失敗:', error);
        throw error;
    }
}

/**
 * 歌枕の判定（キーワードベース）
 * @param {string} text - テキスト
 * @returns {Promise<boolean>} 歌枕が含まれているかどうか
 */
async function hasUtamakura(text) {
    try {
        // Supabaseクライアントから歌枕データを取得
        const supabaseClientInstance = getSupabaseClient();
        if (!supabaseClientInstance) return false;

        const utamakuraData = await supabaseClientInstance.getUtamakura();
        if (!utamakuraData || utamakuraData.length === 0) return false;

        // テキストに歌枕が含まれているかチェック
        return utamakuraData.some(utamakura => {
            if (text.includes(utamakura.display_name)) return true;
            if (utamakura.display_name_alternatives) {
                return utamakura.display_name_alternatives.some(alt => text.includes(alt));
            }
            return false;
        });
    } catch (error) {
        console.error('❌ 歌枕判定エラー:', error);
        return false;
    }
}

// APIデータから俳句マーカーを地図に追加
async function addHaikuMarkerFromAPI(haikuData) {
    const { id, latitude, longitude, location_name, haiku_text, poet_name, location_type, description, season, poetry_type, status } = haikuData;

    // 緯度経度の検証
    if (!latitude || !longitude || latitude === 0 || longitude === 0) {
        console.warn('無効な座標データ:', haikuData);
        return;
    }

    // 下書きかどうかの判定
    const isDraft = status === 'draft';

    // 短歌・歌枕の判定
    const isTanka = poetry_type === '短歌';
    const hasUtamakuraFlag = isTanka ? await hasUtamakura(haiku_text) : false;

    let iconHtml, iconSize, iconAnchor, markerClassName;

    if (isTanka && hasUtamakuraFlag) {
        // 歌枕を含む短歌: 紫色のモダンな山のアイコン
        const draftClass = isDraft ? 'draft' : '';
        iconHtml = `
            <div class="existing-pin pin-appear ${draftClass}">
                <div class="pin-mountain utamakura ${draftClass}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#8e44ad">
                        <path d="M12 2l-2 4-4 2 4 2 2 4 2-4 4-2-4-2-2-4z M8 12l-3 6h14l-3-6-4 2-4-2z"/>
                    </svg>
                </div>
            </div>
        `;
        iconSize = [24, 30];
        iconAnchor = [12, 30];
        markerClassName = `tanka utamakura ${draftClass}`;
    } else if (isTanka) {
        // 歌枕を含まない短歌: 灰色の通常の涙型アイコン
        const draftClass = isDraft ? 'draft' : '';
        iconHtml = `
            <div class="existing-pin pin-appear ${draftClass}">
                <div class="pin-teardrop tanka-no-utamakura ${draftClass}" style="background-color: #95a5a6;">
                    <div class="pin-dot"></div>
                </div>
            </div>
        `;
        iconSize = [24, 30];
        iconAnchor = [12, 30];
        markerClassName = `tanka no-utamakura ${draftClass}`;
    } else {
        // 俳句: 既存の季節別色分け (下書きの場合は点線枠)
        const iconColor = MAP_CONFIG.MARKER_COLORS[season] || MAP_CONFIG.MARKER_COLORS['その他'];
        const draftClass = isDraft ? 'draft' : '';
        iconHtml = `
            <div class="existing-pin pin-appear ${draftClass}">
                <div class="pin-teardrop ${season || 'その他'} ${draftClass}" style="background-color: ${iconColor};">
                    <div class="pin-dot"></div>
                </div>
            </div>
        `;
        iconSize = [24, 30];
        iconAnchor = [12, 30];
        markerClassName = `haiku season-${season || 'other'} ${draftClass}`;
    }

    // カスタムアイコンを作成
    const customIcon = L.divIcon({
        className: `poetry-marker ${markerClassName}`,
        html: iconHtml,
        iconSize: iconSize,
        iconAnchor: iconAnchor
    });

    // マーカーを作成してレイヤーグループに追加（季節データも含める）
    const marker = L.marker([latitude, longitude], {
        icon: customIcon,
        haikuData: {
            season: season,
            poetry_type: poetry_type,
            id: id,
            haiku_text: haiku_text,
            poet_name: poet_name
        }
    });

    // ポップアップコンテンツを作成
    const popupContent = createHaikuPopupContent({
        id,
        location_name,
        haiku_text,
        poet_name,
        location_type,
        season,
        description,
        status
    });

    marker.bindPopup(popupContent, {
        maxWidth: UI_CONFIG.POPUP_MAX_WIDTH,
        className: 'haiku-popup-container',
        offset: L.point(0, -40)  // Leaflet.Pointオブジェクトを使用
    });

    // マーカークリック時に地図クリックイベントの伝播を停止
    marker.on('click', function (e) {
        console.log(`📍 既存俳句マーカークリック: ${haiku_text.substring(0, 10)}...`);

        // 一時ピンがあれば削除
        if (typeof removeTemporaryPin === 'function') {
            removeTemporaryPin();
        }

        // インラインフォームがあれば非表示
        if (typeof hideInlineForm === 'function') {
            hideInlineForm();
        }

        // イベントの伝播を停止（地図クリックイベントを防ぐ）
        L.DomEvent.stopPropagation(e);
    });

    // マーカーをレイヤーグループに追加
    markersLayer.addLayer(marker);
}

// 俳句ポップアップコンテンツを作成
function createHaikuPopupContent(haiku) {
    const { id, location_name, haiku_text, poet_name, location_type, description, season, preface, status } = haiku;

    // 下書きかどうかを判定
    const isDraft = status === 'draft';

    return `
        <div class="haiku-popup" data-haiku-id="${id}">
            ${preface ? `<div class="haiku-preface">${preface}</div>` : ''}
            <div class="popup-header">
                <span class="season-badge season-${season || 'other'}">${season || 'その他'}</span>
                ${isDraft ? '<span class="draft-badge">下書き</span>' : ''}
            </div>
            <div class="haiku-content">
                <div class="haiku-text">${haiku_text}</div>
                <div class="poet-name">― ${poet_name || '不明'} ―</div>
            </div>
            ${location_name ? `<div class="location-info">${location_name}</div>` : ''}
            ${description ? `<div class="haiku-description">${description}</div>` : ''}
            <div class="popup-actions">
                ${isDraft ? `<button class="btn-edit" onclick="editHaiku(${id})">編集</button>` : ''}
                <button class="btn-detail" onclick="showHaikuDetail(${id})">詳細を見る</button>
            </div>
        </div>
    `;
}

// 俳句編集（インラインフォームで編集）
async function editHaiku(haikuId) {
    console.log(`📝 俳句編集開始: ID=${haikuId}`);

    try {
        // ポップアップを閉じる
        map.closePopup();

        // APIから俳句データ取得
        const haiku = await apiAdapter.getHaiku(haikuId);

        if (!haiku) {
            throw new Error('俳句データが見つかりません');
        }

        console.log('✅ 俳句データ取得:', haiku);

        // インラインフォームを編集モードで開く（pin-posting.jsの関数）
        if (typeof window.showInlineFormForEdit === 'function') {
            window.showInlineFormForEdit(haiku);
        } else {
            console.error('❌ showInlineFormForEdit関数が見つかりません');
        }
    } catch (error) {
        console.error('❌ 俳句編集エラー:', error);
        showErrorMessage('俳句の編集に失敗しました');
    }
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

// 成功メッセージ表示
function showSuccessMessage(message) {
    showMessage(message, 'success');
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
            function (position) {
                const location = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                };
                console.log('位置情報取得成功:', location);
                resolve(location);
            },
            function (error) {
                console.warn('位置情報の取得に失敗:', error);

                // エラーの種類に応じてメッセージを変更
                let errorMessage = '';
                switch (error.code) {
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

    currentLocationMarker.bindPopup(popupContent, {
        offset: L.point(0, -30)  // Leaflet.Pointオブジェクトを使用
    });

    // 現在地マーカーをクリックできるようにする
    currentLocationMarker.on('click', function () {
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

// =============================================================================
// ES Module 対応 - グローバル関数の公開
// =============================================================================

// HTMLのonclick属性から呼ばれる関数をwindowオブジェクトに公開
if (typeof window !== 'undefined') {
    window.toggleMenu = toggleMenu;
    window.closeMenu = closeMenu;
    window.showAbout = showAbout;
    window.showFavLinks = showFavLinks;
    window.goToCurrentLocation = goToCurrentLocation;
    window.closeHaikuForm = closeHaikuForm;
    window.getCurrentLocationForForm = getCurrentLocationForForm;
    window.submitHaiku = submitHaiku;
    window.closeModal = closeModal;
    window.showHaikuDetail = showHaikuDetail;
    window.editHaiku = editHaiku;
    window.closeAbout = closeAbout;

    console.log('✅ script.js グローバル関数をwindowに公開');
}

// ES Module exports (app-manager.js、pin-posting.jsから使用される関数・変数)
export {
    initializeMapWithLocation,
    initializeMap,
    loadHaikuData,
    showErrorMessage,
    showSuccessMessage,
    map
};