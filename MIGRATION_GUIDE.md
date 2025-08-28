# 俳句アプリ データベース移行ガイド

## 概要
このガイドは、俳句鑑賞＆記録アプリをGoogle Spreadsheet + GAS APIからSupabaseへ移行する手順を説明します。

## 前提条件
- Supabaseアカウントが作成済み
- 現在のスプレッドシートデータにアクセス可能
- Node.js環境（データ移行スクリプト実行用）

## 移行手順

### Phase 1: Supabase環境構築

#### 1.1 Supabaseプロジェクト作成
1. [Supabase](https://supabase.com)にログイン
2. 新しいプロジェクトを作成
3. プロジェクト設定からURL・匿名キーを取得

#### 1.2 データベーススキーマ作成
```sql
-- supabase_setup.sqlを実行
-- Supabaseダッシュボード > SQL Editor で実行
```

#### 1.3 設定ファイル更新
`config.js`でSupabase設定を更新：
```javascript
const SUPABASE_CONFIG = {
    url: 'https://your-project-id.supabase.co',
    anon_key: 'your_anon_key_here',
    schema: 'public'
};

const APP_CONFIG = {
    USE_SUPABASE: true, // Supabaseを使用
    // ...
};
```

### Phase 2: データ移行

#### 2.1 スプレッドシートからCSVエクスポート
1. Google Spreadsheetを開く
2. 詠み人シート：ファイル > ダウンロード > CSV として `poets_data.csv` で保存
3. 俳句シート：ファイル > ダウンロード > CSV として `haikus_data.csv` で保存

#### 2.2 シーケンスリセット関数の作成
Supabaseダッシュボード > SQL Editor で以下を実行：
```sql
-- reset_sequences.sqlの内容を実行
-- これにより移行の冪等性が確保されます
```

#### 2.3 データ移行実行
```bash
# Node.js環境でSupabaseライブラリをインストール
npm install @supabase/supabase-js

# 移行スクリプト実行（何度実行しても同じ結果）
node data_migration.js
```

**移行の冪等性**：
- 何度実行してもIDが1から開始
- 既存データは完全にクリア
- シーケンスも自動リセット

#### 2.3 データ整合性確認
```javascript
// ブラウザコンソールで実行
const client = getSupabaseClient();
await client.getStatistics();
```

### Phase 3: フロントエンド切り替え

#### 3.1 API切り替え
`config.js`で以下を設定：
```javascript
const APP_CONFIG = {
    USE_SUPABASE: true // これでSupabase APIに切り替わる
};
```

#### 3.2 動作テスト
1. ブラウザでアプリを開く
2. 地図にマーカーが表示されることを確認
3. 俳句検索機能をテスト
4. 俳句投稿機能をテスト

## ファイル構成

### 新規作成ファイル
- `supabase_setup.sql` - データベーススキーマ
- `supabase-client.js` - Supabaseクライアント
- `api-adapter.js` - API統合レイヤー
- `data_migration.js` - データ移行スクリプト

### 更新ファイル
- `config.js` - Supabase設定追加
- `index.html` - Supabaseライブラリ追加
- `CLAUDE.md` - 仕様書更新

### 従来ファイル（保持）
- `api-client.js` - GAS API用（後方互換性）
- `gas_api/` - GASスクリプト（バックアップ）

## API対応表

| 機能 | GAS API | Supabase API |
|------|---------|--------------|
| 俳句一覧取得 | `GET api/haikus` | `SELECT * FROM haikus` |
| 俳句検索 | `GET api/haikus/search` | `SELECT * FROM haikus WHERE...` |
| 俳句投稿 | `POST api/haikus` | `INSERT INTO haikus` |
| 詠み人一覧 | `GET api/poets` | `SELECT * FROM poets` |
| 地理検索 | ❌ | `SELECT * WHERE lat/lng IN bounds` |
| 統計情報 | ❌ | `SELECT count(*) FROM...` |

## パフォーマンス比較

| 指標 | スプレッドシート | Supabase |
|------|-----------------|----------|
| ID検索 | ~3000ms（全行読込） | ~100ms |
| 全文検索 | ~5000ms | ~500ms |
| 地理検索 | ❌ | ~300ms |
| 同時接続 | 制限あり | 100+ユーザー |

## トラブルシューティング

### よくある問題

#### 1. Supabase接続エラー
```
Error: Failed to fetch
```
**解決策：**
- URLとキーが正しく設定されているか確認
- ネットワーク接続を確認
- ブラウザの開発者ツールでエラー詳細を確認

#### 2. データが表示されない
**解決策：**
- データ移行が正常に完了しているか確認
- RLS（Row Level Security）設定を確認
- ブラウザコンソールでAPIレスポンスを確認

#### 3. 投稿機能が動作しない
**解決策：**
- 詠み人IDの関連付けを確認
- 必須フィールドの入力を確認
- データベーススキーマの制約を確認

### ログ確認方法

#### ブラウザコンソール
```javascript
// API種別確認
console.log('API Type:', apiAdapter.getAPIType());

// 接続テスト
await apiAdapter.testConnection();

// 統計確認
await apiAdapter.getStatistics();
```

#### Supabaseダッシュボード
- Database > Logs で実行されたクエリを確認
- API > Logs でAPIリクエストを確認

## ロールバック手順

移行後に問題が発生した場合：

1. `config.js`で設定を戻す：
   ```javascript
   const APP_CONFIG = {
       USE_SUPABASE: false // GAS APIに戻す
   };
   ```

2. ブラウザをリフレッシュ

3. 従来のGAS APIで動作確認

## 移行後の利点

### 開発者向け
- リレーショナルDBの活用
- 複雑なクエリの実行可能
- リアルタイム機能の利用
- TypeScript対応

### ユーザー向け
- 大幅な速度向上
- より安定した動作
- 地理検索など新機能
- 同時接続数の向上

## サポート

移行に関する質問や問題が発生した場合は、以下を参照：

- [Supabase公式ドキュメント](https://supabase.com/docs)
- [PostgreSQL公式ドキュメント](https://www.postgresql.org/docs/)
- プロジェクトのCLAUDE.md仕様書