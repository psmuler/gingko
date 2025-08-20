// 俳句鑑賞＆記録アプリ - API クライアント

class HaikuAPIClient {
    constructor() {
        this.baseUrl = API_CONFIG.BASE_URL;
        this.timeout = API_CONFIG.TIMEOUT;
        this.retryCount = API_CONFIG.RETRY_COUNT;
    }

    /**
     * APIリクエストを実行
     */
    async makeRequest(endpoint, params = {}) {
        const url = new URL(this.baseUrl);
        url.searchParams.append('path', endpoint);
        
        // パラメータを追加
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                url.searchParams.append(key, params[key]);
            }
        });

        console.log('API Request:', url.toString());

        let lastError;
        
        // リトライ機能付きリクエスト
        for (let attempt = 1; attempt <= this.retryCount; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);

                const response = await fetch(url.toString(), {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    },
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                
                if (data.error) {
                    throw new Error(data.message || 'API Error');
                }

                console.log('API Response:', data);
                return data;

            } catch (error) {
                console.error(`API Request failed (attempt ${attempt}):`, error);
                lastError = error;
                
                // 最後の試行でない場合は少し待機
                if (attempt < this.retryCount) {
                    await this.delay(1000 * attempt);
                }
            }
        }

        throw lastError;
    }

    /**
     * 地図用俳句データを取得
     */
    async getHaikusForMap() {
        try {
            const response = await this.makeRequest(API_CONFIG.ENDPOINTS.HAIKUS_MAP);
            return response.data || [];
        } catch (error) {
            console.error('地図用俳句データの取得に失敗:', error);
            throw new Error('俳句データを取得できませんでした: ' + error.message);
        }
    }

    /**
     * 俳句一覧を取得
     */
    async getHaikus(params = {}) {
        try {
            const response = await this.makeRequest(API_CONFIG.ENDPOINTS.HAIKUS, params);
            return response.data || [];
        } catch (error) {
            console.error('俳句一覧の取得に失敗:', error);
            throw new Error('俳句一覧を取得できませんでした: ' + error.message);
        }
    }

    /**
     * 特定の俳句を取得
     */
    async getHaiku(id) {
        try {
            const response = await this.makeRequest(`api/haikus/${id}`);
            return response.data;
        } catch (error) {
            console.error('俳句の取得に失敗:', error);
            throw new Error('俳句を取得できませんでした: ' + error.message);
        }
    }

    /**
     * 俳句を検索
     */
    async searchHaikus(query) {
        try {
            const response = await this.makeRequest(API_CONFIG.ENDPOINTS.HAIKUS_SEARCH, { q: query });
            return response.data || [];
        } catch (error) {
            console.error('俳句検索に失敗:', error);
            throw new Error('俳句検索に失敗しました: ' + error.message);
        }
    }

    /**
     * 詠み人一覧を取得
     */
    async getPoets(params = {}) {
        try {
            const response = await this.makeRequest(API_CONFIG.ENDPOINTS.POETS, params);
            return response.data || [];
        } catch (error) {
            console.error('詠み人一覧の取得に失敗:', error);
            throw new Error('詠み人一覧を取得できませんでした: ' + error.message);
        }
    }

    /**
     * 詠み人を検索
     */
    async searchPoets(query) {
        try {
            const response = await this.makeRequest(API_CONFIG.ENDPOINTS.POETS_SEARCH, { q: query });
            return response.data || [];
        } catch (error) {
            console.error('詠み人検索に失敗:', error);
            throw new Error('詠み人検索に失敗しました: ' + error.message);
        }
    }

    /**
     * 接続テスト
     */
    async testConnection() {
        try {
            const response = await this.makeRequest('api/test');
            return response.success;
        } catch (error) {
            console.error('接続テストに失敗:', error);
            return false;
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