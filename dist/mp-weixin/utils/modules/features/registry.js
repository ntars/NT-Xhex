/**
 * modules/features/registry.js —— 扩展功能注册表【单一真源】
 *
 * 职责：把 CoreModule 各内核（紫微飞星/数字命理/号码八星/易经六爻/八宅命卦/小术/五行生克/五格）
 *        包成「搜索框单一入口」可路由到的功能。搜索框输入 → 命中某功能的触发词 → 调对应内核 →
 *        输出自然语言结果。各功能触发词集中在此表（改触发词只改这里）。
 *
 * 路由约定：intent.js 先把 5 类核心意图（bazi/almanac/nameology/calendar/selection）识别掉；
 *        识别不到（intent='unknown'）时，analyzer.js 再调本表 match() 兜底 → 命中的功能才跑。
 *        所以本表 trigger 不与核心意图抢词，只补「核心词之外」的长尾玄学诉求。
 *
 * 依赖（UMD 注入）：feixing/numeral/numberstars/iching/bazhai/xiaoshu/wuxing/name81/lunar（CoreModule）
 * 加载：UMD —— 小程序被 require；浏览器挂到全局 NT.features。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('../CoreModule/feixing.js'),
      require('../CoreModule/numeral.js'),
      require('../CoreModule/numberstars.js'),
      require('../CoreModule/iching.js'),
      require('../CoreModule/bazhai.js'),
      require('../CoreModule/xiaoshu.js'),
      require('../CoreModule/wuxing.js'),
      require('../CoreModule/name81.js'),
      require('../CoreModule/lunar.js'),
      require('../CoreModule/bazi.js'),
      require('../CoreModule/zodiac-rel.js'),
      require('../CoreModule/ziwei.js'),
      require('../CoreModule/astro.js'),
      require('../CoreModule/qimen.js'),
      require('../CoreModule/liuren.js'),
      require('../CoreModule/liuyao.js'),
      require('../CoreModule/taiyi.js'),
      require('../CoreModule/yangzhai.js'),
      require('../CoreModule/xiangshu.js'),
      require('../CoreModule/qianwen.js')
    );
  } else {
    root.NT = root.NT || {};
    root.NT.features = factory(
      root.NT.core && root.NT.core.feixing, root.NT.core && root.NT.core.numeral,
      root.NT.core && root.NT.core.numberstars, root.NT.core && root.NT.core.iching,
      root.NT.core && root.NT.core.bazhai, root.NT.core && root.NT.core.xiaoshu,
      root.NT.core && root.NT.core.wuxing, root.NT.core && root.NT.core.name81,
      root.NT.core && root.NT.core.lunar,
      root.NT.core && root.NT.core.bazi,
      root.NT.core && root.NT.core.zodiacRel,
      root.NT.core && root.NT.core.ziwei,
      root.NT.core && root.NT.core.astro,
      root.NT.core && root.NT.core.qimen,
      root.NT.core && root.NT.core.liuren,
      root.NT.core && root.NT.core.liuyao,
      root.NT.core && root.NT.core.taiyi,
      root.NT.core && root.NT.core.yangzhai,
      root.NT.core && root.NT.core.xiangshu,
      root.NT.core && root.NT.core.qianwen
    );
  }
})(typeof self !== 'undefined' ? self : this, function (FEI, NUM, NSTAR, ICE, BZH, XS, WX, N81, CORE, BAZI, ZD, ZW, ASTRO, QM, LR, LY, TY, YZ, XSH, QW) {

  // 十二地支序（大六壬天地盘/天将逐一列用）
  function ZHI2() { return ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']; }

  // 从文本里抽取连续数字串（号码八星用；字母 A–Z 由内核转 1–9）
  function pullNumber(text) {
    var m = String(text || '').match(/[\dA-Za-z]{4,}/);
    return m ? m[0] : '';
  }
  // 从文本里抽取姓名（跳过各功能触发词与功能字，取最后一个 2–4 字候选）
  var NAME_STOP = ['号码', '八星', '磁场', '手机', '数字', '命理', '打分', '吉凶', '看看', '怎么', '帮我',
    '五格', '数理', '三才', '测名', '姓名', '起卦', '易经', '六爻', '梅花', '卦象', '体用',
    '紫微', '飞星', '斗数', '命卦', '坐向', '东四', '西四', '婚配', '小六壬', '一掌', '马前', '节律', '临界',
    '相生', '相克', '生克'];
  function pullName(text, ent) {
    if (ent && ent.name) return ent.name;
    var m = String(text || '').match(/[\u4e00-\u9fa5]{2,4}/g) || [];
    var pick = '';
    for (var i = 0; i < m.length; i++) {
      var w = m[i];
      if (NAME_STOP.indexOf(w) >= 0) continue;
      if (w.length >= 2 && w.length <= 4) pick = w; // 取靠后的姓名候选
    }
    return pick;
  }
  // 取年份（用于紫微/八宅命卦；无则取当前年）
  function yearOf(ent, text) {
    if (ent && ent.date && ent.date.year) return ent.date.year;
    var m = String(text || '').match(/(19|20)\d{2}/);
    return m ? +m[0] : new Date().getFullYear();
  }
  function genderOf(ent) { return ent && ent.gender ? ent.gender : null; }
  function zhGender(ent) { var g = genderOf(ent); return g === 'female' ? '女' : g === 'male' ? '男' : null; }
  // 从文本抽生肖（「属马」「马」「属鼠的人」→ 马/鼠）
  function pullZodiac(text, def) {
    if (def) return def;
    var m = String(text || '').match(/属([鼠牛虎兔龙蛇马羊猴鸡狗猪])/) || String(text || '').match(/([鼠牛虎兔龙蛇马羊猴鸡狗猪])/);
    return m ? m[1] : null;
  }
  function pullTwoZodiacs(text) {
    var m = String(text || '').match(/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/g) || [];
    var seen = [];
    for (var i = 0; i < m.length; i++) if (seen.indexOf(m[i]) < 0) seen.push(m[i]);
    return seen.length >= 2 ? [seen[0], seen[1]] : (seen.length === 1 ? [seen[0], null] : []);
  }
  // 五行 → 起名用字「方向」提示（只给选字倾向，不臆造具体字）
  var WX_HINT = { 水: '带水/雨旁的字', 木: '带木/艹旁的字', 火: '带火/日/光旁的字', 土: '带土/山/石旁的字', 金: '带金/钅旁的字' };
  function wxNameHint(wx) { return WX_HINT[wx] || '对应五行属性的字'; }
  // 简单中文数字（1-99，够用即可；复杂走 intent 的 chineseNumberToArabic）
  var CN_NUM = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 十一: 11, 十二: 12, 二十: 20, 三十: 30, 四十: 40, 五十: 50, 六十: 60 };

  /**
   * 功能定义表（单一真源）。顺序即 match() 优先级。
   *   触发词 = 搜索框命中即路由；run = 返回 { text } 或 { prompt }（缺料时追问）。
   */
  var FEATURES = [
    {
      key: 'bazi-chart', 名: '八字完整排盘',
      触发词: ['排盘', '八字', '四柱', '命盘', '藏干', '十神', '用神', '喜用', '纳音', '批八字'],
      说明: '按出生时间出完整八字（四柱/藏干/十神/纳音/旬空/胎元命宫身宫/五行/旺衰/用神），走 C07 内核。',
      run: function (ent, text) {
        if (!ent || !ent.date || !ent.date.year) return { prompt: '八字排盘需要出生年月日，例如「白玖玖，女，2005年6月9日」（可含时辰）。' };
        var g = zhGender(ent);
        if (!g) return { prompt: '排盘需出生性别（男/女），请补充，例如「白玖玖，女，2005年6月9日子时」。' };
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1, h = ent.time ? ent.time.hour : 14;
        var c = BAZI.chart({ y: y, m: m, d: d, h: h, gender: g, name: ent.name || '命主' });
        var P = c.pillars;
        var lines = ['【八字排盘】' + (ent.name || '命主') + '（' + g + '）' + y + '年' + m + '月' + d + '日' + h + '时，' + c.lunar.text + '。'];
        lines.push('四柱：年' + P.年.干支 + ' / 月' + P.月.干支 + ' / 日' + P.日.干支 + ' / 时' + P.时.干支 + '。');
        lines.push('藏干：年' + P.年.藏干.join('') + ' 月' + P.月.藏干.join('') + ' 日' + P.日.藏干.join('') + ' 时' + P.时.藏干.join('') + '。');
        lines.push('十神：年' + P.年.十神 + ' 月' + P.月.十神 + ' 时' + P.时.十神 + '（日主' + c.dayMaster.干 + '·' + c.dayMaster.五行 + '）。');
        lines.push('纳音：' + c.纳音.年 + ' ' + c.纳音.月 + ' ' + c.纳音.日 + ' ' + c.纳音.时 + '；胎元' + c.胎元 + ' 命宫' + c.命宫 + ' 身宫' + c.身宫 + '。');
        lines.push('五行：' + Object.keys(c.五行.统计).map(function (k) { return k + c.五行.统计[k]; }).join(' / ') + '，' + c.五行.缺文本 + '。');
        lines.push('旺衰：' + c.旺衰.判 + '（' + c.旺衰.加权分 + '分，得令' + (c.旺衰.得令 ? '是' : '否') + ' 得地' + c.旺衰.得地 + ' 得势' + c.旺衰.得势 + '）；用神' + c.旺衰.用神.第一用神 + '、喜' + c.旺衰.用神.喜神 + '、忌' + c.旺衰.用神.忌神 + '。');
        return { text: lines.join('\n') };
      }
    },
    {
      key: 'dayun', 名: '八字大运流年',
      触发词: ['大运', '流年', '走运', '运程', '起运'],
      说明: '按「阳男阴女顺排、阴男阳女逆排」推十年大运（C07 内核，含起运岁数）。',
      run: function (ent, text) {
        if (!ent || !ent.date || !ent.date.year) return { prompt: '推大运需要出生年月日，例如「1990年8月1日」。' };
        var g = zhGender(ent);
        if (!g) return { prompt: '推大运需出生性别（男/女，定顺逆），请补充。' };
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1, h = ent.time ? ent.time.hour : 14;
        var c = BAZI.chart({ y: y, m: m, d: d, h: h, gender: g, name: ent.name || '命主' });
        var dy = c.大运;
        var lines = ['【大运】' + g + '命，' + dy.顺逆 + '，' + dy.起运 + '。'];
        lines.push('大运：' + (dy.列表.length ? dy.列表.map(function (x) { return x.年龄 + '岁『' + x.干支 + '』（' + x.开始年 + '起）'; }).join('、') : '（未推出，请核对生辰）'));
        return { text: lines.join('\n') };
      }
    },
    {
      key: 'numberstars', 名: '号码八星磁场',
      触发词: ['八星磁场', '号码八星', '手机八星', '八星磁场', '磁场吉凶', '手机号'],
      说明: '输入一串数字/手机号，按「号码八星」逐位定磁场吉凶。',
      run: function (ent, text) {
        var num = pullNumber(text);
        if (!num) return { prompt: '请把要分析的号码或手机号打出来，例如「13812345678」。' };
        var r = NSTAR.analyze(num);
        var lines = ['【号码八星】' + r.数字串 + '：'];
        lines.push(r.八星明细.length ? ('磁场明细（共 ' + r.八星明细.length + ' 处）：' +
          r.八星明细.map(function (d) { return '位' + d.位置 + '「' + d.数字 + '」=' + d.星 + '·' + d.吉凶; }).join('；') + '。') : '未检出成对八星。');
        lines.push('吉星 ' + r.吉星数 + ' / 凶星 ' + r.凶星数 + '，' + r.结论 + '。');
        return { text: lines.join('\n') };
      }
    },
    {
      key: 'numeral-chart', 名: '数字八字排盘',
      触发词: ['数字八字', '数字排盘', '数字命理', '生命灵数', '数字能量', '数字磁场', '生日数字'],
      说明: '按出生时间排「数字八字」四柱数字 / 五行 / 日柱拆分（C10 内核，本项目自研体系）。',
      run: function (ent, text) {
        if (!ent || !ent.date || !ent.date.year) return { prompt: '请给出出生年月日，例如「1990年8月1日」（可含时辰）。' };
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1, h = ent.time ? ent.time.hour : 14;
        var p = NUM.paiPan({ y: y, m: m, d: d, h: h });
        var lines = ['【数字八字】' + p.农历 + '，生肖' + p.生肖 + '。'];
        lines.push('四柱数字：年' + p.数字.年 + ' / 月' + p.数字.月 + ' / 日' + p.数字.日 + ' / 时' + p.数字.时 + '（日柱拆分 ' + p.数字.日拆分.join('-') + '）。');
        lines.push('对应五行：年' + p.五行.年 + ' / 月' + p.五行.月 + ' / 日' + p.五行.日 + ' / 时' + p.五行.时 + '。');
        lines.push('佩戴部位：年=外衣领、月=内衣、日=内裤、时=鞋袜。');
        return { text: lines.join('\n') };
      }
    },
    {
      key: 'numeral-judge', 名: '数字命理凶数判定',
      触发词: ['凶数', '八绝', '六冲数组', '三九', '灾数', '纯阳', '数字凶', '数字吉凶'],
      说明: '对「数字八字」四柱数字做凶数数组判定：八绝 / 六冲 / 三九 / 灾数 / 纯阳（C10 内核）。',
      run: function (ent, text) {
        if (!ent || !ent.date || !ent.date.year) return { prompt: '请给出出生年月日，例如「1990年8月1日」（可含时辰）。' };
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1, h = ent.time ? ent.time.hour : 14;
        var p = NUM.paiPan({ y: y, m: m, d: d, h: h });
        var arr = [p.数字.年, p.数字.月, p.数字.日, p.数字.时].concat(p.数字.日拆分 || []);
        var hits = NUM.judgeArray(arr);
        var lines = ['【数字凶数判定】四柱数字 ' + [p.数字.年, p.数字.月, p.数字.日, p.数字.时].join('-') + '（日拆 ' + p.数字.日拆分.join('-') + '）。'];
        lines.push(hits.length ? ('命中 ' + hits.length + ' 处：' + hits.map(function (x) { return '【' + x.阵 + '】' + x.组合 + ' ' + x.断; }).join('；') + '。') : '未见明显凶数数组（八绝/六冲/三九/灾数/纯阳），数字场偏稳。');
        return { text: lines.join('\n') };
      }
    },
    {
      key: 'numeral-fix', 名: '数字命理五行通关化解',
      触发词: ['通关', '化解', '数字化解', '通关物', '补财库', '文昌局', '桃花位'],
      说明: '按「数字八字」四柱五行找出相克，给五行通关行与随身化解物（C10 内核 TONGGUAN）。',
      run: function (ent, text) {
        if (!ent || !ent.date || !ent.date.year) return { prompt: '请给出出生年月日，例如「1990年8月1日」。' };
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1, h = ent.time ? ent.time.hour : 14;
        var p = NUM.paiPan({ y: y, m: m, d: d, h: h });
        var wx4 = { 年: p.五行.年, 月: p.五行.月, 日: p.五行.日, 时: p.五行.时 };
        // 标准五行克（不臆造，通用规则）：木克土 土克水 水克火 火克金 金克木
        var KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
        var clash = [];
        for (var a in wx4) for (var b in wx4) if (a !== b && wx4[a] && KE[wx4[a]] === wx4[b]) {
          var key = wx4[a] + '克' + wx4[b];
          if (clash.indexOf(key) < 0) clash.push(key);
        }
        var lines = ['【五行通关】四柱五行：年' + wx4.年 + ' / 月' + wx4.月 + ' / 日' + wx4.日 + ' / 时' + wx4.时 + '。'];
        if (clash.length) {
          clash.forEach(function (k) {
            var t = NUM.TONGGUAN[k];
            if (t) lines.push(k + ' → 通关「' + t.通关 + '」，随身『' + t.物 + '』。');
          });
        } else lines.push('四柱未见相克，数字场顺畅，无需通关。');
        return { text: lines.join('\n') };
      }
    },
    {
      key: 'feixing', 名: '九宫飞星（年·月·时）',
      触发词: ['飞星', '九宫飞星', '紫微飞星', '紫微', '入中星', '紫白', '玄空', '运程飞星', '月飞星', '时飞星', '日飞星'],
      说明: '玄空九宫飞星（年紫白 / 月紫白 / 时紫白）入中星与九宫飞布；年飞星最有力、月次之、日时效力有限（供参考）。',
      run: function (ent, text) {
        var y = yearOf(ent, text);
        var m = ent && ent.date && ent.date.month ? ent.date.month : 1;
        var d = ent && ent.date && ent.date.day ? ent.date.day : 1;
        var h = ent && ent.time ? ent.time.hour : 14;
        var t = String(text || '');
        var wantMonth = t.indexOf('月飞星') >= 0 || t.indexOf('月紫白') >= 0 || t.indexOf('月盘') >= 0;
        var wantHour = t.indexOf('时飞星') >= 0 || t.indexOf('时紫白') >= 0 || t.indexOf('时辰') >= 0;
        var wantDay = t.indexOf('日飞星') >= 0 || t.indexOf('日紫白') >= 0;

        var lines = [];
        // 年飞星（默认必出）
        var yr = FEI.yearChart(y);
        lines.push('【九宫飞星】' + y + ' 年·' + y + '/' + m + '/' + d + ' ' + h + '时：');
        lines.push('年紫白：入中「' + yr.入中星名 + '」，' + yr.运.说明 + '；九宫 ' + Object.keys(yr.盘).map(function (g) { return '宫' + g + '=' + yr.盘[g].星; }).join(' ') + '。');

        // 取年支 / 日支 / 农历月（走 C01 历法内核）
        var gz = CORE.fromSolar(y, m, d, h);
        var yearZhi = gz.ganzhi.年.支, dayZhi = gz.ganzhi.日.支;
        var lunarMonth = Math.abs(gz._raw.getMonth());

        // 月飞星
        if (wantMonth) {
          var mo = FEI.monthChart(yearZhi, lunarMonth);
          lines.push('月紫白（' + lunarMonth + '月）：入中「' + mo.入中星名 + '」，九宫 ' + Object.keys(mo.盘).map(function (g) { return '宫' + g + '=' + mo.盘[g].星; }).join(' ') + '。');
        }
        // 时飞星（冬至后顺 / 夏至后逆：复用 C09 日紫白锚点精确判定当天顺/逆，不用月份近似）
        if (wantHour) {
          var winter = true;
          var dAnchor = FEI.dayChart(y, m, d);
          if (dAnchor && !dAnchor.err) winter = dAnchor.顺; // 顺=冬至后段（冬），逆=夏至后段（夏）
          var hr = FEI.hourChart(dayZhi, Math.floor(((h + 1) % 24) / 2), winter);
          lines.push('时紫白（' + dayZhi + '日 ' + (winter ? '冬顺' : '夏逆') + '）：入中「' + hr.入中星名 + '」，九宫 ' + Object.keys(hr.盘).map(function (g) { return '宫' + g + '=' + hr.盘[g].星; }).join(' ') + '。');
        }
        // 日飞星（玄空日紫白：节气锚点 + 甲子日计数，C02 精确交节日，6 段铁点已验）
        if (wantDay) {
          var dy = FEI.dayChart(y, m, d);
          if (dy.err) lines.push('日紫白：' + dy.err + '。');
          else lines.push('日紫白（' + dy.节气 + (dy.顺 ? '·顺' : '·逆') + '，自甲子日' + (dy.起星日 ? dy.起星日.y + '/' + dy.起星日.m + '/' + dy.起星日.d : '') + '）：入中「' + dy.入中星名 + '」，九宫 ' + Object.keys(dy.盘).map(function (g) { return '宫' + g + '=' + dy.盘[g].星; }).join(' ') + '。');
        }
        lines.push('（效力：年 > 月 > 日时；年盘最有力，月盘可参考，日时仅在特殊格局看。）');
        return { text: lines.join('\n') };
      }
    },
    {
      key: 'ziwei', 名: '紫微斗数',
      触发词: ['紫微斗数', '紫微排盘', '斗数', '排紫微', '紫微盘'],
      说明: '紫微斗数命盘（内嵌 iztro 权威引擎）：命宫主星/身宫主星/五行局 + 十二宫主辅星 + 四化 + 大限岁数。',
      run: function (ent, text) {
        var y = yearOf(ent, text);
        var m = ent && ent.date && ent.date.month ? ent.date.month : 1;
        var d = ent && ent.date && ent.date.day ? ent.date.day : 1;
        var h = ent && ent.time ? ent.time.hour : 14;
        var g = ent && ent.gender ? (ent.gender === 'female' ? '女' : '男') : null;
        if (!g) return { prompt: '紫微斗数需出生性别（定阴阳顺逆/大限），请补「男」或「女」。' };
        if (!ZW || !ZW.chart) return { prompt: '紫微引擎（iztro）未加载，无法排盘。' };
        var c = ZW.chart({ y: y, m: m, d: d, h: h, gender: g });
        if (c.err) return { text: '【紫微斗数】' + c.err };
        var lines = [];
        lines.push('【紫微斗数】' + y + '年' + m + '月' + d + '日' + h + '时（' + g + '）：命主星「' + c.命主星 + '」坐' + c.命宫地支 + '宫，身主星「' + c.身主星 + '」坐' + c.身宫地支 + '宫，' + c.五行局 + '。');
        lines.push('命宫（' + c.命宫.干支 + '）主星「' + c.命宫.主星 + '」' + (c.命宫.辅星 ? '，辅星 ' + c.命宫.辅星 : '') + (c.命宫.四化.length ? '，四化 ' + c.命宫.四化.join('、') : '') + '。');
        lines.push('身宫（' + c.身宫.干支 + '）主星「' + c.身宫.主星 + '」。');
        lines.push('十二宫：' + c.十二宫.map(function (p) { return p.宫 + (p.主星.length ? '「' + p.主星.join('/') + '」' : '·'); }).join(' '));
        lines.push('大限（命宫）：' + c.大限.命宫起限.join('、') + '。');
        return { text: lines.join('\n') };
      }
    },
    {
      key: 'iching', 名: '易经起卦',
      触发词: ['易经', '铜钱起卦', '铜钱卦', '起卦', '卦象', '大衍'],
      说明: '以「易经」铜钱 / 大衍（带数字 seed）起卦，得本卦/互卦/动爻与体用生克。',
      run: function (ent, text) {
        var num = pullNumber(text);
        var r = num ? ICE.dayan(parseInt(num, 10) || 1) : ICE.qigua();
        function gName(g) { return ICE.hexName(ICE.BAGUA[g.上卦].名, ICE.BAGUA[g.下卦].名); }
        var lines = ['【易经起卦】' + (num ? '以 ' + num + ' 大衍起卦，' : '铜钱起卦，') + '本卦「' + (r.本卦.卦名 || gName(r.本卦)) + '」，互卦「' + gName(r.互卦) + '」。'];
        if (r.动爻 && r.动爻.length) lines.push('动爻：第 ' + r.动爻.join('、第 ') + ' 爻动。');
        var ty = ICE.tiyong(r.爻, (r.动爻 && r.动爻.length) ? r.动爻[0] : 0);
        lines.push('体用：体「' + ty.体卦 + '」用「' + ty.用卦 + '」，' + ty.关系 + '（体' + ty.体五 + ' / 用' + ty.用五 + '），' + ty.吉凶 + '。');
        return { text: lines.join('\n') };
      }
    },
    {
      key: 'meihua', 名: '梅花易数（时间起卦）',
      触发词: ['梅花易数', '梅花', '时间起卦', '物数起卦', '邵康节', '先天卦'],
      说明: '邵雍「梅花易数·时间起卦法」：上卦=(年支+月+日)取8余、下卦=加时辰支、动爻=(总)取6余；先天八卦数 1乾2兑3离4震5巽6坎7艮8坤，配体用生克（走 C10 农历 + C17 卦象单一真源）。',
      run: function (ent, text) {
        if (!ent || !ent.date || !ent.date.year) return { prompt: '梅花时间起卦需要完整年月日，例如「1990年8月1日」（可含时辰）。' };
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1, h = ent.time ? ent.time.hour : 14;
        var p = NUM.paiPan({ y: y, m: m, d: d, h: h }); // 数字.年=生肖序、月=农历月、日=农历日、时=时支序
        var nY = p.数字.年, nM = p.数字.月, nD = p.数字.日, nH = p.数字.时;
        var sh = (nY + nM + nD) % 8; if (sh === 0) sh = 8;            // 上卦
        var x = (nY + nM + nD + nH) % 8; if (x === 0) x = 8;          // 下卦
        var dy = (nY + nM + nD + nH) % 6; if (dy === 0) dy = 6;      // 动爻位（初爻=1…上爻=6）
        // 本卦 6 爻 = 下卦三爻 + 上卦三爻；动爻在体用判定时 dongYi=dy-1（<3 → 下卦动，体在上）
        var yao = ICE.BAGUA[x].爻.concat(ICE.BAGUA[sh].爻);
        var ben = ICE.fromYao(yao), hu = ICE.huGua(yao);
        var ty = ICE.tiyong(yao, dy - 1);
        var lines = ['【梅花易数】' + p.农历 + '（' + y + '-' + m + '-' + d + ' ' + h + '时）起卦：'];
        lines.push('上卦「' + ICE.BAGUA[sh].名 + '」下卦「' + ICE.BAGUA[x].名 + '」→ 本卦「' + (ben.卦名 || ICE.hexName(ICE.BAGUA[sh].名, ICE.BAGUA[x].名)) + '」，互卦「' + ICE.hexName(ICE.BAGUA[hu.上卦].名, ICE.BAGUA[hu.下卦].名) + '」。');
        lines.push('动爻：第 ' + dy + ' 爻动。');
        lines.push('体用：体「' + ty.体卦 + '」用「' + ty.用卦 + '」，' + ty.关系 + '（体' + ty.体五 + ' / 用' + ty.用五 + '）→ ' + ty.吉凶 + '。');
        return { text: lines.join('\n') };
      }
    },
    {
      key: 'zhouyi', 名: '周易 64 卦查询',
      触发词: ['查卦', '周易', '64卦', '六十四卦', '周易卦', '卦名', '卦序', '地天泰', '水天需', '山火贲'],
      说明: '按卦名（如「地天泰」）或卦序（如「第11卦」）查 64 卦的上/下卦、五行与体用生克（C17 内核 64 卦全表）。',
      run: function (ent, text) {
        var t = String(text || '');
        // 卦名（char）→ 先天数（1-8）反查
        var nameToNum = {};
        for (var n in ICE.BAGUA) nameToNum[ICE.BAGUA[n].名] = +n;
        // 反查表：卦名全名 → [上卦名, 下卦名]
        var byName = {};
        Object.keys(ICE.HEX64).forEach(function (k) { byName[ICE.HEX64[k]] = [k.slice(0, 1), k.slice(1)]; });

        function render(key) { // key = 上卦名+下卦名
          var up = key.slice(0, 1), dn = key.slice(1);
          var yao = ICE.BAGUA[nameToNum[dn]].爻.concat(ICE.BAGUA[nameToNum[up]].爻); // 下卦 + 上卦
          var ty = ICE.tiyong(yao, 0);
          var out = ['【周易卦】「' + ICE.HEX64[key] + '」：'];
          out.push('上卦' + up + '（' + ICE.BAGUA[nameToNum[up]].五行 + '）/ 下卦' + dn + '（' + ICE.BAGUA[nameToNum[dn]].五行 + '）。');
          out.push('取体用（以初爻为动）：体「' + ty.体卦 + '」用「' + ty.用卦 + '」，' + ty.关系 + '。');
          return { text: out.join('\n') };
        }

        // ① 按卦序（第 N 卦，HEX64 键序 = 上乾行…上坤行 共 64 位，稳定）
        var seq = t.match(/第\s*([0-9一二三四五六七八九十百]+)\s*卦/);
        if (seq) {
          var num = parseInt(seq[1], 10);
          if (isNaN(num)) num = CN_NUM[seq[1]] || 0; // 简单中文数字
          var keys = Object.keys(ICE.HEX64);
          if (num >= 1 && num <= 64) return render(keys[num - 1]);
          return { prompt: '卦序须 1–64，请核对。' };
        }
        // ② 按卦名
        for (var bn in byName) if (t.indexOf(bn) >= 0) return render(byName[bn][0] + byName[bn][1]);
        return { prompt: '请给卦名（如「地天泰」）或卦序（如「第11卦」）。' };
      }
    },
    {
      key: 'bazhai', 名: '八宅命卦',
      触发词: ['八宅', '命卦', '东四命', '西四命', '婚配命卦'],
      说明: '按出生年与性别推「八宅命卦」、坐向吉凶；两命卦可推婚配。',
      run: function (ent, text) {
        var y = yearOf(ent, text);
        var g = genderOf(ent);
        var gStr = g === 'female' ? '女' : g === 'male' ? '男' : null;
        if (!gStr) return { prompt: '八宅命卦需出生性别，请补「男」或「女」。' };
        var r = BZH.mingGua(y, gStr);
        var lines = ['【八宅命卦】' + y + ' 年（' + gStr + '）：本命卦「' + r.卦 + '」（' + r.方位 + '），' + r.东西命 + '。'];
        var you = BZH.younian(r.卦);
        if (you) lines.push('大游年八星落宫：' + ['生气', '天医', '延年', '伏位', '六煞', '祸害', '五鬼', '绝命'].map(function (s) { return s + '=' + you[s]; }).join(' ') + '。');
        return { text: lines.join('\n') };
      }
    },
    {
      key: 'xiaoshu', 名: '小术（一掌经/小六壬/马前课/节律）',
      触发词: ['一掌经', '小六壬', '马前课', '人体节律', '节律', '临界日'],
      说明: '小术类：一掌经本命星、小六壬、马前速占、人体生物节律。',
      run: function (ent, text) {
        var m = ent && ent.date && ent.date.month ? ent.date.month : 1;
        var d = ent && ent.date && ent.date.day ? ent.date.day : 1;
        var h = ent && ent.time ? ent.time.hour : 0;
        var tx = String(text || '');
        var out = ['【小术】'];
        // 小六壬（默认）：月/日/时 → 定课
        var x = XS.xiaoliuren(m, d, h);
        out.push('小六壬：定课「' + x.定课 + '」·' + x.吉凶 + '·' + x.五行 + '。' + x.断);
        if (tx.indexOf('马前') >= 0) { var q = XS.maqianke(m, d, h); out.push(q.断); }
        if (tx.indexOf('一掌') >= 0 && ent && ent.date && ent.date.year) {
          var y2 = ent.date.year;
          var r2 = CORE.fromSolar(y2, m, d, h); // C01 取年支 + 农历月/日
          var yz = XS.yizhangjing(r2.ganzhi.年.支, Math.abs(r2._raw.getMonth()), r2._raw.getDay(), Math.floor(((h + 1) % 24) / 2), ent.gender === 'female');
          out.push('一掌经（' + yz.方向 + '）：年' + yz.年宫 + ' / 月' + yz.月宫 + ' / 日' + yz.日宫 + ' / 时' + yz.时宫 + '，本命星「' + yz.本命星 + '」。' + yz.本命断);
        }
        if (tx.indexOf('节律') >= 0 || tx.indexOf('临界') >= 0) {
          var b = XS.biorhythm(365);
          out.push('人体节律：体力 ' + b.体力 + ' / 情绪 ' + b.情绪 + ' / 智力 ' + b.智力 + '，' + b.过零预警 + '。');
        }
        return { text: out.join('\n') };
      }
    },
    {
      key: 'zodiac', 名: '生肖关系（合冲刑害）',
      触发词: ['生肖关系', '属相', '生肖配', '和谁配', '三合', '六合', '六冲', '六害', '相刑', '相合', '相冲', '相害', '生肖相', '属相相', '生肖合', '属相合'],
      说明: '十二生肖传统关系判定（六合/三合/六冲/六害/相刑/六破，C-zodiacRel 内核，5 源核对）。',
      run: function (ent, text) {
        var pair = pullTwoZodiacs(text);
        // 双生肖（两个都有效）→ 判定关系；单生肖 → 出该生肖的合/冲/害/刑速查
        if (pair.length >= 2 && pair[1]) {
          var r = ZD.relOf(pair[0], pair[1]);
          var lines = ['【生肖关系】属' + pair[0] + ' × 属' + pair[1] + '：'];
          lines.push('关系：' + r.关系.join('、') + '。' + r.说明);
          if (r.关系.indexOf('六冲') >= 0 || r.关系.indexOf('六害') >= 0 || r.关系.indexOf('三刑') >= 0) {
            var good = ZD.detail(pair[0]).六合贵人.concat(ZD.detail(pair[1]).六合贵人).filter(function (v, i, a) { return a.indexOf(v) === i; });
            lines.push('调和：可借助双方六合贵人「' + (good.length ? good.join('、') : '—') + '」缓和对冲。');
          }
          return { text: lines.join('\n') };
        }
        if (pair.length === 1 || (pair.length === 2 && !pair[1])) {
          var dd = ZD.detail(pair[0]);
          if (dd.unknown) return { prompt: '未识别生肖，请用十二生肖（鼠牛虎兔龙蛇马羊猴鸡狗猪）。' };
          var dl = ['【生肖速查】属' + pair[0] + '：'];
          dl.push('六合贵人：' + (dd.六合贵人.join('、') || '—') + '；三合：' + (dd.三合.join('、') || '—'));
          dl.push('六冲：' + (dd.六冲.join('、') || '—') + '；六害：' + (dd.六害.join('、') || '—') + '；六破：' + (dd.六破.join('、') || '—'));
          return { text: dl.join('\n') };
        }
        return { prompt: '请给出两个生肖，例如「属鼠和属马相配吗」，或单个生肖查速查「属牛 三合」。' };
      }
    },
    {
      key: 'taisui', 名: '犯太岁',
      触发词: ['犯太岁', '太岁', '值太岁', '冲太岁', '刑太岁', '害太岁', '破太岁'],
      说明: '按流年太岁（当年生肖）判某生肖犯太岁类型（值/冲/刑/害/破，C-zodiacRel 内核）。',
      run: function (ent, text) {
        var y = yearOf(ent, text);
        // 太岁生肖 = 流年（立春口径），用 C01 历法内核取权威值
        var yearSX = null;
        if (CORE && CORE.fromSolar) { try { yearSX = CORE.fromSolar(y, 6, 1).ganzhi.年.生肖; } catch (e) { yearSX = null; } }
        if (!yearSX) { var m = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']; yearSX = m[(y - 4) % 12]; }
        var sx = pullZodiac(text, null);
        if (!sx) return { prompt: '请给出要查的生肖（如「属虎 2026 犯太岁吗」）。' };
        var r = ZD.taisui(yearSX, sx);
        var lines = ['【犯太岁】' + y + ' 年太岁「' + yearSX + '」，属' + sx + '：'];
        lines.push(r.length ? ('犯：' + r.join('、') + '。') : '不犯太岁，与流年太岁无值/冲/刑/害/破关系。');
        if (r.length) lines.push('宜稳重行事，重大事宜可借助六合贵人日缓吉。');
        return { text: lines.join('\n') };
      }
    },
    {
      key: 'naming', 名: '起名补益',
      触发词: ['起名', '取名', '改字', '补名', '名字补', '配字'],
      说明: '按八字喜用神 + 五行补缺，给起名用字方向（C07 喜用 + C11 五格，零臆造——只给方向不给具体字）。',
      run: function (ent, text) {
        if (!ent || !ent.date || !ent.date.year) return { prompt: '起名补益需要出生年月日（定八字喜用），例如「2008年3月1日，女」。' };
        var g = zhGender(ent);
        if (!g) return { prompt: '需出生性别（定旺衰喜用），请补「男」或「女」。' };
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1, h = ent.time ? ent.time.hour : 14;
        var c = BAZI.chart({ y: y, m: m, d: d, h: h, gender: g, name: ent.name || '' });
        var lines = ['【起名补益】' + (ent.name ? '「' + ent.name + '」' : '') + '八字喜用：第一用神「' + c.旺衰.用神.第一用神 + '」、喜「' + c.旺衰.用神.喜神 + '」、忌「' + c.旺衰.用神.忌神 + '」。'];
        lines.push('五行缺：' + c.五行.缺文本 + '。');
        lines.push('取名方向：宜选「' + c.旺衰.用神.第一用神 + '」/' + c.旺衰.用神.喜神 + '」属性之字补益（如' + wxNameHint(c.旺衰.用神.第一用神) + '）；忌再加重「' + c.旺衰.用神.忌神 + '」属。');
        lines.push('五格：定字后走「五格」功能验 81 数理吉凶。');
        return { text: lines.join('\n') };
      }
    },
    {
      key: 'fengshui', 名: '八宅风水（八等婚·坐向）',
      触发词: ['八等婚', '八宅婚', '合婚', '坐向', '宅卦', '东四西四', '大游年'],
      说明: '八宅法：两造命卦推「八等婚」（天医/生气/延年…绝命）+ 坐向八星吉凶（C08 内核）。',
      run: function (ent, text) {
        var t = String(text || '');
        // ① 坐向（「坐北朝南」「坐北」等）
        var zuo = t.match(/坐(北|南|东|西|东北|东南|西北|西南)/);
        if (zuo) {
          var g = BZH.zhaiGua('坐' + zuo[1]);
          var you = g ? BZH.younian(g) : null;
          var lines = ['【八宅坐向】' + zuo[0] + ' → 宅卦「' + (g || '未识别') + '」。'];
          if (you) lines.push('大游年八星（吉）：生气宫' + you.生气 + '、天医宫' + you.天医 + '、延年宫' + you.延年 + '；（凶）五鬼' + you.五鬼 + '、六煞' + you.六煞 + '、祸害' + you.祸害 + '、绝命' + you.绝命 + '。');
          return { text: lines.join('\n') };
        }
        // ② 八等婚合婚（需两造命卦；给两个年份 + 性别，或直接给「东四命/西四命 + 卦名」）
        var years = (t.match(/(19|20)\d{2}/g) || []).map(function (x) { return +x; });
        var genders = (t.match(/男|女/g) || []);
        if (years.length >= 2 && genders.length >= 2) {
          var ga = BZH.mingGua(years[0], genders[0] === '女' ? 'female' : 'male').卦;
          var gb = BZH.mingGua(years[1], genders[1] === '女' ? 'female' : 'male').卦;
          var h = BZH.hehun(ga, gb);
          var lines2 = ['【八宅合婚】' + years[0] + '年（' + genders[0] + '，' + ga + '卦）× ' + years[1] + '年（' + genders[1] + '，' + gb + '卦）：'];
          lines2.push('第 ' + h.等 + ' 等「' + h.名 + '」（' + h.关系星 + '），' + h.说明 + '。');
          return { text: lines2.join('\n') };
        }
        return { prompt: '八宅合婚请给「两个出生年 + 性别」（如「1990男 1992女 八等婚」）；或给坐向（如「坐北 坐向」）。' };
      }
    },
    {
      key: 'wuxing-color', 名: '五行穿衣',
      触发词: ['穿衣', '穿什么色', '大吉色', '今日吉色', '五行穿衣', '穿啥'],
      说明: '按当日日干五行推「生我/我生」之吉色（C01 日干 + C05 五行生克，民俗参考）。',
      run: function (ent, text) {
        var y = ent && ent.date && ent.date.year ? ent.date.year : yearOf(ent, text);
        var m = ent && ent.date && ent.date.month ? ent.date.month : 1;
        var d = ent && ent.date && ent.date.day ? ent.date.day : 1;
        var r = CORE.fromSolar(y, m, d);
        var dayGan = r.ganzhi.日.干, dayWx = r.ganzhi.日.干五行;
        var COLOR = { 金: '白色/银色', 木: '青绿色', 水: '黑色/藏青', 火: '红色/橙色', 土: '土黄/棕色' };
        var lines = ['【五行穿衣】' + r.lunar.text + '，' + r.ganzhi.日.干支 + '日，日干「' + dayGan + '」（' + dayWx + '）。'];
        lines.push('大吉（生我·' + WX.SHENG_WO[dayWx] + '）：' + COLOR[WX.SHENG_WO[dayWx]] + '；次吉（同我·' + dayWx + '）：' + COLOR[dayWx] + '。');
        lines.push('平（我生·泄' + WX.SHENG[dayWx] + '）：' + COLOR[WX.SHENG[dayWx]] + '；不宜（克我·' + WX.KE_WO[dayWx] + '）：' + COLOR[WX.KE_WO[dayWx]] + '。');
        lines.push('（民俗参考，非强制）');
        return { text: lines.join('\n') };
      }
    },
    {
      key: 'wuxing', 名: '五行生克',
      触发词: ['相生', '相克', '五行生克', '生克'],
      说明: '五行相生相克：木火土金水循环，可查某行生/克关系。',
      run: function (ent, text) {
        var wxm = String(text || '').match(/木|火|土|金|水/);
        if (!wxm) return { prompt: '请指明五行（木/火/土/金/水）查生克，例如「木生什么」。' };
        var t = wxm[0];
        return { text: '【五行生克】' + t + '：它生「' + (WX.SHENG[t] || '—') + '」，它克「' + (WX.KE[t] || '—') + '」；被「' + (WX.SHENG_WO[t] || '—') + '」生，被「' + (WX.KE_WO[t] || '—') + '」克。' };
      }
    },
    {
      key: 'wuge', 名: '姓名五格 81 数理',
      触发词: ['五格', '81数理', '姓名打分', '测名', '三才'],
      说明: '姓名「五格剖象 + 81 数理」吉凶评分（康熙笔画 3500 字表）。',
      run: function (ent, text) {
        var nm = pullName(text, ent);
        if (!nm) return { prompt: '请给出要测的姓名（姓在前），例如「白玖玖」。' };
        var r = N81.score(nm);
        if (r.incomplete) return { text: '【姓名五格】' + r.note + '（康熙笔画表已覆盖通用 3500 字；缺字请补 kangxi-strokes.js）。' };
        var lines = ['【姓名五格】「' + nm + '」笔画 ' + r.五格.笔画.join('+') + '。'];
        lines.push('天格' + r.五格.天格 + ' / 人格' + r.五格.人格 + ' / 地格' + r.五格.地格 + ' / 外格' + r.五格.外格 + ' / 总格' + r.五格.总格 + '。');
        lines.push('三才：' + r.五格.三才.join('·') + '。');
        lines.push('得分 ' + r.得分 + '/100，' + r.评语 + '。');
        return { text: lines.join('\n') };
      }
    },
    {
      key: 'date-convert', 名: '日期换算',
      触发词: ['日期换算', '公历', '农历', '儒略日', '倒排日', '阳历', '阴历', '换农历', '查农历', '换算'],
      说明: '公历 ↔ 农历 ↔ 干支 ↔ 生肖 ↔ 儒略日 ↔ 星期 任意对照（C01/C02 内核，离线精确）。',
      run: function (ent, text) {
        if (!ent || !ent.date || !ent.date.year) return { prompt: '请给出要换算的日期，例如「2026年8月15日」。' };
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1;
        var r = CORE.fromSolar(y, m, d, ent.time ? ent.time.hour : 0);
        var wd = ['日', '一', '二', '三', '四', '五', '六'][new Date(y, m - 1, d).getDay()];
        var lines = ['【日期换算】' + y + '年' + m + '月' + d + '日（星期' + wd + '）：'];
        lines.push('农历：' + r.lunar.text + '；干支四柱：' + r.ganzhi.年.干支 + ' ' + r.ganzhi.月.干支 + ' ' + r.ganzhi.日.干支 + ' ' + r.ganzhi.时.干支 + '。');
        lines.push('生肖：' + r.ganzhi.年.生肖 + '；儒略日：' + Math.round(CORE.julianDay(y, m, d, 0, 0, 0)) + '。');
        return { text: lines.join('\n') };
      }
    },
    {
      key: 'countdown', 名: '倒数日',
      触发词: ['倒数日', '还有几天', '多少天后', '距离', '距今天', '还剩几天'],
      说明: '目标日与今天相隔天数（C01 内核，离线）；可按「距离 X 日还有几天」查。',
      run: function (ent, text) {
        if (!ent || !ent.date || !ent.date.year) return { prompt: '请给出目标日期，例如「距离 2027年1月1日 还有几天」。' };
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1;
        var target = new Date(y, m - 1, d);
        var today = new Date(); today.setHours(0, 0, 0, 0);
        var diff = Math.round((target.getTime() - today.getTime()) / 86400000);
        var days = Math.abs(diff);
        var lines = ['【倒数日】' + y + '年' + m + '月' + d + '日 距今天（' + today.getFullYear() + '/' + (today.getMonth() + 1) + '/' + today.getDate() + '）：'];
        lines.push(diff === 0 ? '就是今天。' : (diff > 0 ? ('还有 ' + days + ' 天。') : ('已过去 ' + days + ' 天。')));
        if (diff > 0 && days <= 365) lines.push('约 ' + Math.floor(days / 30.44) + ' 个月、' + Math.round(days / 7) + ' 周。');
        return { text: lines.join('\n') };
      }
    },
    {
      key: 'astro', 名: '占星·七政四余（黄经落座·落宿·庙旺）',
      触发词: ['占星', '星盘', '七政', '四余', '黄经', '落座', '落宿', '二十八宿', '庙旺', '月亮星座', '太阳星座', '凯龙', '罗睺', '月孛'],
      说明: '出生时刻 10 曜（日月光金木水火土 + 罗睺/计都/月孛）回归黄经·落十二星座·落二十八宿（等宫近似）·庙旺（果老星宗）。七政走 astronomy-engine(JPL级)，三余走 Meeus 均值公式。',
      run: function (ent, text) {
        if (!ent || !ent.date || !ent.date.year) return { prompt: '占星/七政需要出生年月日，例如「1990年8月15日」（可含时辰，占星尽量给到时辰）。' };
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1, h = ent.time ? ent.time.hour : 12;
        if (!ASTRO || !ASTRO.positions) return { text: '【占星】星历内核未加载（vendor/astronomy.js 缺失），暂不可用。' };
        try {
          var p = ASTRO.positions({ y: y, m: m, d: d, h: h });
          if (p.err) return { prompt: p.err };
          var lines = ['【占星·七政四余】' + y + '年' + m + '月' + d + '日' + h + '时（UTC 口径）各曜落座：'];
          var order = ['太阳', '太阴', '水星', '金星', '火星', '木星', '土星', '罗睺', '计都', '月孛'];
          lines.push(order.map(function (k) {
            var s = p.星座[k];
            return k + ' → ' + s.符号 + s.星座 + s.度数 + '°（黄经 ' + p.黄经[k].toFixed(1) + '°）';
          }).join('；'));
          lines.push('落二十八宿（等宫近似）：' + order.map(function (k) {
            var x = p.二十八宿[k];
            return k + '入' + x.全名 + x.入度 + '度';
          }).join('、'));
          lines.push('庙旺（果老星宗·地支宫查表）：' + order.map(function (k) {
            var x = p.庙旺[k];
            return k + '「' + (x ? x.判 : '平常') + '」';
          }).join('、'));
          lines.push('（紫炁/凯龙：七政四余第 11 曜，定义有「日拱点 vs Chiron 小行星」两说，需权威裁定后补。落二十八宿走「等宫近似」（角初度对齐春分·宿度《淮南子》），庙旺取《果老星宗卷一》庙/旺/喜/乐/垣 五态查表。）');
          return { text: lines.join('\n') };
        } catch (e) {
          return { text: '【占星】排盘失败：' + String(e && e.message ? e.message : e) + '（内核暂不可用，不影响其他功能）。' };
        }
      }
    },
    {
      key: 'qimen', 名: '奇门遁甲（时家转盘·拆补）',
      触发词: ['奇门', '奇门遁甲', '遁甲', '值符', '值使', '阴遁', '阳遁', '转盘法', '拆补法', '九星八门'],
      说明: '某时刻完整奇门局（时家·转盘·拆补定局）：四柱/阴阳遁/局数/元/旬首/值符值使/地盘/天盘九星/八门/八神。',
      run: function (ent, text) {
        if (!ent || !ent.date || !ent.date.year) return { prompt: '奇门遁甲需要起局年月日，例如「1990年8月15日」（尽量给到时辰，时家奇门以时辰起局）。' };
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1, h = ent.time ? ent.time.hour : 0;
        if (!QM || !QM.chart) return { text: '【奇门】奇门内核未加载，暂不可用。' };
        try {
          var c = QM.chart({ y: y, m: m, d: d, h: h });
          if (c.err) return { prompt: c.err };
          var L = ['【奇门遁甲】' + y + '年' + m + '月' + d + '日' + h + '时（时家·转盘·拆补）：'];
          L.push('四柱 ' + c.四柱.年 + ' ' + c.四柱.月 + ' ' + c.四柱.日 + ' ' + c.四柱.时 + '；' + c.阴阳遁 + c.局数 + '局（' + c.节气 + c.元 + '元），旬首' + c.旬首 + '，值符「' + c.值符星 + '」、值使「' + c.值使门 + '」。');
          var GONG = [1, 8, 3, 4, 9, 2, 7, 6]; // 洛书地理顺时针环（展示顺序）
          L.push('地盘布仪：' + GONG.map(function (p) { return '宫' + p + c.地盘[p]; }).join(' ') + '（中五寄坤二）；');
          L.push('天盘九星：' + GONG.map(function (p) { return '宫' + p + c.天盘[p]; }).join(' ') + '；');
          L.push('人盘八门：' + GONG.map(function (p) { return '宫' + p + c.八门[p]; }).join(' ') + '；');
          L.push('神盘八神：' + GONG.map(function (p) { return '宫' + p + c.八神[p]; }).join(' '));
          L.push('（飞布九星/八门/八神逐宫落位已按 qimen.pro 黄金盘锁定；' + c._飞布验证 + ' 吉凶格另判。）');
          return { text: L.join('\n') };
        } catch (e) {
          return { text: '【奇门】排局失败：' + String(e && e.message ? e.message : e) + '（内核暂不可用，不影响其他功能）。' };
        }
      }
    },
    {
      key: 'liuren', 名: '大六壬（时家·月将加占时·四课三传·十二天将）',
      触发词: ['大六壬', '六壬', '月将加时', '月将加占时', '四课', '三传', '十二天将', '天乙贵人', '贵人', '伏吟', '返吟', '涉害', '蒿矢', '弹射', '遥克', '重审', '元首'],
      说明: '某时刻完整六壬课（时家·月将加占时）：四柱/月将/占时/天地盘/四课/九宗门发用/三传/十二天将（贵人昼夜+顺逆布将）/旬空/驿马/三传遁干。权威规则多源核对（零臆造）。',
      run: function (ent, text) {
        if (!ent || !ent.date || !ent.date.year) return { prompt: '大六壬需要起课时辰年月日，例如「1990年8月15日14时」（可只给日期，占时另说）。' };
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1, h = ent.time ? ent.time.hour : 0;
        if (!LR || !LR.chart) return { text: '【大六壬】内核未加载，暂不可用。' };
        try {
          var c = LR.chart({ y: y, m: m, d: d, h: h });
          if (c.err) return { prompt: c.err };
          var L = ['【大六壬】' + y + '年' + m + '月' + d + '日' + h + '时（时家·月将加占时）：'];
          L.push('四柱 ' + c.四柱.年 + ' ' + c.四柱.月 + ' ' + c.四柱.日 + ' ' + c.四柱.时 + '；月将' + c.月将 + '（' + c.中气 + '后）、占时' + c.占时 + '。');
          // 天地盘（十二支逐一列）
          L.push('天地盘：' + ZHI2().map(function (z) { return z + '上' + c.天地盘.天盘[z]; }).join(' ') + '（地盘恒为本身）。');
          // 四课
          L.push('四课：①' + c.四课[0].位 + '上' + c.四课[0].上 + ' ②' + c.四课[1].位 + '上' + c.四课[1].上 + ' ③' + c.四课[2].位 + '上' + c.四课[2].上 + ' ④' + c.四课[3].位 + '上' + c.四课[3].上 + '。');
          // 三传 + 发用
          L.push('发用 ' + c.发用.方法 + '，三传：初' + c.发用.三传[0] + ' → 中' + c.发用.三传[1] + ' → 末' + c.发用.三传[2] + '（遁干 ' + c.三传遁干.join(' ') + '）。');
          // 十二天将
          L.push('十二天将（' + c.十二天将.贵人 + '贵·' + c.十二天将.昼夜 + '·' + c.十二天将.顺逆 + '布）：' + ZHI2().map(function (z) { return z + c.十二天将.将[z]; }).join(' '));
          // 旬空 / 驿马
          L.push('旬空（空亡）' + (c.旬空.join('') || '无') + '；驿马' + (c.驿马 || '无') + '。');
          L.push('（' + c.发用.说明 + ' 涉害深计数/伏吟返吟中末/金口诀顺逆异说/夜子日柱 等细分项内核已如实标注待黄金盘验证，不假报已锁。）');
          return { text: L.join('\n') };
        } catch (e) {
          return { text: '【大六壬】起课失败：' + String(e && e.message ? e.message : e) + '（内核暂不可用，不影响其他功能）。' };
        }
      }
    },
    {
      key: 'taiyi', 名: '太乙神数',
      触发词: ['太乙', '太乙神数', '太乙式', '十六神', '文昌', '计神', '始击', '天目', '阳九百六'],
      说明: '某年太乙岁计局：积年/入局/元阴阳遁/十六神/天目(文昌)/计神/客目(始击)/太乙落宫（C17 内核，落宫与主客算标待黄金盘验证）。',
      run: function (ent, text) {
        var y = yearOf(ent, text);
        if (!TY || !TY.chart) return { text: '【太乙】内核未加载，暂不可用。' };
        try {
          var c = TY.chart({ y: y });
          if (c.err) return { prompt: c.err };
          var L = ['【太乙神数】' + y + ' 年（岁计）：'];
          L.push('积年 ' + c.积年 + '；入局数 ' + c.入局数 + '（入纪元数 ' + c.入纪元数 + '）；' + c.元 + '·' + c.阴阳遁 + '。');
          L.push('天目(文昌)：' + c.天目文昌 + '；计神：' + c.计神 + '；客目(始击)：' + c.客目始击 + '。');
          L.push('太乙落宫：' + c.太乙落宫 + '。');
          L.push('（' + c.缺料 + '）');
          return { text: L.join('\n') };
        } catch (e) {
          return { text: '【太乙】起局失败：' + String(e && e.message ? e.message : e) };
        }
      }
    },
    {
      key: 'liuyao', 名: '六爻纳甲',
      触发词: ['六爻', '纳甲', '摇卦', '铜钱卦', '爻', '世应', '六亲', '卦象详解'],
      说明: '铜钱起卦（指定 6 次背数或自动）→ 本卦/变卦/八宫纳甲/安世应/六亲/六神/旬空月破（C18 内核，京房纳甲）。',
      run: function (ent, text) {
        if (!LY || !LY.cast) return { text: '【六爻】内核未加载，暂不可用。' };
        try {
          var inp = {};
          // 尝试从文本解析 6 次背数（如「背 3 1 2 0 3 2」）
          var m = String(text || '').match(/背\s*([0-3\s,，、]+)/);
          if (m) {
            var bs = m[1].replace(/[^\d]/g, '').split('').map(Number).filter(function (x) { return x >= 0 && x <= 3; });
            if (bs.length === 6) inp.backs = bs;
          }
          if (ent && ent.date) { inp.y = ent.date.year; inp.m = ent.date.month || 1; inp.d = ent.date.day || 1; inp.h = ent.time ? ent.time.hour : 12; }
          // 测事 → 用神
          var 事m = String(text || '').match(/测([财运|事业|婚姻|感情|学业|考试|求财|疾病|出行|子嗣|官司]+)/);
          if (事m) inp.事 = 事m[1];
          var c = LY.cast(inp);
          if (c.err) return { prompt: c.err };
          var L = ['【六爻纳甲】本卦「' + c.本卦 + '」' + (c.变卦 ? '→ 变卦「' + c.变卦 + '」' : '') + '（' + c.宫 + '，世' + c.世 + ' 应' + c.应 + '）。'];
          L.push('上下卦：' + c.上下卦 + (c.动爻.length ? '；动爻：第 ' + c.动爻.join('、') + ' 爻' : '；无动爻'));
          L.push('六爻（自下而上）：');
          c.爻线.forEach(function (x) {
            L.push('  ' + x.爻 + '爻 ' + (x.阴阳 === '阴' ? '--' : '—') + ' ' + x.干支 + ' ' + x.六亲 + (x.六神 ? ' ' + x.六神 : '') + (x.世应 ? '【' + x.世应 + '】' : '') + (x.标记 ? ' ' + x.标记 : ''));
          });
          if (c.用神) L.push('用神：' + c.用神 + '。');
          if (c.日干) L.push('日干 ' + c.日干 + '，旬空 ' + (c.旬空.join('') || '无') + '，月建 ' + (c.月建 || '—') + '。');
          if (c.缺料) L.push('（' + c.缺料 + '）');
          return { text: L.join('\n') };
        } catch (e) {
          return { text: '【六爻】起卦失败：' + String(e && e.message ? e.message : e) };
        }
      }
    },
    {
      key: 'astro-xiangwei', 名: '占星·相位',
      触发词: ['相位', '星盘相位', '合相', '冲相', '拱相', '刑相'],
      说明: '本命盘 10 曜两两相位（合/六合/刑/拱/冲 + 小相位，含容许度，C19 内核 §8.2）。',
      run: function (ent, text) {
        if (!ent || !ent.date || !ent.date.year) return { prompt: '占星相位需要出生年月日，例如「1990年8月15日 相位」。' };
        if (!ASTRO || !ASTRO.aspects) return { text: '【占星相位】内核未加载。' };
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1, h = ent.time ? ent.time.hour : 12;
        var a = ASTRO.aspects({ y: y, m: m, d: d, h: h });
        if (a.err) return { prompt: a.err };
        var L = ['【占星·相位】' + a.时刻 + '（参与 ' + a.参与.length + ' 曜）：'];
        L.push(a.相位.length ? a.相位.map(function (x) { return x.a + ' ' + x.类型 + ' ' + x.b + '(' + x.夹角 + '°/容许' + x.容许 + ')'; }).join('；') : '无明显相位。');
        return { text: L.join('\n') };
      }
    },
    {
      key: 'astro-tuiyun', 名: '占星·推运（次限/行运）',
      触发词: ['推运', '次限', '行运', '三限', '太阳返照', '月亮返照', '法达'],
      说明: '次限推运（1 天=1 年，本命+岁数）/ 行运（当日天象对本命），输出相位（C19 内核 §8.3）。',
      run: function (ent, text) {
        if (!ent || !ent.date || !ent.date.year) return { prompt: '推运需要出生年月日，例如「1990年8月15日 推运 30岁」。' };
        if (!ASTRO || !ASTRO.progressions) return { text: '【推运】内核未加载。' };
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1, h = ent.time ? ent.time.hour : 12;
        var ageM = String(text || '').match(/(\d+)\s*岁/);
        var age = ageM ? +ageM[1] : 1;
        var p = ASTRO.progressions({ y: y, m: m, d: d, h: h }, age);
        if (p.err) return { prompt: p.err };
        var L = ['【占星·推运】本命 ' + p.本命时刻 + '，次限 ' + p.次限基准 + '：'];
        L.push('次限相位（次限星对本命星）：' + (p.次限相位.length ? p.次限相位.map(function (x) { return x.a + ' ' + x.类型 + ' ' + x.b; }).join('；') : '无显著相位。'));
        L.push('（行运 Transit：给「某日 行运」可算当日天象对本命相位；太阳/月亮返照、法达等详见功能圣经 §8.3。）');
        return { text: L.join('\n') };
      }
    },
    {
      key: 'astro-hepan', 名: '占星·合盘',
      触发词: ['合盘', '双人合盘', 'Synastry', '比较盘', '双人星盘'],
      说明: '双人本命盘行星相位比较（Synastry），需两人出生时间（C19 内核 §8.4）。',
      run: function (ent, text) {
        if (!ASTRO || !ASTRO.synastry) return { text: '【合盘】内核未加载。' };
        return { prompt: '双人合盘需要两位的出生年月日，例如「1990年8月15日 与 1988年3月20日 合盘」（可含时辰）。' };
      }
    },
    {
      key: 'astro-vedic', 名: '占星·印占（Vedic）',
      触发词: ['印占', 'Vedic', '吠陀', '恒星黄道', '二十七宿', 'Nakshatra', 'Vimshottari', '罗睺'],
      说明: '印占盘：恒星黄经（Lahiri 岁差近似）+ 二十七宿 + Vimshottari 大限（以月亮宿起限，C19 内核 §8.5）。',
      run: function (ent, text) {
        if (!ent || !ent.date || !ent.date.year) return { prompt: '印占需要出生年月日，例如「1990年8月15日 印占」。' };
        if (!ASTRO || !ASTRO.vedicPositions) return { text: '【印占】内核未加载。' };
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1, h = ent.time ? ent.time.hour : 12;
        var v = ASTRO.vedicPositions({ y: y, m: m, d: d, h: h });
        if (v.err) return { prompt: v.err };
        var L = ['【印占 Vedic】' + v.时刻 + '：岁差 Ayanamsa ' + v.ayanamsa + '。'];
        L.push('月亮宿：' + v.月亮宿 + '；Vimshottari 起限「' + v.Vimshottari.起限星 + '」，大限序 ' + v.Vimshottari.大限序.join('→') + '（共 ' + v.Vimshottari.总年 + ' 年）。');
        L.push('（' + v.缺料 + '）');
        return { text: L.join('\n') };
      }
    },
    {
      key: 'yangzhai', 名: '阳宅风水',
      触发词: ['阳宅', '厨厕', '门对门', '缺角', '凸角', '户型', '楼层五行', '八宫', '家居风水'],
      说明: '阳宅布局规则引擎：八宫人事映射/厨房厕所方位化解/门对门/缺角补角/楼层五行生肖匹配（C20 内核 §15）。',
      run: function (ent, text) {
        if (!YZ || !YZ.analyze) return { text: '【阳宅风水】内核未加载。' };
        var t = String(text || '');
        var inp = {};
        // 缺角（「缺西北 缺东南」）
        var miss = (t.match(/缺([西北|西南|东南|东北|正北|正南|正东|正西|中]+)/g) || []).map(function (x) { return x.replace('缺', ''); });
        if (miss.length) inp.缺角 = miss;
        // 厨房/厕所方位
        var k = t.match(/厨房在([西北|西南|东南|东北|正北|正南|正东|正西|中]+)/); if (k) inp.厨房 = k[1];
        var to = t.match(/厕所(在|位于)([西北|西南|东南|东北|正北|正南|正东|正西|中]+)/); if (to) inp.厕所 = to[2];
        // 门对门
        for (var dp in YZ.DOOR_PAIRS) if (t.indexOf(dp.replace('对', '对')) >= 0 || t.indexOf(dp) >= 0) { inp.门对门 = dp; break; }
        // 楼层 + 生肖
        var fl = t.match(/(\d+)\s*楼/); if (fl) inp.楼层 = +fl[1];
        var zs = t.match(/属([鼠牛虎兔龙蛇马羊猴鸡狗猪])/); if (zs) inp.生肖 = zs[1];
        if (!inp.缺角 && !inp.厨房 && !inp.厕所 && !inp.门对门 && !inp.楼层) {
          return { prompt: '请描述户型，例如「厨房在正南、缺西北、入户对电梯、8 楼属虎」或「阳宅八宫映射」。' };
        }
        var a = YZ.analyze(inp);
        var L = ['【阳宅风水】'];
        if (a.厨厕.length) a.厨厕.forEach(function (x) { L.push('·' + x.类型 + (x.方位 ? '(' + x.方位 + ')' : '') + (x.吉凶 ? '【' + x.吉凶 + '】' : '') + (x.危害 ? '：' + x.危害 : '') + (x.化解 ? '；化解：' + x.化解 : '')); });
        if (a.门对门.length) a.门对门.forEach(function (x) { L.push('·门对门(' + x.类型 + ')：' + x.化解); });
        if (a.缺角.length) a.缺角.forEach(function (x) { L.push('·缺' + x.方位 + '：' + x.危害 + '；补角：' + x.补角 + (x.严重 ? ' ⚠' + x.严重 : '')); });
        if (a.楼层) L.push('·楼层' + inp.楼层 + '：五行' + a.楼层.楼层五行 + (a.楼层.生肖五行 ? ('，生肖' + inp.生肖 + '五行' + a.楼层.生肖五行 + '，' + a.楼层.匹配) : ''));
        L.push('（' + a.缺口 + '）');
        return { text: L.join('\n') };
      }
    },
    {
      key: 'xiangshu', 名: '相术（面相/手相/痣相/骨相）',
      触发词: ['相术', '面相', '手相', '痣相', '骨相', '十二宫面相', '三停', '看相'],
      说明: '相术词库检索：面相十二宫/三停/五岳/五官断、手相线纹手型五行、痣相、骨相九骨（C21a 内核 §16）。',
      run: function (ent, text) {
        if (!XSH || !XSH.lookup) return { text: '【相术】内核未加载。' };
        var t = String(text || '');
        var cat = null;
        if (t.indexOf('手相') >= 0) cat = (t.indexOf('手型') >= 0 || t.indexOf('金形') >= 0 || t.indexOf('木形') >= 0) ? '手型' : '手相线';
        else if (t.indexOf('痣') >= 0) cat = '痣相';
        else if (t.indexOf('骨') >= 0) cat = '骨相';
        else if (t.indexOf('三停') >= 0 || t.indexOf('五岳') >= 0) cat = (t.indexOf('三停') >= 0) ? '三停' : '五岳';
        else if (t.indexOf('五官') >= 0) cat = '五官';
        else cat = '面相十二宫';
        if (t.indexOf('面相') >= 0 && t.indexOf('十二宫') < 0) cat = '面相十二宫';
        var L = ['【相术·' + cat + '】'];
        if (cat === '面相十二宫') {
          for (var g in XSH.MIAN_12) { var o = XSH.MIAN_12[g]; L.push('·' + g + '（' + o.部位 + '）：' + o.主 + '；' + o.吉); }
        } else if (cat === '骨相') {
          L.push('九骨：' + XSH.JIU_GU.join('、'));
        } else if (cat === '痣相') {
          L.push(XSH.ZHI_XIANG.通论);
          for (var b in XSH.ZHI_XIANG.部位) L.push('·' + b + '：' + XSH.ZHI_XIANG.部位[b]);
        } else {
          var data = XSH.lookup(cat);
          for (var k in data) L.push('·' + k + '：' + (typeof data[k] === 'string' ? data[k] : JSON.stringify(data[k])));
        }
        L.push('（相术为部位义与通论，非绝对命断；真人相需结合照片轮廓点选。）');
        return { text: L.join('\n') };
      }
    },
    {
      key: 'qianwen', 名: '签文·解梦·塔罗·占星骰子',
      触发词: ['观音灵签', '灵签', '抽签', '解梦', '塔罗', '占星骰子', '答案之书', '雷诺曼', '如尼'],
      说明: '签文/解梦/塔罗词库：观音灵签抽签(100签)、塔罗78张、解梦词典、占星骰子、答案之书（C21b 内核 §17）。',
      run: function (ent, text) {
        if (!QW) return { text: '【签文/塔罗】内核未加载。' };
        var t = String(text || '');
        if (t.indexOf('观音') >= 0 || t.indexOf('灵签') >= 0 || t.indexOf('抽签') >= 0) {
          var g = QW.guanyinDraw(ent && ent.date ? (ent.date.year + '-' + (ent.date.month || 1) + '-' + (ent.date.day || 1)) : undefined);
          return { text: '【观音灵签】第 ' + g.签号 + ' 签 / 共 ' + g.总签数 + ' 签' + (g.签名 ? '（' + g.签名 + '·' + g.等级 + '）' : '') + '。\n' + (g.注 || '') };
        }
        if (t.indexOf('塔罗') >= 0) {
          return { text: '【塔罗】78 张：大阿尔克纳 22（' + QW.MAJOR.map(function (x) { return x[0]; }).join('、') + '…）+ 小阿尔克纳 56（权杖/圣杯/宝剑/星币 × A–10+侍者骑士王后国王）。可指定牌名查正逆位（如「塔罗 愚人」）。' };
        }
        if (t.indexOf('解梦') >= 0) {
          return { text: '【解梦】支持分类检索（人物/动物/自然/身体/钱财/出行/鬼神/居所…），如「梦到蛇」「梦到水」「梦到飞」。' };
        }
        if (t.indexOf('占星骰子') >= 0) {
          var d = QW.astroDice(0, 0, 0);
          return { text: '【占星骰子】组合 = 行星(做什么)·星座(怎样)·宫位(在哪)，共 10×12×12=1440 类。示例：' + d.行星 + '在' + d.星座 + '于' + d.宫位 + ' → ' + d.解读 + '。' };
        }
        if (t.indexOf('答案') >= 0) {
          var a = QW.answerBook();
          return { text: '【答案之书】' + a.句 + '\n' + a.注 };
        }
        return { prompt: '请指明：观音灵签 / 塔罗 / 解梦 / 占星骰子 / 答案之书（如「抽观音灵签」「塔罗 愚人」「梦到蛇」）。' };
      }
    }
  ];

  // 路由：命中触发词**最长（最具体）**者优先（避免「数字八字」被「八字」抢）；
  //      无触发词命中但文本含 ≥2 个生肖 → 兜底到生肖关系；
  //      文本含 64 卦全名或「第N卦」→ 兜底到周易查询。
  function match(text) {
    text = String(text || '');
    var best = null, bestLen = 0;
    for (var i = 0; i < FEATURES.length; i++) {
      var f = FEATURES[i];
      for (var k = 0; k < f.触发词.length; k++) {
        var w = f.触发词[k];
        if (text.indexOf(w) >= 0 && w.length > bestLen) { best = f; bestLen = w.length; }
      }
    }
    if (best) return best;
    if (pullTwoZodiacs(text).length >= 2) {
      for (var j = 0; j < FEATURES.length; j++) if (FEATURES[j].key === 'zodiac') return FEATURES[j];
    }
    // 周易兜底：命中任一 64 卦全名 或 「第 N 卦」
    var guaNames = Object.keys(ICE.HEX64).map(function (key) { return ICE.HEX64[key]; });
    if (/第\s*[0-9一二三四五六七八九十百]+\s*卦/.test(text) || guaNames.some(function (g) { return text.indexOf(g) >= 0; })) {
      for (var g2 = 0; g2 < FEATURES.length; g2++) if (FEATURES[g2].key === 'zhouyi') return FEATURES[g2];
    }
    // 八宅坐向兜底：命中「坐北/坐南/…/朝X」等坐向说法 → fengshui
    if (/坐(北|南|东|西|东北|东南|西北|西南)|朝(北|南|东|西)/.test(text)) {
      for (var fs = 0; fs < FEATURES.length; fs++) if (FEATURES[fs].key === 'fengshui') return FEATURES[fs];
    }
    return null;
  }
  function run(key, ent, text) {
    for (var i = 0; i < FEATURES.length; i++) if (FEATURES[i].key === key) return FEATURES[i].run(ent, text) || {};
    return { prompt: '未知功能：' + key };
  }

  return {
    FEATURES: FEATURES,
    keys: FEATURES.map(function (f) { return f.key; }),
    match: match,
    run: run
  };
});
