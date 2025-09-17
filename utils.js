/**
 * 俳句鑑賞＆記録アプリ - 共通ユーティリティ関数
 * 重複しているヘルパー関数を統合
 */

// =============================================================================
// デバウンス・スロットル関数
// =============================================================================

/**
 * デバウンス関数（複数のファイルで重複していたものを統合）
 * @param {Function} func - 実行する関数
 * @param {number} wait - 待機時間（ミリ秒）
 * @param {boolean} immediate - 即座実行フラグ
 * @returns {Function} デバウンス済み関数
 */
function debounce(func, wait, immediate = false) {
    let timeout;
    return function(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);
    };
}

/**
 * スロットル関数
 * @param {Function} func - 実行する関数
 * @param {number} limit - 制限時間（ミリ秒）
 * @returns {Function} スロットル済み関数
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// =============================================================================
// エラーハンドリング・ログ関数
// =============================================================================

/**
 * 統一エラーハンドリング
 * @param {Error} error - エラーオブジェクト
 * @param {string} context - エラーコンテキスト
 * @param {boolean} showToUser - ユーザーに表示するか
 */
function handleError(error, context = '', showToUser = true) {
    const errorMessage = `${context ? `[${context}] ` : ''}${error.message}`;
    console.error('❌', errorMessage, error);

    if (showToUser && typeof showErrorMessage === 'function') {
        showErrorMessage(errorMessage);
    }
}

/**
 * 統一ログ関数
 * @param {string} level - ログレベル (info, warn, error, success)
 * @param {string} message - メッセージ
 * @param {any} data - 追加データ
 */
function log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const emoji = {
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
        success: '✅',
        debug: '🔧'
    }[level] || 'ℹ️';

    const logMessage = `${emoji} [${timestamp}] ${message}`;

    switch (level) {
        case 'error':
            console.error(logMessage, data);
            break;
        case 'warn':
            console.warn(logMessage, data);
            break;
        default:
            console.log(logMessage, data);
            break;
    }
}

// =============================================================================
// DOM操作ヘルパー
// =============================================================================

/**
 * 要素の存在確認と取得
 * @param {string} selector - CSSセレクター
 * @param {Element} parent - 親要素（省略時はdocument）
 * @returns {Element|null} 見つかった要素
 */
function getElement(selector, parent = document) {
    const element = parent.querySelector(selector);
    if (!element) {
        log('warn', `要素が見つかりません: ${selector}`);
    }
    return element;
}

/**
 * 複数要素の取得
 * @param {string} selector - CSSセレクター
 * @param {Element} parent - 親要素（省略時はdocument）
 * @returns {NodeList} 見つかった要素のリスト
 */
function getElements(selector, parent = document) {
    return parent.querySelectorAll(selector);
}

/**
 * 要素の表示/非表示切り替え
 * @param {Element|string} element - 要素またはセレクター
 * @param {boolean} show - 表示するかどうか
 */
function toggleElementVisibility(element, show) {
    const el = typeof element === 'string' ? getElement(element) : element;
    if (el) {
        el.style.display = show ? '' : 'none';
    }
}

/**
 * クラスの追加・削除・切り替え
 * @param {Element|string} element - 要素またはセレクター
 * @param {string} className - クラス名
 * @param {string} action - 'add' | 'remove' | 'toggle'
 */
function manipulateClass(element, className, action) {
    const el = typeof element === 'string' ? getElement(element) : element;
    if (el) {
        el.classList[action](className);
    }
}

// =============================================================================
// データ変換・検証
// =============================================================================

/**
 * 座標の検証
 * @param {number} lat - 緯度
 * @param {number} lng - 経度
 * @returns {boolean} 有効な座標かどうか
 */
function isValidCoordinate(lat, lng) {
    return typeof lat === 'number' && typeof lng === 'number' &&
           lat >= -90 && lat <= 90 &&
           lng >= -180 && lng <= 180 &&
           lat !== 0 && lng !== 0;
}

/**
 * 文字列の安全な切り取り
 * @param {string} str - 文字列
 * @param {number} maxLength - 最大長
 * @param {string} suffix - 切り取り時の末尾文字
 * @returns {string} 切り取り済み文字列
 */
function truncateString(str, maxLength, suffix = '...') {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * HTMLエスケープ
 * @param {string} unsafe - エスケープする文字列
 * @returns {string} エスケープ済み文字列
 */
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// =============================================================================
// 非同期処理ヘルパー
// =============================================================================

/**
 * 指定時間待機
 * @param {number} ms - 待機時間（ミリ秒）
 * @returns {Promise} Promise
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * タイムアウト付きPromise
 * @param {Promise} promise - 元のPromise
 * @param {number} timeout - タイムアウト時間（ミリ秒）
 * @returns {Promise} タイムアウト付きPromise
 */
function withTimeout(promise, timeout) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('タイムアウト')), timeout)
        )
    ]);
}

/**
 * リトライ付き非同期実行
 * @param {Function} asyncFn - 非同期関数
 * @param {number} maxRetries - 最大リトライ回数
 * @param {number} delay - リトライ間隔（ミリ秒）
 * @returns {Promise} 結果
 */
async function retry(asyncFn, maxRetries = 3, delay = 1000) {
    let lastError;

    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await asyncFn();
        } catch (error) {
            lastError = error;
            if (i === maxRetries) break;

            log('warn', `リトライ ${i + 1}/${maxRetries}: ${error.message}`);
            await sleep(delay);
        }
    }

    throw lastError;
}

// =============================================================================
// パフォーマンス計測
// =============================================================================

/**
 * 実行時間計測
 * @param {Function} fn - 計測する関数
 * @param {string} label - ラベル
 * @returns {any} 関数の戻り値
 */
async function measureTime(fn, label = 'Function') {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();

    log('debug', `${label} 実行時間: ${(end - start).toFixed(2)}ms`);
    return result;
}

// =============================================================================
// ブラウザ機能検出
// =============================================================================

/**
 * ブラウザ機能の検出
 * @returns {Object} 機能サポート情報
 */
function detectBrowserFeatures() {
    return {
        touchSupport: 'ontouchstart' in window,
        geolocationSupport: 'geolocation' in navigator,
        vibrationSupport: 'vibrate' in navigator,
        localStorageSupport: (() => {
            try {
                localStorage.setItem('test', 'test');
                localStorage.removeItem('test');
                return true;
            } catch {
                return false;
            }
        })(),
        webWorkerSupport: 'Worker' in window
    };
}

// =============================================================================
// グローバル公開
// =============================================================================

// よく使う関数をグローバルに公開
window.utils = {
    debounce,
    throttle,
    handleError,
    log,
    getElement,
    getElements,
    toggleElementVisibility,
    manipulateClass,
    isValidCoordinate,
    truncateString,
    escapeHtml,
    sleep,
    withTimeout,
    retry,
    measureTime,
    detectBrowserFeatures
};

// 互換性のためのエイリアス
window.debounce = debounce;
window.handleError = handleError;