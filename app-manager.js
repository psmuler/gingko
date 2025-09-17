/**
 * 俳句鑑賞＆記録アプリ - アプリケーション管理クラス
 * 全体の初期化順序と依存関係を管理
 */

class AppManager {
    constructor() {
        this.isInitialized = false;
        this.initializationStartTime = null;
        this.managers = {
            config: null,
            api: null,
            data: null,
            map: null,
            ui: null
        };
        this.initializationSteps = [];
        this.currentStep = 0;
    }

    /**
     * アプリケーション初期化のメインエントリーポイント
     */
    async initialize() {
        if (this.isInitialized) {
            console.warn('⚠️ AppManager: 既に初期化済みです');
            return;
        }

        this.initializationStartTime = Date.now();
        console.log('🚀 AppManager: アプリケーション初期化開始');

        try {
            await this.executeInitializationSequence();
            this.markAsInitialized();
            this.logInitializationSuccess();
        } catch (error) {
            this.handleInitializationError(error);
        }
    }

    /**
     * 初期化シーケンスの実行
     */
    async executeInitializationSequence() {
        this.initializationSteps = [
            { name: '設定の検証', action: this.validateConfig.bind(this) },
            { name: 'APIアダプター初期化', action: this.initializeAPIAdapter.bind(this) },
            { name: '地図初期化', action: this.initializeMap.bind(this) },
            { name: 'データ管理初期化', action: this.initializeDataManager.bind(this) },
            { name: 'UI管理初期化', action: this.initializeUIManager.bind(this) },
            { name: '季語サジェスト初期化', action: this.initializeKigoSuggestions.bind(this) },
            { name: 'ピン投稿システム初期化', action: this.initializePinPosting.bind(this) },
            { name: 'データ読み込み', action: this.loadInitialData.bind(this) }
        ];

        for (let i = 0; i < this.initializationSteps.length; i++) {
            const step = this.initializationSteps[i];
            this.currentStep = i;

            console.log(`🔧 [${i + 1}/${this.initializationSteps.length}] ${step.name}...`);
            await step.action();
        }
    }

    /**
     * 設定の検証
     */
    async validateConfig() {
        if (typeof MAP_CONFIG === 'undefined') {
            throw new Error('MAP_CONFIG が定義されていません');
        }
        if (typeof UI_CONFIG === 'undefined') {
            throw new Error('UI_CONFIG が定義されていません');
        }
        console.log('✅ 設定検証完了');
    }

    /**
     * APIアダプターの初期化
     */
    async initializeAPIAdapter() {
        if (typeof apiAdapter !== 'undefined' && apiAdapter.initialize) {
            await apiAdapter.initialize();
            this.managers.api = apiAdapter;
            console.log('✅ APIアダプター初期化完了');
        } else {
            throw new Error('apiAdapter が見つかりません');
        }
    }

    /**
     * 地図初期化
     */
    async initializeMap() {
        // 既存の地図初期化関数を使用
        if (typeof initializeMapWithLocation === 'function') {
            await initializeMapWithLocation();
            console.log('✅ 地図初期化完了');
        } else {
            throw new Error('地図初期化関数が見つかりません');
        }
    }

    /**
     * データ管理初期化
     */
    async initializeDataManager() {
        // データ管理機能の初期化（将来的にDataManagerクラスで実装）
        console.log('✅ データ管理初期化完了');
    }

    /**
     * UI管理初期化
     */
    async initializeUIManager() {
        // UI管理機能の初期化（将来的にUIManagerクラスで実装）
        this.setupGlobalEventHandlers();
        console.log('✅ UI管理初期化完了');
    }

    /**
     * 季語サジェスト初期化
     */
    async initializeKigoSuggestions() {
        if (typeof initializeKigoSuggestions === 'function') {
            await initializeKigoSuggestions();
            console.log('✅ 季語サジェスト初期化完了');
        } else {
            console.warn('⚠️ 季語サジェスト機能が見つかりません');
        }
    }

    /**
     * ピン投稿システム初期化
     */
    async initializePinPosting() {
        if (typeof initializePinPosting === 'function') {
            // 少し待ってから初期化（地図の完全な初期化を待つ）
            setTimeout(() => {
                initializePinPosting();
                console.log('✅ ピン投稿システム初期化完了');
            }, 500);
        } else {
            console.warn('⚠️ ピン投稿システムが見つかりません');
        }
    }

    /**
     * 初期データ読み込み
     */
    async loadInitialData() {
        if (typeof loadHaikuData === 'function') {
            await loadHaikuData();
            console.log('✅ 初期データ読み込み完了');
        } else {
            throw new Error('データ読み込み関数が見つかりません');
        }
    }

    /**
     * グローバルイベントハンドラーの設定
     */
    setupGlobalEventHandlers() {
        // 画面リサイズ対応（統合版）
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleWindowResize();
            }, 150);
        });

        // エラーハンドリング
        window.addEventListener('error', (event) => {
            this.handleGlobalError(event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.handleGlobalError(event.reason);
        });
    }

    /**
     * ウィンドウリサイズ処理
     */
    handleWindowResize() {
        try {
            if (window.map && window.map._container) {
                window.map.invalidateSize();
                console.log('📐 地図サイズ再計算完了');
            }

            // インラインフォームの調整
            const inlineForm = document.getElementById('inline-form-container');
            if (inlineForm && inlineForm.classList.contains('active')) {
                console.log('📐 インラインフォーム位置再調整');
            }
        } catch (error) {
            console.warn('⚠️ リサイズ処理エラー:', error);
        }
    }

    /**
     * グローバルエラーハンドリング
     */
    handleGlobalError(error) {
        console.error('❌ グローバルエラー:', error);

        // 初期化中のエラーの場合
        if (!this.isInitialized) {
            this.handleInitializationError(error);
            return;
        }

        // 運用中のエラーの場合
        if (typeof showErrorMessage === 'function') {
            showErrorMessage('アプリケーションでエラーが発生しました');
        }
    }

    /**
     * 初期化完了マーク
     */
    markAsInitialized() {
        this.isInitialized = true;
        window.appManager = this; // グローバルアクセス用
    }

    /**
     * 初期化成功ログ
     */
    logInitializationSuccess() {
        const initTime = Date.now() - this.initializationStartTime;
        console.log(`🎉 AppManager: 初期化完了 (${initTime}ms)`);
        console.log('🔧 デバッグ情報: window.appManager で管理クラスにアクセス可能');
    }

    /**
     * 初期化エラー処理
     */
    handleInitializationError(error) {
        const initTime = Date.now() - this.initializationStartTime;
        console.error(`❌ AppManager: 初期化失敗 (${initTime}ms)`, error);

        if (typeof showErrorMessage === 'function') {
            showErrorMessage(`初期化に失敗しました: ${error.message}`);
        }

        // フォールバック: 最低限の機能で動作継続
        this.enableFallbackMode();
    }

    /**
     * フォールバックモード
     */
    enableFallbackMode() {
        console.warn('⚠️ フォールバックモードで動作します');

        // 最低限の地図初期化
        if (typeof initializeMap === 'function') {
            try {
                initializeMap();
                console.log('✅ フォールバック: 基本地図初期化完了');
            } catch (error) {
                console.error('❌ フォールバック: 地図初期化も失敗', error);
            }
        }
    }

    /**
     * アプリケーション状態取得
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            currentStep: this.currentStep,
            totalSteps: this.initializationSteps.length,
            managers: Object.keys(this.managers).reduce((acc, key) => {
                acc[key] = this.managers[key] !== null;
                return acc;
            }, {}),
            initializationTime: this.initializationStartTime ?
                Date.now() - this.initializationStartTime : null
        };
    }
}

// AppManagerのインスタンス作成とグローバル公開
const appManager = new AppManager();

// DOMContentLoaded時の自動初期化
document.addEventListener('DOMContentLoaded', async () => {
    await appManager.initialize();
});

// デバッグ用
window.getAppStatus = () => appManager.getStatus();