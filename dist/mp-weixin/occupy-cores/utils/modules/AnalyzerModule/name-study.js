/**
 * modules/AnalyzerModule/name-study.js —— 姓名学（拆字五行 / 音韵五行 / 五格数理 / 补缺建议）
 * 纯函数，平台无关。输入姓名 → 输出加工好的分析文字（不返回原始字段）。
 * 依赖：db.js
 * 加载：UMD —— 小程序被 require；浏览器挂到全局 NT.nameStudy。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./db.js'));
  else { root.NT = root.NT || {}; root.NT.nameStudy = factory(root.NT && root.NT.db); }
})(typeof self !== 'undefined' ? self : this, function (DB) {

  // 提取姓名：扫描 2-4 字中文串，跳过功能词，取第一个有效串
  function extractName(input) {
    var runs = input.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
    var stop = ['名字', '姓名', '起名', '取名', '笔画', '五格', '音韵', '补缺', '五行',
      '怎么', '如何', '宜忌', '黄历', '干支', '节气', '生肖', '今天', '今日', '明天', '后天'];
    for (var k = 0; k < runs.length; k++) {
      var r = runs[k];
      if (stop.indexOf(r) >= 0) continue;
      if (r.slice(0, 2) === '怎么' || r.slice(0, 2) === '如何') continue;
      return r;
    }
    return '';
  }

  // 音韵五行：按字声母归类（mock：b/m/d 归水木火土金，简化合理）
  function yinYunWx(name) {
    // 以首字声母粗分（mock，演示用）
    var first = name.charAt(0);
    var map = { 'b': '水', 'p': '水', 'm': '土', 'd': '火', 't': '火', 'n': '土', 'l': '火', 'g': '金', 'k': '金', 'z': '水', 'c': '火', 's': '水', 'x': '水', 'h': '水', 'j': '金', 'q': '水' };
    var key = first.toLowerCase();
    return map[key] || '平';
  }

  // 五格数理（mock：字数 * 13 + 7 模 80）
  function wuGe(name) {
    var num = (name.length * 13 + 7) % 80 + 1;
    var g = DB.GESHU_GONGXIONG[0];
    DB.GESHU_GONGXIONG.forEach(function (x) { if (x.range.indexOf(num) >= 0) g = x; });
    return { 数: num, 吉凶: g.grade, 说明: g.note };
  }

  // 主入口：姓名 -> 分析文字
  function analyzeName(name) {
    if (!name) return '【姓名学】请先给出要分析的姓名。';
    var wxCount = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    var detail = [];
    for (var i = 0; i < name.length; i++) {
      var wx = DB.XINGNAME_WUXING[name.charAt(i)];
      if (wx) { wxCount[wx]++; detail.push('「' + name.charAt(i) + '」归' + wx); }
    }
    var lack = [];
    Object.keys(wxCount).forEach(function (k) { if (wxCount[k] === 0) lack.push(k); });
    var strong = Object.keys(wxCount).sort(function (a, b) { return wxCount[b] - wxCount[a]; })[0];
    var wuge = wuGe(name);
    var yy = yinYunWx(name);

    var text = '【姓名学】「' + name + '」';
    text += detail.length ? ('拆字五行：' + detail.join('；') + '。') : '拆字五行：未入 mock 库，按音韵整体归位。';
    text += '音韵五行：以「' + name.charAt(0) + '」起，声韵偏「' + yy + '」。';
    text += '五行分布：' + Object.keys(wxCount).map(function (k) { return k + wxCount[k]; }).join(' / ') + '。';
    if (detail.length && lack.length) text += '缺「' + lack.join('、') + '」，' + wuge.说明 + '，可在字义上补「' + lack[0] + '」以均衡。';
    else if (!detail.length) text += '整体音韵偏「' + yy + '」，' + wuge.说明 + '。';
    else text += '五行俱全、无偏缺，' + wuge.说明 + '。';
    text += '五格数理（mock）：' + wuge.数 + '，' + wuge.吉凶 + '，' + wuge.说明 + '。';
    text += '建议：' + (detail.length && lack.length ? '取名补「' + lack[0] + '」，忌再加重「' + strong + '」。' : '保持现用之字，气势已足。');
    return text;
  }

  return { extractName: extractName, yinYunWx: yinYunWx, wuGe: wuGe, analyzeName: analyzeName };
});
