/**
 * modules/AnalyzerModule/ganzhi.js —— 干支 / 节气 / 生肖 工具（委托精确历法 lunar.js）
 * 把「公历日期 / 年份 / 时间」换算成干支、节气区间、生肖等中间结果。
 * 内核为精确历法（NOAA 太阳黄经节气 + 节气定四柱 + 五虎遁/五鼠遁），离线纯 JS。
 * 建除十二神（黄历宜忌）由 lunar 底座算出，本文件按同名转出，供黄历/择日与 ganzhi-analysis 复用。
 * 依赖：db.js、lunar.js
 * 加载：UMD —— 小程序被 require；浏览器挂到全局 NT.ganzhi。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./db.js'), require('./lunar.js'));
  else { root.NT = root.NT || {}; root.NT.ganzhi = factory(root.NT.db, root.NT.lunar); }
})(typeof self !== 'undefined' ? self : this, function (DB, LUN) {

  // 年份 -> 干支（立春换年；取该年 6 月1 日所在太岁作为「该年干支」，供展示）
  function yearGanzhi(y) {
    var r = LUN.yearGanzhiOf(new Date(y, 5, 1)); // 6/1 必在立春之后
    return { 干: r.干, 支: r.支, 干支: r.干支, 生肖: r.生肖, 干五行: r.干五行, 支五行: r.支五行, 年干: r.年干 };
  }

  // 公历某日 -> 日柱干支（甲子纪日）
  function dayGanzhi(date) {
    var r = LUN.dayGanzhiOf(date);
    return { 干: r.干, 支: r.支, 干支: r.干支, 干五行: r.干五行, 支五行: r.支五行, 生肖: r.生肖 };
  }

  // 某日 -> 月柱干支（节气定月建 + 五虎遁）。接受 date 或 (y, m)
  function monthGanzhi(y, m) {
    var date = (m === undefined) ? y : new Date(y, m - 1, 15); // 默认取该月中旬定月建
    var r = LUN.monthGanzhiOf(date);
    return { 干: r.干, 支: r.支, 干支: r.干支, 干五行: r.干五行, 支五行: r.支五行, 月建: r.月建 };
  }

  // 某日 -> 时柱干支（五鼠遁：日干 + 时辰）
  // 建除十二神（黄历/万年历口径）
  function jianchuOf(date) { return LUN.jianchuOf(date); }

  function hourGanzhi(date, hour) {
    var dayGan = LUN.dayGanzhiOf(date).干;
    var r = LUN.hourGanzhiOf(dayGan, hour);
    return { 干: r.干, 支: r.支, 干支: r.干支, 干五行: r.干五行, 支五行: r.支五行, 名: r.名, 段: r.段 };
  }

  // 兼容旧接口 hourOfTime(h)（无日期时按当日日干）
  function hourOfTime(h) { return hourGanzhi(new Date(), h); }

  // 节气区间（精确到交节日，东八区）
  function jieqiRange(now) {
    var y = now.getFullYear();
    var names = LUN.JIEQI_ORDER;
    var cur = null, next = null;
    for (var i = 0; i < names.length; i++) {
      var r = LUN.jieqiDay(y, LUN.JIEQI_LON[names[i]]);
      var d = new Date(r.y, r.m - 1, r.d);
      if (d <= now && (!cur || d > cur.d0)) cur = { name: names[i], d0: d };
      if (d > now && (!next || d < next.d0)) next = { name: names[i], d0: d };
    }
    if (!next) { var nr = LUN.jieqiDay(y + 1, LUN.JIEQI_LON[names[0]]); next = { name: names[0], d0: new Date(nr.y, nr.m - 1, nr.d) }; }
    if (!cur) { var pr = LUN.jieqiDay(y - 1, LUN.JIEQI_LON[names[names.length - 1]]); cur = { name: names[names.length - 1], d0: new Date(pr.y, pr.m - 1, pr.d) }; }
    return { 当前: cur.name, 当前日: fmt(cur.d0), 下一: next.name, 下一日: fmt(next.d0) };
  }
  function fmt(d) { return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日'; }

  // 年份 -> 生肖
  function zodiacOf(y) { return yearGanzhi(y).生肖; }

  // 公历 -> 可读阳历
  function solarCN(date) {
    return date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日';
  }

  return {
    yearGanzhi: yearGanzhi,
    dayGanzhi: dayGanzhi,
    monthGanzhi: monthGanzhi,
    hourGanzhi: hourGanzhi,
    jianchuOf: jianchuOf,
    hourOfTime: hourOfTime,
    jieqiRange: jieqiRange,
    zodiacOf: zodiacOf,
    solarCN: solarCN,
    // 暴露精确历法内核（供 bazi / 分析直接取用）
    precise: LUN
  };
});
