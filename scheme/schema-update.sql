-- ===============================================================================
-- 季語システム リレーショナル化 スキーマ更新SQL
-- 既存のvarchar型seasonal_termからID型keyword_idへの移行
-- ===============================================================================

-- 1. haikuテーブルにkeyword_idカラムを追加
-- ===============================================================================

-- keyword_idカラムの追加（外部キー制約なしで開始）
ALTER TABLE haikus
ADD COLUMN keyword_id INTEGER;

-- コメントを追加
COMMENT ON COLUMN haikus.keyword_id IS '季語ID（keywordsテーブルのidを参照）';

-- ===============================================================================
-- 2. インデックスの作成
-- ===============================================================================

-- keyword_idに対するインデックスを作成（検索性能向上）
CREATE INDEX idx_haikus_keyword_id ON haikus(keyword_id);

-- seasonal_term検索用のインデックス（移行期間中の検索性能向上）
CREATE INDEX idx_haikus_seasonal_term ON haikus(seasonal_term);

-- 季節による検索のインデックス
CREATE INDEX idx_haikus_season ON haikus(season);

-- ===============================================================================
-- 3. 外部キー制約の追加（マイグレーション完了後に実行）
-- ===============================================================================

-- 注意: マイグレーション完了後、データ整合性が確保されてから実行してください
-- ALTER TABLE haikus
-- ADD CONSTRAINT fk_haikus_keyword_id
-- FOREIGN KEY (keyword_id) REFERENCES keywords(id);

-- ===============================================================================
-- 4. 統計情報の更新
-- ===============================================================================

-- テーブル統計の更新（PostgreSQL）
ANALYZE haikus;
ANALYZE keywords;

-- ===============================================================================
-- 5. 動作確認用クエリ
-- ===============================================================================

-- keyword_idカラムが正しく追加されたかを確認
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'haikus'
AND column_name IN ('seasonal_term', 'keyword_id', 'season')
ORDER BY ordinal_position;

-- インデックスが作成されたかを確認
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'haikus'
AND indexname LIKE '%keyword%' OR indexname LIKE '%seasonal%';

-- サンプルデータでのJOIN確認
SELECT
    h.id,
    h.haiku_text,
    h.seasonal_term,
    h.keyword_id,
    k.display_name AS keyword_name,
    k.season AS keyword_season,
    h.season AS haiku_season
FROM haikus h
LEFT JOIN keywords k ON h.keyword_id = k.id
WHERE h.seasonal_term IS NOT NULL
LIMIT 5;

-- ===============================================================================
-- 6. パフォーマンステスト用クエリ
-- ===============================================================================

-- 従来のvarchar検索
EXPLAIN ANALYZE
SELECT COUNT(*) FROM haikus
WHERE seasonal_term = '桜';

-- 新しいID検索（マイグレーション後）
EXPLAIN ANALYZE
SELECT COUNT(*) FROM haikus h
JOIN keywords k ON h.keyword_id = k.id
WHERE k.display_name = '桜';

-- ===============================================================================
-- 7. データ整合性チェック
-- ===============================================================================

-- seasonal_termとkeyword_idの整合性確認
SELECT
    h.seasonal_term,
    k.display_name,
    COUNT(*) as count
FROM haikus h
LEFT JOIN keywords k ON h.keyword_id = k.id
WHERE h.seasonal_term IS NOT NULL
AND h.keyword_id IS NOT NULL
AND h.seasonal_term != k.display_name
GROUP BY h.seasonal_term, k.display_name
ORDER BY count DESC;

-- マイグレーション状況の確認
SELECT
    'Total haikus' AS metric,
    COUNT(*) AS count
FROM haikus
UNION ALL
SELECT
    'With seasonal_term' AS metric,
    COUNT(*) AS count
FROM haikus
WHERE seasonal_term IS NOT NULL AND seasonal_term != ''
UNION ALL
SELECT
    'With keyword_id' AS metric,
    COUNT(*) AS count
FROM haikus
WHERE keyword_id IS NOT NULL
UNION ALL
SELECT
    'Migration needed' AS metric,
    COUNT(*) AS count
FROM haikus
WHERE seasonal_term IS NOT NULL
AND seasonal_term != ''
AND keyword_id IS NULL;

-- ===============================================================================
-- 8. ロールバック用SQL（緊急時用）
-- ===============================================================================

-- 注意: これらのコマンドは慎重に実行してください

-- keyword_idカラムの削除（緊急時のみ）
-- ALTER TABLE haikus DROP COLUMN keyword_id;

-- インデックスの削除（緊急時のみ）
-- DROP INDEX IF EXISTS idx_haikus_keyword_id;
-- DROP INDEX IF EXISTS idx_haikus_seasonal_term;
-- DROP INDEX IF EXISTS idx_haikus_season;

-- 外部キー制約の削除（緊急時のみ）
-- ALTER TABLE haikus DROP CONSTRAINT IF EXISTS fk_haikus_keyword_id;

-- ===============================================================================
-- 実行ログ
-- ===============================================================================

-- このSQLファイルの実行記録
-- 実行日時: [実行時に記録]
-- 実行者: [実行者名を記録]
-- 結果: [成功/失敗を記録]
-- 備考: [特記事項があれば記録]