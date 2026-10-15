/**
 * modules/AnalyzerModule/ganzhi-analysis.js —— 黄历宜忌 / 择日 / 干支节气 分析（纯函数）
 * 把「今日 / 近期 / 某日」加工成可读的黄历、择日、节气文字（不返回原始字段）。
 * 依赖：db.js、ganzhi.js
 * 加载：UMD —— 小程序被 require；浏览器挂到全局 NT.ganzhiAnalysis。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./db.js'), require('./ganzhi.js'));
  else { root.NT = root.NT || {}; root.NT.ganzhiAnalysis = factory(root.NT.db, root.NT.ganzhi); }
})(typeof self !== 'undefined' ? self : this, function (DB, GZ) {

  // 今日宜忌（黄历）
  function huangliNow() {
    var now = new Date();
    var g = GZ.dayGanzhi(now);
    var jc = GZ.jianchuOf(now);
    var chongZhi = DB.DIZHI_CHONG[g.支] || g.支;
    var chongSx = '';
    DB.ZHI.forEach(function (z) { if (z.字 === chongZhi) chongSx = z.生肖; });
    var hour = GZ.hourOfTime(now.getHours());
    var text = '【黄历宜忌】今日为' + GZ.solarCN(now) + '，' + g.干支 + '日，' + jc.name + '日。';
    text += '冲' + chongZhi + '煞' + chongZhi + '，属' + chongSx + '者今日行事宜谨慎、慎远途。';
    text += '【宜】' + jc.yi.join('、') + '；【忌】' + jc.ji.join('、') + '。';
    text += '因' + jc.name + '日主「' + jc.name + '」之气当令，' + jc.reason + '，故宜' + jc.yi.slice(0, 2).join('、') + '、忌' + jc.ji.slice(0, 2).join('、') + '。';
    text += '吉时' + hour.名 + '（' + hour.段 + '）内行事尤宜。';
    return text;
  }

  // 择日（近期）
  function zeiri() {
    var now = new Date();
    var g = GZ.dayGanzhi(now);
    var jc = GZ.jianchuOf(now);
    return '【择日】近七日择日建议：当前' + g.干支 + '为' + jc.name + '日，「宜」' + jc.yi.join('、') + '，「忌」' + jc.ji.join('、') +
      '。若为嫁娶、开市、入宅等大事宜，宜待「成」「开」之日；安葬、修坟宜「破」「闭」之日。' +
      '择日当避冲煞之日与自身属相相冲之日，方能趋吉避凶。';
  }

  // 干支节气（精确到交节日，东八区）
  function jieqi() {
    var now = new Date();
    var r = GZ.jieqiRange(now);
    var y = GZ.yearGanzhi(now.getFullYear());
    var text = '【干支节气】当前处于「' + r.当前 + '」（' + r.当前日 + '）至「' + r.下一 + '」（' + r.下一日 + '）区间。';
    text += '岁在' + y.干支 + '（' + y.干五行 + '年，岁支属' + y.生肖 + '）。';
    text += '节气者，天地之气流转之节点也。' + r.当前 + '已过，' + r.下一 + '将至，宜顺其气而养藏。';
    return text;
  }

  // 今日/某日 干支 + 生肖（精确）
  function ganzhiToday() {
    var now = new Date();
    var g = GZ.dayGanzhi(now);
    var y = GZ.yearGanzhi(now.getFullYear());
    var text = '【干支】今日' + GZ.solarCN(now) + '为' + g.干支 + '日，生肖属' + g.生肖 + '。';
    text += '岁在' + y.干支 + '（' + y.干五行 + '年，岁支属' + y.生肖 + '）。';
    text += '干支者，历法之骨架，' + y.干支 + '年生人纳音、属相可据此推。';
    return text;
  }

  return { huangliNow: huangliNow, zeiri: zeiri, jieqi: jieqi, ganzhiToday: ganzhiToday };
});
