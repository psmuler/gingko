# CLAUDE.md - 季語自動サジェスト機能仕様

## 概要

俳句入力時にリアルタイムで季語を自動検出し、ユーザーが簡単に季語・季節を選択できるサジェスト機能を提供する。

## 季語データベース設計

### データ構造
```sql
-- keywordsテーブル
CREATE TABLE keywords (
  id SERIAL PRIMARY KEY,
  display_name VARCHAR(100) NOT NULL,
  display_name_alternatives TEXT[],
  type ENUM('季語', '歌枕') NOT NULL,
  season ENUM('春', '夏', '秋', '冬', '暮・新年') NULL,
  description TEXT
);
```

### データ規模・内容
- **総語彙数**: 5,212件（keywords.csvより）
- **季語分類**: 春夏秋冬・新年の季語を収録（type='季語'で絞り込み）
- **表記バリエーション**: ひらがな・カタカナ・漢字の表記揺れを`display_name_alternatives`に格納
- **歌枕との統合**: 季語と歌枕を同一テーブルで管理、`type`で区別
- **判定条件**: 俳句投稿時のみ季語サジェストを実行（歌枕は除外）。俳句かどうかは文字数が19文字以下であることを基準とする。

### サンプルデータ
```javascript
const kigoExamples = [
  {
    id: 1,
    display_name: "桜",
    display_name_alternatives: ["さくら", "サクラ", "櫻"],
    type: "季語",
    season: "春",
    description: "春を代表する花"
  },
  {
    id: 2,
    display_name: "蛙",
    display_name_alternatives: ["かえる", "カエル", "かはず"],
    type: "季語", 
    season: "春",
    description: "春の代表的な動物"
  }
];
```

## マッチングアルゴリズム

### 基本方針
- **検索の開始条件**: 入力文字数が5文字以上かつ本文が19文字以下の場合にのみマッチングを実行。20文字以上はボタンをグレイアウト。
- **完全一致**: `display_name`と`display_name_alternatives`での完全一致のみ
- **最長マッチ優先**: 複数候補がある場合は最も長い季語を優先
- **重複許可**: 季重なりを考慮し、マッチした季語は全て表示

### マッチング処理フロー
```javascript
function extractKigo(haikuText) {
  const matches = [];
  const kigoDatabase = getKigoDatabase(); // インメモリデータ
  
  // 1. 全季語に対してマッチング実行
  kigoDatabase.forEach(kigo => {
    // display_nameでの完全一致
    if (haikuText.includes(kigo.display_name)) {
      matches.push({
        kigo: kigo,
        matchedText: kigo.display_name,
        startPos: haikuText.indexOf(kigo.display_name),
        length: kigo.display_name.length
      });
    }
    
    // display_name_alternativesでの完全一致
    kigo.display_name_alternatives?.forEach(alt => {
      if (haikuText.includes(alt)) {
        matches.push({
          kigo: kigo,
          matchedText: alt,
          startPos: haikuText.indexOf(alt),
          length: alt.length
        });
      }
    });
  });
  
  // 2. 最長マッチ優先でソート
  return matches.sort((a, b) => b.length - a.length);
}
```

### 表記揺れ対応例
```javascript
const hyokiYure = {
  "桜": ["さくら", "サクラ", "櫻"],
  "蛙": ["かえる", "カエル", "かはず", "河鹿"],
  "山茶花": ["さざんか", "サザンカ"],
  "木枯": ["こがらし", "コガラシ", "木枯らし"]
};
```

## UI・表示仕様

### 表示位置
```
┌─────────────────────────┐
│ 俳句: [古池や蛙飛び込む...] │ ← 入力フィールド
├　　　　　　　　　　　　　　　┤←(区切り線などはつけない)
│ [蛙] [水の音]   　　　　　 │ ← サジェストボタン
│ [季なし]                  │
└─────────────────────────┘
```

### ボタンデザイン

#### 未選択状態（白抜き）、縁を季節色で表示
```css
.kigo-suggestion {
  border: 2px solid var(--season-color);
  background: white;
  color: var(--season-color);
  border-radius: 20px;
  padding: 6px 12px;
  margin: 4px;
  font-size: 14px;
}
```

#### 選択状態（塗りつぶし）
```css
.kigo-suggestion.selected {
  background: var(--season-color);
  color: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
```

#### 季節別カラーパレット
```css
:root {
  --spring-color: #3498db;   /* 青 */
  --summer-color: #e74c3c;   /* 赤 */
  --autumn-color: #ffffff;   /* 白 */
  --winter-color: #2c3e50;   /* 黒 */
  --newyear-color: #f1c40f;  /* 黄 */
  --other-color: #95a5a6;    /* グレー */
}
```

### ボタン内容表示
- **表示形式**: `[季語名-季節]`
- **例**: `[花衣-春]`, `[夏の夜-夏]`, `[冬支度-秋]`, `[釜揚うどん-冬]`
- **季なしボタン**: `[季なし]`

## パフォーマンス仕様

### データ読み込み戦略
```javascript
// アプリ起動時にインメモリ読み込み（季語のみ）
let kigoDatabase = [];

async function initializeKigoDatabase() {
  const { data } = await supabase
    .from('keywords')
    .select('display_name, display_name_alternatives, season')
    .eq('type', '季語');  // 季語のみ絞り込み
  
  kigoDatabase = data;
  console.log(`季語データベース初期化完了: ${data.length}件`);
}
```

### リアルタイム処理
```javascript
// 入力イベントでのリアルタイム解析
document.getElementById('haiku-input').addEventListener('input', debounce(function(e) {
  const haikuText = e.target.value;
  const suggestions = extractKigo(haikuText);
  renderKigoSuggestions(suggestions);
}, 100)); // 100ms デバウンス

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}
```

### パフォーマンス目標
- **初期化時間**: 5秒以内（5,212件の季語データ読み込み）
- **マッチング処理**: 100ms以内
- **UI更新**: 50ms以内
- **メモリ使用量**: 200kB以内（季語データ＋表記揺れ）

## 精度・信頼性

### 候補システム
```javascript
function renderKigoSuggestions(matches) {
  const container = document.getElementById('kigo-suggestions');
  container.innerHTML = '';
  
  // マッチした季語を表示
  matches.forEach(match => {
    const button = createKigoButton(match.kigo, match.matchedText);
    container.appendChild(button);
  });
  
  // 季なしボタンを常に表示
  const seasonlessButton = createSeasonlessButton();
  container.appendChild(seasonlessButton);
}

function createKigoButton(kigo, matchedText) {
  const button = document.createElement('button');
  button.className = 'kigo-suggestion';
  button.textContent = `${kigo.display_name}-${kigo.season}`;
  button.style.setProperty('--season-color', getSeasonColor(kigo.season));
  
  button.addEventListener('click', () => selectKigo(kigo));
  return button;
}
```

### ユーザー修正・追加機能
```javascript
function enableManualKigoInput() {
  const manualInput = document.createElement('input');
  manualInput.placeholder = '季語を手入力...';
  manualInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      const userKigo = {
        display_name: e.target.value,
        season: 'その他',
        isUserGenerated: true
      };
      addUserKigo(userKigo);
    }
  });
}

async function addUserKigo(userKigo) {
  // ユーザー入力季語をkeywordsテーブルに保存
  await supabase.from('keywords').insert({
    display_name: userKigo.display_name,
    type: '季語',
    season: null, // 管理者確認待ち
    description: 'ユーザー投稿', 
    user_generated: true
  });
}
```

### 季なし俳句対応
```javascript
function createSeasonlessButton() {
  const button = document.createElement('button');
  button.className = 'kigo-suggestion seasonless';
  button.textContent = '季なし';
  button.style.setProperty('--season-color', '#95a5a6');
  
  button.addEventListener('click', () => {
    setHaikuSeason(null);
    button.classList.add('selected');
  });
  
  return button;
}
```

## 簡易フォーム統合

### スライドアップフォームでの表示
```html
<div class="slide-up-form">
  <div class="input-group">
    <label for="haiku-input">俳句</label>
    <textarea id="haiku-input" placeholder="俳句を入力してください"></textarea>
  </div>
  
  <div class="kigo-section">
    <div id="kigo-suggestions" class="kigo-suggestions">
      <!-- 動的に生成される季語ボタン -->
    </div>
  </div>
  
  <div class="form-actions">
    <button type="submit" id="submit-btn">投稿</button>
    <button type="button" id="cancel-btn">キャンセル</button>
  </div>
</div>
```

### 詳細画面との連携
```javascript
// 季語選択状態の保持
let selectedKigoState = {
  selectedKigo: null,
  season: null,
  isSeasonless: false
};

function transitionToDetailForm() {
  // 簡易フォームの状態を詳細フォームに引き継ぎ
  document.getElementById('detail-season').value = selectedKigoState.season || '';
  document.getElementById('detail-seasonal-term').value = 
    selectedKigoState.selectedKigo?.display_name || '';
}
```

### モバイル最適化
```css
/* モバイル向けボタンサイズ */
@media (max-width: 768px) {
  .kigo-suggestion {
    min-height: 44px;  /* タッチターゲット最小サイズ */
    padding: 8px 16px;
    margin: 6px 4px;
    font-size: 16px;   /* iOS自動ズーム防止 */
  }
  
  .kigo-suggestions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    max-height: 120px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
}

/* タブレット・デスクトップ */
@media (min-width: 769px) {
  .kigo-suggestion {
    min-height: 36px;
    padding: 6px 12px;
    font-size: 14px;
  }
}
```

### 手動季語入力UI
```html
<div class="manual-kigo-input" style="display: none;">
  <input type="text" 
         placeholder="季語を手動で追加..." 
         id="manual-kigo"
         maxlength="10">
  <button type="button" onclick="addManualKigo()">追加</button>
</div>

<button type="button" 
        class="toggle-manual-input"
        onclick="toggleManualInput()">
  手動で季語を追加
</button>
```

## 実装フロー

### Phase 1: 基本サジェスト機能
1. アプリ起動時の季語データベース読み込み
2. リアルタイム季語マッチング
3. 基本的な季語ボタン表示・選択

### Phase 2: UI/UX改善
1. 季節別カラーリング
2. ボタンアニメーション
3. モバイル最適化

### Phase 3: 高度な機能
1. 手動季語入力機能
2. ユーザー投稿季語の管理
3. 詳細フォームとの完全連携

### Phase 4: パフォーマンス最適化
1. インデックス最適化
2. メモリ使用量削減
3. 大量データ対応

## データ管理

### ユーザー投稿季語の処理
```javascript
async function addUserKigo(userInput) {
  // バリデーション
  if (!userInput.trim() || userInput.length > 10) {
    showError('季語は1-10文字で入力してください');
    return;
  }
  
  // 重複チェック
  const existing = kigoDatabase.find(kigo => 
    kigo.display_name === userInput ||
    kigo.display_name_alternatives?.includes(userInput)
  );
  
  if (existing) {
    showInfo('この季語は既に登録されています');
    return;
  }
  
  // データベースに保存（管理者確認待ち）
  const { error } = await supabase
    .from('keywords')
    .insert({
      display_name: userInput,
      type: '季語',
      season: null,  // 管理者が後で設定
      description: `ユーザー投稿: ${new Date().toISOString()}`,
      user_generated: true,
      needs_review: true
    });
    
  if (!error) {
    showSuccess('季語を追加しました。管理者確認後に反映されます。');
  }
}
```

### 管理者向け確認機能
```sql
-- ユーザー投稿季語の確認クエリ
SELECT * FROM keywords 
WHERE user_generated = true 
  AND needs_review = true 
ORDER BY created_at DESC;

-- 承認・統合処理
UPDATE keywords 
SET needs_review = false, season = '春' 
WHERE id = ? AND user_generated = true;
```

## 品質保証

### テストケース
```javascript
const testCases = [
  {
    input: "古池や蛙飛び込む水の音",
    expected: ["蛙"],
    expectedSeason: "春"
  },
  {
    input: "夏草や兵どもが夢の跡", 
    expected: ["夏草"],
    expectedSeason: "夏"
  },
  {
    input: "静かさや岩にしみ入る蝉の声",
    expected: ["蝉"],
    expectedSeason: "夏"
  },
  {
    input: "この道や行く人なしに秋の暮",
    expected: ["秋の暮"],  // 最長マッチ
    expectedSeason: "秋"
  }
];
```

### エラーハンドリング
```javascript
function handleKigoError(error) {
  console.error('季語処理エラー:', error);
  
  // ユーザーに表示
  showNotification('季語の読み込み中にエラーが発生しました', 'warning');
  
  // フォールバック: 手動入力のみ有効化
  document.getElementById('manual-kigo-section').style.display = 'block';
  document.getElementById('auto-kigo-section').style.display = 'none';
}
```

## supabaseへの移行
supabaseに季語データが移行されていないので、移行しておくこと。

# 使ってみて改善したいところ
- 最低文字数マッチング条件は内部での効率のためでしかないので、UIには「5文字以上入力してください」は表示しない。
- 季なしボタンをトグルにする（今は選択したらもう一度押しても選択が解除されない）。
- 歌枕を含む短歌は、紫色のモダンな山のアイコンで表示する。
- 歌枕を含まない短歌は、灰色の通常の涙型のアイコンで表示する。
- 俳句の上には地名ではなく前書きを表示する。地名がある場合は俳句の下に小さく表示する。
- クラスタリング機能をつける
- 手元に収集した俳句に対して季語抽出を試し、精度を確認する

- Refactoringする
- 画面サイズの変更でエラーが出る
- ハンバーガーメニューを作り、Aboutページをつける→Phase3で実装。

---

*この仕様書は開発進行に合わせて継続的に更新されます。*