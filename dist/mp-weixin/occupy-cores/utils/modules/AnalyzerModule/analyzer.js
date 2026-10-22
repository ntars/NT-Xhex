/**
 * modules/AnalyzerModule/analyzer.js —— 分析引擎主入口【单一真源】（纯函数，平台无关）
 *
 * 职责：把用户输入转成可读分析。流程：意图识别（intent.js）→ 话题守卫 → 按意图调算法 / 转调功能块 → 自然语言输出。
 * 对外只有一个入口 analyze(text)：命中返回分析文本；非玄学统一拒答；无法识别返回功能引导。
 * 依赖：bazi / ganzhi-analysis / intent / features（全部同目录子模块或 features 目录），无平台 API、无网络。
 * 加载：UMD —— 小程序/uni-app 被 require；浏览器挂到全局 NT.analyzer。
 *
 * v3.2.0：服务九类（八字命理 / 紫微斗数 / 六爻纳甲 / 奇门遁甲 / 大六壬 / 梅花易数 / 风水堪舆 /
 *   解梦灵签 / 黄历·万年历）。其中黄历（今日宜忌、建除黄道、彭祖百忌、冲煞）与万年历（公历农历换算、
 *   节气干支、择日）按用户要求保留，对应 almanac / selection / calendar 三个核心意图。
 *   已归档领域（小术、数字命理、号码八星、姓名五格、测字、占星天文、太乙、金口诀、工资理财…）
 *   对应的关键词、直连函数与执行分支一并移除。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./bazi.js'), require('./ganzhi-analysis.js'), require('./intent.js'), require('../features/registry.js'));
  else { root.NT = root.NT || {}; root.NT.analyzer = factory(root.NT && root.NT.bazi, root.NT && root.NT.ganzhiAnalysis, root.NT && root.NT.intent, root.NT && root.NT.features); }
})(typeof self !== 'undefined' ? self : this, function (BAZI, GA, INTENT, FEATURES) {
  var REFUSED = '抱歉，NT-Xhex 知识库仅限玄学与传统文化领域。';
  var GUIDE = '可以这样问我：\n· 八字排盘：白玖玖，女，2005年6月9日子时\n· 紫微斗数 / 大运流年\n· 六爻起卦 / 梅花易数 / 易经卦象\n· 奇门遁甲 / 大六壬\n· 八宅风水 / 九宫飞星 / 户型缺角\n· 灵签解梦：抽一签 / 梦见…\n· 黄历万年历：今日宜忌 / 明天黄历 / 下周结婚哪天好\n· 干支节气：今天什么日子 / 今年什么年';

  // ---------- 已归档领域（v3.2.0）：明确点名已移除的算法时给出如实说明，不再错路由到保留功能 ----------
  var ARCHIVED_RE = /(太乙|金口诀|小六壬|一掌经|马前课|节律|数字命理|号码八星|五格|姓名学|取名|改名|测名|测字|笔画|塔罗|占星|星盘|宫位|阿拉伯点|卜卦|择时|返照|中点盘|工资|月薪|薪水|理财|雷诺曼|如尼)/;
  var ARCHIVED_HINT = '该功能已在 v3.2.0 精简中归档，本版不再提供。\n本版保留九类：八字命理 / 紫微斗数 / 六爻纳甲 / 奇门遁甲 / 大六壬 / 梅花易数 / 风水堪舆 / 解梦灵签 / 黄历·万年历。\n\n' + GUIDE;

  // ---------- 话题守卫：白名单 + 排盘实体放行（非玄学输入统一拒答）----------
  // v3.2.0：黄历/万年历/择日按用户要求保留，白名单含宜忌/黄历/择日/婚娶/动土/冲煞/建除/农历换算等；
  //   已归档的「姓名/数字/号码/占星/太乙/金口诀/相术/测字」等词不进白名单，避免误放行后错路由。
  var TOPIC_OK_RE = /(八字|排盘|四柱|生辰|命盘|日主|喜用|五行|干支|六十甲子|节气|廿四|生肖|属相|风水|玄学|传统文化|命理|神煞|贵人|年柱|月柱|日柱|时柱|纳音|相生|相克|今天|今日|明天|后天|下周|哪天|什么时候|日子|紫微|斗数|六爻|纳甲|梅花|易经|周易|卦|奇门|遁甲|六壬|灵签|解梦|签|梦|宜忌|黄历|老黄历|通胜|择日|择吉|吉日|吉时|吉方|选日|挑日|建除|彭祖|冲煞|嫁娶|结婚|婚期|开市|开业|入宅|安葬|动土|祈福|祭祀|出行|搬家|搬迁|农历|阳历|公历|万年历|日期换算|换算|儒略日)/;

  function guardTopic(input) {
    var it = INTENT.parse(input);
    return TOPIC_OK_RE.test(input) || it.intent !== 'unknown' || !!it.entities.date;
  }

  // ---------- 扩展功能（搜索框单一入口的长尾路由）：命中触发词才跑 ----------
  // 触发词是「明确的玄学功能词」（紫微/易经/八宅/六爻/奇门/飞星…），
  // 比 intent 的贪婪实体分类更具体 → 一律**先于** intent 判定，避免「紫微 2026」被误判成八字。
  // v3.1.23：由「只取一个」改为**多命中**——一个输入命中多个功能时，**按常用性顺序依次调用、并列输出**
  //   （用户明确要求：一条信息不必只出一种结果）。顺序 = registry.matchAll 的常用序（大众化在前）。
  //   上限 MAX_FEAT：同段命中过多时只保留最常用的前几个，避免刷屏（常用性即 matchAll 的排序）。
  var MAX_FEAT = 5;
  // 最近一次 analyze 命中的功能块数（供壳层判断是否按【标题】切小节展示）
  var _lastFeatCount = 1;
  function lastHits() { return _lastFeatCount; }
  function dispatchFeatures(text, ent) {
    if (!FEATURES || !FEATURES.matchAll) return [];
    var hits = FEATURES.matchAll(text);
    _lastFeatCount = hits.length || 1;
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

  // ---------- 按意图执行对应算法（核心 4 意图：bazi / calendar / selection / almanac）----------
  // calendar=干支节气（万年历底座）；almanac=黄历宜忌（今日黄历）；selection=择日（主动择吉）。
  function runIntent(it) {
    var e = it.entities;
    switch (it.intent) {
      case 'bazi': {
        if (!e.date || !e.date.year || !e.date.month || !e.date.day) return '排盘需要完整的出生年月日，请补充，例如「白玖玖，女，2005年6月9日子时」。';
        var p = BAZI.parseBazi((e.name ? e.name + '，' : '') + (e.gender === 'female' ? '女' : e.gender === 'male' ? '男' : '') +
          '，' + e.date.year + '年' + (e.date.month || 1) + '月' + (e.date.day || 1) + '日' + (e.time ? e.time.hour : 14) + '时');
        return BAZI.analyze(p);
      }
      case 'calendar':
        if (e.keywords.some(function (k) { return INTENT.KW.jieqi.indexOf(k) >= 0; }) || (e.date && e.date._jieqi)) return GA.jieqi();
        return GA.ganzhiToday();
      case 'selection': {
        // 择日：有事项/日期时走 registry 的择日块（逐日评分排序）；否则给近七日择吉建议
        if (FEATURES && FEATURES.run) {
          var zo = FEATURES.run('zeri', e, '');
          if (zo && (zo.text || zo.prompt)) return zo.text || zo.prompt;
        }
        return GA.zeiri();
      }
      case 'almanac': {
        // 黄历/万年历：指定了日期就走 registry 的黄历块（可查任意日），否则出今日黄历
        if (e && e.date && e.date.year && FEATURES && FEATURES.run) {
          var ho = FEATURES.run('huangli', e, '');
          if (ho && ho.text) return ho.text;
        }
        return GA.huangliNow();
      }
      default:
        return GUIDE;
    }
  }

  // ---------- 只接受生辰（任务清单第 10 条）----------
  // v3.2.1：所有排盘解盘只认生辰。判定顺序在 analyze() 里：
  //   ① 功能块触发词 —— 仍走原路（31 块各自有明确的短名/触发词，是「问一句」的查询）；
  //   ② 黄历/万年历/择日查询词 —— 保留（任务清单第 1 条：黄历、万年历相关需要保留）。
  //      这些查询天然是「问今天/问某日」，不依赖出生生辰，且 huangli/zeri/date-convert
  //      三个功能块的触发词已覆盖同样口径，此处是**非触发词问法**（如单说「宜忌」）的兜底；
  //   ③ 其余（含纯「算命」「测运势」这类没给生辰的排盘请求）→ 一律回生辰引导。
  //   ⚠️ 不把「有完整日期」当放行条件：那会让「2026年10月22日」这类查询日被当成生辰放行，
  //     而它其实该走黄历（已由 ② 的查询词表覆盖）或引导（不在查询词表里）。
  var BIRTH_HINT = '请输入出生生辰，例如「白玖玖，女，2005年6月9日子时」。\n本版所有排盘与解盘都只认生辰：姓名、性别、出生年月日（带时辰更准）。';
  // 黄历/万年历/择日的「查询型」问法（不带生辰也能答，按用户要求保留）
  // 与 intent.js 的 KW.almanac / KW.select / KW.jieqi / KW.ganzhi 同口径，另收「换/换算」等同义说法。
  var QUERY_RE = /(黄历|老黄历|通胜|宜忌|吉凶|择日|择吉|选日|挑日|吉日|吉时|吉方|建除|彭祖|冲煞|嫁娶|结婚|婚期|开市|开业|开张|动土|入宅|安葬|修坟|出行|搬家|搬迁|祈福|祭祀|农历|阴历|阳历|公历|万年历|换算|儒略日|节气|立春|雨水|惊蛰|春分|清明|谷雨|立夏|小满|芒种|夏至|小暑|大暑|立秋|处暑|白露|秋分|寒露|霜降|立冬|小雪|大雪|冬至|小寒|大寒|干支|生肖|属相|六十甲子|什么日|什么日子|今天|今日|明天|明日|后天|大后天|昨天|昨日|前天|下周|下个月|下星期|哪天|什么时候)/;
  // 有出生年月日（三者俱全）才算「给了生辰」
  function hasBirth(e) {
    var d = e && e.date;
    return !!(d && d.year && d.month && d.day);
  }
  // 是「黄历/万年历/择日」查询问法（不带生辰也能答）
  function isQuery(text) {
    return QUERY_RE.test(text);
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
    if (feats.length) {
      if (feats.length === 1) { _lastFeatCount = 1; return feats[0]; }  // 单命中：行为与旧版完全一致
      // 多算法同页：用换行分隔，各算法自带【标题】；不引入中文分号（结果页按 [。；\n] 切段）
      return feats.join('\n');
    }
    // 未命中任何功能块 → 回落核心意图，此时不是多算法并列
    _lastFeatCount = 1;
    // ①-b 已归档领域：明确点名了本版不再提供的能力 → 如实说明（不再错路由到八字等保留功能）
    if (ARCHIVED_RE.test(text)) return ARCHIVED_HINT;
    // ①-c 只接受生辰：没有出生年月日、且不是黄历/万年历/择日查询 → 引导补生辰
    //     （不再把「算命」「测运势」这类空请求跑成 GUIDE，也不把查询词问法错路由到八字）。
    //    顺序在话题守卫**之前**，所以非玄学词（天气/外卖/股票…）也先拿到拒答，不会被引导盖掉。
    if (!hasBirth(it.entities) && !isQuery(text)) {
      return it._nonMeta ? REFUSED : BIRTH_HINT;
    }
    // ①-d 非玄学词直拒（有查询词但本质不是术数问题，如「今天天气」含「今天」）
    if (it._nonMeta) return REFUSED;
    // ② 核心意图
    if (it.intent === 'unknown') return guardTopic(text) ? GUIDE : REFUSED;
    return runIntent(it);
  }

  // 对外仅暴露 analyze（拒答/引导文案为其内部返回值，不另设导出）
  // lastHits() 供壳层判断「本次是否多算法并列」，决定结果页是否按【标题】切小节
  return { analyze: analyze, lastHits: lastHits };
});
