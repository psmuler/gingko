/**
 * 俳句鑑賞＆記録アプリ - 季語自動サジェスト機能
 * Phase 2.2: 季語辞書を使った自動検出・サジェスト
 */

// =============================================================================
// グローバル変数と設定
// =============================================================================

let seasonalTermsCache = new Map();
let debounceTimer = null;
const DEBOUNCE_DELAY = 300;
const MAX_SUGGESTIONS = 3;

// 季語検出の最小文字数
const MIN_DETECTION_LENGTH = 2;

// 季節と色のマッピング
const SEASON_COLORS = {
    '春': { class: 'spring', color: '#3498db', name: '春' },
    '夏': { class: 'summer', color: '#e74c3c', name: '夏' },
    '秋': { class: 'autumn', color: '#ffffff', name: '秋' },
    '冬': { class: 'winter', color: '#2c3e50', name: '冬' },
    '暮・新年': { class: 'newyear', color: '#f1c40f', name: '暮・新年' },
    'その他': { class: 'other', color: '#95a5a6', name: 'その他' }
};

// =============================================================================
// 季語サジェストシステム初期化
// =============================================================================

/**
 * 季語サジェストシステムの初期化
 */
function initializeSeasonalSuggest() {
    setupInputListeners();
    console.log('✅ 季語サジェストシステム初期化完了');
}

/**
 * 入力フィールドのイベントリスナー設定
 */
function setupInputListeners() {
    // インラインフォームの俳句入力フィールド
    const inlineHaikuInput = document.getElementById('inline-haiku-text');
    if (inlineHaikuInput) {
        inlineHaikuInput.addEventListener('input', handleHaikuInput);
        inlineHaikuInput.addEventListener('focus', handleHaikuFocus);
    }

    // 詳細フォームの俳句入力フィールド
    const detailHaikuInput = document.getElementById('haiku-text');
    if (detailHaikuInput) {
        detailHaikuInput.addEventListener('input', handleHaikuInput);
        detailHaikuInput.addEventListener('focus', handleHaikuFocus);
    }
}

/**
 * 俳句入力処理（デバウンス付き）
 * @param {Event} event - inputイベント
 */
function handleHaikuInput(event) {
    clearTimeout(debounceTimer);

    const inputText = event.target.value.trim();
    const containerId = event.target.id === 'inline-haiku-text'
        ? 'season-suggest-container'
        : 'detail-season-suggest-container';

    debounceTimer = setTimeout(() => {
        detectAndSuggestSeasons(inputText, containerId);
    }, DEBOUNCE_DELAY);
}

/**
 * 俳句入力フォーカス処理
 * @param {Event} event - focusイベント
 */
function handleHaikuFocus(event) {
    const inputText = event.target.value.trim();
    if (inputText.length >= MIN_DETECTION_LENGTH) {
        const containerId = event.target.id === 'inline-haiku-text'
            ? 'season-suggest-container'
            : 'detail-season-suggest-container';

        detectAndSuggestSeasons(inputText, containerId);
    }
}

// =============================================================================
// 季語検出・サジェスト機能
// =============================================================================

/**
 * 季語検出とサジェスト表示のメイン関数
 * @param {string} inputText - 入力された俳句テキスト
 * @param {string} containerId - サジェスト表示コンテナのID
 */
async function detectAndSuggestSeasons(inputText, containerId) {
    if (!inputText || inputText.length < MIN_DETECTION_LENGTH) {
        clearSeasonSuggestions(containerId);
        return;
    }

    try {
        const detectedTerms = await detectSeasonalTerms(inputText);
        displaySeasonSuggestions(detectedTerms, containerId);
    } catch (error) {
        console.error('❌ 季語検出エラー:', error);
        clearSeasonSuggestions(containerId);
    }
}

/**
 * 季語検出メイン関数
 * @param {string} haikuText - 俳句テキスト
 * @returns {Array} 検出された季語配列
 */
async function detectSeasonalTerms(haikuText) {
    // キャッシュチェック
    const cacheKey = haikuText.toLowerCase();
    if (seasonalTermsCache.has(cacheKey)) {
        return seasonalTermsCache.get(cacheKey);
    }

    try {
        // Supabaseから季語検索
        const supabase = getSupabaseClient();
        await supabase.ensureInitialized();

        const { data, error } = await supabase.supabase
            .from('keywords')
            .select('term, season, category')
            .or(buildSearchQuery(haikuText))
            .order('term', { ascending: false }) // 長い季語を優先
            .limit(MAX_SUGGESTIONS * 2); // 多めに取得してフィルタリング

        if (error) throw error;

        // 検出結果の処理
        const detectedTerms = processDetectedTerms(data || [], haikuText);

        // キャッシュに保存
        seasonalTermsCache.set(cacheKey, detectedTerms);

        console.log(`🌸 季語検出結果: "${haikuText}" -> ${detectedTerms.length}件`);
        return detectedTerms;

    } catch (error) {
        console.error('❌ 季語検出APIエラー:', error);
        return [];
    }
}

/**
 * 検索クエリの構築
 * @param {string} text - 検索テキスト
 * @returns {string} PostgreSQL OR クエリ
 */
function buildSearchQuery(text) {
    // テキスト中の文字を2文字以上の部分文字列に分割
    const substrings = [];

    for (let i = 0; i < text.length - 1; i++) {
        for (let j = i + 2; j <= Math.min(i + 6, text.length); j++) {
            const substr = text.substring(i, j);
            if (substr.match(/^[ぁ-んァ-ヶ一-龯]+$/)) { // 日本語文字のみ
                substrings.push(`term.ilike.%${substr}%`);
            }
        }
    }

    return substrings.slice(0, 10).join(','); // 最大10個の条件
}

/**
 * 検出された季語の処理
 * @param {Array} rawTerms - API返却データ
 * @param {string} originalText - 元のテキスト
 * @returns {Array} 処理済み季語配列
 */
function processDetectedTerms(rawTerms, originalText) {
    const found = [];
    const seasonCount = {};

    for (const term of rawTerms) {
        // テキスト中に実際に含まれているかチェック
        const position = originalText.indexOf(term.term);
        if (position === -1) continue;

        found.push({
            term: term.term,
            season: term.season,
            category: term.category,
            position: position,
            length: term.term.length
        });

        // 季節カウント
        seasonCount[term.season] = (seasonCount[term.season] || 0) + 1;
    }

    // 長さと位置で並び替え（長い季語、早い位置を優先）
    found.sort((a, b) => {
        if (a.length !== b.length) return b.length - a.length;
        return a.position - b.position;
    });

    // 重複する季語を除去（位置が重なる場合は長い方を優先）
    const uniqueTerms = [];
    const usedPositions = new Set();

    for (const term of found) {
        let overlap = false;
        for (let i = term.position; i < term.position + term.length; i++) {
            if (usedPositions.has(i)) {
                overlap = true;
                break;
            }
        }

        if (!overlap) {
            uniqueTerms.push(term);
            for (let i = term.position; i < term.position + term.length; i++) {
                usedPositions.add(i);
            }

            if (uniqueTerms.length >= MAX_SUGGESTIONS) break;
        }
    }

    return uniqueTerms;
}

// =============================================================================
// サジェストUI管理
// =============================================================================

/**
 * 季語サジェスト表示
 * @param {Array} detectedTerms - 検出された季語配列
 * @param {string} containerId - 表示コンテナID
 */
function displaySeasonSuggestions(detectedTerms, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // コンテナクリア
    container.innerHTML = '';

    if (detectedTerms.length === 0) {
        return;
    }

    // サジェストボタン作成
    detectedTerms.forEach(term => {
        const seasonInfo = SEASON_COLORS[term.season] || SEASON_COLORS['その他'];
        const button = createSeasonButton(term, seasonInfo);
        container.appendChild(button);
    });

    // アニメーション効果
    container.style.opacity = '0';
    container.style.transform = 'translateY(-10px)';
    setTimeout(() => {
        container.style.transition = 'all 0.3s ease';
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
    }, 50);
}

/**
 * 季節ボタンの作成
 * @param {Object} term - 季語オブジェクト
 * @param {Object} seasonInfo - 季節情報
 * @returns {HTMLElement} ボタン要素
 */
function createSeasonButton(term, seasonInfo) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `season-btn ${seasonInfo.class}`;
    button.textContent = `${term.term} (${seasonInfo.name})`;

    // ボタンクリックイベント
    button.addEventListener('click', () => {
        handleSeasonButtonClick(term, seasonInfo);
    });

    // ホバー効果
    button.addEventListener('mouseenter', () => {
        button.style.transform = 'translateY(-2px)';
    });

    button.addEventListener('mouseleave', () => {
        button.style.transform = 'translateY(0)';
    });

    return button;
}

/**
 * 季節ボタンクリック処理
 * @param {Object} term - 季語オブジェクト
 * @param {Object} seasonInfo - 季節情報
 */
function handleSeasonButtonClick(term, seasonInfo) {
    // 現在のフォームを特定
    const activeForm = document.querySelector('.inline-form.active')
        ? 'inline'
        : 'detail';

    // 該当する季節・季語フィールドに自動入力
    if (activeForm === 'inline') {
        const seasonSelect = document.getElementById('inline-season');
        const seasonalTermField = document.querySelector('#inline-seasonal-term');

        if (seasonSelect) {
            seasonSelect.value = term.season;
            seasonSelect.dispatchEvent(new Event('change'));
        }

        // 季語フィールドがある場合は設定
        if (seasonalTermField) {
            seasonalTermField.value = term.term;
        }
    } else {
        // 詳細フォームの処理（必要に応じて実装）
        const seasonSelect = document.querySelector('select[name="season"]');
        if (seasonSelect) {
            seasonSelect.value = term.season;
            seasonSelect.dispatchEvent(new Event('change'));
        }
    }

    // ボタンフィードバック
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = '✓ 設定完了';
    button.style.background = '#28a745';

    setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '';
    }, 1500);

    // ログ出力
    console.log(`🌸 季語選択: ${term.term} (${term.season})`);

    // 成功フィードバック
    showSuccessMessage(`季語「${term.term}」を設定しました`);
}

/**
 * サジェストクリア
 * @param {string} containerId - コンテナID
 */
function clearSeasonSuggestions(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = '';
    }
}

// =============================================================================
// ユーティリティ関数
// =============================================================================

/**
 * 季語キャッシュのクリア
 */
function clearSeasonalTermsCache() {
    seasonalTermsCache.clear();
    console.log('🧹 季語キャッシュをクリアしました');
}

/**
 * 季語検出統計の取得
 * @returns {Object} 統計情報
 */
function getSeasonDetectionStats() {
    return {
        cacheSize: seasonalTermsCache.size,
        totalDetections: Array.from(seasonalTermsCache.values())
            .reduce((sum, terms) => sum + terms.length, 0)
    };
}

// =============================================================================
// 初期化・イベント設定
// =============================================================================

// DOM読み込み完了後に初期化
document.addEventListener('DOMContentLoaded', () => {
    // 少し遅延して初期化（他のコンポーネントの後）
    setTimeout(initializeSeasonalSuggest, 500);
});

// ページ離脱時にキャッシュクリア
window.addEventListener('beforeunload', clearSeasonalTermsCache);