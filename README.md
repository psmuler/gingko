# 俳句鑑賞＆記録アプリ「吟行」

言葉と場所を結ぶ、俳句の新しい楽しみ方「吟行」とは、旅先で心が動いた瞬間を捉え、俳句を作る（吟じる）ことです。
ルートを事前に決めたり、複数人で同じ場所を巡り、お互いに作った詩を選評し合うこともあります。
机に向かい頭を捻るのではなく、実際にその場に立つことで俳句そのものも変化し、より深い味わいが生まれます。
また、逆に俳句を利用して旅を豊かに記録することができます。
このアプリは、そんな「座」の文学をさらに広げるために、場所場所に紐づいた詩句をわかりやすく表示することを目指しています。

## 🎯 概要

「吟行」は俳句愛好家のための地図ベースのWebアプリです。俳句がどこで詠まれたか、句碑がどこにあるかを地図上で可視化し、俳句文化の地理的広がりを体感できます。

### 主な特徴

- **地図ベースの俳句探索**: 俳句を地図上のピンで表示し、土地の季節を可視化
- **季語ガチャ機能**: 季語をランダムに引いて俳句創作を楽しめる新機能
- **ウェルカム画面**: 初回訪問者向けのオンボーディング体験
- **直感的な投稿フロー**: 地図タップから始まる簡単な作品投稿
- **季語自動検出**: 入力した俳句から季語と季節を自動判定
- **モバイルファースト**: レスポンシブデザインでスマートフォンでも快適に利用

## 🚀 すぐに使ってみる

1. `https://psmuler.github.io/gingko/` をWebブラウザで開く
2. 初回訪問時はウェルカム画面が表示されます
3. 地図上のピンをタップして俳句を鑑賞
4. 空白の場所をタップして新しい俳句を投稿
5. 季語ガチャで創作のインスピレーションを得る

## 📱 機能一覧

### 🗾 地図機能

- **俳句の地図表示**: 地図上のピンで俳句の位置を表示
  - 季節別に色分け（春:青、夏:赤、秋:白、冬:黒、暮・新年:黄）
- **地図タップで投稿**: 空白の場所をタップして俳句投稿画面へ
- **現在地ナビゲーション**: 十字マークボタンで現在地に戻る
- **スムーズなインタラクション**: ピンチ・パン操作で自由に地図を探索

### ✍️ 俳句投稿機能

- **直感的な投稿フロー**: 地図タップから始まる簡単な入力
- **季語自動検出**: 俳句本文から季語と季節を自動判定
- **フォームコンポーネント**: 再利用可能な俳句入力フォーム
- **場所の種別選択**: 句碑、紀行文、ゆかりの地から選択
- **詠み人管理**: 新規詠み人登録または既存詠み人選択

### 🎲 季語ガチャ機能

- **ランダム季語抽選**: 季語辞書から季語をランダムに引ける
- **創作支援**: 引いた季語から俳句作成画面へ直接遷移
- **季語データベース連携**: keywords.csvから充実した季語データを提供

### 🏠 ページ構成

- **ルーティングハブ** (`index.html`): 初回訪問判定と適切なページへの誘導
- **ウェルカム画面** (`welcome.html`): 初回訪問者向けのアプリ紹介
- **ホーム画面** (`home.html`): メインの地図表示と作品鑑賞
- **俳句作成画面** (`haiku-compose.html`): 作品投稿専用ページ
- **季語ガチャ** (`kigo-gatcha.html`): 季語抽選とゲーム要素
- **アプリ情報** (`about.html`): 使い方とピンの見方の説明

## 🛠 技術仕様

### フロントエンド

- **HTML5**: セマンティックなマークアップ
- **CSS3**: CSS変数を使用したモダンなスタイリング、完全レスポンシブ
- **JavaScript**: ES6+のモダンな記法、非同期処理（async/await）
- **地図ライブラリ**: Leaflet + OpenStreetMap + MarkerCluster プラグイン
- **クラスタリング**: Leaflet.markercluster による動的ピングループ化
- **外部ライブラリ**: Supabase JavaScript SDK

### バックエンド・データベース

- **Supabase**: PostgreSQLベースのBaaS（Backend as a Service）
- **リアルタイム機能**: Supabaseのリアルタイム機能でデータ同期
- **RESTful API**: 自動生成されたRESTful APIエンドポイント
- **Row Level Security**: Supabaseの権限管理機能

### アーキテクチャパターン

- **APIアダプター**: Supabase/GAS API切り替え可能な統合インターフェース
- **モジュール分離**: 機能別にJavaScriptファイルを分割
- **AppManager パターン**: 中央集権的なアプリケーション状態管理
- **ユーティリティ分離**: 共通処理を`utils.js`で独立管理
- **設定駆動**: `config.js`での集中的な設定管理

## 📂 プロジェクト構成

```
claude_proj/
├── docs/                      # メインアプリケーションディレクトリ（GitHub Pagesで公開）
│   ├── index.html            # ルーティングハブ（初回訪問判定）
│   ├── welcome.html          # ウェルカム画面
│   ├── home.html             # メイン地図画面
│   ├── haiku-compose.html    # 俳句作成専用ページ
│   ├── kigo-gatcha.html      # 季語ガチャページ
│   ├── about.html            # アプリ情報・使い方
│   ├── fav_links.html        # お気に入りリンク
│   ├── favicon.png           # ファビコン
│   ├── ogp.png               # OGP画像
│   ├── css/
│   │   └── styles.css        # メインスタイルシート
│   └── js/
│       ├── main.js           # エントリーポイント
│       ├── script.js         # メインロジック
│       ├── app-manager.js    # アプリケーション状態管理
│       ├── config.js         # アプリ設定
│       ├── utils.js          # 共通ユーティリティ
│       ├── supabase-client.js           # Supabaseクライアント
│       ├── api-adapter.js               # API統合インターフェース
│       ├── kigo-suggestions.js          # 季語サジェスト・自動検出
│       ├── seasonal-suggest.js          # 季節推定機能
│       ├── pin-posting.js               # ピン投稿機能
│       ├── haiku-form-component.js      # 俳句入力フォームコンポーネント
│       ├── kigo-gatcha.js               # 季語ガチャロジック
│       ├── kigo-gatcha-logic.js         # 季語ガチャコアロジック
│       ├── kigo-batch-processor.js      # 季語バッチ処理
│       ├── migration-tool.js            # データ移行ツール
│       ├── data_migration.js            # データ移行スクリプト
│       └── migrate-keywords.js          # 季語データ移行
├── scheme/                    # データベーススキーマ・テンプレート
│   ├── supabase_setup.sql    # データベースセットアップSQL
│   ├── schema-update.sql     # スキーマ更新SQL
│   ├── keywords.csv          # 季語データベース
│   ├── haikus_template.csv   # 俳句テンプレート
│   └── poets_template.csv    # 詠み人テンプレート
├── misc/                      # 開発ツール・補助スクリプト
│   ├── extractor/            # データ抽出ツール
│   ├── locator/              # 位置情報処理
│   ├── poet_id_identifier/   # 詠み人ID管理
│   ├── deduplicator/         # 重複削除ツール
│   └── updater/              # データ更新ツール
├── prompts_guides/            # 開発ガイド・プロンプト集
├── log/                       # ログファイル
├── package.json               # Node.js依存関係
├── server.js                  # ローカル開発サーバー
├── requirements.txt           # Python依存関係
├── README.md                  # このファイル
└── .gitignore                 # Git除外設定
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

現在約100件の俳句データと10名の詠み人データを収録しています。

## ⚙️ セットアップ・設定

### 1. 基本セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/psmuler/claude_proj.git
cd claude_proj

# Node.js依存関係をインストール
npm install

# ローカル開発サーバーを起動
npm start
# または開発モード（自動リロード）
npm run dev
```

### 2. Supabase設定

`docs/js/config.js`でSupabase接続情報を設定:

```javascript
// config.js
const SUPABASE_CONFIG = {
    url: 'https://your-project-id.supabase.co',
    anon_key: 'your-anon-key-here'
};
```

### 3. データベース初期化

```bash
# Supabaseダッシュボードでscheme/supabase_setup.sqlを実行
# テーブル作成とインデックス設定が完了します

# 季語データを移行する場合（オプション）
npm run migrate-keywords
```

## 🎮 使い方

### ユーザー向け

1. **俳句を見つける**
   - 地図をドラッグ・ズームして探索
   - ピンをタップして俳句詳細を確認

2. **俳句を投稿する**
   - 地図上の空白の場所をタップ
   - 俳句、詠み人、位置情報を入力
   - 季語は自動的に検出されます

3. **季語ガチャを楽しむ**
   - メニューから「季語ガチャ」を選択
   - ランダムに季語を引いて俳句創作に挑戦

### 開発者向け

1. **ローカル開発**
   ```bash
   # 開発サーバーを起動
   npm run dev

   # ブラウザで http://localhost:3000 にアクセス
   ```

2. **設定変更**
   ```javascript
   // docs/js/config.jsでの設定例
   const APP_CONFIG = {
       USE_SUPABASE: true,  // Supabase使用フラグ
       DEBUG_MODE: false    // デバッグモード
   };
   ```

3. **スタイル変更**
   ```css
   /* docs/css/styles.css - CSS変数での季節色変更例 */
   :root {
       --primary-color: #2c5aa0;
       --marker-spring: #3498db;  /* 春の色を変更 */
       --marker-summer: #e74c3c;  /* 夏の色を変更 */
   }
   ```

4. **データ移行**
   ```bash
   # 季語データの移行
   npm run migrate-keywords

   # 季語データのクリア
   npm run migrate-keywords-clear
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

### クラスタリング設定

```javascript
// config.js
const UI_CONFIG = {
    CLUSTER_MAX_RADIUS: 2,        // クラスタ化する最大半径（ピクセル）
    CLUSTER_DISABLE_AT_ZOOM: 10,  // クラスタリング無効化ズーム
    POPUP_OFFSET: [0, -40]        // ポップアップオフセット
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
# Node.js開発サーバーを起動（推奨）
npm start
# または自動リロード対応
npm run dev

# または手動でサーバーを起動
cd docs
python -m http.server 8000
# または
npx serve .
```

### デバッグ

```javascript
// docs/js/config.js
const APP_CONFIG = {
    DEBUG_MODE: true  // コンソールログを詳細表示
};
```

### 主要な開発ツール

- **データ移行**: `npm run migrate-keywords` - 季語データをSupabaseに移行
- **開発サーバー**: `server.js` - Express製のローカル開発サーバー
- **バッチ処理**: `docs/js/kigo-batch-processor.js` - 季語の一括処理
- **移行ツール**: `docs/js/migration-tool.js` - データベース移行支援

## 📊 パフォーマンス

### 最適化済み機能

- **インデックス設定**: 地理検索、全文検索用の最適化されたインデックス
- **レスポンシブ画像**: 地図タイルの適切なキャッシュ
- **非同期読み込み**: JavaScriptの並列読み込み
- **データ圧縮**: 必要最小限のデータ転送
- **インテリジェントクラスタリング**: ズームレベルに応じた動的ピン表示
- **季節別クラスタ色分け**: 視覚的に分かりやすいクラスタ表現
- **モジュラー設計**: 機能別ファイル分割による保守性向上

### 推奨環境

- **ブラウザ**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **ネットワーク**: 3G以上の通信環境
- **デバイス**: 画面解像度 320px以上

## 🤝 コントリビューション

### バージョン履歴

- **Ver 2.3** (2025年): 現在のバージョン
  - ✅ 季語ガチャ機能の実装
  - ✅ ウェルカム画面の追加
  - ✅ ルーティングハブの実装
  - ✅ 季語自動検出機能
  - ✅ 地図タップによる投稿フロー
  - ✅ 複数ページ構成への移行

### 今後の開発アイデア

検討中・保留中の機能：

- **俳句検索**: 俳句本文や詠み人名での全文検索（データ数増加後に検討）
- **古街道・古地図表示**: 江戸期の街道や宿場を地図上に表示し、俳句の歴史的背景を可視化
- **CSV一括投稿**: 管理者向けのCSVファイルからの一括データ登録機能
- **ユーザー登録・ログイン**: 投稿履歴やお気に入り俳句の保存機能
- **吟行専用詠み人ID**: 年号を埋め込んだIDシステム（`misc/poet_id_identifier/`で検討中）
- **写真投稿**: 句碑写真などの画像投稿機能
- **短歌対応**: 短歌と歌枕の表示機能

### コントリビューション方法
#### データ投稿

- アプリ内の投稿フォームから俳句データを追加
- 句碑の位置情報や写真の提供

#### 開発参加

- GitHubでのIssue報告、Pull Request歓迎
- 機能追加や不具合修正の提案

#### データ提供

- CSV形式での大量データ提供
- 句碑の写真や位置情報の提供

## 📄 ライセンス

このプロジェクトはオープンソースです。教育・研究・個人利用は自由に行えます。

## 📦 依存ライブラリ

### フロントエンド
- **Leaflet.js**: 地図表示ライブラリ
- **OpenStreetMap**: 地図タイルプロバイダー
- **@supabase/supabase-js**: SupabaseクライアントSDK

### バックエンド
- **Supabase**: PostgreSQLベースのBaaS
- **Express**: Node.js Webサーバーフレームワーク

### 開発ツール
- **csv-parser**: CSVファイル解析
- **dotenv**: 環境変数管理

## 🙏 謝辞

- 俳句データの提供者の皆様
- OpenStreetMapコミュニティ
- Supabaseチーム
- Leaflet開発チーム

## 📞 サポート・連絡

- **バグ報告**: [GitHub Issues](https://github.com/psmuler/claude_proj/issues)
- **機能要望**: [GitHub Issues](https://github.com/psmuler/claude_proj/issues)
- **公開URL**: https://psmuler.github.io/gingko/
- **開発者ページ**: https://github.com/psmuler/claude_proj

---

*俳句文化をデジタルで保存・共有し、次世代に継承することを目指しています。*