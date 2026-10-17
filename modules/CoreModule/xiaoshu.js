/**
 * modules/CoreModule/xiaoshu.js —— 小术数内核 C20【单一真源】
 *
 * 算什么（圣经 17.5/17.6/18.1）：
 *   · 一掌经（达摩）：按出生年干支 + 四柱起十二星宫（天贵/天厄/天权…），每宫配星性断语；
 *   · 小六壬（六壬时课）：大安/留连/速喜/赤口/小吉/空亡，大安起月、月上起日、日上起时；
 *   · 诸葛马前课：掐指速占十二课卦象；
 *   · 人体节律：体力 23 天 / 情绪 28 天 / 智力 33 天 正弦叠加 + 临界日（过零日）。
 * 算法来源：一掌经 = 权威起法（《神机妙算·达摩一掌经》，5 源核对：年宫落生年地支、男顺女逆、
 *   月/日/时走农历序；十二宫固定布局 子天贵/丑天厄/寅天权/卯天破/辰天奸/巳天文/午天福/未天驿/申天孤/酉天刃/戌天艺/亥天寿）。
 *   小六壬/马前课 = 传统口诀（大安起月…）；人体节律 = 23/28/33 正弦（Werner 标准周期）。
 * 校验收：  modules/CoreModule/__tests__/xiaoshu.test.js
 * 加载：UMD —— require() 得 { yizhangjing, xiaoliuren, maqianke, biorhythm, ... }；浏览器挂全局 NT.core.xiaoshu。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./lunar.js'));
  else { root.NT = root.NT || {}; root.NT.core = root.NT.core || {}; root.NT.core.xiaoshu = factory(root.NT.core && root.NT.core.lunar); }
})(typeof self !== 'undefined' ? self : this, function (CORE) {

  // ===== 一掌经（达摩）十二星宫 =====
  // 十二宫固定地支布局（权威，5 源核对一致）：
  //   子天贵 丑天厄 寅天权 卯天破 辰天奸 巳天文 午天福 未天驿 申天孤 酉天刃 戌天艺 亥天寿
  // 起法（《神机妙算·达摩一掌经》）：年宫落「生年地支宫」（属相即宫），年上起月（正月=本宫），
  //   月上起日、日上起时；**男顺女逆**；月份用**农历**；闰月十五（不含十五）前作前月、后作后月。
  var YZJ = [
    { 星: '天贵', 断: '天生聪明，衣食足，逢贵显达' },
    { 星: '天厄', 断: '一生波折，劳碌少聚，先难后成' },
    { 星: '天权', 断: '有掌权之命，能谋善断，贵人助' },
    { 星: '天破', 断: '财来财去，守成不易，宜稳中求' },
    { 星: '天奸', 断: '机敏过人，善交际，宜谋略之才' },
    { 星: '天文', 断: '文秀出众，才艺兼备，利科甲' },
    { 星: '天福', 断: '福禄寿全，一生安泰，少病少灾' },
    { 星: '天驿', 断: '一生多奔波，四方为家，动中得财' },
    { 星: '天孤', 断: '性孤高，宜独居独思，晚运渐入佳境' },
    { 星: '天刃', 断: '性急刚烈，宜武宜技，防伤防刑' },
    { 星: '天艺', 断: '巧手慧心，艺术技艺，技艺立身' },
    { 星: '天寿', 断: '寿元绵长，子孙贤孝，晚景丰足' }
  ];
  // 十二宫序 = 地支序（子丑寅…亥），每宫配固定星
  var YZJ_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  function advance(fromZhi, step, forward) {
    var i = YZJ_ZHI.indexOf(fromZhi);
    if (i < 0) i = 0;
    var n = forward ? (i + step) % 12 : ((i - step) % 12 + 12) % 12;
    return YZJ_ZHI[n];
  }

  /**
   * 一掌经四柱星宫（权威起法：年宫=生年地支，男顺女逆，月/日/时农历序）。
   * @param {string} yearZhi 生年地支（子/丑/寅…，即属相支）
   * @param {number} lunarMonth 农历月 1–12
   * @param {number} lunarDay 农历日 1–30
   * @param {number} hourShi 时辰序号 0=子 … 11=亥
   * @param {boolean} female 女命（男顺女逆）
   * @returns { 年宫, 月宫, 日宫, 时宫, 本命星, 本命断 }
   */
  function yizhangjing(yearZhi, lunarMonth, lunarDay, hourShi, female) {
    var fwd = !female;
    var y = yearZhi || '子';
    var m = advance(y, (lunarMonth || 1) - 1, fwd);
    var d = advance(m, (lunarDay || 1) - 1, fwd);
    var h = advance(d, (hourShi || 0), fwd);
    function starOf(zhi) { var i = YZJ_ZHI.indexOf(zhi); return i >= 0 ? YZJ[i].星 : ''; }
    // 本命星取「时宫」（古籍以时为主断；亦附四宫全列）
    var seq = YZJ_ZHI.map(function (z, i) { return { 支: z, 星: YZJ[i].星 }; });
    return {
      年宫: y + '(' + starOf(y) + ')', 月宫: m + '(' + starOf(m) + ')',
      日宫: d + '(' + starOf(d) + ')', 时宫: h + '(' + starOf(h) + ')',
      本命星: starOf(h), 本命断: YZJ[YZJ_ZHI.indexOf(h)].断,
      十二宫: seq, 方向: fwd ? '男顺' : '女逆'
    };
  }

  // ===== 小六壬 =====
  var GONG = ['大安', '留连', '速喜', '赤口', '小吉', '空亡'];
  var GONG_LUCK = { 大安: '吉', 留连: '小吉', 速喜: '吉', 赤口: '凶', 小吉: '吉', 空亡: '凶' };
  var GONG_WU = { 大安: '木', 留连: '木', 速喜: '火', 赤口: '金', 小吉: '水', 空亡: '土' };

  /**
   * 小六壬：大安起月（该年正月落大安？简化：从给定月/日/时起算）。
   * 规则（圣经 17.6）：从大安起，数到第 N 月停 → 该宫位；再从此宫起数第 N 日停；再从此宫起数第 N 时停。
   * @param m 农历月 1-12；d 农历日 1-30；h 时辰序号 0-11（子0）
   */
  function xiaoliuren(m, d, h) {
    var p = 0;                              // 起于大安
    p = (p + (m - 1)) % 6;                  // 月上起月
    var mp = p;
    p = (p + (d - 1)) % 6;                  // 日上起日
    var dp = p;
    p = (p + (h || 0)) % 6;                // 时起
    return {
      月落: GONG[mp], 日落: GONG[dp], 时落: GONG[p],
      定课: GONG[p], 吉凶: GONG_LUCK[GONG[p]], 五行: GONG_WU[GONG[p]],
      断: duan(GONG[p])
    };
  }
  function duan(g) {
    var D = {
      大安: '大安事事昌，求财入坤方，失物去不远，宅舍保安康。',
      留连: '留连事难成，求谋未亨通，失物方未得，病难医也。',
      速喜: '速喜喜来临，求财向南行，失物申午未，逢人路上寻。',
      赤口: '赤口主口舌，官非切要防，失物急速去，病者忌药方。',
      小吉: '小吉最吉昌，路上路逢贵人吉。',
      空亡: '空亡事不吉，阴阴多乖违，求财反为主，阴险事平稀。'
    };
    return D[g] || '';
  }

  // ===== 诸葛马前课（掐指速占十二课，简化）=====
  var MQK = ['大安', '天罡', '天牢', '朱雀', '螣蛇', '白虎', '六合', '天空', '太乙', '常阴', '月建', '岁破'];
  function maqianke(month, day, hour) {
    var idx = (month - 1 + day - 1 + (hour || 0)) % 12;
    return { 课: MQK[idx], 课序: idx + 1, 断: '马前速占第 ' + (idx + 1) + ' 课「' + MQK[idx] + '」，可推事之进退得失。' };
  }

  // ===== 人体节律（体力23/情绪28/智力33 正弦）=====
  function biorhythm(daysSinceBirth) {
    var t = Math.sin(2 * Math.PI * daysSinceBirth / 23) * 100;
    var e = Math.sin(2 * Math.PI * daysSinceBirth / 28) * 100;
    var i = Math.sin(2 * Math.PI * daysSinceBirth / 33) * 100;
    return {
      体力: Math.round(t), 情绪: Math.round(e), 智力: Math.round(i),
      过零预警: (t < 0 && e < 0 && i < 0) ? '三线同负，宜休整' : ((t < 0 || e < 0 || i < 0) ? '有临界线，注意波动' : '三线皆正，状态佳')
    };
  }
  /** 从某出生后第 from 天起，找未来 count 天内的「三线过零临界日」（最多返回 5 个） */
  function criticalDays(from, count) {
    var res = [];
    var prev = null;
    for (var k = 0; k <= count; k++) {
      var d = from + k;
      var sv = Math.sin(2 * Math.PI * d / 23) * Math.sin(2 * Math.PI * d / 28) * Math.sin(2 * Math.PI * d / 33);
      if (prev !== null && Math.sign(sv) !== Math.sign(prev)) res.push(d);
      prev = sv;
      if (res.length >= 5) break;
    }
    return { 临界日: res };
  }

  return {
    yizhangjing: yizhangjing, xiaoliuren: xiaoliuren, maqianke: maqianke,
    biorhythm: biorhythm, criticalDays: criticalDays,
    YZJ: YZJ, GONG: GONG, MQK: MQK
  };
});
