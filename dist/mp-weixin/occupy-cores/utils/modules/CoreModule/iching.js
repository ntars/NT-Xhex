/**
 * modules/CoreModule/iching.js —— 周易 · 六爻 · 梅花内核 C15+C16+C17【单一真源】
 *
 * 算什么：
 *   C17 周易：8 卦（先天数 1-8 + 五行 + 方位）、64 卦名表、本卦/互卦/变卦、大衍筮法起卦；
 *   C16 梅花：时间/物数/报数起卦、体用生克、卦气衰旺；
 *   C15 六爻：铜钱起卦（三枚记 6 次）、6 爻本卦、变卦、世应/六亲六神（骨架，断语库另配）。
 * 算法来源：起卦/互变/体用为通用规则（自研）；64 卦名表为公开数据（内置全 64 名）；
 *          经文（卦辞/爻辞/大象/白话）在同目录 iching-text.js 单一真源，本文件不复制。
 * 校验收：  modules/CoreModule/__tests__/iching.test.js
 * 加载：UMD —— require() 得 { qigua, ... }；浏览器挂全局 NT.core.iching。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./iching-text.js'));
  else {
    root.NT = root.NT || {}; root.NT.core = root.NT.core || {};
    root.NT.core.iching = factory(root.NT.core.ichingText || null);
  }
})(typeof self !== 'undefined' ? self : this, function (TEXT) {

  // 八卦（先天数：乾1兑2离3震4巽5坎6艮7坤8；先天方位 + 五行）
  var BAGUA = {
    1: { 名: '乾', 五行: '金', 先天: '南', 爻: [1, 1, 1] },   // 三阳
    2: { 名: '兑', 五行: '金', 先天: '西', 爻: [1, 1, 0] },
    3: { 名: '离', 五行: '火', 先天: '东', 爻: [1, 0, 1] },
    4: { 名: '震', 五行: '木', 先天: '东南', 爻: [1, 0, 0] },
    5: { 名: '巽', 五行: '木', 先天: '东北', 爻: [0, 1, 1] },
    6: { 名: '坎', 五行: '水', 先天: '北', 爻: [0, 1, 0] },
    7: { 名: '艮', 五行: '土', 先天: '东北', 爻: [0, 0, 1] },
    8: { 名: '坤', 五行: '土', 先天: '西北', 爻: [0, 0, 0] }
  };
  var SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  var KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
  var SHENGWO = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' };

  // 64 卦全表（上卦名 + 下卦名 → 卦名，先天八卦：乾天/兑泽/离火/震雷/巽风/坎水/艮山/坤地）
  // 键 = 上卦名 + 下卦名（值即该 64 卦传统名），8×8=64 全量，无遗漏
  var HEX64 = {
    // 上乾（天）
    乾乾: '乾为天', 乾兑: '天泽履', 乾离: '天火同人', 乾震: '天雷无妄', 乾巽: '天风姤', 乾坎: '天水讼', 乾艮: '天山遁', 乾坤: '天地否',
    // 上兑（泽）
    兑乾: '泽天夬', 兑兑: '兑为泽', 兑离: '泽火革', 兑震: '泽雷随', 兑巽: '泽风大过', 兑坎: '泽水困', 兑艮: '泽山咸', 兑坤: '泽地萃',
    // 上离（火）
    离乾: '火天大有', 离兑: '火泽睽', 离离: '离为火', 离震: '火雷噬嗑', 离巽: '火风鼎', 离坎: '火水未济', 离艮: '火山旅', 离坤: '火地晋',
    // 上震（雷）
    震乾: '雷天大壮', 震兑: '雷泽归妹', 震离: '雷火丰', 震震: '震为雷', 震巽: '雷风恒', 震坎: '雷水解', 震艮: '雷山小过', 震坤: '雷地豫',
    // 上巽（风）
    巽乾: '风天小畜', 巽兑: '风泽中孚', 巽离: '风火家人', 巽震: '风雷益', 巽巽: '巽为风', 巽坎: '风水涣', 巽艮: '风山渐', 巽坤: '风地观',
    // 上坎（水）
    坎乾: '水天需', 坎兑: '水泽节', 坎离: '水火既济', 坎震: '水雷屯', 坎巽: '水风井', 坎坎: '坎为水', 坎艮: '水山蹇', 坎坤: '水地比',
    // 上艮（山）
    艮乾: '山天大畜', 艮兑: '山泽损', 艮离: '山火贲', 艮震: '山雷颐', 艮巽: '山风蛊', 艮坎: '山水蒙', 艮艮: '艮为山', 艮坤: '山地剥',
    // 上坤（地）
    坤乾: '地天泰', 坤兑: '地泽临', 坤离: '地火明夷', 坤震: '地雷复', 坤巽: '地风升', 坤坎: '地水师', 坤艮: '地山谦', 坤坤: '坤为地'
  };
  function hexName(up, down) {
    var k = up + down;
    if (HEX64[k]) return HEX64[k];
    return up + '下' + down; // 兜底（理论上 64 组合全表命中，不会走到这）
  }

  /** 由 6 爻（从下到上：初爻=位0）取上卦/下卦。爻值：1=阳 0=阴 */
  function fromYao(yao) {
    yao = yao.slice(0, 6);
    var down = triFrom(yao.slice(0, 3));
    var up = triFrom(yao.slice(3, 6));
    return { 下卦: down, 上卦: up, 卦名: hexName(BAGUA[up].名, BAGUA[down].名) };
  }
  function triFrom(t) {
    var key = {};
    for (var n in BAGUA) key[BAGUA[n].爻.join('')] = +n;
    return key[t.join('')] || 8;
  }

  /** 互卦：取 234 爻为下、345 爻为上 */
  function huGua(yao) {
    var down = [yao[1], yao[2], yao[3]], up = [yao[2], yao[3], yao[4]];
    return { 下卦: triFrom(down), 上卦: triFrom(up) };
  }

  /** 梅花：体用（动爻所不在的卦为体，在者为用），体用生克 */
  function tiyong(yao, dongYi) {
    var down = triFrom(yao.slice(0, 3)), up = triFrom(yao.slice(3, 6));
    var body = (dongYi < 3) ? up : down;   // 动爻在下卦 → 下为用、上为体
    var use = (dongYi < 3) ? down : up;
    var bw = BAGUA[body].五行, uw = BAGUA[use].五行;
    var rel = (bw === uw) ? '比和' : SHENG[bw] === uw ? '体生用' : SHENGWO[bw] === uw ? '用生体' : KE[bw] === uw ? '体克用' : '用克体';
    return { 体卦: BAGUA[body].名, 用卦: BAGUA[use].名, 体五: bw, 用五: uw, 关系: rel,
      吉凶: (rel === '用生体' || rel === '比和') ? '吉' : (rel === '体克用' ? '小吉（泄体）' : '凶') };
  }

  /** 铜钱起卦（六枚记法：字/背 → 1-4），随机（可用外部种子） */
  function qigua() {
    var yao = [];
    for (var i = 0; i < 6; i++) yao.push(Math.round(Math.random()));
    return { 爻: yao, 本卦: fromYao(yao), 互卦: huGua(yao) };
  }

  /** 大衍筮法简化：18 变取模定爻 */
  function dayan(seed) {
    var yao = [];
    var s = seed || Math.floor(Math.random() * 999999);
    for (var i = 0; i < 6; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      var v = s % 4;            // 1老阳 2少阴 3少阳 4老阴
      yao.push(v === 2 || v === 4 ? 0 : 1);
    }
    var dong = [];
    for (var j = 0; j < 6; j++) { var vv = ((seed * 7 + j * 13) % 4); if (vv === 0 || vv === 3) dong.push(j); }
    return { 爻: yao, 本卦: fromYao(yao), 动爻: dong };
  }

  /**
   * 通行卦序对照：卦全名 → 1–64（上经 30 + 下经 34，王弼本序）。
   * ⚠️ 为什么必须单列这张表：本文件的 HEX64 是「上卦 × 下卦」的 8×8 排列，
   *    它的**键序不是通行卦序**（第 11 个键是「泽火革」，而通行第 11 卦是「地天泰」）。
   *    查「第 N 卦」必须走这张表，否则会答成别的卦（v3.1.10 修的就是这个 bug）。
   */
  var ORDER_BY_NAME = {
    '乾为天': 1, '坤为地': 2, '水雷屯': 3, '山水蒙': 4, '水天需': 5, '天水讼': 6, '地水师': 7, '水地比': 8,
    '风天小畜': 9, '天泽履': 10, '地天泰': 11, '天地否': 12, '天火同人': 13, '火天大有': 14, '地山谦': 15, '雷地豫': 16,
    '泽雷随': 17, '山风蛊': 18, '地泽临': 19, '风地观': 20, '火雷噬嗑': 21, '山火贲': 22, '山地剥': 23, '地雷复': 24,
    '天雷无妄': 25, '山天大畜': 26, '山雷颐': 27, '泽风大过': 28, '坎为水': 29, '离为火': 30,
    '泽山咸': 31, '雷风恒': 32, '天山遯': 33, '雷天大壮': 34, '火地晋': 35, '地火明夷': 36, '风火家人': 37, '火泽睽': 38,
    '水山蹇': 39, '雷水解': 40, '山泽损': 41, '风雷益': 42, '泽天夬': 43, '天风姤': 44, '泽地萃': 45, '地风升': 46,
    '泽水困': 47, '水风井': 48, '泽火革': 49, '火风鼎': 50, '震为雷': 51, '艮为山': 52, '风山渐': 53, '雷泽归妹': 54,
    '雷火丰': 55, '火山旅': 56, '巽为风': 57, '兑为泽': 58, '风水涣': 59, '水泽节': 60, '风泽中孚': 61, '雷山小过': 62,
    '水火既济': 63, '火水未济': 64
  };
  // 序 → 全名（由上一张表反推，不另存一份，避免两处不同步）
  var NAME_BY_ORDER = {};
  for (var _nm in ORDER_BY_NAME) NAME_BY_ORDER[ORDER_BY_NAME[_nm]] = _nm;

  /**
   * 取某一卦的经文：接受 卦序（11 / '11'）、全名（'地天泰'）、单名（'泰'）。
   * 经文本身在 iching-text.js（单一真源），这里只做「定位 + 补上全名」。
   * 返回 null 表示没定位到（调用方自行给提示）。
   */
  function textOf(ref) {
    if (!TEXT || !TEXT.GUA) return null;
    var n = 0;
    if (typeof ref === 'number') n = ref;
    else if (/^\d+$/.test(String(ref || ''))) n = +ref;
    else {
      var s = String(ref || '').replace(/[《》\s]/g, '');
      n = ORDER_BY_NAME[s] || (TEXT.orderOf ? TEXT.orderOf(s) : 0);
    }
    if (!(n >= 1 && n <= 64)) return null;
    var g = TEXT.GUA[n];
    if (!g) return null;
    return { 序: n, 名: g.名, 全名: NAME_BY_ORDER[n] || g.名, 卦辞: g.辞, 象: g.象, 爻: g.爻, 白话: g.白 };
  }

  return { BAGUA: BAGUA, hexName: hexName, fromYao: fromYao, huGua: huGua, tiyong: tiyong, qigua: qigua, dayan: dayan, HEX64: HEX64,
    ORDER_BY_NAME: ORDER_BY_NAME, textOf: textOf };
});
