# 詩人ID管理システム設計仕様

## 概要

俳句・短歌・漢詩などの詩句アプリにおける詩人（詠み人）の識別子管理システム。文学的な美しさと技術的な実用性を両立させた、時代連続型ID体系を採用。

## 基本設計理念

### 1. 美的価値の重視
- 詩句の年号表示との調和
- 時代の粒度と連続性を感じられるID体系
- 文学的な世界観の演出

### 2. 技術的安定性
- 永続的な識別子としての信頼性
- API・外部参照での一貫性
- 国際展開への対応

### 3. 段階的成熟システム
- 不確定な詩人は外部ID（Wikidata等）を暫定利用
- 研究により確定した詩人にアプリ固有IDを付与
- 学術的な厳密性の担保

## ID体系設計

### 基本フォーマット

```
[プレフィックス1~3桁][連番5~3桁][チェックサム1桁] = 合計7桁固定
例: GR001A（日本・江戸時代・001番・チェックサムA）
```

### 容量設計
- **1桁プレフィックス**: 99万人/プレフィックス（予約語領域）
- **2桁プレフィックス**: 約1000人/プレフィックス（基本時代区分）
- **3桁プレフィックス**: 約10人/プレフィックス（特化区分・GitHub Issues承認必須）

## 確定済みプレフィックス一覧

プレフィックスの設定規則
## 新規プレフィックス管理

### GitHub Issue による提案制度

新しい時代区分やプレフィックスの提案は、GitHubリポジトリのIssueで議論。

#### 提案テンプレート

```markdown
## 新プレフィックス提案

### 基本情報
- **国・地域**: 日本
- **時代区分**: 室町後期
- **提案プレフィックス**: JMR  
- **対象年代**: 1467-1573
- **想定詩人数**: 約200名

### 重複チェック
- [x] 既存プレフィックスとの重複なし
- [x] 同時代の他プレフィックスとの棲み分け明確

### 詩人例
- 宗祇 (JMR0001A)
- 心敬 (JMR0002B)

### 学術的根拠
- 応仁の乱(1467)以降を独立した文学期と見なす研究が主流
- 参考文献: 『室町文学史』(山田太郎, 2023)
```

### 承認プロセス

1. **提案期間**: 7日間のコミュニティ議論
2. **専門家レビュー**: 文学史専門家による検証（3日間）
3. **メンテナー決定**: 最終的な採択判断
4. **実装**: 新プレフィックスの追加

### 日本

| 桁数 | 時代 | プレフィックス | 期間 | 確定度 |
|------|------|---------------|------|--------|
| 2 | 平安 | HA | 794-1185 | 確実 |
| 2 | 鎌倉 | KA | 1185-1333 | 確実 |
| 2 | 室町 | MU | 1336-1573 | 確実 |
| 2 | 安土桃山 | AZ | 1573-1603 | 確実 |
| 2 | 寛永 | KN | 1603-1868 | 確実 |
| 2 | 正保 | SY | 1603-1868 | 確実 |
| 2 | 元禄 | GR | 1603-1868 | 確実 |
| 2 | 貞享 | JK | 1603-1868 | 確実 |
| 2 | 明治 | ME | 1868-1912 | 確実 |
| 2 | 大正 | TA | 1912-1926 | 確実 |
| 2 | 昭和 | SH | 1926-1989 | 確実 |
| 2 | 平成 | HS | 1989-2019 | 確定 |
| 2 | 令和 | RE | 2019- | 現行 |

### 中国

| 桁数 | 時代 | プレフィックス | 期間 | 確定度 |
|------|------|---------------|------|--------|
| 2 | 先秦 | QI | ~221BC | 確実 |
| 2 | 秦漢 | QH | 221BC-220AD | 確実 |
| 2 | 魏晋南北朝 | WE | 220-589 | 確実 |
| 2 | 隋唐 | SU | 589-907 | 確実 |
| 2 | 盛唐 | ST | 713-766 | 確実 |
| 2 | 晩唐 | WT | 766-907 | 確実 |
| 2 | 五代宋 | SG | 907-1279 | 確実 |
| 2 | 元 | YU | 1271-1368 | 確実 |
| 2 | 明 | MI | 1368-1644 | 確実 |
| 2 | 清 | QG | 1644-1912 | 確実 |
| 2 | 民国 | MG | 1912-1949 | 確定 |
| 2 | 現代 | XD | 1949- | 暫定

### イギリス

| 桁数 | 時代 | プレフィックス | 期間 | 確定度 |
|------|------|---------------|------|--------|
| 2 | アングロサクソン | AS | 449-1066 | 確実 |
| 2 | 中世 | MW | 1066-1485 | 確実 |
| 2 | チューダー朝 | TU | 1485-1603 | 確実 |
| 2 | スチュアート朝 | ST | 1603-1714 | 確実 |
| 2 | ハノーヴァー朝 | HA | 1714-1901 | 確実 |
| 2 | ウィンザー朝 | WI | 1901- | 確定

### フランス

| 桁数 | 時代 | プレフィックス | 期間 | 確定度 |
|------|------|---------------|------|--------|
| 2 | 古代・中世 | AM | ~1589 | 確実 |
| 2 | ブルボン朝 | BO | 1589-1792 | 確実 |
| 2 | 第一共和政 | R1 | 1792-1804 | 確実 |
| 2 | 第一帝政 | E1 | 1804-1814 | 確実 |
| 2 | 第三共和政 | R3 | 1870-1940 | 確実 |
| 2 | 第五共和政 | R5 | 1958- | 確定

**注意**: 時代不明や過渡期の詩人はWikidata IDのまま管理し、研究により時代が確定した時点で正式なIDへ移行する。

### 1桁予約語

**基本方針**: 1桁プレフィックスは予約語領域として保留。各文化圏・言語圏の2桁プレフィックスが足りなくなった場合の拡張用。

| 桁数 | プレフィックス | 用途 | 説明 |
|------|---------------|------|------|
| 1 | A | 時代区分分類適用外詩人 | 時代区分が存在しない年代に生きていたり、当てはまらない国や地域で主に活動していた詩人 |
| 1 | F | 詠み人知らず | 作者不詳.作者不詳の伝承詩・民謡等用 |
| 1 | X | 実験・テスト | テスト用 |
| 1 | Q | Wikidata | Wikidata一時ID用 |
| 1 | B-E,G-P,R-W,Y-Z | 予約語 | 将来拡張用領域 |


## 段階的ID管理システム

### Phase 1: 暫定ID（外部識別子）

新規詩人の初回登録時：

```json
{
  "primary_id": "Q5293",
  "id_type": "wikidata_temp", 
  "app_specific_id": null,
  "verification_status": "pending_verification",
  "wikidata_id": "Q5293",
  "viaf_id": "56608770"
}
```

### Phase 2: 確定ID（アプリ固有）

研究・確定後：

```json
{
  "primary_id": "JE0001A",
  "id_type": "era_based",
  "verification_status": "verified_stable", 
  "wikidata_id": "Q5293",
  "id_migration_history": [
    {
      "from": "Q5293",
      "to": "JE0001A",
      "date": "2024-06-15",
      "reason": "江戸時代詩人として確定"
    }
  ]
}
```

## データベース設計

### poets テーブル

```sql
CREATE TABLE poets (
  id SERIAL PRIMARY KEY,
  primary_id VARCHAR(50) NOT NULL UNIQUE,
  id_type ENUM('wikidata_temp', 'era_based', 'uuid'),
  
  -- 基本情報
  name VARCHAR(100) NOT NULL,
  name_local VARCHAR(100),
  display_name VARCHAR(100),
  
  -- 外部参照ID
  wikidata_id VARCHAR(20),
  viaf_id VARCHAR(20),
  ndl_id VARCHAR(20),
  
  -- 時代・年代情報
  birth_year INTEGER,
  death_year INTEGER,
  era_assignment_confidence DECIMAL(3,2),
  cultural_period_id INTEGER REFERENCES cultural_periods(id),
  period_sequence INTEGER,
  
  -- 検証情報
  verification_status ENUM('pending_verification', 'under_review', 'verified_stable', 'disputed'),
  verified_at TIMESTAMP,
  
  -- メタデータ
  id_migration_history JSONB,
  biographical_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### cultural_periods テーブル

```sql
CREATE TABLE cultural_periods (
  id SERIAL PRIMARY KEY,
  country_code VARCHAR(2) NOT NULL,
  period_code VARCHAR(2) NOT NULL,
  period_name VARCHAR(50) NOT NULL,
  period_name_local VARCHAR(50),
  start_year INTEGER,
  end_year INTEGER,
  id_prefix VARCHAR(3) NOT NULL,
  stability_level INTEGER DEFAULT 5,
  calendar_system VARCHAR(20),
  notes TEXT,
  UNIQUE(country_code, period_code)
);
```

## ID生成アルゴリズム

### 基本フロー

```javascript
function generatePoetId(poet) {
  const era = determineEra(poet);
  
  if (era.stability_level >= 8) {
    // 安定した時代 → 時代連続ID
    return generateEraBasedId(era, poet);
  } else {
    // 不安定な時代 → UUID + 表示エイリアス
    return {
      permanent_id: generateUUID(),
      display_alias: generateDisplayAlias(era, poet),
      note: "将来的に時代IDに昇格の可能性"
    };
  }
}
```

### 時代判定ロジック

```javascript
function determineEra(poet) {
  // 優先順位: 活動期 > 成熟期 > 生年 > 推定年代
  
  if (poet.activity_peak_year) {
    return getPrefixByYear(poet.activity_peak_year);
  }
  
  if (poet.birth_year && poet.death_year) {
    const maturity_year = poet.birth_year + 30;
    return getPrefixByYear(maturity_year);
  }
  
  if (poet.birth_year) {
    return getPrefixByYear(poet.birth_year + 25);
  }
  
  // 不明の場合
  return getSpecialPrefix('unknown');
}
```

### チェックサム計算

```javascript
function calculateChecksum(baseId) {
  const checksumTable = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let sum = 0;
  
  for (let i = 0; i < baseId.length; i++) {
    const char = baseId[i];
    const value = isNaN(char) ? char.charCodeAt(0) - 55 : parseInt(char);
    sum += value * (i + 1);
  }
  
  return checksumTable[sum % 36];
}
```


## Wikidata連携システム

### 自動データ取得

```javascript
class WikidataIntegration {
  async enrichPoetData(wikidataId) {
    const response = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${wikidataId}&format=json`
    );
    const data = await response.json();
    const entity = data.entities[wikidataId];
    
    return {
      name: this.extractLabel(entity, 'ja'),
      birth_year: this.extractYear(entity.claims.P569),
      death_year: this.extractYear(entity.claims.P570),
      nationality: this.extractNationality(entity.claims.P27),
      suggested_era: this.inferEraFromData(entity)
    };
  }
}
```

### 時代推定支援

Wikidataから取得した生没年、活動期間、所属流派等の情報を基に、適切な時代区分を自動提案。

## ID移行管理

### 段階的移行プロセス

```javascript
const migrationPhases = {
  phase1: {
    duration: "30日間",
    action: "移行予告、影響調査", 
    status: "旧ID有効、新ID併用可能"
  },
  phase2: {
    duration: "90日間",
    action: "ソフト移行期間",
    status: "旧ID → 新IDリダイレクト + 警告"
  },
  phase3: {
    duration: "永続",
    action: "完全移行",
    status: "旧IDは明示的なエイリアスとして保持"
  }
};
```

### API互換性

```javascript
// 旧IDでのアクセスも継続サポート
app.get('/api/poets/:id', async (req, res) => {
  let poetId = req.params.id;
  let migrationInfo = null;
  
  // 移行されたIDの場合
  if (idAliases[poetId]) {
    migrationInfo = idAliases[poetId];
    poetId = migrationInfo.current_id;
    
    res.set({
      'X-Poet-ID-Migrated': 'true',
      'X-New-Poet-ID': poetId,
      'X-Migration-Date': migrationInfo.migration_date
    });
  }
  
  const poet = await getPoet(poetId);
  res.json({ ...poet, migration_info: migrationInfo });
});
```

## 国際展開への対応

### 基本方針

各国・文化圏の特性に応じた時代区分とプレフィックスを設定。

### 設計例

#### イギリス
```javascript
const britishEras = {
  'TU': { name: 'Tudor', period: '1485-1603' },
  'ST': { name: 'Stuart', period: '1603-1714' }, 
  'HA': { name: 'Hanover', period: '1714-1901' },
  'VI': { name: 'Victorian', period: '1837-1901' },
  'WI': { name: 'Windsor', period: '1901-' }
};
```

#### フランス
```javascript
const frenchEras = {
  'BO': { name: 'Bourbon', period: '1589-1792' },
  'R1': { name: 'First Republic', period: '1792-1804' },
  'EM': { name: 'Empire', period: '1804-1814' },
  'R3': { name: 'Third Republic', period: '1870-1940' },
  'R5': { name: 'Fifth Republic', period: '1958-' }
};
```

## UI/UX考慮事項

### 段階的情報開示

```javascript
const userLevels = {
  casual: {
    show: ['poet_name', 'era_simple', 'famous_works'],
    hide: ['poet_id', 'technical_details']
  },
  enthusiast: {
    show: ['poet_name', 'era_detailed', 'poet_id', 'biography'],
    hide: ['checksum_explanation', 'migration_history']
  },
  scholar: {
    show: ['all_technical_details', 'id_structure', 'database_info']
  }
};
```

### モバイル対応表示

```html
<!-- 適応的表示 -->
<div class="poet-display adaptive">
  <div class="simple-view">
    <h3>松尾芭蕉</h3>
    <span class="era">江戸時代</span>
  </div>
  
  <div class="technical-view" hidden>
    <code class="poet-id">JE0001A</code>
    <small>日本・江戸・001・チェックサムA</small>
  </div>
  
  <button class="toggle-technical">🔧</button>
</div>
```

## 実装優先順位

### Phase 1: 基盤システム
1. cultural_periods テーブルの構築
2. 基本的なID生成ロジック
3. Wikidata連携機能

### Phase 2: 管理機能
1. 新規プレフィックス提案システム
2. ID移行管理機能
3. 検証ワークフロー

### Phase 3: 国際展開
1. 他国時代区分の研究・設計
2. 多言語対応
3. 国際的なコミュニティ管理

## 今後の検討事項

### 新規詠み人ID確定アルゴリズム

以下の要素を総合的に判断するアルゴリズムの開発が必要：

- Wikidataからの自動情報取得
- 複数ソースでの情報照合
- 信頼度スコアリング
- コミュニティレビューとの連携
- 機械学習による時代推定支援

### 品質保証

- 重複詩人の検出アルゴリズム
- 異表記・別名の統合管理
- 学術的な検証プロセスの標準化

## 政治的対立時の調停方法

### 基本原則
- **学術的中立性**: 政治的立場に関わらず、文学史・詩歌史の学術的事実に基づく判断
- **段階的エスカレーション**: 議論→専門家調停→第三者機関仲裁の順で解決

### 調停プロセス
1. **初期議論期間** (14日間): GitHub Issues での公開議論
2. **専門家調停** (7日間): 複数の文学史専門家による調停案提示
3. **第三者仲裁** (最終): 国際的な文学・図書館機関(IFLA等)による最終判断

### 対立回避策
- **時代区分の学術的根拠**: 必ず複数の学術文献・研究成果を根拠とする
- **地域中立的命名**: 政治的実体名ではなく文化的・時代的特徴に基づく命名
- **複数表記併用**: 対立がある場合は学術的に受け入れられた複数の表記を併記

---

*この仕様書は継続的に更新・改善されます。*