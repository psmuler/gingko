import { MAP_CONFIG } from '../config.js';

const FALLBACK_COLOR = '#95a5a6';

export function getSeasonColor(season) {
    const palette = MAP_CONFIG?.MARKER_COLORS || {};
    return palette[season] || palette['その他'] || FALLBACK_COLOR;
}

export function getSeasonTextColor(season) {
    return season === '秋' || season === '暮・新年' ? '#333' : '#fff';
}
