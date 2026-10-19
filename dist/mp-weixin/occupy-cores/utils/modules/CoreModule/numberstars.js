/**
 * modules/CoreModule/numberstars.js —— 数字能量 · 八星内核 C12【单一真源】
 *
 * 算什么：八星速查（天医/生气/延年/伏位=吉，绝命/祸害/六煞/五鬼=凶，按两位数字组合判定）→
 *        手机号/车牌/任意数字串的八星扫描 + 分段吉凶 + 磁场含义；车牌字母（A=1…Z=26）化简。
 * 算法来源：自研，依《数字天机》doc5 八星速查表 + doc6 八星五行。
 * 校验收：  modules/CoreModule/__tests__/numberstars.test.js
 * 加载：UMD —— require() 得 { starsOf, analyze, ... }；浏览器挂全局 NT.core.numberstars。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.NT = root.NT || {}; root.NT.core = root.NT.core || {}; root.NT.core.numberstars = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {

  // 八星速查表（doc5）：两位数字组合 → 星。含双向（如 13 天医、31 天医）。
  var STARS = [
    { 星: '天医', 吉凶: '吉', 组合: [13, 31, 68, 86, 49, 94, 27, 72], 含义: '钱财、婚姻、业绩' },
    { 星: '生气', 吉凶: '吉', 组合: [14, 41, 67, 76, 93, 39, 82, 28], 含义: '贵人、亲朋、同事' },
    { 星: '延年', 吉凶: '吉', 组合: [19, 91, 87, 78, 43, 34, 26, 62], 含义: '工作、事业、专业能力' },
    { 星: '伏位', 吉凶: '吉', 组合: [11, 22, 33, 44, 66, 77, 88, 99], 含义: '延续、积蓄、被动' },
    { 星: '绝命', 吉凶: '凶', 组合: [12, 21, 69, 96, 84, 48, 37, 73], 含义: '投资、开支、破财' },
    { 星: '祸害', 吉凶: '凶', 组合: [17, 71, 89, 98, 64, 46, 32, 23], 含义: '口舌、小人、病痛、伤灾' },
    { 星: '六煞', 吉凶: '凶', 组合: [16, 61, 74, 47, 38, 83, 92, 29], 含义: '偏桃花、忧郁、时尚' },
    { 星: '五鬼', 吉凶: '凶', 组合: [18, 81, 79, 97, 36, 63, 24, 42], 含义: '变动、异地、血光之灾' }
  ];
  var MAP = {};
  STARS.forEach(function (s) { s.组合.forEach(function (c) { MAP[c] = s; }); });

  /** 两位数字 → 八星 */
  function starsOf(a, b) {
    return MAP[a * 10 + b] || null;
  }

  // 车牌字母 → 数字（A=1…Z=26，再化简为一位）
  function letterToNum(ch) {
    var n = ch.toUpperCase().charCodeAt(0) - 64;
    if (n >= 1 && n <= 26) { while (n >= 10) n = Math.floor(n / 10) + (n % 10); }
    return n;
  }

  /**
   * 分析任意数字串（手机号/车牌/任意）。逐对滑窗判八星，统计吉凶。
   * @param {string} str
   * @returns { 数字串, 八星明细, 吉星数, 凶星数, 结论 }
   */
  function analyze(str) {
    var s = String(str || '').replace(/[^0-9A-Z]/gi, '').toUpperCase();
    var detail = [];
    var ji = 0, xiong = 0;
    for (var i = 0; i < s.length - 1; i++) {
      var ch = s[i], ch2 = s[i + 1];
      var a = (ch >= 'A' && ch <= 'Z') ? letterToNum(ch) : parseInt(ch, 10);
      var b = (ch2 >= 'A' && ch2 <= 'Z') ? letterToNum(ch2) : parseInt(ch2, 10);
      if (a === 0 || b === 0 || isNaN(a) || isNaN(b)) continue;
      var st = starsOf(a, b);
      if (st) {
        detail.push({ 位置: i + 1, 数字: a + b, 星: st.星, 吉凶: st.吉凶 });
        if (st.吉凶 === '吉') ji++; else xiong++;
      }
    }
    var concl = ji > xiong ? '吉星居多，磁场偏正' : ji < xiong ? '凶星偏多，留意对应事项' : '吉凶相抵';
    return { 数字串: s, 八星明细: detail, 吉星数: ji, 凶星数: xiong, 结论: concl };
  }

  return { STARS: STARS, starsOf: starsOf, analyze: analyze, letterToNum: letterToNum };
});
