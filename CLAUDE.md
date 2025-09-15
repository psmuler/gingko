# 俳句鑑賞＆記録アプリ「吟行」Phase 2 開発仕様書

## 📋 プロジェクト概要

**プロジェクト名**: 俳句鑑賞＆記録アプリ「吟行」  
**フェーズ**: Phase 2 - UI大幅改善・ピン投稿機能・季語サジェスト機能  
**開発期間**: Phase 1完了後〜  

### Phase 1からの引き継ぎ状況
詳細な現在の仕様はREADME.mdに記載。

**実装済み機能**:
- 地図ベースの俳句表示システム
- 俳句データベース（haikus, poets テーブル）
- 季語による色分け表示
- 基本的な俳句投稿機能
- 検索機能（俳句本文・詠み人検索）
- レスポンシブ対応

**技術基盤**:
- Frontend: HTML5, CSS3, JavaScript (ES6+)
- Backend: Supabase (PostgreSQL)
- Map: Leaflet + OpenStreetMap
- Architecture: APIアダプターパターン

---

## 🎯 Phase 2の開発目標

### 主要目標
1. **地図中心のUI設計への大幅変更**
2. **直感的なピン投稿システムの実装**  
3. **季語自動サジェスト機能の実装**
4. **ピンクラスタリングによる視認性向上**

### 成果指標
- 投稿までの最短タップ数: 現状5回 → 目標3回以下
- 季語入力時間: 現状30秒 → 目標1秒以下
- 複数俳句エリアの視認性向上: クラスタリング実装

---

## 🚀 Phase 2 主要機能仕様

### 1. ピン投稿システム

#### 1.1 基本仕様
**現状**: 画面右下のボタン → フォーム画面 → 現在地のみ投稿可能  
**変更後**: 地図上任意地点タップ → インライン投稿 → 地図上で操作完結

#### 1.2 ユーザーフロー
```
地図表示
↓
地図上任意地点をタップ
↓
分岐:
├─ 既存俳句がある場合: 俳句ポップアップ表示
└─ 俳句がない場合: 新句入力インライン表示
↓
新句入力中にスワイプ → 詳細入力画面へ遷移
```

#### 1.3 UI要件
- **インライン入力フォーム**: 地図上にオーバーレイ表示
- **スワイプ遷移**: 上スワイプで詳細入力画面への遷移
- **最小入力項目**: 俳句本文のみ必須、その他はオプション

#### 1.4 技術実装要件
- タップ位置の緯度経度取得
- オーバーレイUI実装（CSS transform, position: fixed）
- スワイプイベント処理（touchstart, touchmove, touchend）

### 2. 季語自動サジェスト機能

#### 2.1 基本仕様
俳句本文入力中にリアルタイムで季語を検出し、季語・季節をボタンで提示

#### 2.2 季語辞書データベース設計

**新テーブル: `keywords`**
```sql
CREATE TABLE keywords (
  id SERIAL PRIMARY KEY,
  term VARCHAR(50) NOT NULL,        -- 季語
  season VARCHAR(10) NOT NULL,      -- 季節（春夏秋冬暮新年その他）
  category VARCHAR(50),             -- 分類（天文・地理・生活など）
  reading VARCHAR(100),             -- 読み仮名
  alternative_terms TEXT[],         -- 別表記・類語
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_keywords_term ON keywords(term);
CREATE INDEX idx_keywords_season ON keywords(season);
```

#### 2.3 サジェスト機能実装
- **検出ロジック**: 入力文字列に含まれる季語を部分一致で検索
- **表示方式**: 季語ボタン（青春・赤夏・白秋・黒冬・黄暮新年）
- **自動入力**: ボタンクリックで季語・季節フィールドを自動設定

#### 2.4 技術実装要件
```javascript
// 季語検出関数の仕様
async function detectSeasonalTerms(haikuText) {
  // keywords テーブルから部分一致検索
  // 複数検出時は出現順で並び替え
  // 最大3つまで表示
}

// リアルタイム検出
haiku_input.addEventListener('input', debounce(detectSeasonalTerms, 300));
```

### 3. ピンクラスタリング

#### 3.1 基本仕様
同一地域（一定範囲内）に複数俳句がある場合、クラスター表示で視認性向上

#### 3.2 クラスタリング条件
- **クラスター化距離**: 200m以内の俳句をグループ化
- **表示方式**: 円形アイコンに俳句数を表示
- **色分け**: 含まれる俳句の季節で色決定（最多季節）

#### 3.3 技術実装
- Leaflet.markercluster プラグイン使用
- カスタムクラスターアイコン実装

### 4. UIデザイン変更

#### 4.1 現在地ボタンデザイン変更
**現状**: 右下の円形ボタン  
**変更後**: GPS風ナビアイコン（二等辺三角形切り欠き青アイコン）

#### 4.2 画面構成の簡素化
- **削除**: 右下投稿ボタン、検索バー（当面）
- **残存**: 現在地ボタンのみ
- **追加**: スワイプによる詳細画面遷移

---

## 📊 データベース設計変更

### Phase 1 既存テーブル
```sql
-- 変更なし、継続使用
poets (id, name, name_kana, birth_year, death_year, period, biography)
haikus (id, haiku_text, poet_id, latitude, longitude, location_type, 
        location_name, date_composed, description, season, seasonal_term)
```

### Phase 2 新規テーブル
```sql
-- 季語辞書テーブル
CREATE TABLE keywords (
  id SERIAL PRIMARY KEY,
  term VARCHAR(50) NOT NULL UNIQUE,
  season VARCHAR(10) NOT NULL,
  category VARCHAR(50),
  reading VARCHAR(100),
  alternative_terms TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_keywords_term ON keywords(term);
CREATE INDEX idx_keywords_season ON keywords(season);
CREATE INDEX idx_keywords_term_trgm ON keywords USING gin(term gin_trgm_ops);
```

### 季語データ投入仕様
```sql
-- サンプル季語データ
INSERT INTO keywords (term, season, category, reading) VALUES
('桜', '春', '植物', 'さくら'),
('蝉', '夏', '動物', 'せみ'),
('紅葉', '秋', '植物', 'もみじ'),
('雪', '冬', '天文', 'ゆき'),
('除夜', '暮・新年', '行事', 'じょや');
```

---

## 🔧 技術実装詳細

### 1. ファイル構成変更

```
俳句鑑賞アプリ/
├── index.html              # メインHTML（UI大幅変更）
├── styles.css              # スタイルシート（ピン投稿UI追加）
├── script.js               # メインJS（ピン投稿ロジック追加）
├── seasonal-suggest.js     # 季語サジェスト機能（新規）
├── pin-posting.js          # ピン投稿機能（新規）
├── clustering.js           # クラスタリング機能（新規）
├── config.js               # 設定ファイル
├── supabase-client.js      # Supabaseクライアント
├── api-adapter.js          # API統合インターフェース
└── ...
```

### 2. 主要関数仕様

#### ピン投稿関連
```javascript
// 地図クリック処理
function handleMapClick(e) {
  const { lat, lng } = e.latlng;
  showInlineForm(lat, lng);
}

// インラインフォーム表示
function showInlineForm(lat, lng) {
  // オーバーレイUI表示
  // 位置情報セット
  // イベントリスナー設定
}

// スワイプ検出
function handleSwipeUp(element) {
  // touchstart, touchmove, touchend
  // Y軸移動量で判定
}
```

#### 季語サジェスト関連
```javascript
// 季語検出メイン関数
async function detectSeasonalTerms(inputText) {
  const query = supabase
    .from('keywords')
    .select('term, season, category')
    .ilike('term', `%${inputText}%`)
    .limit(3);
  
  return await query;
}

// サジェストボタン生成
function createSeasonButtons(detectedTerms) {
  // 季節別色分けボタン生成
  // クリックイベント設定
}

// デバウンス処理
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
```

#### クラスタリング関連
```javascript
// Leaflet markercluster 設定
const clusters = L.markerClusterGroup({
  maxClusterRadius: 200,
  iconCreateFunction: function(cluster) {
    const markers = cluster.getAllChildMarkers();
    const seasonCount = getSeasonDistribution(markers);
    const dominantSeason = getDominantSeason(seasonCount);
    
    return L.divIcon({
      html: `<div class="cluster-icon ${dominantSeason}">${markers.length}</div>`,
      className: 'custom-cluster'
    });
  }
});
```

### 3. CSS設計方針

#### ピン投稿UIスタイリング
```css
/* インラインフォーム */
.inline-form {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-radius: 12px 12px 0 0;
  box-shadow: 0 -4px 12px rgba(0,0,0,0.15);
  transform: translateY(100%);
  transition: transform 0.3s ease-in-out;
}

.inline-form.active {
  transform: translateY(0);
}

/* スワイプインジケーター */
.swipe-indicator {
  width: 40px;
  height: 4px;
  background: #ccc;
  border-radius: 2px;
  margin: 8px auto;
}

/* 季語サジェストボタン */
.season-suggest {
  display: flex;
  gap: 8px;
  margin: 12px 0;
}

.season-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 16px;
  color: white;
  cursor: pointer;
  font-size: 12px;
}

.season-btn.spring { background: var(--marker-spring); }
.season-btn.summer { background: var(--marker-summer); }
.season-btn.autumn { background: var(--marker-autumn); color: black; }
.season-btn.winter { background: var(--marker-winter); }
```

---

## 📱 レスポンシブ対応

### モバイル優先設計
- **タッチイベント**: tap, swipe, pinch対応
- **画面サイズ対応**: 320px〜対応
- **フォント**: 16px以上でタップしやすさ確保

### タブレット・デスクトップ対応
- **マウスイベント**: クリック、ホバー対応
- **キーボード**: ショートカット対応（Ctrl+M で投稿など）

---

## 🧪 テスト仕様

### 単体テスト
- [ ] 季語検出ロジック
- [ ] ピン投稿フォーム
- [ ] スワイプ検出
- [ ] クラスタリング

### 統合テスト
- [ ] 投稿フロー全体
- [ ] 季語サジェスト〜投稿
- [ ] 地図操作〜投稿

### ユーザビリティテスト
- [ ] 投稿時間計測
- [ ] タップ数計測  
- [ ] エラー率測定

---

## 📈 パフォーマンス要件

### レスポンス時間
- **季語検出**: 300ms以内
- **投稿完了**: 1秒以内
- **地図描画**: 500ms以内

### データ量
- **季語辞書**: 10,000語程度想定
- **検索クエリ**: 部分一致で最適化

---

## 🚦 開発フェーズ

### Phase 2.1: ピン投稿システム（4週間目安）
1. **Week 1**: 地図タップイベント実装
2. **Week 2**: インラインフォーム実装
3. **Week 3**: スワイプ遷移実装
4. **Week 4**: UI調整・テスト

### Phase 2.2: 季語サジェスト（3週間目安）
1. **Week 1**: キーワードDB設計・データ投入
2. **Week 2**: 検出ロジック実装
3. **Week 3**: UI統合・テスト

### Phase 2.3: クラスタリング＆仕上げ（2週間目安）
1. **Week 1**: クラスタリング実装
2. **Week 2**: 全体調整・バグ修正

---

## 🔒 セキュリティ考慮事項

### 入力値検証
- 俳句本文: 文字数制限（5-7-5形式チェック）
- 位置情報: 緯度経度範囲チェック
- XSS対策: innerHTML → textContent

### レート制限
- 投稿制限: 1分間に3件まで
- 検索制限: 1秒間に10回まで

---

## 📋 Phase 3への継続課題

### 実装見送り機能
- [ ] 俳句全文検索（データ量増加後）
- [ ] 古街道・古地図表示
- [ ] CSV一括投稿機能
- [ ] ユーザー登録・ログイン
- [ ] 写真投稿機能
- [ ] 吟行専用詠み人ID システム

### 技術的改善課題
- [ ] PWA対応
- [ ] オフライン機能
- [ ] 画像最適化
- [ ] CDN導入

---

## 🎯 成功指標

### 定量指標
- **投稿完了率**: 80%以上（現状50%想定）
- **平均投稿時間**: 1分以内（現状3分想定）
- **季語自動入力率**: 70%以上

### 定性指標
- ユーザビリティテストでの満足度向上
- 操作の直感性向上
- エラー発生率低下

---

*Phase 2では「使いやすさ」を最優先に、地図を中心とした直感的な俳句投稿体験の実現を目指します。*