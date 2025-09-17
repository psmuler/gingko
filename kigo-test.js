/**
 * 季語抽出精度テスト
 * 手元の俳句データで季語検出の精度を確認
 */

// テスト用俳句データセット
const testHaikus = [
    {
        text: "古池や蛙飛び込む水の音",
        author: "松尾芭蕉",
        expectedKigo: ["蛙"],
        expectedSeason: "春"
    },
    {
        text: "夏草や兵どもが夢の跡",
        author: "松尾芭蕉",
        expectedKigo: ["夏草"],
        expectedSeason: "夏"
    },
    {
        text: "静かさや岩にしみ入る蝉の声",
        author: "松尾芭蕉",
        expectedKigo: ["蝉"],
        expectedSeason: "夏"
    },
    {
        text: "この道や行く人なしに秋の暮",
        author: "松尾芭蕉",
        expectedKigo: ["秋の暮"],
        expectedSeason: "秋"
    },
    {
        text: "山路来て何やらゆかし菫草",
        author: "松尾芭蕉",
        expectedKigo: ["菫草"],
        expectedSeason: "春"
    },
    {
        text: "閑さや岩にしみ入蝉の声",
        author: "松尾芭蕉",
        expectedKigo: ["蝉"],
        expectedSeason: "夏"
    },
    {
        text: "五月雨をあつめて早し最上川",
        author: "松尾芭蕉",
        expectedKigo: ["五月雨"],
        expectedSeason: "夏"
    },
    {
        text: "荒海や佐渡によこたふ天河",
        author: "松尾芭蕉",
        expectedKigo: ["天河"],
        expectedSeason: "秋"
    },
    {
        text: "雪とけて村いっぱいの子どもかな",
        author: "小林一茶",
        expectedKigo: ["雪とけて"],
        expectedSeason: "春"
    },
    {
        text: "やれ打つな蠅が手をすり足をする",
        author: "小林一茶",
        expectedKigo: ["蠅"],
        expectedSeason: "夏"
    },
    {
        text: "名月を取ってくれろと泣く子かな",
        author: "小林一茶",
        expectedKigo: ["名月"],
        expectedSeason: "秋"
    },
    {
        text: "春の海ひねもすのたりのたりかな",
        author: "与謝蕪村",
        expectedKigo: ["春の海"],
        expectedSeason: "春"
    },
    {
        text: "菜の花や月は東に日は西に",
        author: "与謝蕪村",
        expectedKigo: ["菜の花"],
        expectedSeason: "春"
    },
    {
        text: "柿くへば鐘が鳴るなり法隆寺",
        author: "正岡子規",
        expectedKigo: ["柿"],
        expectedSeason: "秋"
    },
    {
        text: "雀の子そこのけそこのけお馬が通る",
        author: "小林一茶",
        expectedKigo: ["雀の子"],
        expectedSeason: "春"
    }
];

/**
 * 季語抽出精度テストの実行
 */
async function runKigoAccuracyTest() {
    console.log('🧪 季語抽出精度テスト開始');
    console.log(`📊 テスト対象: ${testHaikus.length}句`);

    // 季語データベースの初期化を確認
    if (!window.isKigoDatabaseInitialized) {
        console.log('🔄 季語データベース初期化中...');
        if (typeof initializeKigoDatabase === 'function') {
            await initializeKigoDatabase();
        } else {
            console.error('❌ 季語データベース初期化関数が見つかりません');
            return;
        }
    }

    const results = {
        total: testHaikus.length,
        detected: 0,
        correctSeason: 0,
        exactMatch: 0,
        partialMatch: 0,
        missed: 0,
        falsePositive: 0,
        details: []
    };

    console.log('\n--- テスト実行開始 ---');

    for (let i = 0; i < testHaikus.length; i++) {
        const haiku = testHaikus[i];
        console.log(`\n🔍 [${i + 1}/${testHaikus.length}] ${haiku.text}`);

        const testResult = await testSingleHaiku(haiku);
        results.details.push(testResult);

        // 統計更新
        if (testResult.detected.length > 0) {
            results.detected++;
        }
        if (testResult.seasonMatch) {
            results.correctSeason++;
        }
        if (testResult.exactMatch) {
            results.exactMatch++;
        }
        if (testResult.partialMatch) {
            results.partialMatch++;
        }
        if (testResult.detected.length === 0 && haiku.expectedKigo.length > 0) {
            results.missed++;
        }
        if (testResult.detected.length > 0 && haiku.expectedKigo.length === 0) {
            results.falsePositive++;
        }

        // 結果表示
        console.log(`   期待: ${haiku.expectedKigo.join(', ')} (${haiku.expectedSeason})`);
        console.log(`   検出: ${testResult.detected.map(d => d.kigo.display_name).join(', ')}`);
        console.log(`   ${testResult.exactMatch ? '✅ 完全一致' :
                           testResult.partialMatch ? '🟡 部分一致' :
                           '❌ 不一致'}`);
    }

    // 結果サマリー
    console.log('\n📊 === テスト結果サマリー ===');
    console.log(`総数: ${results.total}句`);
    console.log(`検出率: ${results.detected}/${results.total} (${(results.detected/results.total*100).toFixed(1)}%)`);
    console.log(`季節正解率: ${results.correctSeason}/${results.total} (${(results.correctSeason/results.total*100).toFixed(1)}%)`);
    console.log(`完全一致: ${results.exactMatch}/${results.total} (${(results.exactMatch/results.total*100).toFixed(1)}%)`);
    console.log(`部分一致: ${results.partialMatch}/${results.total} (${(results.partialMatch/results.total*100).toFixed(1)}%)`);
    console.log(`未検出: ${results.missed}/${results.total} (${(results.missed/results.total*100).toFixed(1)}%)`);

    // 詳細分析
    analyzeResults(results);

    return results;
}

/**
 * 単一俳句のテスト
 */
async function testSingleHaiku(haiku) {
    let detected = [];

    try {
        if (typeof extractKigo === 'function') {
            detected = extractKigo(haiku.text);
        } else {
            console.warn('⚠️ extractKigo関数が見つかりません');
        }
    } catch (error) {
        console.error('❌ 季語抽出エラー:', error);
    }

    const result = {
        haiku: haiku,
        detected: detected,
        exactMatch: false,
        partialMatch: false,
        seasonMatch: false
    };

    // 完全一致チェック
    if (detected.length > 0 && haiku.expectedKigo.length > 0) {
        const detectedNames = detected.map(d => d.kigo.display_name);
        result.exactMatch = haiku.expectedKigo.some(expected =>
            detectedNames.includes(expected)
        );

        // 部分一致チェック（期待する季語の一部が含まれている）
        if (!result.exactMatch) {
            result.partialMatch = haiku.expectedKigo.some(expected =>
                detectedNames.some(detected =>
                    expected.includes(detected) || detected.includes(expected)
                )
            );
        }

        // 季節一致チェック
        if (detected.length > 0 && detected[0].kigo.season) {
            result.seasonMatch = detected[0].kigo.season === haiku.expectedSeason;
        }
    }

    return result;
}

/**
 * 結果詳細分析
 */
function analyzeResults(results) {
    console.log('\n🔬 === 詳細分析 ===');

    // 未検出の俳句を分析
    const missedHaikus = results.details.filter(r =>
        r.detected.length === 0 && r.haiku.expectedKigo.length > 0
    );

    if (missedHaikus.length > 0) {
        console.log('\n❌ 未検出の俳句:');
        missedHaikus.forEach(r => {
            console.log(`   "${r.haiku.text}" - 期待: ${r.haiku.expectedKigo.join(', ')}`);
        });
    }

    // 誤検出の分析
    const incorrectDetections = results.details.filter(r =>
        r.detected.length > 0 && !r.exactMatch && !r.partialMatch
    );

    if (incorrectDetections.length > 0) {
        console.log('\n🟡 誤検出の俳句:');
        incorrectDetections.forEach(r => {
            const detectedNames = r.detected.map(d => d.kigo.display_name);
            console.log(`   "${r.haiku.text}"`);
            console.log(`     期待: ${r.haiku.expectedKigo.join(', ')}`);
            console.log(`     検出: ${detectedNames.join(', ')}`);
        });
    }

    // 改善提案
    console.log('\n💡 === 改善提案 ===');

    const detectionRate = results.detected / results.total;
    const accuracyRate = results.exactMatch / results.total;

    if (detectionRate < 0.8) {
        console.log('📈 検出率向上案:');
        console.log('   - 季語データベースの語彙拡充');
        console.log('   - 表記揺れパターンの追加');
        console.log('   - 文字数制限の緩和検討');
    }

    if (accuracyRate < 0.7) {
        console.log('🎯 精度向上案:');
        console.log('   - 文脈を考慮した季語選択アルゴリズム');
        console.log('   - 季語の優先度設定');
        console.log('   - 複合語季語の検出強化');
    }

    // パフォーマンス評価
    const performance = {
        excellent: accuracyRate >= 0.9,
        good: accuracyRate >= 0.7,
        fair: accuracyRate >= 0.5,
        poor: accuracyRate < 0.5
    };

    let performanceLevel = 'poor';
    if (performance.excellent) performanceLevel = 'excellent';
    else if (performance.good) performanceLevel = 'good';
    else if (performance.fair) performanceLevel = 'fair';

    const performanceEmoji = {
        excellent: '🌟',
        good: '👍',
        fair: '🤔',
        poor: '⚠️'
    };

    console.log(`\n${performanceEmoji[performanceLevel]} 総合評価: ${performanceLevel.toUpperCase()}`);
    console.log(`   精度: ${(accuracyRate * 100).toFixed(1)}%`);
    console.log(`   検出率: ${(detectionRate * 100).toFixed(1)}%`);
}

// グローバル関数として公開
window.runKigoAccuracyTest = runKigoAccuracyTest;
window.testHaikus = testHaikus;

console.log('🧪 季語抽出精度テスト準備完了');
console.log('💡 実行方法: window.runKigoAccuracyTest() をコンソールで実行');