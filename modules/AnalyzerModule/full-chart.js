/**
 * modules/AnalyzerModule/full-chart.js —— 全套排盘（给一次生辰，把八类算法全部跑出来）
 *
 * 用户要求（任务清单补充）：
 *   提供生辰八字 → 自动调取算法计算 → 显示所有算法提供的结果 →
 *   展示顺序固定为：万年历黄历 / 八字命理 / 紫微斗数 / 六爻占卜 / 奇门遁甲（含大六壬）/
 *   梅花易数 / 风水堪舆 / 解梦。
 *
 * 为什么要单独一个模块（而不是塞回 analyzer.js）：
 *   ① 「八大类 → 31 个功能块」的分组与顺序是**用户规定的展示口径**，属数据不是逻辑，
 *      单独一张表才改得动、测得准；analyzer.js 只管「什么时候该跑全套」。
 *   ② 触发词路由（registry.matchAll）回答的是「用户点名了哪个算法」；
 *      本模块回答的是「用户没点名、只给了生辰，那该全跑」。两件事不能混。
 *
 * 依赖：features/registry.js（跑块）。无平台 API、无网络、无 DOM。
 * 加载：UMD —— 小程序/uni-app 被 require；浏览器挂到全局 NT.fullChart。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../features/registry.js'));
  else { root.NT = root.NT || {}; root.NT.fullChart = factory(root.NT && root.NT.features); }
})(typeof self !== 'undefined' ? self : this, function (FEATURES) {

  /**
   * 八大类分组（顺序即展示顺序，不可随意调换 —— 用户逐字指定）。
   *
   * keys 是该类下要跑的功能块 key，顺序也有讲究：
   *   · 同一类内先排盘、后解盘（先出盘面再出断语），符合读盘习惯；
   *   · 奇门一栏把大六壬并进来 —— 用户原话「奇门遁甲（大六壬）」是同一类，
   *     三式（奇门/六壬/太乙）里太乙已归档，剩下的奇门与六壬都属「式盘」范畴。
   *   · 解梦（qianwen）虽归「相术占验」板块，但用户把它列为第八类，故独立成类。
   */
  var SECTIONS = [
    {
      名: '万年历黄历',
      简称: '黄历',
      keys: ['huangli', 'date-convert']
    },
    {
      名: '八字命理',
      简称: '八字',
      keys: ['bazi-chart', 'dayun', 'bazi-pattern', 'bazi-shensha', 'bazi-hehun']
    },
    {
      名: '紫微斗数',
      简称: '紫微',
      keys: ['ziwei', 'ziwei-sihua']
    },
    {
      名: '六爻占卜',
      简称: '六爻',
      keys: ['liuyao', 'liuyao-wangshuai']
    },
    {
      名: '奇门遁甲',
      简称: '奇门',
      keys: ['qimen', 'qimen-ri', 'qimen-ke', 'qimen-bj', 'qimen-nianyue', 'qimen-fei', 'qimen-ge', 'liuren', 'liuren-bifa']
    },
    {
      名: '梅花易数',
      简称: '梅花',
      keys: ['meihua']
    },
    {
      名: '风水堪舆',
      简称: '风水',
      keys: ['bazhai', 'feixing', 'fengshui', 'yangzhai']
    },
    {
      名: '解梦',
      简称: '解梦',
      keys: ['qianwen']
    }
  ];

  /**
   * 「纯看生辰即可自足出料」的功能块白名单。
   *
   * 为什么必须要有这张表（不能一律全跑）：
   *   有几个块在缺输入时会**自己编输入**，得出看着像真的、实际不存在的结论 ——
   *     · bazi-hehun（合婚）：把同一个人的生辰当成两个人，产出「某女 vs 某女，中配 50 分」
   *     · fengshui（八等婚）、yangzhai（阳宅）、qianwen（解梦/灵签）：分别要坐向、户型、梦境原文
   *   这些若混进全套排盘，等于拿假数据冒充计算结果。故一律排除，改由
   *   `useOnlyWhenNamed` 规则处理：只有用户在原文里**明确点名**了该功能的触发词，才允许跑。
   *
   * 判定口径：块名后标「✅自足」的都是「输入生辰 + 时间就能算」的排盘/推演块。
   */
  var SELF_SUFFICIENT = {
    'huangli': 1, 'date-convert': 1,                                    // 黄历/万年历：按出生日即可算
    'bazi-chart': 1, 'dayun': 1, 'bazi-pattern': 1, 'bazi-shensha': 1,
    'ziwei': 1, 'ziwei-sihua': 1,
    'liuyao': 1, 'liuyao-wangshuai': 1,                                  // 按生辰时刻起卦
    'qimen': 1, 'qimen-ri': 1, 'qimen-ke': 1, 'qimen-bj': 1, 'qimen-nianyue': 1, 'qimen-fei': 1, 'qimen-ge': 1,
    'liuren': 1, 'liuren-bifa': 1,
    'meihua': 1,
    'bazhai': 1, 'feixing': 1
  };

  /**
   * 非自足块：只有用户明确点名才跑。
   * 点名判定复用 registry 的触发词表（同一份真源，不另维护关键词）。
   * @returns {Boolean} true = 用户可以跑（要么自足，要么原文点了名）
   */
  function allowed(key, text) {
    if (SELF_SUFFICIENT[key]) return true;
    if (!FEATURES || !FEATURES.FEATURES) return false;
    var f = null;
    for (var i = 0; i < FEATURES.FEATURES.length; i++) {
      if (FEATURES.FEATURES[i].key === key) { f = FEATURES.FEATURES[i]; break; }
    }
    if (!f || !f.触发词) return false;
    var s = String(text || '');
    for (var k = 0; k < f.触发词.length; k++) {
      // 通用动作词（排盘/排/查/看/解）不算点名，否则「排盘」二字会放行所有块
      if (['排盘', '排', '查', '看', '解'].indexOf(f.触发词[k]) >= 0) continue;
      if (s.indexOf(f.触发词[k]) >= 0) return true;
    }
    return false;
  }

  // 块 key → 短名（标题用）。从 registry 现取，避免在这里维护第二份真源。
  function shortNameOf(key) {
    if (!FEATURES || !FEATURES.FEATURES) return key;
    for (var i = 0; i < FEATURES.FEATURES.length; i++) {
      if (FEATURES.FEATURES[i].key === key) return FEATURES.FEATURES[i].短名;
    }
    return key;
  }

  /**
   * 把块输出的首行标题换成「【大类 · 短名】」。
   *
   * 为什么必须换：结果页 result-format.js 靠行首「【…】」切小节，
   *   若不换，各块自带标题（【每日黄历】【八字排盘】…）虽也能切，但看不出八大类的归属；
   *   换了之后「【万年历黄历 · 查黄历】」这样的标题同时表达「哪一类」与「哪个块」。
   * 只换第一个【…】，块内的其他【】小标题保持原样（那是块自己的分节）。
   */
  function retitle(text, sectionName, key) {
    var t = String(text || '');
    var label = '【' + sectionName + ' · ' + shortNameOf(key) + '】';
    if (/^【[^】]*】/.test(t)) return t.replace(/^【[^】]*】/, label);
    return label + t;
  }

  /**
   * 跑全套。
   *
   * @param {Object} ent    intent.parse() 出来的 entities（含 date/time/gender/name）
   * @param {String} text   用户原文（部分块要读原文里的关键词，如择日事项、签号）
   * @returns {{text:String, sections:Array, blocks:Array, missing:Array, count:Number}}
   *   text     —— 拼好的整段（各块用换行分隔，供旧壳层与导出图片直接用）
   *   sections —— [{名, 简称, blocks:[{key, 短名, text}]}]，按八大类顺序，供结果页分组渲染
   *   blocks   —— 扁平的全部出料块（按展示顺序）
   *   missing  —— 需补充信息才能排的类：[{名, 短名, 缺什么}]
   *   count    —— 出料块数（壳层判断「是否多算法并列」用）
   */
  function runAll(ent, text) {
    var sections = [], blocks = [], missing = [], skipped = [], parts = [];

    for (var s = 0; s < SECTIONS.length; s++) {
      var sec = SECTIONS[s], secBlocks = [];
      for (var k = 0; k < sec.keys.length; k++) {
        var key = sec.keys[k];
        // 非自足块（需坐向/户型/梦境/第二人/报数/事项）→ 用户没点名就不跑，避免自编输入凑数。
        // 但不能**静默**跳过：用户得知道「这几类为什么没有」，否则会以为功能坏了。
        // 故记进 skipped，末尾合并成一行可追问的提示。
        if (!allowed(key, text)) {
          skipped.push(shortNameOf(key));
          continue;
        }
        var out;
        try { out = (FEATURES && FEATURES.run) ? FEATURES.run(key, ent, text) : null; }
        catch (e) { out = null; }   // 单个块崩掉不能拖垮整套（宁可少一节，不可整页空白）
        out = out || {};
        var body = out.text || '';
        if (!body) {
          // 缺料块（如「解梦」必须给梦境原文）：不塞进正文刷屏，收集起来在末尾集中说明
          var need = out.prompt || '';
          if (need) missing.push({ 名: sec.名, 短名: shortNameOf(key), 缺什么: need });
          else skipped.push(shortNameOf(key));
          continue;
        }
        var t = retitle(body, sec.名, key);
        secBlocks.push({ key: key, 短名: shortNameOf(key), text: t });
        blocks.push({ 名: sec.名, key: key, 短名: shortNameOf(key), text: t });
        parts.push(t);
      }
      if (secBlocks.length) sections.push({ 名: sec.名, 简称: sec.简称, blocks: secBlocks });
    }

    // 缺料提示压在最后一行，不打断主体阅读；没有缺料就不加，避免无谓噪音。
    // 两类都并进这一行：① 跑了但缺输入的（missing）② 因需额外条件被拦下没跑的（skipped）。
    var notes = [];
    for (var m = 0; m < missing.length; m++) {
      if (notes.indexOf(missing[m].短名) < 0) notes.push(missing[m].短名);
    }
    for (var q = 0; q < skipped.length; q++) {
      if (notes.indexOf(skipped[q]) < 0) notes.push(skipped[q]);
    }
    if (notes.length) {
      parts.push('【需补充信息】' + notes.join('、')
        + ' 需额外条件才能排（解梦需梦境内容、阳宅需户型、八等婚需坐向或双方生年、'
        + '合婚需两人、风水需坐向、解梦需梦境原文），可直接追问。');
    }

    return {
      text: parts.join('\n'),
      sections: sections,
      blocks: blocks,
      missing: missing,
      skipped: skipped,
      count: blocks.length
    };
  }

  return { SECTIONS: SECTIONS, runAll: runAll };
});
