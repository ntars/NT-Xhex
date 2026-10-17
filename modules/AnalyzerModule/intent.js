/**
 * modules/AnalyzerModule/intent.js —— 输入解析与意图识别【单一真源】（纯函数，平台无关）
 *
 * 依据：《玄玖灵犀 NT-Xhex 3.0 — 意图识别与输入解析模块完整规范》
 *
 * 能力：
 *   ① 预处理管道：全角转半角 → 中文数字转阿拉伯 → 英文月份 → 分隔符归一化 → 连续数字智能拆分
 *   ② 实体提取：日期 / 时间 / 性别 / 姓名 / 关键词
 *   ③ 意图推断决策树 + 置信度分级（high / medium / low / none）
 *   ④ 人名与玄学关键词冲突三级消歧义（归属标记 → 位置权重 → 追问兜底）
 *   ⑤ 实体校验（日期存在性 / 时间范围 / 姓名合法性）
 *   ⑥ 非玄学输入拦截
 *
 * 输出 IntentResult：
 *   { intent, confidence, entities:{name,date,time,gender,keywords}, candidates, prompt, error }
 *
 * 不含 DOM / 平台 API / 网络；三端共用同一份规则。
 * 加载：UMD —— 小程序被 require；浏览器挂到全局 NT.intent。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.NT = root.NT || {}; root.NT.intent = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {

  // ==================== 关键词表（规范 §4.5）====================
  var KW = {
    bazi: ['排盘', '八字', '命盘', '四柱', '算命', '批命', '批八字', '测字', '占卜'],
    almanac: ['黄历', '宜忌', '老黄历', '通胜', '吉凶', '今日', '今天', '明天', '明日', '后天', '昨天', '前天'],
    nameology: ['姓名', '名字', '取名', '改名', '起名', '名字分析', '打分', '测名'],
    // 强择日触发词（明确要"选日子"）
    select: ['择日', '选日子', '选个日子', '选日', '挑日', '吉日', '哪天适合', '何时适合'],
    // 事项词（出现时多为问"吉凶"，归黄历）
    event: ['搬家', '结婚', '嫁娶', '开业', '开张', '动土', '入宅', '出行', '安葬', '修坟', '婚期'],
    jieqi: ['节气', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
      '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至', '小寒', '大寒'],
    ganzhi: ['干支', '生肖', '属相', '六十甲子', '什么日', '什么日子']
  };
  // 强关键词：几乎不可能做人名（规范 §9.3）
  var KW_STRONG = ['排盘', '八字', '四柱', '算命', '批命', '黄历', '老黄历', '通胜', '宜忌', '吉凶', '择日',
    '取名', '改名', '打分', '干支', '节气', '嫁娶', '搬家', '开业', '动土', '入宅', '批八字', '测字', '占卜'];
  // 姓名提取排除词（规范 §4.4）
  var NAME_EXCLUDE = ['排盘', '黄历', '宜忌', '分析', '姓名', '八字', '五行', '今天', '明天', '昨天', '今年', '明年',
    '男', '女', '凌晨', '早上', '上午', '中午', '下午', '傍晚', '晚上', '深夜', '半夜', '子时', '丑时', '寅时', '卯时',
    '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时', '帮我', '我想', '知道', '一下', '什么', '怎么',
    '怎么样', '好不好', '适合', '可以', '查询', '看看', '算命', '批命', '测字', '占卜', '通胜', '吉凶', '择日', '选日',
    '农历', '阴历', '阳历', '公历', '旧历', '夏历', '今年', '几月', '哪天', '何时', '现在', '下个月', '下星期', '下周'];
  // 姓名中不应出现的虚词/功能字（出现即判定非姓名）
  var BAD_NAME_CHARS = '我这你他她它的了吗呢吧在有做么查想看知请适哪几怎不个为跟和与及或帮选叫让被把给算排批测说想问';
  // 姓名词首/词尾可能黏连的「功能字/动词」前缀后缀（分词时剥离，如「看白玖玖」「白玖玖这」）
  var NAME_FILLER = '帮我你他她看看查算排批测这那是个一下你他';
  function cleanName(w) {
    var s = w;
    while (s.length > 2 && s.charAt(0) !== undefined && NAME_FILLER.indexOf(s.charAt(0)) >= 0) s = s.slice(1);
    while (s.length > 2 && NAME_FILLER.indexOf(s.charAt(s.length - 1)) >= 0) s = s.slice(0, -1);
    return s;
  }
  // 非玄学词：命中即拒答（规范 §7）
  var NON_METAPHYSICAL = ['天气', '外卖', '音乐', '短信', '导航', '快递', '代码', '笑话', '翻译', '吃饭', '吃什么',
    '几点', '股票', '新闻', '快递号', '红包', '打车', '酒店', '机票', '电影', '游戏', '股票', '工资', '房价'];

  var GANZHI_YEAR = { '甲': 0, '乙': 1, '丙': 2, '丁': 3, '戊': 4, '己': 5, '庚': 6, '辛': 7, '壬': 8, '癸': 9 };
  var ZODIAC = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
  var EN_MONTHS = { jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6,
    jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12 };
  // 时辰 → 代表小时（取区间中点，规范附录 B）
  var SHICHEN = { '子时': 0, '丑时': 2, '寅时': 4, '卯时': 6, '辰时': 8, '巳时': 10, '午时': 12, '未时': 14, '申时': 16, '酉时': 18, '戌时': 20, '亥时': 22 };
  // 口语时间 → 固定小时（规范 §4.2）
  var ORAL_HOUR = { '凌晨': 5, '拂晓': 5, '早上': 8, '早晨': 8, '上午': 10, '中午': 12, '正午': 12, '下午': 15, '傍晚': 18, '黄昏': 18, '晚上': 20, '深夜': 23, '半夜': 23 };
  var RELATIVE = [
    { re: /大后天/, day: 3 }, { re: /后天/, day: 2 }, { re: /明天|明日/, day: 1 },
    { re: /今天|今日/, day: 0 }, { re: /昨天|昨日/, day: -1 }, { re: /前天/, day: -2 }
  ];
  var JIEQI_LIST = ['立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至', '小暑', '大暑',
    '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至', '小寒', '大寒'];

  // 城市 → 东经度（°E，市中心近似值）。
  // 用途：为「真太阳时」校正备好数据（出生时辰按当地经度相对时区基准经度 120°E 换算：
  //   真太阳时 ≈ 平太阳时 + (当地经度 - 120) * 4 分钟/度 + 真太阳时差，校正后的时点定「出生时柱」）。
  // 本表**只备数据、不接算法**（真太阳时算法随「深度八字」方向落地时再接）；此处先让
  // 意图识别能提取出「出生城市」实体，将来补算法时不用改输入契约。覆盖省级会 + 主要地级市。
  var CITY = {
    '北京': 116.4, '上海': 121.47, '广州': 113.26, '深圳': 114.06, '成都': 104.07, '重庆': 106.55,
    '天津': 117.2, '武汉': 114.3, '西安': 108.94, '南京': 118.78, '杭州': 120.16, '长沙': 112.94,
    '郑州': 113.62, '石家庄': 114.5, '太原': 112.55, '济南': 117.0, '青岛': 120.38, '合肥': 117.23,
    '福州': 119.3, '厦门': 118.09, '南昌': 115.9, '沈阳': 123.43, '大连': 121.62, '长春': 125.32,
    '哈尔滨': 126.53, '宁波': 121.55, '苏州': 120.6, '无锡': 120.31, '佛山': 113.12, '东莞': 113.75,
    '珠海': 113.58, '惠州': 114.41, '中山': 113.39, '泉州': 118.6, '洛阳': 112.45, '兰州': 103.83,
    '贵阳': 106.7, '昆明': 102.74, '海口': 110.35, '南宁': 108.37, '乌鲁木齐': 87.62, '西宁': 101.77,
    '银川': 106.23, '拉萨': 91.18, '呼和浩特': 111.75, '包头': 106.79, '温州': 120.7, '台州': 121.42,
    '嘉兴': 120.76, '绍兴': 120.58, '金华': 119.65, '舟山': 122.2, '衢州': 118.87, '湖州': 120.09
  };

  // ==================== 3.1 全角转半角 ====================
  function toHalfWidth(str) {
    return String(str).replace(/[\uFF01-\uFF5E]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
    }).replace(/\u3000/g, ' ');
  }

  // ==================== 3.2 中文数字转阿拉伯 ====================
  function cnToNum(s) {
    var digits = { '零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };
    if (!/[十百千万]/.test(s)) { // 纯数字字串 → 逐字拼接：二零零五 → 2005
      var out = '';
      for (var i = 0; i < s.length; i++) {
        var d = digits[s[i]];
        if (d === undefined) return NaN;
        out += d;
      }
      return parseInt(out, 10);
    }
    var units = { '十': 10, '百': 100, '千': 1000, '万': 10000 };
    var total = 0, section = 0, num = 0;
    for (var j = 0; j < s.length; j++) {
      var c = s[j];
      if (digits[c] !== undefined) { num = digits[c]; }
      else if (units[c] !== undefined) {
        var u = units[c];
        if (u === 10000) { section = (section + num) * u; total += section; section = 0; }
        else { section += (num || 1) * u; }
        num = 0;
      }
    }
    return total + section + num;
  }

  function chineseNumberToArabic(text) {
    var s = text.replace(/廿([一二三四五六七八九])/g, '二十$1').replace(/廿/g, '二十').replace(/卅/g, '三十');
    return s.replace(/[零一二两三四五六七八九十百千万]+/g, function (m) {
      var n = cnToNum(m);
      return isNaN(n) ? m : String(n);
    });
  }

  // ==================== 3.5 英文月份映射 ====================
  function mapEnglishMonths(text) {
    return text.toLowerCase().replace(/[a-z]+/g, function (w) {
      return EN_MONTHS[w] ? String(EN_MONTHS[w]) : w;
    });
  }

  // ==================== 3.3 日期分隔符归一化 ====================
  function normalizeSeparators(text) {
    return text
      .replace(/：/g, ':')
      .replace(/(\d)[时点]/g, '$1:')                       // 仅「数字 + 时/点」→ 时间分隔（子时/丑时的"时"不动）
      .replace(/(\d{4}):(\d{1,2}):(\d{1,2}):(\d{1,2}):(\d{1,2})/, '$1-$2-$3-$4:$5')  // 全冒号日期时间串
      .replace(/[分秒]/g, '')
      .replace(/日/g, '-')                                    // 日 → 日期分隔（保留数字边界）
      .replace(/号/g, '')
      .replace(/年|月/g, '-')
      .replace(/[.\-_\/、，,；;～~－—|\\#@*&()'"\[\]{}！!？?。\s]/g, '-')  // 其余分隔（含中文句号）→ -
      .replace(/-+/g, '-')
      .replace(/:-/g, ':');
  }

  // ==================== 3.4 连续数字智能拆分 + 格式规整 ====================
  function splitDigits(norm) {
    // 单个连续数字段 ≥9（如 18 位身份证号）→ 不拆分，避免误判成日期；
    // 但「8 位日期 + 时间」分属不同段（合计虽 ≥9）仍正常拆分
    if (/[0-9]{9,}/.test(norm)) return norm;
    var s = norm
      // D-M-Y / M-D-Y → Y-M-D（英文月份映射后产生，如 6-9-2005）
      .replace(/(\d{1,2})-(\d{1,2})-(\d{4})(?![-:\d])/g, function (m, a, b, y) {
        var m1 = +a, d1 = +b;
        if (m1 > 12 && d1 <= 12) return y + '-' + d1 + '-' + m1;   // D-M-Y
        return y + '-' + m1 + '-' + d1;                            // M-D-Y
      })
      // 2 位年 + 月日（05-6-9 → 2005-6-9）
      .replace(/(^|[^\d])(\d{2})-(\d{1,2})-(\d{1,2})(?![-:\d])/g, function (m, pre, yy, mo, d) {
        var y = +yy <= 26 ? 2000 + +yy : 1900 + +yy;
        return pre + y + '-' + mo + '-' + d;
      })
      // 长数字串（先长后短，避免 8 位抢跑 12 位）
      .replace(/(\d{14})(?!\d)/g, function (m) { return m.slice(0, 4) + '-' + m.slice(4, 6) + '-' + m.slice(6, 8) + '-' + m.slice(8, 10) + ':' + m.slice(10, 12); })
      .replace(/(\d{12})(?!\d)/g, function (m) { return m.slice(0, 4) + '-' + m.slice(4, 6) + '-' + m.slice(6, 8) + '-' + m.slice(8, 10) + ':' + m.slice(10, 12); })
      .replace(/(\d{8})(?!\d)/g, function (m) { return m.slice(0, 4) + '-' + m.slice(4, 6) + '-' + m.slice(6, 8); })
      .replace(/(\d{6})(?!\d)/g, function (m) {
        var yy = parseInt(m.slice(0, 2), 10);
        return (yy <= 26 ? 2000 + yy : 1900 + yy) + '-' + m.slice(2, 4) + '-' + m.slice(4, 6);
      })
      // 日期后跟 4 位紧凑时间（2005-06-09-1400 → 2005-06-09-00:01）
      .replace(/(\d{4})-(\d{1,2})-(\d{1,2})-(\d{4})(?![-:\d])/g, function (m, y, mo, d, hhmm) {
        var hh = +hhmm.slice(0, 2), mm = +hhmm.slice(2, 4);
        if (hh <= 23 && mm <= 59) return y + '-' + mo + '-' + d + '-' + hh + ':' + mm;
        return m;
      })
      // 4 位月日（0609 → 06-9，补当年）
      .replace(/(\d{4})(?![-:\d])/g, function (m) {
        var mm = +m.slice(0, 2), dd = +m.slice(2, 4);
        if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) return m.slice(0, 2) + '-' + m.slice(2, 4);
        return m;
      });
    return s;
  }

  // ==================== 预处理管道（统一入口）====================
  function preprocess(raw) {
    var half = toHalfWidth(raw);
    var cn = chineseNumberToArabic(half);
    var en = mapEnglishMonths(cn);
    var norm = normalizeSeparators(en);
    var split = splitDigits(norm);
    return { half: half, cn: cn, en: en, norm: norm, split: split };
  }

  // ==================== 8. 校验 ====================
  function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
  function validateDate(y, m, d, isLunar) {
    if (!isLunar) {
      if (m < 1 || m > 12) return false;
      var days = [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      return d >= 1 && d <= days[m - 1];
    }
    return m >= 1 && m <= 12 && d >= 1 && d <= 30;
  }
  function validateTime(h, mi) { return h >= 0 && h <= 23 && mi >= 0 && mi <= 59; }

  // ==================== 4.2 时间提取（先于日期，剥离后避免干扰）====================
  function extractTime(p, cnText) {
    // 时辰（原文匹配）
    for (var sc in SHICHEN) {
      if (cnText.indexOf(sc) >= 0) return { hour: SHICHEN[sc], minute: 0, rawText: sc };
    }
    // 口语时间词
    for (var o in ORAL_HOUR) {
      if (cnText.indexOf(o) >= 0) return { hour: ORAL_HOUR[o], minute: 0, rawText: o };
    }
    // 下午/晚上 X 点 → +12
    var pm = cnText.match(/(下午|晚上|傍晚|黄昏)(\d{1,2})/);
    if (pm) {
      var h = +pm[2];
      return { hour: h < 12 ? h + 12 : h, minute: 0, rawText: pm[0] };
    }
    // 上午/早上 X 点
    var am = cnText.match(/(上午|早上|早晨|凌晨)(\d{1,2})/);
    if (am) return { hour: +am[2], minute: 0, rawText: am[0] };
    // AM/PM
    var ap = cnText.match(/(\d{1,2}):(\d{1,2})?\s*(am|pm)/i);
    if (ap) {
      var hh = +ap[1];
      if (/pm/i.test(ap[3]) && hh < 12) hh += 12;
      if (/am/i.test(ap[3]) && hh === 12) hh = 0;
      return { hour: hh, minute: ap[2] ? +ap[2] : 0, rawText: ap[0] };
    }
    // 24 小时制（从归一化文本）
    var hm = p.split.match(/(\d{1,2}):(\d{1,2})?(?!\d)/);
    if (hm) return { hour: +hm[1], minute: hm[2] ? +hm[2] : 0, rawText: hm[0] };
    return null;
  }

  // 从归一化文本中剥离已识别的时间片段，返回剩余文本（供日期提取）
  function stripTime(split, time) {
    if (!time) return split;
    return split.replace(new RegExp(time.rawText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), ' ');
  }

  // ==================== 4.1 日期提取 ====================
  function extractDate(restSplit, cnText, now) {
    // 相对日期
    for (var i = 0; i < RELATIVE.length; i++) {
      if (RELATIVE[i].re.test(cnText)) {
        var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + RELATIVE[i].day);
        return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), isLunar: false, rawText: cnText.match(RELATIVE[i].re)[0], _relative: true };
      }
    }
    // 节气名
    for (var j = 0; j < JIEQI_LIST.length; j++) {
      if (cnText.indexOf(JIEQI_LIST[j]) >= 0) {
        return { year: now.getFullYear(), month: null, day: null, isLunar: false, rawText: JIEQI_LIST[j], _jieqi: JIEQI_LIST[j] };
      }
    }
    // 干支年
    var gz = cnText.match(/([甲乙丙丁戊己庚辛壬癸])([子丑寅卯辰巳午未申酉戌亥])年/);
    if (gz) {
      var zhiI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'].indexOf(gz[2]);
      var y = 1984 + ((GANZHI_YEAR[gz[1]] - zhiI + 60) % 60);
      while (y > now.getFullYear()) y -= 60;
      return { year: y, month: null, day: null, isLunar: false, rawText: gz[0], _ganzhiYear: true };
    }
    // 生肖年
    for (var z = 0; z < ZODIAC.length; z++) {
      if (cnText.indexOf(ZODIAC[z] + '年') >= 0) {
        var zy = 2020 + ((z + 12) % 12); // 2020 鼠年
        while (zy > now.getFullYear()) zy -= 12;
        return { year: zy, month: null, day: null, isLunar: false, rawText: ZODIAC[z] + '年', _zodiacYear: true };
      }
    }
    var isLunar = /农历|阴历|旧历|夏历/.test(cnText);
    var s = restSplit;
    // 完整公历 Y-M-D（时间已先行剥离，故只需禁止后跟数字）
    // ⚠️ 年份须落在 1900–2100（与历法底座 lunar-javascript 的可算范围一致；超出无法排盘）
    var m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})(?!\d)/);
    if (m) {
      var mm = +m[2], dd = +m[3], yy = +m[1];
      if (yy < 1900 || yy > 2100) {
        return { year: yy, month: mm, day: dd, isLunar: isLunar, rawText: m[0], _outOfRange: true };
      }
      if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
        return { year: yy, month: mm, day: dd, isLunar: isLunar, rawText: m[0] };
      }
      // 月/日越界（如 1990年13月45日）：标记为完整但非法，交由校验拒绝为 unknown
      return { year: yy, month: mm, day: dd, isLunar: isLunar, rawText: m[0], _invalidDate: true };
    }
    // Y-M（不完整）
    var ym = s.match(/(\d{4})-(\d{1,2})(?!\d)/);
    if (ym && +ym[2] >= 1 && +ym[2] <= 12) {
      return { year: +ym[1], month: +ym[2], day: null, isLunar: isLunar, rawText: ym[0], _incomplete: true };
    }
    // 仅 4 位年份
    var y4 = s.match(/(\d{4})(?!\d)/);
    if (y4 && +y4[1] >= 1900 && +y4[1] <= 2100) {
      return { year: +y4[1], month: null, day: null, isLunar: isLunar, rawText: y4[0], _incomplete: true };
    }
    // M-D（补当年；要求月日合理，避免误匹配）
    var md = s.match(/(\d{1,2})-(\d{1,2})(?!\d)/);
    if (md && +md[1] >= 1 && +md[1] <= 12 && +md[2] >= 1 && +md[2] <= 31) {
      return { year: now.getFullYear(), month: +md[1], day: +md[2], isLunar: isLunar, rawText: md[0] };
    }
    // 仅 2 位年份（88年 → 1988）：前后都不得贴数字，避免从 9 位纯数字串尾部误取「89」
    var y2 = s.match(/(^|[^\d])(\d{2})(?!\d)/);
    if (y2) {
      var yy = +y2[2];
      if (yy >= 1 && yy <= 99) {
        return { year: yy <= 26 ? 2000 + yy : 1900 + yy, month: null, day: null, isLunar: isLunar, rawText: y2[2], _incomplete: true };
      }
    }
    return null;
  }

  // ==================== 4.3 性别提取 ====================
  function extractGender(text) {
    if (/(男|乾造|乾|阳男|\bmale\b|\bm\b)/i.test(text)) return 'male';
    if (/(女|坤造|坤|阴女|\bfemale\b|\bf\b)/i.test(text)) return 'female';
    return null;
  }

  // ==================== 4.3b 出生城市提取（为真太阳时备料，不接算法）====================
  // 命中 CITY 表里任一城市名即返回该城市（{ city, lon }）。城市是「地名」，不参与
  // 姓名/日期/时间识别（与它们天然不冲突：城市表里的词都不是日期/时辰/虚词）。
  // 说明：此实体只作「数据备料」——真太阳时校正算法随「深度八字」方向落地时再接，
  //   届时 extractCity 已就位、输入契约不变。
  function extractCity(text) {
    var t = String(text == null ? '' : text);
    for (var c in CITY) {
      if (t.indexOf(c) >= 0) return { city: c, lon: CITY[c] };
    }
    return null;
  }


  // ==================== 4.4 / 9. 姓名提取 + 三级消歧义 ====================
  // 第一级：归属关系标记（非贪婪 + 后查边界，避免吞掉后续文字）
  var OWNERSHIP = [
    // 「X这个名字 / X的姓名 / X这个名字怎么样」——须先于通用匹配，否则"这/个"会污染候选
    /([\u4e00-\u9fa5]{2,4}?)(?:这)?(?:个)?(?:名字|姓名)/,
    /我(?:的)?名字(?:叫|是)?([\u4e00-\u9fa5]{2,4}?)(?=[，,。.、！!？?\s]|你|我|他|帮|想|的|$)/,
    /我叫([\u4e00-\u9fa5]{2,4}?)(?=[，,。.、！!？?\s]|$|的|，)/,
    /我是([\u4e00-\u9fa5]{2,4}?)(?=[，,。.、！!？?\s]|$|的|，)/,
    /现在叫([\u4e00-\u9fa5]{2,4}?)(?=[，,。.、！!？?\s]|$|的|，)/,
    /([\u4e00-\u9fa5]{2,4}?)(?:就是)?我(?=的|，|,|$|\s)/,
    /([\u4e00-\u9fa5]{2,4}?)本人/,
    /(?:帮|给|为)([\u4e00-\u9fa5]{2,4}?)(?:算|排|批|测|分析|取名|改名)/,
    /(?:算|排|批|测|分析)([\u4e00-\u9fa5]{2,4}?)的/,
    /([\u4e00-\u9fa5]{2,4}?)的(?:八字|命|名字|姓名)/
  ];

  function findOwnershipName(text) {
    for (var i = 0; i < OWNERSHIP.length; i++) {
      var m = text.match(OWNERSHIP[i]);
      if (!m || !m[1]) continue;
      var cand = m[1];
      if (!isExcludedName(cand)) return cand;
      // 词首黏连了功能字/动词（如「看白玖玖」）→ 清洗后再判
      var clean = cleanName(cand);
      if (clean !== cand && clean.length >= 2 && !isExcludedName(clean)) return clean;
    }
    return null;
  }

  function hasBadNameChar(w) {
    for (var i = 0; i < BAD_NAME_CHARS.length; i++) {
      if (w.indexOf(BAD_NAME_CHARS[i]) >= 0) return true;
    }
    return false;
  }

  function isKeywordish(w) {
    var all = KW.bazi.concat(KW.almanac, KW.nameology, KW.select, KW.event, KW.jieqi, KW.ganzhi);
    return all.some(function (k) { return w.indexOf(k) >= 0; });
  }

  function isExcludedName(w) {
    if (!w || w.length < 2 || w.length > 4) return true;
    if (/^\d+$/.test(w)) return true;
    if (/[年月日时分秒]/.test(w)) return true;      // 含时间单位 → 非姓名
    if (NAME_EXCLUDE.indexOf(w) >= 0) return true;
    if (KW_STRONG.indexOf(w) >= 0) return true;
    if (hasBadNameChar(w)) return true;
    return false;
  }

  // 第二级：位置权重 + 结构模式匹配
  function resolveConflict(token, entities, hasBaziKw) {
    if (entities.gender && entities.date) return 'name';   // 性别+日期 → 姓名
    if (entities.date && entities.time) return 'name';      // 日期+时间 → 姓名
    if (hasBaziKw) return 'name';                            // 排盘类关键词 → 姓名
    if (KW_STRONG.indexOf(token) >= 0) return 'conflict';    // 强关键词但参数不足 → 追问
    return 'name';
  }

  function extractName(cnText, entities) {
    // 第一级：归属声明优先
    var own = findOwnershipName(cnText);
    if (own) return { name: own, conflict: null };

    var words = cnText.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
    var hasBaziKw = KW.bazi.some(function (k) { return cnText.indexOf(k) >= 0; });
    var hasNameKw = KW.nameology.some(function (k) { return cnText.indexOf(k) >= 0; });

    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (isExcludedName(w)) {
        // 词首/尾黏连功能字（如「看白玖玖」「白玖玖这」）→ 清洗后再判
        var cw = cleanName(w);
        if (cw === w || isExcludedName(cw)) continue;
        w = cw;
      }
      if (isKeywordish(w)) continue;
      var r = resolveConflict(w, entities, hasBaziKw);
      if (r === 'name') return { name: w, conflict: null };
      if (r === 'conflict') return { name: null, conflict: w };
    }
    // 无有效候选时，若存在强关键词冲突词，交第三级追问
    if (hasNameKw || hasBaziKw) {
      for (var k = 0; k < words.length; k++) {
        if (KW_STRONG.indexOf(words[k]) >= 0) return { name: null, conflict: words[k] };
      }
    }
    return { name: null, conflict: null };
  }

  // ==================== 4.5 关键词提取 ====================
  function extractKeywords(text) {
    var found = [];
    Object.keys(KW).forEach(function (k) {
      KW[k].forEach(function (w) {
        if (text.indexOf(w) >= 0 && found.indexOf(w) < 0) found.push(w);
      });
    });
    return found;
  }

  // ==================== 5. 意图推断决策树 ====================
  function decide(ent, keywords) {
    var hasDate = !!(ent.date && ent.date.year && ent.date.month && ent.date.day);
    var hasPartialDate = !!(ent.date && ent.date.year && ent.date._incomplete);
    var hasTime = !!ent.time;
    var hasGender = !!ent.gender;
    var hasName = !!ent.name;
    var kwBazi = keywords.some(function (k) { return KW.bazi.indexOf(k) >= 0; });
    var kwAlmanac = keywords.some(function (k) { return KW.almanac.indexOf(k) >= 0; });
    var kwName = keywords.some(function (k) { return KW.nameology.indexOf(k) >= 0; });
    var kwSelect = keywords.some(function (k) { return KW.select.indexOf(k) >= 0; });
    var kwEvent = keywords.some(function (k) { return KW.event.indexOf(k) >= 0; });
    var kwJieqi = keywords.some(function (k) { return KW.jieqi.indexOf(k) >= 0; });
    var kwGanzhi = keywords.some(function (k) { return KW.ganzhi.indexOf(k) >= 0; });

    if (!hasDate && !hasPartialDate && !hasTime && !hasGender && !hasName && keywords.length === 0) {
      return { intent: 'unknown', confidence: 'none', candidates: null, prompt: null };
    }

    // 节气/干支查询（优先于黄历：「明天什么干支」应走 calendar）
    if ((kwJieqi || kwGanzhi) && !hasName) {
      return { intent: 'calendar', confidence: 'high', candidates: null, prompt: null };
    }

    // 择日：需强触发词（"选个日子/哪天适合"），事项词归黄历（问吉凶）
    if (kwSelect) {
      return { intent: 'selection', confidence: hasDate ? 'medium' : 'low', candidates: null, prompt: hasDate ? null : '想为什么事择日？请告诉我事项与大致日期范围。' };
    }

    // 八字排盘
    if (hasDate && hasTime && hasGender) return { intent: 'bazi', confidence: 'high', candidates: null, prompt: null };
    if (hasDate && hasGender && hasName) return { intent: 'bazi', confidence: 'high', candidates: null, prompt: null };
    if (hasDate && hasTime && !hasGender) return { intent: 'bazi', confidence: 'medium', candidates: null, prompt: '已记录出生时间，请补充性别（男/女）以完成排盘。' };
    if (hasDate && kwBazi) return { intent: 'bazi', confidence: 'medium', candidates: null, prompt: '已记录出生日期，请补充出生时间（如 00:01）以完成排盘。' };
    if (hasName && hasDate && !hasGender) return { intent: 'bazi', confidence: 'medium', candidates: null, prompt: '已记录姓名与日期，请补充性别（男/女）以完成排盘。' };
    if (hasName && (kwBazi || hasTime)) return { intent: 'bazi', confidence: 'low', candidates: null, prompt: '请补充出生日期与性别，例如「白玖玖，女，2005年6月9日子时」。' };

    // 姓名分析（无日期、无性别时）；有姓名+性别 → 归八字追问日期
    if (hasName && hasGender && !hasDate && !hasPartialDate) {
      return { intent: 'bazi', confidence: 'low', candidates: null, prompt: '已记录姓名与性别，请补充出生日期与时间，例如「白玖玖，女，2005年6月9日子时」。' };
    }
    if (hasName && !hasDate && !hasPartialDate) return { intent: 'nameology', confidence: 'high', candidates: null, prompt: null };

    // 黄历宜忌：有完整日期、或有黄历/事项词
    if (hasDate && !hasTime) return { intent: 'almanac', confidence: 'high', candidates: null, prompt: null };
    if ((kwAlmanac || kwEvent) && !hasName) return { intent: 'almanac', confidence: 'high', candidates: null, prompt: null };

    // 日期不完整
    if (hasPartialDate) return { intent: 'bazi', confidence: 'low', candidates: null, prompt: '日期不完整，请补充完整的出生年月日。' };

    // 仅性别 / 仅关键词
    if (hasGender) return { intent: 'unknown', confidence: 'low', candidates: null, prompt: '请配合出生日期与时间，例如「男，2005年6月9日子时」。' };
    if (keywords.length > 0) return { intent: 'unknown', confidence: 'low', candidates: null, prompt: null };

    return { intent: 'unknown', confidence: 'none', candidates: null, prompt: null };
  }

  // ==================== 主入口：parse ====================
  function parse(raw, prev) {
    var now = new Date();
    var input = String(raw == null ? '' : raw);
    // 7.1 空/纯空格/纯标点
    if (!input.trim() || !/[\u4e00-\u9fa5a-zA-Z0-9]/.test(input)) {
      return { intent: 'unknown', confidence: 'none', entities: emptyEntities(), candidates: null, prompt: null, error: null, _empty: true };
    }
    // 7.1 超长截断
    if (input.length > 500) input = input.slice(0, 500);

    // 非玄学输入拦截（规范 §7）
    if (NON_METAPHYSICAL.some(function (w) { return input.indexOf(w) >= 0; })) {
      return { intent: 'unknown', confidence: 'none', entities: emptyEntities(), candidates: null, prompt: null, error: null, _nonMeta: true };
    }

    var p = preprocess(input);
    var entities = emptyEntities();
    if (prev && prev.entities) entities = mergeEntities(prev.entities, entities);

    // 时间先提取并剥离，避免干扰日期
    entities.time = extractTime(p, p.cn);
    var restSplit = stripTime(p.split, entities.time);
    entities.date = extractDate(restSplit, p.cn, now);
    entities.gender = entities.gender || extractGender(p.cn);
    entities.city = entities.city || extractCity(p.cn);
    var nameRes = extractName(p.cn, entities);
    entities.name = entities.name || nameRes.name;
    entities.keywords = extractKeywords(p.cn);

    // 8. 实体校验
    // ① 年份越界（历法底座可算范围 = 1900–2100）：明确提示，不静默算错
    if (entities.date && entities.date.year && (entities.date.year < 1900 || entities.date.year > 2100)) {
      return { intent: 'unknown', confidence: 'none', entities: entities, candidates: null, prompt: null, error: '暂只支持 1900–2100 年的日期推算，请检查年份。' };
    }
    if (entities.date && entities.date.month && entities.date.day && !entities.date._incomplete) {
      if (!validateDate(entities.date.year, entities.date.month, entities.date.day, entities.date.isLunar)) {
        return { intent: 'unknown', confidence: 'none', entities: entities, candidates: null, prompt: null, error: '日期不存在，请检查后重新输入。' };
      }
    }
    if (entities.time && !validateTime(entities.time.hour, entities.time.minute)) {
      return { intent: 'unknown', confidence: 'none', entities: entities, candidates: null, prompt: null, error: '时间格式错误，应为 0-23 时、0-59 分。' };
    }

    // 第三级追问：消歧义冲突
    if (nameRes.conflict && !entities.name) {
      return {
        intent: 'unknown', confidence: 'low', entities: entities,
        candidates: [
          { intent: 'nameology', reason: '把「' + nameRes.conflict + '」当姓名分析' },
          { intent: 'almanac', reason: '查询黄历宜忌' }
        ],
        prompt: '检测到「' + nameRes.conflict + '」可能是您的姓名，也可能您想查询黄历。请确认：',
        error: null
      };
    }

    var d = decide(entities, entities.keywords);
    return { intent: d.intent, confidence: d.confidence, entities: entities, candidates: d.candidates, prompt: d.prompt, error: null };
  }

  function emptyEntities() {
    return { name: null, date: null, time: null, gender: null, city: null, keywords: [] };
  }

  // 追问合并：新输入补足旧输入缺失的字段
  function mergeEntities(oldE, newE) {
    return {
      name: newE.name || oldE.name || null,
      date: newE.date || oldE.date || null,
      time: newE.time || oldE.time || null,
      gender: newE.gender || oldE.gender || null,
      city: newE.city || oldE.city || null,
      keywords: (oldE.keywords || []).concat(newE.keywords || []).filter(function (v, i, a) { return a.indexOf(v) === i; })
    };
  }

  // 对外只暴露 parse（主入口）+ KW（analyzer.js 的节气分支读 INTENT.KW.jieqi 用）。
  // 曾经的 5 个「测试钩子」导出（_preprocess/_cnToNum/_normalizeSeparators/_validateDate/_validateTime）
  // 与 JIEQI_LIST 导出全仓零调用（测试改用行为断言，不读内部实现），已删；内部函数本体保留（parse 仍依赖）。
  return {
    parse: parse,
    KW: KW
  };
});
