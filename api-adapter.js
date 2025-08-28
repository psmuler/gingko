/**
 * API アダプター - Supabase/GAS API の統合インターフェース
 * config.jsのAPP_CONFIG.USE_SUPABASEフラグに基づいてAPI呼び出しを切り替え
 */

class APIAdapter {
    constructor() {
        this.client = null;
        this.initialized = false;
        this.useSupabase = APP_CONFIG?.USE_SUPABASE ?? false;
    }

    /**
     * APIクライアントの初期化
     */
    async initialize() {
        if (this.initialized) return;

        try {
            // 設定検証
            if (!validateConfig()) {
                throw new Error('API設定が不正です');
            }

            if (this.useSupabase) {
                console.log('🔧 Supabaseクライアントを初期化中...');
                this.client = getSupabaseClient();
                await this.client.testConnection();
            } else {
                console.log('🔧 GAS APIクライアントを初期化中...');
                this.client = apiClient; // 既存のapiClientを使用
                await this.client.testConnection();
            }

            this.initialized = true;
            console.log('✅ APIクライアント初期化完了:', this.useSupabase ? 'Supabase' : 'GAS');
        } catch (error) {
            console.error('❌ APIクライアント初期化失敗:', error);
            throw error;
        }
    }

    /**
     * 初期化確認
     */
    async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
    }

    // =============================================================================
    // 俳句関連API（統合インターフェース）
    // =============================================================================

    /**
     * 地図用俳句データを取得
     */
    async getHaikusForMap() {
        await this.ensureInitialized();
        
        if (this.useSupabase) {
            return await this.client.getHaikusForMap();
        } else {
            // GAS APIの場合は既存の形式に変換
            const data = await this.client.getHaikusForMap();
            return this.formatGASDataForMap(data);
        }
    }

    /**
     * 俳句一覧を取得
     */
    async getHaikus(params = {}) {
        await this.ensureInitialized();
        
        if (this.useSupabase) {
            return await this.client.getHaikus(params);
        } else {
            const data = await this.client.getHaikus(params);
            return this.formatGASDataForList(data);
        }
    }

    /**
     * 特定の俳句を取得
     */
    async getHaiku(id) {
        await this.ensureInitialized();
        
        if (this.useSupabase) {
            return await this.client.getHaiku(id);
        } else {
            const data = await this.client.getHaiku(id);
            return this.formatGASDataForDetail(data);
        }
    }

    /**
     * 俳句を検索
     */
    async searchHaikus(query) {
        await this.ensureInitialized();
        
        if (!query || query.trim() === '') {
            return [];
        }

        if (this.useSupabase) {
            return await this.client.searchHaikus(query);
        } else {
            const data = await this.client.searchHaikus(query);
            return this.formatGASDataForSearch(data);
        }
    }

    /**
     * 俳句を投稿
     */
    async createHaiku(haikuData) {
        await this.ensureInitialized();
        
        if (this.useSupabase) {
            return await this.client.createHaiku(haikuData);
        } else {
            // GAS APIの場合は既存の投稿形式を使用
            const formattedData = this.formatDataForGASPost(haikuData);
            return await this.client.createHaiku(formattedData);
        }
    }

    // =============================================================================
    // 詠み人関連API
    // =============================================================================

    /**
     * 詠み人一覧を取得
     */
    async getPoets(params = {}) {
        await this.ensureInitialized();
        
        if (this.useSupabase) {
            return await this.client.getPoets(params);
        } else {
            return await this.client.getPoets(params);
        }
    }

    /**
     * 詠み人を検索
     */
    async searchPoets(query) {
        await this.ensureInitialized();
        
        if (!query || query.trim() === '') {
            return [];
        }

        if (this.useSupabase) {
            return await this.client.searchPoets(query);
        } else {
            return await this.client.searchPoets(query);
        }
    }

    // =============================================================================
    // 地理検索API（Supabaseのみ）
    // =============================================================================

    /**
     * 地理的範囲での俳句検索
     */
    async getHaikusInBounds(bounds) {
        await this.ensureInitialized();
        
        if (this.useSupabase) {
            return await this.client.getHaikusInBounds(bounds);
        } else {
            // GAS APIでは地理検索をサポートしていないため、全データを取得してフィルタ
            console.warn('⚠️ GAS APIでは地理検索をサポートしていません。全データ取得してフィルタします。');
            const allHaikus = await this.client.getHaikusForMap();
            return this.filterHaikusByBounds(allHaikus, bounds);
        }
    }

    /**
     * 統計データを取得
     */
    async getStatistics() {
        await this.ensureInitialized();
        
        if (this.useSupabase) {
            return await this.client.getStatistics();
        } else {
            // GAS APIでは統計機能がないため、簡易版を実装
            return await this.calculateBasicStatistics();
        }
    }

    // =============================================================================
    // データフォーマット関数（GAS API用）
    // =============================================================================

    /**
     * GAS APIの地図用データを標準形式に変換
     */
    formatGASDataForMap(data) {
        if (!Array.isArray(data)) return [];
        
        return data.map(item => ({
            id: item.id,
            haiku_text: item.haiku_text,
            poet_name: item.poet_name || '不明',
            poet_kana: item.poet_kana || '',
            latitude: parseFloat(item.latitude),
            longitude: parseFloat(item.longitude),
            location_type: item.location_type,
            location_name: item.location_name
        }));
    }

    /**
     * GAS APIの一覧用データを標準形式に変換
     */
    formatGASDataForList(data) {
        if (!Array.isArray(data)) return [];
        
        return data.map(item => ({
            id: item.id,
            haiku_text: item.haiku_text,
            poet_name: item.poet_name || '不明',
            poet_kana: item.poet_kana || '',
            poet_period: item.poet_period || '',
            latitude: item.latitude ? parseFloat(item.latitude) : null,
            longitude: item.longitude ? parseFloat(item.longitude) : null,
            location_type: item.location_type,
            location_name: item.location_name,
            date_composed: item.date_composed,
            description: item.description
        }));
    }

    /**
     * GAS APIの詳細用データを標準形式に変換
     */
    formatGASDataForDetail(data) {
        if (!data) return null;
        
        return {
            id: data.id,
            haiku_text: data.haiku_text,
            poet_name: data.poet_name || '不明',
            poet_kana: data.poet_kana || '',
            poet_period: data.poet_period || '',
            latitude: data.latitude ? parseFloat(data.latitude) : null,
            longitude: data.longitude ? parseFloat(data.longitude) : null,
            location_type: data.location_type,
            location_name: data.location_name,
            date_composed: data.date_composed,
            description: data.description
        };
    }

    /**
     * GAS APIの検索用データを標準形式に変換
     */
    formatGASDataForSearch(data) {
        if (!Array.isArray(data)) return [];
        
        return data.map(item => ({
            id: item.id,
            haiku_text: item.haiku_text,
            poet_name: item.poet_name || '不明',
            location_name: item.location_name,
            location_type: item.location_type
        }));
    }

    /**
     * 投稿用データをGAS API形式に変換
     */
    formatDataForGASPost(haikuData) {
        return {
            haiku_text: haikuData.haiku_text,
            poet_name: haikuData.poet_name || '',
            latitude: haikuData.latitude || '',
            longitude: haikuData.longitude || '',
            location_type: haikuData.location_type,
            location_name: haikuData.location_name || '',
            date_composed: haikuData.date_composed || '',
            description: haikuData.description || ''
        };
    }

    // =============================================================================
    // ヘルパー関数
    // =============================================================================

    /**
     * 境界による俳句のフィルタリング（GAS API用）
     */
    filterHaikusByBounds(haikus, bounds) {
        return haikus.filter(haiku => 
            haiku.latitude >= bounds.south &&
            haiku.latitude <= bounds.north &&
            haiku.longitude >= bounds.west &&
            haiku.longitude <= bounds.east
        );
    }

    /**
     * 基本統計の計算（GAS API用）
     */
    async calculateBasicStatistics() {
        try {
            const [haikus, poets] = await Promise.all([
                this.client.getHaikus(),
                this.client.getPoets()
            ]);

            const locationTypes = {};
            haikus.forEach(haiku => {
                const type = haiku.location_type || 'その他';
                locationTypes[type] = (locationTypes[type] || 0) + 1;
            });

            return {
                total_haikus: haikus.length,
                total_poets: poets.length,
                location_types: locationTypes
            };
        } catch (error) {
            console.error('❌ 統計計算エラー:', error);
            return {
                total_haikus: 0,
                total_poets: 0,
                location_types: {}
            };
        }
    }

    /**
     * API接続テスト
     */
    async testConnection() {
        try {
            await this.ensureInitialized();
            const result = this.useSupabase 
                ? await this.client.testConnection()
                : await this.client.testConnection();
            
            console.log('✅ API接続テスト成功:', this.useSupabase ? 'Supabase' : 'GAS');
            return result;
        } catch (error) {
            console.error('❌ API接続テスト失敗:', error);
            return false;
        }
    }

    /**
     * 現在使用中のAPI種別を取得
     */
    getAPIType() {
        return this.useSupabase ? 'Supabase' : 'GAS';
    }
}

// APIアダプターのグローバルインスタンス
const apiAdapter = new APIAdapter();