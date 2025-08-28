# 俳句鑑賞＆記録アプリ開発仕様書

## プロジェクト概要

地図上で俳句を視覚的に鑑賞・記録できるWebアプリケーション。句碑やゆかりの地と俳句を関連付け、地図インターフェースを通じて俳句文化を探索できる。

## 基本機能

### 1. 地図上での俳句表示機能
- 地図上に俳句の位置をピンで表示
- ピンをタップすると俳句の詳細情報を表示
  - 詠み人
  - 俳句本文
  - 詠んだ日付
  - 関連する場所情報（句碑、紀行文、ゆかりの地など）

### 2. 俳句の投稿機能
- 新しい俳句の登録
- 位置情報の設定（手動選択または現在地取得）
- 俳句に関連する場所の種別選択（句碑/紀行文/ゆかりの地）
- 詠み人情報の入力または既存詠み人の選択

### 3. 詠み人管理機能
- 詠み人の新規登録
- 既存詠み人情報の編集
- 詠み人別の俳句一覧表示

### 4. CSVを使った一括アップロード機能
- 俳句データのCSV形式での一括インポート
- 詠み人データのCSV形式での一括インポート
- エラーハンドリングとデータ検証

## 地図機能仕様

### 地図表示
- レスポンシブ対応の地図インターフェース
- ズームイン/アウト機能
- 現在地表示機能

### 俳句と場所の関連付け
- **句碑**: 実際に俳句が刻まれた石碑の位置
- **紀行文**: 俳句が詠まれた旅の記録に関連する場所
- **ゆかりの地**: 俳句や詠み人に縁のある土地

### インタラクション
- ピンのクラスター表示（同一地域に複数俳句がある場合）
- フィルタリング機能（時代別、詠み人別、場所種別）
- 検索機能（俳句本文、詠み人名での検索）

## ユーザー体験設計

### アクセス方式
- ユーザー登録不要
- 匿名でのデータ閲覧・投稿が可能

### データの公開性
- オープンなデータベース構造
- すべてのユーザーが俳句の登録・編集可能
- 荒らし対策として編集履歴の保持

### シンプルなUI/UX
- 評価機能なし
- コメント機能なし
- 俳句そのものに集中できるミニマルなデザイン

## 技術仕様

### フロントエンド
- **HTML5**: セマンティックなマークアップ
- **CSS3**: レスポンシブデザイン、モバイルファースト
- **JavaScript**: 
  - 地図API連携（Google Maps API または OpenStreetMap）
  - 非同期通信（Fetch API）
  - CSV解析ライブラリ

### バックエンド
- **Supabase**
  - PostgreSQLデータベース
  - RESTful API エンドポイント（自動生成）
  - リアルタイム機能
  - Row Level Security（権限管理）
  - 認証・認可機能
  - 高速クエリ処理

### データベース構造（Supabase PostgreSQL）

#### 現在のデータ規模
- 俳句データ: 10,000行 × 14列
- 詠み人データ: 100行 × 9列

#### 1. 詠み人テーブル（poets）
```sql
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
```

#### 2. 俳句テーブル（haikus）
```sql
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
```

#### インデックス設定（パフォーマンス最適化）
```sql
-- 地理的検索用インデックス
CREATE INDEX idx_haikus_location ON haikus USING GIST (point(longitude, latitude));

-- 詠み人検索用インデックス
CREATE INDEX idx_haikus_poet_id ON haikus(poet_id);

-- 場所種別検索用インデックス
CREATE INDEX idx_haikus_location_type ON haikus(location_type);

-- 全文検索インデックス（俳句本文検索用）
CREATE INDEX idx_haikus_text_search ON haikus USING gin(to_tsvector('japanese', haiku_text));

-- 詠み人名検索用インデックス
CREATE INDEX idx_poets_name_search ON poets USING gin(to_tsvector('japanese', name));
```

### API エンドポイント（Supabase）

#### 俳句関連
- `GET /api/haikus` - 俳句一覧取得（フィルタ・ソート対応）
- `GET /api/haikus/{id}` - 特定俳句取得
- `POST /api/haikus` - 俳句新規登録
- `PUT /api/haikus/{id}` - 俳句更新
- `DELETE /api/haikus/{id}` - 俳句削除
- `GET /api/haikus/with-poets` - 詠み人情報付き俳句取得

#### 詠み人関連
- `GET /api/poets` - 詠み人一覧取得
- `GET /api/poets/{id}` - 特定詠み人取得
- `POST /api/poets` - 詠み人新規登録
- `PUT /api/poets/{id}` - 詠み人更新

#### 検索・フィルタリング
- `GET /api/haikus/search?q={keyword}` - 俳句本文検索
- `GET /api/haikus/filter?location_type={type}` - 場所種別フィルタ
- `GET /api/haikus/geo?lat1={lat1}&lat2={lat2}&lng1={lng1}&lng2={lng2}` - 地理的範囲検索

#### 一括処理（将来実装予定）
- `POST /api/haikus/bulk` - 俳句CSV一括アップロード
- `POST /api/poets/bulk` - 詠み人CSV一括アップロード

### CSV形式仕様

#### 俳句CSVフォーマット
```csv
haiku_text,poet_name,latitude,longitude,location_type,date_composed,location_name,description
"古池や蛙飛び込む水の音",松尾芭蕉,35.7028,139.7753,ゆかりの地,1686-01-01,深川,芭蕉庵での句
```

#### 詠み人CSVフォーマット
```csv
name,name_kana,birth_year,death_year,period,biography
松尾芭蕉,まつおばしょう,1644,1694,江戸時代前期,俳諧の大成者
```

## データベース移行計画

### 移行の背景
**課題**: スプレッドシート（1万行データ）でのID検索時に全行読み込みによるパフォーマンス問題  
**目標**: 高速検索・CRUD操作・ユーザー投稿機能の実現

### Supabase採用理由
- PostgreSQLベースで高いクエリ性能
- リレーショナルデータに最適
- リアルタイム機能標準搭載
- Row Level Security（将来の権限管理に対応可能）
- 無料枠で十分対応可能（500MB DB、50,000 API呼び出し/月）

## 開発フェーズ（移行版）

### Phase 1: データベース移行（4-5日）
#### 1.1 環境構築（1日）
- Supabaseプロジェクト作成
- データベーススキーマ作成
- サンプルデータ投入・テスト

#### 1.2 データ移行（2-3日）
- スプレッドシートからCSVエクスポート
- データクレンジング・正規化
- Supabaseへのデータインポート
- データ整合性確認

#### 1.3 API実装（3-4日）
- Supabase クライアント設定
- 基本CRUD操作の実装
- 検索・フィルタリング機能

### Phase 2: フロントエンド改修（2-3日）
- 既存のスプレッドシート連携コード削除
- Supabase APIへの置き換え
- エラーハンドリング改善
- ローディング状態の改善

### Phase 3: パフォーマンス最適化（1-2日）
- パフォーマンステスト
- クエリ最適化
- ユーザー受入テスト

### Phase 4: 機能拡張
- CSV一括アップロード機能
- 句碑写真アップロード機能
- 高度な検索・フィルタリング
- UI/UX改善

## 非機能要件

### パフォーマンス要件
- ID検索の応答時間: 100ms以下
- 一般検索の応答時間: 500ms以下
- 同時ユーザー: 100人まで対応
- データ整合性: 100%維持
- モバイル環境での快適な動作
- 地図読み込み時間の最適化

#### パフォーマンス最適化戦略
**データベースレベル**
- 適切なインデックス設定
- クエリプランの確認・最適化
- Connection poolingの活用

**アプリケーションレベル**
- キャッシュ戦略（人気の俳句・作者）
- 遅延読み込み（Lazy loading）

**フロントエンドレベル**
- ピン地点表示（クラスタ表示）
- 検索結果のデバウンス処理
- プリフェッチング（次ページデータ）

### セキュリティ
- XSS対策
- CSRF対策
- 入力値検証
- レート制限

### 可用性
- Supabaseの高可用性機能活用
- エラーハンドリング
- グレースフルデグラデーション

#### 移行リスク管理
**データ移行リスク**
- **リスク**: データ不整合・欠損
- **対策**: 段階的移行、ロールバック計画

**パフォーマンスリスク**
- **リスク**: 想定以上のトラフィック
- **対策**: モニタリング設定、スケーリング計画

**運用リスク**
- **リスク**: データベース障害
- **対策**: Supabaseの高可用性機能活用

## 今後の拡張可能性

- 多言語対応
- 俳句の音声読み上げ機能
- 季語・季節での絞り込み機能
- 俳句の画像表示機能
- GPSを活用した位置ベース通知
- 俳句散歩ルート機能

---

*この仕様書は開発の進行に合わせて継続的に更新されます。*