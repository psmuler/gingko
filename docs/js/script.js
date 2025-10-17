/**
 * Application Orchestrator
 * Coordinates UI modules, map services, and shared state.
 */

import { appState } from './core/app-state.js';
import { showModal, closeModal } from './ui/modal.js';
import {
    showLoadingState,
    hideLoadingState,
    showErrorMessage,
    showInfoMessage,
    showSuccessMessage
} from './ui/messages.js';
import {
    toggleMenu,
    closeMenu,
    showAbout,
    showFavLinks,
    closeAbout,
    closeFavLinks,
    showStats,
    runKigoTest
} from './ui/menu.js';
import {
    toggleHaikuForm,
    openHaikuForm,
    closeHaikuForm,
    getCurrentLocationForForm,
    submitHaiku
} from './ui/form-controller.js';
import {
    initializeMap,
    initializeMapWithLocation,
    executeInitializationSequence,
    handleInitializationError,
    goToCurrentLocation,
    refreshData
} from './map/map-service.js';
import {
    loadHaikuData,
    editHaiku,
    showHaikuDetail
} from './map/markers.js';

// -----------------------------------------------------------------------------
// Public API re-export
// -----------------------------------------------------------------------------

export {
    appState,
    // Map lifecycle
    initializeMap,
    initializeMapWithLocation,
    executeInitializationSequence,
    handleInitializationError,
    goToCurrentLocation,
    refreshData,
    loadHaikuData,

    // UI helpers
    showModal,
    closeModal,
    showLoadingState,
    hideLoadingState,
    showErrorMessage,
    showInfoMessage,
    showSuccessMessage,

    // Menu actions
    toggleMenu,
    closeMenu,
    showAbout,
    showFavLinks,
    closeAbout,
    closeFavLinks,
    showStats,
    runKigoTest,

    // Form actions
    toggleHaikuForm,
    openHaikuForm,
    closeHaikuForm,
    getCurrentLocationForForm,
    submitHaiku,

    // Marker utilities
    editHaiku,
    showHaikuDetail
};

// Provide access to the underlying Leaflet map for legacy modules.
export function getMap() {
    return appState.map;
}

// -----------------------------------------------------------------------------
// Legacy global bindings (for inline onclick handlers)
// -----------------------------------------------------------------------------

if (typeof window !== 'undefined') {
    Object.assign(window, {
        toggleMenu,
        closeMenu,
        showAbout,
        showFavLinks,
        closeAbout,
        closeFavLinks,
        showStats,
        runKigoTest,
        goToCurrentLocation,
        closeHaikuForm,
        getCurrentLocationForForm,
        submitHaiku,
        closeModal,
        showHaikuDetail,
        editHaiku
    });

    console.log('✅ script.js グローバル関数をwindowに公開');
}

// Convenience export for modules that previously imported `map` directly.
export const map = new Proxy({}, {
    get(_, prop) {
        const mapInstance = appState.map;
        if (!mapInstance) {
            return undefined;
        }
        const value = mapInstance[prop];
        if (typeof value === 'function') {
            return value.bind(mapInstance);
        }
        return value;
    },
    set(_, prop, value) {
        const mapInstance = appState.map;
        if (!mapInstance) return false;
        mapInstance[prop] = value;
        return true;
    }
});

console.log('📁 script.js orchestrator initialised');
