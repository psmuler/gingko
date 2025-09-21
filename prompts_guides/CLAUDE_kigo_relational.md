# 季語システムのリレーショナル化改修プロンプト

現在の季語システムを、varchar型の季語名保存からID型のリレーショナル設計に変更したいと思います。

## 現在の問題点

### 現状の実装
- `kigo-suggestions.js`でSupabaseの`keywords`テーブルから季語データを取得
- 俳句テーブルの`seasonal_term`列にvarchar型で季語名（`display_name`）を直接保存
- IDによるリレーショナルな関連付けができていない
- 詳細はREADME.mdも参照

### 変更が必要な理由
1. **データ整合性**: 季語名変更時の一括更新が困難
2. **パフォーマンス**: varchar検索よりもID検索の方が高速
3. **正規化**: リレーショナルデータベースの設計原則に従う
4. **拡張性**: 季語の詳細情報（説明、代替表記等）を効率的に取得


### keywordsテーブル（季語マスター）
```sql
CREATE TABLE keywords (
  id SERIAL PRIMARY KEY,                    -- 季語ID
  display_name VARCHAR NOT NULL,            -- 表示名
  display_name_alternatives TEXT[],         -- 代替表記
  type VARCHAR,                           -- 種別（季語/歌枕）
  season VARCHAR,                          -- 季節
  description TEXT,                        -- 説明
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### haikuテーブル（俳句）
```sql
CREATE TABLE haiku (
  id SERIAL PRIMARY KEY,
  haiku_text text NOT NULL,                   -- 俳句本文
  poet ,                          -- 作者
  keywords INTEGER REFERENCES keywords(id)[], -- 季語ID（外部キー）
  seasonal_term text[], -- 季語ID（外部キー）
  season VARCHAR,                          -- 季節（非正規化データ）
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 改修要件

### 1. kigo-suggestions.jsの修正

#### データ構造の変更
```javascript
// 現在: display_nameで季語を識別
selectedKigoState = {
    selectedKigo: { display_name: "桜", season: "春" },
    season: "春",
    isSeasonless: false
};

// 修正後: IDで季語を識別
selectedKigoState = {
    selectedKigo: { id: 123, display_name: "桜", season: "春" },
    season: "春", 
    isSeasonless: false,
    keywordId: 123  // 新規追加
};
```

#### 関数の修正
1. **extractKigo()**: マッチ結果にkeyword_idを含める
2. **selectKigo()**: 選択時にIDを保存
3. **updateSeasonFields()**: hidden fieldでkeyword_idも送信

### 2. フォーム連携の修正

#### HTMLフォームの修正
```html
<!-- 現在 -->
<input type="hidden" name="seasonal_term" value="桜">
<input type="hidden" name="season" value="春">

<!-- 修正後 -->
<input type="hidden" name="keyword_id" value="123">
<input type="hidden" name="season" value="春">
<input type="hidden" name="seasonal_term" value="桜"> <!-- 表示用として残す -->
```

### 3. バックエンド処理の修正

#### 俳句保存処理
```javascript
// 現在: 季語名で保存
await supabase
  .from('haiku')
  .insert({
    text: haikuText,
    seasonal_term: "桜",  // varchar
    season: "春"
  });

// 修正後: IDで保存
await supabase
  .from('haiku')
  .insert({
    text: haikuText,
    keyword_id: 123,     // integer (外部キー)
    season: "春"         // 非正規化データとして保持
  });
```

### 4. バッチ処理システムの修正

#### CSV処理での季語マッチング
```javascript
// 現在: 季語名を直接保存
const result = {
  original_text: "桜咲く",
  detected_kigo: "桜",
  season: "春"
};

// 修正後: IDと名前の両方を保存
const result = {
  original_text: "桜咲く", 
  detected_kigo_id: 123,
  detected_kigo_name: "桜",
  season: "春"
};
```

### 5. データマイグレーション

#### 既存データの移行処理
```javascript
// 既存の seasonal_term から keyword_id への変換
async function migrateSeasonalTermsToIds() {
  // 1. 既存俳句データを取得
  // 2. seasonal_term から対応する keyword_id を検索
  // 3. keyword_id カラムを更新
  // 4. 変換できなかったレコードをログ出力
}
```

## 実装してほしい修正内容

### 1. kigo-suggestions.js の全面改修
- 季語選択時にIDを保存する仕組み
- フォーム送信時にkeyword_idを含める
- 既存の表示機能は維持（季語名表示）

### 2. バッチ処理システムの改修
- CSVから季語を検出時、IDも一緒に取得
- 出力CSVにkeyword_idカラムを追加
- マイグレーション用のデータ変換機能

### 3. データマイグレーションツール
- 既存データを一括変換するスクリプト
- エラー処理と進捗表示
- 変換結果のレポート出力

### 4. 後方互換性の考慮
- 既存のseasonal_termカラムも一時的に保持
- 段階的な移行が可能な設計
- フォールバック処理の実装

## 期待する成果物

1. **修正版kigo-suggestions.js**: IDベースの季語処理
2. **migration-tool.js**: データマイグレーションスクリプト  
3. **updated-batch-processor.js**: ID対応バッチ処理
4. **schema-update.sql**: テーブル構造変更用SQL
5. **migration-guide.md**: 移行手順書

## 重要な考慮点

- **データ整合性**: 既存データを壊さない慎重な移行
- **パフォーマンス**: ID検索による高速化
- **可読性**: 開発者が理解しやすいコード構造
- **拡張性**: 将来の機能追加に対応できる設計

この要件に基づいて、現在のvarchar型季語システムをID型リレーショナル設計に改修してください。特に既存データの安全な移行と、段階的な切り替えが可能な実装を重視してください。