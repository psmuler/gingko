import { showModal, closeModal } from './modal.js';
import { generateStats } from '../data/stats.js';

function getMenuElements() {
    return {
        menu: document.getElementById('nav-menu'),
        toggle: document.getElementById('menu-toggle')
    };
}

export function toggleMenu() {
    const { menu, toggle } = getMenuElements();
    if (!menu || !toggle) return;

    menu.classList.toggle('active');
    toggle.classList.toggle('active');

    if (menu.classList.contains('active')) {
        document.addEventListener('keydown', handleMenuEscKey);
        document.addEventListener('click', handleMenuOutsideClick);
    } else {
        document.removeEventListener('keydown', handleMenuEscKey);
        document.removeEventListener('click', handleMenuOutsideClick);
    }
}

export function closeMenu() {
    const { menu, toggle } = getMenuElements();
    if (!menu || !toggle) return;

    menu.classList.remove('active');
    toggle.classList.remove('active');
    document.removeEventListener('keydown', handleMenuEscKey);
    document.removeEventListener('click', handleMenuOutsideClick);
}

function handleMenuEscKey(event) {
    if (event.key === 'Escape') {
        closeMenu();
    }
}

function handleMenuOutsideClick(event) {
    const { menu, toggle } = getMenuElements();
    if (!menu || !toggle) return;

    if (!menu.contains(event.target) && !toggle.contains(event.target)) {
        closeMenu();
    }
}

export async function showAbout() {
    closeMenu();

    try {
        const response = await fetch('./about.html', {
            method: 'GET',
            cache: 'no-cache',
            headers: { 'Content-Type': 'text/html' }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const aboutContent = await response.text();
        showModal(aboutContent);
    } catch (error) {
        console.error('About画面の読み込みエラー:', error);
        showModal(`
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
                    <button onclick="closeModal()" class="primary-btn">閉じる</button>
                </div>
            </div>
        `);
    }
}

export async function showFavLinks() {
    closeMenu();

    try {
        const response = await fetch('./fav_links.html', {
            method: 'GET',
            cache: 'no-cache',
            headers: { 'Content-Type': 'text/html' }
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

export function closeAbout() {
    closeModal();
}

export function closeFavLinks() {
    closeModal();
}

export function runKigoTest() {
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

function generateTestResultsHTML(results) {
    if (!results) {
        return '<div class="error-message">テスト結果がありません。</div>';
    }

    const accuracy = (results.exactMatch / results.total * 100).toFixed(1);
    const detection = (results.detected / results.total * 100).toFixed(1);

    return `
        <div class="test-results-container">
            <h2>🧪 季語抽出テスト結果</h2>
            <div class="test-summary">
                <div class="result-item"><span class="result-number">${accuracy}%</span><span class="result-label">精度</span></div>
                <div class="result-item"><span class="result-number">${detection}%</span><span class="result-label">検出率</span></div>
                <div class="result-item"><span class="result-number">${results.total}</span><span class="result-label">テスト句数</span></div>
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

export async function showStats() {
    closeMenu();

    try {
        const statsContent = await generateStats();
        showModal(statsContent);
    } catch (error) {
        console.error('統計データ取得エラー:', error);
        showModal('<div class="error-message">統計データの取得に失敗しました。</div>');
    }
}
