/**
 * 俳句鑑賞＆記録アプリ - Google Apps Script API (修正版)
 * メインエントリーポイント - CORS問題解決版
 */

// スプレッドシートID（実際のIDに置き換えてください）
const SPREADSHEET_ID = '1BtAMhFaMeGsklqHeg7fnw5PvPRtyaR-9bOyFe3-7Rc0';

// シート名の定数
const SHEETS = {
  HAIKUS: 'haikus',
  POETS: 'poets'
};

/**
 * Webアプリのメインハンドラー
 * HTTPリクエストを受け取り、適切なAPIエンドポイントにルーティング
 */
function doGet(e) {
  // CORS対応のヘッダーを設定
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  try {
    const path = e.parameter.path || '';
    const method = 'GET';
    
    console.log('受信リクエスト:', method, path, e.parameter);
    
    // ルーティング
    const response = routeRequest(method, path, e.parameter);
    
    const jsonOutput = ContentService.createTextOutput(JSON.stringify(response));
    jsonOutput.setMimeType(ContentService.MimeType.JSON);
    
    // CORSヘッダーを明示的に設定
    Object.keys(headers).forEach(key => {
      jsonOutput.setHeaders = jsonOutput.setHeaders || {};
    });
    
    return jsonOutput;
  } catch (error) {
    console.error('API Error:', error);
    const errorResponse = {
      error: true,
      status: 500,
      message: 'Internal Server Error',
      details: error.message,
      stack: error.stack
    };
    
    const jsonOutput = ContentService.createTextOutput(JSON.stringify(errorResponse));
    jsonOutput.setMimeType(ContentService.MimeType.JSON);
    return jsonOutput;
  }
}

/**
 * POSTリクエストハンドラー
 */
function doPost(e) {
  try {
    const path = e.parameter.path || '';
    const method = 'POST';
    
    console.log('POST Request:', method, path, e.parameter);
    console.log('POST Data:', e.postData);
    
    // POSTデータを解析（x-www-form-urlencoded形式）
    let postData = {};
    if (e.parameter) {
      // URLパラメータからデータを取得
      Object.keys(e.parameter).forEach(key => {
        if (key !== 'path') {
          postData[key] = Array.isArray(e.parameter[key]) ? e.parameter[key][0] : e.parameter[key];
        }
      });
    }
    
    const response = routeRequest(method, path, e.parameter, postData);
    
    // CORS対応でプレーンテキストを返す（参考サイトの方法）
    return ContentService.createTextOutput(JSON.stringify(response));
  } catch (error) {
    console.error('POST API Error:', error);
    const errorResponse = {
      error: true,
      status: 500,
      message: 'Internal Server Error',
      details: error.message,
      stack: error.stack
    };
    
    return ContentService.createTextOutput(JSON.stringify(errorResponse));
  }
}

/**
 * リクエストルーティング
 */
function routeRequest(method, path, params, postData = null) {
  console.log(`${method} ${path}`, params);
  
  // APIパスの解析
  if (path.startsWith('api/')) {
    const apiPath = path.substring(4); // 'api/' を除去
    const pathSegments = apiPath.split('/');
    
    switch (pathSegments[0]) {
      case 'haikus':
        if (method === 'GET') {
          if (pathSegments.length === 1) {
            // GET /api/haikus
            return getHaikus(params);
          } else if (pathSegments[1] === 'map') {
            // GET /api/haikus/map
            return getHaikusForMap(params);
          } else if (pathSegments[1] === 'search') {
            // GET /api/haikus/search
            return searchHaikus(params);
          } else if (pathSegments.length === 2) {
            // GET /api/haikus/{id}
            return getHaiku(pathSegments[1]);
          }
        } else if (method === 'POST') {
          if (pathSegments.length === 1) {
            // POST /api/haikus
            return createHaiku(postData);
          } else if (pathSegments[1] === 'test') {
            // POST /api/haikus/test (おうむ返しテスト)
            return testPost(postData);
          }
        }
        break;
        
      case 'poets':
        if (method === 'GET') {
          if (pathSegments.length === 1) {
            // GET /api/poets
            return getPoets(params);
          } else if (pathSegments[1] === 'search') {
            // GET /api/poets/search
            return searchPoets(params);
          } else if (pathSegments[1] === 'periods') {
            // GET /api/poets/periods
            return getPoetPeriods();
          } else if (pathSegments.length === 2) {
            // GET /api/poets/{id}
            return getPoet(pathSegments[1]);
          } else if (pathSegments.length === 3 && pathSegments[2] === 'haikus') {
            // GET /api/poets/{id}/haikus
            return getPoetHaikus(pathSegments[1]);
          }
        }
        break;
        
      case 'test':
        // テスト用エンドポイント
        return {
          success: true,
          message: 'API is working!',
          timestamp: new Date().toISOString(),
          path: path,
          params: params
        };
        
      default:
        throw new Error(`Endpoint not found: ${path}`);
    }
  }
  
  throw new Error(`Invalid API path: ${path}`);
}

/**
 * スプレッドシートへの接続テスト
 */
function testConnection() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = ss.getSheets();
    
    console.log('スプレッドシート接続成功');
    console.log('利用可能なシート:', sheets.map(sheet => sheet.getName()));
    
    return {
      success: true,
      spreadsheetName: ss.getName(),
      sheets: sheets.map(sheet => sheet.getName())
    };
  } catch (error) {
    console.error('スプレッドシート接続エラー:', error);
    throw new Error('スプレッドシートに接続できません: ' + error.message);
  }
}

/**
 * 簡単なテスト関数
 */
function simpleTest() {
  const testParams = {};
  try {
    const result = getHaikus(testParams);
    console.log('テスト成功:', result);
    return result;
  } catch (error) {
    console.error('テスト失敗:', error);
    return { error: true, message: error.message };
  }
}

/**
 * POSTリクエストのテスト用おうむ返し機能
 */
function testPost(postData) {
  console.log('Test POST received:', postData);
  
  return {
    success: true,
    message: 'POST request received successfully',
    timestamp: new Date().toISOString(),
    receivedData: postData,
    echo: postData // おうむ返し
  };
}

/**
 * 俳句新規作成
 */
function createHaiku(postData) {
  console.log('Creating haiku:', postData);
  
  try {
    // 入力データの検証
    const requiredFields = ['haiku_text', 'poet_name', 'latitude', 'longitude', 'location_type'];
    for (const field of requiredFields) {
      if (!postData[field]) {
        throw new Error(`Required field missing: ${field}`);
      }
    }
    
    // まずはテストとして受信データを返す
    return {
      success: true,
      message: 'Haiku creation request received',
      timestamp: new Date().toISOString(),
      data: postData
    };
    
  } catch (error) {
    console.error('Create haiku error:', error);
    return {
      success: false,
      error: true,
      message: error.message,
      timestamp: new Date().toISOString()
    };
  }
}