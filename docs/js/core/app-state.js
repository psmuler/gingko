/**
 * Application-wide state shared across map, UI, and form modules.
 */
export const appState = {
    map: null,
    markersLayer: null,
    currentLocationMarker: null,
    currentTileLayer: null,
    tileServerIndex: -1,
    isLoading: false,
    isSubmittingHaiku: false
};

export function resetSubmissionState() {
    appState.isSubmittingHaiku = false;
}

export function setMap(mapInstance) {
    appState.map = mapInstance;
}

export function setMarkersLayer(layer) {
    appState.markersLayer = layer;
}

export function setCurrentLocationMarker(marker) {
    appState.currentLocationMarker = marker;
}

export function setCurrentTileLayer(layer) {
    appState.currentTileLayer = layer;
}

export function setTileServerIndex(index) {
    appState.tileServerIndex = index;
}
