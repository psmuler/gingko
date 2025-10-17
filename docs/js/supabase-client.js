/**
 * 俳句鑑賞＆記録アプリ - Supabase API クライアント
 * スプレッドシートからSupabaseへの移行版
 */

import { SUPABASE_CONFIG } from './config.js';

class SupabaseHaikuClient {
    constructor() {
        // Supabase設定を確認
        if (!SUPABASE_CONFIG || !SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anon_key) {
            throw new Error('Supabase設定が不正です。config.jsを確認してください。');
        }
        
        this.supabase = null;
        this.initialized = false;
        
        // 初期化を試行
        this.initializeClient();
    }

    /**
     * Supabaseクライアントの初期化
     */
    async initializeClient() {
        try {
            // supabase-jsライブラリの動的インポート
            if (typeof window !== 'undefined' && window.supabase) {
                // CDNからロード済みの場合
                this.supabase = window.supabase.createClient(
                    SUPABASE_CONFIG.url, 
                    SUPABASE_CONFIG.anon_key
                );
            } else {
                // モジュールとしてインポート
                const { createClient } = await import('@supabase/supabase-js');
                this.supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anon_key);
            }
            
            this.initialized = true;
            console.log('✅ Supabase client initialized');
        } catch (error) {
            console.error('❌ Supabase initialization failed:', error);
            throw new Error('Supabaseクライアントの初期化に失敗しました');
        }
    }

    /**
     * 初期化完了を待つ
     */
    async ensureInitialized() {
        if (!this.initialized) {
            await this.initializeClient();
        }
        if (!this.supabase) {
            throw new Error('Supabaseクライアントが利用できません');
        }
    }

    // =============================================================================
    // 俳句関連API
    // =============================================================================

    /**
     * 地図用俳句データを取得（詠み人情報付き）
     * 下書きと投稿済みの両方を取得
     */
    async getHaikusForMap() {
        await this.ensureInitialized();

        try {
            const { data, error } = await this.supabase
                .from('haikus')
                .select(`
                    id,
                    haiku_text,
                    latitude,
                    longitude,
                    location_type,
                    location_name,
                    season,
                    status,
                    poets (
                        id,
                        name,
                        name_kana
                    )
                `)
                .not('latitude', 'is', null)
                .not('longitude', 'is', null);

            if (error) throw error;

            console.log(`✅ 地図用俳句データ取得: ${data.length}件 (下書き含む)`);
            return data.map(this.formatHaikuForMap);
        } catch (error) {
            console.error('❌ 地図用俳句データ取得エラー:', error);
            throw new Error('地図用俳句データを取得できませんでした');
        }
    }

    /**
     * 俳句一覧を取得
     */
    async getHaikus(params = {}) {
        await this.ensureInitialized();
        
        try {
            let query = this.supabase
                .from('haikus')
                .select(`
                    id,
                    haiku_text,
                    latitude,
                    longitude,
                    location_type,
                    date_composed,
                    location_name,
                    description,
                    poets (
                        id,
                        name,
                        name_kana,
                        period
                    )
                `);

            // フィルタリング処理
            if (params.location_type) {
                query = query.eq('location_type', params.location_type);
            }
            
            if (params.poet_id) {
                query = query.eq('poet_id', params.poet_id);
            }

            // ソート処理
            const orderBy = params.order_by || 'created_at';
            const ascending = params.ascending !== 'false';
            query = query.order(orderBy, { ascending });

            // ページネーション
            if (params.limit) {
                query = query.limit(parseInt(params.limit));
            }
            if (params.offset) {
                query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
            }

            const { data, error } = await query;

            if (error) throw error;
            
            console.log(`✅ 俳句一覧取得: ${data.length}件`);
            return data.map(this.formatHaiku);
        } catch (error) {
            console.error('❌ 俳句一覧取得エラー:', error);
            throw new Error('俳句一覧を取得できませんでした');
        }
    }

    /**
     * 特定の俳句を取得
     */
    async getHaiku(id) {
        await this.ensureInitialized();
        
        try {
            const { data, error } = await this.supabase
                .from('haikus')
                .select(`
                    *,
                    poets (*)
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            
            console.log(`✅ 俳句詳細取得: ID ${id}`);
            return this.formatHaiku(data);
        } catch (error) {
            console.error('❌ 俳句詳細取得エラー:', error);
            throw new Error('俳句を取得できませんでした');
        }
    }

    /**
     * 俳句を検索（全文検索）
     */
    async searchHaikus(query) {
        await this.ensureInitialized();
        
        if (!query || query.trim() === '') {
            return [];
        }

        try {
            // 俳句本文での検索
            const { data: haikuResults, error: haikuError } = await this.supabase
                .from('haikus')
                .select(`
                    id,
                    haiku_text,
                    location_name,
                    location_type,
                    poets (
                        id,
                        name,
                        name_kana
                    )
                `)
                .ilike('haiku_text', `%${query}%`);

            if (haikuError) throw haikuError;

            // 詠み人名での検索
            const { data: poetResults, error: poetError } = await this.supabase
                .from('haikus')
                .select(`
                    id,
                    haiku_text,
                    location_name,
                    location_type,
                    poets!inner (
                        id,
                        name,
                        name_kana
                    )
                `)
                .or(`poets.name.ilike.%${query}%,poets.name_kana.ilike.%${query}%`, { foreignTable: 'poets' });

            if (poetError) throw poetError;

            // 重複除去してマージ
            const allResults = [...haikuResults, ...poetResults];
            const uniqueResults = allResults.filter((haiku, index, self) => 
                index === self.findIndex(h => h.id === haiku.id)
            );

            console.log(`✅ 俳句検索完了: "${query}" -> ${uniqueResults.length}件`);
            return uniqueResults.map(this.formatHaikuForSearch);
        } catch (error) {
            console.error('❌ 俳句検索エラー:', error);
            throw new Error('俳句検索に失敗しました');
        }
    }

    /**
     * 俳句を投稿
     */
    async createHaiku(haikuData) {
        await this.ensureInitialized();

        try {
            const formattedData = this.formatHaikuForInsert(haikuData);

            const { data, error } = await this.supabase
                .from('haikus')
                .insert([formattedData])
                .select()
                .single();

            if (error) throw error;

            console.log('✅ 俳句投稿完了:', data.id);
            return { success: true, id: data.id, data };
        } catch (error) {
            console.error('❌ 俳句投稿エラー:', error);
            throw new Error('俳句投稿に失敗しました');
        }
    }

    /**
     * 俳句を更新
     */
    async updateHaiku(id, haikuData) {
        await this.ensureInitialized();

        try {
            const formattedData = this.formatHaikuForInsert(haikuData);

            const { data, error } = await this.supabase
                .from('haikus')
                .update(formattedData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            console.log('✅ 俳句更新完了:', data.id);
            return { success: true, id: data.id, data };
        } catch (error) {
            console.error('❌ 俳句更新エラー:', error);
            throw new Error('俳句更新に失敗しました');
        }
    }

    /**
     * 下書き一覧を取得
     * @returns {Array} 下書き俳句の配列
     */
    async getDrafts() {
        await this.ensureInitialized();

        try {
            const { data, error } = await this.supabase
                .from('haikus')
                .select(`
                    id,
                    haiku_text,
                    latitude,
                    longitude,
                    season,
                    seasonal_term,
                    created_at,
                    updated_at,
                    poets (
                        id,
                        name
                    )
                `)
                .eq('status', 'draft')
                .order('updated_at', { ascending: false });

            if (error) throw error;

            console.log(`✅ 下書き一覧取得: ${data.length}件`);
            return data;
        } catch (error) {
            console.error('❌ 下書き一覧取得エラー:', error);
            throw new Error('下書き一覧を取得できませんでした');
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
        
        try {
            let query = this.supabase
                .from('poets')
                .select('*');

            // ソート処理
            const orderBy = params.order_by || 'name_kana';
            query = query.order(orderBy);

            // ページネーション
            if (params.limit) {
                query = query.limit(parseInt(params.limit));
            }

            const { data, error } = await query;

            if (error) throw error;
            
            console.log(`✅ 詠み人一覧取得: ${data.length}件`);
            return data;
        } catch (error) {
            console.error('❌ 詠み人一覧取得エラー:', error);
            throw new Error('詠み人一覧を取得できませんでした');
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

        try {
            const { data, error } = await this.supabase
                .from('poets')
                .select('*')
                .or(`name.ilike.%${query}%,name_kana.ilike.%${query}%`);

            if (error) throw error;
            
            console.log(`✅ 詠み人検索完了: "${query}" -> ${data.length}件`);
            return data;
        } catch (error) {
            console.error('❌ 詠み人検索エラー:', error);
            throw new Error('詠み人検索に失敗しました');
        }
    }

    // =============================================================================
    // 地理検索API
    // =============================================================================

    /**
     * 地理的範囲での俳句検索
     */
    async getHaikusInBounds(bounds) {
        await this.ensureInitialized();
        
        try {
            const { data, error } = await this.supabase
                .from('haikus')
                .select(`
                    id,
                    haiku_text,
                    latitude,
                    longitude,
                    location_type,
                    location_name,
                    poets (
                        id,
                        name
                    )
                `)
                .gte('latitude', bounds.south)
                .lte('latitude', bounds.north)
                .gte('longitude', bounds.west)
                .lte('longitude', bounds.east)
                .not('latitude', 'is', null)
                .not('longitude', 'is', null);

            if (error) throw error;
            
            console.log(`✅ 地理検索完了: ${data.length}件`);
            return data.map(this.formatHaikuForMap);
        } catch (error) {
            console.error('❌ 地理検索エラー:', error);
            throw new Error('地理検索に失敗しました');
        }
    }

    // =============================================================================
    // 季語・キーワードAPI
    // =============================================================================

    /**
     * 季語データを取得
     */
    async getKeywords() {
        await this.ensureInitialized();

        try {
            // 全ての季語データを取得（デフォルト1000件制限を回避）
            let allData = [];
            let hasMoreData = true;
            let offset = 0;
            const batchSize = 1000;

            while (hasMoreData) {
                const { data, error } = await this.supabase
                    .from('keywords')
                    .select('id, display_name, display_name_alternatives, season, description')
                    .eq('type', '季語')
                    .range(offset, offset + batchSize - 1)
                    .order('display_name');

                if (error) throw error;

                if (data && data.length > 0) {
                    allData = allData.concat(data);
                    offset += batchSize;
                    hasMoreData = data.length === batchSize;
                } else {
                    hasMoreData = false;
                }
            }

            console.log(`✅ 季語データ取得: ${allData.length}件（全件取得完了）`);
            return allData || [];
        } catch (error) {
            console.error('❌ 季語データ取得エラー:', error);
            throw new Error('季語データを取得できませんでした');
        }
    }

    // =============================================================================
    // 統計・メタデータAPI
    // =============================================================================

    /**
     * データ統計を取得
     */
    async getStatistics() {
        await this.ensureInitialized();
        
        try {
            const [
                { count: haikuCount },
                { count: poetCount },
                { count: kuhibiCount },
                { count: kikoCount },
                { count: yukariCount }
            ] = await Promise.all([
                this.supabase.from('haikus').select('*', { count: 'exact', head: true }),
                this.supabase.from('poets').select('*', { count: 'exact', head: true }),
                this.supabase.from('haikus').select('*', { count: 'exact', head: true }).eq('location_type', '句碑'),
                this.supabase.from('haikus').select('*', { count: 'exact', head: true }).eq('location_type', '紀行文'),
                this.supabase.from('haikus').select('*', { count: 'exact', head: true }).eq('location_type', 'ゆかりの地')
            ]);

            const stats = {
                total_haikus: haikuCount,
                total_poets: poetCount,
                location_types: {
                    '句碑': kuhibiCount,
                    '紀行文': kikoCount,
                    'ゆかりの地': yukariCount
                }
            };

            console.log('✅ 統計データ取得完了:', stats);
            return stats;
        } catch (error) {
            console.error('❌ 統計データ取得エラー:', error);
            throw new Error('統計データを取得できませんでした');
        }
    }

    // =============================================================================
    // データフォーマット関数
    // =============================================================================

    /**
     * 地図用俳句データフォーマット
     */
    formatHaikuForMap(haiku) {
        return {
            id: haiku.id,
            haiku_text: haiku.haiku_text,
            poet_name: haiku.poets?.name || '不明',
            poet_kana: haiku.poets?.name_kana || '',
            latitude: parseFloat(haiku.latitude),
            longitude: parseFloat(haiku.longitude),
            location_type: haiku.location_type,
            location_name: haiku.location_name,
            season: haiku.season,
            status: haiku.status || 'published'
        };
    }

    /**
     * 一般的な俳句データフォーマット
     */
    formatHaiku(haiku) {
        return {
            id: haiku.id,
            haiku_text: haiku.haiku_text,
            poet_name: haiku.poets?.name || '不明',
            poet_kana: haiku.poets?.name_kana || '',
            poet_period: haiku.poets?.period || '',
            latitude: haiku.latitude ? parseFloat(haiku.latitude) : null,
            longitude: haiku.longitude ? parseFloat(haiku.longitude) : null,
            location_type: haiku.location_type,
            location_name: haiku.location_name,
            date_composed: haiku.date_composed,
            description: haiku.description,
            season: haiku.season || null,
            seasonal_term: haiku.seasonal_term || '',
            status: haiku.status || 'published'
        };
    }

    /**
     * 検索用俳句データフォーマット
     */
    formatHaikuForSearch(haiku) {
        return {
            id: haiku.id,
            haiku_text: haiku.haiku_text,
            poet_name: haiku.poets?.name || '不明',
            location_name: haiku.location_name,
            location_type: haiku.location_type
        };
    }

    /**
     * 投稿用データフォーマット
     */
    formatHaikuForInsert(haikuData) {
        return {
            haiku_text: haikuData.haiku_text,
            poet_id: haikuData.poet_id || null,
            latitude: haikuData.latitude ? parseFloat(haikuData.latitude) : null,
            longitude: haikuData.longitude ? parseFloat(haikuData.longitude) : null,
            location_type: haikuData.location_type,
            location_name: haikuData.location_name || '',
            date_composed: haikuData.date_composed || null,
            description: haikuData.description || '',
            season: haikuData.season || null,
            seasonal_term: haikuData.seasonal_term || null,
            keyword_id: haikuData.keyword_id || null,  // 季語IDフィールド
            status: haikuData.status || 'published'     // ステータス (デフォルト: published)
        };
    }

    // =============================================================================
    // ユーティリティ
    // =============================================================================

    /**
     * 接続テスト
     */
    async testConnection() {
        try {
            await this.ensureInitialized();
            
            // 簡単なクエリでテスト
            const { error } = await this.supabase
                .from('poets')
                .select('id')
                .limit(1);

            if (error) throw error;
            
            console.log('✅ Supabase接続テスト成功');
            return true;
        } catch (error) {
            console.error('❌ Supabase接続テスト失敗:', error);
            return false;
        }
    }
}

// Supabaseクライアントのグローバルインスタンス
let supabaseClient = null;

// インスタンス取得関数
function getSupabaseClient() {
    if (!supabaseClient) {
        supabaseClient = new SupabaseHaikuClient();
    }
    return supabaseClient;
}

// ブラウザ対応: グローバルスコープに関数を公開
if (typeof window !== 'undefined') {
    // ブラウザ環境
    window.SupabaseHaikuClient = SupabaseHaikuClient;
    window.getSupabaseClient = getSupabaseClient;
}

// Node.js環境のES Module対応
if (typeof module !== 'undefined' && module.exports) {
    // CommonJS
    module.exports = { SupabaseHaikuClient, getSupabaseClient };
}

// ES Module環境（Node.js）
if (typeof globalThis !== 'undefined' && typeof window === 'undefined') {
    // Node.js環境でのグローバル設定
    globalThis.SupabaseHaikuClient = SupabaseHaikuClient;
    globalThis.getSupabaseClient = getSupabaseClient;
}

// ES Module export（migration-tool.js等のES Moduleツール用）
export { SupabaseHaikuClient, getSupabaseClient };
