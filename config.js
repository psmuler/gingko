// 俳句鑑賞＆記録アプリ - 設定ファイル

// API設定
const API_CONFIG = {
    // Google Apps Script Web App URL
    // 実際のデプロイURLに置き換えてください
    BASE_URL: 'https://script.google.com/macros/s/AKfycbzPMObwhlFho58wUtVCpUPxreI3swy5YBLG-fW5PkODJyRJOcLGhGuzPK8c2LR9W5CNvg/exec',

    // APIエンドポイント
    ENDPOINTS: {
        HAIKUS: 'api/haikus',
        HAIKUS_MAP: 'api/haikus/map',
        HAIKUS_SEARCH: 'api/haikus/search',
        POETS: 'api/poets',
        POETS_SEARCH: 'api/poets/search'
    },

    // リクエスト設定
    TIMEOUT: 10000, // 10秒
    RETRY_COUNT: 3
};

// 地図設定
const MAP_CONFIG = {
    // デフォルト表示位置（東京駅）
    DEFAULT_CENTER: [35.6812, 139.7671],
    DEFAULT_ZOOM: 10,

    // ズーム範囲
    MIN_ZOOM: 5,
    MAX_ZOOM: 18,

    // マーカー設定
    MARKER_COLORS: {
        '句碑': '#e74c3c',      // 赤
        '紀行文': '#3498db',    // 青
        'ゆかりの地': '#2ecc71' // 緑
    }
};

// UI設定
const UI_CONFIG = {
    // ローディング表示時間
    LOADING_MIN_TIME: 500, // 最低500ms表示

    // ポップアップ設定
    POPUP_MAX_WIDTH: 300,

    // エラーメッセージ表示時間
    ERROR_DISPLAY_TIME: 5000 // 5秒
};