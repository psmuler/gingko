# 季語システム リレーショナル化 移行ガイド

## 概要

この移行ガイドは、俳句管理システムの季語処理を従来のvarchar型（`seasonal_term`）からID型（`keyword_id`）のリレーショナル設計に安全に移行するための手順書です。

## 移行の目的

### 現在の問題点
- `seasonal_term`カラムにvarchar型で季語名を直接保存
- データ整合性の維持が困難
- 季語の詳細情報取得が非効率
- パフォーマンスの問題

### 移行後の利点
- ✅ **データ整合性**: 季語IDによる正規化された関連付け
- ✅ **パフォーマンス**: ID検索による高速化
- ✅ **拡張性**: 季語の詳細情報の効率的な取得
- ✅ **保守性**: 季語名変更時の一括更新が容易

## 移行前の準備

### 1. 環境確認

```bash
# Node.jsバージョン確認
node --version  # 16.0以上

# 依存関係の確認
npm list

# Supabase接続確認
node -e "console.log(process.env.SUPABASE_URL)"
```

### 2. バックアップ作成

```bash
# データベースバックアップ
node migration-tool.js analyze --backup

# コードバックアップ
git add .
git commit -m "Pre-migration backup"
git tag pre-relational-migration
```

## 段階的移行手順

### Phase 1: スキーマ更新（安全な準備段階）

#### 1.1 データベーススキーマ更新
```sql
-- schema-update.sql を実行
psql -h [host] -U [user] -d [database] -f schema-update.sql
```

#### 1.2 現状分析
```bash
# 現在のデータ状況を分析
node migration-tool.js analyze
```

**期待される出力例:**
```
📊 データ分析結果:
- 総レコード数: 1,234件
- seasonal_term有り: 987件
- keyword_id設定済み: 0件
- 移行が必要: 987件
```

### Phase 2: マイグレーション実行（データ移行）

#### 2.1 ドライラン実行
```bash
# ドライランでテスト（実際の更新なし）
node migration-tool.js migrate --dry-run
```

#### 2.2 実際のマイグレーション実行
```bash
# バックアップ付きでマイグレーション実行
node migration-tool.js migrate --backup --batch-size 50
```

**期待される出力例:**
```
🚀 マイグレーション開始...
💾 バックアップ作成完了: backup_haikus_1634567890123.json
📊 マイグレーション結果:
- 処理レコード数: 987件
- 成功: 923件 (93.5%)
- 失敗: 64件 (6.5%)
- 処理時間: 12.34秒
```

#### 2.3 結果検証
```bash
# 移行結果の確認
node migration-tool.js analyze
```

### Phase 3: アプリケーション更新（コード修正）

#### 3.1 フロントエンド更新
すでに実装済みの修正内容:
- ✅ `kigo-suggestions.js`: IDベースの季語処理
- ✅ HTMLフォームに`keyword_id`フィールド対応

#### 3.2 バックエンド更新
すでに実装済みの修正内容:
- ✅ `supabase-client.js`: ID取得対応
- ✅ 俳句投稿処理で`keyword_id`対応

#### 3.3 バッチ処理更新
```bash
# ID対応バッチ処理のテスト
node kigo-batch-processor.js -i test_sample.csv -o test_output.csv
```

### Phase 4: 検証とテスト

#### 4.1 機能テスト
```bash
# 季語サジェスト機能のテスト
# ブラウザでindex.htmlを開いて以下を確認:
# - 季語サジェストが正常に表示される
# - 季語選択時にkeyword_idが設定される
# - フォーム送信が正常に動作する
```

#### 4.2 データ整合性テスト
```sql
-- データ整合性確認クエリ
SELECT
    h.seasonal_term,
    k.display_name,
    COUNT(*) as mismatch_count
FROM haikus h
LEFT JOIN keywords k ON h.keyword_id = k.id
WHERE h.seasonal_term IS NOT NULL
AND h.keyword_id IS NOT NULL
AND h.seasonal_term != k.display_name
GROUP BY h.seasonal_term, k.display_name;
```

#### 4.3 パフォーマンステスト
```sql
-- 検索性能比較
EXPLAIN ANALYZE SELECT COUNT(*) FROM haikus WHERE seasonal_term = '桜';
EXPLAIN ANALYZE SELECT COUNT(*) FROM haikus h JOIN keywords k ON h.keyword_id = k.id WHERE k.display_name = '桜';
```

## トラブルシューティング

### 問題1: マイグレーションの失敗

**症状**: マッピングできない季語が多数存在
```
❌ マッピングできなかった季語 (64件):
  1. ID:123 - "桜花"
  2. ID:456 - "春風"
```

**解決方法**:
1. 季語マスターデータに不足している季語を追加
2. 代替表記を`display_name_alternatives`に登録
3. 再度マイグレーション実行

### 問題2: フォーム送信エラー

**症状**: 季語選択後の投稿でエラー発生

**解決方法**:
```html
<!-- HTMLフォームに必要なフィールドを追加 -->
<input type="hidden" name="keyword_id" id="inline-keyword-id">
<input type="hidden" name="seasonal_term" id="inline-seasonal-term">
<input type="hidden" name="season" id="inline-season">
```

### 問題3: パフォーマンス低下

**症状**: 季語検索が遅い

**解決方法**:
```sql
-- 必要なインデックスを確認・作成
CREATE INDEX IF NOT EXISTS idx_haikus_keyword_id ON haikus(keyword_id);
CREATE INDEX IF NOT EXISTS idx_keywords_display_name ON keywords(display_name);
ANALYZE haikus;
ANALYZE keywords;
```

## ロールバック手順

緊急時に従来のシステムに戻す場合:

### 1. アプリケーションコードのロールバック
```bash
git checkout pre-relational-migration
```

### 2. データベーススキーマのロールバック（慎重に実行）
```sql
-- keyword_idカラムを削除（データ損失注意）
ALTER TABLE haikus DROP COLUMN keyword_id;

-- インデックスの削除
DROP INDEX IF EXISTS idx_haikus_keyword_id;
```

### 3. バックアップからの復元
```bash
# バックアップファイルから復元
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('backup_haikus_[timestamp].json'));
// 復元処理のコード
"
```

## 移行チェックリスト

### 移行前
- [ ] 現状のデータ分析完了
- [ ] バックアップ作成完了
- [ ] 移行計画の関係者への共有完了
- [ ] テスト環境での移行テスト完了

### 移行中
- [ ] ドライラン実行で問題ないことを確認
- [ ] 本番マイグレーション実行
- [ ] エラーログの確認とフォローアップ
- [ ] データ整合性の検証

### 移行後
- [ ] 全機能の動作確認
- [ ] パフォーマンステスト実行
- [ ] ユーザーテスト実施
- [ ] モニタリング設定
- [ ] ドキュメント更新

## パフォーマンス最適化

### 推奨設定

#### データベース設定
```sql
-- 適切なインデックス設定
CREATE INDEX CONCURRENTLY idx_haikus_keyword_id ON haikus(keyword_id);
CREATE INDEX CONCURRENTLY idx_haikus_season ON haikus(season);
CREATE INDEX CONCURRENTLY idx_keywords_display_name ON keywords(display_name);

-- 統計情報の定期更新
ANALYZE haikus;
ANALYZE keywords;
```

#### アプリケーション設定
```javascript
// キャッシュ設定の最適化
const KIGO_CACHE_REFRESH_INTERVAL = 300000; // 5分
const PERFORMANCE_CONFIG = {
    MIN_TEXT_LENGTH: 5,
    MAX_HAIKU_LENGTH: 19,
    MAX_SUGGESTIONS: 5,
    MATCH_TIMEOUT: 50
};
```

## 移行後の運用

### 1. データ品質の監視
```bash
# 週次でデータ整合性をチェック
node migration-tool.js analyze > weekly_analysis.log
```

### 2. パフォーマンス監視
```sql
-- 季語検索の実行計画を定期確認
EXPLAIN ANALYZE SELECT COUNT(*) FROM haikus h
JOIN keywords k ON h.keyword_id = k.id
WHERE k.display_name = '桜';
```

### 3. 新規季語の追加手順
1. `keywords`テーブルに新しい季語を追加
2. 必要に応じて`display_name_alternatives`を設定
3. キャッシュのリフレッシュ（アプリケーション再起動）

## サポート

### ドキュメント
- [README_batch.md](./README_batch.md) - バッチ処理の詳細
- [schema-update.sql](./schema-update.sql) - スキーマ更新SQL
- [migration-tool.js](./migration-tool.js) - マイグレーションツール

### コマンドクイックリファレンス
```bash
# 分析
node migration-tool.js analyze

# ドライラン
node migration-tool.js migrate --dry-run

# 実行
node migration-tool.js migrate --backup

# バッチ処理
node kigo-batch-processor.js -i input.csv -o output.csv
```

---

**注意事項**: この移行は本番データに影響します。必ず事前にテスト環境で十分に検証してから実行してください。