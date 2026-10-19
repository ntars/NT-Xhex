/**
 * modules/CoreModule/name81.js —— 姓名五格 · 81 数理内核 C11【单一真源】
 *
 * 算什么：康熙笔画（唯一真源 = kangxi-strokes.js 的 3500 字表，缺字报缺）→ 五格剖象（天/人/地/外/总）→
 *        三才配置 → 81 数理吉凶（吉 39 / 半吉 13 / 凶 29，熊崎氏标准表）→ 综合评分。
 * 算法来源：五格/81 数理为通用规则；81 数理吉凶档位 = 熊崎健翁标准表（5 源核对，非臆造）；
 *        康熙笔画唯一真源 = CoreModule/kangxi-strokes.js。
 * 校验收：  modules/CoreModule/__tests__/name81.test.js
 * 加载：UMD —— require() 得 { wuge, score, ... }；浏览器挂全局 NT.core.name81。
 *        依赖同目录 kangxi-strokes.js（UMD 注入，缺则回退内置核心字）。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./kangxi-strokes.js'));
  else { root.NT = root.NT || {}; root.NT.core = root.NT.core || {}; root.NT.core.name81 = factory(root.NT.core.kangxiStrokes); }
})(typeof self !== 'undefined' ? self : this, function (KX) {

  // 康熙笔画唯一真源 = kangxi-strokes.js 生成的 3500 字表。
  // 内置表仅作「KX 未加载」时的最小兜底（品牌/常用姓），不覆盖 KX。
  var FALLBACK = { 白: 5, 玖: 7, 灵: 24, 犀: 12, 玄: 5, 星: 9, 张: 11, 刘: 15, 杨: 13, 黄: 12, 周: 8, 马: 10, 王: 4, 李: 7 };
  var KANGXI = (KX && KX.KANGXI) ? KX.KANGXI : FALLBACK;
  var OVERRIDES = (KX && KX.RADICAL_OVERRIDE) ? KX.RADICAL_OVERRIDE : {};
  /** 康熙笔画唯一真源。覆盖状态：3500（有 KX）或 fallback 字数。 */
  var KANGXI_COVERAGE = Object.keys(KANGXI).length;

  /** 取一个字的康熙笔画（覆盖状态：先部首修正表，再 3500 主表，再兜底；未命中 → 0 表示需补表，不臆造） */
  function stroke(ch) {
    if (OVERRIDES[ch] != null) return OVERRIDES[ch];
    if (KANGXI[ch] != null) return KANGXI[ch];
    if (FALLBACK[ch] != null) return FALLBACK[ch];
    return 0; // 未收录：不臆造，交调用方处理（missingChars）
  }

  /**
   * 五格剖象。
   * @param {string} name 全名（姓在前）
   * @returns { 天格, 人格, 地格, 外格, 总格, 笔画, 缺字 }
   */
  function wuge(name) {
    name = String(name || '').trim();
    var miss = [];
    var strokes = [];
    name.split('').forEach(function (ch) {
      var s = stroke(ch);
      if (s === 0) miss.push(ch);
      strokes.push(s || 0);
    });
    if (miss.length) return { incomplete: true, missingChars: miss, note: '以下字康熙笔画未入库（需补 KANGXI 表）：' + miss.join('、') };
    var sx = strokes[0];              // 姓
    var ming = strokes.slice(1);      // 名
    var s1 = ming.length ? ming[0] : 0;
    var s2 = ming.length > 1 ? ming[1] : 0;
    var tian = sx + 1;               // 天格（单姓+1）
    var ren = sx + s1;               // 人格（姓+名首字）
    var di = (ming.length === 1) ? 1 : (s1 + s2);  // 地格（单名=1，双名=两字和）
    var zong = sx + s1 + s2;        // 总格
    var wai = zong - ren + 1;       // 外格（总-人+1）
    return {
      笔画: strokes, 天格: tian, 人格: ren, 地格: di, 外格: wai, 总格: zong,
      三才: [numWx(tian), numWx(ren), numWx(di)]   // 三才五行（天/人/地）
    };
  }
  // 数 → 五行（按数理个位数：1,2 木 / 3,4 火 / 5,6 土 / 7,8 金 / 9,0 水，循环）
  var NUMWX = { 1: '木', 2: '木', 3: '火', 4: '火', 5: '土', 6: '土', 7: '金', 8: '金', 9: '水', 10: '水' };
  function numWx(n) { var d = ((n - 1) % 10) + 1; return NUMWX[d] || ''; }

  // 81 数理吉凶（三档：吉 39 / 半吉 13 / 凶 29，共 81，覆盖 1–81 无遗漏）
  // 口径：熊崎健翁 81 数理标准表（5 源核对一致；个别交界数 27/42/43/49/55/72/73 各刊本或标半吉或标凶，此处取「半吉」档）。
  // 说明：吉凶档决定评分；>81 的数减 80 再查（grade 已实现）。未列断语的数走「标准断语待补」，不臆造。
  var JI = [1, 3, 5, 6, 7, 8, 11, 13, 15, 16, 17, 18, 21, 23, 24, 25, 29, 31, 32, 33, 35, 37, 39, 41, 45, 47, 48, 51, 52, 57, 58, 61, 63, 65, 67, 68, 71, 75, 81];
  var BANJ = [27, 30, 38, 42, 43, 49, 50, 55, 72, 73, 77, 78, 79];
  // 其余（1–81 未入 JI/BANJ 的 29 个）= 凶。
  var NUM_INFO = {
    1: '独立宇宙，万物之始，首领运', 3: '旭日东升，壮丽壮观，权威旺盛', 5: '种竹成林，月夜呈祥，德智两全',
    13: '春日牡丹，才艺多能，智疑奇性', 17: '志刚达到，博学多才，成功运（半吉）',
    21: '明月中天，光风霁月，万物确立', 24: '掘藏得金，家门余庆，金钱丰盈', 25: '资性英敏，刚毅果断，立挫拔险',
    29: '果敢刚毅，开开疆拓土，豪气（吉）', 31: '春日花开，智勇得志，前程无限', 32: '宝马金鞍，侥幸多望，贵人得助',
    35: '温良和顺，广受欢迎，如龙得水', 37: '圣志不渝，权威显达，首领数', 39: '富贵荣华，刚健有为，独立大志',
    41: '纯阳独秀，独立成名，光风霁月', 45: '顺风通达，德高望重，富贵', 48: '古木逢春，德智兼备，独立权威',
    68: '权威显达，德望重望，众星拱月', 71: '独立白手，刚毅果断，豪杰（吉）', 75: '退守可安，发迹甚迟（半吉）',
    81: '万物回春，还原复始，最极之数（大吉，与 1 等）'
  };

  /** 81 数理评级（1-81 归一到 1-81 段；>81 取模 80 后 +1） */
  function grade(num) {
    var n = ((num - 1) % 80) + 1;
    var level = JI.indexOf(n) >= 0 ? '吉' : BANJ.indexOf(n) >= 0 ? '半吉' : '凶';
    return { 数理: n, 吉凶: level, 提要: NUM_INFO[n] || '（该数断语待补）' };
  }

  /** 综合评分（五格各自吉凶 + 三才生克）*/
  function score(name) {
    var w = wuge(name);
    if (w.incomplete) return w;
    var g = { 天: grade(w.天格), 人: grade(w.人格), 地: grade(w.地格), 外: grade(w.外格), 总: grade(w.总格) };
    var pts = { 吉: 1, 半吉: 0.5, 凶: 0 };
    var s = pts[g.人.吉凶] * 2 + pts[g.天.吉凶] + pts[g.地.吉凶] + pts[g.外.吉凶] + pts[g.总.吉凶];
    var max = 5;
    var score100 = Math.round(s / max * 100);
    return { 五格: w, 数理: g, 得分: score100, 评语: score100 >= 70 ? '数理组合较佳' : score100 >= 40 ? '数理平，有可改善处' : '数理偏弱，宜补益' };
  }

  return { stroke: stroke, KANGXI: KANGXI, KANGXI_COVERAGE: KANGXI_COVERAGE, wuge: wuge, grade: grade, score: score };
});
