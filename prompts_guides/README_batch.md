# 季語バッチ処理システム

俳句CSVファイルから季語を自動抽出し、季語情報を付与するバッチ処理システムです。

## 概要

このシステムは既存の`kigo-suggestions.js`モジュールを活用して、CSVファイル内の俳句テキストから季語を自動検出し、季語名と季節情報を付与した新しいCSVファイルを生成します。

## 特徴

- ✅ **自動季語検出**: 俳句テキストから季語を自動抽出
- ✅ **バッチ処理**: 大量のCSVデータを効率的に処理
- ✅ **プログレス表示**: リアルタイムで処理進捗を表示
- ✅ **柔軟なCSV対応**: 様々なCSV形式に自動対応
- ✅ **統計情報**: 処理結果の詳細レポート
- ✅ **エラーハンドリング**: 堅牢なエラー処理

## 必要要件

- Node.js 16.0以上
- npm 7.0以上
- Supabaseアカウントと接続設定

## インストール

```bash
# プロジェクトディレクトリに移動
cd /path/to/claude_proj

# 依存関係がインストール済みであることを確認
npm install
```

## 基本的な使用方法

### 1. 環境設定

環境変数ファイル（`.env`）にSupabase接続情報を設定：

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. 基本実行

```bash
# デフォルト設定で実行
node kigo-batch-processor.js

# 入力・出力ファイルを指定
node kigo-batch-processor.js -i input.csv -o output.csv

# 設定ファイルを使用
node kigo-batch-processor.js -c batch-config.json
```

## コマンドラインオプション

| オプション | 短縮形 | 説明 | デフォルト値 |
|-----------|--------|------|-------------|
| `--input` | `-i` | 入力CSVファイル | `./misc/sample/haikus_sample.csv` |
| `--output` | `-o` | 出力CSVファイル | `./output_with_kigo.csv` |
| `--config` | `-c` | 設定ファイル（JSON） | なし |
| `--batch-size` | なし | バッチサイズ | `100` |
| `--help` | `-h` | ヘルプメッセージ表示 | なし |

## CSVファイル形式

### 入力CSV形式

システムは以下のカラムを自動検出します：

#### 必須カラム
- `haiku_text`, `haiku`, `text`, `俳句`, `句` のいずれか（俳句テキスト）

#### オプションカラム
- `poet_name` - 詠み人名
- `location_name` - 場所名
- `latitude`, `longitude` - 緯度・経度
- `date_composed` - 作句日
- `season` - 季節（既存の場合は保持）
- `seasonal_term`, `keywords` - 季語（既存の場合は保持）

### 出力CSV形式

入力CSVの全カラムに加えて、以下が追加されます：

- `keywords` - 検出された季語名
- `season` - 季語の季節

### CSVサンプル

**入力例:**
```csv
haiku_text,poet_name,location_name
古池や蛙飛び込む水の音,松尾芭蕉,深川芭蕉庵
閑さや岩にしみ入る蝉の声,松尾芭蕉,山寺立石寺
```

**出力例:**
```csv
haiku_text,poet_name,location_name,keywords,season
古池や蛙飛び込む水の音,松尾芭蕉,深川芭蕉庵,蛙,春
閑さや岩にしみ入る蝉の声,松尾芭蕉,山寺立石寺,蝉,夏
```

## 設定ファイル（batch-config.json）

詳細な設定は`batch-config.json`で管理できます：

```json
{
  "input": {
    "file": "./input.csv",
    "encoding": "utf8",
    "delimiter": ","
  },
  "output": {
    "file": "./output.csv",
    "encoding": "utf8"
  },
  "processing": {
    "batchSize": 100,
    "progressInterval": 10
  },
  "logging": {
    "level": "info",
    "showProgress": true
  }
}
```

## 実行例と出力

### 実行例

```bash
$ node kigo-batch-processor.js -i misc/sample/haikus_sample.csv

🌸 季語バッチ処理システム v1.0.0
==========================================
🚀 季語バッチ処理開始...
🔧 季語処理モジュールをセットアップ中...
✅ 季語処理モジュールセットアップ完了
🚀 季語データベース初期化開始...
✅ 季語データベース初期化完了: 1,234件（156ms）
📁 CSVファイル形式を解析中...
📄 俳句カラム: "haiku_text"
📊 総行数をカウント中...
📁 CSVファイル読み込み: haikus_sample.csv (500件)
🔍 季語マッチング処理中... [████████████████████] 100% (500/500)

✅ 処理完了

📊 処理完了 - 統計情報:
- 総俳句数: 500件
- 季語検出: 423件 (84.6%)
- 季なし: 77件 (15.4%)
- 季節別内訳:
  春: 156件
  夏: 98件
  秋: 89件
  冬: 80件
- 処理時間: 2.34秒

📄 出力ファイル: output_with_kigo.csv

🎉 全ての処理が正常に完了しました！
```

## エラーハンドリング

### よくある問題と解決方法

#### 1. 季語データベース初期化失敗
```
❌ 季語データベース初期化エラー: 接続エラー
```
**解決方法**:
- `.env`ファイルのSupabase設定を確認
- ネットワーク接続を確認

#### 2. ファイルが見つからない
```
❌ 入力ファイルが見つかりません: input.csv
```
**解決方法**:
- ファイルパスが正しいか確認
- ファイルの存在を確認

#### 3. メモリ不足
```
❌ JavaScript heap out of memory
```
**解決方法**:
```bash
# メモリ制限を増やして実行
node --max-old-space-size=4096 kigo-batch-processor.js
```

#### 4. 文字エンコーディングエラー
**解決方法**:
- CSVファイルをUTF-8で保存
- 設定ファイルでエンコーディングを指定

## パフォーマンス最適化

### 大量データ処理のコツ

1. **バッチサイズ調整**:
   ```bash
   node kigo-batch-processor.js --batch-size 50
   ```

2. **メモリ制限増加**:
   ```bash
   node --max-old-space-size=8192 kigo-batch-processor.js
   ```

3. **設定ファイルでの最適化**:
   ```json
   {
     "processing": {
       "batchSize": 50,
       "maxConcurrent": 3
     }
   }
   ```

## 開発者向け情報

### モジュール構成

```
kigo-batch-processor.js
├── 季語処理モジュール（kigo-suggestions.js）
├── CSV処理（csv-parser）
├── Supabaseクライアント（supabase-client.js）
└── 設定管理（config.js）
```

### 主要関数

- `setupKigoModule()` - 季語処理環境のセットアップ
- `initializeKigoDatabase()` - 季語データベース初期化
- `extractKigo(haikuText)` - 季語抽出
- `processBatch(config)` - バッチ処理実行

### テスト実行

```bash
# サンプルデータでテスト
node kigo-batch-processor.js -i misc/sample/haikus_sample.csv -o test_output.csv
```

## ライセンス

このプロジェクトは俳句鑑賞＆記録アプリの一部として開発されています。

## サポート

- Issues: プロジェクトのGitHubリポジトリのIssuesセクション
- 設定例: `batch-config.json`を参照
- サンプルデータ: `misc/sample/`ディレクトリ内のCSVファイル

---

**注意**: このシステムはSupabaseに接続して季語データベースを取得します。インターネット接続が必要です。