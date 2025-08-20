/**
 * 俳句鑑賞＆記録アプリ - Google Apps Script API
 * メインエントリーポイント
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
  try {
    const path = e.parameter.path || '';
    const method = 'GET';
    
    // ルーティング
    const response = routeRequest(method, path, e.parameter);
    
    return createJsonResponse(response);
  } catch (error) {
    console.error('API Error:', error);
    return createErrorResponse(500, 'Internal Server Error', error.message);
  }
}

/**
 * POSTリクエストハンドラー
 */
function doPost(e) {
  try {
    const path = e.parameter.path || '';
    const method = 'POST';
    
    // POSTデータを解析
    let postData = {};
    if (e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
    }
    
    const response = routeRequest(method, path, e.parameter, postData);
    
    return createJsonResponse(response);
  } catch (error) {
    console.error('API Error:', error);
    return createErrorResponse(500, 'Internal Server Error', error.message);
  }
}

/**
 * OPTIONSリクエストハンドラー（CORS プリフライト対応）
 */
function doOptions(e) {
  const response = ContentService.createTextOutput('');
  response.setHeaders({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  return response;
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
        
      default:
        throw new Error(`Endpoint not found: ${path}`);
    }
  }
  
  throw new Error(`Invalid API path: ${path}`);
}

/**
 * JSON レスポンス作成
 */
function createJsonResponse(data) {
  const response = ContentService.createTextOutput(JSON.stringify(data));
  response.setMimeType(ContentService.MimeType.JSON);
  
  // CORS ヘッダーを設定
  response.setHeaders({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  
  return response;
}

/**
 * エラーレスポンス作成
 */
function createErrorResponse(statusCode, message, details = null) {
  const errorData = {
    error: true,
    status: statusCode,
    message: message
  };
  
  if (details) {
    errorData.details = details;
  }
  
  return createJsonResponse(errorData);
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