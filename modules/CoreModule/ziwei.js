/**
 * modules/CoreModule/ziwei.js —— 紫微斗数内核 C13【单一真源 · 适配层】
 *
 * 算什么：命盘（命宫主星/身宫主星/五行局/命宫地支）+ 十二宫（宫名/干支/主星/辅星/四化）+ 大限（各宫大限岁数）。
 * 算法来源：**权威 = 内嵌 iztro 2.x（MIT，构建期资产，运行时不联网）**。本文件只是 iztro 的薄适配层：
 *   把 iztro 的英文枚举/对象收成中文键、按 `earthlyBranchOfSoulPalace` 定位命宫、把 star.mutagen 收成四化。
 *   不自研安星法、不自推四化表——一律走 iztro 算好的口径（符合「有权威用权威」铁律）。
 * vendor：modules/CoreModule/vendor/iztro.min.js（iztro@2.6.2 dist UMD bundle，798KB，自包含 dayjs/lunar-lite）。
 * 校验收：modules/CoreModule/__tests__/ziwei.test.js
 * 加载：UMD——require() 得 { chart, starNames, ... }；浏览器挂 NT.core.ziwei（依赖 window.iztro 或 require vendor）。
 *
 * v3.1.8 补：开放 horoscope()（大限/小限/流年/流月/流日/流时），结构已实测锁定 iztro 2.6.2：
 *   horoscope(dateStr) → { decadal, age, yearly, monthly, daily, hourly }，每层含
 *   { index（该层命宫在 palaces 的下标）, heavenlyStem, earthlyBranch, mutagen[4], palaceNames[12] }。
 *   mutagen 顺序固定为 [禄, 权, 科, 忌]（已用 10 个流年干逐一反推核对十天干四化表，零臆造）。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // iztro 的 UMD bundle 以 `}(self, …)` 结尾，Node 无 self → 补到 globalThis 再 require
    try { if (typeof self === 'undefined' && typeof globalThis !== 'undefined') globalThis.self = globalThis; } catch (e) { }
    module.exports = factory(require('./vendor/iztro.min.js'));
  } else { root.NT = root.NT || {}; root.NT.core = root.NT.core || {}; root.NT.core.ziwei = factory((typeof globalThis !== 'undefined' && globalThis.iztro) || null); }
})(typeof self !== 'undefined' ? self : this, function (IZ) {

  var astro = (IZ && IZ.astro) ? IZ.astro : null;

  function cap(v) { return (v && typeof v === 'object') ? (v.name || '') : (typeof v === 'string' ? v : ''); }
  // 24h → iztro 时辰序（0=子 … 11=亥）：每 2 小时一个时辰，23/1 属子
  function hourIndex(h) { return Math.floor((((h + 1) % 24) / 2)); }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  /** 统一造盘（chart / horoscope 共用，单一真源） */
  function build(inp) {
    inp = inp || {};
    if (!astro || !astro.bySolar) return { err: 'iztro 未加载（vendor/iztro.min.js 缺失）' };
    var y = inp.y, m = inp.m, d = inp.d, h = inp.h || 0;
    if (!y || !m || !d) return { err: '紫微需出生年月日' };
    var g = (inp.gender === 'female' || inp.gender === '女') ? 'female' : 'male';
    var dateStr = y + '-' + pad2(m) + '-' + pad2(d);
    var a;
    try { a = astro.bySolar(dateStr, hourIndex(h), g, true); }
    catch (e) { return { err: 'iztro 排盘失败：' + String(e.message || e) }; }
    return { a: a, dateStr: dateStr };
  }

  /**
   * 紫微命盘。
   * @param {Object} inp { y, m, d, h, gender:'male'|'female', isLeapMonth? }
   * @returns { 命宫, 身宫, 五行局, 命宫地支, 十二宫:[{宫,干支,主星,辅星,四化,大限}], 大限 }
   */
  function chart(inp) {
    var b = build(inp);
    if (b.err) return b;
    var a = b.a;

    var soulZhi = a.earthlyBranchOfSoulPalace, bodyZhi = a.earthlyBranchOfBodyPalace;
    var palaces = (a.palaces || []).map(function (p) {
      var stars = p.majorStars || [];
      // 四化：读每颗星自带的 mutagen（iztro 已按年干算好，不自推）；主星与辅星都要扫（文昌/文曲/左辅/右弼亦会化）
      var sihua = [], 四化项 = [];
      [].concat(p.majorStars || [], p.minorStars || []).forEach(function (s) {
        var mu = s.mutagen;
        var h = (typeof mu === 'string') ? mu : ((mu && (mu.name || mu.type)) ? cap(mu) : '');
        if (h) { sihua.push(s.name + '化' + h); 四化项.push({ 化: h, 星: s.name }); }
      });
      // 大限：该宫项的 ages（纯数字岁数序列；命宫项=命宫大限）
      var ages = p.ages ? p.ages.map(function (x) { return (typeof x === 'object' && x !== null) ? (x.age || '') : x; }) : [];
      return {
        宫: cap(p.name) || p.palace || '', 干支: (p.heavenlyStem || '') + (p.earthlyBranch || ''),
        主星: stars.map(cap).filter(Boolean), 辅星: (p.minorStars || []).map(cap).filter(Boolean),
        四化: sihua, 四化项: 四化项, 大限岁数: ages,
        命宫: p.earthlyBranch === soulZhi, 身宫: p.earthlyBranch === bodyZhi
      };
    });
    var soulPalace = palaces.filter(function (p) { return p.命宫; })[0] || {};
    var bodyPalace = palaces.filter(function (p) { return p.身宫; })[0] || {};
    var majorOf = function (p) { return p.主星 && p.主星.length ? p.主星.join('、') : '（空宫）'; };
    return {
      命宫: { 宫名: soulPalace.宫 || '', 干支: soulPalace.干支 || '', 主星: majorOf(soulPalace), 辅星: (soulPalace.辅星 || []).join('、'), 四化: (soulPalace.四化 || []).join('、') },
      身宫: { 宫名: bodyPalace.宫 || '', 干支: bodyPalace.干支 || '', 主星: majorOf(bodyPalace) },
      命主星: cap(a.soul), 身主星: cap(a.body), 五行局: cap(a.fiveElementsClass),
      命宫地支: soulZhi, 身宫地支: bodyZhi,
      十二宫: palaces,
      大限: { 命宫起限: (soulPalace.大限岁数 || []).map(function (x, i) { return x + '岁'; }) }
    };
  }

  /**
   * 紫微流运（大限 / 小限 / 流年 / 流月 / 流日 / 流时）。
   * @param {Object} inp 同 chart（出生资料）
   * @param {string|Object} target 目标日期 'YYYY-MM-DD' 或 { y, m, d }
   * @returns { 生日, 目标日, 五行局, 星表:[{宫,干支,支,主星,辅星,大限}], 层:[{层,干支,干,支,命宫位,命宫宫名,岁区间,四化,十二宫}] }
   */
  function horoscope(inp, target) {
    var b = build(inp);
    if (b.err) return b;
    var a = b.a;
    var t;
    if (target && typeof target === 'object') t = target.y + '-' + pad2(target.m || 1) + '-' + pad2(target.d || 1);
    else {
      // 容错：'2026-1-5' / '2026/1/5' / '2026.1.5' 一并规范为 YYYY-MM-DD
      var mm = String(target || '').trim().match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
      t = mm ? (mm[1] + '-' + pad2(+mm[2]) + '-' + pad2(+mm[3])) : String(target || '').trim();
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return { err: '流运需目标日期（YYYY-MM-DD 或 {y,m,d}）' };

    var h;
    try { h = a.horoscope(t); }
    catch (e) { return { err: 'iztro 流运失败：' + String(e.message || e) }; }

    // 本命十二宫星表（流运四化要落到这些宫位上）
    var 星表 = (a.palaces || []).map(function (p, i) {
      var ages = p.ages ? p.ages.slice() : [];
      return {
        位: i, 宫: cap(p.name), 干支: (p.heavenlyStem || '') + (p.earthlyBranch || ''), 支: p.earthlyBranch,
        主星: (p.majorStars || []).map(cap).filter(Boolean),
        辅星: (p.minorStars || []).map(cap).filter(Boolean),
        大限: (p.decadal && p.decadal.range) ? p.decadal.range : null,
        小限岁数: ages
      };
    });

    var 层序 = [['decadal', '大限'], ['age', '小限'], ['yearly', '流年'], ['monthly', '流月'], ['daily', '流日'], ['hourly', '流时']];
    var 层 = [];
    层序.forEach(function (x) {
      var o = h[x[0]];
      if (!o) return;
      var p = a.palaces[o.index] || null;
      层.push({
        层: x[1], 名: o.name || x[1],
        干支: (o.heavenlyStem || '') + (o.earthlyBranch || ''),
        干: o.heavenlyStem, 支: o.earthlyBranch,
        命宫位: o.index,
        命宫宫名: p ? cap(p.name) : '',
        岁区间: (p && p.decadal && p.decadal.range) ? p.decadal.range : null,
        四化: (o.mutagen || []).slice(),
        十二宫: (o.palaceNames || []).slice()
      });
    });

    return {
      生日: b.dateStr, 目标日: t,
      命宫地支: a.earthlyBranchOfSoulPalace, 身宫地支: a.earthlyBranchOfBodyPalace,
      五行局: cap(a.fiveClassesClass || a.fiveElementsClass),
      星表: 星表,
      层: 层,
      农历: h.lunarDate || ''
    };
  }

  /** 十四主星名（iztro 口径，供展示/触发词） */
  var STAR_NAMES = ['紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军'];

  return { chart: chart, horoscope: horoscope, build: build, starNames: STAR_NAMES };
});
