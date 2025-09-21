/**
 * 俳句鑑賞＆記録アプリ - メインエントリーポイント
 * ES Module環境での統一実行
 */

// ES Module imports（依存関係順に最適化）
import './config.js';             // 1. 設定ファイル（最初に読み込み）
import './utils.js';              // 2. ユーティリティ関数
import './supabase-client.js';    // 3. Supabaseクライアント
import './api-adapter.js';        // 4. APIアダプター
import './kigo-suggestions.js';   // 5. 季語サジェスト機能
import './pin-posting.js';        // 6. ピン投稿機能
import './seasonal-suggest.js';   // 7. 季節サジェスト機能
import './script.js';             // 8. メインスクリプト
import './app-manager.js';        // 9. アプリケーション管理（最後）

// 必要に応じて個別関数もimport
import { getSupabaseClient } from './supabase-client.js';

console.log('🚀 俳句鑑賞アプリ - ES Module環境で起動');
console.log('📁 エントリーポイント: main.js');

// グローバル初期化完了の待機
document.addEventListener('DOMContentLoaded', () => {
    console.log('📍 DOM読み込み完了 - アプリケーション初期化開始');
});

// ES Module環境での動作確認
console.log('✅ ES Module imports完了');
console.log('🔧 Supabaseクライアント:', typeof getSupabaseClient);