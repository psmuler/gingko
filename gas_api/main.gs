/**
 * 俳句鑑賞＆記録アプリ - Google Apps Script API
 * リファクタリング版 - パフォーマンス最適化と可読性向上
 */

// =============================================================================
// 設定定数
// =============================================================================

const SPREADSHEET_ID = '1BtAMhFaMeGsklqHeg7fnw5PvPRtyaR-9bOyFe3-7Rc0';

const SHEETS = {
  HAIKUS: 'haikus',
  POETS: 'poets'
};

const RESPONSE_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

const HTTP_STATUS = {
  OK: 200,
  INTERNAL_SERVER_ERROR: 500
};

// =============================================================================
// メインエントリーポイント
// =============================================================================

/**
 * GETリクエストハンドラー
 */
function doGet(e) {
  return handleRequest('GET', e);
}

/**
 * POSTリクエストハンドラー
 */
function doPost(e) {
  return handleRequest('POST', e);
}

/**
 * 統合リクエストハンドラー
 */
function handleRequest(method, e) {
  try {
    const requestData = parseRequestData(method, e);
    const response = routeRequest(method, requestData.path, requestData.params, requestData.postData);
    
    return createSuccessResponse(response);
  } catch (error) {
    console.error('❌ API Error:', error);
    return createErrorResponse(error);
  }
}

/**
 * リクエストデータの解析
 */
function parseRequestData(method, e) {
  const path = e.parameter.path || '';
  const params = e.parameter || {};
  
  let postData = null;
  if (method === 'POST' && e.parameter) {
    postData = {};
    Object.keys(e.parameter).forEach(key => {
      if (key !== 'path') {
        postData[key] = Array.isArray(e.parameter[key]) ? e.parameter[key][0] : e.parameter[key];
      }
    });
  }
  
  console.log(`📨 ${method} Request:`, path, params);
  if (postData) console.log('📤 POST Data:', postData);
  
  return { path, params, postData };
}

/**
 * 成功レスポンスの作成
 */
function createSuccessResponse(response) {
  const jsonOutput = ContentService.createTextOutput(JSON.stringify(response));
  jsonOutput.setMimeType(ContentService.MimeType.JSON);
  return jsonOutput;
}

/**
 * エラーレスポンスの作成
 */
function createErrorResponse(error) {
  const errorResponse = {
    error: true,
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: 'Internal Server Error',
    details: error.message,
    timestamp: new Date().toISOString()
  };
  
  return ContentService.createTextOutput(JSON.stringify(errorResponse));
}

// =============================================================================
// スプレッドシート操作ユーティリティ
// =============================================================================

/**
 * スプレッドシートインスタンスのキャッシュ
 */
let _spreadsheetCache = null;

/**
 * スプレッドシート取得（キャッシュ付き）
 */
function getSpreadsheet() {
  if (!_spreadsheetCache) {
    _spreadsheetCache = SpreadsheetApp.openById(SPREADSHEET_ID);
    console.log('📊 スプレッドシート接続済み:', _spreadsheetCache.getName());
  }
  return _spreadsheetCache;
}

/**
 * シート取得（キャッシュ付き）
 */
function getSheet(sheetName) {
  const spreadsheet = getSpreadsheet();
  const sheet = spreadsheet.getSheetByName(sheetName);
  
  if (!sheet) {
    throw new Error(`シート '${sheetName}' が見つかりません`);
  }
  
  return sheet;
}

/**
 * 全データ取得（パフォーマンス最適化版）
 */
function getAllData(sheetName) {
  const sheet = getSheet(sheetName);
  const range = sheet.getDataRange();
  
  if (range.getNumRows() <= 1) {
    return []; // ヘッダーのみまたは空の場合
  }
  
  return range.getValues();
}

/**
 * 列マップ取得（キャッシュ付き）
 */
const _columnMapCache = new Map();

function getColumnMap(sheet) {
  const sheetName = sheet.getName();
  
  if (!_columnMapCache.has(sheetName)) {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const columnMap = {};
    
    headers.forEach((header, index) => {
      columnMap[header] = index + 1;
    });
    
    _columnMapCache.set(sheetName, columnMap);
    console.log(`📋 列マップ作成: ${sheetName}`, Object.keys(columnMap));
  }
  
  return _columnMapCache.get(sheetName);
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
 * スプレッドシートの列名から列インデックスを取得
 */
function getColumnIndexByName(sheet, columnName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const columnIndex = headers.indexOf(columnName);
  if (columnIndex === -1) {
    throw new Error(`列 '${columnName}' が見つかりません`);
  }
  return columnIndex + 1; // 1ベースのインデックス
}

/**
 * スプレッドシートの列名マップを取得
 */
function getColumnMap(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const columnMap = {};
  headers.forEach((header, index) => {
    columnMap[header] = index + 1; // 1ベースのインデックス
  });
  return columnMap;
}

/**
 * 列名を使って行データを構築
 */
function buildRowFromColumnMap(columnMap, dataObject) {
  const row = new Array(Object.keys(columnMap).length);
  Object.keys(dataObject).forEach(key => {
    if (columnMap[key]) {
      row[columnMap[key] - 1] = dataObject[key]; // 0ベースに変換
    }
  });
  return row;
}

// =============================================================================
// 詠み人管理（最適化版）
// =============================================================================

/**
 * 詠み人を取得または新規作成（最適化版）
 */
function getOrCreatePoet(poetName) {
  const poetSheet = getSheet(SHEETS.POETS);
  const existingPoetId = findExistingPoet(poetSheet, poetName);
  
  return existingPoetId !== null ? existingPoetId : createNewPoet(poetSheet, poetName);
}

/**
 * 既存詠み人の検索
 */
function findExistingPoet(poetSheet, poetName) {
  const data = getAllData(SHEETS.POETS);
  const columnMap = getColumnMap(poetSheet);
  const nameColumnIndex = columnMap['name'] - 1;
  const idColumnIndex = columnMap['id'] - 1;
  
  // ヘッダー行をスキップして検索
  for (let i = 1; i < data.length; i++) {
    if (data[i][nameColumnIndex] === poetName) {
      console.log(`🔍 既存詠み人発見: ${poetName} (ID: ${data[i][idColumnIndex]})`);
      return data[i][idColumnIndex];
    }
  }
  
  return null;
}

/**
 * 新規詠み人作成
 */
function createNewPoet(poetSheet, poetName) {
  const columnMap = getColumnMap(poetSheet);
  const newPoetId = generateNewPoetId(poetSheet);
  const now = new Date();
  
  const poetRowData = {
    'id': newPoetId,
    'name': poetName,
    'name_kana': '',
    'birth_year': '',
    'death_year': '',
    'period': '現代',
    'biography': '',
    'created_at': now,
    'updated_at': now
  };
  
  const row = buildRowFromColumnMap(columnMap, poetRowData);
  poetSheet.appendRow(row);
  
  console.log(`✨ 新規詠み人作成: ${poetName} (ID: ${newPoetId})`);
  return newPoetId;
}

/**
 * 俳句の新しいIDを生成
 */
function generateNewHaikuId(haikuSheet) {
  const data = haikuSheet.getDataRange().getValues();
  if (data.length <= 1) { // ヘッダーのみ
    return 1;
  }
  
  const columnMap = getColumnMap(haikuSheet);
  const idColumnIndex = columnMap['id'] - 1;
  
  let maxId = 0;
  for (let i = 1; i < data.length; i++) {
    const id = parseInt(data[i][idColumnIndex]);
    if (!isNaN(id) && id > maxId) {
      maxId = id;
    }
  }
  
  return maxId + 1;
}

/**
 * 詠み人の新しいIDを生成
 */
function generateNewPoetId(poetSheet) {
  const data = poetSheet.getDataRange().getValues();
  if (data.length <= 1) { // ヘッダーのみ
    return 1;
  }
  
  const columnMap = getColumnMap(poetSheet);
  const idColumnIndex = columnMap['id'] - 1;
  
  let maxId = 0;
  for (let i = 1; i < data.length; i++) {
    const id = parseInt(data[i][idColumnIndex]);
    if (!isNaN(id) && id > maxId) {
      maxId = id;
    }
  }
  
  return maxId + 1;
}

// =============================================================================
// データ検証ユーティリティ
// =============================================================================

/**
 * 俳句データの検証
 */
function validateHaikuData(postData) {
  const requiredFields = ['haiku_text', 'poet_name', 'latitude', 'longitude', 'location_type'];
  
  // 必須フィールドチェック
  for (const field of requiredFields) {
    if (!postData[field] || postData[field].toString().trim() === '') {
      throw new Error(`必須フィールドが未入力です: ${field}`);
    }
  }
  
  // 数値データの検証
  const latitude = parseFloat(postData.latitude);
  const longitude = parseFloat(postData.longitude);
  
  if (isNaN(latitude) || isNaN(longitude)) {
    throw new Error('緯度・経度は数値で入力してください');
  }
  
  if (latitude < -90 || latitude > 90) {
    throw new Error('緯度は-90から90の間で入力してください');
  }
  
  if (longitude < -180 || longitude > 180) {
    throw new Error('経度は-180から180の間で入力してください');
  }
  
  // 場所種別の検証
  const validLocationTypes = ['句碑', '紀行文', 'ゆかりの地'];
  if (!validLocationTypes.includes(postData.location_type)) {
    throw new Error('無効な場所種別です');
  }
  
  return { latitude, longitude };
}

// =============================================================================
// 俳句作成処理
// =============================================================================

/**
 * 俳句新規作成（最適化版）
 */
function createHaiku(postData) {
  console.log('🎋 俳句作成開始:', postData);
  
  try {
    // データ検証
    const { latitude, longitude } = validateHaikuData(postData);
    
    // 詠み人の確認・作成
    const poetId = getOrCreatePoet(postData.poet_name);
    
    // 俳句データの挿入
    const newId = insertHaikuData(postData, poetId, latitude, longitude);
    
    const result = {
      success: true,
      message: '俳句を投稿しました',
      data: buildHaikuResponse(newId, postData, latitude, longitude),
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ 俳句作成完了:', `ID=${newId}`);
    return result;
    
  } catch (error) {
    console.error('❌ 俳句作成エラー:', error);
    return {
      success: false,
      error: true,
      message: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 俳句データをスプレッドシートに挿入
 */
function insertHaikuData(postData, poetId, latitude, longitude) {
  const haikuSheet = getSheet(SHEETS.HAIKUS);
  const columnMap = getColumnMap(haikuSheet);
  const newId = generateNewHaikuId(haikuSheet);
  const now = new Date();
  
  const haikuRowData = {
    'id': newId,
    'haiku_text': postData.haiku_text.trim(),
    'poet_id': poetId,
    'latitude': latitude,
    'longitude': longitude,
    'location_type': postData.location_type,
    'date_composed': postData.date_composed || '',
    'location_name': postData.location_name || '',
    'description': postData.description || '',
    'created_at': now,
    'updated_at': now
  };
  
  const row = buildRowFromColumnMap(columnMap, haikuRowData);
  haikuSheet.appendRow(row);
  
  return newId;
}

/**
 * 俳句レスポンスデータの構築
 */
function buildHaikuResponse(id, postData, latitude, longitude) {
  return {
    id: id,
    haiku_text: postData.haiku_text.trim(),
    poet_name: postData.poet_name,
    location_name: postData.location_name || '',
    location_type: postData.location_type,
    latitude: latitude,
    longitude: longitude
  };
}