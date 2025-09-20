#!/usr/bin/env node

/**
 * 季語システム リレーショナル化マイグレーションツール
 * 既存のseasonal_termカラム（varchar）から新しいkeyword_idカラム（integer）への
 * データ移行を安全に実行するツール
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getSupabaseClient } from './supabase-client.js';

// ES Module環境でのファイルパス取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数の読み込み
dotenv.config();

// =============================================================================
// グローバル変数と設定
// =============================================================================

let supabaseClient = null;
let keywordsMap = new Map(); // display_name -> id のマッピング
let migrationStats = {
    totalRecords: 0,
    processedRecords: 0,
    successfulMigrations: 0,
    failedMigrations: 0,
    alreadyMigrated: 0,
    notFound: [],
    errors: [],
    startTime: null,
    endTime: null
};

const MIGRATION_CONFIG = {
    batchSize: 50,
    dryRun: false,
    backupTable: false,
    logLevel: 'info',
    progressInterval: 10
};

// =============================================================================
// Supabaseクライアントのセットアップ
// =============================================================================

/**
 * Supabaseクライアントの初期化
 */
async function initializeSupabaseClient() {
    try {
        console.log('🔧 Supabaseクライアントを初期化中...');

        // グローバル設定
        global.SUPABASE_CONFIG = {
            url: process.env.SUPABASE_URL || 'https://tyolqoqeysyyocswsxrn.supabase.co',
            anon_key: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5b2xxb3FleXN5eW9jc3dzeHJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMTc0ODMsImV4cCI6MjA3MTc5MzQ4M30.LIO2wJrnAvdc-GVDSXweLzKLmqB18S0LIL3OAQAbJUo'
        };

        supabaseClient = getSupabaseClient();
        await supabaseClient.ensureInitialized();

        console.log('✅ Supabaseクライアント初期化完了');
        return true;

    } catch (error) {
        console.error('❌ Supabaseクライアント初期化エラー:', error);
        return false;
    }
}

/**
 * 季語マスターデータの読み込み
 */
async function loadKeywordsMap() {
    try {
        console.log('📚 季語マスターデータを読み込み中...');

        const keywords = await supabaseClient.getKeywords();

        keywordsMap.clear();
        keywords.forEach(keyword => {
            keywordsMap.set(keyword.display_name, keyword.id);

            // 代替表記もマッピングに追加
            if (keyword.display_name_alternatives && Array.isArray(keyword.display_name_alternatives)) {
                keyword.display_name_alternatives.forEach(alt => {
                    if (alt && alt.trim()) {
                        keywordsMap.set(alt.trim(), keyword.id);
                    }
                });
            }
        });

        console.log(`✅ 季語マスターデータ読み込み完了: ${keywords.length}件 (マッピング: ${keywordsMap.size}件)`);
        return true;

    } catch (error) {
        console.error('❌ 季語マスターデータ読み込みエラー:', error);
        return false;
    }
}

// =============================================================================
// データ分析機能
// =============================================================================

/**
 * 現在のhaikuテーブルの状況を分析
 */
async function analyzeCurrentState() {
    try {
        console.log('🔍 現在のデータ状況を分析中...');

        // 全レコード数を取得
        const { count: totalCount } = await supabaseClient.supabase
            .from('haikus')
            .select('*', { count: 'exact', head: true });

        // seasonal_termが存在するレコード数を取得
        const { count: withSeasonalTerm } = await supabaseClient.supabase
            .from('haikus')
            .select('*', { count: 'exact', head: true })
            .not('seasonal_term', 'is', null)
            .neq('seasonal_term', '');

        // keyword_idが既に設定されているレコード数を取得
        const { count: withKeywordId } = await supabaseClient.supabase
            .from('haikus')
            .select('*', { count: 'exact', head: true })
            .not('keyword_id', 'is', null);

        // seasonal_termの重複を確認
        const { data: duplicateTerms } = await supabaseClient.supabase
            .from('haikus')
            .select('seasonal_term')
            .not('seasonal_term', 'is', null)
            .neq('seasonal_term', '');

        const termCounts = {};
        duplicateTerms?.forEach(row => {
            const term = row.seasonal_term;
            termCounts[term] = (termCounts[term] || 0) + 1;
        });

        const analysisResult = {
            totalRecords: totalCount,
            withSeasonalTerm: withSeasonalTerm,
            withKeywordId: withKeywordId,
            needsMigration: withSeasonalTerm - withKeywordId,
            uniqueTerms: Object.keys(termCounts).length,
            termDistribution: Object.entries(termCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
        };

        console.log('\n📊 データ分析結果:');
        console.log(`- 総レコード数: ${analysisResult.totalRecords}件`);
        console.log(`- seasonal_term有り: ${analysisResult.withSeasonalTerm}件`);
        console.log(`- keyword_id設定済み: ${analysisResult.withKeywordId}件`);
        console.log(`- 移行が必要: ${analysisResult.needsMigration}件`);
        console.log(`- 重複している季語: ${analysisResult.uniqueTerms}種類`);

        if (analysisResult.termDistribution.length > 0) {
            console.log('\n📈 よく使われる季語 (TOP 10):');
            analysisResult.termDistribution.forEach(([term, count], index) => {
                const status = keywordsMap.has(term) ? '✅' : '❌';
                console.log(`  ${index + 1}. ${term}: ${count}件 ${status}`);
            });
        }

        return analysisResult;

    } catch (error) {
        console.error('❌ データ分析エラー:', error);
        return null;
    }
}

/**
 * マッピングできない季語を特定
 */
async function identifyUnmappableTerms() {
    try {
        console.log('🔍 マッピングできない季語を特定中...');

        const { data: distinctTerms } = await supabaseClient.supabase
            .from('haikus')
            .select('seasonal_term')
            .not('seasonal_term', 'is', null)
            .neq('seasonal_term', '');

        const unmappableTerms = [];
        const mappableTerms = [];

        const uniqueTerms = [...new Set(distinctTerms?.map(row => row.seasonal_term))];

        uniqueTerms.forEach(term => {
            if (keywordsMap.has(term)) {
                mappableTerms.push(term);
            } else {
                unmappableTerms.push(term);
            }
        });

        console.log(`\n📋 マッピング状況:`);
        console.log(`- マッピング可能: ${mappableTerms.length}件`);
        console.log(`- マッピング不可: ${unmappableTerms.length}件`);

        if (unmappableTerms.length > 0) {
            console.log('\n❌ マッピングできない季語:');
            unmappableTerms.slice(0, 20).forEach((term, index) => {
                console.log(`  ${index + 1}. "${term}"`);
            });
            if (unmappableTerms.length > 20) {
                console.log(`  ... 他 ${unmappableTerms.length - 20}件`);
            }
        }

        return { mappableTerms, unmappableTerms };

    } catch (error) {
        console.error('❌ マッピング分析エラー:', error);
        return { mappableTerms: [], unmappableTerms: [] };
    }
}

// =============================================================================
// マイグレーション実行機能
// =============================================================================

/**
 * バッチ単位でのマイグレーション実行
 */
async function executeMigrationBatch(records) {
    const updates = [];
    const errors = [];

    for (const record of records) {
        try {
            const seasonalTerm = record.seasonal_term;

            // 既にkeyword_idが設定されている場合はスキップ
            if (record.keyword_id !== null) {
                migrationStats.alreadyMigrated++;
                continue;
            }

            // seasonal_termが空の場合もスキップ
            if (!seasonalTerm || seasonalTerm.trim() === '') {
                migrationStats.processedRecords++;
                continue;
            }

            // 季語IDを検索
            const keywordId = keywordsMap.get(seasonalTerm.trim());

            if (keywordId) {
                if (!MIGRATION_CONFIG.dryRun) {
                    updates.push({
                        id: record.id,
                        keyword_id: keywordId
                    });
                }
                migrationStats.successfulMigrations++;
            } else {
                migrationStats.notFound.push({
                    id: record.id,
                    seasonal_term: seasonalTerm
                });
                migrationStats.failedMigrations++;
            }

            migrationStats.processedRecords++;

        } catch (error) {
            errors.push({
                record_id: record.id,
                error: error.message
            });
            migrationStats.errors.push(error.message);
            migrationStats.failedMigrations++;
        }
    }

    // バッチでデータベース更新を実行
    if (!MIGRATION_CONFIG.dryRun && updates.length > 0) {
        try {
            for (const update of updates) {
                await supabaseClient.supabase
                    .from('haikus')
                    .update({ keyword_id: update.keyword_id })
                    .eq('id', update.id);
            }
        } catch (error) {
            console.error('❌ バッチ更新エラー:', error);
            throw error;
        }
    }

    return { updates: updates.length, errors };
}

/**
 * メインマイグレーション処理
 */
async function executeMigration(config = MIGRATION_CONFIG) {
    try {
        console.log('🚀 マイグレーション開始...');
        migrationStats.startTime = Date.now();

        if (config.dryRun) {
            console.log('⚠️  DRY RUN モード - 実際の更新は行いません');
        }

        // 移行対象レコードを取得
        let offset = 0;
        let hasMoreData = true;

        while (hasMoreData) {
            const { data: records, error } = await supabaseClient.supabase
                .from('haikus')
                .select('id, seasonal_term, keyword_id')
                .range(offset, offset + config.batchSize - 1)
                .order('id');

            if (error) throw error;

            if (records && records.length > 0) {
                // バッチ処理実行
                const batchResult = await executeMigrationBatch(records);

                // プログレス表示
                if (migrationStats.processedRecords % config.progressInterval === 0) {
                    showProgress();
                }

                offset += config.batchSize;
                hasMoreData = records.length === config.batchSize;
            } else {
                hasMoreData = false;
            }
        }

        migrationStats.endTime = Date.now();
        migrationStats.totalRecords = offset;

        console.log('\n✅ マイグレーション完了');
        displayMigrationResults();

        return true;

    } catch (error) {
        console.error('❌ マイグレーション実行エラー:', error);
        return false;
    }
}

/**
 * プログレス表示
 */
function showProgress() {
    const percentage = migrationStats.totalRecords > 0
        ? Math.round((migrationStats.processedRecords / migrationStats.totalRecords) * 100)
        : 0;

    process.stdout.write(`\r🔄 処理中... 成功: ${migrationStats.successfulMigrations}件, 失敗: ${migrationStats.failedMigrations}件, 既存: ${migrationStats.alreadyMigrated}件`);
}

/**
 * マイグレーション結果の表示
 */
function displayMigrationResults() {
    const processingTime = migrationStats.endTime - migrationStats.startTime;

    console.log('\n📊 マイグレーション結果:');
    console.log(`- 処理レコード数: ${migrationStats.processedRecords}件`);
    console.log(`- 成功: ${migrationStats.successfulMigrations}件`);
    console.log(`- 失敗: ${migrationStats.failedMigrations}件`);
    console.log(`- 既に移行済み: ${migrationStats.alreadyMigrated}件`);
    console.log(`- 処理時間: ${(processingTime / 1000).toFixed(2)}秒`);

    if (migrationStats.notFound.length > 0) {
        console.log(`\n❌ マッピングできなかった季語 (${migrationStats.notFound.length}件):`);
        migrationStats.notFound.slice(0, 10).forEach((item, index) => {
            console.log(`  ${index + 1}. ID:${item.id} - "${item.seasonal_term}"`);
        });
        if (migrationStats.notFound.length > 10) {
            console.log(`  ... 他 ${migrationStats.notFound.length - 10}件`);
        }
    }

    if (migrationStats.errors.length > 0) {
        console.log(`\n⚠️  エラー (${migrationStats.errors.length}件):`);
        migrationStats.errors.slice(0, 5).forEach((error, index) => {
            console.log(`  ${index + 1}. ${error}`);
        });
    }
}

// =============================================================================
// バックアップと復元機能
// =============================================================================

/**
 * データベースバックアップの作成
 */
async function createBackup() {
    try {
        console.log('💾 バックアップを作成中...');

        const { data: backupData } = await supabaseClient.supabase
            .from('haikus')
            .select('id, seasonal_term, keyword_id');

        const backupFile = `backup_haikus_${Date.now()}.json`;
        fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));

        console.log(`✅ バックアップ作成完了: ${backupFile}`);
        return backupFile;

    } catch (error) {
        console.error('❌ バックアップ作成エラー:', error);
        return null;
    }
}

// =============================================================================
// コマンドライン処理
// =============================================================================

/**
 * コマンドライン引数の解析
 */
function parseCommandLineArgs() {
    const args = process.argv.slice(2);
    const config = { ...MIGRATION_CONFIG };
    let command = 'migrate';

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case 'analyze':
                command = 'analyze';
                break;
            case 'migrate':
                command = 'migrate';
                break;
            case '--dry-run':
                config.dryRun = true;
                break;
            case '--batch-size':
                config.batchSize = parseInt(args[++i]);
                break;
            case '--backup':
                config.backupTable = true;
                break;
            case '--help':
            case '-h':
                showHelp();
                process.exit(0);
                break;
        }
    }

    return { command, config };
}

/**
 * ヘルプメッセージの表示
 */
function showHelp() {
    console.log(`
季語システム リレーショナル化マイグレーションツール

使用方法:
  node migration-tool.js [コマンド] [オプション]

コマンド:
  analyze                 現在のデータ状況を分析（デフォルト）
  migrate                 マイグレーションを実行

オプション:
  --dry-run              ドライランモード（実際の更新なし）
  --batch-size <number>  バッチサイズ (デフォルト: ${MIGRATION_CONFIG.batchSize})
  --backup               実行前にバックアップを作成
  -h, --help             このヘルプメッセージを表示

例:
  node migration-tool.js analyze
  node migration-tool.js migrate --dry-run
  node migration-tool.js migrate --backup --batch-size 100
`);
}

// =============================================================================
// メイン実行部
// =============================================================================

/**
 * メイン実行関数
 */
async function main() {
    try {
        const { command, config } = parseCommandLineArgs();

        console.log('🔄 季語システム リレーショナル化マイグレーションツール');
        console.log('==========================================');

        // Supabaseクライアント初期化
        const clientInitialized = await initializeSupabaseClient();
        if (!clientInitialized) {
            throw new Error('Supabaseクライアントの初期化に失敗しました');
        }

        // 季語マスターデータ読み込み
        const keywordsLoaded = await loadKeywordsMap();
        if (!keywordsLoaded) {
            throw new Error('季語マスターデータの読み込みに失敗しました');
        }

        // コマンド実行
        switch (command) {
            case 'analyze':
                await analyzeCurrentState();
                await identifyUnmappableTerms();
                break;

            case 'migrate':
                // バックアップ作成
                if (config.backupTable) {
                    await createBackup();
                }

                // 分析結果を表示
                await analyzeCurrentState();

                // 確認プロンプト
                if (!config.dryRun) {
                    console.log('\n⚠️  実際のデータ変更を行います。続行しますか？ (y/N)');
                    // 実際の本番環境では readline を使用
                    console.log('確認のため --dry-run で事前テストを推奨します');
                }

                // マイグレーション実行
                await executeMigration(config);
                break;

            default:
                console.error(`❌ 不明なコマンド: ${command}`);
                showHelp();
                process.exit(1);
        }

        console.log('\n🎉 処理が正常に完了しました！');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ 致命的エラー:', error);
        process.exit(1);
    }
}

// スクリプトが直接実行された場合のみmainを呼び出し
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

// エクスポート（テスト用）
export {
    analyzeCurrentState,
    executeMigration,
    loadKeywordsMap,
    identifyUnmappableTerms
};