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
 * 说明：流年/流月/流日 iztro 有 horoscope API 但返回结构随版本变动大，本适配层暂只出「命盘 + 大限 + 四化」
 *   （紫微核心），流年运程留待后续（避免对不稳 API 臆造字段名）。
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

  /**
   * 紫微命盘。
   * @param {Object} inp { y, m, d, h, gender:'male'|'female', isLeapMonth? }
   * @returns { 命宫, 身宫, 五行局, 命宫地支, 十二宫:[{宫,干支,主星,辅星,四化,大限}], 大限 }
   */
  function chart(inp) {
    inp = inp || {};
    if (!astro || !astro.bySolar) return { err: 'iztro 未加载（vendor/iztro.min.js 缺失）' };
    var y = inp.y, m = inp.m, d = inp.d, h = inp.h || 0;
    var g = (inp.gender === 'female' || inp.gender === '女') ? 'female' : 'male';
    var dateStr = y + '-' + pad2(m) + '-' + pad2(d);
    var a;
    try { a = astro.bySolar(dateStr, hourIndex(h), g, true); }
    catch (e) { return { err: 'iztro 排盘失败：' + String(e.message || e) }; }

    var soulZhi = a.earthlyBranchOfSoulPalace, bodyZhi = a.earthlyBranchOfBodyPalace;
    var palaces = (a.palaces || []).map(function (p) {
      var stars = p.majorStars || [];
      // 四化：读每颗主星自带的 mutagen（iztro 已按年干算好，不自推）
      var sihua = [];
      stars.forEach(function (s) {
        var mu = s.mutagen;
        if (mu && (mu.name || mu.type)) sihua.push(s.name + '化' + cap(mu));
      });
      // 大限：该宫项的 ages（纯数字岁数序列；命宫项=命宫大限）
      var ages = p.ages ? p.ages.map(function (x) { return (typeof x === 'object' && x !== null) ? (x.age || '') : x; }) : [];
      return {
        宫: cap(p.name) || p.palace || '', 干支: (p.heavenlyStem || '') + (p.earthlyBranch || ''),
        主星: stars.map(cap).filter(Boolean), 辅星: (p.minorStars || []).map(cap).filter(Boolean),
        四化: sihua, 大限岁数: ages,
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

  /** 十四主星名（iztro 口径，供展示/触发词） */
  var STAR_NAMES = ['紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军'];

  return { chart: chart, starNames: STAR_NAMES };
});
