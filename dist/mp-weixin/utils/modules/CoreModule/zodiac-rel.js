/**
 * modules/CoreModule/zodiac-rel.js —— 十二生肖关系表【单一真源·纯数据】
 *
 * 算什么：两个生肖间的传统地支关系（六合 / 三合 / 六冲 / 六害 / 相刑 / 六破）+ 犯太岁（值/冲/刑/害/破）。
 * 数据口径：传统干支关系，**5 源核对一致**（fengsuihk / udn city / deeporacle / suansuangua / hanyunshi）：
 *   · 六合 子丑·寅亥·卯戌·辰酉·巳申·午未
 *   · 三合 申子辰(水)·亥卯未(木)·寅午戌(火)·巳酉丑(金)
 *   · 六冲 子午·丑未·寅申·卯酉·辰戌·巳亥
 *   · 六害 子未·丑午·寅巳·卯辰·申亥·酉戌
 *   · 三刑 寅巳申（无恩）·丑未戌（恃势）·子卯（无礼）；自刑 辰·午·酉·亥
 *   · 六破 子酉·丑辰·寅亥·卯午·巳申·未戌（民间分量较轻，仅作提示）
 * 说明：这是**民俗关系表**（非算法），只做关系判定与提示，不据此给人下绝对结论。
 * 加载：UMD —— require() 得 { SX, relOf, detail, taisui, ... }；浏览器挂 NT.core.zodiacRel。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.NT = root.NT || {}; root.NT.core = root.NT.core || {}; root.NT.core.zodiacRel = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {

  var SX = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
  var DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var DZ2SX = {}; DIZHI.forEach(function (d, i) { DZ2SX[d] = SX[i]; });
  var SX2DZ = {}; SX.forEach(function (s, i) { SX2DZ[s] = DIZHI[i]; });
  function dz(sx) { return SX2DZ[sx] || null; }

  // —— 两两关系（用支对，正反都匹配）——
  var LIUHE = ['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未'];            // 六合（暗合贵人）
  var SANHE = [                                                            // 三合（明合局）
    { 支: ['申', '子', '辰'], 局: '水', 生肖: '猴鼠龙' },
    { 支: ['亥', '卯', '未'], 局: '木', 生肖: '猪兔羊' },
    { 支: ['寅', '午', '戌'], 局: '火', 生肖: '虎马狗' },
    { 支: ['巳', '酉', '丑'], 局: '金', 生肖: '蛇鸡牛' }
  ];
  var LIUCHONG = ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'];         // 六冲
  var LIUHAI = ['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌'];           // 六害（六穿）
  var LIUPO = ['子酉', '丑辰', '寅亥', '卯午', '巳申', '未戌'];           // 六破（民间较轻）
  var SANXING = [['寅', '巳', '申'], ['丑', '未', '戌'], ['子', '卯']];   // 三刑 + 子卯（无礼）
  var ZIXING = ['辰', '午', '酉', '亥'];                                   // 自刑

  function inPair(list, a, b) {
    for (var i = 0; i < list.length; i++) { var p = list[i]; if ((p[0] === a && p[1] === b) || (p[0] === b && p[1] === a)) return p; }
    return null;
  }
  // 某生肖在某组三刑里吗
  function inXing(a, b) {
    for (var j = 0; j < SANXING.length; j++) { var t = SANXING[j]; if (t.indexOf(a) >= 0 && t.indexOf(b) >= 0 && a !== b) return t; }
    return null;
  }

  /**
   * 两个生肖之间的关系。
   * @returns { 生肖a, 生肖b, 关系:[...], 吉:bool, 说明 }  吉=有合类（六合/三合）；凶类=冲/害/刑/破。
   */
  function relOf(sxA, sxB) {
    var a = dz(sxA), b = dz(sxB);
    if (!a || !b) return { unknown: true, 生肖a: sxA, 生肖b: sxB, 关系: [], 说明: '未识别的生肖，请用十二生肖（鼠牛虎兔龙蛇马羊猴鸡狗猪）。' };
    var out = [], ji = 0, xiong = 0;
    if (a !== b) {
      if (inPair(LIUHE, a, b)) { out.push('六合'); ji++; }
      for (var i = 0; i < SANHE.length; i++) { var g = SANHE[i].支; if (g.indexOf(a) >= 0 && g.indexOf(b) >= 0) { out.push('三合·' + SANHE[i].局 + '局'); ji++; break; } }
      if (inPair(LIUCHONG, a, b)) { out.push('六冲'); xiong++; }
      if (inPair(LIUHAI, a, b)) { out.push('六害'); xiong++; }
      if (inPair(LIUPO, a, b)) { out.push('六破（民间较轻）'); xiong++; }
      if (inXing(a, b)) { out.push('三刑'); xiong++; }
    }
    if (a === b && ZIXING.indexOf(a) >= 0) { out.push('自刑'); xiong++; }
    var tone = out.length === 0 ? '两者无明显特殊干支关系，相处以人和为主。'
      : (ji > xiong ? '偏合，主亲近易配合。' : xiong > ji ? '偏克，多一分体谅与沟通。' : '吉凶相抵，合中有冲。');
    return { 生肖a: sxA, 生肖b: sxB, 关系: out.length ? out : ['无特殊'], 吉: out.length === 0 ? null : (ji > xiong ? true : xiong > ji ? false : null), 说明: tone };
  }

  /** 单个生肖的「贵人/相冲/相害」速查（反查表，供「属 X 和谁配 / 冲谁」用）。 */
  function detail(sx) {
    var d = dz(sx);
    if (!d) return { unknown: true };
    function rev(list) { return list.map(function (p) { return p[0] === d ? p[1] : p[1] === d ? p[0] : null; }).filter(function (x) { return x; }).map(function (z) { return DZ2SX[z]; }); }
    var sanhe = SANHE.filter(function (g) { return g.支.indexOf(d) >= 0; }).map(function (g) { return g.生肖 + '（' + g.局 + '局）'; });
    return {
      生肖: sx, 六合贵人: rev(LIUHE), 三合: sanhe, 六冲: rev(LIUCHONG),
      六害: rev(LIUHAI), 六破: rev(LIUPO), 自刑: ZIXING.indexOf(d) >= 0 ? [sx] : []
    };
  }

  /**
   * 犯太岁：给定流年生肖，某生肖犯哪些太岁（值/冲/刑/害/破）。
   * 太岁 = 当年太岁神（流年生肖），与自身生肖构成相应关系即为犯。
   * @returns [..] 犯太岁类型数组；空 = 不犯。
   */
  function taisui(yearSX, sx) {
    var y = dz(yearSX), m = dz(sx);
    if (!y || !m) return { unknown: true };
    var out = [];
    if (sx === yearSX) out.push('值太岁（坐太岁，' + sx + '年生肖逢本太岁）');
    if (inPair(LIUCHONG, y, m)) out.push('冲太岁（' + m + ' 冲 ' + y + '）');
    if (inXing(y, m)) out.push('刑太岁（' + [y, m].map(DZ2SX).join('') + ' 相刑）');
    if (inPair(LIUHAI, y, m)) out.push('害太岁（' + m + ' 害 ' + y + '）');
    if (inPair(LIUPO, y, m)) out.push('破太岁（' + m + ' 破 ' + y + '）');
    return out;
  }

  return {
    SX: SX, DIZHI: DIZHI, DZ2SX: DZ2SX, SX2DZ: SX2DZ,
    LIUHE: LIUHE, SANHE: SANHE, LIUCHONG: LIUCHONG, LIUHAI: LIUHAI, LIUPO: LIUPO, SANXING: SANXING, ZIXING: ZIXING,
    relOf: relOf, detail: detail, taisui: taisui
  };
});
