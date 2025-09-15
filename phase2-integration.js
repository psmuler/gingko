/**
 * 俳句鑑賞＆記録アプリ - Phase 2 統合ファイル
 * Phase 1からPhase 2への移行とシステム統合
 */

// =============================================================================
// Phase 2 システム統合
// =============================================================================

/**
 * Phase 2機能の統合初期化
 */
function initializePhase2Integration() {
    // 既存システムの無効化
    disableLegacyFeatures();

    // 新システムの有効化
    enablePhase2Features();

    console.log('✅ Phase 2 システム統合完了');
}

/**
 * 従来機能の無効化
 */
function disableLegacyFeatures() {
    // 従来の投稿ボタンを非表示
    const addHaikuBtn = document.getElementById('add-haiku-btn');
    if (addHaikuBtn) {
        addHaikuBtn.style.display = 'none';
    }

    // 従来のマーカーレイヤーを無効化
    if (window.markersLayer) {
        window.markersLayer.clearLayers();
    }

    // 既存のフォームを非表示（Phase 2では詳細フォームとして残す）
    const haikuFormContainer = document.getElementById('haiku-form-container');
    if (haikuFormContainer) {
        haikuFormContainer.style.display = 'none';
    }

    console.log('🔄 Phase 1機能を無効化');
}

/**
 * Phase 2機能の有効化
 */
function enablePhase2Features() {
    // 地図クリックイベントでピン投稿を有効化
    if (window.map && typeof handleMapClick === 'function') {
        window.map.on('click', handleMapClick);
    }

    // 現在地ボタンの見た目を更新（既にHTML/CSSで対応済み）

    console.log('🚀 Phase 2機能を有効化');
}

/**
 * 既存のloadHaikuData関数をオーバーライド
 */
function overrideLoadHaikuData() {
    const originalLoadHaikuData = window.loadHaikuData;

    if (originalLoadHaikuData) {
        window.loadHaikuData = async function() {
            try {
                console.log('🔄 俳句データ読み込み開始（Phase 2版）');

                // APIアダプター経由でデータ取得
                const haikus = await apiAdapter.getHaikusForMap();

                // クラスタリング表示
                if (typeof addHaikuMarkersToCluster === 'function') {
                    addHaikuMarkersToCluster(haikus);
                }

                // グローバルデータ更新
                window.haikuData = haikus;

                console.log(`✅ 俳句データ読み込み完了: ${haikus.length}件`);

            } catch (error) {
                console.error('❌ 俳句データ読み込みエラー:', error);
                showErrorMessage('俳句データの読み込みに失敗しました');
            }
        };
    }
}

/**
 * 既存のsubmitHaiku関数との統合
 */
function integrateSubmitHaiku() {
    // Phase 2のピン投稿システムが主体となるため、
    // 既存のsubmitHaiku関数は詳細フォーム用として保持
    const originalSubmitHaiku = window.submitHaiku;

    if (originalSubmitHaiku) {
        // 詳細フォーム投稿後にクラスター更新
        window.submitHaiku = async function(event) {
            try {
                await originalSubmitHaiku(event);

                // 投稿成功後にクラスター更新
                await window.loadHaikuData();

            } catch (error) {
                console.error('❌ 詳細フォーム投稿エラー:', error);
            }
        };
    }
}

/**
 * UI要素の動的調整
 */
function adjustUIElements() {
    // 地図コントロールの位置調整
    const mapControls = document.getElementById('map-controls');
    if (mapControls) {
        // 現在地ボタンのみ表示
        const buttons = mapControls.querySelectorAll('.map-control-btn');
        buttons.forEach(btn => {
            if (btn.id !== 'current-location-btn') {
                btn.style.display = 'none';
            }
        });
    }

    // 地図の高さを最大化（ボタンが減った分）
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
        mapContainer.style.height = '100vh';
    }

    const map = document.getElementById('map');
    if (map) {
        map.style.height = '100%';
    }
}

/**
 * モバイル対応の強化
 */
function enhanceMobileSupport() {
    // タッチイベントの最適化
    if ('ontouchstart' in window) {
        // タッチデバイス用の調整
        document.body.classList.add('touch-device');

        // 地図の触感フィードバック
        if (window.map) {
            window.map.on('click', function() {
                // 軽い触感フィードバック（対応端末のみ）
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
            });
        }
    }

    // 画面サイズ変更時の対応
    window.addEventListener('resize', function() {
        if (window.map) {
            // 地図サイズの再計算
            setTimeout(() => {
                window.map.invalidateSize();
            }, 100);
        }
    });
}

/**
 * パフォーマンス最適化
 */
function optimizePerformance() {
    // 地図の描画最適化
    if (window.map) {
        // 地図の描画設定を最適化
        window.map.options.preferCanvas = true;
        window.map.options.updateWhenZooming = false;
    }

    // 季語キャッシュの定期クリーンアップ
    if (typeof clearSeasonalTermsCache === 'function') {
        setInterval(() => {
            // 5分間隔でキャッシュクリア
            clearSeasonalTermsCache();
        }, 5 * 60 * 1000);
    }

    // 未使用イベントリスナーのクリーンアップ
    window.addEventListener('beforeunload', function() {
        if (window.map) {
            window.map.remove();
        }
    });
}

/**
 * エラーハンドリングの強化
 */
function enhanceErrorHandling() {
    // グローバルエラーハンドラー
    window.addEventListener('error', function(event) {
        console.error('Phase 2 統合エラー:', event.error);

        // ユーザーフレンドリーなエラーメッセージ
        if (typeof showErrorMessage === 'function') {
            showErrorMessage('アプリケーションでエラーが発生しました。ページを再読み込みしてください。');
        }
    });

    // Promise rejectionの処理
    window.addEventListener('unhandledrejection', function(event) {
        console.error('未処理のPromise拒否:', event.reason);

        if (typeof showErrorMessage === 'function') {
            showErrorMessage('データ処理でエラーが発生しました。');
        }
    });
}

/**
 * デバッグ情報の提供
 */
function provideDebugInfo() {
    // 開発用のグローバル関数を追加
    window.getPhase2Stats = function() {
        const stats = {
            version: 'Phase 2.0',
            features: {
                pinPosting: typeof handleMapClick === 'function',
                seasonalSuggest: typeof detectSeasonalTerms === 'function',
                clustering: typeof addHaikuMarkersToCluster === 'function',
                tileServerFallback: typeof switchTileServer === 'function'
            },
            performance: {}
        };

        // クラスタリング統計
        if (typeof getClusteringStats === 'function') {
            stats.clustering = getClusteringStats();
        }

        // 季語検出統計
        if (typeof getSeasonDetectionStats === 'function') {
            stats.seasonalSuggest = getSeasonDetectionStats();
        }

        // タイルサーバー情報
        if (typeof getCurrentTileServerInfo === 'function') {
            stats.tileServer = getCurrentTileServerInfo();
        }

        return stats;
    };

    // タイルサーバー切り替え機能をグローバルに公開
    window.switchTileServer = function(serverType) {
        if (typeof switchTileServer === 'function') {
            switchTileServer(serverType);
            console.log('🗺️ タイルサーバーを切り替えました:', serverType);
        } else {
            console.error('❌ タイルサーバー切り替え機能が利用できません');
        }
    };

    // 利用可能なタイルサーバー一覧を表示
    window.listTileServers = function() {
        const primary = MAP_CONFIG.TILE_SERVERS.primary;
        const fallbacks = MAP_CONFIG.TILE_SERVERS.fallback;

        console.log('🗺️ 利用可能なタイルサーバー:');
        console.log('  Primary:', primary.name);
        console.log('  Fallbacks:');
        fallbacks.forEach((server, index) => {
            console.log(`    [${index}] ${server.name}`);
        });
        console.log('\n切り替え方法:');
        console.log('  window.switchTileServer("primary") - プライマリに切り替え');
        console.log('  window.switchTileServer(0) - 最初のフォールバックに切り替え');
    };

    // 一時的ピン機能をグローバルに公開
    window.showTemporaryPin = function(lat, lng) {
        if (typeof showTemporaryPin === 'function') {
            showTemporaryPin(lat, lng);
            console.log(`📍 一時的ピン表示: ${lat}, ${lng}`);
        } else {
            console.error('❌ 一時的ピン機能が利用できません');
        }
    };

    window.removeTemporaryPin = function() {
        if (typeof removeTemporaryPin === 'function') {
            removeTemporaryPin();
            console.log('📍 一時的ピンを削除しました');
        } else {
            console.error('❌ 一時的ピン削除機能が利用できません');
        }
    };

    // デバッグ用のシンプルピン表示
    window.showDebugPin = function(lat, lng) {
        if (typeof showDebugPin === 'function') {
            showDebugPin(lat, lng);
            console.log(`🔧 デバッグピン表示: ${lat}, ${lng}`);
        } else {
            console.error('❌ デバッグピン機能が利用できません');
        }
    };

    // コンソールでの確認コマンド
    console.log('🔧 Phase 2 デバッグ情報: window.getPhase2Stats() で確認可能');
    console.log('🗺️ タイルサーバー情報: window.listTileServers() で確認可能');
    console.log('📍 ピン操作: window.showTemporaryPin(lat, lng) / window.removeTemporaryPin() で手動操作可能');
}

// =============================================================================
// 初期化実行
// =============================================================================

document.addEventListener('DOMContentLoaded', function() {
    // 他のシステムの初期化完了を待つ
    setTimeout(() => {
        initializePhase2Integration();
        overrideLoadHaikuData();
        integrateSubmitHaiku();
        adjustUIElements();
        enhanceMobileSupport();
        optimizePerformance();
        enhanceErrorHandling();
        provideDebugInfo();

        console.log('🎉 Phase 2 完全統合完了');
    }, 1000);
});

// Phase 2の機能が利用可能かチェックする関数
window.isPhase2Ready = function() {
    return !!(
        typeof handleMapClick === 'function' &&
        typeof detectSeasonalTerms === 'function' &&
        typeof addHaikuMarkersToCluster === 'function'
    );
};