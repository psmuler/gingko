/**
 * 俳句鑑賞＆記録アプリ - API クライアント
 * リファクタリング版 - 重複コード削除と可読性向上
 */

class HaikuAPIClient {
    constructor() {
        this.baseUrl = API_CONFIG.BASE_URL;
        this.timeout = API_CONFIG.TIMEOUT;
        this.retryCount = API_CONFIG.RETRY_COUNT;

        // リクエスト種別
        this.REQUEST_TYPES = {
            GET: 'GET',
            POST: 'POST'
        };
    }

    // =============================================================================
    // 共通リクエスト処理
    // =============================================================================

    /**
     * 統合リクエスト実行メソッド
     */
    async makeRequest(endpoint, options = {}) {
        const {
            method = this.REQUEST_TYPES.GET,
            params = {},
            postData = null,
            useRetry = true
        } = options;

        return method === this.REQUEST_TYPES.POST
            ? this.executePostRequest(endpoint, postData)
            : this.executeGetRequest(endpoint, params, useRetry);
    }

    /**
     * GETリクエストの実行
     */
    async executeGetRequest(endpoint, params, useRetry) {
        const url = this.buildGetUrl(endpoint, params);
        console.log('🔄 GET Request:', url.toString());

        return useRetry
            ? this.executeWithRetry(() => this.performGetRequest(url))
            : this.performGetRequest(url);
    }

    /**
     * POSTリクエストの実行（リトライなし）
     */
    async executePostRequest(endpoint, postData) {
        const url = new URL(this.baseUrl);
        const formBody = this.buildPostBody(endpoint, postData);

        console.log('📤 POST Request:', endpoint, postData);
        console.log('📝 POST Body:', formBody.toString());

        try {
            return await this.performPostRequest(url, formBody);
        } catch (error) {
            return this.handlePostError(error);
        }
    }

    /**
     * リトライ付きリクエスト実行
     */
    async executeWithRetry(requestFn) {
        let lastError;

        for (let attempt = 1; attempt <= this.retryCount; attempt++) {
            try {
                return await requestFn();
            } catch (error) {
                console.error(`🔄 Request failed (attempt ${attempt}):`, error);
                lastError = error;

                if (attempt < this.retryCount) {
                    await this.delay(1000 * attempt);
                }
            }
        }

        throw lastError;
    }

    // =============================================================================
    // URL・ボディ構築
    // =============================================================================

    /**
     * GET用URL構築
     */
    buildGetUrl(endpoint, params) {
        const url = new URL(this.baseUrl);
        url.searchParams.append('path', endpoint);

        Object.keys(params).forEach(key => {
            if (this.isValidParam(params[key])) {
                url.searchParams.append(key, params[key]);
            }
        });

        return url;
    }

    /**
     * POST用ボディ構築
     */
    buildPostBody(endpoint, postData) {
        const formBody = new URLSearchParams();
        formBody.append('path', endpoint);

        if (postData) {
            Object.keys(postData).forEach(key => {
                if (this.isValidParam(postData[key])) {
                    formBody.append(key, postData[key]);
                }
            });
        }

        return formBody;
    }

    /**
     * パラメータ有効性チェック
     */
    isValidParam(value) {
        return value !== null && value !== undefined && value !== '';
    }

    // =============================================================================
    // 実際のHTTPリクエスト実行
    // =============================================================================

    /**
     * GETリクエスト実行
     */
    async performGetRequest(url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url.toString(), {
                method: this.REQUEST_TYPES.GET,
                headers: { 'Accept': 'application/json' },
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return await this.processResponse(response);
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    /**
     * POSTリクエスト実行
     */
    async performPostRequest(url, formBody) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.log('⏰ POST Request timeout triggered');
            controller.abort();
        }, this.timeout);

        try {
            const response = await fetch(url.toString(), {
                method: this.REQUEST_TYPES.POST,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formBody.toString(),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            console.log('📥 POST Response status:', response.status, response.statusText);

            return await this.processResponse(response, true);
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    // =============================================================================
    // レスポンス処理
    // =============================================================================

    /**
     * レスポンス処理
     */
    async processResponse(response, isPost = false) {
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        const responseText = await response.text();
        console.log(`📥 ${isPost ? 'POST' : 'GET'} Raw Response:`, responseText);

        return this.parseResponse(responseText, isPost);
    }

    /**
     * レスポンスパース
     */
    parseResponse(responseText, isPost) {
        try {
            const data = JSON.parse(responseText);

            if (data.error) {
                throw new Error(data.message || 'API Error');
            }

            console.log(`✅ ${isPost ? 'POST' : 'GET'} Response:`, data);
            return data;
        } catch (parseError) {
            if (isPost) {
                console.warn('⚠️ JSON Parse failed, treating as success:', parseError);
                return { success: true, message: responseText };
            }
            throw parseError;
        }
    }

    // =============================================================================
    // エラーハンドリング
    // =============================================================================

    /**
     * POSTエラーハンドリング
     */
    handlePostError(error) {
        console.error('❌ POST Request failed:', error);

        if (error.name === 'AbortError') {
            throw new Error('リクエストがタイムアウトしました。時間をおいて再度お試しください。');
        }

        throw error;
    }

    // =============================================================================
    // 公開APIメソッド
    // =============================================================================

    /**
     * 地図用俳句データを取得
     */
    async getHaikusForMap() {
        return this.executeApiCall(
            () => this.makeRequest(API_CONFIG.ENDPOINTS.HAIKUS_MAP),
            '俳句データを取得できませんでした'
        );
    }

    /**
     * 俳句一覧を取得
     */
    async getHaikus(params = {}) {
        return this.executeApiCall(
            () => this.makeRequest(API_CONFIG.ENDPOINTS.HAIKUS, { params }),
            '俳句一覧を取得できませんでした'
        );
    }

    /**
     * 特定の俳句を取得
     */
    async getHaiku(id) {
        return this.executeApiCall(
            () => this.makeRequest(`api/haikus/${id}`),
            '俳句を取得できませんでした',
            false // dataプロパティを返さない
        );
    }

    /**
     * 俳句を検索
     */
    async searchHaikus(query) {
        return this.executeApiCall(
            () => this.makeRequest(API_CONFIG.ENDPOINTS.HAIKUS_SEARCH, { params: { q: query } }),
            '俳句検索に失敗しました'
        );
    }

    /**
     * 詠み人一覧を取得
     */
    async getPoets(params = {}) {
        return this.executeApiCall(
            () => this.makeRequest(API_CONFIG.ENDPOINTS.POETS, { params }),
            '詠み人一覧を取得できませんでした'
        );
    }

    /**
     * 詠み人を検索
     */
    async searchPoets(query) {
        return this.executeApiCall(
            () => this.makeRequest(API_CONFIG.ENDPOINTS.POETS_SEARCH, { params: { q: query } }),
            '詠み人検索に失敗しました'
        );
    }

    /**
     * 接続テスト
     */
    async testConnection() {
        try {
            const response = await this.makeRequest('api/test');
            return response.success;
        } catch (error) {
            console.error('❌ 接続テストに失敗:', error);
            return false;
        }
    }

    /**
     * 俳句投稿テスト（おうむ返し）
     */
    async testPostHaiku(postData) {
        return this.executeApiCall(
            () => this.makeRequest('api/haikus/test', {
                method: this.REQUEST_TYPES.POST,
                postData
            }),
            '俳句投稿テストに失敗しました',
            false
        );
    }

    /**
     * 俳句を投稿
     */
    async createHaiku(postData) {
        return this.executeApiCall(
            () => this.makeRequest('api/haikus', {
                method: this.REQUEST_TYPES.POST,
                postData
            }),
            '俳句投稿に失敗しました',
            false
        );
    }

    // =============================================================================
    // ヘルパーメソッド
    // =============================================================================

    /**
     * API呼び出しの統一実行とエラーハンドリング
     */
    async executeApiCall(apiCallFn, errorMessage, returnData = true) {
        try {
            const response = await apiCallFn();
            return returnData ? (response.data || []) : response;
        } catch (error) {
            console.error(`❌ ${errorMessage}:`, error);
            throw new Error(`${errorMessage}: ${error.message}`);
        }
    }

    /**
     * 遅延実行のためのヘルパー関数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// APIクライアントのグローバルインスタンス
const apiClient = new HaikuAPIClient();