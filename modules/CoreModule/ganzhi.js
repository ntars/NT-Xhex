/**
 * modules/CoreModule/ganzhi.js —— 干支 + 节气内核 C02+C03【单一真源】
 *
 * 算什么：
 *   C02 干支：年/月/日/时四柱干支（多口径：年界立春当日/立春时刻/正月初一；月界节当日/交节时刻；
 *            早子时/夜子时）、六十甲子、干支五行阴阳、生肖。
 *   C03 节气：廿四节气名 + 交节精确时刻（分）、某日所处节气区间、前后节气。
 * 算法来源：走 C01 底座（CoreModule/lunar.js → lunar-javascript 口径，权威）。
 * 参照物：  主流万年历 / 问真排盘（同日期比对）。
 * 校验收：  modules/CoreModule/__tests__/ganzhi.test.js
 * 加载：UMD —— require() 得 { solarPillars, ganzhiOf, jieqiOf, ... }；浏览器挂全局 NT.core.ganzhi。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./lunar.js'), require('./config.js'));
  else { root.NT = root.NT || {}; root.NT.core = root.NT.core || {}; root.NT.core.ganzhi = factory(root.NT.core && root.NT.core.lunar, root.NT.config); }
})(typeof self !== 'undefined' ? self : this, function (CORE, CONF) {

  // 干支五行/阴阳（自研基础表，大白话：天干=气、地支=质）
  var GAN = [
    { 字: '甲', 五行: '木', 阴阳: '阳' }, { 字: '乙', 五行: '木', 阴阳: '阴' },
    { 字: '丙', 五行: '火', 阴阳: '阳' }, { 字: '丁', 五行: '火', 阴阳: '阴' },
    { 字: '戊', 五行: '土', 阴阳: '阳' }, { 字: '己', 五行: '土', 阴阳: '阴' },
    { 字: '庚', 五行: '金', 阴阳: '阳' }, { 字: '辛', 五行: '金', 阴阳: '阴' },
    { 字: '壬', 五行: '水', 阴阳: '阳' }, { 字: '癸', 五行: '水', 阴阳: '阴' }
  ];
  var ZHI = [
    { 字: '子', 五行: '水', 生肖: '鼠' }, { 字: '丑', 五行: '土', 生肖: '牛' },
    { 字: '寅', 五行: '木', 生肖: '虎' }, { 字: '卯', 五行: '木', 生肖: '兔' },
    { 字: '辰', 五行: '土', 生肖: '龙' }, { 字: '巳', 五行: '火', 生肖: '蛇' },
    { 字: '午', 五行: '火', 生肖: '马' }, { 字: '未', 五行: '土', 生肖: '羊' },
    { 字: '申', 五行: '金', 生肖: '猴' }, { 字: '酉', 五行: '金', 生肖: '鸡' },
    { 字: '戌', 五行: '土', 生肖: '狗' }, { 字: '亥', 五行: '水', 生肖: '猪' }
  ];
  var GAN_W = {}, GAN_Y = {}, ZHI_W = {}, ZHI_SX = {};
  GAN.forEach(function (g) { GAN_W[g.字] = g.五行; GAN_Y[g.字] = g.阴阳; });
  ZHI.forEach(function (z) { ZHI_W[z.字] = z.五行; ZHI_SX[z.字] = z.生肖; });

  // 六十甲子全表（0=甲子 … 59=癸亥）
  var JIAZI = (function () {
    var arr = [];
    for (var i = 0; i < 60; i++) arr.push(GAN[i % 10].字 + ZHI[i % 12].字);
    return arr;
  })();
  function jiaziIndex(gz) { return JIAZI.indexOf(gz); }

  // 节气名顺序（从冬至起，[0]=冬至：[11]个"节"+12个"中气"交错，供区间判定）
  var JIEQI_NAMES = ['冬至', '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种',
    '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪'];

  /**
   * C02：四柱干支（尊重 config 口径）。
   * @param {number} y,m,d,h,i,s
   */
  function solarPillars(y, m, d, h, i, s) {
    var r = CORE.fromSolar(y, m, d, h, i, s);
    return r.ganzhi;   // { 年:{干,支,干支,干五行,支五行,生肖}, 月, 日, 时 }
  }

  /** 某公历日 → 日柱干支（简版，供日历逐日标注） */
  function dayGanzhi(y, m, d) { return CORE.fromSolar(y, m, d).ganzhi.日; }

  /** 某年 → 年柱干支 + 生肖（立春口径） */
  function yearGanzhi(y) { return CORE.fromSolar(y, 6, 1).ganzhi.年; }

  /**
   * C03：某公历日 → 节气信息。
   * @returns { 当前节气, 当前交节时刻, 下一节气, 下一交节时刻, 是否交节日, 区间 }
   */
  function jieqiOf(y, m, d) {
    var solar = CORE.jieqiTable ? CORE.jieqiTable(y) : {};
    // 用底座 lunar 直接问：该日是否节气日 + 该节气名
    var r = CORE.fromSolar(y, m, d);
    var lu = r._raw;
    var todayJieqi = lu.getJieQi ? lu.getJieQi() : '';
    // 前后节气（上游提供 getPrevJieQi/getNextJieQi）
    var prev = null, next = null;
    try {
      if (lu.getPrevJieQi) { var p = lu.getPrevJieQi(true); prev = { 名: p.getName(), 时刻: p.getSolar().toYmdHms ? p.getSolar().toYmdHms() : String(p.getSolar()) }; }
      if (lu.getNextJieQi) { var n = lu.getNextJieQi(true); next = { 名: n.getName(), 时刻: n.getSolar().toYmdHms ? n.getSolar().toYmdHms() : String(n.getSolar()) }; }
    } catch (e) { /* 忽略 */ }
    // 完整节气表（该年 24 + 邻近），交节时刻精确到分
    var table = {};
    try {
      var jt = lu.getJieQiTable();
      for (var k in jt) { table[k] = jt[k].toYmdHms ? jt[k].toYmdHms() : String(jt[k]); }
    } catch (e2) { /* 忽略 */ }
    return { 是否交节日: !!todayJieqi, 节气名: todayJieqi, 前一节气: prev, 后一节气: next, 节气表: table };
  }

  /** C03：某年 24 节气名 + 交节时刻 */
  function yearJieqi(y) { return jieqiOf(y, 6, 1).节气表; }

  /** 生肖（立春边界，尊重 config） */
  function zodiac(y) { return yearGanzhi(y).生肖; }

  /**
   * C06 日紫白锚点（日飞星「入中」所需，历法/干支口径）：
   *   锚点 = 冬至/雨水/谷雨（顺，起 1/7/4）与 夏至/处暑/霜降（逆，起 9/3/6）的**交节日**；
   *   起星日 = 交节日起 ≥ 该日 的第一个甲子日（或交节日当天即甲子日）；
   *   目标日入中星 = 起星 逐日顺/逆 推 (目标日 − 起星日) 天（取 9 余）。
   *   日干支走 C01 底座六十甲子；公式 5 源核对（fateask/cnddy/yuanjiawh/qqhbx/lnka）。
   * @returns { 节气, 顺, 起星, 起星日, 间隔 }  间隔 = 目标日 − 起星日（日历天，可负）
   */
  function dayZiBaiAnchor(y, m, d) {
    var ANCH = { 冬至: [1, true], 雨水: [7, true], 谷雨: [4, true], 夏至: [9, false], 处暑: [3, false], 霜降: [6, false] };
    var target = y * 10000 + m * 100 + d;
    // 冬至的交节日常落在 12 月（属下一年的节气表）→ 跨 y-1/y/y+1 三张表收集 6 锚点，取「交节日 ≤ 目标日」中最晚者
    var best = null;
    for (var yy = y - 1; yy <= y + 1; yy++) {
      var table = yearJieqi(yy);
      for (var n in ANCH) {
        var s = table[n]; if (!s) continue;
        var key = +String(s).replace(/-/g, '').replace(/[:\s].*$/, '');
        if (key <= target && (!best || key > best.key)) best = { key: key, 名: n, 起星: ANCH[n][0], 顺: ANCH[n][1] };
      }
    }
    if (!best) return { err: '未定位节气锚点（请给 1901–2100 内日期）' };
    var p = String(best.key);
    var ay = +p.slice(0, 4), am = +p.slice(4, 6), ad = +p.slice(6, 8);
    var zday = findJiazi(ay, am, ad);                                  // 起星日（甲子日）
    return { 节气: best.名, 顺: best.顺, 起星: best.起星, 起星日: zday, 间隔: daysBetween(zday, { y: y, m: m, d: d }) };
  }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  /** 找 (ay,am,ad) 起 ≥ 当天 的第一个甲子日，返回 {y,m,d} */
  function findJiazi(ay, am, ad) {
    var jy = ay, jm = am, jd = ad;
    for (var k = 0; k < 60; k++) {
      var g = CORE.fromSolar(jy, jm, jd, 0);
      if (g.ganzhi.日.干支 === '甲子') return { y: jy, m: jm, d: jd };
      var nx = new Date(Date.UTC(jy, jm - 1, jd + 1));
      jy = nx.getUTCFullYear(); jm = nx.getUTCMonth() + 1; jd = nx.getUTCDate();
    }
    return { y: ay, m: am, d: ad };
  }
  /** 两公历日（{y,m,d}）的日历天差（b − a，可负） */
  function daysBetween(a, b) {
    var A = Date.UTC(a.y, a.m - 1, a.d), B = Date.UTC(b.y, b.m - 1, b.d);
    return Math.round((B - A) / 86400000);
  }

  return {
    solarPillars: solarPillars, dayGanzhi: dayGanzhi, yearGanzhi: yearGanzhi,
    jieqiOf: jieqiOf, yearJieqi: yearJieqi, zodiac: zodiac, dayZiBaiAnchor: dayZiBaiAnchor,
    JIAZI: JIAZI, jiaziIndex: jiaziIndex, JIEQI_NAMES: JIEQI_NAMES,
    GAN: GAN, ZHI: ZHI, GAN_W: GAN_W, ZHI_W: ZHI_W, ZHI_SX: ZHI_SX, GAN_Y: GAN_Y
  };
});
