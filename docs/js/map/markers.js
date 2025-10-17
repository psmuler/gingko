import { MAP_CONFIG, UI_CONFIG } from '../config.js';
import { apiAdapter } from '../api-adapter.js';
import { getSupabaseClient } from '../supabase-client.js';
import { appState } from '../core/app-state.js';
import { showInfoMessage, showErrorMessage, showLoadingState, hideLoadingState } from '../ui/messages.js';

export async function loadHaikuData() {
    if (!appState.markersLayer) {
        throw new Error('Marker layer is not initialised');
    }

    try {
        console.log('俳句データの読み込みを開始...');

        const isConnected = await apiAdapter.testConnection();
        if (!isConnected) {
            throw new Error('APIサーバーに接続できません');
        }

        const haikuData = await apiAdapter.getHaikusForMap();
        console.log(`${haikuData.length}件の俳句データを取得しました`);

        appState.markersLayer.clearLayers();
        for (const haiku of haikuData) {
            await addHaikuMarkerFromAPI(haiku);
        }

        setTimeout(() => {
            const totalMarkers = appState.markersLayer.getLayers().length;
            const currentZoom = appState.map?.getZoom();
            console.log(`📊 マーカー統計:`);
            console.log(`  - 総マーカー数: ${totalMarkers}`);
            console.log(`  - 現在のズームレベル: ${currentZoom}`);
            console.log(`  - クラスタリング: 常時有効`);
        }, 100);

        if (haikuData.length === 0) {
            showInfoMessage('俳句データが見つかりませんでした');
        }
    } catch (error) {
        console.error('俳句データの読み込みに失敗:', error);
        throw error;
    }
}

async function addHaikuMarkerFromAPI(haikuData) {
    const { id, latitude, longitude, location_name, haiku_text, poet_name, location_type, description, season, poetry_type, status } = haikuData;

    if (!latitude || !longitude || latitude === 0 || longitude === 0) {
        console.warn('無効な座標データ:', haikuData);
        return;
    }

    const isDraft = status === 'draft';
    const isTanka = poetry_type === '短歌';
    const hasUtamakuraFlag = isTanka ? await hasUtamakura(haiku_text) : false;

    let iconHtml;
    let iconSize;
    let iconAnchor;
    let markerClassName;

    if (isTanka && hasUtamakuraFlag) {
        const draftClass = isDraft ? 'draft' : '';
        iconHtml = `
            <div class="existing-pin pin-appear ${draftClass}">
                <div class="pin-mountain utamakura ${draftClass}">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8e44ad" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 18l6-8 4 5 4-6 4 9H3z" />
                    </svg>
                </div>
            </div>
        `;
        iconSize = [24, 30];
        iconAnchor = [12, 30];
        markerClassName = `tanka utamakura ${draftClass}`;
    } else if (isTanka) {
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

    const customIcon = L.divIcon({
        className: `poetry-marker ${markerClassName}`,
        html: iconHtml,
        iconSize,
        iconAnchor
    });

    const marker = L.marker([latitude, longitude], {
        icon: customIcon,
        haikuData: {
            season,
            poetry_type,
            id,
            haiku_text,
            poet_name
        }
    });

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
        offset: L.point(0, -40)
    });

    marker.on('click', function (e) {
        console.log(`📍 既存俳句マーカークリック: ${haiku_text.substring(0, 10)}...`);

        if (typeof window.removeTemporaryPinFromPinPosting === 'function') {
            window.removeTemporaryPinFromPinPosting();
        }

        if (typeof window.hideInlineForm === 'function') {
            window.hideInlineForm();
        }

        L.DomEvent.stopPropagation(e);
    });

    appState.markersLayer.addLayer(marker);
}

function createHaikuPopupContent(haiku) {
    const { id, location_name, haiku_text, poet_name, location_type, description, season, preface, status } = haiku;
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

export async function editHaiku(haikuId) {
    console.log(`📝 俳句編集開始: ID=${haikuId}`);

    try {
        appState.map?.closePopup();

        const haiku = await apiAdapter.getHaiku(haikuId);
        if (!haiku) {
            throw new Error('俳句データが見つかりません');
        }

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

export async function showHaikuDetail(haikuId) {
    try {
        showLoadingState('俳句詳細を読み込み中...');
        const haiku = await apiAdapter.getHaiku(haikuId);
        alert(`俳句詳細\n\n${haiku.haiku_text}\n\n詠み人: ${haiku.poet ? haiku.poet.name : '不明'}\n場所: ${haiku.location_name}`);
        hideLoadingState();
    } catch (error) {
        console.error('俳句詳細の取得に失敗:', error);
        showErrorMessage('俳句詳細を取得できませんでした');
        hideLoadingState();
    }
}

function getMostCommonSeason(cluster) {
    const childMarkers = cluster.getAllChildMarkers();
    const seasonCounts = {};

    childMarkers.forEach(marker => {
        const haikuData = marker.options.haikuData;
        if (haikuData?.season) {
            seasonCounts[haikuData.season] = (seasonCounts[haikuData.season] || 0) + 1;
        }
    });

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

function getSeasonColor(season) {
    const seasonColors = {
        '春': '#3498db',
        '夏': '#e74c3c',
        '秋': '#f1c40f',
        '冬': '#2ecc71',
        'その他': '#7f8c8d'
    };
    return seasonColors[season] || seasonColors['その他'];
}

function getSeasonTextColor(season) {
    if (season === '秋' || season === '暮・新年') {
        return '#333';
    }
    return '#fff';
}

async function hasUtamakura(text) {
    try {
        const supabaseClientInstance = getSupabaseClient();
        if (!supabaseClientInstance) return false;

        const utamakuraData = await supabaseClientInstance.getUtamakura();
        if (!utamakuraData?.length) return false;

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

export function createClusterIconOptions() {
    return {
        maxClusterRadius: UI_CONFIG.CLUSTER_MAX_RADIUS || 2,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: (cluster) => {
            const childCount = cluster.getChildCount();
            let className = 'custom-cluster-icon';

            if (childCount < 4) {
                className += ' cluster-small';
            } else if (childCount < 7) {
                className += ' cluster-medium';
            } else {
                className += ' cluster-large';
            }

            const mostCommonSeason = getMostCommonSeason(cluster);
            const seasonColor = getSeasonColor(mostCommonSeason);
            const textColor = getSeasonTextColor(mostCommonSeason);

            return L.divIcon({
                html: `
                    <div class="cluster-main" style="background: ${seasonColor};">
                        <span class="cluster-count" style="color: ${textColor} !important;">${childCount}</span>
                    </div>
                `,
                className,
                iconSize: [28, 28]
            });
        }
    };
}
