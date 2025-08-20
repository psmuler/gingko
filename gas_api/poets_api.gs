/**
 * 俳句鑑賞＆記録アプリ - 詠み人API
 * 詠み人データの取得・操作エンドポイント
 */

/**
 * 詠み人一覧取得 API
 * GET /api/poets
 * 
 * クエリパラメータ:
 * - period: 時代区分でフィルタ
 * - limit: 取得件数制限
 * - offset: オフセット（ページネーション用）
 */
function getPoets(params = {}) {
  try {
    console.log('詠み人一覧取得開始:', params);
    
    // フィルタパラメータの抽出
    const filters = {};
    if (params.period) {
      filters.period = params.period;
    }
    
    // データ取得
    let poets = getPoetsData(filters);
    
    // ページネーション処理
    const limit = parseInt(params.limit) || 20; // デフォルト20件
    const offset = parseInt(params.offset) || 0;
    
    const total = poets.length;
    poets = poets.slice(offset, offset + limit);
    
    // 俳句数を含める場合
    if (params.include_haiku_count === 'true') {
      const allHaikus = getHaikusData();
      poets = poets.map(poet => {
        const haikuCount = allHaikus.filter(haiku => haiku.poet_id === poet.id).length;
        return {
          ...poet,
          haiku_count: haikuCount
        };
      });
    }
    
    const response = {
      success: true,
      data: poets,
      meta: {
        total: total,
        limit: limit,
        offset: offset,
        has_more: (offset + limit) < total
      }
    };
    
    console.log(`詠み人一覧取得完了: ${poets.length}件`);
    return response;
    
  } catch (error) {
    console.error('詠み人一覧取得エラー:', error);
    throw new Error('詠み人データの取得に失敗しました: ' + error.message);
  }
}

/**
 * 特定詠み人取得 API
 * GET /api/poets/{id}
 */
function getPoet(poetId) {
  try {
    console.log('詠み人取得開始:', poetId);
    
    const poets = getPoetsData();
    const poet = poets.find(p => p.id === parseInt(poetId));
    
    if (!poet) {
      throw new Error(`詠み人ID ${poetId} は見つかりませんでした`);
    }
    
    const response = {
      success: true,
      data: poet
    };
    
    console.log('詠み人取得完了:', poet.id);
    return response;
    
  } catch (error) {
    console.error('詠み人取得エラー:', error);
    throw error;
  }
}

/**
 * 詠み人の俳句一覧取得 API
 * GET /api/poets/{id}/haikus
 */
function getPoetHaikus(poetId) {
  try {
    console.log('詠み人の俳句一覧取得開始:', poetId);
    
    const result = getHaikusByPoet(poetId);
    
    if (!result.poet) {
      throw new Error(`詠み人ID ${poetId} は見つかりませんでした`);
    }
    
    const response = {
      success: true,
      data: {
        poet: result.poet,
        haikus: result.haikus,
        total_haikus: result.haikus.length
      }
    };
    
    console.log(`詠み人の俳句一覧取得完了: ${result.haikus.length}件`);
    return response;
    
  } catch (error) {
    console.error('詠み人の俳句一覧取得エラー:', error);
    throw error;
  }
}

/**
 * 詠み人検索 API
 * GET /api/poets/search
 * 
 * クエリパラメータ:
 * - q: 検索キーワード（名前、読み仮名で検索）
 * - period: 時代区分で絞り込み
 */
function searchPoets(params = {}) {
  try {
    console.log('詠み人検索開始:', params);
    
    const query = params.q || '';
    const period = params.period || '';
    
    if (!query && !period) {
      throw new Error('検索キーワードを入力してください');
    }
    
    let poets = getPoetsData();
    
    // 検索フィルタリング
    const results = poets.filter(poet => {
      let match = true;
      
      // キーワード検索（名前、読み仮名、略歴）
      if (query) {
        const searchText = (poet.name + ' ' + poet.name_kana + ' ' + poet.biography).toLowerCase();
        match = match && searchText.includes(query.toLowerCase());
      }
      
      // 時代区分検索
      if (period) {
        match = match && poet.period.includes(period);
      }
      
      return match;
    });
    
    // 俳句数を追加
    const allHaikus = getHaikusData();
    const resultsWithCount = results.map(poet => {
      const haikuCount = allHaikus.filter(haiku => haiku.poet_id === poet.id).length;
      return {
        ...poet,
        haiku_count: haikuCount
      };
    });
    
    const response = {
      success: true,
      data: resultsWithCount,
      meta: {
        total: resultsWithCount.length,
        query: query,
        period: period
      }
    };
    
    console.log(`詠み人検索完了: ${resultsWithCount.length}件`);
    return response;
    
  } catch (error) {
    console.error('詠み人検索エラー:', error);
    throw error;
  }
}

/**
 * 時代区分一覧取得 API
 * GET /api/poets/periods
 */
function getPoetPeriods() {
  try {
    console.log('時代区分一覧取得開始');
    
    const poets = getPoetsData();
    const periods = [...new Set(poets.map(poet => poet.period))].filter(period => period);
    
    // 各時代の詠み人数をカウント
    const periodCounts = periods.map(period => {
      const count = poets.filter(poet => poet.period === period).length;
      return {
        period: period,
        poet_count: count
      };
    });
    
    const response = {
      success: true,
      data: periodCounts
    };
    
    console.log(`時代区分一覧取得完了: ${periods.length}区分`);
    return response;
    
  } catch (error) {
    console.error('時代区分一覧取得エラー:', error);
    throw new Error('時代区分データの取得に失敗しました: ' + error.message);
  }
}