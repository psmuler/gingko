# 俳句鑑賞＆記録アプリ「吟行」

地図上で俳句を視覚的に鑑賞・記録できるWebアプリケーション。句碑やゆかりの地と俳句を関連付け、地図インターフェースを通じて俳句文化を探索できます。

## 🎯 概要

「吟行」は俳句愛好家のための地図ベースのWebアプリです。俳句がどこで詠まれたか、句碑がどこにあるかを地図上で可視化し、俳句文化の地理的広がりを体感できます。

### 主な特徴

- **地図ベースの俳句探索**: 俳句を地図上のピンで表示し、視覚的に俳句文化を探索
- **3つの場所分類**: 句碑、紀行文、ゆかりの地による詳細な分類
- **シンプルな投稿機能**: ユーザー登録不要で誰でも俳句を投稿可能
- **俳句検索**: 俳句本文や詠み人名での全文検索
- **モバイル対応**: レスポンシブデザインでスマートフォンでも快適に利用

## 🚀 すぐに使ってみる

1. `index.html` をWebブラウザで開く
2. 地図上のピンをクリックして俳句を鑑賞
3. 右下の ✍️ ボタンから新しい俳句を投稿

## 📱 機能一覧

### 🗾 地図機能

- **俳句の地図表示**: 地図上のピンで俳句の位置を表示
- **季語による色分け**:
  - 🔵 春（青）
  - 🔴 夏（赤）
  - ⚪ 秋（白）
  - ⚫ 冬（黒）
  - 🟡 暮・新年（黄）
  - 🔘 その他（グレー）
- **現在地表示**: GPS機能を使った現在位置の取得
- **ピンクラスタリング**: 同一地域に複数俳句がある場合の見やすい表示

### ✍️ 俳句投稿機能

- **簡単投稿**: 俳句、詠み人、位置情報を入力して投稿
- **場所の種別選択**: 句碑、紀行文、ゆかりの地から選択
- **位置情報設定**: 手動入力または現在地取得
- **詠み人管理**: 新規詠み人登録または既存詠み人選択

### 🔍 検索機能

- **俳句本文検索**: 俳句の文言での部分一致検索
- **詠み人検索**: 詠み人の名前（漢字・ひらがな）での検索
- **季節フィルタ**: 春・夏・秋・冬・暮新年での絞り込み
- **リアルタイム検索**: 入力と同時に検索結果を表示

## 🛠 技術仕様

### フロントエンド

- **HTML5**: セマンティックなマークアップ
- **CSS3**: CSS変数を使用したモダンなスタイリング、完全レスポンシブ
- **JavaScript**: ES6+のモダンな記法、非同期処理（async/await）
- **地図ライブラリ**: Leaflet + OpenStreetMap
- **外部ライブラリ**: Supabase JavaScript SDK

### バックエンド・データベース

- **Supabase**: PostgreSQLベースのBaaS（Backend as a Service）
- **リアルタイム機能**: Supabaseのリアルタイム機能でデータ同期
- **RESTful API**: 自動生成されたRESTful APIエンドポイント
- **Row Level Security**: Supabaseの権限管理機能

### アーキテクチャパターン

- **APIアダプター**: Supabase/GAS API切り替え可能な統合インターフェース
- **モジュール分離**: 機能別にJavaScriptファイルを分割
- **設定駆動**: `config.js`での集中的な設定管理

## 📂 プロジェクト構成

```
俳句鑑賞アプリ/
├── index.html              # メインHTML
├── styles.css              # スタイルシート
├── script.js               # メインJavaScript
├── config.js               # アプリ設定ファイル
├── supabase-client.js      # Supabaseクライアント
├── api-adapter.js          # API統合インターフェース
├── api-client.js           # GAS APIクライアント（後方互換）
├── CLAUDE.md              # 開発仕様書
├── README.md              # このファイル
├── requirements.txt       # Python依存関係
├── supabase_setup.sql     # データベースセットアップ
├── gas_api/               # Google Apps Script API関連
├── misc/                  # その他ファイル
└── venv/                  # Python仮想環境
```

## 🗃 データベース構造

### テーブル設計

#### `poets`（詠み人テーブル）
- `id`: 詠み人ID（主キー）
- `name`: 詠み人名
- `name_kana`: 詠み人名（ひらがな）
- `birth_year`: 生年
- `death_year`: 没年
- `period`: 時代
- `biography`: 経歴・説明

#### `haikus`（俳句テーブル）
- `id`: 俳句ID（主キー）
- `haiku_text`: 俳句本文
- `poet_id`: 詠み人ID（外部キー）
- `latitude`: 緯度
- `longitude`: 経度
- `location_type`: 場所種別（句碑/紀行文/ゆかりの地）
- `location_name`: 場所名
- `date_composed`: 詠まれた日付
- `description`: 説明・備考
- `season`: 季節
- `seasonal_term`: 季語

### サンプルデータ

現在約10,000件の俳句データと100名の詠み人データを収録しています。

## ⚙️ セットアップ・設定

### 1. 基本セットアップ

1. プロジェクトをダウンロード
2. `config.js`でSupabase接続情報を設定
3. Webサーバーで公開するか、ローカルで`index.html`を開く

### 2. Supabase設定

```javascript
// config.js
const SUPABASE_CONFIG = {
    url: 'https://your-project-id.supabase.co',
    anon_key: 'your-anon-key-here'
};
```

### 3. データベース初期化

```sql
-- supabase_setup.sqlを実行
-- テーブル作成とインデックス設定
```

## 🎮 使い方

### ユーザー向け

1. **俳句を見つける**
   - 地図をドラッグ・ズームして探索
   - ピンをクリックして俳句詳細を確認

2. **俳句を投稿する**
   - 右下の✍️ボタンをクリック
   - フォームに俳句、詠み人、位置情報を入力
   - 投稿ボタンで送信

3. **俳句を検索する**
   - 検索ボックスに俳句や詠み人名を入力
   - リアルタイムで検索結果を表示

### 開発者向け

1. **設定変更**
   ```javascript
   // config.jsでの設定例
   const APP_CONFIG = {
       USE_SUPABASE: true,  // Supabase使用フラグ
       DEBUG_MODE: false    // デバッグモード
   };
   ```

2. **APIの切り替え**
   - `config.js`の`USE_SUPABASE`フラグでSupabase/GAS API切り替え
   - APIアダプターが透過的に処理を切り替え

3. **スタイル変更**
   ```css
   /* styles.css - CSS変数での季節色変更例 */
   :root {
       --primary-color: #2c5aa0;
       --marker-spring: #3498db;  /* 春の色を変更 */
       --marker-summer: #e74c3c;  /* 夏の色を変更 */
   }
   ```

## 🔧 カスタマイズ

### 地図設定の変更

```javascript
// config.js
const MAP_CONFIG = {
    DEFAULT_CENTER: [35.6812, 139.7671], // 初期表示位置
    DEFAULT_ZOOM: 10,
    MARKER_COLORS: {
        '春': '#3498db',    // 青
        '夏': '#e74c3c',    // 赤
        '秋': '#ffffff',    // 白
        '冬': '#2c3e50',    // 黒
        '暮・新年': '#f1c40f', // 黄
        'その他': '#95a5a6'  // グレー
    }
};
```

### UI設定の調整

```javascript
// config.js
const UI_CONFIG = {
    LOADING_MIN_TIME: 500,
    ERROR_DISPLAY_TIME: 5000
};
```

## 🧪 開発・テスト

### ローカル開発

```bash
# ローカルサーバーで開発する場合（Python）
python -m http.server 8000

# または（Node.js）
npx serve .
```

### デバッグ

```javascript
// config.js
const APP_CONFIG = {
    DEBUG_MODE: true  // コンソールログを詳細表示
};
```

## 📊 パフォーマンス

### 最適化済み機能

- **インデックス設定**: 地理検索、全文検索用の最適化されたインデックス
- **レスポンシブ画像**: 地図タイルの適切なキャッシュ
- **非同期読み込み**: JavaScriptの並列読み込み
- **データ圧縮**: 必要最小限のデータ転送

### 推奨環境

- **ブラウザ**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **ネットワーク**: 3G以上の通信環境
- **デバイス**: 画面解像度 320px以上

## 🤝 コントリビューション

### データ投稿

- アプリ内の投稿フォームから俳句データを追加
- 句碑の位置情報や写真の提供

### 開発参加

- GitHubでのIssue報告、Pull Request歓迎
- 機能追加や不具合修正の提案

### データ提供

- CSV形式での大量データ提供
- 句碑の写真や位置情報の提供

## 📄 ライセンス

このプロジェクトはオープンソースです。教育・研究・個人利用は自由に行えます。

## 🙏 謝辞

- 俳句データの提供者の皆様
- OpenStreetMapコミュニティ
- Supabaseチーム
- Leaflet開発チーム

## 📞 サポート・連絡

- **バグ報告**: GitHubのIssues
- **機能要望**: GitHubのIssues
- **質問**: GitHubのDiscussions

---

*俳句文化をデジタルで保存・共有し、次世代に継承することを目指しています。*