// 俳句鑑賞＆記録アプリ - 設定ファイル

// Supabase設定
const SUPABASE_CONFIG = {
    // Supabaseプロジェクト設定
    // 実際のSupabaseプロジェクトのURLとキーに置き換えてください
    url: 'https://tyolqoqeysyyocswsxrn.supabase.co', // https://your-project-id.supabase.co
    anon_key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5b2xxb3FleXN5eW9jc3dzeHJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMTc0ODMsImV4cCI6MjA3MTc5MzQ4M30.LIO2wJrnAvdc-GVDSXweLzKLmqB18S0LIL3OAQAbJUo', // 公開用の匿名キー

    // データベース設定
    schema: 'public'
};

// 従来のGAS API設定（後方互換性のため残しておく）
const API_CONFIG = {
    // Google Apps Script Web App URL（移行後は不要）
    BASE_URL: 'https://script.google.com/macros/s/AKfycbx8jz9Eg5LPb-lUm_7dDuKPX8q_DtQfaDx3b3wYW6lKFLMugWi2nMC8ucMZFAyRE9SkLw/exec',

    // APIエンドポイント
    ENDPOINTS: {
        HAIKUS: 'api/haikus',
        HAIKUS_MAP: 'api/haikus/map',
        HAIKUS_SEARCH: 'api/haikus/search',
        POETS: 'api/poets',
        POETS_SEARCH: 'api/poets/search'
    },

    // リクエスト設定
    TIMEOUT: 30000, // 30秒（POST処理に時間がかかるため）
    RETRY_COUNT: 1  // POSTは重複を防ぐため1回のみ
};

// 地図設定
const MAP_CONFIG = {
    // デフォルト表示位置（東京駅）
    DEFAULT_CENTER: [35.6812, 139.7671],
    DEFAULT_ZOOM: 10,

    // ズーム範囲
    MIN_ZOOM: 5,
    MAX_ZOOM: 18,

    // マーカー設定（句季による色分け）
    MARKER_COLORS: {
        '春': '#3498db',      // 青
        '夏': '#e74c3c',      // 赤
        '秋': '#ffffff',      // 白
        '冬': '#2c3e50',      // 黒
        '暮・新年': '#f1c40f', // 黄
        'その他': '#95a5a6'   // グレー（デフォルト）
    }
};

// UI設定
const UI_CONFIG = {
    // ローディング表示時間
    LOADING_MIN_TIME: 500, // 最低500ms表示

    // ポップアップ設定
    POPUP_MAX_WIDTH: 300,

    // エラーメッセージ表示時間
    ERROR_DISPLAY_TIME: 5000, // 5秒

    // パフォーマンス設定
    DEBOUNCE_SEARCH_TIME: 300, // 検索デバウンス時間
    MAP_CLUSTER_MAX_ZOOM: 15   // クラスター表示の最大ズーム
};

// アプリケーション設定
const APP_CONFIG = {
    // データベース移行設定
    USE_SUPABASE: true, // trueでSupabase、falseで従来のGAS API

    // デバッグ設定
    DEBUG_MODE: false,

    // バッチサイズ設定
    MAP_BATCH_SIZE: 1000, // 地図表示時のバッチサイズ
    SEARCH_LIMIT: 50      // 検索結果の制限数
};

// 設定の検証関数
function validateConfig() {
    if (APP_CONFIG.USE_SUPABASE) {
        if (!SUPABASE_CONFIG.url || SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL') {
            console.warn('⚠️ Supabase URLが設定されていません');
            return false;
        }
        if (!SUPABASE_CONFIG.anon_key || SUPABASE_CONFIG.anon_key === 'YOUR_SUPABASE_ANON_KEY') {
            console.warn('⚠️ Supabase匿名キーが設定されていません');
            return false;
        }
        console.log('✅ Supabase設定が有効です');
    } else {
        console.log('ℹ️ 従来のGAS APIを使用します');
    }
    return true;
}