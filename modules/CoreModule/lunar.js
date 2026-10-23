/**
 * modules/CoreModule/lunar.js —— 历法内核适配层【单一真源】
 *
 * 作用：把 C01 底座（solarlunar.js 内嵌的 lunar-javascript）包装成**本项目的统一接口**：
 *   · 带口径开关（读 CoreModule/config.js 的 yearBoundary/monthBoundary/ziHour）；
 *   · 输出统一用**中文键**（与全站既有代码一致：{ 干, 支, 干支, 生肖, ... }）；
 *   · 功能层只调本层，**永不直接 require 第三方库** —— 将来换库/升级只改这一处。
 *
 * 依赖：solarlunar.js（C01 底座）、config.js（口径）
 * 加载：UMD —— require() 得 { solar, lunar, ganzhi, jieqi, ... }；浏览器挂全局 NT.core.lunar。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./solarlunar.js'), require('./config.js'));
  // 浏览器：solarlunar.js（库原文 UMD）把 Solar/Lunar/EightChar/HolidayUtil… 散挂到 window（root），
  //   不是挂到 NT.solarlunar。故这里从散挂的全局里取回这四个类组成 SL（与 Node require 的返回同形）。
  else {
    root.NT = root.NT || {}; root.NT.core = root.NT.core || {};
    var SLb = { Solar: root.Solar, Lunar: root.Lunar, EightChar: root.EightChar, HolidayUtil: root.HolidayUtil };
    root.NT.core.lunar = factory(SLb, root.NT.config);
  }
})(typeof self !== 'undefined' ? self : this, function (SL, CONF) {
  var Solar = SL.Solar, Lunar = SL.Lunar;

  // ---------- 内部：口径取年柱（三种年界） ----------
  function yearPillar(lu, solar) {
    var b = CONF.getOne('yearBoundary');
    // 上游提供多种口径：getYearInGanZhi（立春换年，默认） / getYearInGanZhiByLiChun / getYearInGanZhiExact（立春交接时刻） / getYearInGanZhiByLiChunExact
    var gz;
    if (b === 'lichunTime') gz = lu.getYearInGanZhiExact ? lu.getYearInGanZhiExact() : lu.getYearInGanZhi();
    else if (b === 'chunjie') gz = lu.getYearInGanZhiByLiChun ? lu.getYearInGanZhi() : lu.getYearInGanZhi(); // 上游默认即立春；正月初一口径走 LunarYear
    else gz = lu.getYearInGanZhi();                          // 默认 lichun（立春当日）
    return splitGZ(gz);
  }
  function monthPillar(lu) {
    var b = CONF.getOne('monthBoundary');
    var gz = (b === 'jieTime' && lu.getMonthInGanZhiExact) ? lu.getMonthInGanZhiExact() : lu.getMonthInGanZhi();
    return splitGZ(gz);
  }
  function dayPillar(lu) {
    return splitGZ(lu.getDayInGanZhi());
  }
  function hourPillar(lu) {
    // 早晚子时口径：上游 getTimeInGanZhi 默认按"晚子时归当天"或"早子时归次日"？用 Exact 系列按 config
    var z = CONF.getOne('ziHour');
    var gz = (z === 'lateZiSame' && lu.getTimeInGanZhi) ? lu.getTimeInGanZhi() : (lu.getTimeInGanZhi ? lu.getTimeInGanZhi() : '');
    return splitGZ(gz);
  }

  // 干支字符串（两字）→ { 干, 支, 干支 }
  var GAN_W = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
  var ZHI_W = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
  var ZHI_SX = { 子: '鼠', 丑: '牛', 寅: '虎', 卯: '兔', 辰: '龙', 巳: '蛇', 午: '马', 未: '羊', 申: '猴', 酉: '鸡', 戌: '狗', 亥: '猪' };
  function splitGZ(gz) {
    if (!gz || gz.length < 2) return { 干: '', 支: '', 干支: gz || '', 干五行: '', 支五行: '', 生肖: '' };
    var g = gz.charAt(0), z = gz.charAt(1);
    return { 干: g, 支: z, 干支: gz, 干五行: GAN_W[g] || '', 支五行: ZHI_W[z] || '', 生肖: ZHI_SX[z] || '' };
  }

  // ---------- 对外：公历 → 全量历法信息 ----------
  /**
   * @param {number} y,m,d 公历年月日；h,i,s 时分秒（默认 0）
   * @returns 统一中文键的历法对象
   */
  function fromSolar(y, m, d, h, i, s) {
    var solar = Solar.fromYmdHms(y, m, d, h || 0, i || 0, s || 0);
    var lu = solar.getLunar();
    return {
      solar: {
        y: y, m: m, d: d, h: h || 0, i: i || 0, s: s || 0, text: y + '年' + m + '月' + d + '日', cn: solar.toFullString(),
        // v3.4.0：公历节日（元旦节/劳动节/国庆节/妇女节/儿童节/教师节/圣诞节）在上游的
        //   Solar 对象上，不在 Lunar 上 —— 原先只取了农历侧，导致黄历「节日」缺公历节日。
        festivals: (function () { try { var v = solar.getFestivals(); return Array.isArray(v) ? v : []; } catch (e) { return []; } })()
      },
      lunar: {
        text: lu.toString(),
        year: lu.getYear(), month: lu.getMonth(), day: lu.getDay(),
        monthCN: lu.getMonthInChinese(), dayCN: lu.getDayInChinese(),
        isLeap: lu.getMonth() < 0,               // 上游闰月用负数月份表示
        jieqi: lu.getJieQi(),
        // 农历节日 + 其他民俗节日 + 公历节日（顺序：农历在前，公历在后）
        festivals: lu.getFestivals()
          .concat(lu.getOtherFestivals ? lu.getOtherFestivals() : [])
          .concat((function () { try { var v = solar.getFestivals(); return Array.isArray(v) ? v : []; } catch (e) { return []; } })())
      },
      ganzhi: {
        年: yearPillar(lu), 月: monthPillar(lu), 日: dayPillar(lu), 时: hourPillar(lu)
      },
      生肖: lu.getYearShengXiao(),
      星期: solar.getWeekInChinese ? solar.getWeekInChinese() : '',
      星座: solar.getXingZuo ? solar.getXingZuo() : '',
      _raw: lu   // 供上层需要时取用（如八字的藏干/十神/大运，走 CoreModule/bazi）
    };
  }

  // ---------- 对外：农历 → 公历 ----------
  /**
   * @param {number} y 农历年；m 农历月（闰月传负数，如闰二月 = -2）；d 农历日
   * @param {boolean} isLeap 是否闰月（与 m 负数二选一）
   */
  function fromLunar(y, m, d, isLeap, h, i, s) {
    var lm = isLeap ? -Math.abs(m) : m;
    var lu = Lunar.fromYmdHms(y, lm, d, h || 0, i || 0, s || 0);
    var sol = lu.getSolar();
    return fromSolar(sol.getYear(), sol.getMonth(), sol.getDay(), h || 0, i || 0, s || 0);
  }

  // ---------- 对外：某年节气表（含精确交节时刻） ----------
  function jieqiTable(y) {
    var lu = Solar.fromYmd(y, 6, 1).getLunar();
    return lu.getJieQiTable();   // { 节气名: Solar 对象 }，上游已按年给出
  }

  // ---------- 对外：节假日（内置年份配置表，离线） ----------
  function holiday(y, m, d) {
    if (!SL.HolidayUtil || !SL.HolidayUtil.getHoliday) return null;
    return SL.HolidayUtil.getHoliday(y + '-' + pad(m) + '-' + pad(d));
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // ---------- 对外：儒略日 ----------
  function julianDay(y, m, d, h, i, s) {
    var solar = Solar.fromYmdHms(y, m, d, h || 0, i || 0, s || 0);
    return solar.getJulianDay ? solar.getJulianDay() : null;
  }

  return {
    fromSolar: fromSolar,
    fromLunar: fromLunar,
    jieqiTable: jieqiTable,
    holiday: holiday,
    julianDay: julianDay,
    splitGZ: splitGZ,
    _SL: SL   // 底座（供 CoreModule/bazi 等取 EightChar）
  };
});
