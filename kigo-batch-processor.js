#!/usr/bin/env node

/**
 * 季語バッチ処理システム
 * 既存のkigo-suggestions.jsモジュールを活用してCSVファイルから俳句を読み込み、
 * 季語を自動割り付けするバッチ処理システム
 */

import fs from 'fs';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// ES Module環境でのファイルパス取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数の読み込み
dotenv.config();

// =============================================================================
// グローバル変数と設定
// =============================================================================

let kigoDatabaseInstance = null;
let processingStats = {
    totalHaikus: 0,
    processedHaikus: 0,
    kigoDetected: 0,
    seasonless: 0,
    seasonBreakdown: {
        '春': 0,
        '夏': 0,
        '秋': 0,
        '冬': 0,
        '暮・新年': 0,
        'その他': 0
    },
    errors: 0,
    startTime: null,
    endTime: null
};

const DEFAULT_CONFIG = {
    input: './misc/updater/shikus.csv',
    output: './output_with_kigo.csv',
    batchSize: 100,
    logLevel: 'info',
    delimiter: ',',
    encoding: 'utf8',
    progressInterval: 10
};

// =============================================================================
// 季語処理モジュールの動的インポート
// =============================================================================

/**
 * 季語処理機能のセットアップ
 * Node.js環境で季語処理機能を利用できるように環境を整える
 */
async function setupKigoModule() {
    try {
        console.log('🔧 季語処理モジュールをセットアップ中...');

        // グローバル変数の設定（ブラウザ環境をエミュレート）
        if (typeof global !== 'undefined') {
            // Node.js環境でのconfig.jsの内容を設定
            const configPath = path.join(__dirname, 'config.js');

            // Supabase設定をグローバルに設定
            global.SUPABASE_CONFIG = {
                url: process.env.SUPABASE_URL || 'https://tyolqoqeysyyocswsxrn.supabase.co',
                anon_key: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5b2xxb3FleXN5eW9jc3dzeHJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMTc0ODMsImV4cCI6MjA3MTc5MzQ4M30.LIO2wJrnAvdc-GVDSXweLzKLmqB18S0LIL3OAQAbJUo'
            };
        }

        // Supabaseクライアントの動的インポート
        const { SupabaseHaikuClient, getSupabaseClient } = await import('./supabase-client.js');

        // グローバル関数として設定
        global.getSupabaseClient = getSupabaseClient;
        global.SupabaseHaikuClient = SupabaseHaikuClient;

        console.log('✅ 季語処理モジュールセットアップ完了');
        return true;

    } catch (error) {
        console.error('❌ 季語処理モジュールセットアップエラー:', error);
        return false;
    }
}

/**
 * 季語データベースの初期化
 */
async function initializeKigoDatabase() {
    try {
        if (kigoDatabaseInstance) {
            console.log('🔧 季語データベースは既に初期化済み');
            return kigoDatabaseInstance;
        }

        console.log('🚀 季語データベース初期化開始...');
        const startTime = Date.now();

        // Supabaseクライアントの取得
        const supabaseClient = global.getSupabaseClient();
        await supabaseClient.ensureInitialized();

        // 季語データを取得
        const data = await supabaseClient.getKeywords();

        if (!data || data.length === 0) {
            throw new Error('季語データが見つかりません');
        }

        // データベースとキャッシュの構築
        kigoDatabaseInstance = {
            database: data.map(item => ({
                id: item.id,  // 季語IDを追加
                display_name: item.display_name,
                display_name_alternatives: Array.isArray(item.display_name_alternatives)
                    ? item.display_name_alternatives
                    : [],
                season: item.season || 'その他',
                description: item.description || ''
            })),
            cache: new Map()
        };

        // 高速検索用キャッシュを構築
        buildKigoSearchCache(kigoDatabaseInstance);

        const loadTime = Date.now() - startTime;
        console.log(`✅ 季語データベース初期化完了: ${kigoDatabaseInstance.database.length}件（${loadTime}ms）`);

        return kigoDatabaseInstance;

    } catch (error) {
        console.error('❌ 季語データベース初期化エラー:', error);
        throw error;
    }
}

/**
 * 高速検索用キャッシュの構築
 */
function buildKigoSearchCache(kigoInstance) {
    kigoInstance.cache.clear();

    kigoInstance.database.forEach(kigo => {
        // 表示名でのキャッシュ
        const displayName = kigo.display_name;
        if (!kigoInstance.cache.has(displayName)) {
            kigoInstance.cache.set(displayName, []);
        }
        kigoInstance.cache.get(displayName).push(kigo);

        // 代替表記でのキャッシュ
        kigo.display_name_alternatives.forEach(alt => {
            if (alt && alt.trim()) {
                if (!kigoInstance.cache.has(alt)) {
                    kigoInstance.cache.set(alt, []);
                }
                kigoInstance.cache.get(alt).push(kigo);
            }
        });
    });

    console.log(`🔧 高速検索キャッシュ構築完了: ${kigoInstance.cache.size}エントリ`);
}

/**
 * 俳句テキストから季語を抽出
 */
function extractKigo(haikuText) {
    if (!haikuText || typeof haikuText !== 'string') return [];
    if (!kigoDatabaseInstance) return [];

    const text = haikuText.trim();

    // 文字数制限チェック
    if (text.length < 5 || text.length > 19) return [];

    const matches = new Map();

    try {
        // キャッシュを使用した高速マッチング
        for (const [term, kigos] of kigoDatabaseInstance.cache.entries()) {
            if (text.includes(term)) {
                kigos.forEach(kigo => {
                    const key = `${kigo.display_name}-${kigo.season}`;
                    if (!matches.has(key)) {
                        matches.set(key, {
                            kigo: kigo,
                            matchedText: term,
                            startPos: text.indexOf(term),
                            length: term.length,
                            priority: term.length
                        });
                    }
                });
            }
        }

        // 結果をソートして返す（最長マッチ優先）
        const result = Array.from(matches.values())
            .sort((a, b) => b.priority - a.priority)
            .slice(0, 5);

        return result;

    } catch (error) {
        console.error('❌ 季語抽出エラー:', error);
        return [];
    }
}

// =============================================================================
// CSV処理機能
// =============================================================================

/**
 * CSVファイルのヘッダーを検出・解析
 */
async function detectCSVFormat(inputPath) {
    return new Promise((resolve, reject) => {
        const headers = [];
        let isFirstRow = true;

        createReadStream(inputPath)
            .pipe(csv({
                separator: DEFAULT_CONFIG.delimiter,
                mapHeaders: ({ header }) => {
                    if (isFirstRow) {
                        headers.push(header.trim());
                    }
                    return header.trim();
                }
            }))
            .on('headers', (headerList) => {
                resolve({
                    headers: headerList,
                    haikuColumn: detectHaikuColumn(headerList),
                    hasSeasonColumn: headerList.includes('season'),
                    hasKigoColumn: headerList.includes('seasonal_term') || headerList.includes('keywords'),
                    hasKeywordIdColumn: headerList.includes('keyword_id')  // 季語IDカラムの検出を追加
                });
            })
            .on('error', reject);
    });
}

/**
 * 俳句テキストカラムの自動検出
 */
function detectHaikuColumn(headers) {
    const candidates = ['haiku_text', 'haiku', 'text', '俳句', '句'];

    for (const candidate of candidates) {
        const found = headers.find(header =>
            header.toLowerCase().includes(candidate.toLowerCase())
        );
        if (found) return found;
    }

    // 見つからない場合は最初のカラムを使用
    return headers[0];
}

/**
 * CSVを1行ずつ処理するTransformストリーム
 */
function createKigoProcessingTransform(config, formatInfo) {
    let headerWritten = false;

    return new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
            try {
                // ヘッダー行の出力
                if (!headerWritten) {
                    const outputHeaders = [...formatInfo.headers];
                    if (!formatInfo.hasKigoColumn) {
                        outputHeaders.push('keywords');
                    }
                    if (!formatInfo.hasSeasonColumn) {
                        outputHeaders.push('season');
                    }
                    if (!formatInfo.hasKeywordIdColumn) {
                        outputHeaders.push('keyword_id');  // 季語IDカラムを追加
                    }

                    this.push(outputHeaders.map(h => `"${h}"`).join(',') + '\n');
                    headerWritten = true;
                }

                // 俳句テキストの取得
                const haikuText = chunk[formatInfo.haikuColumn];

                if (!haikuText) {
                    processingStats.errors++;
                    this.push(convertRowToCSV(chunk, formatInfo.headers, '', '', null) + '\n');
                    callback();
                    return;
                }

                // 季語抽出
                const kigoMatches = extractKigo(haikuText);

                let seasonalTerm = '';
                let season = '';
                let keywordId = null;  // 季語IDを追加

                if (kigoMatches.length > 0) {
                    // 最も優先度の高い季語を選択
                    const topMatch = kigoMatches[0];
                    seasonalTerm = topMatch.kigo.display_name;
                    season = topMatch.kigo.season;
                    keywordId = topMatch.kigo.id;  // 季語IDを取得

                    processingStats.kigoDetected++;
                    processingStats.seasonBreakdown[season]++;
                } else {
                    processingStats.seasonless++;
                }

                // 統計更新
                processingStats.processedHaikus++;

                // プログレス表示
                if (processingStats.processedHaikus % config.progressInterval === 0) {
                    showProgress();
                }

                // CSVに出力
                const outputRow = convertRowToCSV(chunk, formatInfo.headers, seasonalTerm, season, keywordId);
                this.push(outputRow + '\n');

                callback();

            } catch (error) {
                console.error('❌ 行処理エラー:', error);
                processingStats.errors++;
                callback();
            }
        }
    });
}

/**
 * オブジェクトをCSV行に変換
 */
function convertRowToCSV(row, headers, seasonalTerm, season, keywordId = null) {
    const values = headers.map(header => {
        const value = row[header] || '';
        return `"${String(value).replace(/"/g, '""')}"`;
    });

    // 季語と季節のカラムを追加
    if (!headers.includes('keywords') && !headers.includes('seasonal_term')) {
        values.push(`"${seasonalTerm}"`);
    }
    if (!headers.includes('season')) {
        values.push(`"${season}"`);
    }
    if (!headers.includes('keyword_id')) {
        values.push(`"${keywordId || ''}"`);  // 季語IDカラムを追加
    }

    return values.join(',');
}

// =============================================================================
// 進捗表示とログ機能
// =============================================================================

/**
 * プログレス表示
 */
function showProgress() {
    const percentage = processingStats.totalHaikus > 0
        ? Math.round((processingStats.processedHaikus / processingStats.totalHaikus) * 100)
        : 0;

    const barLength = 20;
    const filledLength = Math.round((percentage / 100) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

    process.stdout.write(`\r🔍 季語マッチング処理中... [${bar}] ${percentage}% (${processingStats.processedHaikus}/${processingStats.totalHaikus})`);
}

/**
 * 統計情報の表示
 */
function displayStatistics() {
    const processingTime = processingStats.endTime - processingStats.startTime;
    const detectionRate = processingStats.totalHaikus > 0
        ? ((processingStats.kigoDetected / processingStats.totalHaikus) * 100).toFixed(1)
        : 0;

    console.log('\n\n📊 処理完了 - 統計情報:');
    console.log(`- 総俳句数: ${processingStats.totalHaikus}件`);
    console.log(`- 季語検出: ${processingStats.kigoDetected}件 (${detectionRate}%)`);
    console.log(`- 季なし: ${processingStats.seasonless}件 (${(100 - detectionRate).toFixed(1)}%)`);

    if (processingStats.errors > 0) {
        console.log(`- エラー: ${processingStats.errors}件`);
    }

    console.log('- 季節別内訳:');
    Object.entries(processingStats.seasonBreakdown).forEach(([season, count]) => {
        if (count > 0) {
            console.log(`  ${season}: ${count}件`);
        }
    });

    console.log(`- 処理時間: ${(processingTime / 1000).toFixed(2)}秒`);
}

// =============================================================================
// メイン処理関数
// =============================================================================

/**
 * CSVファイルの行数をカウント
 */
async function countCSVRows(filePath) {
    return new Promise((resolve, reject) => {
        let count = 0;
        createReadStream(filePath)
            .pipe(csv())
            .on('data', () => count++)
            .on('end', () => resolve(count))
            .on('error', reject);
    });
}

/**
 * バッチ処理のメイン実行関数
 */
async function processBatch(config) {
    try {
        console.log('🚀 季語バッチ処理開始...');
        processingStats.startTime = Date.now();

        // 季語処理モジュールのセットアップ
        const setupSuccess = await setupKigoModule();
        if (!setupSuccess) {
            throw new Error('季語処理モジュールのセットアップに失敗しました');
        }

        // 季語データベースの初期化
        await initializeKigoDatabase();

        // 入力ファイルの検証
        if (!fs.existsSync(config.input)) {
            throw new Error(`入力ファイルが見つかりません: ${config.input}`);
        }

        // CSVフォーマットの検出
        console.log('📁 CSVファイル形式を解析中...');
        const formatInfo = await detectCSVFormat(config.input);
        console.log(`📄 俳句カラム: "${formatInfo.haikuColumn}"`);

        // 総行数をカウント
        console.log('📊 総行数をカウント中...');
        processingStats.totalHaikus = await countCSVRows(config.input);
        console.log(`📁 CSVファイル読み込み: ${path.basename(config.input)} (${processingStats.totalHaikus}件)`);

        // ストリーム処理でCSVを処理
        await pipeline(
            createReadStream(config.input, { encoding: config.encoding }),
            csv({ separator: config.delimiter }),
            createKigoProcessingTransform(config, formatInfo),
            createWriteStream(config.output, { encoding: config.encoding })
        );

        processingStats.endTime = Date.now();

        // 結果の表示
        console.log('\n✅ 処理完了');
        displayStatistics();
        console.log(`\n📄 出力ファイル: ${config.output}`);

        return true;

    } catch (error) {
        console.error('\n❌ バッチ処理エラー:', error);
        return false;
    }
}

// =============================================================================
// コマンドライン引数解析
// =============================================================================

/**
 * コマンドライン引数の解析
 */
function parseCommandLineArgs() {
    const args = process.argv.slice(2);
    const config = { ...DEFAULT_CONFIG };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--input':
            case '-i':
                config.input = args[++i];
                break;
            case '--output':
            case '-o':
                config.output = args[++i];
                break;
            case '--config':
            case '-c':
                const configPath = args[++i];
                if (fs.existsSync(configPath)) {
                    const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                    Object.assign(config, fileConfig);
                }
                break;
            case '--batch-size':
                config.batchSize = parseInt(args[++i]);
                break;
            case '--help':
            case '-h':
                showHelp();
                process.exit(0);
                break;
        }
    }

    return config;
}

/**
 * ヘルプメッセージの表示
 */
function showHelp() {
    console.log(`
季語バッチ処理システム

使用方法:
  node kigo-batch-processor.js [オプション]

オプション:
  -i, --input <file>      入力CSVファイル (デフォルト: ${DEFAULT_CONFIG.input})
  -o, --output <file>     出力CSVファイル (デフォルト: ${DEFAULT_CONFIG.output})
  -c, --config <file>     設定ファイル (JSON形式)
  --batch-size <number>   バッチサイズ (デフォルト: ${DEFAULT_CONFIG.batchSize})
  -h, --help              このヘルプメッセージを表示

例:
  node kigo-batch-processor.js
  node kigo-batch-processor.js -i sample.csv -o output.csv
  node kigo-batch-processor.js -c batch-config.json
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
        const config = parseCommandLineArgs();

        console.log('🌸 季語バッチ処理システム v1.0.0');
        console.log('==========================================');

        const success = await processBatch(config);

        if (success) {
            console.log('\n🎉 全ての処理が正常に完了しました！');
            process.exit(0);
        } else {
            console.log('\n💥 処理中にエラーが発生しました');
            process.exit(1);
        }

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
    processBatch,
    initializeKigoDatabase,
    extractKigo,
    setupKigoModule
};