// 全て2桁プレフィックス + 必要に応じて3桁拡張
const PrefixSystem = {
  // 2桁基本プレフィックス
  basic_format: 'ppxxxxc', // pp=2桁プレフィックス
  // 3桁拡張プレフィックス（細分化が必要な場合）
  extended_format: 'pppxxxc', // ppp=3桁プレフィックス
  // 1桁予約語（システム用途）
  reserved_single: {
    'F': '詠み人知らず',
    'X': '実験的・テスト用',
    'Q': 'wikidata',
  }
};

// 中国本土でも一般的とされる詩歌史区分
const chinesePoetryEras = {
  // 古典期
  'QH': { name: '先秦', period: '~221 BC', note: '詩経、楚辞' },
  'HN': { name: '前漢', period: '206 BC - 8 AD', note: '楽府詩の成立' },
  'HO': { name: '後漢', period: '25-220', note: '五言詩の発達' },

  // 六朝時代
  'WJ': { name: '魏晋', period: '220-420', note: '陶淵明など' },
  'LN': { name: '六朝', period: '420-589', note: '宮廷詩の隆盛' },

  // 唐代（最も細分化される時代）
  'CT': { name: '初唐', period: '618-712', note: '王勃、駱賓王' },
  'ST': { name: '盛唐', period: '712-765', note: '李白、杜甫' },
  'ZT': { name: '中唐', period: '765-835', note: '白居易、韓愈' },
  'WT': { name: '晩唐', period: '835-907', note: '李商隠、杜牧' },

  // 宋代以降
  'SG': { name: '宋', period: '960-1279', note: '詞の黄金期' },
  'YN': { name: '元', period: '1271-1368', note: '散曲の発達' },
  'MG': { name: '明', period: '1368-1644', note: '古詩復古運動' },
  'QG': { name: '清', period: '1644-1911', note: '考証学的詩論' },

  // 現代
  'MJ': { name: '民国', period: '1912-1949', note: '新詩運動' },
  'GD': { name: '現代', period: '1949-', note: '当代詩歌' }
};