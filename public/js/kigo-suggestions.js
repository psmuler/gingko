/**
 * 季語自動サジェスト機能
 * リアルタイムで俳句から季語を検出してサジェストボタンを表示
 */

import { getSupabaseClient } from './supabase-client.js';

// =============================================================================
// グローバル変数とキャッシュ
// =============================================================================

let kigoDatabase = []; // インメモリ季語データベース
let kigoCache = new Map(); // 高速検索キャッシュ
let kigoCacheLastUpdated = 0;
const KIGO_CACHE_REFRESH_INTERVAL = 300000; // 5分間キャッシュを保持
let isKigoDatabaseInitialized = false;
let selectedKigoState = {
    selectedKigo: null,
    season: null,
    isSeasonless: false,
    keywordId: null  // 季語IDを追加
};

// デバウンス用変数
let kigoSuggestionDebounceTimeout = null;
const KIGO_DEBOUNCE_DELAY = 100; // 100ms

// パフォーマンス設定
const PERFORMANCE_CONFIG = {
    MIN_TEXT_LENGTH: 5,           // 最小文字数（5文字以上で検索開始）
    MAX_HAIKU_LENGTH: 19,         // 俳句最大文字数（20文字以上は無効）
    MAX_SUGGESTIONS: 5,           // 最大サジェスト数
    MATCH_TIMEOUT: 50            // マッチング処理タイムアウト（ms）
};

// =============================================================================
// 季語データベース初期化
// =============================================================================

/**
 * 季語データベースの初期化
 */
async function initializeKigoDatabase() {
    if (isKigoDatabaseInitialized &&
        Date.now() - kigoCacheLastUpdated < KIGO_CACHE_REFRESH_INTERVAL) {
        console.log('🔧 季語データベースは既に初期化済み（キャッシュ有効）');
        return true;
    }

    try {
        console.log('🚀 季語データベース初期化開始...');
        const startTime = Date.now();

        // Supabaseクライアントの取得と季語データの取得
        const supabaseClientInstance = getSupabaseClient();
        await supabaseClientInstance.ensureInitialized();

        // 季語データを取得
        const data = await supabaseClientInstance.getKeywords();

        if (!data || data.length === 0) {
            throw new Error('季語データが見つかりません');
        }

        // データ変換とキャッシュ構築
        kigoDatabase = data.map(item => ({
            id: item.id,  // 季語IDを追加
            display_name: item.display_name,
            display_name_alternatives: Array.isArray(item.display_name_alternatives)
                ? item.display_name_alternatives
                : [],
            season: item.season || 'その他',
            description: item.description || ''
        }));

        // 高速検索用キャッシュを構築
        buildKigoSearchCache();

        const loadTime = Date.now() - startTime;
        kigoCacheLastUpdated = Date.now();
        isKigoDatabaseInitialized = true;

        console.log(`✅ 季語データベース初期化完了: ${kigoDatabase.length}件（${loadTime}ms）`);
        return true;

    } catch (error) {
        console.error('❌ 季語データベース初期化エラー:', error);
        handleKigoError(error);
        return false;
    }
}

/**
 * 高速検索用キャッシュの構築
 */
function buildKigoSearchCache() {
    kigoCache.clear();

    kigoDatabase.forEach(kigo => {
        // 表示名でのキャッシュ
        const displayName = kigo.display_name;
        if (!kigoCache.has(displayName)) {
            kigoCache.set(displayName, []);
        }
        kigoCache.get(displayName).push(kigo);

        // 代替表記でのキャッシュ
        kigo.display_name_alternatives.forEach(alt => {
            if (alt && alt.trim()) {
                if (!kigoCache.has(alt)) {
                    kigoCache.set(alt, []);
                }
                kigoCache.get(alt).push(kigo);
            }
        });
    });

    console.log(`🔧 高速検索キャッシュ構築完了: ${kigoCache.size}エントリ`);

    // デバッグ: 冬木立がキャッシュに含まれているかチェック
    if (kigoCache.has('冬木立')) {
        console.log('🔍 冬木立がキャッシュに見つかりました:', kigoCache.get('冬木立'));
    } else {
        console.log('❌ 冬木立がキャッシュに見つかりません');
    }
}

// =============================================================================
// 季語マッチングエンジン
// =============================================================================

/**
 * 俳句テキストから季語を抽出（高速版）
 * @param {string} haikuText - 俳句テキスト
 * @returns {Array} マッチした季語配列
 */
function extractKigo(haikuText) {
    if (!haikuText || typeof haikuText !== 'string') return [];

    const text = haikuText.trim();

    // 文字数制限チェック
    if (text.length < PERFORMANCE_CONFIG.MIN_TEXT_LENGTH) return [];
    if (text.length > PERFORMANCE_CONFIG.MAX_HAIKU_LENGTH) return [];

    const startTime = Date.now();
    const matches = new Map(); // 重複排除用

    try {
        // デバッグ: 入力テキストをログ出力
        console.log(`🔍 季語マッチング開始: "${text}"`);

        // キャッシュを使用した高速マッチング
        for (const [term, kigos] of kigoCache.entries()) {
            if (text.includes(term)) {
                // デバッグ: マッチした場合のログ
                console.log(`✅ マッチ発見: "${term}" in "${text}"`);
                kigos.forEach(kigo => {
                    const key = `${kigo.display_name}-${kigo.season}`;
                    if (!matches.has(key)) {
                        matches.set(key, {
                            kigo: kigo,
                            matchedText: term,
                            startPos: text.indexOf(term),
                            length: term.length,
                            priority: term.length // 長いマッチを優先
                        });
                    }
                });
            }

            // デバッグ: 冬木立の場合の詳細チェック
            if (term === '冬木立') {
                console.log(`🔍 冬木立チェック: "${term}" in "${text}" = ${text.includes(term)}`);
            }

            // タイムアウト制御
            if (Date.now() - startTime > PERFORMANCE_CONFIG.MATCH_TIMEOUT) {
                console.warn(`⏱️ 季語マッチング処理がタイムアウト（${PERFORMANCE_CONFIG.MATCH_TIMEOUT}ms）`);
                break;
            }
        }

        // 結果をソートして返す（最長マッチ優先）
        const result = Array.from(matches.values())
            .sort((a, b) => b.priority - a.priority)
            .slice(0, PERFORMANCE_CONFIG.MAX_SUGGESTIONS);

        const processingTime = Date.now() - startTime;
        console.log(`🔍 季語抽出完了: ${result.length}件（${processingTime}ms）`);

        return result;

    } catch (error) {
        console.error('❌ 季語抽出エラー:', error);
        return [];
    }
}

/**
 * 俳句の文字数による処理可否判定
 * @param {string} haikuText - 俳句テキスト
 * @returns {Object} 判定結果
 */
function validateHaikuForKigo(haikuText) {
    const text = (haikuText || '').trim();
    const length = text.length;

    if (length < PERFORMANCE_CONFIG.MIN_TEXT_LENGTH) {
        return {
            isValid: false,
            reason: 'too_short',
            message: '' // UIには表示しない（内部処理のみ）
        };
    }

    if (length > PERFORMANCE_CONFIG.MAX_HAIKU_LENGTH) {
        return {
            isValid: false,
            reason: 'too_long',
            message: '俳句は19文字以下で入力してください'
        };
    }

    return {
        isValid: true,
        reason: 'valid',
        message: '季語検索可能'
    };
}

// =============================================================================
// UI レンダリング
// =============================================================================

/**
 * 季語サジェストボタンのレンダリング
 * @param {Array} matches - マッチした季語配列
 * @param {string} containerId - レンダリング先のコンテナID
 */
function renderKigoSuggestions(matches, containerId = 'kigo-suggestions') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`❌ 季語サジェストコンテナが見つかりません: ${containerId}`);
        return;
    }

    // コンテナをクリア
    container.innerHTML = '';
    container.className = 'kigo-suggestions';

    // マッチした季語ボタンを作成
    matches.forEach(match => {
        const button = createKigoButton(match.kigo, match.matchedText);
        container.appendChild(button);
    });

    // 「季なし」ボタンを常に追加
    const seasonlessButton = createSeasonlessButton();
    container.appendChild(seasonlessButton);

    // コンテナの表示状態を更新
    if (matches.length > 0) {
        container.classList.add('has-suggestions');
        console.log(`✅ 季語サジェスト表示: ${matches.length}件`);
    } else {
        container.classList.add('no-suggestions');
    }
}

/**
 * 季語ボタンの作成
 * @param {Object} kigo - 季語データ
 * @param {string} matchedText - マッチしたテキスト
 * @returns {HTMLElement} ボタン要素
 */
function createKigoButton(kigo, matchedText) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'kigo-suggestion';
    button.textContent = `${kigo.display_name}-${kigo.season}`;

    // 季節に応じたCSSカスタムプロパティを設定
    const seasonColor = getSeasonColor(kigo.season);
    button.style.setProperty('--season-color', seasonColor);
    button.dataset.season = kigo.season;
    button.dataset.kigoName = kigo.display_name;
    button.dataset.keywordId = kigo.id;  // 季語IDを追加
    button.dataset.matchedText = matchedText;

    // クリックイベント
    button.addEventListener('click', () => {
        selectKigo(kigo, button);
    });

    return button;
}

/**
 * 「季なし」ボタンの作成
 * @returns {HTMLElement} ボタン要素
 */
function createSeasonlessButton() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'kigo-suggestion seasonless';
    button.textContent = '季なし';

    // デフォルト色を設定
    const defaultColor = getSeasonColor('その他');
    button.style.setProperty('--season-color', defaultColor);
    button.dataset.season = '';
    button.dataset.kigoName = '';

    // クリックイベント
    button.addEventListener('click', () => {
        selectSeasonless(button);
    });

    return button;
}

/**
 * 季節に応じた色を取得
 * @param {string} season - 季節
 * @returns {string} カラーコード
 */
function getSeasonColor(season) {
    const seasonColors = {
        '春': '#3498db',     // 青
        '夏': '#e74c3c',     // 赤
        '秋': '#ffffff',     // 白
        '冬': '#2c3e50',     // 黒
        '暮・新年': '#f1c40f', // 黄
        'その他': '#95a5a6'   // グレー
    };

    return seasonColors[season] || seasonColors['その他'];
}

// =============================================================================
// 季語選択処理
// =============================================================================

/**
 * 季語選択処理
 * @param {Object} kigo - 選択された季語
 * @param {HTMLElement} buttonElement - クリックされたボタン要素
 */
function selectKigo(kigo, buttonElement) {
    // 既存の選択状態をクリア
    clearKigoSelection();

    // 新しい選択状態を設定
    selectedKigoState = {
        selectedKigo: kigo,
        season: kigo.season,
        isSeasonless: false,
        keywordId: kigo.id  // 季語IDを設定
    };

    // ボタンの選択状態を更新
    buttonElement.classList.add('selected');

    // フォームの季節フィールドを更新
    updateSeasonFields(kigo.season, kigo.display_name, kigo.id);

    console.log(`🎯 季語選択: ${kigo.display_name} (${kigo.season})`);

    // カスタムイベントを発火（他の機能との連携用）
    dispatchKigoSelectionEvent('kigo-selected', {
        kigo: kigo,
        season: kigo.season,
        isSeasonless: false
    });
}

/**
 * 「季なし」選択処理（トグル対応）
 * @param {HTMLElement} buttonElement - クリックされたボタン要素
 */
function selectSeasonless(buttonElement) {
    // 既に選択されている場合はトグル（解除）
    if (buttonElement.classList.contains('selected')) {
        console.log('🎯 季なし選択解除');

        // 選択を解除
        buttonElement.classList.remove('selected');

        // 選択状態をリセット
        selectedKigoState = {
            selectedKigo: null,
            season: null,
            isSeasonless: false,
            keywordId: null
        };

        // フォームの季節フィールドをクリア
        updateSeasonFields(null, '', null);

        // カスタムイベントを発火
        dispatchKigoSelectionEvent('kigo-deselected', {
            kigo: null,
            season: null,
            isSeasonless: false
        });
        return;
    }

    // 他の選択状態をクリア
    clearKigoSelection();

    // 新しい選択状態を設定
    selectedKigoState = {
        selectedKigo: null,
        season: null,
        isSeasonless: true,
        keywordId: null
    };

    // ボタンの選択状態を更新
    buttonElement.classList.add('selected');

    // フォームの季節フィールドをクリア
    updateSeasonFields(null, '', null);

    console.log('🎯 季なし選択');

    // カスタムイベントを発火
    dispatchKigoSelectionEvent('kigo-selected', {
        kigo: null,
        season: null,
        isSeasonless: true
    });
}

/**
 * 季語選択状態のクリア
 */
function clearKigoSelection() {
    // 全ての選択ボタンから選択クラスを削除
    document.querySelectorAll('.kigo-suggestion.selected').forEach(btn => {
        btn.classList.remove('selected');
    });

    // 選択状態をリセット
    selectedKigoState = {
        selectedKigo: null,
        season: null,
        isSeasonless: false,
        keywordId: null  // 季語IDもリセット
    };
}

/**
 * フォームの季節関連フィールドを更新
 * @param {string|null} season - 季節
 * @param {string} kigoName - 季語名
 * @param {number|null} keywordId - 季語ID
 */
function updateSeasonFields(season, kigoName, keywordId = null) {
    // 季節フィールドの更新
    const seasonField = document.querySelector('#inline-season, [name="season"]');
    if (seasonField) {
        seasonField.value = season || '';
    }

    // 季語フィールドの更新
    const seasonalTermField = document.querySelector('#inline-seasonal-term, [name="seasonal_term"]');
    if (seasonalTermField) {
        seasonalTermField.value = kigoName || '';
    }

    // 季語IDフィールドの更新（新規追加）
    const keywordIdField = document.querySelector('#inline-keyword-id, [name="keyword_id"]');
    if (keywordIdField) {
        keywordIdField.value = keywordId || '';
    }

    // 隠しフィールドも更新（もしあれば）
    const hiddenSeasonField = document.querySelector('input[type="hidden"][name="season"]');
    if (hiddenSeasonField) {
        hiddenSeasonField.value = season || '';
    }

    const hiddenKeywordIdField = document.querySelector('input[type="hidden"][name="keyword_id"]');
    if (hiddenKeywordIdField) {
        hiddenKeywordIdField.value = keywordId || '';
    }
}

/**
 * 季語選択イベントの発火
 * @param {string} eventType - イベントタイプ
 * @param {Object} detail - イベント詳細
 */
function dispatchKigoSelectionEvent(eventType, detail) {
    const event = new CustomEvent(eventType, {
        detail: detail,
        bubbles: true,
        cancelable: true
    });

    document.dispatchEvent(event);
}

// =============================================================================
// リアルタイム処理
// =============================================================================

/**
 * 俳句入力フィールドにリアルタイムサジェスト機能をアタッチ
 * @param {string} inputId - 入力フィールドのID
 * @param {string} containerId - サジェストコンテナのID
 */
function attachKigoSuggestionToInput(inputId, containerId = 'kigo-suggestions') {
    const inputField = document.getElementById(inputId);
    if (!inputField) {
        console.error(`❌ 入力フィールドが見つかりません: ${inputId}`);
        return false;
    }

    // デバウンス付きイベントリスナーを追加
    inputField.addEventListener('input', (e) => {
        handleHaikuInputChange(e.target.value, containerId);
    });

    // フォーカス時の処理
    inputField.addEventListener('focus', () => {
        if (inputField.value.trim()) {
            handleHaikuInputChange(inputField.value, containerId);
        }
    });

    console.log(`✅ 季語サジェスト機能をアタッチ: ${inputId} → ${containerId}`);
    return true;
}

/**
 * 俳句入力変更時のハンドラー（デバウンス対応）
 * @param {string} haikuText - 入力された俳句テキスト
 * @param {string} containerId - サジェストコンテナのID
 */
function handleHaikuInputChange(haikuText, containerId) {
    // 既存のデバウンスタイムアウトをクリア
    if (kigoSuggestionDebounceTimeout) {
        clearTimeout(kigoSuggestionDebounceTimeout);
    }

    // デバウンス処理
    kigoSuggestionDebounceTimeout = setTimeout(async () => {
        await processHaikuForKigo(haikuText, containerId);
    }, KIGO_DEBOUNCE_DELAY);
}

/**
 * 俳句テキストの季語処理
 * @param {string} haikuText - 俳句テキスト
 * @param {string} containerId - サジェストコンテナのID
 */
async function processHaikuForKigo(haikuText, containerId) {
    try {
        // 入力検証
        const validation = validateHaikuForKigo(haikuText);

        if (!validation.isValid) {
            // 無効な入力の場合はサジェストをクリア
            renderEmptyKigoSuggestions(containerId, validation.message);
            return;
        }

        // 季語データベースの初期化確認
        if (!isKigoDatabaseInitialized) {
            const initialized = await initializeKigoDatabase();
            if (!initialized) {
                renderEmptyKigoSuggestions(containerId, '季語サジェスト機能の読み込みに失敗しました');
                return;
            }
        }

        // 季語抽出
        const matches = extractKigo(haikuText);

        // サジェスト表示
        renderKigoSuggestions(matches, containerId);

    } catch (error) {
        console.error('❌ 俳句季語処理エラー:', error);
        renderEmptyKigoSuggestions(containerId, '季語サジェスト機能の読み込みに失敗しました');
    }
}

/**
 * 空のサジェスト表示
 * @param {string} containerId - コンテナID
 * @param {string} message - メッセージ
 */
function renderEmptyKigoSuggestions(containerId, message = '') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    container.className = 'kigo-suggestions empty error';

    // エラーメッセージを表示（メッセージが空の場合は表示しない）
    if (message && message.trim()) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'kigo-error-message';
        messageDiv.textContent = message;
        container.appendChild(messageDiv);
    }

    // 季なしボタンは常に表示（エラー時でも投稿可能にする）
    const seasonlessButton = createSeasonlessButton();
    container.appendChild(seasonlessButton);
}

// =============================================================================
// エラーハンドリング
// =============================================================================

/**
 * 季語関連エラーの処理
 * @param {Error} error - エラーオブジェクト
 */
function handleKigoError(error) {
    console.error('❌ 季語処理エラー:', error);

    // 統一エラーメッセージ
    const userMessage = '季語サジェスト機能の読み込みに失敗しました';

    // ポップアップメッセージは表示しない（ユーザーリクエストによる）
    console.warn(`🔔 ユーザー向けメッセージ: ${userMessage}`);

    // フォールバック: 手動入力のみ有効化
    const manualSection = document.getElementById('manual-kigo-section');
    const autoSection = document.getElementById('auto-kigo-section');

    if (manualSection) manualSection.style.display = 'block';
    if (autoSection) autoSection.style.display = 'none';

    // 季語サジェストコンテナにエラーメッセージを表示
    const kigoContainer = document.getElementById('kigo-suggestions');
    if (kigoContainer) {
        renderEmptyKigoSuggestions('kigo-suggestions', userMessage);
    }
}

// =============================================================================
// 外部API・ユーティリティ関数
// =============================================================================

/**
 * 現在の季語選択状態を取得
 * @returns {Object} 選択状態オブジェクト
 */
function getCurrentKigoSelection() {
    return { ...selectedKigoState };
}

/**
 * 季語選択状態をリセット
 */
function resetKigoSelection() {
    clearKigoSelection();
}

/**
 * 季語データベースの統計情報を取得
 * @returns {Object} 統計情報
 */
function getKigoDatabaseStats() {
    if (!isKigoDatabaseInitialized) {
        return { initialized: false };
    }

    const seasonStats = {};
    kigoDatabase.forEach(kigo => {
        const season = kigo.season || 'その他';
        seasonStats[season] = (seasonStats[season] || 0) + 1;
    });

    return {
        initialized: true,
        totalKigo: kigoDatabase.length,
        cacheSize: kigoCache.size,
        lastUpdated: new Date(kigoCacheLastUpdated),
        seasonBreakdown: seasonStats
    };
}

// =============================================================================
// 初期化とイベントリスナー
// =============================================================================

/**
 * 季語サジェスト機能の初期化
 */
async function initializeKigoSuggestions() {
    console.log('🚀 季語サジェスト機能初期化開始');

    try {
        // Supabaseクライアントの初期化完了を待機
        if (typeof getSupabaseClient === 'undefined') {
            throw new Error('getSupabaseClient関数が見つかりません');
        }

        const supabaseClientInstance = getSupabaseClient();
        if (!supabaseClientInstance) {
            console.warn('⚠️ Supabaseクライアントが見つかりません。初期化を待機します...');

            // 最大10秒間待機
            let attempts = 0;
            while (!supabaseClientInstance && attempts < 100) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
                if (getSupabaseClient()) break;
            }

            if (!supabaseClientInstance) {
                throw new Error('Supabaseクライアントの初期化がタイムアウトしました');
            }
        }

        // Supabaseクライアントの準備完了を確認
        await supabaseClientInstance.ensureInitialized();

        // 季語データベース初期化
        await initializeKigoDatabase();

        console.log('✅ 季語サジェスト機能初期化完了');
        return true;

    } catch (error) {
        console.error('❌ 季語サジェスト機能初期化エラー:', error);
        handleKigoError(error);
        return false;
    }
}

// AppManagerが初期化を管理するため、自動初期化は削除
// AppManagerの initializeKigoSuggestions() から呼び出される

// =============================================================================
// デバッグ用関数（グローバル公開）
// =============================================================================

// デバッグ用のテスト関数をグローバルに公開
window.testKigoMatching = function (testText) {
    console.log(`\n🔍 季語マッチングテスト: "${testText}"`);
    console.log('データベース初期化状態:', isKigoDatabaseInitialized);
    console.log('データベースサイズ:', kigoDatabase.length);
    console.log('キャッシュサイズ:', kigoCache.size);

    const matches = extractKigo(testText);
    console.log('マッチ結果:', matches);

    return matches;
};

window.checkKigoInDatabase = function (kigoName) {
    const found = kigoDatabase.find(item => item.display_name === kigoName);
    console.log(`"${kigoName}" の検索結果:`, found);
    return found;
};

window.checkKigoInCache = function (kigoName) {
    const found = kigoCache.get(kigoName);
    console.log(`"${kigoName}" のキャッシュ結果:`, found);
    return found;
};

// ES Module exports
export {
    initializeKigoSuggestions,
    extractKigo,
    attachKigoSuggestionToInput,
    getCurrentKigoSelection,
    resetKigoSelection,
    getKigoDatabaseStats
};

// CommonJSエクスポート（後方互換性）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeKigoSuggestions,
        extractKigo,
        attachKigoSuggestionToInput,
        getCurrentKigoSelection,
        resetKigoSelection,
        getKigoDatabaseStats
    };
}