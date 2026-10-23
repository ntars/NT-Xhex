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
 *   节气干支）按用户要求保留，对应 almanac / calendar 两个核心意图。
 * v3.3.0：随「查吉日」移除，selection（主动择日）意图整个删除；择日类问法改由下方
 *   ARCHIVED_RE 给出「已移除」的如实说明，不再假装能择吉。
 *   已归档领域（小术、数字命理、号码八星、姓名五格、测字、占星天文、太乙、金口诀、工资理财…）
 *   对应的关键词、直连函数与执行分支一并移除。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./bazi.js'), require('./ganzhi-analysis.js'), require('./intent.js'), require('../features/registry.js'), require('./full-chart.js'));
  else { root.NT = root.NT || {}; root.NT.analyzer = factory(root.NT && root.NT.bazi, root.NT && root.NT.ganzhiAnalysis, root.NT && root.NT.intent, root.NT && root.NT.features, root.NT && root.NT.fullChart); }
})(typeof self !== 'undefined' ? self : this, function (BAZI, GA, INTENT, FEATURES, FULL) {
  var REFUSED = '抱歉，NT-Xhex 知识库仅限玄学与传统文化领域。';
  var GUIDE = '可以这样问我：\n· 八字排盘：白玖玖，女，2005年6月9日子时\n· 紫微斗数 / 大运流年\n· 六爻占卜 / 梅花易数\n· 奇门遁甲 / 大六壬\n· 八宅风水 / 九宫飞星 / 户型缺角\n· 灵签解梦：抽一签 / 梦见…\n· 黄历万年历：今日宜忌 / 明天黄历 / 下周哪天是初几\n· 干支节气：今天什么日子 / 今年什么年';

  // ---------- 已归档领域（v3.2.0）：明确点名已移除的算法时给出如实说明，不再错路由到保留功能 ----------
  var ARCHIVED_RE = /(太乙|金口诀|小六壬|一掌经|马前课|节律|数字命理|数字八字|号码八星|五格|姓名学|取名|改名|测名|测字|笔画|塔罗|占星|星盘|宫位|阿拉伯点|卜卦|择时|返照|中点盘|工资|月薪|薪水|理财|雷诺曼|如尼|择日|择吉|选日子|选个好日子|挑日子|挑个好日子|黄道吉日|吉日|吉时|小成图|卦辞|爻辞|查卦)/;
  var ARCHIVED_HINT = '该功能已移除，本版不再提供。\n本版保留：八字命理 / 紫微斗数 / 六爻占卜 / 奇门遁甲 / 大六壬 / 梅花易数 / 风水堪舆 / 解梦灵签 / 黄历·万年历（共 5 大板块 26 项）。\n\n' + GUIDE;

  // ---------- 话题守卫：白名单 + 排盘实体放行（非玄学输入统一拒答）----------
  // v3.2.0：黄历/万年历按用户要求保留，白名单含宜忌/黄历/婚娶/动土/冲煞/建除/农历换算等；
  // v3.3.0：择日词仍留在白名单里（属玄学话题、不该被拒答），但会命中 ARCHIVED_RE 给出「已移除」说明。
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
  // 最近一次 analyze 是否被「不是生辰」拦下（供壳层弹窗而不是跳结果页）
  //   'birth'   = 没有出生信息、也不是黄历/万年历查询 → 弹「请输入农历、国历、四柱、八字」
  //   'lunar'   = 农历日期不存在（如没闰那年的「闰四月」）
  //   'pillar'  = 四柱查不到日期
  //   'nonmeta' = 非玄学话题 → 弹拒答
  //   null      = 正常出结果
  var _lastReject = null;
  function lastReject() { return _lastReject; }
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

  // ---------- 按意图执行对应算法（核心 3 意图：bazi / calendar / almanac）----------
  // calendar=干支节气（万年历底座）；almanac=黄历宜忌（今日黄历）；bazi=八字排盘。
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

  // ---------- v3.2.2 生辰四形式换算层（农历 → 公历、四柱 → 公历）----------
  //   为什么放在 analyzer 而不在 intent：intent.js 是**零依赖纯函数**（只做字符串识别），
  //   历法换算必须走 CoreModule/lunar.js（内含 solarlunar 底座）。analyzer 与其同在
  //   occupy-cores 分包，require 不违反「主包不引用分包」护栏。
  var LUNAR_CORE = null;
  function lunarCore() {
    if (LUNAR_CORE !== undefined && LUNAR_CORE !== null) return LUNAR_CORE;
    try { LUNAR_CORE = require('../CoreModule/lunar.js'); }
    catch (e1) {
      try { LUNAR_CORE = (typeof root !== 'undefined' && root.NT && root.NT.core && root.NT.core.lunar) || null; }
      catch (e2) { LUNAR_CORE = null; }
    }
    return LUNAR_CORE;
  }

  /**
   * 把实体里的农历日期换算成公历，直接改 e.date（改成 isLunar:false 的公历实体）。
   *
   * 为什么必须做：v3.2.1 之前 `isLunar` 只在 intent 层打了标记，**全仓没有任何一处换算**，
   *   于是「农历2005年5月3日」被当公历 2005-05-03 直接排盘，四柱全错。
   * 闰月：农历闰月用负月份表示（solarlunar 约定），故传 -month。
   */
  function normalizeLunar(e) {
    var d = e && e.date;
    if (!d || !d.isLunar || !d.year || !d.month || !d.day) return;
    var LC = lunarCore();
    if (!LC || !LC.fromLunar) return;
    try {
      var o = LC.fromLunar(d.year, d.month, d.day, !!d._lunarLeap, e.time ? e.time.hour : 0, e.time ? e.time.minute : 0, 0);
      if (!o || !o.solar) return;
      // ⚠️ CoreModule/lunar.js 的 solar 字段是短键 { y, m, d, h, i, s, text, cn }（不是 year/month/day），
      //    v3.2.2 首次接入时踩过：写成 o.solar.year → undefined → 整条闸门判不出生辰。
      e.date = {
        year: o.solar.y, month: o.solar.m, day: o.solar.d,
        isLunar: false, rawText: d.rawText,
        _fromLunar: { year: d.year, month: d.month, day: d.day, leap: !!d._lunarLeap }
      };
    } catch (err) {
      // 农历日期不存在（如「闰四月」但那一年没闰四月）→ 标记出来，交给闸门提示，绝不静默算错
      e.date = null;
      e._lunarBad = d.rawText || true;
    }
  }

  /**
   * 把四柱（干支）反查成公历日期，写到 e.date；同时把时柱换算成 e.time.hour。
   *
   * 为什么这样反查：底座 solarlunar.js:551 的 Solar.fromBaZi 只接受**完整四柱**，
   *   timeGanZhi 传 null 会 TypeError（读 undefined.substring）。
   *   而实测「年柱+月柱+日柱」已能唯一定位到「某 60 年一轮回」的日期，
   *   时柱只影响筛选小时，不影响返回的日期集合 —— 所以缺时柱时用五鼠遁补一个合法时柱即可。
   * 候选取舍：同一组四柱每 60 年重复一次（实测「乙酉 壬午 甲子 甲子」→ 1945-06-24 与 2005-06-09）。
   *   ① 用户若在句子里给了年份线索（如「2005年的乙酉…」），取最接近那个年份的候选；
   *   ② 否则取**最近的一个**候选（离今天最近，符合「问自己的生辰」习惯）；
   *   ③ 全程只返回一个，不并列（排盘只能按一个生辰算）。
   */
  var _pillarCand = null;    // 上一次四柱反查的候选（供提示「若不对请补年份」）
  function normalizePillars(e, text) {
    var pl = e && e._pillars;
    if (!pl || pl.length < 3) return;
    var LC = lunarCore();
    var Solar = LC && LC._SL && LC._SL.Solar;
    if (!Solar || !Solar.fromBaZi) return;

    var yearGZ = pl[0], monthGZ = pl[1], dayGZ = pl[2];
    var timeGZ = pl[3] || null;
    // 缺时柱：用五鼠遁从日干推子时天干，补一个合法时柱（只为绕过 fromBaZi 的 null 崩溃，不影响返回日期）
    if (!timeGZ) {
      var GAN = '甲乙丙丁戊己庚辛壬癸';
      var ziGanMap = { '甲': '甲', '己': '甲', '乙': '丙', '庚': '丙', '丙': '戊', '辛': '戊', '丁': '庚', '壬': '庚', '戊': '壬', '癸': '壬' };
      timeGZ = (ziGanMap[dayGZ.charAt(0)] || '甲') + '子';
    }
    var list;
    try { list = Solar.fromBaZi(yearGZ, monthGZ, dayGZ, timeGZ, 2, 1900); }
    catch (err) { e._pillarBad = true; return; }
    if (!list || !list.length) { e._pillarBad = true; return; }

    // 年份线索：句子里出现的 1900-2100 四位数（如「2005年的乙酉年…」）
    var hint = null;
    var ym = String(text || '').match(/((?:1[9]|20)[0-9]{2})\s*年/);
    if (ym) hint = +ym[1];

    var pick = list[0];
    if (hint) {
      var best = Infinity;
      for (var i = 0; i < list.length; i++) {
        var gap = Math.abs(list[i].getYear() - hint);
        if (gap < best) { best = gap; pick = list[i]; }
      }
    } else if (list.length > 1) {
      // 取离今天最近的一个
      var today = new Date().getTime();
      var bestGap = Infinity;
      for (var j = 0; j < list.length; j++) {
        var g = Math.abs(new Date(list[j].getYear(), list[j].getMonth() - 1, list[j].getDay()).getTime() - today);
        if (g < bestGap) { bestGap = g; pick = list[j]; }
      }
    }
    e.date = {
      year: pick.getYear(), month: pick.getMonth(), day: pick.getDay(),
      isLunar: false, rawText: yearGZ + ' ' + monthGZ + ' ' + dayGZ + (pl[3] ? ' ' + pl[3] : ''),
      _fromPillars: { pillars: pl.slice(0, 4), candidates: list.map(function (s) { return s.getYear() + '-' + s.getMonth() + '-' + s.getDay(); }) }
    };
    _pillarCand = e.date._fromPillars.candidates;
    // 时柱出来就是小时：子=0、丑=2 …（每柱 2 小时起步），分钟记 0
    if (pl[3]) {
      var ZHI = '子丑寅卯辰巳午未申酉戌亥';
      var zi = ZHI.indexOf(pl[3].charAt(1));
      if (zi >= 0) e.time = { hour: zi * 2, minute: 0, rawText: pl[3] };
    }
    // 四柱里没有姓名/性别：性别仍需用户给（男/女决定大运顺逆），这里不编造。
  }

  // ---------- 只接受生辰（任务清单第 10 条 + v3.2.2 四形式）----------
  // v3.2.1：所有排盘解盘只认生辰。v3.2.2 起明确「生辰」的四种合法写法：
  //   ① 国历（公历）：2005年6月9日 / 2005-06-09 / 2005.6.9
  //   ② 农历：农历2005年五月初三 / 二〇〇五年五月初三 / 腊月廿三 / 闰四月初三
  //   ③ 四柱（干支）：乙酉 壬午 甲子 甲子 / 乙酉年壬午月甲子日甲子时
  //   ④ 八字（四柱的口语说法，同上，句中带「八字/四柱」也算）
  // 其余输入一律弹窗提醒（不跳二级页）。
  var BIRTH_HINT = '请输入农历、国历、四柱、八字。\n例如：农历二〇〇五年五月初三 / 2005年6月9日 / 乙酉 壬午 甲子 甲子。';

  // 黄历/万年历的「查询型」问法（不带生辰也能答，按用户要求保留）
  // 与 intent.js 的 KW.almanac / KW.jieqi / KW.ganzhi 同口径，另收「换/换算」等同义说法。
  // v3.3.0：择日专用词（择日/择吉/选日/挑日/吉日/吉时/吉方）已从这里移出 —— 它们不再代表
  //   「能算」的能力，改由 ARCHIVED_RE 给「该功能已移除」的如实说明。
  var QUERY_RE = /(黄历|老黄历|通胜|宜忌|吉凶|建除|彭祖|冲煞|嫁娶|结婚|婚期|开市|开业|开张|动土|入宅|安葬|修坟|出行|搬家|搬迁|祈福|祭祀|农历|阴历|阳历|公历|万年历|换算|儒略日|节气|立春|雨水|惊蛰|春分|清明|谷雨|立夏|小满|芒种|夏至|小暑|大暑|立秋|处暑|白露|秋分|寒露|霜降|立冬|小雪|大雪|冬至|小寒|大寒|干支|生肖|属相|六十甲子|什么日|什么日子|今天|今日|明天|明日|后天|大后天|昨天|昨日|前天|下周|下个月|下星期|哪天|什么时候)/;
  // 有出生年月日（三者俱全）才算「给了生辰」
  function hasBirth(e) {
    var d = e && e.date;
    return !!(d && d.year && d.month && d.day);
  }

  /**
   * 是「排盘用的出生信息」而非「查询某个日期」。
   *
   * 为什么不能只看 hasBirth：「今天宜忌」这类相对日期也会解析出 year/month/day，
   *   若直接拿 hasBirth 判全套，会把一句黄历查询铺成 24 块 1.4 万字。
   * 判定三个条件同时成立：
   *   ① 年月日俱全；
   *   ② 不是相对日期（intent 会给「今天/明天/下个月」打 _relative=true）；
   *   ③ 给了排盘必需的身份信息之一：姓名 / 性别 / 时辰 ——
   *      四柱缺时柱排不全，用户真要排盘一定会带时辰或至少带性别。
   */
  function isBirthChart(e) {
    if (!hasBirth(e)) return false;
    if (e.date._relative) return false;
    return !!(e.name || e.gender || e.time);
  }
  // 是「黄历/万年历/择日」查询问法（不带生辰也能答）
  function isQuery(text) {
    return QUERY_RE.test(text);
  }

  // ---------- v3.2.2：区分「点名算法」与「只是说了日期单位」----------
  //   生辰句里必然出现「农历 / 公历 / 阴历 / 阳历」这类**日期单位词**，而 date-convert 的触发词
  //   恰好含它们 → 「农历二〇〇五年五月初三 子时 女」会被误判成「查农历」单块，只出一条日期换算。
  //   这里给出判据：**当且仅当本次命中的每个触发词都只是日期单位泛词**时返回 true，
  //   由 analyze() 跳过触发词分支、让完整生辰落到全套排盘。
  //   ⚠️ 不把「查农历 / 日期换算 / 换算 / 儒略日」放进泛词表 —— 那些是用户明确点名要换算。
  var GENERIC_DATE_WORDS = {
    '农历': 1, '阴历': 1, '阳历': 1, '公历': 1, '旧历': 1, '夏历': 1
  };
  function onlyGenericDateHits(text) {
    if (!FEATURES || !FEATURES.matchAll) return false;
    var hits = FEATURES.matchAll(text);
    if (!hits.length) return false;
    for (var i = 0; i < hits.length; i++) {
      var keys = hits[i].命中词;
      // 一个块可能命中多个词（用 / 或 、 连接），任一非泛词即算「点名」
      var words = String(keys || '').split(/[\/、,，\s]+/);
      var allGeneric = true;
      for (var j = 0; j < words.length; j++) {
        if (!words[j]) continue;
        if (!GENERIC_DATE_WORDS[words[j]]) { allGeneric = false; break; }
      }
      if (!allGeneric) return false;
    }
    return true;
  }

  // ---------- 唯一对外入口：输入 -> 分析文本 ----------
  function analyze(input) {
    var text = (input || '').trim();
    // 每次调用先清掉上一次的全套结果：否则「先问生辰（铺全套）→ 再问紫微（单块）」
    // 时壳层仍会拿到 stale 的 sections，把单块结果按八大类壳子渲染。
    _lastFull = null;
    _lastFeatCount = 1;
    _lastReject = null;
    if (!text) return GUIDE;
    // ①-a 已移除领域（v3.2.0 归档 + v3.3.0 再裁）：用户明确点名了本版不再提供的算法 →
    //     一律如实说明，不假装能算。放在最前面是因为这类词常与日期同现，会先被判成
    //     「八字排盘」而拿不到说明（例：「数字八字 2005年6月9日」）。
    if (ARCHIVED_RE.test(text)) { _lastFeatCount = 1; return ARCHIVED_HINT; }
    var it = INTENT.parse(text);
    if (it.error) return it.error;

    // ⓪ v3.2.2 四形式归一：农历 / 四柱 → 公历，统一成 e.date 的年月日。
    //    放在所有分支之前，这样后面的功能块（31 块都读 ent.date）拿到的一定是公历，
    //    「农历五月初三」不会再被当公历 5-3 排盘。
    _pillarCand = null;
    if (it.entities) {
      if (it.entities._pillars && it.entities._pillars.length >= 3) normalizePillars(it.entities, text);
      else normalizeLunar(it.entities);
      // 农历日期在实际历法里不存在（如「闰四月」但那年没闰四月）→ 明确告知，不静默算错
      if (it.entities._lunarBad) {
        _lastReject = 'lunar';
        return '这个农历日期不存在（' + String(it.entities._lunarBad).trim() + '），请检查闰月与日期后重新输入。\n' + BIRTH_HINT;
      }
      if (it.entities._pillarBad) {
        _lastReject = 'pillar';
        return '这组四柱查不到对应日期，请检查干支是否正确（年柱、月柱、日柱、时柱各两个字）。\n' + BIRTH_HINT;
      }
    }

    // ① 长尾功能触发词优先（搜索框单一入口；触发词明确，先于 intent 贪婪分类）
    //    用户点名了某个算法 → 只跑那个（或那几个），不铺全套。
    //    多命中时**按常用性顺序依次调用、并列输出**（各自带【标题】，结果页按标题分段展示）。
    //
    //    ⚠️ v3.2.2 特例：生辰句里天然带「农历 / 公历 / 阴历 / 阳历」这类**日期单位词**，
    //    而它们是 date-convert 的触发词 → 「农历二〇〇五年五月初三 子时 女」会被误当成
    //    「查农历」单块。故当日志句本身是完整生辰、且命中的全部是这类泛词时，跳过触发词分支，
    //    让它落到 ② 的全套排盘。（「查农历 2026年8月15日」这种真查询不含生辰要素，不受影响。）
    var feats = dispatchFeatures(text, it.entities);
    if (feats.length && isBirthChart(it.entities) && onlyGenericDateHits(text)) {
      feats = [];          // 命中词只是日期单位词 → 不当作「点名算法」
    }
    if (feats.length) {
      if (feats.length === 1) { _lastFeatCount = 1; return feats[0]; }  // 单命中：行为与旧版完全一致
      // 多算法同页：用换行分隔，各算法自带【标题】；不引入中文分号（结果页按 [。；\n] 切段）
      return feats.join('\n');
    }
    // 未命中任何功能块 → 回落核心意图，此时不是多算法并列
    _lastFeatCount = 1;
    // ①-c 只接受生辰：没有出生年月日、且不是黄历/万年历查询 → 引导补生辰
    //     （不再把「算命」「测运势」这类空请求跑成 GUIDE，也不把查询词问法错路由到八字）。
    //    顺序在话题守卫**之前**，所以非玄学词（天气/外卖/股票…）也先拿到拒答，不会被引导盖掉。
    if (!hasBirth(it.entities) && !isQuery(text)) {
      // v3.2.2：非玄学词（天气/外卖/股票…）仍走拒答；其余一律是「生辰四形式」提醒，
      //   由壳层拦下并弹窗（不跳二级页），analyze 只负责给出这句标准文案。
      _lastReject = it._nonMeta ? 'nonmeta' : 'birth';
      return it._nonMeta ? REFUSED : BIRTH_HINT;
    }
    // ①-d 非玄学词直拒（有查询词但本质不是术数问题，如「今天天气」含「今天」）
    if (it._nonMeta) { _lastReject = 'nonmeta'; return REFUSED; }

    // ② 全套排盘（用户要求）：给的是完整生辰、且没点名具体算法 → 八类算法全跑、按固定顺序并列。
    //    判定要严于 hasBirth —— 只给一个日期不算「给生辰」：
    //      · 「今天宜忌」也解析出 date(year/month/day)，但它 _relative=true，是查询不是生辰；
    //      · 真正给生辰的人一定至少给了其中之一：姓名 / 性别 / 时辰（四柱必须有时柱才排得动）。
    //    所以条件是：年月日俱全 + 非相对日期 + 有（姓名 或 性别 或 时辰）。
    if (isBirthChart(it.entities) && FULL && FULL.runAll) {
      var full = FULL.runAll(it.entities, text);
      if (full && full.count > 1) {
        _lastFeatCount = full.count;
        _lastFull = full;          // 供壳层取 sections 分组渲染
        return full.text;
      }
    }

    // ③ 核心意图
    if (it.intent === 'unknown') return guardTopic(text) ? GUIDE : REFUSED;
    return runIntent(it);
  }

  // 对外仅暴露 analyze（拒答/引导文案为其内部返回值，不另设导出）
  // lastHits() 供壳层判断「本次是否多算法并列」，决定结果页是否按【标题】切小节
  // lastSections() 供壳层取全套排盘的八大类分组（无则返回 null，壳层退回按【标题】切）
  var _lastFull = null;
  function lastSections() { return _lastFull ? _lastFull.sections : null; }
  return { analyze: analyze, lastHits: lastHits, lastSections: lastSections, lastReject: lastReject };
});
