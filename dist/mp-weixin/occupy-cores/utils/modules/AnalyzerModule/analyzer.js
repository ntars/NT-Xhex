/**
 * modules/AnalyzerModule/analyzer.js —— 分析引擎主入口【单一真源】（纯函数，平台无关）
 *
 * 职责：把用户输入转成可读分析。流程：意图识别（intent.js）→ 话题守卫 → 按意图调算法 → 自然语言输出。
 * 对外只有一个入口 analyze(text)：命中返回分析文本；非玄学统一拒答；无法识别返回功能引导。
 * 依赖：name-study / bazi / ganzhi-analysis / intent（全部同目录子模块），无平台 API、无网络。
 * 加载：UMD —— 小程序/uni-app 被 require；浏览器挂到全局 NT.analyzer。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./name-study.js'), require('./bazi.js'), require('./ganzhi-analysis.js'), require('./intent.js'), require('../features/registry.js'));
  else { root.NT = root.NT || {}; root.NT.analyzer = factory(root.NT && root.NT.nameStudy, root.NT && root.NT.bazi, root.NT && root.NT.ganzhiAnalysis, root.NT && root.NT.intent, root.NT && root.NT.features); }
})(typeof self !== 'undefined' ? self : this, function (NAME, BAZI, GA, INTENT, FEATURES) {
  var REFUSED = '抱歉，NT-Xhex 知识库仅限玄学与传统文化领域。';
  var GUIDE = '可以这样问我：\n· 今日宜忌 / 明天黄历\n· 八字排盘：白玖玖，女，2005年6月9日子时\n· 姓名五格：白玖玖这个名字五格怎么补\n· 干支节气：今天是什么节气 / 今日干支\n· 择日：下周结婚哪天好\n· 紫微飞星 / 易经起卦 / 八宅命卦 / 号码八星 / 数字命理 / 小六壬';

  // ---------- 话题守卫：白名单 + 排盘实体放行（非玄学输入统一拒答）----------
  var TOPIC_OK_RE = /(宜忌|黄历|择日|嫁娶|结婚|婚期|开市|入宅|安葬|出行|搬家|搬迁|动土|祈福|祭祀|八字|排盘|四柱|生辰|命盘|日主|喜用|姓名|起名|名字|取名|笔画|五格|音韵|补缺|五行|干支|六十甲子|节气|廿四|生肖|属相|冲煞|建除|吉|凶|风水|玄学|传统文化|命理|神煞|贵人|年柱|月柱|日柱|时柱|纳音|相生|相克|今天|今日|明天|后天|下周|哪天|什么时候|选日|挑日|吉时|吉方|日子)/;

  function guardTopic(input) {
    var it = INTENT.parse(input);
    return TOPIC_OK_RE.test(input) || it.intent !== 'unknown' || !!it.entities.date;
  }

  // ---------- 工资理财直连（通用小工具；公式与文案只有 registry 一份，这里只做「能不能算」的判断 + 转调）----------
  // 为什么要直连：触发词是连续匹配，而「工资12000」「月薪 1.5万」这类写法里「工资」与「理财」被数字隔开，
  //   连「工资理财」也命中不了。用「工资/月薪/薪水/月收入 + 数字」直接识别更贴近真人输入。
  function trySalary(text) {
    if (!FEATURES || !FEATURES.run) return '';
    if (!/(工资|月薪|薪水|月收入)/.test(text)) return '';
    var out = FEATURES.run('salary-plan', null, text);
    return out && out.text ? out.text : '';
  }

  // ---------- 扩展功能（搜索框单一入口的长尾路由）：命中触发词才跑 ----------
  // 触发词是「明确的玄学功能词」（紫微/易经/八宅/号码八星/数字命理/小六壬/五格/生克…），
  // 比 intent 的贪婪实体分类更具体 → 一律**先于** intent 判定，避免「紫微 2026」被误判成八字。
  // v3.1.23：由「只取一个」改为**多命中**——一个输入命中多个功能时，**按常用性顺序依次调用、并列输出**
  //   （用户明确要求：一条信息不必只出一种结果）。顺序 = registry.matchAll 的常用序（大众化在前）。
  //   上限 MAX_FEAT：同段命中过多时只保留最常用的前几个，避免刷屏（常用性即 matchAll 的排序）。
  var MAX_FEAT = 5;
  function dispatchFeatures(text, ent) {
    if (!FEATURES || !FEATURES.matchAll) return [];
    var hits = FEATURES.matchAll(text);
    var parts = [];
    for (var i = 0; i < hits.length && parts.length < MAX_FEAT; i++) {
      var out = FEATURES.run(hits[i].key, ent, text);
      var t = out ? (out.text || out.prompt || '') : '';
      if (!t) continue;
      // 并列输出时每条都要有可辨识的标题：本身以【…】开头的直接用，否则补【短名】（如缺性别的提示）
      if (hits.length > 1 && t.indexOf('【') !== 0) t = '【' + hits[i].短名 + '】' + t;
      parts.push(t);
    }
    return parts;
  }

  // ---------- 按意图执行对应算法（核心 5 意图）----------
  function runIntent(it) {
    var e = it.entities;
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
    // ① 长尾功能触发词优先（搜索框单一入口；触发词明确，先于 intent 贪婪分类）
    //    多命中时**按常用性顺序依次调用、并列输出**（各自带【标题】，结果页按标题分段展示）。
    var feats = dispatchFeatures(text, it.entities);
    // ①-b 工资理财直连（用户点名的**通用小工具**，不属于玄学内核，故不靠连续触发词命中）：
    //      「工资12000」「工资 12000 怎么理财」「月薪1.5万」等「工资/月薪 + 金额」的各种写法
    //      只要带得出金额就算，不误拦也不污染话题守卫（玄学白名单里没有工资类词）。
    if (!feats.length) {
      var sal = trySalary(text);
      if (sal) feats = [sal];
    }
    if (feats.length) {
      if (feats.length === 1) return feats[0];      // 单命中：行为与旧版完全一致
      // 多算法同页：用换行分隔，各算法自带【标题】；不引入中文分号（结果页按 [。；\n] 切段）
      return feats.join('\n');
    }
    // ② 核心 5 意图
    if (it.intent === 'unknown') return guardTopic(text) ? GUIDE : REFUSED;
    return runIntent(it);
  }

  // 对外仅暴露 analyze（拒答/引导文案为其内部返回值，不另设导出）
  return { analyze: analyze };
});
