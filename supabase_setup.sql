-- 俳句アプリ Supabase データベースセットアップ
-- CLAUDE.mdの仕様に基づく

-- 詠み人テーブル作成
CREATE TABLE poets (
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

-- 俳句テーブル作成
CREATE TABLE haikus (
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- パフォーマンス最適化用インデックス作成

-- 地理的検索用インデックス
CREATE INDEX idx_haikus_location ON haikus USING GIST (point(longitude, latitude));

-- 詠み人検索用インデックス
CREATE INDEX idx_haikus_poet_id ON haikus(poet_id);

-- 場所種別検索用インデックス
CREATE INDEX idx_haikus_location_type ON haikus(location_type);

-- 全文検索インデックス（俳句本文検索用）
-- 日本語検索のためのインデックス
CREATE INDEX idx_haikus_text_search ON haikus USING gin(to_tsvector('simple', haiku_text));

-- 詠み人名検索用インデックス
CREATE INDEX idx_poets_name_search ON poets USING gin(to_tsvector('simple', name));

-- 更新日時用のトリガー関数作成
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 更新日時自動更新トリガー
CREATE TRIGGER update_poets_updated_at BEFORE UPDATE ON poets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_haikus_updated_at BEFORE UPDATE ON haikus
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS（Row Level Security）の準備（将来の権限管理用）
-- 現在は全てのユーザーがアクセス可能にしておく
ALTER TABLE poets ENABLE ROW LEVEL SECURITY;
ALTER TABLE haikus ENABLE ROW LEVEL SECURITY;

-- 一時的に全アクセス許可
CREATE POLICY "Enable all access for poets" ON poets FOR ALL USING (true);
CREATE POLICY "Enable all access for haikus" ON haikus FOR ALL USING (true);

-- サンプルデータ投入（テスト用）
INSERT INTO poets (name, name_kana, birth_year, death_year, period, biography) VALUES
('松尾芭蕉', 'まつおばしょう', 1644, 1694, '江戸時代前期', '俳諧の大成者'),
('与謝蕪村', 'よさぶそん', 1716, 1784, '江戸時代中期', '俳句と絵画の巨匠'),
('小林一茶', 'こばやしいっさ', 1763, 1828, '江戸時代後期', '庶民的な俳句で知られる');

INSERT INTO haikus (haiku_text, poet_id, latitude, longitude, location_type, date_composed, location_name, description) VALUES
('古池や蛙飛び込む水の音', 1, 35.7028, 139.7753, 'ゆかりの地', '1686-01-01', '深川', '芭蕉庵での句'),
('夏草や兵どもが夢の跡', 1, 39.0021, 141.1274, '紀行文', '1689-05-13', '平泉', '奥の細道での句'),
('菜の花や月は東に日は西に', 2, 35.0116, 135.7681, 'ゆかりの地', '1745-03-15', '京都', '蕪村の代表作');