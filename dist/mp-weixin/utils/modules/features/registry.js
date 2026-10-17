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
      require('../CoreModule/qianwen.js'),
      require('../CoreModule/cezi.js'),
      require('../CoreModule/qimen-fei.js'),
      require('../CoreModule/bazi-pattern.js'),
      require('../CoreModule/zeri.js'),
      require('../CoreModule/qimen-ge.js'),
      require('../CoreModule/liuren-bifa.js'),
      require('../CoreModule/liuyao-wangshuai.js'),
      require('../CoreModule/ziwei-horoscope.js'),
      require('../CoreModule/astro-house.js'),
      require('../CoreModule/bazi-shensha.js'),
      require('../CoreModule/ziwei-stars.js')
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
      root.NT.core && root.NT.core.qianwen,
      root.NT.core && root.NT.core.cezi,
      root.NT.core && root.NT.core.qimenFei,
      root.NT.core && root.NT.core.baziPattern,
      root.NT.core && root.NT.core.zeri,
      root.NT.core && root.NT.core.qimenGe,
      root.NT.core && root.NT.core.liurenBifa,
      root.NT.core && root.NT.core.liuyaoWangshuai,
      root.NT.core && root.NT.core.ziweiHoroscope,
      root.NT.core && root.NT.core.astroHouse,
      root.NT.core && root.NT.core.baziShensha,
      root.NT.core && root.NT.core.ziweiStars
    );
  }
})(typeof self !== 'undefined' ? self : this, function (FEI, NUM, NSTAR, ICE, BZH, XS, WX, N81, CORE, BAZI, ZD, ZW, ASTRO, QM, LR, LY, TY, YZ, XSH, QW, CZ, QF, BP, ZR, QG, LBF, LWS, ZHW, AH, BSS, ZWS) {

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
  // 取文本里显式写的年份（流年/流月/流日的起点用）；没写就返回 0，由调用方决定默认值
  function pullYear(text) {
    var m = String(text || '').match(/(19|20)\d{2}/);
    return m ? +m[0] : 0;
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
   * 中文数字 → 阿拉伯数字（1–100，够签号 / 卦序用）。
   * 为什么不直接用上面那张表：死表必然漏字（「一百」「二十三」「三十六」全会漏），
   * 漏了就变成「查不出」而不是「查错了」，用户看不出问题在哪 —— 所以用规则算。
   */
  function numOf(s) {
    var d = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
    var t = String(s || '').replace(/[第\s]/g, '').replace(/签|卦/g, '');
    if (/^\d+$/.test(t)) return +t;
    if (t === '百') return 100;
    var m = t.match(/^([一二两三四五六七八九])?百(?:零?([一二三四五六七八九]))?$/);
    if (m) return (m[1] ? d[m[1]] : 1) * 100 + (m[2] ? d[m[2]] : 0);
    m = t.match(/^([一二两三四五六七八九])?十([一二三四五六七八九])?$/);
    if (m) return (m[1] ? d[m[1]] : 1) * 10 + (m[2] ? d[m[2]] : 0);
    if (d[t] != null) return d[t];
    return CN_NUM[t] || 0;
  }

  /**
   * 功能定义表（单一真源）。顺序即 match() 优先级。
   *   触发词 = 搜索框命中即路由；run = 返回 { text } 或 { prompt }（缺料时追问）。
   */
  var FEATURES = [
    {
      key: 'bazi-chart', 名: '八字完整排盘',
      板块: '命理排盘', 短名: '排八字',
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
      key: 'dayun', 名: '八字运程（大运·小运·流年流月流日）',
      板块: '命理排盘', 短名: '排运程',
      触发词: ['大运', '流年', '走运', '运程', '起运', '小运', '行年', '流月', '流日', '排运程'],
      说明: '按「阳男阴女顺排、阴男阳女逆排」推十年大运（C07 内核，含起运岁数）+ 小运（起运前逐年，自时柱后/前一位起）+ 近十年流年干支与十神；问「流月」给该流年十二节气月的月柱（五虎遁由底座换算，含交节日期），问「流日」给指定日起逐日干支与十神。',
      run: function (ent, text) {
        if (!ent || !ent.date || !ent.date.year) return { prompt: '推运程需要出生年月日，例如「1990年8月1日」。' };
        var g = zhGender(ent);
        if (!g) return { prompt: '推运程需出生性别（男/女，定顺逆），请补充。' };
        var t = String(text || '');
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1, h = ent.time ? ent.time.hour : 14;
        var c = BAZI.chart({ y: y, m: m, d: d, h: h, gender: g, name: ent.name || '命主' });
        var dm = c.dayMaster.干, P = c.pillars;
        var dy = c.大运;
        var lines = ['【八字运程】' + P.年.干支 + '年 ' + P.月.干支 + '月 ' + P.日.干支 + '日 ' + P.时.干支 + '时，日主' + dm + '（' + c.dayMaster.五行 + '），' + g + '命，' + dy.顺逆 + '，' + dy.起运 + '。'];
        lines.push('大运：' + (dy.列表.length ? dy.列表.map(function (x) { return x.年龄 + '岁『' + x.干支 + '』（' + x.开始年 + '起）'; }).join('、') : '（未推出，请核对生辰）') + '。');
        // 小运（起运前逐年）：传统只用起运前，这里给前 12 位，并明说是哪一端起的
        if (BAZI.xiaoyun) {
          var xy = BAZI.xiaoyun(c._ec, g, 12);
          if (xy.列表.length) {
            lines.push('小运（自时柱『' + xy.起点 + '』' + xy.顺逆 + '，一位一年）：' + xy.列表.map(function (x) { return x.年龄 + '岁『' + x.干支 + '』'; }).join('、') + '。');
          }
        }
        // 流年：默认从今年起十年；文本里显式写了「流年/流月/流日 + 年份」则以该年为首
        // 注意别把生辰那一年当流年起点（问「大运 1990年8月15日」时 1990 是生日，不是流年）
        var py = pullYear(t);
        var y0 = (py && (py !== y || /流年|流月|流日/.test(t))) ? py : new Date().getFullYear();
        var ln = [];
        for (var i = 0; i < 10; i++) {
          var yy = y0 + i, gz = BAZI.GANZHI60[((yy - 4) % 60 + 60) % 60];
          ln.push(yy + '『' + gz + '』' + (BAZI.shishen(dm, gz.charAt(0)) ? '（' + BAZI.shishen(dm, gz.charAt(0)) + '）' : ''));
        }
        lines.push('流年（' + y0 + ' 起十年，年干支 + 对日主的十神）：' + ln.join('、') + '。');
        // 流月：问「流月」才铺十二个月，否则不占地
        if (/流月|每月|月运|逐月/.test(t) && BAZI.liuyue) {
          var lm = BAZI.liuyue(y0, dm);
          if (!lm.err) {
            lines.push('流月（' + y0 + '，按节气月，起于交节当日）：' + lm.月.map(function (x) { return x.月支 + '月（' + x.节 + ' ' + x.起 + '）『' + x.干支 + '』' + (x.十神 ? '（' + x.十神 + '）' : ''); }).join('、') + '。');
          }
        }
        // 流日：问「流日」给逐日干支，默认从出生日往后 30 天；文本带日期则从该日起
        if (/流日|每日|日运|逐日/.test(t) && BAZI.liuri) {
          var sy = pullYear(t) || y, sm = (ent.date && ent.date.month) || m, sd = (ent.date && ent.date.day) || d;
          var mm2 = t.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
          if (mm2) { sm = +mm2[1]; sd = +mm2[2]; }
          var lr = BAZI.liuri(sy, sm, sd, 30, dm);
          lines.push('流日（' + lr.起 + ' 起 30 天，日干支 + 对日主的十神）：' + lr.日.map(function (x) { return x.日期.slice(5) + '『' + x.干支 + '』' + (x.十神 ? '（' + x.十神 + '）' : ''); }).join('、') + '。');
        }
        lines.push('口径：大运起于月柱、小运起于时柱（醉醒子法，「男起丙寅/女起壬申」的古人法未采用），一位一年、以立春换柱；流月按节气月由底座的五虎遁换算，流日按日柱顺排。');
        return { text: lines.join('\n') };
      }
    },
    {
      key: 'numberstars', 名: '号码八星磁场',
      板块: '命理排盘', 短名: '查号码',
      触发词: ['八星磁场', '号码八星', '手机八星', '八星磁场', '磁场吉凶', '手机号', '号码'],
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
      板块: '命理排盘', 短名: '排数字八字',
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
      板块: '命理排盘', 短名: '查凶数',
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
      板块: '命理排盘', 短名: '解通关',
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
      板块: '风水堪舆', 短名: '排飞星',
      触发词: ['飞星', '九宫飞星', '紫微飞星', '飞星紫微', '入中星', '紫白', '玄空', '运程飞星', '月飞星', '时飞星', '日飞星'],
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
      板块: '命理排盘', 短名: '排紫微',
      触发词: ['紫微斗数', '紫微排盘', '斗数', '排紫微', '紫微盘', '紫微星情', '紫微'],
      说明: '紫微斗数命盘（内嵌 iztro 权威引擎）：命宫主星/身宫主星/五行局 + 十二宫主辅星 + 四化 + 大限岁数，并给出十四主星与辅煞星的星情（五行·化气·性格长短·宜业）与三方四正；命宫空宫走「借星安宫」借迁移。',
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
        lines.push('命宫（' + c.命宫.干支 + '）主星' + starPhrase(c.命宫.主星) + (c.命宫.辅星 ? '，辅星 ' + c.命宫.辅星 : '') + (c.命宫.四化.length ? '，四化 ' + c.命宫.四化.join('、') : '') + '。');
        lines.push('身宫（' + c.身宫.干支 + '）主星' + starPhrase(c.身宫.主星) + '。');
        lines.push('十二宫：' + c.十二宫.map(function (p) { return p.宫 + (p.主星.length ? '「' + p.主星.join('/') + '」' : '（空）'); }).join(' '));
        lines.push('大限（命宫）：' + c.大限.命宫起限.join('、') + '。');
        // 星情与宫义（v3.1.13）：安星只给「哪颗星在哪」，这里补「这颗星什么脾气」
        if (ZWS && ZWS.line14) {
          var P = {};
          c.十二宫.forEach(function (p) { P[p.宫] = p; });
          var 命主 = c.命宫.主星 === '（空宫）' ? [] : c.命宫.主星.split('、');
          // 借星安宫：命宫无主星时借对宫（迁移）主星看（紫微斗数通例）
          var 借 = '';
          if (!命主.length) {
            var 迁 = P['迁移'];
            if (迁 && 迁.主星.length) { 借 = 迁.主星.join('、'); 命主 = 迁.主星.slice(); }
            lines.push('命宫空宫（无主星），依「借星安宫」借对宫迁移的「' + (借 || '空') + '」看命。');
          }
          var shown = {}, 星情行 = [];
          for (var si = 0; si < 命主.length; si++) {
            var l14 = ZWS.line14(命主[si]);
            if (l14) { 星情行.push(l14); shown[命主[si]] = 1; }
          }
          if (星情行.length) {
            lines.push('星情·' + (借 ? '借（取迁移宫）' : '命宫') + '：' + 星情行.join('；') + '。');
          }
          // 三方四正（财帛·官禄·迁移）：只并排短句，已在上行讲过的星不重复
          var trio = ['财帛', '官禄', '迁移'], tb = [];
          trio.forEach(function (g) {
            var p = P[g];
            if (!p || !p.主星.length) { tb.push(g + '（空宫）'); return; }
            p.主星.forEach(function (nm) {
              if (shown[nm]) return;
              var b = ZWS.brief14(nm); if (b) { tb.push(b); shown[nm] = 1; }
            });
          });
          if (tb.length) lines.push('三方四正：' + tb.join('；') + '。');
          // 命宫辅星（辅星是「加了什么料」，与主星分开讲）
          if (c.命宫.辅星) {
            var mn = c.命宫.辅星.split('、').map(function (nm) { return ZWS.lineMinor(nm) || (nm + '（星情未收录）'); });
            lines.push('命宫辅星：' + mn.join('；') + '。');
          }
          // 落宫简断：星 × 宫合成（明标合成，不当古籍断语）
          var comb = [];
          ['命宫', '财帛', '官禄'].forEach(function (g) {
            var p = P[g];
            if (!p) return;
            var arr = (g === '命宫' && !p.主星.length && 借) ? 借.split('、') : p.主星;
            arr.forEach(function (nm) { var x = ZWS.comb(nm, g); if (x) comb.push(x); });
          });
          if (comb.length) lines.push('落宫：' + comb.join('；') + '。');
          lines.push('星情口径：十四主星五行/化气取五源一致处（中華民國紫微斗數協會／新浪／易德轩／明明观止／《紫微斗数全书》），分歧处并列「一说」；「落宫」为星性与宫义的机械合成，非古籍逐条断语。');
        }
        return { text: lines.join('\n') };
      }
    },
    {
      key: 'iching', 名: '易经起卦',
      板块: '三式推演', 短名: '排易经',
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
      板块: '三式推演', 短名: '排梅花',
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
      key: 'zhouyi', 名: '周易 64 卦（卦辞·爻辞原文）',
      板块: '三式推演', 短名: '查卦辞',
      触发词: ['查卦', '周易', '64卦', '六十四卦', '周易卦', '卦名', '卦序', '卦辞', '爻辞', '地天泰', '水天需', '山火贲'],
      说明: '按卦名（如「地天泰」「泰」）或卦序（如「第11卦」）查该卦的卦辞、六条爻辞、大象与白话，附上下卦五行与体用生克；经文取《十三经》通行本。',
      run: function (ent, text) {
        var t = String(text || '');
        // 卦名（char）→ 先天数（1-8）反查
        var nameToNum = {};
        for (var n in ICE.BAGUA) nameToNum[ICE.BAGUA[n].名] = +n;
        // 反查表：卦全名 → HEX64 键（上卦名 + 下卦名）
        var keyByName = {};
        Object.keys(ICE.HEX64).forEach(function (k) { keyByName[ICE.HEX64[k]] = k; });

        // 经文里的句读会打断排版（结果页按「。」「；」切段），故只在**展示时**把句内
        // 句号/分号降为逗号、行末留一个句号；字句一个字都没改（见输出末行的说明）。
        function oneLine(s) {
          return String(s || '').replace(/[。；]+/g, '，').replace(/，$/, '。');
        }

        function render(order) {
          var tx = ICE.textOf(order);
          if (!tx) return { prompt: '没找到这一卦，请给卦名（如「地天泰」）或卦序（如「第11卦」）。' };
          var k = keyByName[tx.全名] || '';
          var up = k ? k.slice(0, 1) : '', dn = k ? k.slice(1) : '';
          var out = ['【周易】第 ' + tx.序 + ' 卦「' + tx.全名 + '」' + (up ? '（上' + up + '下' + dn + '）' : '') + '。'];
          out.push('卦辞：' + oneLine(tx.卦辞));
          if (tx.象) out.push('大象：' + oneLine(tx.象));
          // 六爻（乾坤多一条用九/用六）：一行一爻，「爻题 + 爻辞」
          out.push('爻辞：' + tx.爻.map(function (y) { return y[0] + '　' + oneLine(y[1]); }).join('\n'));
          // 体用（沿用原逻辑：以下卦 + 上卦叠六爻，以初爻为动）
          if (up && dn) {
            var yao = ICE.BAGUA[nameToNum[dn]].爻.concat(ICE.BAGUA[nameToNum[up]].爻);
            var ty = ICE.tiyong(yao, 0);
            out.push('体用（以初爻为动）：体「' + ty.体卦 + '」用「' + ty.用卦 + '」，' + ty.关系 + '。');
          }
          out.push('白话：' + oneLine(tx.白话));
          out.push('注：卦辞爻辞取《十三经》通行本（南京博物院十三经本，与维基文库互校），标点按阅读节奏处理，字句未改，白话为本应用主旨概括，非古籍原文。');
          return { text: out.join('\n') };
        }

        // ① 按卦序（第 N 卦）—— 必须走通行卦序表 ORDER_BY_NAME，不能拿 HEX64 的键序当卦序
        var seq = t.match(/第\s*([0-9一二三四五六七八九十百]+)\s*卦/);
        if (seq) {
          var num = numOf(seq[1]);
          if (num >= 1 && num <= 64) return render(num);
          return { prompt: '卦序须 1–64，请核对。' };
        }
        // ② 按卦全名（「地天泰」）查：走通行卦序表。
        //    不能用 keyByName —— 它的值是 HEX64 的「上卦+下卦」键（如「乾乾」），不是卦名，传进 textOf 定不到。
        for (var bn in ICE.ORDER_BY_NAME) if (t.indexOf(bn) >= 0) return render(ICE.ORDER_BY_NAME[bn]);
        // ③ 按单名（「泰」「贲」）查：逐字试定位，定不到就继续试下一个字。
        //    不用硬编码字表 —— 六十四卦单名有 60 来个，硬编码必然漏字（漏了就是静默答不出）。
        for (var ci = 0; ci < t.length; ci++) {
          var one = ICE.textOf(t.charAt(ci));
          if (one) return render(one.序);
        }
        return { prompt: '请给卦名（如「地天泰」「泰」）或卦序（如「第11卦」）。' };
      }
    },
    {
      key: 'bazhai', 名: '八宅命卦',
      板块: '风水堪舆', 短名: '查命卦',
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
      板块: '相术占验', 短名: '查小六壬',
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
      板块: '相术占验', 短名: '查生肖关系',
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
      板块: '相术占验', 短名: '查太岁',
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
      板块: '姓名测字', 短名: '解起名',
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
      板块: '风水堪舆', 短名: '解八等婚',
      触发词: ['八等婚', '八宅婚', '八宅合婚', '宅婚', '坐向', '宅卦', '东四西四', '大游年'],
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
      板块: '黄历择日', 短名: '查穿衣',
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
      板块: '相术占验', 短名: '查五行生克',
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
      板块: '姓名测字', 短名: '查五格',
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
      板块: '黄历择日', 短名: '查农历',
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
      板块: '黄历择日', 短名: '查还剩几天',
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
      板块: '占星天文', 短名: '排星盘',
      触发词: ['占星', '星盘', '七政', '四余', '黄经', '落座', '落宿', '二十八宿', '庙旺', '月亮星座', '太阳星座', '凯龙', '罗睺', '月孛'],
      说明: '出生时刻 10 曜（日月光金木水火土 + 罗睺/计都/月孛）回归黄经·落十二星座·落二十八宿（等宫近似）·庙旺（果老星宗）。七政走 astronomy-engine(JPL级)，三余走 Meeus 均值公式。',
      run: function (ent, text) {
        if (!ent || !ent.date || !ent.date.year) return { prompt: '占星/七政需要出生年月日，例如「1990年8月15日」（可含时辰，占星尽量给到时辰）。' };
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1, h = ent.time ? ent.time.hour : 12;
        if (!ASTRO || !ASTRO.positions) return { text: '【占星】星历内核未加载（vendor/astronomy.js 缺失），暂不可用。' };
        try {
          var p = ASTRO.positions({ y: y, m: m, d: d, h: h, tz: 8 });   // 输入为北京时间
          if (p.err) return { prompt: p.err };
          var lines = ['【占星·七政四余】' + y + '年' + m + '月' + d + '日' + h + '时（北京时间 UTC+8）各曜落座：'];
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
      板块: '三式推演', 短名: '排奇门',
      触发词: ['奇门', '奇门遁甲', '遁甲', '值符', '值使', '阴遁', '阳遁', '转盘法', '拆补法', '九星八门', '刻家奇门', '日家奇门', '年家奇门', '月家奇门'],
      说明: '某时刻完整奇门局（**只做时家**·转盘·拆补定局）：四柱/阴阳遁/局数/元/旬首/值符值使/地盘/天盘九星/八门/八神。年家/月家/日家/刻家四种另局本版未实现，问到时明说、不拿时家属局冒充。',
      run: function (ent, text) {
        if (!ent || !ent.date || !ent.date.year) return { prompt: '奇门遁甲需要起局年月日，例如「1990年8月15日」（尽量给到时辰，时家奇门以时辰起局）。' };
        // 家数守门：本版只有时家。年被问到时必须先说清楚，否则用户会把时家属局当年家局用（那是错盘）。
        var famM = String(text || '').match(/(年家|月家|日家|刻家)/);
        var famWarn = famM ? ('⚠️ 本版只实现**时家**奇门（以时辰定局）。你问的是「' + famM[1] + '奇门」，属另一套定局体系，本版未实现 —— 下面给的是**同一时刻的时家属局**，只能当参考，不能当' + famM[1] + '局使用。') : null;
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1, h = ent.time ? ent.time.hour : 0;
        if (!QM || !QM.chart) return { text: '【奇门】奇门内核未加载，暂不可用。' };
        try {
          var c = QM.chart({ y: y, m: m, d: d, h: h });
          if (c.err) return { prompt: c.err };
          var L = [];
          if (famWarn) L.push(famWarn);
          L.push('【奇门遁甲】' + y + '年' + m + '月' + d + '日' + h + '时（时家·转盘·拆补）：');
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
      板块: '三式推演', 短名: '排六壬',
      触发词: ['大六壬', '六壬', '月将加时', '月将加占时', '四课', '三传', '十二天将', '天乙贵人', '贵人', '伏吟', '返吟', '涉害', '蒿矢', '弹射', '遥克', '重审', '元首', '别责', '八专', '昴星', '井栏'],
      说明: '某时刻完整六壬课（时家·月将加占时）：四柱/月将/占时/天地盘/四课/**九宗门全门**发用（贼克·比用·涉害·遥克·昴星·别责·八专·伏吟·返吟）/三传/十二天将（贵人昼夜+顺逆布将）/旬空/驿马/三传遁干。多源条文核对 + 古籍黄金课例锁死（零臆造）。',
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
          L.push('（' + c.发用.说明 + '）');
          L.push('（九宗门全门已按《大六壬指南》《心印赋》《六壬大全》《探源》多源条文实现，并由古籍黄金课例逐条锁死；'
            + '涉害藏干/季无取/元首重审混见次序/金口诀贵人顺逆异说/夜子日柱 等细分项内核已如实标注，不假报已锁。）');
          return { text: L.join('\n') };
        } catch (e) {
          return { text: '【大六壬】起课失败：' + String(e && e.message ? e.message : e) + '（内核暂不可用，不影响其他功能）。' };
        }
      }
    },
    {
      key: 'taiyi', 名: '太乙神数',
      板块: '三式推演', 短名: '排太乙',
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
      板块: '三式推演', 短名: '排六爻',
      触发词: ['六爻', '纳甲', '摇卦', '铜钱卦', '爻', '世应', '六亲', '卦象详解'],
      说明: '铜钱起卦（指定 6 次背数或自动）→ 本卦/变卦/八宫纳甲/安世应/六亲/六神/旬空月破（C18 内核，京房纳甲）+ 分门断语：按《黄金策》「用神—原神—忌神」生克结构判求财/婚姻/疾病/官讼/功名/出行六门，逐条给出加减分依据。',
      run: function (ent, text) {
        if (!LY || !LY.cast) return { text: '【六爻】内核未加载，暂不可用。' };
        try {
          var inp = {};
          // 尝试从文本解析 6 次背数（如「背 3 1 2 0 3 2」）
          var m = String(text || '').match(/背\s*([0-3\s,，、]+)/);
          if (m) {
            // 按「数字段」切：「背 3 1 2 0 3 2 2026年」里最后那个 2026 是年份、不是背数，须剔掉
            var bs = m[1].split(/[^\d]+/).filter(function (x) { return x !== '' && +x <= 3; }).map(Number);
            if (bs.length >= 6) inp.backs = bs.slice(0, 6);
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
          // 分门断语（v3.1.16）：用神—原神—忌神 生克推演
          var men = LY.menOf(String(text || '')) || (inp.事 ? (LY.menOf(inp.事) || null) : null);
          if (men && LY.menJudge) {
            var mj = LY.menJudge(c, men, { 性别: (ent && ent.gender === 'female') ? '女' : '男' });
            if (!mj.err) {
              L.push('【' + mj.门 + '门】用神「' + mj.用神 + '」（' + mj.用神五行 + '），原神「' + mj.原神 + '」，忌神「' + mj.忌神 + '」→ ' + mj.判 + '（' + (mj.分 >= 0 ? '+' : '') + mj.分 + ' 分）。');
              L.push('依据：' + mj.依据.join('；') + '。');
              L.push('口径：' + mj.说明 + '门义——' + mj.备注 + '。');
            }
          } else {
            L.push('分门断语：要按《黄金策》用神体系断，请说明所问之事（求财 / 婚姻 / 疾病 / 官讼 / 功名 / 出行）。');
          }
          if (c.缺料) L.push('（' + c.缺料 + '）');
          return { text: L.join('\n') };
        } catch (e) {
          return { text: '【六爻】起卦失败：' + String(e && e.message ? e.message : e) };
        }
      }
    },
    {
      key: 'astro-xiangwei', 名: '占星·相位',
      板块: '占星天文', 短名: '解相位',
      触发词: ['相位', '星盘相位', '合相', '冲相', '拱相', '刑相'],
      说明: '本命盘 10 曜两两相位（合/六合/刑/拱/冲 + 小相位，含容许度，C19 内核 §8.2）。',
      run: function (ent, text) {
        if (!ent || !ent.date || !ent.date.year) return { prompt: '占星相位需要出生年月日，例如「1990年8月15日 相位」。' };
        if (!ASTRO || !ASTRO.aspects) return { text: '【占星相位】内核未加载。' };
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1, h = ent.time ? ent.time.hour : 12;
        var a = ASTRO.aspects({ y: y, m: m, d: d, h: h, tz: 8 });
        if (a.err) return { prompt: a.err };
        var L = ['【占星·相位】' + a.时刻 + '（参与 ' + a.参与.length + ' 曜）：'];
        L.push(a.相位.length ? a.相位.map(function (x) { return x.a + ' ' + x.类型 + ' ' + x.b + '(' + x.夹角 + '°/容许' + x.容许 + ')'; }).join('；') : '无明显相位。');
        return { text: L.join('\n') };
      }
    },
    {
      key: 'astro-tuiyun', 名: '占星·推运（次限/行运/返照/法达）',
      板块: '占星天文', 短名: '排推运',
      触发词: ['推运', '次限', '行运', '三限', '太阳返照', '月亮返照', '法达', '星限'],
      说明: '次限推运（1 天=1 年，本命+岁数）/ 行运（指定日天象对本命相位）/ 太阳返照盘（太阳回到本命黄经那一刻起盘）/ 法达星限（日夜盘九期 + 七等分副运，C19 内核 §8.3/§8.6/§8.7）。',
      run: function (ent, text) {
        if (!ent || !ent.date || !ent.date.year) return { prompt: '推运需要出生年月日，例如「1990年8月15日 推运 30岁」「1990年8月15日 法达」。「行运」另给目标日期，如「1990年8月15日 2026年10月17日 行运」。' };
        if (!ASTRO) return { text: '【推运】内核未加载。' };
        var t = String(text || '');
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1, h = ent.time ? ent.time.hour : 12;
        var nat = { y: y, m: m, d: d, h: h, tz: 8 };
        var ageM = t.match(/(\d+)\s*岁/);
        var age = ageM ? +ageM[1] : (new Date().getFullYear() - y);
        var more = '（「行运」加日期看行运、「太阳返照」看年度返照盘、「法达」看时段主星。）';

        // ① 法达星限（纯时段体系，不依赖星历）
        if (t.indexOf('法达') >= 0 || t.indexOf('星限') >= 0) {
          if (!ASTRO.firdaria) return { text: '【法达】内核未加载。' };
          var f = ASTRO.firdaria(nat, { age: age });
          if (f.err) return { prompt: f.err };
          var L = ['【占星·推运】法达星限：' + f.盘别 + '，' + f.判定 + '。'];
          L.push('当前 ' + (f.年龄 != null ? f.年龄 + ' 岁：' : '') + '大运「' + f.当前大运 + '」，副运「' + f.当前副运 + '」。');
          L.push('九期（合计 ' + f.周期总年 + ' 年，满期从首期重新起算）：' + f.大运.map(function (r) { return r.主星 + ' ' + r.起 + '–' + r.止 + '岁'; }).join('，'));
          if (f.副运表) L.push('本大运七副运：' + f.副运表.map(function (s) { return s.副星 + ' ' + s.起 + '–' + s.止 + '岁'; }).join('，'));
          L.push('注：' + f.缺口);
          return { text: L.join('\n') };
        }
        // ② 太阳返照盘
        if (t.indexOf('返照') >= 0) {
          if (t.indexOf('月亮返照') >= 0) {
            return { prompt: '月亮返照（每月一次返照盘）本版未实现，不拿别的盘冒充。现有可算：太阳返照（说「太阳返照」）、次限、行运、法达。' };
          }
          if (!ASTRO.solarReturn) return { text: '【返照】内核未加载。' };
          var yrM = t.match(/(19|20)\d{2}/g);
          var yr = yrM && yrM.length ? +yrM[yrM.length - 1] : new Date().getFullYear();
          var sr = ASTRO.solarReturn(nat, yr);
          if (sr.err) return { prompt: sr.err };
          var S = ['【占星·推运】太阳返照 ' + yr + ' 年：太阳回到本命黄经（' + sr.返照黄经['太阳'].toFixed(2) + '°）的时刻 = ' + sr.返照时刻本地 + '。'];
          // 星座是 {星座,符号,度数} 对象，别直接拼（会打出 [object Object]）
          var fmtSign = function (k) { var g = sr.返照星座[k]; return g ? (g.星座 + g.度数.toFixed(1) + '°') : ''; };
          S.push('返照盘（上升未定则只列行星）：' + ['太阳', '太阴', '水星', '金星', '火星', '木星', '土星'].filter(function (k) { return sr.返照黄经[k] != null; }).map(function (k) { return k + ' ' + sr.返照黄经[k].toFixed(2) + '°（' + fmtSign(k) + '）'; }).join('，'));
          S.push('返照对本命相位：' + (sr.与本命相位.length ? sr.与本命相位.filter(function (x) { return x.精准; }).map(function (x) { return x.a + '　' + x.类型 + '　' + x.b; }).join('，') || '无（取精准相位；全部 ' + sr.与本命相位.length + ' 条）' : '无显著相位'));
          S.push('注：返照盘取「太阳回照那一刻」，不按生日当天零点/正午取整，取整即是另一张盘。' + more);
          return { text: S.join('\n') };
        }
        // ③ 行运（可指定日期；不给则按今天）
        if (t.indexOf('行运') >= 0) {
          if (!ASTRO.transits) return { text: '【行运】内核未加载。' };
          var dm = t.match(/((?:19|20)\d{2})\s*[年\-./]\s*(\d{1,2})\s*[月\-./]\s*(\d{1,2})/);
          var today = new Date();
          var tgt = dm ? { y: +dm[1], m: +dm[2], d: +dm[3], h: 12, tz: 8 }
            : { y: today.getFullYear(), m: today.getMonth() + 1, d: today.getDate(), h: 12, tz: 8 };
          var tr = ASTRO.transits(nat, tgt);
          if (tr.err) return { prompt: tr.err };
          var hit = tr.行运相位.filter(function (x) { return x.精准; });
          var T = ['【占星·推运】行运：本命 ' + tr.本命 + ' ← ' + tr.行运日 + '：'];
          T.push('精准行运相位（容许度内）：' + (hit.length ? hit.map(function (x) { return x.a + '　' + x.类型 + '　' + x.b; }).join('，') : '无'));
          T.push('全部行运相位 ' + tr.行运相位.length + ' 条，取前 8 条：' + tr.行运相位.slice(0, 8).map(function (x) { return x.a + x.类型 + x.b; }).join('，'));
          T.push('注：行运星＝该日实际天象，对本命盘取相位（容许度按主/小相位各自 orb）；想换日期就把日期写进问题。' + more);
          return { text: T.join('\n') };
        }
        // ④ 默认：次限推运
        var p = ASTRO.progressions(nat, age);
        if (p.err) return { prompt: p.err };
        var L2 = ['【占星·推运】次限（1 天 = 1 年）：本命 ' + p.本命时刻 + '，' + age + ' 岁次限 ' + p.次限基准 + '：'];
        // 相位可能几十条，全铺一屏没人看得下去：先给容许度内的「精准」相位，再报总数
        var ph = p.次限相位 || [], tight = ph.filter(function (x) { return x.精准; });
        L2.push('次限精准相位（容许度内）：' + (tight.length ? tight.map(function (x) { return x.a + '　' + x.类型 + '　' + x.b; }).join('，') : '无'));
        if (ph.length > tight.length) L2.push('（另有容许度边缘的 ' + (ph.length - tight.length) + ' 条，共 ' + ph.length + ' 条；只为不漏，不逐一铺开。）');
        L2.push('注：次限按「出生后 1 天 = 1 年」推进。' + more.replace('（', '（另有'));
        return { text: L2.join('\n') };
      }
    },
    {
      key: 'astro-hepan', 名: '占星·合盘',
      板块: '占星天文', 短名: '解合盘',
      触发词: ['合盘', '双人合盘', 'Synastry', '比较盘', '双人星盘'],
      说明: '双人本命盘行星相位比较（Synastry），需两人出生时间（C19 内核 §8.4）。',
      run: function (ent, text) {
        if (!ASTRO || !ASTRO.synastry) return { text: '【合盘】内核未加载。' };
        return { prompt: '双人合盘需要两位的出生年月日，例如「1990年8月15日 与 1988年3月20日 合盘」（可含时辰）。' };
      }
    },
    {
      key: 'astro-vedic', 名: '占星·印占（Vedic）',
      板块: '占星天文', 短名: '排印占',
      触发词: ['印占', 'Vedic', '吠陀', '恒星黄道', '二十七宿', 'Nakshatra', 'Vimshottari', '罗睺'],
      说明: '印占盘：恒星黄经（Lahiri 岁差近似）+ 二十七宿 + Vimshottari 大限（以月亮宿起限，C19 内核 §8.5）。',
      run: function (ent, text) {
        if (!ent || !ent.date || !ent.date.year) return { prompt: '印占需要出生年月日，例如「1990年8月15日 印占」。' };
        if (!ASTRO || !ASTRO.vedicPositions) return { text: '【印占】内核未加载。' };
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1, h = ent.time ? ent.time.hour : 12;
        var v = ASTRO.vedicPositions({ y: y, m: m, d: d, h: h, tz: 8 });
        if (v.err) return { prompt: v.err };
        var L = ['【印占 Vedic】' + v.时刻 + '：岁差 Ayanamsa ' + v.ayanamsa + '。'];
        L.push('月亮宿：' + v.月亮宿 + '；Vimshottari 起限「' + v.Vimshottari.起限星 + '」，大限序 ' + v.Vimshottari.大限序.join('→') + '（共 ' + v.Vimshottari.总年 + ' 年）。');
        L.push('（' + v.缺料 + '）');
        return { text: L.join('\n') };
      }
    },
    {
      key: 'yangzhai', 名: '阳宅风水',
      板块: '风水堪舆', 短名: '查阳宅',
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
      板块: '相术占验', 短名: '查面相',
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
      板块: '相术占验', 短名: '解灵签',
      触发词: ['观音灵签', '灵签', '抽签', '求签', '第几签', '签诗', '解梦', '梦到', '梦见', '做梦', '塔罗', '占星骰子', '答案之书', '雷诺曼', '如尼'],
      说明: '签文/解梦/塔罗词库：观音灵签 100 签全本（签诗四句·诗意·解曰·圣意，三源比对）、塔罗 78 张、解梦词典（14 类 161 条，传统向 + 心理向双栏并列）、占星骰子、答案之书（C21b 内核 §17）。',
      run: function (ent, text) {
        if (!QW) return { text: '【签文/塔罗】内核未加载。' };
        var t = String(text || '');
        if (t.indexOf('观音') >= 0 || t.indexOf('灵签') >= 0 || t.indexOf('抽签') >= 0 || t.indexOf('求签') >= 0) {
          // ① 指定签号（「第11签」「第十一签」）→ 直接查那一签
          // ② 指定签名（「观音 苏秦不第」）→ 按典故名查
          // ③ 都没给 → 按日期抽（同日同签，不靠随机数）
          var g = null, byNum = t.match(/第\s*([0-9一二三四五六七八九十百]+)\s*签/);
          if (byNum) {
            g = QW.guanyinByNo(numOf(byNum[1]));
            if (!g) return { prompt: '观音灵签共 100 签，签号请给 1–100（如「第11签」「第一百签」）。' };
            g.总签数 = QW.GUANYIN_COUNT;
          } else {
            g = QW.guanyinByName(t.replace(/观音|灵签|抽签|求签|签文|签|查|看看|一下|的|\s/g, ''));
            if (g) g.总签数 = QW.GUANYIN_COUNT;
          }
          if (!g) {
            g = QW.guanyinDraw(ent && ent.date ? (ent.date.year + '-' + (ent.date.month || 1) + '-' + (ent.date.day || 1)) : undefined);
            if (!g || !g.签名) return { text: '【观音灵签】签文数据未加载。' };
          }
          // 签诗四句一行一句（结果页按换行分段，正好一句一行）
          var poem = (g.签诗 || []).map(function (s, i) { return (i === 0 ? '签诗：' : '　　　') + s; }).join('\n');
          var out = ['【观音灵签】第 ' + g.签号 + ' 签 / 共 ' + g.总签数 + ' 签「' + g.签名 + '」' + g.等级 + '签（' + g.宫位 + '·' + g.吉凶 + '）。'];
          if (poem) out.push(poem);
          if (g.诗意) out.push('诗意：' + g.诗意);
          if (g.解曰) out.push('解曰：' + g.解曰);
          if (g.圣意) out.push('圣意：' + g.圣意);
          out.push('注：签文取《观音一百签》传统文本（天天灵签网 / 农历114 / 观音灵签解签 三源比对），标点按阅读节奏处理、字句未改，' + (g.注 || '') + '要查别的签，直接说「第 11 签」或「苏秦不第」。');
          return { text: out.join('\n') };
        }
        if (t.indexOf('塔罗') >= 0) {
          return { text: '【塔罗】78 张：大阿尔克纳 22（' + QW.MAJOR.map(function (x) { return x[0]; }).join('、') + '…）+ 小阿尔克纳 56（权杖/圣杯/宝剑/星币 × A–10+侍者骑士王后国王）。可指定牌名查正逆位（如「塔罗 愚人」）。' };
        }
        if (t.indexOf('解梦') >= 0 || /梦到|梦见|做梦|梦里/.test(t)) {
          if (!QW.dreamMatch) return { text: '【解梦】词库未加载。' };
          var 梦词 = t.replace(/解梦/g, ' ');
          var hitD = QW.dreamMatch(梦词);
          // ① 指定了分类（「解梦 动物」「解梦里有哪些动物」）→ 列该类全部词条
          var catHit = null;
          QW.DREAM_CATS.forEach(function (c) { if (梦词.indexOf(c) >= 0) catHit = c; });
          if (hitD && !(catHit && hitD.词.length < 2)) {
            var L = ['【解梦】梦见「' + hitD.词 + '」（' + hitD.类别 + '类）：'];
            L.push('传统向：' + hitD.传统 + '。');
            L.push('心理向：' + hitD.心理 + '。');
            var same = QW.dreamList(hitD.类别).map(function (x) { return x.词; }).filter(function (w) { return w !== hitD.词; });
            L.push('同类可查（' + hitD.类别 + '，共 ' + (same.length + 1) + ' 条）：' + same.slice(0, 12).join('、') + (same.length > 12 ? '…' : '') + '。');
            L.push('口径：传统向取民间《周公解梦》一系通行说法（此书无权威定本，各辑本互有出入），措辞为「旧说/民间谓」不作断言；心理向为现代释梦通识归纳，属一种读法。两栏并列，本应用不裁谁对。');
            return { text: L.join('\n') };
          }
          if (catHit) {
            var lst = QW.dreamList(catHit);
            return {
              text: '【解梦】' + catHit + '类共 ' + lst.length + ' 条：' + lst.map(function (x) { return x.词; }).join('、')
                + '。\n说具体梦象即可（如「梦到蛇」），会给传统向 + 心理向两栏。'
            };
          }
          if (!hitD) {
            var cats = QW.dreamCats();
            return {
              text: '【解梦】词库现有 ' + QW.dreamCount() + ' 条 / ' + cats.length + ' 类：'
                + cats.map(function (x) { return x.类别 + '(' + x.词数 + ')'; }).join('、')
                + '。\n这个梦象暂未收录 —— 不硬编一个解释给你。可换个说法（如「梦到蛇」「梦见掉牙」），或按类别查（「解梦 动物」）。'
            };
          }
          return { text: '【解梦】词库未加载。' };
        }
        if (t.indexOf('占星骰子') >= 0) {
          var d = QW.astroDice(0, 0, 0);
          return { text: '【占星骰子】组合 = 行星(做什么)·星座(怎样)·宫位(在哪)，共 10×12×12=1440 类。示例：' + d.行星 + '在' + d.星座 + '于' + d.宫位 + ' → ' + d.解读 + '。' };
        }
        if (t.indexOf('雷诺曼') >= 0) {
          var hitL = null;
          for (var li = 0; li < QW.LENORMAND.length; li++) {
            if (t.indexOf(QW.LENORMAND[li].名) >= 0) { hitL = QW.LENORMAND[li]; break; }
          }
          if (hitL) return { text: '【雷诺曼】第 ' + hitL.编号 + ' 张「' + hitL.名 + '」\n关键词：' + hitL.关键词 + '\n牌义：' + hitL.牌义 };
          return {
            text: '【雷诺曼】共 36 张：' + QW.LENORMAND.map(function (c) { return c.编号 + c.名; }).join('、')
              + '。\n可指定牌名或编号查询，如「雷诺曼 心」「雷诺曼 24」。'
          };
        }
        if (t.indexOf('如尼') >= 0) {
          var mr = t.match(/如尼\s*([^\s，。、]+)/);
          var hitR = QW.runeCard(mr ? mr[1] : '');
          if (hitR) return { text: '【如尼】' + hitR.符 + ' ' + hitR.罗马音 + '（' + hitR.中名 + '）\n关键词：' + hitR.关键词 + '\n符义：' + hitR.符义 };
          return {
            text: '【如尼】古弗萨克（Elder Futhark）共 24 符：' + QW.RUNES.map(function (r) { return r.符 + r.中名; }).join('、')
              + '。\n可指定查询，如「如尼 太阳」「如尼 Sowilo」。'
          };
        }
        if (t.indexOf('答案') >= 0) {
          var a = QW.answerBook();
          return { text: '【答案之书】' + a.句 + '\n' + a.注 };
        }
        return { prompt: '请指明：观音灵签 / 塔罗 / 解梦 / 占星骰子 / 雷诺曼 / 如尼 / 答案之书（如「抽观音灵签」「塔罗 愚人」「梦到蛇」「雷诺曼 心」）。' };
      }
    },
    {
      key: 'cezi', 名: '测字（拆字·会意）',
      板块: '姓名测字', 短名: '解测字',
      触发词: ['测字', '拆字', '一字', '字卜', '看字', '问字', '字义', '笔划测', '这个字'],
      说明: '测字 C22：康熙笔画(单一真源) → 数理五行(尾数) + 先天八卦起卦(笔画%8) + 增删变字 + 与所问事类生克比对。部首自动判定不可行(汉字为单一码点)，已如实标注。',
      run: function (ent, text) {
        if (!CZ) return { text: '【测字】内核未加载。' };
        var t = String(text || '');
        // 抽字：优先取「测字/拆字/看字/问字」后紧跟的第一个汉字
        var ch = null;
        var patt = /(?:测字|拆字|看字|问字|一字|字卜|字义|笔划测|这个字)\s*([一-鿿])/;
        var m = t.match(patt);
        if (m) ch = m[1];
        else {
          // 兜底：取文本里第一个汉字（排除触发词本身）
          var stripped = t.replace(/测字|拆字|看字|问字|一字|字卜|字义|笔划测|这个字|测|字|拆|看|问|卜/g, '');
          var m2 = stripped.match(/[一-鿿]/);
          if (m2) ch = m2[0];
        }
        if (!ch) return { prompt: '测字需要给一个汉字，例如「测字 好」「看字 财」。' };
        // 事类：命中 YONG/SHI_WX 关键字
        var shi = null;
        var SHI_KEYS = ['财运', '求财', '生意', '事业', '功名', '学业', '文书', '考试', '婚姻', '感情', '家宅', '疾病', '出行', '生育', '官司', '朋友', '自身'];
        for (var i = 0; i < SHI_KEYS.length; i++) { if (t.indexOf(SHI_KEYS[i]) >= 0 && CZ.SHI_WX[SHI_KEYS[i]] !== undefined) { shi = SHI_KEYS[i]; break; } }
        var r = CZ.analyze({ 字: ch, 事: shi });
        if (r.err) return { prompt: r.err };
        var head = '【测字】「' + r.字 + '」' + (shi ? '（所问：' + shi + '）' : '');
        if (r.缺字.length) return { text: head + '\n' + r.缺料 + '\n' + r.说明 };
        var body = r.断语.join('\n');
        return { text: head + '\n' + body + '\n' + r.说明 };
      }
    },
    {
      key: 'qimen-fei', 名: '飞盘奇门（飞宫法）',
      板块: '三式推演', 短名: '排飞盘',
      触发词: ['飞盘奇门', '飞盘', '飞宫', '飞宫法', '九星飞布', '飞布奇门'],
      说明: '奇门另一大流派 C23：前三步(四柱/定局/地盘)复用 qimen.js 单一真源，天/人/神三盘按宫数「飞」（阳遁顺飞、阴遁逆飞）；九星九宫数序、八门跳中五、用九神。飞布几何已按黄金范例锁死。',
      run: function (ent, text) {
        if (!QF) return { text: '【飞盘奇门】内核未加载。' };
        if (!ent || !ent.date) return { prompt: '飞盘奇门需占局时刻，例如「飞盘奇门 2026年8月15日14时」。' };
        var r = QF.feiChart({ y: ent.date.year, m: ent.date.month || 1, d: ent.date.day || 1, h: (ent.time && ent.time.hour) || 12 });
        if (r.err) return { text: '【飞盘奇门】' + r.err };
        // 九宫展示序（巽4 离9 坤2 / 震3 中5 兑7 / 艮8 坎1 乾6）
        var order = [4, 9, 2, 3, 5, 7, 8, 1, 6];
        var grid = [];
        for (var i = 0; i < 9; i += 3) {
          var row = [];
          for (var j = 0; j < 3; j++) {
            var p = order[i + j];
            row.push(p + '宫 ' + (r.地盘[p] || '—') + (r.天盘[p] ? '·' + r.天盘[p].replace('天', '') : '')
              + (r.八门[p] ? '·' + r.八门[p] : '') + (r.九神[p] ? '·' + r.九神[p] : ''));
          }
          grid.push(row.join(' │ '));
        }
        return {
          text: '【飞盘奇门·飞宫法】' + r.时刻 + ' ' + r.阴阳遁 + r.局数 + '局（' + r.节气 + '·' + r.元 + '元）\n'
            + '旬首 ' + r.旬首 + '（' + r.旬首宫 + '宫）｜值符 ' + r.值符星 + ' 落 ' + r.时干宫 + '宫｜值使 ' + r.值使门 + ' 落 ' + r.值使落宫 + '宫\n'
            + '四柱 ' + r.四柱.年 + ' ' + r.四柱.月 + ' ' + r.四柱.日 + ' ' + r.四柱.时 + '\n'
            + '── 九宫（地盘仪·天盘星·八门·九神）──\n' + grid.join('\n') + '\n'
            + '（中五宫有星无门；地盘中五保留不寄坤，与转盘不同）\n'
            + r._飞布验证
        };
      }
    },
    {
      key: 'bazi-pattern', 名: '八字格局·喜用神',
      板块: '命理排盘', 短名: '解格局',
      触发词: ['八字格局', '格局取用', '格局成败', '喜用神', '用神喜忌', '调候用神', '通关用神', '身强弱', '日主强弱', '取格', '什么格', '格局'],
      说明: '八字格局·用神 C25：在 C07 八字排盘之上补「断」的最后一公里——《子平真诠》八格取法四步（本气透干 → 藏干透干 → 本气 → 禄刃归外格：阳干帝旺称阳刃、阴干帝旺称月劫）+ 八格/外格成败 +《穷通宝鉴》十干十二月调候表（120 项）+ 通关 + 扶抑，三路用神并列给出并标注冲突，不合并成单一断言。',
      run: function (ent, text) {
        if (!BP || !BP.analyze) return { text: '【八字格局·用神】内核未加载。' };
        if (!ent || !ent.date || !ent.date.year) return { prompt: '看格局需要出生年月日，例如「1990年8月15日14时 看格局」（时辰缺失按 14 时补）。' };
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1, h = ent.time ? ent.time.hour : 14;
        var g = zhGender(ent) || '男';
        var r = BP.analyze({ y: y, m: m, d: d, h: h, gender: g, name: ent.name || '命主' });
        if (r.err) return { text: '【八字格局·用神】' + r.err };
        var ge = r.格局;
        var L = ['【八字格局·用神】' + (ent.name || '命主') + '（' + g + '）' + y + '年' + m + '月' + d + '日' + h + '时。'];
        L.push('四柱：年' + r.四柱.年 + ' 月' + r.四柱.月 + ' 日' + r.四柱.日 + ' 时' + r.四柱.时 + '。');
        L.push('日主：' + r.日主 + '；月令：' + r.月令 + '。');
        L.push('格局：' + ge.名 + '（' + ge.类别 + (ge.禄刃 ? '·' + ge.禄刃 + '位' : '') + '）' + (ge.透干 ? '，透干' + ge.透干 : '') + '。');
        L.push('取格依据：' + ge.依据);
        L.push('成格要：' + r.格局成败.成格要);
        L.push('破格忌：' + r.格局成败.破格忌);
        L.push('身强弱：' + r.身强弱.判 + '（加权' + r.身强弱.加权分 + '分，得令' + (r.身强弱.得令 ? '是' : '否') + '，得地' + r.身强弱.得地 + '，得势' + r.身强弱.得势 + '）。');
        L.push('调候：' + (r.调候.第一用神 ? (r.调候.全表次第.join('、') + '（首项为主）；' + r.调候.说明) : r.调候.说明));
        L.push('通关：' + (r.通关.length ? r.通关.map(function (t) { return t.说明; }).join('；') : '全局无两行并旺相战，无需通关。'));
        L.push('用神：扶抑取' + r.用神.扶抑 + '、调候取' + (r.用神.调候 || '—') + '、通关取' + (r.用神.通关 || '—') + '，综合主用' + r.用神.综合主用 + '。');
        if (r.用神.冲突提示) L.push('冲突：' + r.用神.冲突提示);
        L.push('喜忌：' + r.喜忌.参考);
        if (r.外格提示.length) L.push('外格：' + r.外格提示.join('；'));
        L.push('标注：' + r.缺口.replace(/\n/g, '；'));
        return { text: L.join('\n') };
      }
    },
    {
      key: 'zeri', 名: '择日学（主动择吉）',
      板块: '黄历择日', 短名: '查吉日',
      触发词: ['择日', '择吉', '吉日', '黄道吉日', '选日子', '选个日子', '选个好日子', '挑日子', '哪天适合', '吉时', '日课', '好日子'],
      说明: '择日学 C24：给定「事项 + 日期范围（+ 命主属相）」逐日算日课并评分排序。日课全程复用 lunar.js 底座（通书宜忌 getDayYi/Ji、二十八宿 getXiu/XiuLuck、彭祖百忌、日冲生肖）+ 建除十二神（日支−节气月建支）黄黑道口诀；吉时走「起青龙诀 (2×日支序+8)%12」+ 五不遇时 + 天乙贵人（古籍《金函玉镜》卷六原文）。另收四项专项凶日：杨公忌十三日、红沙日（四孟酉/四仲巳/四季丑，按月建）、三娘煞六日、嫁娶周堂八位轮值。评分权重透明列出，如实标注「不等于专业日师完整日课」。',
      run: function (ent, text) {
        if (!ZR || !ZR.select) return { text: '【择日·黄道吉日】内核未加载。' };
        var t = String(text || '');
        // 起始日：优先 ent.date，缺省今天
        var now = new Date();
        var y = (ent && ent.date && ent.date.year) || now.getFullYear();
        var m = (ent && ent.date && ent.date.month) || (now.getMonth() + 1);
        var d = (ent && ent.date && ent.date.day) || now.getDate();
        // 天数：文本里「N 天/日」「一周/两周」「一个月」→ 对应；缺省 30 天
        var days = 30;
        // 只认「N 天」或「未来/接下来/近/后 N 日」，避免把「11月1日」的「1日」当天数
        var md = t.match(/([0-9一二三四五六七八九十]+)\s*天/) || t.match(/(?:未来|接下来|近|后)\s*([0-9一二三四五六七八九十]+)\s*日/);
        if (md) days = cnNum(md[1]);
        if (/一周|一个星期|近七天|未来七天/.test(t)) days = 7;
        if (/两周|半个月/.test(t)) days = 15;
        if (/一个月|三十天/.test(t)) days = 30;
        if (days > 90) days = 90;                   // 上限 90 天（避免长图过长）
        // 属相：ent.zodiac 或文本里的生肖字
        var sx = (ent && ent.zodiac) || pullZodiac(t) || '';
        var r = ZR.select({ 事项: t, 起: { y: y, m: m, d: d }, 天数: days, 属相: sx });
        if (r.err) return { prompt: '【择日·黄道吉日】' + (r.提示 || r.err) + '例如「结婚择日 2026年11月1日起30天，属鸡」。' };
        var L = ['【择日·黄道吉日】事项：' + r.事项 + '，范围 ' + r.范围 + (r.属相 ? '，命主属相' + r.属相 : '') + '。'];
        L.push('权重：' + r.权重说明);
        for (var i = 0; i < r.推荐.length; i++) {
          var x = r.推荐[i];
          var tag = ['首选', '次选', '备选'][i];
          L.push('推荐' + tag + '：' + x.公历 + '（' + x.农历 + '·' + x.星期 + '）' + x.干支 + '，' + x.建除 + '日（' + (x.吉凶档 === '黄道' ? '黄道' : x.吉凶档 + '·' + x.道 + '道') + '）。');
          L.push('宜忌：宜' + x.宜.slice(0, 8).join('、') + '；忌' + x.忌.slice(0, 8).join('、') + '。');
          L.push('宿神：' + x.二十八宿 + '宿' + x.宿吉凶 + '；冲' + x.冲 + (x.冲命主 ? '（冲命主属相，减分）' : '') + '；煞' + x.煞 + '。');
          L.push('吉时：' + (x.吉时.吉时.length ? x.吉时.吉时.map(function (h) { return h.时干支 + '（' + h.神 + '·' + h.时段 + '时）'; }).join('、') : '当日无黄道吉时') + '，青龙起' + x.吉时.起青龙 + '时。');
          // 专项凶日（v3.1.12）：总分居前也可能犯煞，逐条点出不藏着
          var xz = xzOf(x, r.事项);
          if (xz.length) L.push('提醒：此日另犯「' + xz.join('、') + '」，虽总分居前仍宜复核（扣分已计入明细）。');
          L.push('得分：' + x.分 + '分 —— ' + x.评分明细.join('；') + '。');
        }
        if (r.最忌) L.push('最忌：' + r.最忌.公历 + '（' + r.最忌.建除 + '日·' + r.最忌.吉凶档 + '，' + r.最忌.分 + '分），宜避开。');
        // 专项凶日名单：把范围内所有犯煞的日子一次列清，方便直接划掉
        var ys = [], hs = [], sn = [], zt = [];
        for (var j2 = 0; j2 < r.日课.length; j2++) {
          var q = r.日课[j2], qd = mdOf(q.公历);
          if (q.杨公忌) ys.push(qd + '（农历' + lunarMonthCN(q.农历月) + '月' + lunarDayCN(q.农历日) + '）');
          if (q.红沙) hs.push(qd + '（' + q.月建 + '月' + q.日支 + '日）');
          if (r.事项 === '嫁娶') {
            if (q.三娘煞) sn.push(qd);
            if (q.周堂 && q.周堂.杀) zt.push(qd + '（值' + q.周堂.位 + '）');
          }
        }
        L.push('杨公忌：' + (ys.length ? ys.join('、') + '，古谓「百事不宜」，一律避开' : '本范围内无（农历十三忌日不在其中）') + '。');
        L.push('红沙日：' + (hs.length ? hs.join('、') + '，主诸事不宜，宜避开' : '本范围内无') + '。');
        if (r.事项 === '嫁娶') {
          L.push('三娘煞：' + (sn.length ? sn.join('、') + '，主忌嫁娶' : '本范围内无') + '。');
          L.push('嫁娶周堂：' + (zt.length ? '周堂杀在 ' + zt.join('、') + '，忌嫁娶；值堂·第·灶·厨为吉' : '本范围内无周堂杀（值堂第灶厨为吉，值翁姑无翁姑者可用）') + '。');
        } else {
          L.push('另注：三娘煞、嫁娶周堂只主嫁娶（本内核仅对嫁娶事项计分，不拿它连累其它事项）。');
        }
        L.push('标注：' + String(r.缺口).replace(/。\s*\n/g, '；').replace(/\n/g, '；'));
        return { text: L.join('\n') };
      }
    },
    {
      key: 'qimen-ge', 名: '奇门吉凶格局库',
      板块: '三式推演', 短名: '解奇门格局',
      触发词: ['奇门格局', '吉凶格局', '奇门吉凶', '十干克应', '九遁', '三奇得使', '玉女守门', '青龙返首', '飞鸟跌穴', '五不遇时', '六仪击刑', '三奇入墓'],
      说明: '奇门吉凶格局库 C26：在 qimen.js 盘面之上判格局——十干克应 81 格（天盘干+地盘干，易德轩 81 格全表）+ 吉格（九遁/三奇得使/玉女守门/三奇升殿/天显时/三诈/五假/交泰/奇仪相合）+ 凶格（五不遇时/六仪击刑/三奇入墓/三奇受制/门迫/庚格岁·月·日·时/伏吟）。异名（如庚丁「金屋藏娇/亭亭之格/玉女刑杀」）并列标注；吉格须合门星神旺衰，破格提示如实给出。',
      run: function (ent, text) {
        if (!QG || !QG.analyze) return { text: '【奇门吉凶格局】内核未加载。' };
        if (!ent || !ent.date || !ent.date.year) return { prompt: '判格局需要用事时刻，例如「奇门格局 2026年10月20日14时」。' };
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1, h = ent.time ? ent.time.hour : 12;
        var r = QG.analyze({ y: y, m: m, d: d, h: h });
        if (r.err) return { text: '【奇门吉凶格局】' + r.err };
        var G = ['（中五无实宫）', '坎一', '坤二', '震三', '巽四', '中五', '乾六', '兑七', '艮八', '离九'];
        var L = ['【奇门吉凶格局】' + y + '年' + m + '月' + d + '日' + h + '时，' + r.阴阳遁 + r.局数 + '局，旬首' + r.旬首 + '，四柱 ' + r.四柱.年 + ' ' + r.四柱.月 + ' ' + r.四柱.日 + ' ' + r.四柱.时 + '。'];
        L.push('克应：' + r.十干克应.map(function (x) {
          return G[x.宫] + '宫【' + x.天盘干 + '+' + x.地盘干 + '】' + x.格名 + '（' + x.吉凶 + '）' + (x.异名 ? '·异名' + x.异名 : '') + '，' + x.门 + '门' + x.星 + x.神;
        }).join('；'));
        L.push('吉格：' + (r.吉格.length ? r.吉格.map(function (x) { return x.名 + (x.宫 ? '（' + G[x.宫] + '宫）' : '') + '：' + x.义; }).join('；') : '本局未检出吉格。'));
        L.push('凶格：' + (r.凶格.length ? r.凶格.map(function (x) { return x.名 + (x.宫 ? '（' + G[x.宫] + '宫）' : '') + '：' + x.义; }).join('；') : '本局未检出凶格。'));
        L.push('总评：' + r.总评 + '（吉格 ' + r.吉格数 + ' 条 / 凶格 ' + r.凶格数 + ' 条）。');
        L.push('破格：' + r.破格提示);
        L.push('标注：' + r.缺口.replace(/\n/g, '；'));
        return { text: L.join('\n') };
      }
    },
    {
      key: 'liuren-bifa', 名: '大六壬·毕法赋断课',
      板块: '三式推演', 短名: '解毕法',
      触发词: ['毕法赋', '毕法', '六壬毕法', '毕法断课', '一百法', '毕法目录', '天将类象', '六壬类象'],
      说明: '大六壬《毕法赋》断课 + 十二天将类象 C27：一百法目录（四库《六壬大全》卷九上 1–70 / 卷十一下 71–100，凌福之撰；原书「51→53」跳号已重编）+ **18 条可机器判定的条目**逐条检出（六阳数足/六阴相继/支传干·干传支/金日逢丁·水日逢丁/传财化鬼·传鬼化财/三传递生·互克/干支皆败/魁度天门/罡塞鬼户/华盖覆日/干支值绝/传墓入墓/三六合/旬内空亡）+ 十二天将类象。其余 82 条只列目录、不做自动判定（如实标注）。',
      run: function (ent, text) {
        if (!LBF || !LBF.analyze) return { text: '【毕法赋断课】内核未加载。' };
        var t = String(text || '');
        // 只要目录（不占课时）：「毕法目录 / 一百法全表」
        if (/目录|全表|一百法/.test(t) && !ent.date) {
          var L0 = ['【毕法赋·一百法目录】（四库《六壬大全》卷九上 1–70 / 卷十一下 71–100，凌福之撰）'];
          var 上 = [], 下 = [];
          LBF.BIFA.forEach(function (x) { (x[2] === '上' ? 上 : 下).push(x[0] + '·' + x[1]); });
          L0.push('上卷：' + 上.join('、') + '。');
          L0.push('下卷：' + 下.join('、') + '。');
          L0.push('覆盖：' + LBF.BIFA.length + ' 条；本内核对 18 条做机器判定（5/6/23/24/25/26/27/28/31/32/36/51/52/59/79/81/83/96），其余只列目录。');
          return { text: L0.join('\n') };
        }
        if (!ent || !ent.date || !ent.date.year) return { prompt: '断课需要占问时刻，例如「毕法赋 2026年10月20日14时」（只要目录可说「毕法赋目录」）。' };
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1, h = ent.time ? ent.time.hour : 12;
        var r = LBF.analyze({ y: y, m: m, d: d, h: h });
        if (r.err) return { text: '【毕法赋断课】' + r.err };
        var L = ['【毕法赋断课】' + y + '年' + m + '月' + d + '日' + h + '时，月将' + r.月将 + '，占时' + r.占时 + '，日干支' + r.四柱.日 + '。'];
        L.push('四课：' + r.四课.map(function (k, i) { return ['干上', '干阴', '支上', '支阴'][i] + k.位 + '乘' + k.上; }).join('；') + '。');
        L.push('三传：' + r.三传.join(' → ') + '（初' + r.三传[0] + ' 中' + r.三传[1] + ' 末' + r.三传[2] + '），遁干' + (r.三传遁干 || []).join('') + '，旬空' + (r.旬空 || []).join('') + '。');
        L.push('毕法：' + (r.命中.length ? r.命中.map(function (x) { return '第' + x.序 + '法「' + x.名 + '」（' + x.卷 + '卷）：' + x.说明; }).join('；') : '本課未命中可自动判定之毕法条目（18 条判据内）。'));
        L.push('类象：' + r.类象.map(function (x) { return x.位 + x.支 + '乘' + x.将 + '——' + x.象意; }).join('；'));
        L.push('覆盖：' + r.判定覆盖);
        L.push('标注：' + r.缺口.replace(/\n/g, '；'));
        return { text: L.join('\n') };
      }
    },
    {
      key: 'liuyao-wangshuai', 名: '六爻旺衰进阶',
      板块: '三式推演', 短名: '解六爻旺衰',
      触发词: ['六爻旺衰', '爻旺衰', '旺衰进阶', '生旺墓绝', '暗动', '日破', '月破', '化进神', '化退神', '回头生', '回头克', '六爻三合局', '爻三合', '六冲卦', '六合卦', '爻伏吟', '爻反吟', '化墓', '化绝'],
      说明: '六爻旺衰进阶 C28：在装卦（纳甲/世应/六亲/六神/飞伏）之上补旺衰一层——① 五行生旺墓绝（金巳酉丑寅、木亥卯未申、火寅午戌亥、水土申子辰巳，《卜筮正宗》原文）② 月建日辰旺衰档（《增删卜易》日月权衡表：旺上加旺/旺有根/得时得地/休囚有救/休囚无救/衰败已极）③ 日冲判暗动·日破·冲散 ④ 动爻化变八象（回头生克/化进神退神/化墓化绝/化空化破/爻伏吟反吟）⑤ 三合局成局四法与虚一待用 ⑥ 六冲卦十·六合卦八·游魂归魂·内外卦伏吟反吟 ⑦ 用神·原神·忌神·仇神定位。流派分歧（土长生申/寅、月冲临日是否作暗动、戌化丑是否进神）如实并列标注，不合并。',
      run: function (ent, text) {
        if (!LWS || !LWS.analyze) return { text: '【六爻旺衰】内核未加载。' };
        function 净(x) {
          return String(x == null ? '' : x)
            .replace(/[。；]/g, '，')
            .replace(/，{2,}/g, '，')
            .replace(/^，+|，+$/g, '');
        }
        var t = String(text || '');
        // ① 背数起卦：文本里 6 个连续的 0–3（如「起卦 1 2 3 0 1 2」）
        var backs = null;
        var m6 = t.match(/[0-3](?:[\s,，、]{0,2}[0-3]){5}/);
        if (m6) backs = (m6[0].match(/[0-3]/g) || []).map(Number);
        // ② 测事：命中用神表最长词
        var 事 = null, 事长 = 0;
        if (LY && LY.YONG) {
          Object.keys(LY.YONG).forEach(function (k) {
            if (t.indexOf(k) >= 0 && k.length > 事长) { 事 = k; 事长 = k.length; }
          });
        }
        if (!ent || !ent.date || !ent.date.year) {
          return { prompt: '六爻需占卦时刻（定月建/日辰/旬空/六神），例如「六爻旺衰 求财 2026年10月20日14时」，要指定手摇结果可加六个数「1 2 3 0 1 2」（每爻背数 0–3）。' };
        }
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1;
        var h = (ent.time && ent.time.hour != null) ? ent.time.hour : 12;
        var r = LWS.analyze({ y: y, m: m, d: d, h: h, backs: backs || undefined, 事: 事 });
        if (r.err) return { text: '【六爻旺衰】' + r.err };

        var L = ['【六爻旺衰进阶】' + y + '年' + m + '月' + d + '日' + h + '时' + (backs ? '，按手摇背数 ' + backs.join('') + ' 起卦' : '，即时起卦')
          + '，得「' + r.本卦 + '」' + (r.变卦 ? '之「' + r.变卦 + '」（动爻 ' + r.动爻.join('、') + '）' : '（六爻安静，无变卦）')
          + '，' + r.宫 + '，世' + r.世 + '应' + r.应 + '。'];
        L.push('月建日辰：月建' + r.月建 + '，日辰' + r.日辰 + '（日干' + r.日干 + '），旬空' + ((r.旬空 && r.旬空.length) ? r.旬空.join('') : '无') + '，月建司一月之权为提纲，日辰司一日之权为主宰。');

        L.push('卦象：' + (r.卦象.项.length
          ? r.卦象.项.map(function (x) { return x.名 + '（' + 净(x.断) + '）'; }).join('，')
          : '常卦（非六冲六合、非游魂归魂，内外卦亦无伏吟反吟）。'));

        // 用神
        if (r.用神) {
          if (r.用神爻 && r.用神爻.length) {
            L.push('用神：' + r.用神 + '（' + r.用神五行 + '）现于' + r.用神爻.map(function (x) {
              return '第' + x.爻 + '爻' + x.干支 + '，' + x.旺衰 + (x.空亡 ? '·旬空' : '') + (x.月破 ? '·月破' : '');
            }).join('，') + '。');
          } else if (r.用神伏神 && r.用神伏神.length) {
            L.push('用神：' + r.用神 + '（' + r.用神五行 + '）不上卦，' + r.用神伏神.map(function (f) {
              return '伏于第' + f.爻 + '爻（伏神' + f.干支 + '，飞神' + f.飞神.干支 + '·' + f.飞神.六亲 + '，' + f.飞伏关系 + '，' + f.旺衰 + '）';
            }).join('，') + '，须待伏神出伏透出方可论吉凶。');
          } else {
            L.push('用神：' + r.用神 + '（' + r.用神五行 + '）本卦与本宫纯卦皆无，此事无缘或难成之象。');
          }
        } else {
          L.push('用神：未指定测事，未取用神（说「求财/事业/婚姻/疾病/学业…」即可取用神）。');
        }

        // 逐爻旺衰
        L.push('逐爻：' + r.爻.map(function (x) {
          var s = '第' + x.爻 + '爻' + x.干支 + x.五行 + '·' + x.六亲 + (x.六神 ? '·' + x.六神 : '') + (x.世应 ? '·' + x.世应 : '') + (x.动 ? '·动' : '') + '，' + x.旺衰;
          if (x.空亡) s += '·旬空';
          if (x.月破) s += '·月破';
          if (x.冲判) s += '·' + x.冲判;
          if (x.变) s += ' → 化' + x.变.变支 + x.变.变五行 + '（' + x.变.项.map(function (tt) { return tt.名; }).join('/') + '）';
          return s;
        }).join('，') + '。');

        // 世爻
        if (r.世爻) {
          L.push('世爻：第' + r.世爻.爻 + '爻' + r.世爻.干支 + r.世爻.五行 + '·' + r.世爻.六亲 + '，' + r.世爻.旺衰
            + (r.世爻.空亡 ? '·旬空' : '') + (r.世爻.月破 ? '·月破' : '') + (r.世爻.冲判 ? '·' + r.世爻.冲判 : '')
            + (r.世爻.变 ? '，' + 净(r.世爻.变.主判.断) : '') + '。');
        }

        // 原神 / 忌神 / 仇神
        if (r.元忌仇) {
          var Y = r.元忌仇;
          function seg(名, o) {
            return 名 + '（' + o.六亲 + '·' + o.五行 + '）' + (o.爻.length
              ? o.爻.map(function (x) { return '第' + x.爻 + '爻' + x.旺衰 + (x.空亡 ? '·空' : '') + (x.月破 ? '·破' : ''); }).join('，')
              : '不上卦');
          }
          L.push('元忌仇：' + seg('原神', Y.原神) + '，' + seg('忌神', Y.忌神) + '，' + seg('仇神', Y.仇神) + '。');
        }

        // 动变
        var 动列 = r.爻.filter(function (x) { return x.变; });
        L.push('动变：' + (动列.length ? 动列.map(function (x) {
          return '第' + x.爻 + '爻' + x.支 + '→' + x.变.变支 + '，' + x.变.项.map(function (tt) {
            return tt.名 + (tt.注 ? '（' + 净(tt.注) + '）' : '');
          }).join('，') + '，主判：' + 净(x.变.主判.断);
        }).join('，') : '六爻安静，无动变（以日月旺衰与合冲论）。'));

        // 三合局
        L.push('合局：' + (r.合局.length ? r.合局.map(function (x) { return 净(x.说明).replace(/；/g, '，'); }).join('，') : '未检出三合局（静爻不能成合，须三爻齐动或动爻与日月凑局）。'));

        // 断要（通用法则定性，不作绝对断言）
        var 用强 = (r.用神爻 && r.用神爻.length) ? r.用神爻[0].强弱 : (r.用神伏神 && r.用神伏神[0] ? r.用神伏神[0].强弱 : null);
        var 判;
        if (用强 === '旺') 判 = '用神旺相有根，事有可成之基，宜乘时而动。';
        else if (用强 === '相') 判 = '用神得气，事可为，成中须借日月扶助。';
        else if (用强 === '暗动（力增）') 判 = '用神受日冲而暗动，静中带动，事有意外之转机。';
        else if (用强 === '平') 判 = '用神平平，力不专，须待值日值月或动爻生扶方成。';
        else if (用强 === '弱有救') 判 = '用神弱而有救，事虽可为而成中带阻，宜耐心待时。';
        else if (用强 === '衰') 判 = '用神无气（旬空、月破、日破或受克），事难成，旺相有气之日月方是应期。';
        else 判 = '用神旺衰未定（缺月建日辰），须补占卦日期。';
        var 忌强 = (r.元忌仇 && r.元忌仇.忌神.爻.length) ? r.元忌仇.忌神.爻[0].强弱 : null;
        if (忌强 === '旺' || 忌强 === '相' || 忌强 === '暗动（力增）') 判 += '忌神（' + r.元忌仇.忌神.六亲 + '）有力，为事之阻力，须看有无制化。';
        var 合局成立 = r.合局.filter(function (x) { return x.成立; });
        if (合局成立.length) 判 += '三合' + 合局成立[0].局 + '已成立，' + (合局成立[0].空破.length ? '然局中有空破待解，' : '') + '事势聚合，力量专一。';
        L.push('断要：' + 净(判) + '（通用法则定性，不作绝对断言，具体应期须结合值日值月、冲合填实另断）');

        L.push('标注：' + r.注.map(净).join('，') + (r.缺料 ? '，' + 净(r.缺料) : '') + '。');
        return { text: L.join('\n') };
      }
    },
    {
      key: 'ziwei-sihua', 名: '紫微四化·流年流月流日',
      板块: '命理排盘', 短名: '解四化',
      触发词: ['紫微四化', '生年四化', '四化流年', '流年四化', '流月四化', '流日四化', '大限四化', '紫微流年', '紫微流月', '紫微流日', '紫微小限', '紫微大限', '三方四正', '四化表', '化禄', '化权', '化科', '化忌', '四化'],
      说明: '紫微四化 · 六层流运 C29：十天干四化表（中州派陆斌兆口径，已与内嵌 iztro 2.6.2 逐干反推核对 10/10 全等）+ 生年四化落宫 + 大限/小限/流年/流月/流日/流时六层流运四化与落宫 + 流年十二宫映射 + 四化落宫断语（四化性质×宫位领域合成，已标注非古籍逐条）+ 三方四正标记。流派分歧（戊干右弼/天机化科、壬干左辅/天府化科）如实并列，不合并。',
      run: function (ent, text) {
        if (!ZHW || !ZHW.analyze) return { text: '【紫微四化】内核未加载。' };
        function 净(x) {
          return String(x == null ? '' : x)
            .replace(/[。；]/g, '，').replace(/，{2,}/g, '，').replace(/^，+|，+$/g, '');
        }
        var t = String(text || '');
        var y = yearOf(ent, text);
        var m = ent && ent.date && ent.date.month ? ent.date.month : 1;
        var d = ent && ent.date && ent.date.day ? ent.date.day : 1;
        var h = (ent && ent.time && ent.time.hour != null) ? ent.time.hour : 14;
        var g = ent && ent.gender ? ((ent.gender === 'female' || ent.gender === '女') ? '女' : '男') : null;
        if (!g) return { prompt: '紫微斗数需出生性别（定阴阳顺逆与大限方向），请补「男」或「女」。' };
        if (!y) return { prompt: '紫微四化需出生年月日，例如「紫微四化 1990年8月15日14时 男 看2026年流年」。' };

        // 目标日期：支持 2026-10-20 / 流年2026年10月20日 / 只给年 / 明年去年；缺省取今日
        var now = new Date();
        var ty = now.getFullYear(), tm = now.getMonth() + 1, td = now.getDate();
        var m1 = t.match(/(20\d{2}|19\d{2})\s*[-\/.]\s*(\d{1,2})\s*[-\/.]\s*(\d{1,2})/);
        var m2 = t.match(/流(?:年|月|日)[^\d]{0,4}(\d{4})\s*年\s*(\d{1,2})\s*月(?:\s*(\d{1,2})\s*[日号])?/);
        if (m1) { ty = +m1[1]; tm = +m1[2]; td = +m1[3]; }
        else if (m2) { ty = +m2[1]; tm = +m2[2]; if (m2[3]) td = +m2[3]; }
        else {
          var all = t.match(/(20\d{2})\s*年/g);
          if (all && all.length) ty = parseInt(all[all.length - 1], 10);
          else if (/明年/.test(t)) ty += 1;
          else if (/去年/.test(t)) ty -= 1;
        }

        var r = ZHW.analyze({ y: y, m: m, d: d, h: h, gender: g }, { y: ty, m: tm, d: td });
        if (r.err) return { text: '【紫微四化·流运】' + r.err };

        var L = ['【紫微四化·流运】' + y + '年' + m + '月' + d + '日' + h + '时生（' + g + '），推' + ty + '年' + tm + '月' + td + '日（农历' + r.农历 + '）之运。'];
        L.push('命盘：命宫' + r.命盘.命宫.干支 + '主星「' + r.命盘.命宫.主星 + '」，身宫' + r.命盘.身宫.干支 + '主星「' + r.命盘.身宫.主星 + '」，' + r.命盘.五行局 + '，命主' + r.命盘.命主星 + '、身主' + r.命盘.身主星 + '。');
        L.push('生年四化：' + r.生年.map(function (x) {
          return x.星 + '化' + x.化 + '入' + x.宫 + '（' + x.宫干支 + '）';
        }).join('，') + '。');

        function 层线(L0) {
          var s = L0.干支 + ((L0.层 === '大限' && L0.岁区间) ? '（' + L0.岁区间.join('-') + '岁）' : '') + '，命宫在' + L0.命宫宫名 + '宫，';
          s += L0.项.map(function (x) {
            return (x.星 || '—') + '化' + x.化 + '→' + x.宫 + (x.入三方 ? '★' : '');
          }).join('，');
          return s + '。';
        }
        // 大限 / 流年 / 流月 / 流日 各出一块；小限与流时合并一块
        ['大限', '流年', '流月', '流日'].forEach(function (nm) {
          var L0 = r.层.filter(function (x) { return x.层 === nm; })[0];
          if (L0) L.push(nm + '运：' + 层线(L0));
        });
        var 余 = r.层.filter(function (x) { return x.层 === '小限' || x.层 === '流时'; });
        L.push('小限流时：' + 余.map(function (x) { return x.层 + '：' + 层线(x); }).join('').replace(/。$/, ''));

        // 流年断语（只给流年四化，避免堆砌）
        var 流年层 = r.层.filter(function (x) { return x.层 === '流年'; })[0];
        if (流年层) {
          L.push('流年断语：' + 流年层.项.map(function (x) { return 净(x.断); }).filter(Boolean).join('；').replace(/；/g, '，') + '。');
        }

        // 流年十二宫映射
        if (r.流年映射.length) {
          L.push('流年宫位：' + r.流年映射.map(function (x) { return x.本命宫 + '→' + x.流年宫; }).join('，') + '。');
        }

        L.push('标注：' + r.说明.map(function (s) { return String(s).replace(/[。；]/g, '，').replace(/，+$/, ''); }).join('，') + '。');
        return { text: L.join('\n') };
      }
    },
    // ===== v3.1.8 占星宫位 / 阿拉伯点 / 卜卦 / 择时（C28）=====
    {
      key: 'astro-house', 名: '占星宫位（四轴·四家宫制·落宫）',
      板块: '占星天文', 短名: '解宫位',
      说明: '四轴（上升/天顶/下降/天底）+ 整宫、等宫、波菲利、普拉西度四家分宫制逐曜落宫；宫制流派并列标注，不合并成一家。',
      触发词: ['宫位', '上升星座', '上升点', '上升在哪', '天顶', '宫头', '整宫制', '等宫制', '波菲利', '普拉西度', '四分仪', '星盘宫位'],
      run: function (ent, text) {
        if (!AH || !AH.houses) return { text: '【占星宫位】内核未加载。' };
        var y = ent.date && ent.date.year, m = ent.date && ent.date.month, d = ent.date && ent.date.day;
        var h = ent.time && ent.time.hour != null ? ent.time.hour : null;
        if (!y || !m || !d) return { prompt: '宫位需出生年月日时与城市，例如「1990年8月15日14时 北京 看宫位」。' };
        if (h == null) return { prompt: '宫位必须给出生时辰（上升点每 4 分钟走 1°，缺时辰则四轴全错），例如「1990年8月15日14时 北京 看宫位」。' };
        var city = pickCity(String(text || ''));
        var r = AH.houses({ y: y, m: m, d: d, h: h, city: city });
        if (r.err) return { prompt: r.err };
        var L = ['【占星·宫位】' + y + '年' + m + '月' + d + '日' + h + '时 ' + (city || '北京') + '（' + r.地点 + '，恒星时 ' + r.恒星时 + '）上升' + r.上升 + '，天顶' + r.天顶 + '。'];
        L.push('四轴：上升' + r.上升 + '，下降' + r.下降 + '，天顶' + r.天顶 + '，天底' + r.天底 + '。');
        function line(nm, cs) {
          if (!cs) return null;
          return '宫制·' + nm + '：' + cs.map(function (x, i) { return (i + 1) + '宫' + AH.fmtLon(x); }).join('，') + '。';
        }
        ['整宫', '等宫', '波菲利', '普拉西度'].forEach(function (nm) {
          var s = line(nm, r.宫制[nm]);
          if (s) L.push(s);
        });
        var main = r.宫制.普拉西度 ? '普拉西度' : '波菲利';
        var keys = Object.keys(r.落宫);
        L.push('落宫（' + main + '）：' + keys.map(function (k) { return k + '第' + r.落宫[k][main] + '宫'; }).join('，') + '。');
        L.push('标注：' + r.缺口.map(function (s) { return String(s).replace(/[。]/g, '，').replace(/，$/, ''); }).join('；') + '。');
        return { text: L.join('\n') };
      }
    },
    {
      key: 'astro-lots', 名: '阿拉伯点（福点·精神点等十二点）',
      板块: '占星天文', 短名: '查福点',
      说明: '阿拉伯点十二点（福点/精神点/爱欲点/婚姻点等）按昼夜分套公式起算，逐点给黄经、落座与落宫。',
      触发词: ['阿拉伯点', '福点', '幸运点', '精神点', '爱欲点', '必然点', '勇气点', '胜利点', '父亲点', '母亲点', '婚姻点', '健康点', '职业点', '财产点', '特殊点'],
      run: function (ent, text) {
        if (!AH || !AH.lots) return { text: '【阿拉伯点】内核未加载。' };
        var y = ent.date && ent.date.year, m = ent.date && ent.date.month, d = ent.date && ent.date.day;
        var h = ent.time && ent.time.hour != null ? ent.time.hour : 12;
        if (!y || !m || !d) return { prompt: '阿拉伯点需出生年月日时与城市，例如「1990年8月15日14时 北京 看阿拉伯点」。' };
        var r = AH.lots({ y: y, m: m, d: d, h: h, city: pickCity(String(text || '')) });
        if (r.err) return { prompt: r.err };
        var L = ['【占星·阿拉伯点】' + y + '年' + m + '月' + d + '日' + h + '时生，判为' + r.日夜盘 + '，上升' + r.上升 + '。'];
        r.点.forEach(function (x) {
          L.push(x.名 + '：' + x.位置 + '（第' + x.宫 + '宫）——' + x.公式 + '，主' + x.说明 + '。');
        });
        L.push('标注：' + r.生成 + '；' + r.缺口);
        return { text: L.join('\n') };
      }
    },
    {
      key: 'astro-horary', 名: '卜卦占星（Lilly 判据）',
      板块: '占星天文', 短名: '解卜卦',
      说明: '按 Lilly《基督教占星学》判据：问卦主星与事主星、月亮状态与入相、行星庙旺，逐条给判据与倾向，不下死断。',
      触发词: ['卜卦', '问卦', '卜一卦', '起卦问事', '这事能成吗', '能不能成', 'horary'],
      run: function (ent, text) {
        if (!AH || !AH.horary) return { text: '【卜卦】内核未加载。' };
        var t = String(text || '');
        var y = ent.date && ent.date.year, m = ent.date && ent.date.month, d = ent.date && ent.date.day;
        var h = ent.time && ent.time.hour != null ? ent.time.hour : null;
        if (!y || !m || !d) return { prompt: '卜卦以「起念之时」的星盘为盘，须给起卦时间与城市，例如「卜卦 2026年10月20日14时 北京 这笔钱能要回来吗」。' };
        if (h == null) h = 12;
        var city0 = pickCity(t);
        var q0 = t.replace(/(卜卦|问卦|卜一卦|起卦问事|horary)/g, '')
          .replace(/\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*[日号]/g, '')
          .replace(/\d{1,2}\s*时(\d{1,2}\s*分)?/g, '')
          .replace(/\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2}/g, '')
          .replace(/\s+/g, ' ').trim();
        if (city0) q0 = q0.split(city0).join('');
        q0 = q0.replace(/^[，,、：: ]+/, '').trim() || t;
        var r = AH.horary({ y: y, m: m, d: d, h: h, city: city0 }, q0);
        if (r.err) return { prompt: r.err };
        var L = ['【占星·卜卦】起卦时刻 ' + y + '年' + m + '月' + d + '日' + h + '时，所问「' + r.所问 + '」，取' + r.问事宫 + '。'];
        L.push('主星：' + r.问卦主星 + '；' + r.事主星 + '。');
        L.push('月亮：' + r.月亮.位置 + '，行' + r.月亮.速度 + '°/日' + (r.月亮.空亡 ? '，月空亡' : '，出宫前有入相') + '。');
        L.push('判据：' + r.判据.map(function (s) { return String(s).replace(/[。]$/, ''); }).join('；') + '。');
        L.push('结论：' + r.结论);
        L.push('标注：' + (r.说明 + r.缺口).replace(/[。]/g, '，').replace(/，$/, '') + '。');
        return { text: L.join('\n') };
      }
    },
    {
      key: 'astro-election', 名: '择时占星（行星时·月相·忌宜）',
      板块: '占星天文', 短名: '查择时',
      说明: '按事项（嫁娶/开业/出行等）查月相、月亮空亡、行星时与忌宜项，给吉凶档与评分（供参考）。',
      触发词: ['择时', '择时占星', '行星时', '占星择日', 'electional', '选个时辰', '哪个时辰好'],
      run: function (ent, text) {
        if (!AH || !AH.election) return { text: '【择时】内核未加载。' };
        var t = String(text || '');
        var y = ent.date && ent.date.year, m = ent.date && ent.date.month, d = ent.date && ent.date.day;
        var h = ent.time && ent.time.hour != null ? ent.time.hour : null;
        if (!y || !m || !d) return { prompt: '择时需待选日期与时刻，例如「择时 2026年11月1日10时 北京 嫁娶」。' };
        if (h == null) return { prompt: '择时需具体时刻（行星时按昼夜十二等分，时段不同结果不同），例如「择时 2026年11月1日10时 北京 嫁娶」。' };
        var topic = '（未指明）';
        Object.keys(AH.ELECTION_TOPIC).forEach(function (k) {
          if (topic === '（未指明）' && t.indexOf(k) >= 0) topic = k;
        });
        if (topic === '（未指明）') {
          var alt = [['结婚', '嫁娶'], ['婚礼', '嫁娶'], ['开张', '开业'], ['开市', '开业'], ['签合同', '签约'], ['动工', '动土'], ['装修', '动土'], ['看病', '求医'], ['手术', '求医'], ['打官司', '诉讼'], ['下葬', '安葬'], ['出殡', '安葬'], ['出差', '出行'], ['搬家', '出行']];
          for (var i = 0; i < alt.length; i++) if (t.indexOf(alt[i][0]) >= 0) { topic = alt[i][1]; break; }
        }
        var r = AH.election({ y: y, m: m, d: d, h: h, city: pickCity(t) }, topic);
        if (r.err) return { prompt: r.err };
        var L = ['【占星·择时】' + y + '年' + m + '月' + d + '日' + h + '时 ' + (pickCity(t) || '北京') + '（' + r.地点 + '），事项「' + r.事项 + '」，月相' + r.月相 + '，月' + r.月 + '，上升' + r.上升 + '。'];
        L.push('吉凶项：' + r.项.map(function (x) { return x.名 + '［' + x.判 + '］' + String(x.说).replace(/[。]$/, ''); }).join('；') + '。');
        L.push('综合：' + r.吉凶档 + '（评分 ' + r.评分 + '／100）。');
        L.push('通则：' + String(r.通则).replace(/[。]$/, '') + '。');
        if (r.行星时 && !r.行星时.err) {
          L.push('行星时：日主' + r.行星时.日主 + '，' + r.行星时.段 + '第' + r.行星时.第几时 + '时，当值' + r.行星时.行星时主 + '（日出' + r.行星时.日出 + '，日落' + r.行星时.日落 + '）。');
        }
        L.push('标注：' + (r.说明 + r.缺口).replace(/[。]/g, '，').replace(/，$/, '') + '。');
        return { text: L.join('\n') };
      }
    },
    // ===== v3.1.8 八字神煞全表 / 八字合婚（C31）=====
    {
      key: 'bazi-shensha', 名: '八字神煞全表（21 类）',
      板块: '命理排盘', 短名: '查神煞',
      说明: '按古籍通行取法逐柱查 21 类神煞（天乙/文昌/天德等贵人、桃花、驿马、羊刃、华盖、孤辰寡宿等），每类给一句白话。',
      触发词: ['神煞', '八字神煞', '天乙贵人', '太极贵人', '文昌贵人', '文昌', '天德贵人', '月德贵人', '桃花', '咸池', '驿马', '羊刃', '华盖', '将星', '劫煞', '灾煞', '亡神', '孤辰', '寡宿', '红鸾', '天喜', '金舆', '禄神', '天医', '空亡'],
      run: function (ent, text) {
        if (!BSS || !BSS.analyze) return { text: '【八字神煞】内核未加载。' };
        var y = ent.date && ent.date.year, m = ent.date && ent.date.month, d = ent.date && ent.date.day;
        var h = ent.time && ent.time.hour != null ? ent.time.hour : null;
        if (!y || !m || !d) return { prompt: '神煞需出生年月日时，例如「1990年8月15日14时 八字神煞」。' };
        if (h == null) return { prompt: '神煞须给时辰（时柱决定半数神煞落位），例如「1990年8月15日14时 八字神煞」。' };
        var r = BSS.analyze({ y: y, m: m, d: d, h: h, gender: genderOf(ent) });
        if (r.err) return { prompt: r.err };
        var L = ['【八字·神煞】' + r.四柱 + '，日主' + r.日主 + '（' + r.性别 + '）。'];
        if (r.命中.length) {
          r.命中.forEach(function (x) {
            L.push(x.名 + '：在' + x.位 + '——' + x.义 + '（查法：' + x.查法 + '）。');
          });
        } else {
          L.push('本盘 21 类常用神煞皆未落柱。');
        }
        L.push(r.汇总 + '。');
        L.push('标注：' + String(r.缺口).replace(/[。；]/g, '，').replace(/，$/, '') + '。');
        return { text: L.join('\n') };
      }
    },
    {
      key: 'bazi-hehun', 名: '八字合婚（生肖·夫妻宫·五合·纳音·互补）',
      板块: '命理排盘', 短名: '查合婚',
      说明: '生肖合冲、夫妻宫、天干五合、纳音、五行互补五项逐项判定，给档位与参考评分；民俗参考，不作婚姻结论。',
      触发词: ['合婚', '八字合婚', '婚配', '配不配', '合不合', '属相合婚', '婚姻合不合', '两人合婚'],
      run: function (ent, text) {
        if (!BSS || !BSS.hehun) return { text: '【八字合婚】内核未加载。' };
        var t = String(text || '');
        // 从文本里取两人生辰（YYYY年M月D日[时] 或 YYYY-M-D）
        var ds = [], re = /(\d{4})\s*[年\-\/.]\s*(\d{1,2})\s*[月\-\/.]\s*(\d{1,2})\s*[日号]?\s*(?:(\d{1,2})\s*时)?/g, mm;
        while ((mm = re.exec(t)) !== null) {
          ds.push({ y: +mm[1], m: +mm[2], d: +mm[3], h: mm[4] != null ? +mm[4] : null });
        }
        // 只有一方时，把 ent 的一方补进来（ent 在前）
        if (ds.length === 1 && ent.date && ent.date.year) {
          ds.unshift({ y: ent.date.year, m: ent.date.month, d: ent.date.day, h: ent.time && ent.time.hour != null ? ent.time.hour : null });
        }
        if (ds.length < 2) return { prompt: '合婚需两人生辰，例如「合婚 1990年8月15日14时 男 与 1992年3月20日9时 女」。' };
        // 性别：按文本中「男/女」出现次序；缺则按前男后女
        var gs = [], gr = /([男女])/g, gm;
        while ((gm = gr.exec(t)) !== null) gs.push(gm[1] === '男' ? 'male' : 'female');
        var a = ds[0], b = ds[1];
        if (a.h == null) a.h = 12;
        if (b.h == null) b.h = 12;
        var r = BSS.hehun(
          { y: a.y, m: a.m, d: a.d, h: a.h, gender: gs[0] || 'male' },
          { y: b.y, m: b.m, d: b.d, h: b.h, gender: gs[1] || 'female' }
        );
        if (r.err) return { prompt: r.err };
        var L = ['【八字·合婚】甲（' + (gs[0] === 'female' ? '女' : '男') + '）' + a.y + '年' + a.m + '月' + a.d + '日' + a.h + '时：' + r.甲 + '，乙（' + (gs[1] === 'female' || !gs[1] ? '女' : '男') + '）' + b.y + '年' + b.m + '月' + b.d + '日' + b.h + '时：' + r.乙 + '。'];
        L.push('综合：' + r.档 + '（参考评分 ' + r.评分 + '／100）。');
        r.项.forEach(function (x) { L.push(x.名 + '［' + x.判 + '］' + String(x.说).replace(/[。；]/g, '，').replace(/，$/, '') + '。'); });
        L.push('标注：' + (r.说明 + r.缺口).replace(/[。]/g, '，').replace(/，$/, '') + '。');
        return { text: L.join('\n') };
      }
    }
  ];

  /**
   * 板块（分类）定义 —— 只服务「功能介绍」页把全部功能分组展示，**不参与路由**。
   *   顺序 = 介绍页自上而下的顺序；「名」必须与各功能条目的「板块」字段逐字一致
   *   （tools 下的 catalog 测试会逐条校验，写错即红）。
   *   加新功能时：FEATURES 里写清 板块 + 短名 即可，本表只在开新板块时才动。
   */
  var BANKS = [
    { 名: '命理排盘', 说明: '拿一个出生时间，排四柱与紫微，再断格局、神煞、大运与合婚。' },
    { 名: '三式推演', 说明: '奇门、六壬、太乙三式，加六爻、梅花、周易，专看某一件事的成败。' },
    { 名: '占星天文', 说明: '黄经落座落宿、宫位四轴、相位推运与合盘，星历均可核对。' },
    { 名: '黄历择日', 说明: '按日子挑吉时吉日，附每日穿衣五行与公农历换算。' },
    { 名: '姓名测字', 说明: '五格数理、起名补益、拆字会意，全以康熙笔画为底。' },
    { 名: '风水堪舆', 说明: '命卦、宅向、九宫飞星与户型缺角，只给规则里查得到的。' },
    { 名: '相术占验', 说明: '相术、签文、小术与生肖关系，属传统文化参考。' }
  ];

  /**
   * 把功能的长「说明」压成一句 28 字以内的简介（介绍页每行用）。
   * 做法纯机械、不改语义：去括号补充 → 去内核编号（C07/C25）与书内小节号（§8.2）
   * → 只取第一个短句（遇「，。；：·」即断）→ 超长才截断加省略号。
   * 目的是「不新增第二份文案真源」：简介永远由说明派生，改说明即改简介。
   */
  function briefOf(s) {
    s = String(s || '');
    s = s.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '');  // 去中文/英文括号补充
    s = s.replace(/\s*C\d+\s*/g, ' ').replace(/\s*§[\d.]+\s*/g, ' '); // 去内核编号与小节号
    s = s.replace(/\s{2,}/g, ' ').trim();
    // 取第一个非空短句（有的说明以「C31：」开头，去掉编号后会留下空段，故要跳过空段）
    var segs = s.split(/[，。；：]/), out = '';
    for (var i = 0; i < segs.length; i++) {
      var t = segs[i].replace(/^[、，。；：\s]+/, '').trim();
      if (t) { out = t; break; }
    }
    if (out.length > 28) {
      // 超长才截断：优先在「·」「/」这类并列符处收口，避免截在半个词上
      var cut = out.slice(0, 28);
      var idx = Math.max(cut.lastIndexOf('·'), cut.lastIndexOf('/'));
      out = (idx >= 12 ? cut.slice(0, idx) : cut) + '…';
    }
    return out;
  }

  /**
   * 功能总览（介绍页数据源）：按 BANKS 顺序把 FEATURES 分组。
   * 返回 [{ 板块, 说明, 项数, items: [{ key, 短名, 名, 简介 }] }]。
   * 版块与条目全从同一张 FEATURES 派生，故「功能数 / 版块数」永远不会和实际脱节。
   */
  function catalog() {
    var out = [];
    for (var b = 0; b < BANKS.length; b++) {
      var bank = BANKS[b], items = [];
      for (var i = 0; i < FEATURES.length; i++) {
        var f = FEATURES[i];
        if (f.板块 !== bank.名) continue;
        items.push({ key: f.key, 短名: f.短名, 名: f.名, 简介: briefOf(f.说明) });
      }
      out.push({ 板块: bank.名, 说明: bank.说明, 项数: items.length, items: items });
    }
    return out;
  }

  // 从文本里认城市（取最长命中，避免「南京」被「京」误取）
  function pickCity(text) {
    if (!AH || !AH.cities) return '';
    var best = '', arr = AH.cities;
    for (var i = 0; i < arr.length; i++) {
      var c = arr[i];
      if (c.length > best.length && text.indexOf(c) >= 0) best = c;
    }
    return best;
  }

  // 文本里的中文数字 → 阿拉伯数字（1-99 够用，择日天数用）
  function cnNum(s) {
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    var CN = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
    if (CN[s] != null) return CN[s];
    var m = String(s).match(/^([二三四五六七八九])?十([一二三四五六七八九])?$/);
    if (m) return (m[1] ? CN[m[1]] : 1) * 10 + (m[2] ? CN[m[2]] : 0);
    return 30;
  }

  // 紫微：主星串的显示写法（空宫不再套一层「「（空宫）」」双括号）
  function starPhrase(v) {
    v = String(v == null ? '' : v);
    return (!v || v === '（空宫）') ? '（空宫）' : '「' + v + '」';
  }

  // 农历月 → 通书写法（正月、二月…十月、冬月、腊月；闰月已在数值上取过绝对值）
  function lunarMonthCN(n) {
    var M = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
    n = parseInt(n, 10);
    return (n >= 1 && n <= 12) ? M[n - 1] : String(n);
  }

  // 农历日 → 通书写法（初一…初十、十一…十九、二十、廿一…廿九、三十）
  function lunarDayCN(n) {
    var H = '一二三四五六七八九十';
    n = parseInt(n, 10);
    if (!n || n < 1 || n > 30) return String(n);
    if (n <= 10) return '初' + H.charAt(n - 1);
    if (n < 20) return '十' + H.charAt(n - 11);
    if (n === 20) return '二十';
    if (n < 30) return '廿' + H.charAt(n - 21);
    return '三十';
  }

  // 择日：把公历「2026年11月1日」压成「11月1日」（范围内凶日名单用，省字）
  function mdOf(s) {
    var m = String(s).match(/^(\d+)年(\d+)月(\d+)日$/);
    return m ? (+m[2]) + '月' + (+m[3]) + '日' : String(s);
  }

  // 择日：单日命中的专项凶日名（口径与 zeri.js 的 score() 扣分一一对应）
  function xzOf(day, key) {
    var out = [];
    if (day.杨公忌) out.push('杨公忌');
    if (day.红沙) out.push('红沙');
    if (key === '嫁娶') {
      if (day.三娘煞) out.push('三娘煞');
      if (day.周堂 && day.周堂.杀) out.push('周堂杀');
    }
    return out;
  }

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
    run: run,
    catalog: catalog,   // 介绍页用：按板块分组的功能总览（与 FEATURES 同一真源）
    BANKS: BANKS        // 板块顺序与说明（介绍页只读）
  };
});
