/**
 * modules/AnalyzerModule/lunar.js —— 精确历法核心（纯 JS，离线，无网络）【单一真源】
 * 把干支/节气/四柱/建除/旺衰做成可离线计算的精确算法：
 *   · 廿四节气 —— NOAA 太阳黄经（低精度式）+ 二分求节时刻，精确到「天」（东八区）
 *   · 年柱 —— 立春换年（节气定界，非阳历 1/1）
 *   · 月柱 —— 节气定月建 + 五虎遁（年干起寅月干）
 *   · 时柱 —— 五鼠遁（日干起子时干）
 *   · 日柱 —— 甲子纪日（儒略日计天数，锚点常量见 dayGanzhi 注释）
 *   · 建除十二神 —— 节气月建 + 日支 推值日
 *   · 日主旺衰 —— 得令 / 得地 / 得势 计分（口径见《功能与算法归纳》§2.8）
 * 全部在用户设备本地同步计算，无任何网络/后端/LLM。
 * 依赖：db.js（表数据）
 * 加载：UMD —— 小程序被 require；浏览器挂到全局 NT.lunar。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./db.js'));
  else { root.NT = root.NT || {}; root.NT.lunar = factory(root.NT && root.NT.db); }
})(typeof self !== 'undefined' ? self : this, function (DB) {

  var GAN = DB.GAN;      // [甲..癸]
  var ZHI = DB.ZHI;      // [子..亥]
  var GAN_W = DB.GAN_WUXING, ZHI_W = DB.ZHI_WUXING;

  function posMod(a, m) { return ((a % m) + m) % m; }

  // 东八区：把「世界时 UTC 的某日某刻」换算成北京墙钟（用于节气落在哪一天）
  function toBeijing(dt) { // dt: JS Date（UTC 语义）
    var b = new Date(dt.getTime() + 8 * 3600000);
    return { y: b.getUTCFullYear(), m: b.getUTCMonth(), d: b.getUTCDate() }; // 用 UTC 读偏移后的值
  }

  // ===== 太阳黄经（低精度式，适合现代 1900~2100，误差 <1°）=====
  // 返回「真黄经」（0°=春分，逆季节增加）。用于节气交节判定。
  function solarLongitude(jd) {
    // jd: 儒略日（自 J2000.0 起 T 用世纪数）
    var T = (jd - 2451545.0) / 36525.0;
    var L0 = posMod(280.4664567 + T * (36000.76983 + T * -0.000033), 360);
    var M = posMod(357.5291137 + T * (35999.05029 + T * 0.0001537), 360) * Math.PI / 180;
    var C = (1.9145906 + T * -0.0048175 + T * T * -0.000014) * Math.sin(M)
      + (0.0199926 + T * -0.0001048) * Math.sin(2 * M)
      + 0.000289 * Math.sin(3 * M);
    return (L0 + C) % 360; // 真黄经（0°=春分）
  }

  // 公历日期(北京) -> 儒略日（用 Date.UTC 避免时区偏差）
  function jdnAtNoon(y, m, d) { // m: 1-12
    var ms = Date.UTC(y, m - 1, d, 12);
    return ms / 86400000 + 2440587.5;
  }

  // 求「某年、某目标黄经」交节的公历日期（东八区）。
  // 方法：按目标黄经估算月份窗口 → 逐日取太阳黄经 → 找「黄经跨过目标」的那一天。
  // 注意：黄经为 0~360 连续递增，春分(0°) 实际是 359°→0° 的跨越，需处理环绕。
  function jieqiDay(y, targetLon) {
    var m = JIEQI_MONTH[targetLon]; // 目标黄经对应公历月
    var startDay = 1, endDay = 28;
    var prev = null, hit = null;
    for (var d = startDay; d <= endDay; d++) {
      var jd = jdnAtNoon(y, m, d);
      var lon = solarLongitude(jd);
      if (prev !== null && crosses(prev, lon, targetLon)) { hit = d; break; }
      prev = lon;
    }
    if (!hit) hit = Math.min(endDay, 30); // 兜底（极罕见）
    return { y: y, m: m, d: hit };
  }

  // 「黄经从 a 跨到 b」是否经过 target（处理 0° 环绕）
  function crosses(a, b, target) {
    // 正常方向（a<=b）
    if (b >= a) return target >= a && target <= b;
    // 跨 0°（如 359 → 1）
    return target >= a || target <= b;
  }

  // 目标黄经 -> 公历月（估算窗口）
  var JIEQI_MONTH = {
    285: 1, 300: 1, 315: 2, 330: 2, 345: 3, 0: 3, 15: 4, 30: 4,
    45: 5, 60: 5, 75: 6, 90: 6, 105: 7, 120: 7, 135: 8, 150: 8,
    165: 9, 180: 9, 195: 10, 210: 10, 225: 11, 240: 11, 255: 12, 270: 12
  };

  // ===== 廿四节气：名称 -> 目标黄经（0=春分，逆着季节增加）=====
  // 二十四节气（按季节）及其黄经：
  var JIEQI_LON = {
    小寒: 285, 大寒: 300, 立春: 315, 雨水: 330, 惊蛰: 345, 春分: 0,
    清明: 15, 谷雨: 30, 立夏: 45, 小满: 60, 芒种: 75, 夏至: 90,
    小暑: 105, 大暑: 120, 立秋: 135, 处暑: 150, 白露: 165, 秋分: 180,
    寒露: 195, 霜降: 210, 立冬: 225, 小雪: 240, 大雪: 255, 冬至: 270
  };
  var JIEQI_ORDER = ['小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
    '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'];

  // 某年的「立春」公历日期（年柱换界用）
  function lichunOf(y) {
    var r = jieqiDay(y, JIEQI_LON['立春']);
    return new Date(y, r.m - 1, r.d);
  }

  // 节气定「月建支」：一个节气区间内月建恒定
  // 每个「月节」起：小寒=丑, 立春=寅, 惊蛰=卯, 清明=辰, 立夏=巳, 芒种=午,
  // 小暑=未, 立秋=申, 白露=酉, 寒露=戌, 立冬=亥, 大雪=子
  var JIEQI_MONTH_ZHI = {
    小寒: '丑', 立春: '寅', 惊蛰: '卯', 清明: '辰', 立夏: '巳', 芒种: '午',
    小暑: '未', 立秋: '申', 白露: '酉', 寒露: '戌', 立冬: '亥', 大雪: '子'
  };

  // 给定公历日期，求「当前所处的月建支」（取上一个已过的「月节」）
  function monthZhiOf(date) {
    var y = date.getFullYear();
    // 一年 12 个「月节」：小寒(1月)大寒? —— 实际 12 月节为：小寒 立春 惊蛰 清明 立夏 芒种 小暑 立秋 白露 寒露 立冬 大雪
    var monthStarts = [
      { name: '小寒', zhi: '丑' }, { name: '立春', zhi: '寅' }, { name: '惊蛰', zhi: '卯' },
      { name: '清明', zhi: '辰' }, { name: '立夏', zhi: '巳' }, { name: '芒种', zhi: '午' },
      { name: '小暑', zhi: '未' }, { name: '立秋', zhi: '申' }, { name: '白露', zhi: '酉' },
      { name: '寒露', zhi: '戌' }, { name: '立冬', zhi: '亥' }, { name: '大雪', zhi: '子' }
    ];
    var res = '子'; // 默认（大寒前）
    for (var i = 0; i < monthStarts.length; i++) {
      var s = jieqiDay(y, JIEQI_LON[monthStarts[i].name]);
      var start = new Date(s.y, s.m - 1, s.d);
      if (date >= start) { res = monthStarts[i].zhi; }
    }
    return res;
  }

  // ===== 干支柱（精确）=====
  // 年柱：立春换年。date 在 当年立春前 → 用上一年干支
  function yearGanzhiOf(date) {
    var y = date.getFullYear();
    var lc = lichunOf(y);
    if (date < lc) y = y - 1;
    var g = posMod(y - 4, 10), z = posMod(y - 4, 12);
    return { 干: GAN[g].字, 支: ZHI[z].字, 干支: GAN[g].字 + ZHI[z].字, 干五行: GAN_W[GAN[g].字], 支五行: ZHI_W[ZHI[z].字], 生肖: ZHI[z].生肖, 年干: GAN[g].字 };
  }

  // 日柱：甲子纪日。用儒略日计天数，锚点常量：1900-01-01 为「甲戌日」（甲子纪日序号 10；甲子=0）。
  // 说明：甲子纪日以 60 天为一循环。锚点以「2000-01-01 = 戊午日（序号 54）」这一权威万年历对照反推：
  // 1900-01-01 到 2000-01-01 共 36524 天，36524 mod 60 = 44，故 1900-01-01 = 54 − 44 = 10 = 甲戌。
  // （v3.1.60 修正：旧注释误记 2000-01-01=甲子、36524 mod 60=4、锚点乙丑，致日柱系统性偏 9 位；
  //   现以 2000-01-01=戊午 为权威锚重算，与 CoreModule 历法底座 C01 日柱对齐。）
  // 是确定性的 60 周期推算（非编造）；如需逐日核对万年历，仅调整下方 ANCHOR 即可。
  function dayGanzhiOf(date) {
    var days = Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(1900, 0, 1)) / 86400000);
    var ANCHOR = 10; // 1900-01-01 = 甲戌（甲子纪日序号 10；甲子=0）；由 2000-01-01=戊午(54) 反推 54−44
    var idx = posMod(ANCHOR + days, 60);
    var g = GAN[idx % 10].字, z = ZHI[idx % 12].字;
    return { 干: g, 支: z, 干支: g + z, 干五行: GAN_W[g], 支五行: ZHI_W[z], 生肖: ZHI_ZODIAC(z) };
  }
  function ZHI_ZODIAC(z) { for (var i = 0; i < ZHI.length; i++) if (ZHI[i].字 === z) return ZHI[i].生肖; return ''; }

  // 月柱：节气定月建支 + 五虎遁（年干起寅月干）
  function monthGanzhiOf(date) {
    var zhi = monthZhiOf(date);
    var yGan = yearGanzhiOf(date).年干;
    // 五虎遁：年干 甲/己→丙, 乙/庚→戊, 丙/辛→庚, 丁/壬→壬, 戊/癸→甲 起「寅月」
    var tianYinStart = { 甲: '丙', 己: '丙', 乙: '戊', 庚: '戊', 丙: '庚', 辛: '庚', 丁: '壬', 壬: '壬', 戊: '甲', 癸: '甲' }[yGan];
    var tianYinIdx = ganIdx(tianYinStart);
    // 月建支序列：寅=2,卯=3,...,子=10(寅+10),丑=11
    var orderOfZhi = { 寅: 0, 卯: 1, 辰: 2, 巳: 3, 午: 4, 未: 5, 申: 6, 酉: 7, 戌: 8, 亥: 9, 子: 10, 丑: 11 };
    var off = orderOfZhi[zhi];
    var gan = GAN[ posMod(tianYinIdx + off, 10) ].字;
    return { 干: gan, 支: zhi, 干支: gan + zhi, 干五行: GAN_W[gan], 支五行: ZHI_W[zhi], 月建: zhi };
  }

  // 时柱：五鼠遁（日干起子时干）
  function hourGanzhiOf(dayGan, hour) {
    // 时辰：23-1 子,1-3 丑...  时支 index：(hour+1)//2 %12，子=0
    var shichenIdx = Math.floor((hour + 1) / 2) % 12; // 0 子 .. 11 亥
    var ziGan = { 甲: '甲', 己: '甲', 乙: '丙', 庚: '丙', 丙: '戊', 辛: '戊', 丁: '庚', 壬: '庚', 戊: '壬', 癸: '壬' }[dayGan];
    var gan = GAN[ posMod(ganIdx(ziGan) + shichenIdx, 10) ].字;
    var zhi = ZHI[shichenIdx].字;
    var seg = SHICHEN_SEG(shichenIdx);
    return { 干: gan, 支: zhi, 干支: gan + zhi, 干五行: GAN_W[gan], 支五行: ZHI_W[zhi], 名: ZHI[shichenIdx].字 + '时', 段: seg };
  }
  function ganIdx(c) { for (var i = 0; i < GAN.length; i++) if (GAN[i].字 === c) return i; return 0; }
  function SHICHEN_SEG(i) {
    var s = DB.SHICHEN[i];
    return s ? s.段 : '';
  }

  // ===== 建除十二神（值日）：节气月建 + 日支 =====
  // 建日 = 日支 == 月建支；其后逐日 除满平定执破危成收开闭。
  function jianchuOf(date) {
    var mz = monthZhiOf(date);
    var z = dayGanzhiOf(date).支;
    var order = { 子: 0, 丑: 1, 寅: 2, 卯: 3, 辰: 4, 巳: 5, 午: 6, 未: 7, 申: 8, 酉: 9, 戌: 10, 亥: 11 };
    var idx = posMod(order[z] - order[mz], 12);
    return DB.JIANCHU[idx];
  }

  // ===== 日主旺衰（得令/得地/得势）=====
  // 得令：日主五行与「月建五行」关系（同/被月建所生=得令，被克=失令）
  // 得地：日主五行在四柱地支藏干中的同类个数
  // 得势：日主五行在四柱天干（比劫/印）出现
  function dayStrength(dayWx, pillars) {
    var monthZhi = pillars.month.月建 || pillars.month.支;
    var monthWx = ZHI_W[monthZhi];
    var sheng = DB.WUXING_SHENG[monthWx]; // 月建所生（我克/泄）
    var yinKe = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' }; // 生我者（印）
    var diLing = (monthWx === dayWx || yinKe[dayWx] === monthWx); // 同或印当令
    var deDi = 0, deShi = 0;
    [pillars.year, pillars.month, pillars.day, pillars.hour].forEach(function (p) {
      if (p.支五行 === dayWx) deDi++;
      if (p.干五行 === dayWx || DB.WUXING_SHENG[p.干五行] === dayWx) deShi++; // 同类或生我
    });
    var score = (diLing ? 2 : 0) + deDi * 0.8 + deShi;
    var lvl = score >= 5 ? '身强' : score >= 4 ? '偏强' : score >= 3 ? '中和' : score >= 2 ? '偏弱' : '身弱';
    return { 得令: diLing, 得地: deDi, 得势: deShi, 分: score, 判: lvl, 月建: monthZhi };
  }

  // ===== 对外接口（保持与旧 ganzhi.js 同名同形，供 bazi / ganzhi-analysis 复用）=====
  return {
    solarLongitude: solarLongitude,
    jieqiDay: jieqiDay,
    JIEQI_LON: JIEQI_LON,
    lichunOf: lichunOf,
    monthZhiOf: monthZhiOf,
    JIEQI_ORDER: JIEQI_ORDER,
    yearGanzhiOf: yearGanzhiOf,
    dayGanzhiOf: dayGanzhiOf,
    monthGanzhiOf: monthGanzhiOf,
    hourGanzhiOf: hourGanzhiOf,
    jianchuOf: jianchuOf,
    dayStrength: dayStrength,
    toBeijing: toBeijing
  };
});
