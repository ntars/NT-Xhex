/**
 * modules/AnalyzerModule/analyzer.js —— 分析引擎主入口【单一真源】（纯函数，平台无关）
 *
 * 职责：把用户输入转成可读分析。流程：意图识别（intent.js）→ 话题守卫 → 按意图调算法 → 自然语言输出。
 * 对外只有一个入口 analyze(text)：命中返回分析文本；非玄学统一拒答；无法识别返回功能引导。
 * 依赖：name-study / bazi / ganzhi-analysis / intent（全部同目录子模块），无平台 API、无网络。
 * 加载：UMD —— 小程序/uni-app 被 require；浏览器挂到全局 NT.analyzer。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./name-study.js'), require('./bazi.js'), require('./ganzhi-analysis.js'), require('./intent.js'));
  else { root.NT = root.NT || {}; root.NT.analyzer = factory(root.NT && root.NT.nameStudy, root.NT && root.NT.bazi, root.NT && root.NT.ganzhiAnalysis, root.NT && root.NT.intent); }
})(typeof self !== 'undefined' ? self : this, function (NAME, BAZI, GA, INTENT) {
  var REFUSED = '抱歉，NT-Xhex 知识库仅限玄学与传统文化领域。';
  var GUIDE = '可以这样问我：\n· 今日宜忌 / 明天黄历\n· 八字排盘：白玖玖，女，2005年6月9日子时\n· 姓名分析：白玖玖这个名字五行怎么补\n· 干支节气：今天是什么节气 / 今日干支\n· 择日：下周结婚哪天好';

  // ---------- 话题守卫：白名单 + 排盘实体放行（非玄学输入统一拒答）----------
  var TOPIC_OK_RE = /(宜忌|黄历|择日|嫁娶|结婚|婚期|开市|入宅|安葬|出行|搬家|搬迁|动土|祈福|祭祀|八字|排盘|四柱|生辰|命盘|日主|喜用|姓名|起名|名字|取名|笔画|五格|音韵|补缺|五行|干支|六十甲子|节气|廿四|生肖|属相|冲煞|建除|吉|凶|风水|玄学|传统文化|命理|神煞|贵人|年柱|月柱|日柱|时柱|纳音|相生|相克|今天|今日|明天|后天|下周|哪天|什么时候|选日|挑日|吉时|吉方|日子)/;

  function guardTopic(input) {
    var it = INTENT.parse(input);
    return TOPIC_OK_RE.test(input) || it.intent !== 'unknown' || !!it.entities.date;
  }

  // ---------- 按意图执行对应算法 ----------
  function runIntent(it) {
    var e = it.entities;
    if (it.intent === 'unknown') return GUIDE;
    switch (it.intent) {
      case 'bazi': {
        if (!e.date || !e.date.year) return '排盘需要出生日期，请补充，例如「白玖玖，女，2005年6月9日子时」。';
        var p = BAZI.parseBazi((e.name ? e.name + '，' : '') + (e.gender === 'female' ? '女' : e.gender === 'male' ? '男' : '') +
          '，' + e.date.year + '年' + (e.date.month || 1) + '月' + (e.date.day || 1) + '日' + (e.time ? e.time.hour : 14) + '时');
        return BAZI.analyze(p);
      }
      case 'nameology':
        return NAME.analyzeName(NAME.extractName(e.name || ''));
      case 'calendar':
        if (e.keywords.some(function (k) { return INTENT.KW.jieqi.indexOf(k) >= 0; }) || (e.date && e.date._jieqi)) return GA.jieqi();
        return GA.ganzhiToday();
      case 'selection':
        return GA.zeiri();
      case 'almanac':
      default:
        return GA.huangliNow();
    }
  }

  // ---------- 唯一对外入口：输入 -> 分析文本 ----------
  function analyze(input) {
    var text = (input || '').trim();
    if (!text) return GUIDE;
    var it = INTENT.parse(text);
    if (it.error) return it.error;
    if (it.intent === 'unknown') return guardTopic(text) ? GUIDE : REFUSED;
    return runIntent(it);
  }

  // 对外仅暴露 analyze（拒答/引导文案为其内部返回值，不另设导出）
  return { analyze: analyze };
});
