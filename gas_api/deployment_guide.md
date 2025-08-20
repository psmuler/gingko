# Google Apps Script API デプロイメントガイド

## 1. Google Apps Script プロジェクトの作成

1. **Google Apps Script にアクセス**
   - https://script.google.com/ にアクセス
   - Googleアカウントでログイン

2. **新しいプロジェクトを作成**
   - 「新しいプロジェクト」をクリック
   - プロジェクト名を「俳句アプリAPI」に変更

## 2. スクリプトファイルの設定

### ファイル構成
以下の4つのファイルを作成してください：

1. **main.gs** - メインエントリーポイント
2. **database.gs** - データベース操作
3. **haikus_api.gs** - 俳句API
4. **poets_api.gs** - 詠み人API

### ファイル追加手順
1. Google Apps Script エディタで「+」ボタンをクリック
2. 「スクリプト」を選択
3. ファイル名を変更（例：database.gs）
4. 対応するコードを貼り付け

## 3. スプレッドシートIDの設定

1. **main.gs の設定**
   ```javascript
   // この行を実際のスプレッドシートIDに変更
   const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
   ```

2. **スプレッドシートIDの取得方法**
   - Googleスプレッドシートを開く
   - URLから長い英数字部分をコピー
   - 例：`https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit`
   - スプレッドシートID：`1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

## 4. 権限の設定

1. **実行テスト**
   - `testConnection` 関数を実行
   - 権限の承認画面が表示されるので「許可」をクリック
   - スプレッドシートへのアクセス権限を付与

2. **必要な権限**
   - Google スプレッドシートの読み取り・書き込み
   - 外部サービスへの接続

## 5. Webアプリとしてデプロイ

1. **デプロイ設定**
   - 右上の「デプロイ」ボタンをクリック
   - 「新しいデプロイ」を選択

2. **設定項目**
   - **種類**: ウェブアプリ
   - **説明**: 俳句アプリAPI v1.0
   - **実行**: 自分
   - **アクセス**: 全員（アクセス権が必要）

3. **デプロイ実行**
   - 「デプロイ」ボタンをクリック
   - Web App URLをコピーして保存

## 6. API エンドポイントの確認

デプロイが完了すると、以下のような形式でAPIが利用可能になります：

### ベースURL
```
https://script.google.com/macros/s/{SCRIPT_ID}/exec?path=
```

### 利用可能なエンドポイント

#### 俳句関連
- `GET api/haikus` - 俳句一覧取得
- `GET api/haikus/map` - 地図用俳句データ取得
- `GET api/haikus/search?q=古池` - 俳句検索
- `GET api/haikus/1` - 特定俳句取得

#### 詠み人関連
- `GET api/poets` - 詠み人一覧取得
- `GET api/poets/periods` - 時代区分一覧取得
- `GET api/poets/search?q=芭蕉` - 詠み人検索
- `GET api/poets/1` - 特定詠み人取得
- `GET api/poets/1/haikus` - 詠み人の俳句一覧

## 7. テスト方法

### 手動テスト
1. `api_test.html` をブラウザで開く
2. Web App URLを入力
3. 各APIエンドポイントをテスト

### ブラウザでの直接テスト
```
https://script.google.com/macros/s/{SCRIPT_ID}/exec?path=api/haikus
```

## 8. トラブルシューティング

### よくある問題

#### 1. スプレッドシートアクセスエラー
- **原因**: スプレッドシートIDが間違っている
- **解決法**: 正しいIDを設定し、共有権限を確認

#### 2. CORS エラー
- **原因**: ブラウザの同一オリジンポリシー
- **解決法**: `doOptions` 関数でCORSヘッダーを設定済み

#### 3. 権限エラー
- **原因**: スクリプトの実行権限が不足
- **解決法**: `testConnection` 関数を実行して権限を付与

#### 4. データが取得できない
- **原因**: シート名やデータ構造の不一致
- **解決法**: スプレッドシートのシート名が `haikus` と `poets` になっているか確認

### デバッグ方法
1. Google Apps Script エディタの「実行ログ」を確認
2. `console.log` の出力を確認
3. スプレッドシートのデータ形式を確認

## 9. アップデート方法

1. **コード変更**
   - Google Apps Script エディタでコードを修正
   - 保存（Ctrl+S）

2. **新しいバージョンをデプロイ**
   - 「デプロイ」→「デプロイを管理」
   - 「新しいバージョン」でデプロイ
   - URLは変更されません

## 10. セキュリティ考慮事項

1. **アクセス制限**
   - 必要に応じて「リンクを知っている全員」に制限
   - 本番環境では認証機能の追加を検討

2. **レート制限**
   - Google Apps Scriptの実行時間制限（6分）
   - 1日あたりの実行回数制限

3. **データ保護**
   - スプレッドシートの編集権限を適切に設定
   - バックアップの定期取得

---

## 次のステップ

APIデプロイが完了したら、フロントエンドアプリケーションからAPIを呼び出して俳句データを地図上に表示できるようになります。