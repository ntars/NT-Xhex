/**
 * modules/AnalyzerModule/bazi.js —— 八字排盘 / 命理分析（四柱、日主强弱、喜用神、简批）
 * 纯函数，平台无关。输入出生信息 → 输出完整分析文字（不返回原始字段）。
 * 四柱走精确离线历法（ganzhi.js 委托 lunar.js：立春换年 / 节气定月 / 甲子纪日 / 五鼠遁）；
 * 日主强弱按得令/得地/得势计分（口径见《功能与算法归纳》§2.8）。
 * 依赖：db.js、ganzhi.js
 * 加载：UMD —— 小程序被 require；浏览器挂到全局 NT.bazi。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./db.js'), require('./ganzhi.js'));
  else { root.NT = root.NT || {}; root.NT.bazi = factory(root.NT.db, root.NT.ganzhi); }
})(typeof self !== 'undefined' ? self : this, function (DB, GZ) {

  // 从自然语言里提取出生信息：姓名/性别/年/月/日/时
  function parseBazi(input) {
    var m = input.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]?\s*(\d{1,2})?\s*[时点:：]?/);
    var y = 2005, mo = 6, d = 9, h = 0, name = '', gender = '';
    if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; h = m[4] ? +m[4] : 0; }
    var nm = input.match(/([\u4e00-\u9fa5]{2,4})(?=男|女)/);
    if (nm) name = nm[1];
    if (/女/.test(input)) gender = '女'; else if (/男/.test(input)) gender = '男';
    return { y: y, mo: mo, d: d, h: h, name: name || '命主', gender: gender || '未知' };
  }

  // 四柱排盘（精确历法）+ 日主强弱（得令/得地/得势）+ 喜用神 + 简批
  function analyze(p) {
    p = p || parseBazi('2005年6月9日子时');
    var birth = new Date(p.y, p.mo - 1, p.d, p.h, 0, 0);
    // 精确四柱：年（立春换年）/ 月（节气定建 + 五虎遁）/ 日（甲子纪日）/ 时（五鼠遁）
    var year = GZ.yearGanzhi(p.y);
    var month = GZ.monthGanzhi(birth);
    var day = GZ.dayGanzhi(birth);
    var hour = GZ.hourGanzhi(birth, p.h);

    var siju = '年柱 ' + year.干支 + '、月柱 ' + month.干支 + '、日柱 ' + day.干支 + '、时柱 ' + hour.干支 + '（' + hour.名 + ' ' + hour.段 + '）';

    // 日主强弱：得令/得地/得势 计分（口径见归纳文档 §2.8）
    var dayWx = day.干五行;
    var strength = GZ.precise.dayStrength(dayWx, {
      year: year, month: month, day: day, hour: hour
    });
    var keWx = DB.WUXING_KE[dayWx];
    var shengWx = DB.WUXING_SHENG[dayWx];
    var isWang = strength.判 === '身强' || strength.判 === '偏强';
    var isRuo = strength.判 === '身弱' || strength.判 === '偏弱';
    var xiyong = isWang
      ? '日主' + dayWx + '偏旺，宜克泄，喜用「' + keWx + '」以制衡'
      : isRuo
        ? '日主' + dayWx + '偏弱，宜生扶，喜用「' + shengWx + '」以扶助'
        : '日主' + dayWx + '中和，喜「' + keWx + '」「' + shengWx + '」通权达变';

    var text = '【八字排盘】' + p.name + '（' + p.gender + '），' + p.y + '年' + p.mo + '月' + p.d + '日' + (p.h < 10 ? '0' + p.h : p.h) + '时。';
    text += '四柱：' + siju + '。';
    text += '日主为「' + day.干 + '」（' + dayWx + '），月建「' + strength.月建 + '」当' + (strength.得令 ? '令' : '非令') + '，得地 ' + strength.得地 + '、得势 ' + strength.得势 + '，综合' + strength.判 + '。';
    text += '喜用神：' + xiyong + '。';
    text += '简批：命局以' + dayWx + '为体，' +
      (isWang ? '宜从事属「' + keWx + '」之行业，颜色多选' + keWx + '之色。'
        : isRuo ? '宜多亲近属「' + shengWx + '」之人事物，借其生扶。'
          : '五行相对均衡，随运而调。') + '此为离线历法推算，供参考。';
    return text;
  }

  return { parseBazi: parseBazi, analyze: analyze };
});
