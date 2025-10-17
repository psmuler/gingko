import { getSupabaseClient } from '../supabase-client.js';

export async function generateStats() {
    const supabaseClientInstance = getSupabaseClient();
    const haikuData = await supabaseClientInstance.getHaiku();

    const totalCount = haikuData.length;
    const haikuCount = haikuData.filter(h => h.poetry_type === '俳句').length;
    const tankaCount = haikuData.filter(h => h.poetry_type === '短歌').length;

    const seasonStats = {
        '春': haikuData.filter(h => h.season === '春').length,
        '夏': haikuData.filter(h => h.season === '夏').length,
        '秋': haikuData.filter(h => h.season === '秋').length,
        '冬': haikuData.filter(h => h.season === '冬').length,
        'その他': haikuData.filter(h => !['春', '夏', '秋', '冬'].includes(h.season)).length
    };

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
                        <div class="stat-item"><span class="stat-number">${totalCount}</span><span class="stat-label">総作品数</span></div>
                        <div class="stat-item"><span class="stat-number">${haikuCount}</span><span class="stat-label">俳句</span></div>
                        <div class="stat-item"><span class="stat-number">${tankaCount}</span><span class="stat-label">短歌</span></div>
                    </div>
                </div>
                <div class="stats-section">
                    <h3>🌸 季節別分布</h3>
                    <div class="season-stats">
                        ${Object.entries(seasonStats).map(([season, count]) =>
        `<div class="season-item">
                                <span class="season-name">${season}</span>
                                <span class="season-count">${count}作品</span>
                                <div class="season-bar" style="width: ${totalCount ? (count / totalCount * 100) : 0}%"></div>
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
}
