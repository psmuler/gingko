-- ===============================================================================
-- 俳句アプリ Supabase 完全スキーマ
-- 最新バージョン (keyword_id, status, poetry_type 含む)
-- ===============================================================================

-- ===============================================================================
-- 1. テーブル作成
-- ===============================================================================

-- 詠み人テーブル
CREATE TABLE IF NOT EXISTS poets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  name_kana VARCHAR(200),
  birth_year INTEGER,
  death_year INTEGER,
  period VARCHAR(50),
  biography TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 季語テーブル
CREATE TABLE IF NOT EXISTS keywords (
  id SERIAL PRIMARY KEY,
  display_name VARCHAR(100) NOT NULL,
  display_name_alternatives TEXT,
  type VARCHAR(50),
  season VARCHAR(10),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 俳句テーブル (最新版: keyword_id, status, poetry_type 含む)
CREATE TABLE IF NOT EXISTS haikus (
  id SERIAL PRIMARY KEY,
  haiku_text TEXT NOT NULL,
  poet_id INTEGER REFERENCES poets(id),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_type VARCHAR(20) CHECK (location_type IN ('句碑', '紀行文', 'ゆかりの地')),
  date_composed DATE,
  location_name VARCHAR(200),
  date_composed_era VARCHAR(50),
  description TEXT,
  season VARCHAR(10),
  seasonal_term VARCHAR(50),
  keyword_id INTEGER,
  status VARCHAR(20) DEFAULT 'published' NOT NULL,
  poetry_type VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- statusの制約
ALTER TABLE haikus
ADD CONSTRAINT chk_haikus_status
CHECK (status IN ('draft', 'published'));

-- コメント追加
COMMENT ON COLUMN haikus.keyword_id IS '季語ID（keywordsテーブルのidを参照）';
COMMENT ON COLUMN haikus.status IS '俳句のステータス（draft: 下書き, published: 投稿済み）';

-- ===============================================================================
-- 2. インデックス作成
-- ===============================================================================

-- 地理的検索用インデックス
CREATE INDEX IF NOT EXISTS idx_haikus_location ON haikus USING GIST (point(longitude, latitude));

-- 詠み人検索用インデックス
CREATE INDEX IF NOT EXISTS idx_haikus_poet_id ON haikus(poet_id);

-- 場所種別検索用インデックス
CREATE INDEX IF NOT EXISTS idx_haikus_location_type ON haikus(location_type);

-- 全文検索インデックス（俳句本文検索用）
CREATE INDEX IF NOT EXISTS idx_haikus_text_search ON haikus USING gin(to_tsvector('simple', haiku_text));

-- 詠み人名検索用インデックス
CREATE INDEX IF NOT EXISTS idx_poets_name_search ON poets USING gin(to_tsvector('simple', name));

-- 季語関連インデックス
CREATE INDEX IF NOT EXISTS idx_haikus_keyword_id ON haikus(keyword_id);
CREATE INDEX IF NOT EXISTS idx_haikus_seasonal_term ON haikus(seasonal_term);
CREATE INDEX IF NOT EXISTS idx_haikus_season ON haikus(season);

-- ステータス関連インデックス
CREATE INDEX IF NOT EXISTS idx_haikus_status ON haikus(status);
CREATE INDEX IF NOT EXISTS idx_haikus_status_created_at ON haikus(status, created_at DESC);

-- ===============================================================================
-- 3. トリガー関数
-- ===============================================================================

-- 更新日時用のトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 更新日時自動更新トリガー
DROP TRIGGER IF EXISTS update_poets_updated_at ON poets;
CREATE TRIGGER update_poets_updated_at BEFORE UPDATE ON poets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_haikus_updated_at ON haikus;
CREATE TRIGGER update_haikus_updated_at BEFORE UPDATE ON haikus
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_keywords_updated_at ON keywords;
CREATE TRIGGER update_keywords_updated_at BEFORE UPDATE ON keywords
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================================================================
-- 4. RLS (Row Level Security)
-- ===============================================================================

-- RLS有効化
ALTER TABLE poets ENABLE ROW LEVEL SECURITY;
ALTER TABLE haikus ENABLE ROW LEVEL SECURITY;
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;

-- 全アクセス許可ポリシー（開発用）
DROP POLICY IF EXISTS "Enable all access for poets" ON poets;
CREATE POLICY "Enable all access for poets" ON poets FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all access for haikus" ON haikus;
CREATE POLICY "Enable all access for haikus" ON haikus FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all access for keywords" ON keywords;
CREATE POLICY "Enable all access for keywords" ON keywords FOR ALL USING (true);

-- ===============================================================================
-- 5. サンプルデータ投入（冪等性確保）
-- ===============================================================================

-- 詠み人サンプルデータ
INSERT INTO poets (id, name, name_kana, birth_year, death_year, period, biography) VALUES
(1, '松尾芭蕉', 'まつおばしょう', 1644, 1694, '江戸時代前期', '俳諧の大成者'),
(2, '与謝蕪村', 'よさぶそん', 1716, 1784, '江戸時代中期', '俳句と絵画の巨匠'),
(3, '小林一茶', 'こばやしいっさ', 1763, 1828, '江戸時代後期', '庶民的な俳句で知られる')
ON CONFLICT (id) DO NOTHING;

-- 俳句サンプルデータ
INSERT INTO haikus (id, haiku_text, poet_id, latitude, longitude, location_type, date_composed, location_name, description, status) VALUES
(1, '古池や蛙飛び込む水の音', 1, 35.7028, 139.7753, 'ゆかりの地', '1686-01-01', '深川', '芭蕉庵での句', 'published'),
(2, '夏草や兵どもが夢の跡', 1, 39.0021, 141.1274, '紀行文', '1689-05-13', '平泉', '奥の細道での句', 'published'),
(3, '菜の花や月は東に日は西に', 2, 35.0116, 135.7681, 'ゆかりの地', '1745-03-15', '京都', '蕪村の代表作', 'published')
ON CONFLICT (id) DO NOTHING;

-- シーケンスの調整（サンプルデータのID競合回避）
SELECT setval('poets_id_seq', (SELECT COALESCE(MAX(id), 1) FROM poets), true);
SELECT setval('haikus_id_seq', (SELECT COALESCE(MAX(id), 1) FROM haikus), true);

-- ===============================================================================
-- 6. 統計情報の更新
-- ===============================================================================

ANALYZE poets;
ANALYZE haikus;
ANALYZE keywords;
