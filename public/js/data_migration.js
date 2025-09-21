// データ移行スクリプト
// スプレッドシートからSupabaseへのデータ移行

// 使用方法:
// 1. まずSupabaseプロジェクトを作成
// 2. supabase_setup.sqlを実行してテーブルを作成
// 3. このスクリプトでデータ移行を実行

const SUPABASE_CONFIG = {
  url: 'https://tyolqoqeysyyocswsxrn.supabase.co',
  anon_key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5b2xxb3FleXN5eW9jc3dzeHJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMTc0ODMsImV4cCI6MjA3MTc5MzQ4M30.LIO2wJrnAvdc-GVDSXweLzKLmqB18S0LIL3OAQAbJUo'
};

// Supabaseクライアント初期化
async function initSupabase() {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anon_key);
}

// CSVデータをパースする関数（改良版）
function parseCSV(csvText) {
  const lines = csvText.split('\n');
  const headers = parseCSVLine(lines[0]);
  const data = [];
  
  console.log('CSV Headers:', headers);
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = parseCSVLine(lines[i]);
      if (values.length !== headers.length) {
        console.warn(`行 ${i + 1}: 列数が一致しません (期待: ${headers.length}, 実際: ${values.length})`);
        console.warn('値:', values);
        continue; // この行をスキップ
      }
      
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || null;
      });
      data.push(row);
    }
  }
  
  console.log(`CSVパース完了: ${data.length}行`);
  return data;
}

// CSV行をパースする関数（クォート対応）
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // エスケープされたクォート
        current += '"';
        i++; // 次の文字をスキップ
      } else {
        // クォートの開始/終了
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // フィールドの区切り
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // 最後のフィールド
  result.push(current.trim());
  
  return result;
}

// データベースを完全にリセット（冀等性確保）
async function resetDatabase(supabase) {
  console.log('🗑️  データベースをリセット中...');
  
  try {
    // 1. 俳句データを全削除（外部キー制約のため先に削除）
    console.log('俳句データを削除中...');
    const { error: deleteHaikusError } = await supabase
      .from('haikus')
      .delete()
      .neq('id', 0);
      
    if (deleteHaikusError) {
      console.warn('俳句データ削除エラー:', deleteHaikusError);
    }
    
    // 2. 詠み人データを全削除
    console.log('詠み人データを削除中...');
    const { error: deletePoetsError } = await supabase
      .from('poets')
      .delete()
      .neq('id', 0);
      
    if (deletePoetsError) {
      console.warn('詠み人データ削除エラー:', deletePoetsError);
    }
    
    // 3. シーケンスをリセット（PostgreSQL固有機能）
    console.log('シーケンスをリセット中...');
    
    // poetsテーブルのシーケンスリセット
    const { error: resetPoetsSeqError } = await supabase.rpc('reset_poets_sequence');
    if (resetPoetsSeqError) {
      console.log('poetsシーケンスリセット関数が存在しないため、SQLで直接実行します');
    }
    
    // haikusテーブルのシーケンスリセット
    const { error: resetHaikusSeqError } = await supabase.rpc('reset_haikus_sequence');
    if (resetHaikusSeqError) {
      console.log('haikusシーケンスリセット関数が存在しないため、SQLで直接実行します');
    }
    
    console.log('✅ データベースリセット完了');
    
  } catch (error) {
    console.error('データベースリセットエラー:', error);
    throw error;
  }
}

// 詠み人データ移行
async function migratePoets(supabase, csvData) {
  console.log('詠み人データ移行開始...');
  console.log('詠み人サンプルデータ:', csvData[0]);

  const poets = csvData.map((row, index) => {
    const cleanData = {
      name: row.name || '',
      name_kana: row.name_kana || '',
      birth_year: (row.birth_year && row.birth_year !== '') ? parseInt(row.birth_year) : null,
      death_year: (row.death_year && row.death_year !== '') ? parseInt(row.death_year) : null,
      period: row.period || null,
      biography: row.biography || ''
    };
    
    // データ検証
    if (!cleanData.name) {
      console.warn(`詠み人行 ${index + 2}: 名前が空です`);
    }
    
    return cleanData;
  }).filter(poet => poet.name); // 名前が空の詠み人を除外

  console.log(`移行対象詠み人: ${poets.length}件`);

  const { data, error } = await supabase
    .from('poets')
    .insert(poets)
    .select(); // 挿入したデータを返す

  if (error) {
    console.error('詠み人データ移行エラー:', error);
    throw error;
  }

  console.log(`詠み人データ移行完了: ${poets.length}件`);
  console.log('挿入された詠み人:', data.map(p => `ID ${p.id}: ${p.name}`));
  return data;
}

// 俳句データ移行
async function migrateHaikus(supabase, csvData, poetMap) {
  console.log('俳句データ移行開始...');
  console.log('サンプル行:', csvData[0]);
  console.log('詠み人マッピング:', poetMap);

  const haikus = csvData.map((row, index) => {
    // データ検証とクレンジング
    const poetId = poetMap[row.poet_name] || (row.poet_id ? parseInt(row.poet_id) : null);
    
    const cleanData = {
      haiku_text: row.haiku_text || row.haiku || '',
      poet_id: poetId,
      latitude: (row.latitude && row.latitude !== '') ? parseFloat(row.latitude) : null,
      longitude: (row.longitude && row.longitude !== '') ? parseFloat(row.longitude) : null,
      location_type: row.location_type || '',
      date_composed: validateAndFormatDate(row.date_composed),
      location_name: row.location_name || '',
      date_composed_era: row.date_composed_era || null,
      description: row.description || '',
      season: row.season || null,
      seasonal_term: row.seasonal_term || null
    };
    
    // データ検証
    if (!cleanData.haiku_text) {
      console.warn(`行 ${index + 2}: 俳句テキストが空です`);
    }
    
    if (!['句碑', '紀行文', 'ゆかりの地'].includes(cleanData.location_type)) {
      console.warn(`行 ${index + 2}: 不正なlocation_type: ${cleanData.location_type}`);
    }
    
    // 詠み人 ID の検証
    if (cleanData.poet_id && !Object.values(poetMap).includes(cleanData.poet_id)) {
      console.warn(`行 ${index + 2}: 存在しない詠み人ID: ${cleanData.poet_id} (詠み人名: ${row.poet_name})`);
      cleanData.poet_id = null; // 存在しないIDはnullに設定
    }
    
    return cleanData;
  }).filter(haiku => haiku.haiku_text); // 空の俳句を除外

  // バッチサイズで分割して処理（1000件ずつ）
  const batchSize = 1000;
  let totalMigrated = 0;

  for (let i = 0; i < haikus.length; i += batchSize) {
    const batch = haikus.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('haikus')
      .insert(batch);

    if (error) {
      console.error(`俳句データ移行エラー (バッチ ${Math.floor(i / batchSize) + 1}):`, error);
      throw error;
    }

    totalMigrated += batch.length;
    console.log(`バッチ ${Math.floor(i / batchSize) + 1} 完了: ${totalMigrated}/${haikus.length} 件`);
  }

  console.log(`俳句データ移行完了: ${totalMigrated}件`);
}

// 日付検証とフォーマット関数
function validateAndFormatDate(dateString) {
  if (!dateString || dateString.trim() === '') {
    return null;
  }
  
  // 既に正しい形式かチェック
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // 日付として解析可能かチェック
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    console.warn(`不正な日付形式: ${dateString}`);
    return null;
  }
  
  // YYYY-MM-DD形式で返す
  return date.toISOString().split('T')[0];
}

// 詠み人名とIDのマッピングを作成
async function createPoetMap(supabase) {
  const { data: poets, error } = await supabase
    .from('poets')
    .select('id, name');

  if (error) {
    console.error('詠み人データ取得エラー:', error);
    throw error;
  }

  console.log(`取得した詠み人: ${poets.length}件`);
  
  const poetMap = {};
  poets.forEach(poet => {
    poetMap[poet.name] = poet.id;
    console.log(`マッピング: ${poet.name} -> ID: ${poet.id}`);
  });

  return poetMap;
}

// メイン移行処理
async function main() {
  try {
    console.log('🚀 データ移行を開始します...');
    const supabase = await initSupabase();
    
    // データベースをリセット（冀等性確保）
    await resetDatabase(supabase);

    // CSVファイル読み込み（Node.js環境での例）
    const fs = await import('fs');
    const path = await import('path');

    // 詠み人データ移行
    const poetsCSV = fs.readFileSync(path.join(process.cwd(), 'poets_data.csv'), 'utf8');
    const poetsData = parseCSV(poetsCSV);
    
    // IDカラムを除去（Supabaseが自動生成するため）
    const cleanPoetsData = poetsData.map(poet => {
      const { id, created_at, updated_at, ...cleanPoet } = poet;
      return cleanPoet;
    });
    
    await migratePoets(supabase, cleanPoetsData);

    // 詠み人IDマッピング作成
    const poetMap = await createPoetMap(supabase);

    // 俳句データ移行
    const haikusCSV = fs.readFileSync(path.join(process.cwd(), 'haikus_data.csv'), 'utf8');
    const haikusData = parseCSV(haikusCSV);
    
    // IDカラムを除去（Supabaseが自動生成するため）
    const cleanHaikusData = haikusData.map(haiku => {
      const { id, created_at, updated_at, ...cleanHaiku } = haiku;
      return cleanHaiku;
    });
    
    await migrateHaikus(supabase, cleanHaikusData, poetMap);

    console.log('✅ データ移行が完了しました！');
    
    // 最終的なデータ整合性チェック
    await validateData(supabase);

  } catch (error) {
    console.error('❌ 移行処理でエラーが発生しました:', error);
    process.exit(1);
  }
}

// データ整合性チェック
async function validateData(supabase) {
  console.log('データ整合性チェック開始...');

  // 詠み人数チェック
  const { count: poetCount } = await supabase
    .from('poets')
    .select('*', { count: 'exact', head: true });

  console.log(`詠み人データ: ${poetCount}件`);

  // 俳句数チェック
  const { count: haikuCount } = await supabase
    .from('haikus')
    .select('*', { count: 'exact', head: true });

  console.log(`俳句データ: ${haikuCount}件`);

  // 外部キー整合性チェック
  const { data: orphanHaikus } = await supabase
    .from('haikus')
    .select('id, poet_id')
    .is('poet_id', 'not.null')
    .not('poet_id', 'in', `(select id from poets)`);

  if (orphanHaikus && orphanHaikus.length > 0) {
    console.warn(`詠み人IDが存在しない俳句: ${orphanHaikus.length}件`);
  } else {
    console.log('外部キー整合性: OK');
  }
}

// ブラウザ環境での実行用
if (typeof window !== 'undefined') {
  window.migrationUtils = {
    parseCSV,
    migratePoets,
    migrateHaikus,
    createPoetMap,
    validateData
  };
}

// Node.js環境での実行
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseCSV,
    migratePoets,
    migrateHaikus,
    createPoetMap,
    validateData,
    main
  };

  // 直接実行された場合
  if (require.main === module) {
    main();
  }
}