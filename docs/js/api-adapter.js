/**
 * API アダプター - Supabase API インターフェース
 * Supabaseによる俳句データアクセス機能を提供
 */

import { APP_CONFIG, validateConfig } from './config.js';
import { getSupabaseClient } from './supabase-client.js';

class APIAdapter {
    constructor() {
        this.client = null;
        this.initialized = false;
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

            console.log('🔧 Supabaseクライアントを初期化中...');
            this.client = getSupabaseClient();
            await this.client.testConnection();

            this.initialized = true;
            console.log('✅ APIクライアント初期化完了: Supabase');
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
        return await this.client.getHaikusForMap();
    }

    /**
     * 俳句一覧を取得
     */
    async getHaikus(params = {}) {
        await this.ensureInitialized();
        return await this.client.getHaikus(params);
    }

    /**
     * 特定の俳句を取得
     */
    async getHaiku(id) {
        await this.ensureInitialized();
        return await this.client.getHaiku(id);
    }

    /**
     * 俳句を検索
     */
    async searchHaikus(query) {
        await this.ensureInitialized();

        if (!query || query.trim() === '') {
            return [];
        }

        return await this.client.searchHaikus(query);
    }

    /**
     * 俳句を投稿
     */
    async createHaiku(haikuData) {
        await this.ensureInitialized();
        return await this.client.createHaiku(haikuData);
    }

    /**
     * 下書き一覧を取得
     */
    async getDrafts() {
        await this.ensureInitialized();
        return await this.client.getDrafts();
    }

    // =============================================================================
    // 詠み人関連API
    // =============================================================================

    /**
     * 詠み人一覧を取得
     */
    async getPoets(params = {}) {
        await this.ensureInitialized();
        return await this.client.getPoets(params);
    }

    /**
     * 詠み人を検索
     */
    async searchPoets(query) {
        await this.ensureInitialized();

        if (!query || query.trim() === '') {
            return [];
        }

        return await this.client.searchPoets(query);
    }

    // =============================================================================
    // 地理検索API（Supabaseのみ）
    // =============================================================================

    /**
     * 地理的範囲での俳句検索
     */
    async getHaikusInBounds(bounds) {
        await this.ensureInitialized();
        return await this.client.getHaikusInBounds(bounds);
    }

    /**
     * 統計データを取得
     */
    async getStatistics() {
        await this.ensureInitialized();
        return await this.client.getStatistics();
    }

    // =============================================================================
    // ヘルパー関数
    // =============================================================================

    /**
     * API接続テスト
     */
    async testConnection() {
        try {
            await this.ensureInitialized();
            const result = await this.client.testConnection();

            console.log('✅ API接続テスト成功: Supabase');
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
        return 'Supabase';
    }
}

// APIアダプターのグローバルインスタンス
const apiAdapter = new APIAdapter();

// ES Module export
export { apiAdapter, APIAdapter };