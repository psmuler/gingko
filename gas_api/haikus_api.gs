/**
 * 俳句鑑賞＆記録アプリ - 俳句API
 * 俳句データの取得・操作エンドポイント
 */

/**
 * 俳句一覧取得 API
 * GET /api/haikus
 * 
 * クエリパラメータ:
 * - poet_id: 詠み人IDでフィルタ
 * - location_type: 場所種別でフィルタ（句碑/紀行文/ゆかりの地）
 * - limit: 取得件数制限
 * - offset: オフセット（ページネーション用）
 */
function getHaikus(params = {}) {
  try {
    console.log('俳句一覧取得開始:', params);
    
    // フィルタパラメータの抽出
    const filters = {};
    if (params.poet_id) {
      filters.poet_id = params.poet_id;
    }
    if (params.location_type) {
      filters.location_type = params.location_type;
    }
    
    // データ取得
    let haikus = getHaikusData(filters);
    
    // ページネーション処理
    const limit = parseInt(params.limit) || 50; // デフォルト50件
    const offset = parseInt(params.offset) || 0;
    
    const total = haikus.length;
    haikus = haikus.slice(offset, offset + limit);
    
    // 詠み人情報を結合
    if (params.include_poet === 'true') {
      const poets = getPoetsData();
      haikus = haikus.map(haiku => {
        const poet = poets.find(p => p.id === haiku.poet_id);
        return {
          ...haiku,
          poet: poet || null
        };
      });
    }
    
    const response = {
      success: true,
      data: haikus,
      meta: {
        total: total,
        limit: limit,
        offset: offset,
        has_more: (offset + limit) < total
      }
    };
    
    console.log(`俳句一覧取得完了: ${haikus.length}件`);
    return response;
    
  } catch (error) {
    console.error('俳句一覧取得エラー:', error);
    throw new Error('俳句データの取得に失敗しました: ' + error.message);
  }
}

/**
 * 特定俳句取得 API
 * GET /api/haikus/{id}
 */
function getHaiku(haikuId) {
  try {
    console.log('俳句取得開始:', haikuId);
    
    const haiku = getHaikuWithPoet(haikuId);
    
    if (!haiku) {
      throw new Error(`俳句ID ${haikuId} は見つかりませんでした`);
    }
    
    const response = {
      success: true,
      data: haiku
    };
    
    console.log('俳句取得完了:', haiku.id);
    return response;
    
  } catch (error) {
    console.error('俳句取得エラー:', error);
    throw error;
  }
}

/**
 * 地図用俳句データ取得 API
 * GET /api/haikus/map
 * 
 * 地図表示に最適化されたデータ形式で返す
 */
function getHaikusForMap(params = {}) {
  try {
    console.log('地図用俳句データ取得開始');
    
    // 基本的な俳句データを取得
    let haikus = getHaikusData();
    const poets = getPoetsData();
    
    // 地図表示用に最適化
    const mapData = haikus.map(haiku => {
      const poet = poets.find(p => p.id === haiku.poet_id);
      
      return {
        id: haiku.id,
        latitude: haiku.latitude,
        longitude: haiku.longitude,
        location_type: haiku.location_type,
        location_name: haiku.location_name,
        haiku_text: haiku.haiku_text,
        poet_name: poet ? poet.name : '不明',
        poet_id: haiku.poet_id,
        description: haiku.description
      };
    }).filter(item => {
      // 緯度・経度が有効なもののみ
      return item.latitude !== 0 && item.longitude !== 0;
    });
    
    const response = {
      success: true,
      data: mapData,
      meta: {
        total: mapData.length
      }
    };
    
    console.log(`地図用俳句データ取得完了: ${mapData.length}件`);
    return response;
    
  } catch (error) {
    console.error('地図用俳句データ取得エラー:', error);
    throw new Error('地図用データの取得に失敗しました: ' + error.message);
  }
}

/**
 * 俳句検索 API
 * GET /api/haikus/search
 * 
 * クエリパラメータ:
 * - q: 検索キーワード（俳句本文、場所名で検索）
 * - poet_name: 詠み人名で検索
 */
function searchHaikus(params = {}) {
  try {
    console.log('俳句検索開始:', params);
    
    const query = params.q || '';
    const poetName = params.poet_name || '';
    
    if (!query && !poetName) {
      throw new Error('検索キーワードを入力してください');
    }
    
    let haikus = getHaikusData();
    const poets = getPoetsData();
    
    // 詠み人情報を結合
    haikus = haikus.map(haiku => {
      const poet = poets.find(p => p.id === haiku.poet_id);
      return {
        ...haiku,
        poet: poet || null
      };
    });
    
    // 検索フィルタリング
    const results = haikus.filter(haiku => {
      let match = true;
      
      // キーワード検索（俳句本文、場所名）
      if (query) {
        const searchText = (haiku.haiku_text + ' ' + haiku.location_name).toLowerCase();
        match = match && searchText.includes(query.toLowerCase());
      }
      
      // 詠み人名検索
      if (poetName && haiku.poet) {
        const poetSearchText = (haiku.poet.name + ' ' + haiku.poet.name_kana).toLowerCase();
        match = match && poetSearchText.includes(poetName.toLowerCase());
      }
      
      return match;
    });
    
    const response = {
      success: true,
      data: results,
      meta: {
        total: results.length,
        query: query,
        poet_name: poetName
      }
    };
    
    console.log(`俳句検索完了: ${results.length}件`);
    return response;
    
  } catch (error) {
    console.error('俳句検索エラー:', error);
    throw error;
  }
}