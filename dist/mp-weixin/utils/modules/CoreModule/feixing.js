/**
 * modules/CoreModule/feixing.js —— 九宫飞星 · 三元九运内核 C09【单一真源】
 *
 * 算什么：入中星（1900–1999 用 10 减、2000+ 用 9 减）、顺飞九宫轨迹、
 *        九星全表（吉凶/宫/五行/专位/主象）、三元九运（2024–2043 九紫离火运）。
 * 算法来源：自研，依圣经 14.1/14.2/14.3 + 《沈氏玄空学》。
 * 校验收：  modules/CoreModule/__tests__/feixing.test.js
 * 加载：UMD —— require() 得 { ruZhong, feiGong, ... }；浏览器挂全局 NT.core.feixing。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./ganzhi.js'));
  else { root.NT = root.NT || {}; root.NT.core = root.NT.core || {}; root.NT.core.feixing = factory(root.NT.core && root.NT.core.ganzhi); }
})(typeof self !== 'undefined' ? self : this, function (GANZHI) {

  // 九星（数字 ↔ 星）
  var STARS = {
    1: '一白贪狼', 2: '二黑巨门', 3: '三碧禄存', 4: '四绿文曲', 5: '五黄廉贞',
    6: '六白武曲', 7: '七赤破军', 8: '八白左辅', 9: '九紫右弼'
  };
  // 顺飞九宫轨迹（中 → 乾西北 → 兑正西 → 艮东北 → 离正南 → 坎正北 → 坤西南 → 震正东 → 巽东南 → 中）
  var TRACK = [5, 6, 7, 8, 9, 1, 2, 3, 4];   // 宫序（按洛书宫位数字）
  // 九星属性
  var META = {
    1: { 吉凶: '吉', 宫: '坎/正北', 五行: '水', 专位: '桃花位', 主象: '情感、人缘、贵人、偏财、官运' },
    2: { 吉凶: '大凶', 宫: '坤/西南', 五行: '土', 专位: '病符位', 主象: '疾病、伤痛、口舌' },
    3: { 吉凶: '凶', 宫: '震/正东', 五行: '木', 专位: '是非位', 主象: '是非、争斗、官非' },
    4: { 吉凶: '中平偏吉', 宫: '巽/东南', 五行: '木', 专位: '文昌位', 主象: '文昌、学业、事业、艺术' },
    5: { 吉凶: '最凶', 宫: '中/中央', 五行: '土', 专位: '五黄煞', 主象: '凶灾、祸患、意外、血光' },
    6: { 吉凶: '吉', 宫: '乾/西北', 五行: '金', 专位: '偏财位', 主象: '横财、贵人、升职、权力' },
    7: { 吉凶: '凶', 宫: '兑/正西', 五行: '金', 专位: '破财位', 主象: '破财、盗贼、口舌、感情纠纷' },
    8: { 吉凶: '大吉', 宫: '艮/东北', 五行: '土', 专位: '正财位', 主象: '正财、财运、事业、田宅' },
    9: { 吉凶: '吉', 宫: '离/正南', 五行: '火', 专位: '喜神位', 主象: '喜庆、姻缘、贵人' }
  };

  /** 入中星（圣经 14.1：1900–1999 用 10 减；2000+ 用 9 减。年份后两位叠加 >9 再叠加） */
  function ruZhong(year) {
    var s = year % 100;
    while (s >= 10) s = Math.floor(s / 10) + (s % 10);
    var base = (year >= 2000) ? 9 : 10;
    var r = base - s;
    while (r < 1) r += 9;
    return r;
  }

  /** 顺飞九宫：给定入中星，返回 9 宫各落何星 */
  function feiGong(ruZhongStar) {
    var out = {};
    var startIdx = TRACK.indexOf(ruZhongStar);
    for (var i = 0; i < 9; i++) {
      var gong = TRACK[i];                                  // 落在第 i 宫
      var star = TRACK[(startIdx + i) % 9];                 // 星序：入中星放第 startIdx 宫位置…
      // 飞星规则：入中星 r 落入"中"宫，然后按轨迹顺飞。第 i 宫的星 = r 顺推 i 位（在 1-9 循环里 +1）
      out[gong] = add(ruZhongStar, i, 9);
    }
    return out;
  }
  // 数字 1-9 循环加法（9 后回到 1，即 1-based 前进 b 位；b=0 → 原值，保证入中星落中宫）
  function add(a, b, mod) { return (((a - 1 + b) % mod) + mod) % mod + 1; }

  /** 三元九运（上/中/下元，各 3 运 × 20 年；2024–2043 = 九运 = 九紫离火） */
  function yuanYun(year) {
    // 一运 1864-1883 … 九运 2024-2043（每运 20 年）
    var yun = Math.floor((year - 1864) / 20) + 1;
    yun = ((yun - 1) % 9) + 1;
    return { 运: yun, 星: STARS[yun], 说明: yun === 9 ? '九紫离火运（2024–2043）' : '第 ' + yun + ' 运' };
  }

  /** 该年飞星盘（含各宫吉凶） */
  function yearChart(year) {
    var rz = ruZhong(year);
    var chart = feiGong(rz);
    var detail = {};
    for (var g in chart) detail[g] = { 星: STARS[chart[g]], 元数据: META[chart[g]] };
    return { 入中星: rz, 入中星名: STARS[rz], 盘: detail, 运: yuanYun(year) };
  }

  // ===== 月 / 时 飞星（玄空月紫白 / 时紫白；公式经 5 源交叉核对，零臆造）=====
  // 12 支 → 四正(子午卯酉) / 四生(寅申巳亥) / 四墓(辰戌丑未)
  var ZHONG = ['子', '午', '卯', '酉'];
  var SHENG4 = ['寅', '申', '巳', '亥'];
  var MU4 = ['辰', '戌', '丑', '未'];
  function zhiClass(dz) { if (ZHONG.indexOf(dz) >= 0) return '正'; if (SHENG4.indexOf(dz) >= 0) return '生'; if (MU4.indexOf(dz) >= 0) return '墓'; return null; }
  function decr(a, n, mod) { return (((a - 1 - n) % mod) + mod) % mod + 1; }
  /** 逆飞九宫（中 → 轨迹，星逐宫递减） */
  function feiGongBack(rz) { var out = {}; for (var i = 0; i < 9; i++) { out[TRACK[i]] = decr(rz, i, 9); } return out; }
  function detailOf(chart) { var d = {}; for (var g in chart) d[g] = { 星: STARS[chart[g]], 元数据: META[chart[g]] }; return d; }

  /**
   * 月飞星（玄空月紫白）。年支定正月入中星（四正 8 / 四生 2 / 四墓 5），逐月逆推入中星；入中后**顺飞**九宫。
   * @param yearZhi 年支（子/丑/…）；@monthNum 农历月序 1–12。
   */
  function monthChart(yearZhi, monthNum) {
    var cls = zhiClass(yearZhi);
    var start = cls === '正' ? 8 : cls === '生' ? 2 : 5;
    var rz = decr(start, monthNum - 1, 9);
    return { 月: monthNum, 入中星: rz, 入中星名: STARS[rz], 盘: detailOf(feiGong(rz)), 顺: true };
  }

  /**
   * 时飞星（玄空时紫白）。日支定起数（四正/四生/四墓），冬至后**顺**、夏至后**逆**；入中后冬顺飞 / 夏逆飞。
   * @param dayZhi 日支；@hourIndex 时序号（子 0 … 亥 11）；@winter true=冬至后(顺) false=夏至后(逆)。
   */
  function hourChart(dayZhi, hourIndex, winter) {
    var cls = zhiClass(dayZhi);
    var start = winter ? (cls === '正' ? 1 : cls === '墓' ? 4 : 7) : (cls === '正' ? 9 : cls === '墓' ? 6 : 3);
    var rz = winter ? add(start, hourIndex, 9) : decr(start, hourIndex, 9);
    return { 时: hourIndex + 1, 入中星: rz, 入中星名: STARS[rz], 盘: detailOf(winter ? feiGong(rz) : feiGongBack(rz)), 顺: winter };
  }

  // ===== 日飞星（玄空日紫白，最易错，已做权威锚点 + 逐日递推）=====
  // 段起数：冬至1/雨水7/谷雨4（顺）、夏至9/处暑3/霜降6（逆）；
  // 起星日 = 该段「节气日 ≤ 甲子日」的第一个甲子日；入中 = 段起星 ± 逐日（目标日 − 甲子日），取 9 余。
  // 历法/干支锚点走 C02 的 ganzhi.dayZiBaiAnchor（节气交节日 + 六十甲子，底座精确）。
  function n9(x) { return (((x - 1 + 9) % 9) + 9) % 9 + 1; }
  /**
   * 日飞星（玄空日紫白）。
   * @param y,m,d 公历。返回 { 节气, 顺, 入中星, 入中星名, 盘 }。
   */
  function dayChart(y, m, d) {
    if (!GANZHI || !GANZHI.dayZiBaiAnchor) return { err: '日紫白需 C02 内核（ganzhi）提供锚点' };
    var anchor = GANZHI.dayZiBaiAnchor(y, m, d);
    if (anchor.err) return { err: anchor.err };
    var rz = anchor.顺 ? n9(anchor.起星 + anchor.间隔) : n9(anchor.起星 - anchor.间隔);
    return {
      节气: anchor.节气, 顺: anchor.顺, 起星日: anchor.起星日, 间隔: anchor.间隔,
      入中星: rz, 入中星名: STARS[rz], 盘: detailOf(anchor.顺 ? feiGong(rz) : feiGongBack(rz))
    };
  }

  return {
    STARS: STARS, META: META, ruZhong: ruZhong, feiGong: feiGong, yuanYun: yuanYun, yearChart: yearChart, TRACK: TRACK,
    monthChart: monthChart, hourChart: hourChart, dayChart: dayChart, zhiClass: zhiClass
  };
});
