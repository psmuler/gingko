import { apiAdapter } from '../api-adapter.js';
import { pinState } from './state.js';

export async function refreshHaikuCache() {
    try {
        const currentTime = Date.now();
        const { haikuDataCache, pinCacheLastUpdated, PIN_CACHE_REFRESH_INTERVAL } = pinState;

        if (currentTime - pinCacheLastUpdated < PIN_CACHE_REFRESH_INTERVAL && haikuDataCache.length > 0) {
            return;
        }

        console.log('🔄 俳句データキャッシュ更新中...');
        const haikus = await apiAdapter.getHaikusForMap();
        pinState.haikuDataCache = haikus || [];
        pinState.pinCacheLastUpdated = currentTime;
        console.log(`✅ 俳句データキャッシュ更新完了: ${pinState.haikuDataCache.length}件`);
    } catch (error) {
        console.error('❌ 俳句データキャッシュ更新エラー:', error);
    }
}

export async function updateHaikuInCache(haikuId) {
    try {
        console.log(`🔄 キャッシュ更新: ID=${haikuId}`);

        const updatedHaiku = await apiAdapter.getHaiku(haikuId);

        if (!updatedHaiku) {
            console.warn(`⚠️ 俳句が見つかりません: ID=${haikuId}`);
            return;
        }

        const index = pinState.haikuDataCache.findIndex((h) => h.id === haikuId);

        if (index !== -1) {
            pinState.haikuDataCache[index] = updatedHaiku;
            console.log(`✅ キャッシュ更新完了: ID=${haikuId}`);
        } else {
            pinState.haikuDataCache.push(updatedHaiku);
            console.log(`✅ キャッシュに追加: ID=${haikuId}`);
        }
    } catch (error) {
        console.error(`❌ キャッシュ更新エラー: ID=${haikuId}`, error);
    }
}

export async function checkExistingHaikusAtLocation(lat, lng, radius = 100) {
    try {
        await refreshHaikuCache();

        const radiusInDegrees = radius / 111111;
        const lngRadiusInDegrees = radiusInDegrees / Math.cos(lat * Math.PI / 180);

        const nearbyHaikus = pinState.haikuDataCache.filter((haiku) => {
            if (!haiku.latitude || !haiku.longitude) return false;

            const latDiff = Math.abs(haiku.latitude - lat);
            const lngDiff = Math.abs(haiku.longitude - lng);

            return latDiff <= radiusInDegrees && lngDiff <= lngRadiusInDegrees;
        });

        console.log(`📍 高速検索結果: ${nearbyHaikus.length}件 (キャッシュから)`);
        return nearbyHaikus;
    } catch (error) {
        console.error('❌ 既存俳句チェックエラー:', error);
        return [];
    }
}
