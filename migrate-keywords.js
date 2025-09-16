/**
 * keywords.csvからSupabaseへの季語データ移行スクリプト
 * 季語データのみを抽出してkeywordsテーブルに挿入
 */

// Node.js環境での実行を想定（ES Module）
// 必要パッケージ: @supabase/supabase-js, csv-parser, dotenv
import fs from 'fs';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Supabase設定（環境変数から読み込み）
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

/**
 * CSVファイルを読み込んで季語データを抽出
 * @returns {Promise<Array>} 季語データの配列
 */
async function readKigoDataFromCSV() {
    return new Promise((resolve, reject) => {
        const kigoData = [];

        fs.createReadStream('keywords.csv')
            .pipe(csv())
            .on('data', (row) => {
                // 季語データのみを抽出（type = '季語'）
                if (row.type === '季語') {
                    // display_name_alternativesをJSON配列に変換
                    let alternatives = [];
                    if (row.display_name_alternatives && row.display_name_alternatives.trim()) {
                        alternatives = row.display_name_alternatives
                            .split(',')
                            .map(alt => alt.trim())
                            .filter(alt => alt.length > 0);
                    }

                    kigoData.push({
                        display_name: row.display_name,
                        display_name_alternatives: alternatives,
                        type: row.type,
                        season: row.season || null,
                        description: row.description || null
                    });
                }
            })
            .on('end', () => {
                console.log(`✅ CSV読み込み完了: ${kigoData.length}件の季語データ`);
                resolve(kigoData);
            })
            .on('error', (error) => {
                console.error('❌ CSV読み込みエラー:', error);
                reject(error);
            });
    });
}

/**
 * Supabaseのkeywordsテーブルに季語データを挿入
 * @param {Array} kigoData - 季語データの配列
 */
async function insertKigoDataToSupabase(kigoData) {
    console.log(`🚀 Supabaseへの季語データ挿入開始: ${kigoData.length}件`);

    // バッチサイズ（Supabaseの制限に合わせて調整）
    const batchSize = 100;
    let insertedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < kigoData.length; i += batchSize) {
        const batch = kigoData.slice(i, i + batchSize);

        try {
            console.log(`📤 バッチ処理中: ${i + 1} - ${Math.min(i + batchSize, kigoData.length)} / ${kigoData.length}`);

            const { error } = await supabase
                .from('keywords')
                .insert(batch);

            if (error) {
                console.error(`❌ バッチ挿入エラー (${i + 1} - ${i + batchSize}):`, error);
                errorCount += batch.length;
            } else {
                insertedCount += batch.length;
                console.log(`✅ バッチ挿入成功: ${batch.length}件`);
            }
        } catch (error) {
            console.error(`❌ バッチ処理例外 (${i + 1} - ${i + batchSize}):`, error);
            errorCount += batch.length;
        }

        // レート制限対策: 少し待機
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`🎯 季語データ挿入完了`);
    console.log(`  - 成功: ${insertedCount}件`);
    console.log(`  - 失敗: ${errorCount}件`);

    return { insertedCount, errorCount };
}

/**
 * keywordsテーブルの存在確認とテーブル作成
 */
async function ensureKeywordsTable() {
    console.log('🔧 keywordsテーブルの確認・作成中...');

    // テーブル構造の確認
    const { error } = await supabase
        .from('keywords')
        .select('*')
        .limit(1);

    if (error && error.code === 'PGRST116') {
        console.log('⚠️ keywordsテーブルが存在しません。手動でテーブルを作成してください。');
        console.log(`
CREATE TABLE keywords (
    id SERIAL PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    display_name_alternatives TEXT[],
    type VARCHAR(20) NOT NULL,
    season VARCHAR(20),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX idx_keywords_type ON keywords(type);
CREATE INDEX idx_keywords_season ON keywords(season);
CREATE INDEX idx_keywords_display_name ON keywords(display_name);
        `);
        return false;
    } else if (error) {
        console.error('❌ テーブル確認エラー:', error);
        return false;
    } else {
        console.log('✅ keywordsテーブル確認完了');
        return true;
    }
}

/**
 * 既存の季語データをクリア（オプション）
 */
async function clearExistingKigoData() {
    console.log('🗑️ 既存の季語データをクリア中...');

    const { error } = await supabase
        .from('keywords')
        .delete()
        .eq('type', '季語');

    if (error) {
        console.error('❌ 既存データクリアエラー:', error);
        return false;
    } else {
        console.log('✅ 既存季語データクリア完了');
        return true;
    }
}

/**
 * データ品質チェック
 * @param {Array} kigoData - 季語データの配列
 */
function validateKigoData(kigoData) {
    console.log('🔍 データ品質チェック中...');

    let validCount = 0;
    let invalidCount = 0;
    const issues = [];

    kigoData.forEach((kigo, index) => {
        const currentIssues = [];

        // 必須フィールドチェック
        if (!kigo.display_name || kigo.display_name.trim() === '') {
            currentIssues.push('display_nameが空');
        }

        if (!kigo.type || kigo.type !== '季語') {
            currentIssues.push('typeが季語ではない');
        }

        // 季節の妥当性チェック
        const validSeasons = ['春', '夏', '秋', '冬', '暮・新年', ''];
        if (kigo.season && !validSeasons.includes(kigo.season)) {
            currentIssues.push(`無効な季節: ${kigo.season}`);
        }

        if (currentIssues.length > 0) {
            invalidCount++;
            issues.push({
                index: index + 1,
                data: kigo,
                issues: currentIssues
            });
        } else {
            validCount++;
        }
    });

    console.log(`📊 データ品質チェック結果:`);
    console.log(`  - 有効: ${validCount}件`);
    console.log(`  - 無効: ${invalidCount}件`);

    if (invalidCount > 0) {
        console.log(`⚠️ 問題のあるデータ例:`);
        issues.slice(0, 5).forEach(issue => {
            console.log(`  [${issue.index}] ${issue.data.display_name}: ${issue.issues.join(', ')}`);
        });
    }

    return { validCount, invalidCount, issues };
}

/**
 * メイン実行関数
 */
async function main() {
    console.log('🚀 季語データ移行スクリプト開始');

    try {
        // 1. テーブル存在確認
        const tableExists = await ensureKeywordsTable();
        if (!tableExists) {
            console.log('❌ テーブルの確認に失敗しました。上記のSQL文を実行してテーブルを作成してください。');
            return;
        }

        // 2. CSVから季語データ読み込み
        const kigoData = await readKigoDataFromCSV();

        // 3. データ品質チェック
        const validation = validateKigoData(kigoData);
        if (validation.invalidCount > 0) {
            console.log('⚠️ 無効なデータが見つかりましたが、続行します。');
        }

        // 4. 既存データクリア（オプション）
        const shouldClear = process.argv.includes('--clear');
        if (shouldClear) {
            await clearExistingKigoData();
        }

        // 5. Supabaseに挿入
        const result = await insertKigoDataToSupabase(kigoData);

        console.log('🎉 季語データ移行完了！');
        console.log(`📈 結果サマリー:`);
        console.log(`  - 処理対象: ${kigoData.length}件`);
        console.log(`  - 挿入成功: ${result.insertedCount}件`);
        console.log(`  - 挿入失敗: ${result.errorCount}件`);

    } catch (error) {
        console.error('❌ 移行処理エラー:', error);
        process.exit(1);
    }
}

/**
 * 使用方法の表示
 */
function showUsage() {
    console.log(`
使用方法:
  node migrate-keywords.js [オプション]

オプション:
  --clear    既存の季語データをクリアしてから挿入

環境変数:
  SUPABASE_URL       SupabaseプロジェクトURL
  SUPABASE_ANON_KEY  Supabase匿名キー

前提条件:
  1. keywords.csvファイルが同じディレクトリに存在すること
  2. 必要なnpmパッケージがインストール済みであること:
     npm install @supabase/supabase-js csv-parser
  3. keywordsテーブルがSupabaseに作成済みであること
    `);
}

// コマンドライン引数の処理
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showUsage();
    process.exit(0);
}

// ES Moduleでのメイン実行判定
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

// ES Module用エクスポート
export {
    readKigoDataFromCSV,
    insertKigoDataToSupabase,
    validateKigoData
};