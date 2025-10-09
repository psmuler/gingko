/**
 * Kigo Gatcha Logic Module
 * Provides gacha functionality for seasonal words
 */

import { dict } from './kigo-gatcha.js';

/**
 * Get current season based on month
 * @returns {string} Season name ('spring', 'summer', 'autumn', 'winter')
 */
export function getCurrentSeason() {
    const month = new Date().getMonth() + 1; // 1-12

    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter'; // 12, 1, 2
}

/**
 * Get season name in Japanese
 * @param {string} season - Season key ('spring', 'summer', 'autumn', 'winter')
 * @returns {string} Japanese season name
 */
export function getSeasonNameJa(season) {
    const seasonNames = {
        spring: '春',
        summer: '夏',
        autumn: '秋',
        winter: '冬'
    };
    return seasonNames[season] || '';
}

/**
 * Get a random kigo from current season, avoiding duplicates
 * @param {string[]} usedKigo - Array of already used kigo
 * @returns {object|null} Object with kigo and season, or null if all used
 */
export function getRandomKigo(usedKigo = []) {
    const season = getCurrentSeason();
    const seasonKigo = dict[season];

    // If no data for this season, return null
    if (!seasonKigo || seasonKigo.length === 0) {
        return null;
    }

    // Filter out already used kigo
    const availableKigo = seasonKigo.filter(kigo => !usedKigo.includes(kigo));

    // If all kigo have been used, return null
    if (availableKigo.length === 0) {
        return null;
    }

    // Get random kigo from available ones
    const randomIndex = Math.floor(Math.random() * availableKigo.length);
    const selectedKigo = availableKigo[randomIndex];

    return {
        kigo: selectedKigo,
        season: season,
        seasonJa: getSeasonNameJa(season)
    };
}

/**
 * Reset used kigo list in localStorage
 */
export function resetUsedKigo() {
    localStorage.removeItem('usedKigo');
}

/**
 * Get used kigo list from localStorage
 * @returns {string[]} Array of used kigo
 */
export function getUsedKigo() {
    const stored = localStorage.getItem('usedKigo');
    return stored ? JSON.parse(stored) : [];
}

/**
 * Add kigo to used list in localStorage
 * @param {string} kigo - Kigo to add to used list
 */
export function addUsedKigo(kigo) {
    const usedKigo = getUsedKigo();
    if (!usedKigo.includes(kigo)) {
        usedKigo.push(kigo);
        localStorage.setItem('usedKigo', JSON.stringify(usedKigo));
    }
}

/**
 * Check if this is user's first visit
 * @returns {boolean} True if first visit
 */
export function isFirstVisit() {
    return !localStorage.getItem('hasVisited');
}

/**
 * Mark that user has visited
 */
export function markVisited() {
    localStorage.setItem('hasVisited', 'true');
}

/**
 * Get season color (matching styles.css)
 * @param {string} season - Season key
 * @returns {string} CSS color code
 */
export function getSeasonColor(season) {
    const colors = {
        spring: '#3498db',  // Blue
        summer: '#e74c3c',  // Red
        autumn: '#ffffff',  // White
        winter: '#2c3e50'   // Dark blue/black
    };
    return colors[season] || '#95a5a6'; // Default gray
}
