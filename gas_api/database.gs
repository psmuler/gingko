/**
 * 俳句鑑賞＆記録アプリ - データベース操作
 * スプレッドシートとの接続とデータ操作を担当
 */

/**
 * スプレッドシートオブジェクトを取得
 */
function getSpreadsheet() {
  try {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (error) {
    throw new Error('スプレッドシートを開けません: ' + error.message);
  }
}

/**
 * 指定されたシートを取得
 */
function getSheet(sheetName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    throw new Error(`シート '${sheetName}' が見つかりません`);
  }
  
  return sheet;
}

/**
 * シートのデータをJSON配列として取得
 */
function getSheetData(sheetName) {
  const sheet = getSheet(sheetName);
  const range = sheet.getDataRange();
  const values = range.getValues();
  
  if (values.length === 0) {
    return [];
  }
  
  // 1行目をヘッダーとして使用
  const headers = values[0];
  const data = [];
  
  // 2行目以降をデータとして処理
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const item = {};
    
    headers.forEach((header, index) => {
      item[header] = row[index] || null;
    });
    
    data.push(item);
  }
  
  return data;
}

/**
 * 俳句データの取得とフォーマット
 */
function getHaikusData(filters = {}) {
  const rawData = getSheetData(SHEETS.HAIKUS);
  
  return rawData.map(row => {
    return {
      id: parseInt(row.id) || 0,
      haiku_text: row.haiku_text || '',
      poet_id: parseInt(row.poet_id) || 0,
      latitude: parseFloat(row.latitude) || 0,
      longitude: parseFloat(row.longitude) || 0,
      location_type: row.location_type || '',
      date_composed: formatDate(row.date_composed),
      location_name: row.location_name || '',
      description: row.description || '',
      created_at: formatDateTime(row.created_at),
      updated_at: formatDateTime(row.updated_at)
    };
  }).filter(haiku => {
    // フィルタリング処理
    if (filters.poet_id && haiku.poet_id !== parseInt(filters.poet_id)) {
      return false;
    }
    
    if (filters.location_type && haiku.location_type !== filters.location_type) {
      return false;
    }
    
    return true;
  });
}

/**
 * 詠み人データの取得とフォーマット
 */
function getPoetsData(filters = {}) {
  const rawData = getSheetData(SHEETS.POETS);
  
  return rawData.map(row => {
    return {
      id: parseInt(row.id) || 0,
      name: row.name || '',
      name_kana: row.name_kana || '',
      birth_year: parseInt(row.birth_year) || null,
      death_year: parseInt(row.death_year) || null,
      period: row.period || '',
      biography: row.biography || '',
      created_at: formatDateTime(row.created_at),
      updated_at: formatDateTime(row.updated_at)
    };
  }).filter(poet => {
    // フィルタリング処理
    if (filters.period && poet.period !== filters.period) {
      return false;
    }
    
    return true;
  });
}

/**
 * 特定の俳句を詠み人情報と結合して取得
 */
function getHaikuWithPoet(haikuId) {
  const haikus = getHaikusData();
  const poets = getPoetsData();
  
  const haiku = haikus.find(h => h.id === parseInt(haikuId));
  if (!haiku) {
    return null;
  }
  
  const poet = poets.find(p => p.id === haiku.poet_id);
  
  return {
    ...haiku,
    poet: poet || null
  };
}

/**
 * 特定の詠み人の俳句一覧を取得
 */
function getHaikusByPoet(poetId) {
  const haikus = getHaikusData({ poet_id: poetId });
  const poets = getPoetsData();
  
  const poet = poets.find(p => p.id === parseInt(poetId));
  
  return {
    poet: poet || null,
    haikus: haikus
  };
}

/**
 * 日付フォーマット関数
 */
function formatDate(dateValue) {
  if (!dateValue) return null;
  
  try {
    if (dateValue instanceof Date) {
      return Utilities.formatDate(dateValue, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    } else if (typeof dateValue === 'string') {
      // 文字列の場合はそのまま返す（既にフォーマット済みと仮定）
      return dateValue;
    }
  } catch (error) {
    console.error('日付フォーマットエラー:', error);
  }
  
  return null;
}

/**
 * 日時フォーマット関数
 */
function formatDateTime(dateTimeValue) {
  if (!dateTimeValue) return null;
  
  try {
    if (dateTimeValue instanceof Date) {
      return Utilities.formatDate(dateTimeValue, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    } else if (typeof dateTimeValue === 'string') {
      return dateTimeValue;
    }
  } catch (error) {
    console.error('日時フォーマットエラー:', error);
  }
  
  return null;
}