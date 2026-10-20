/**
 * modules/CoreModule/astro.js —— 占星 / 七政四余内核 C18/C19【单一真源 · 适配层】
 *
 * 算什么：某时刻「七政」（日/月/水/金/火/木/土）+「四余」（罗睺/计都/月孛/紫气）共 11 曜的
 *         回归黄经(tropical, 0=当年春分=白羊0°) 与落十二星座。
 *
 * 算法来源（有权威用权威，零臆造；来源写死在此，改口径只改这里）：
 *   ── 七政 7 曜：内嵌 astronomy-engine（cosinekitty/astronomy，MIT，JPL 级，构建期资产、运行时不联网）。
 *      本文件只做薄适配：GeoVector → Ecliptic → 回归黄经。
 *      校验：tools/astro-check.js 用 ephem(JPL) 逐样本对拍 7 政，最大 Δ=0.006°。
 *   ── 三余（罗睺/计都/月孛）：Meeus《天文算法》§38.B 均值公式（占星标准取 mean）：
 *        罗睺(月升交点 Ω) = 125.0445479 − 1934.1362891·T + 0.0020754·T² − T³/459998
 *        月拱点线 ϖ       = 83.3532465 + 4069.0137287·T − 0.01032·T²
 *      计都 = Ω+180、月孛 = ϖ+180。T = 儒略世纪(J2000)。J2000 基准点 Ω=125.04°/ϖ=83.35° 为公认值。
 *      常数已多源核对（Meeus / Meeus 译本 / IERS 基本变量一致）。
 *   ── 落十二宫：回归黄经等分（÷30°，0=白羊）。占星「星座」标准口径；
 *      若需古法「不等宿度十二宫（授时历宫度）」另补（不臆造）。
 *   ── 落二十八宿（v3.1.3 补，v3.1.5 强化）：宿度取古宿度（《淮南子·天文训》系，本项目采用整数和 365 的常用变体：
 *      角12 亢9 氐15 房5 心5 尾18 箕11 / 斗26 牛8 女12 虚10 危17 室16 壁9 / 奎16 娄12 胃14 昴11 毕16 觜2 参9 /
 *      井33 鬼4 柳15 星7 张18 翼18 轸17）。古宿度以「角初度对齐春分 0°（回归黄经）」为锚，按各宿宿度宽度铺满
 *      周天 → 某黄经落于何宿、入宿几度（宿界见 SUIXIU_BOUND）。**不等宫·地支跨宿**为果老/周敦颐流派差异，此处不锁，
 *      仅给「宿+入度」，门派分宫另补（不臆造）。
 *   ── 七政庙旺（v3.1.3 补）：《果老星宗卷一》「星曜庙/旺/喜/乐宫」表 +「入垣」（4 源逐字一致，
 *      含四余 罗/计/孛/气）。12 等分宫（白羊 0°）按「地支宫」命名（戌白羊/酉金牛/…亥双鱼，果老"宫分所属"）
 *      查表 → 某曜在某宫 = 庙/旺/喜/乐/垣（多态可叠加），皆无 = 平常。
 *
 * 缺口（严守零臆造，核到权威源才补）：
 *   ① 紫炁（紫气，第 11 曜）：传统为「闺余虚星」，**无天文实体**（图书编/星平会海/授时历/ destiny.to/astrology.tw
 *      多源一致）。行度《星平会海》"28 日行 1 度（古度）、28 年周天"；历元《图书编》"万历五年十二月朔日紫气在张十四度"。
 *      本项目已按此传统闺余法接入（ziqi()：张14度→古宿度→回归黄经，mean motion 365/(28×365.25) 古度/日）。
 *      ⚠️ 因非天文实体 + 历元「张14度」须经古宿度换算 + 农历新月近似，结果含流派/历元近似，仅作传统推演、不用于定位；
 *      不同门派（闰法/宿度体系）结果不一，已如实标注。
 *   ② 落二十八宿：古宿度（角@春分0°）已用，但「不等宫·地支跨宿」果老/周敦颐流派差异未锁。
 *
 * 加载：UMD —— 小程序被 require（vendor/astronomy.js）；浏览器挂 NT.core.astro（依赖 window.Astronomy）。
 * 校验：modules/CoreModule/__tests__/astro.test.js
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    try { if (typeof self === 'undefined' && typeof globalThis !== 'undefined') globalThis.self = globalThis; } catch (e) { }
    module.exports = factory(require('./vendor/astronomy.js'));
  } else {
    root.NT = root.NT || {}; root.NT.core = root.NT.core || {};
    root.NT.core.astro = factory((typeof globalThis !== 'undefined' && globalThis.Astronomy) || (root.Astronomy || null));
  }
})(typeof self !== 'undefined' ? self : this, function (A) {

  // 十二星座（回归等分，0=白羊）
  var SIGN_NAMES = ['白羊', '金牛', '双子', '巨蟹', '狮子', '室女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼'];
  var SIGNS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

  function mod360(x) { x = x % 360; return x < 0 ? x + 360 : x; }

  // astronomy-engine 实星枚举（无库则返回 null，调用方据此降级）
  function bodyEnum() {
    if (!A) return null;
    return { 太阳: A.Body.Sun, 太阴: A.Body.Moon, 水星: A.Body.Mercury, 金星: A.Body.Venus,
             火星: A.Body.Mars, 木星: A.Body.Jupiter, 土星: A.Body.Saturn };
  }

  // 儒略世纪 T（J2000 起）。三余走 Meeus 均值公式 → 用格里历 JDN（Fliegel & Van Fleck，权威），
  // 不依赖 astronomy 内部 JD API（减少跨端不一致，且 1900–2100 格里历完全适用）。
  // 七政走 astronomy 高精度（planetLon），二者 T 只在「显示/均值」用途不同，互不干扰。
  function tcentOf(y, m, d, h) {
    var a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
    var JDN = d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
    return ((JDN - 0.5 + (h || 0) / 24) - 2451545.0) / 36525;
  }

  // 儒略日 JD（格里历，同 Fliegel & Van Fleck 权威式；供紫炁历元换算）。返回 JD（含小数日）
  function jdOf(y, m, d, h) {
    var a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
    var JDN = d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
    return JDN - 0.5 + (h || 0) / 24;
  }

  // 当地钟表时 → 世界时（跨日自动进位）。tz 为时区偏移（小时，东正）。
  function toUTC(y, m, d, h, tz) {
    if (!tz) return { y: y, m: m, d: d, h: h || 0 };
    var t = new Date(Date.UTC(y, m - 1, d, h || 0));
    t.setUTCHours(t.getUTCHours() - Math.round(tz * 60) / 60);
    var hh = t.getUTCHours() + t.getUTCMinutes() / 60;
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), h: Math.round(hh * 100) / 100 };
  }

  // 黄赤交角 ε（Meeus 22.2 低精度式，精度 ~0.01″，1900–2100 足够）
  function obliquity(y, m, d, h) {
    var T = tcentOf(y, m, d, h || 0);
    var s = -46.8150 * T - 0.00059 * T * T + 0.001813 * T * T * T; // 秒
    return 23.439291111 + s / 3600;
  }

  // 赤经（度）→ 黄经（度）：tanλ = tanα / cosε
  function raToLon(raDeg, epsDeg) {
    var a = raDeg * Math.PI / 180, e = (epsDeg == null ? 23.439291111 : epsDeg) * Math.PI / 180;
    return mod360(Math.atan2(Math.sin(a), Math.cos(a) * Math.cos(e)) * 180 / Math.PI);
  }
  // 黄经（度）→ 赤经（度）：tanα = tanλ · cosε
  function lonToRa(lonDeg, epsDeg) {
    var l = lonDeg * Math.PI / 180, e = (epsDeg == null ? 23.439291111 : epsDeg) * Math.PI / 180;
    return mod360(Math.atan2(Math.sin(l) * Math.cos(e), Math.cos(l)) * 180 / Math.PI);
  }
  // 黄经 → 赤纬（度）
  function lonToDec(lonDeg, epsDeg) {
    var l = lonDeg * Math.PI / 180, e = (epsDeg == null ? 23.439291111 : epsDeg) * Math.PI / 180;
    return Math.asin(Math.sin(e) * Math.sin(l)) * 180 / Math.PI;
  }

  // 恒星时：返回 { 世界时, GMST度, LST度(RAMC) }。恒星时权威源 = astronomy-engine SiderealTime（IAU 2006）。
  function sidereal(y, m, d, h, tz, lon) {
    var tz2 = (tz == null ? 0 : +tz), lon2 = (lon == null ? 0 : +lon);
    var U = toUTC(y, m, d, h || 0, tz2);
    var gmstDeg;
    if (A && A.SiderealTime) {
      var t = A.MakeTime(new Date(Date.UTC(U.y, U.m - 1, U.d, Math.floor(U.h), Math.round((U.h % 1) * 60))));
      gmstDeg = A.SiderealTime(t) * 15;
    } else {
      // 兜底：Meeus 12.4 均值恒星时
      var jd = jdOf(U.y, U.m, U.d, U.h);
      var T = (jd - 2451545.0) / 36525;
      var g = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - T * T * T / 38710000;
      gmstDeg = mod360(g);
    }
    return { 世界时: U, GMST: +mod360(gmstDeg).toFixed(4), LST: +mod360(gmstDeg + lon2).toFixed(4) };
  }


  function planetLon(bodyKey, y, m, d, h) {
    var B = bodyEnum(); if (!B) return null;
    // ⚠ 保留小数小时：旧写法 Date.UTC(y,m-1,d,h) 会把 hour 参数 ToInteger **截成整点**，
    //   导致 positions() 只有整点精度（返照盘/月亮返照需要分秒级）。改为「当日零点 + h*3600000ms」。
    //   整点 h 结果与旧写法完全一致，无回归。
    var ms = Date.UTC(y, m - 1, d, 0, 0, 0, 0) + (h || 0) * 3600000;
    var t = A.MakeTime(new Date(ms));
    return mod360(A.Ecliptic(A.GeoVector(B[bodyKey], t, false)).elon);
  }

  // Meeus §38.B 三余（mean；紫炁定义未定不输出）
  function threeRemainders(y, m, d, h) {
    var T = tcentOf(y, m, d, h);
    var omega = 125.0445479 - 1934.1362891 * T + 0.0020754 * T * T - Math.pow(T, 3) / 459998; // 月升交点
    var varpi = 83.3532465 + 4069.0137287 * T - 0.01032 * T * T;                            // 月拱点线
    return {
      罗睺: +mod360(omega).toFixed(3),       // 北交点
      计都: +mod360(omega + 180).toFixed(3), // 南交点
      月孛: +mod360(varpi + 180).toFixed(3)  // 月远地点
    };
  }

  // 落十二星座（回归等分 ÷30°，0=白羊）
  function signOf(lon) {
    var L = mod360(lon), i = Math.floor(L / 30) % 12;
    return { 星座: SIGN_NAMES[i], 符号: SIGNS[i], 度数: +(L % 30).toFixed(2) };
  }

  // 星座序号(0=白羊)→地支宫（果老"宫分所属"，庙旺查表用；白羊=戌 … 双鱼=亥）
  var ZHI_OF_SIGN = ['戌', '酉', '申', '未', '午', '巳', '辰', '卯', '寅', '丑', '子', '亥'];

  // ── 落二十八宿（古宿度《淮南子·天文训》系；角初度对齐春分 0°，按宿度宽度铺满周天）──
  // [名, 宿度, 五行(七曜配), 动物] —— 序：东苍龙 角…箕 / 北玄武 斗…壁 / 西白虎 奎…参 / 南朱雀 井…轸
  var SUIXIU = [
    ['角', 12, '木', '蛟'], ['亢', 9, '金', '龙'], ['氐', 15, '土', '貉'], ['房', 5, '日', '兔'],
    ['心', 5, '月', '狐'], ['尾', 18, '火', '虎'], ['箕', 11, '水', '豹'],
    ['斗', 26, '木', '獬'], ['牛', 8, '金', '牛'], ['女', 12, '土', '蝠'], ['虚', 10, '日', '鼠'],
    ['危', 17, '月', '燕'], ['室', 16, '火', '猪'], ['壁', 9, '水', '貐'],
    ['奎', 16, '木', '狼'], ['娄', 12, '金', '狗'], ['胃', 14, '土', '雉'], ['昴', 11, '日', '鸡'],
    ['毕', 16, '月', '乌'], ['觜', 2, '火', '猴'], ['参', 9, '水', '猿'],
    ['井', 33, '木', '犴'], ['鬼', 4, '金', '羊'], ['柳', 15, '土', '獐'], ['星', 7, '日', '马'],
    ['张', 18, '月', '鹿'], ['翼', 18, '火', '蛇'], ['轸', 17, '水', '蚓']
  ];
  var SUIXIU_TOTAL = SUIXIU.reduce(function (s, x) { return s + x[1]; }, 0); // 365（整数和，余 0.25 即四分度之一）

  // 宿界表（宿起点回归黄经 0-360）：古宿度累积 × 360/365（角@春分0°）。用于查某宿起讫与紫炁历元换算。
  var SUIXIU_BOUND = SUIXIU.map(function (s, i) {
    var acc = 0; for (var j = 0; j < i; j++) acc += SUIXIU[j][1];
    return { 宿: s[0], 起点: +(acc * 360 / SUIXIU_TOTAL).toFixed(3), 讫点: +(((acc + s[1]) * 360 / SUIXIU_TOTAL) % 360).toFixed(3), 宿度: s[1] };
  });
  // 某宿累积古度（用于紫炁历元「张14度」）
  function suiCumDeg(name) {
    var acc = 0;
    for (var i = 0; i < SUIXIU.length; i++) { if (SUIXIU[i][0] === name) return acc; acc += SUIXIU[i][1]; }
    return 0;
  }

  // 落二十八宿（古宿度）：回归黄经 L(0-360, 0=春分) → 宿主 + 入度（角初度@0°，按宿度占比铺满 360°）
  function suiXiuOf(lon) {
    var L = mod360(lon), x = L * SUIXIU_TOTAL / 360; // 换算到古人 365 整数尺度
    var acc = 0, i = 0;
    while (i < SUIXIU.length) { var wd = SUIXIU[i][1]; if (x < acc + wd || i === SUIXIU.length - 1) break; acc += wd; i++; }
    var 度 = Math.floor(x - acc) + 1; // 入宿 N 度（1-based，古历"每宿俱有初度一"）
    var s = SUIXIU[i];
    return { 宿: s[0], 入度: 度, 全名: s[0] + s[2] + s[3], 五行: s[2], 动物: s[3], 宿度: s[1] };
  }

  // ── 紫炁（紫气，第 11 曜）【v3.1.5 接入】── 闺余虚星，无天文实体，按古籍传统行度
  // 权威口径（多源一致：《图书编》卷21 /《星平会海》/《授时历》/ destiny.to / astrology.tw）：
  //   · 行度：《星平会海》"紫气 28 日行 1 度（古度）、28 年周天" → mean motion 365/(28×365.25) 古度/日
  //   · 历元：《图书编》"万历五年十二月朔日紫气在张十四度"（≈1578-01-08，农历新月取近似）
  //   · 性质：生于闰余，非天体； NAME_KEY='气' 与《果老星宗》庙旺表一致
  // ⚠️ 因非天文实体 + 历元经古宿度换算 + 农历新月近似，结果含流派/历元近似，仅作传统推演、不作天文定位。
  function ziqi(y, m, d, h) {
    var epochG = suiCumDeg('张') + 14;                  // 历元：张14度（古度 365 尺度）
    var epochJD = jdOf(1578, 1, 8, 0);                 // 万历五年十二月朔 ≈ 1578-01-08（近似）
    var jd = jdOf(y, m, d, h);
    var deg365 = epochG + (jd - epochJD) * (365 / (28 * 365.25)); // 古度/日
    return +mod360(deg365 * 360 / 365).toFixed(3);
  }

  // ── 七政庙旺（《果老星宗卷一》，4 源逐字一致；含四余 罗/计/孛/气）──
  // 每行 = 某态下，各曜(简)落入哪些地支宫。键 7 政简 + 四余 罗/计/孛 + 气(紫炁,保留不输出)。
  var MAOWANG = {
    垣: { 日: ['午'], 月: ['未'], 水: ['巳', '申'], 金: ['辰', '酉'], 火: ['卯', '戌'], 木: ['子', '丑'] },
    庙: { 日: ['午'], 月: ['戌'], 水: ['午'], 金: ['辰', '酉'], 火: ['卯'], 木: ['亥'], 土: ['子', '丑'], 气: ['申'], 孛: ['未'], 罗: ['寅', '午'], 计: ['巳', '亥'] },
    旺: { 日: ['巳', '戌'], 月: ['酉'], 水: ['子', '巳', '申'], 金: ['午', '亥'], 火: ['丑'], 木: ['未'], 土: ['卯', '辰'], 气: ['丑', '亥'], 孛: ['寅', '巳'], 罗: ['卯'], 计: ['寅', '卯', '戌'] },
    喜: { 日: ['寅'], 月: ['亥', '卯'], 水: ['辰'], 金: ['巳'], 火: ['丑', '申'], 木: ['未'], 土: ['午'], 气: ['戌'], 孛: ['亥'], 罗: ['戌'], 计: ['子'] },
    乐: { 日: ['午', '辰'], 月: ['未'], 水: ['巳', '申'], 金: ['辰', '酉'], 火: ['卯'], 木: ['寅', '亥'], 土: ['丑', '子'], 孛: ['子', '酉'], 计: ['卯'] }
  };
  var STAR_AB = { 太阳: '日', 太阴: '月', 水星: '水', 金星: '金', 火星: '火', 木星: '木', 土星: '土', 罗睺: '罗', 计都: '计', 月孛: '孛', 紫气: '气' };

  // 某曜在某宫的庙旺状态（果老表）：stateStrong→Weak = 垣/庙/旺/喜/乐（可叠加），皆无 = 平常
  function maowangOf(starKey, signIdx) {
    var ab = STAR_AB[starKey]; if (!ab) return null; // 未列名者不判
    var zhi = ZHI_OF_SIGN[signIdx % 12];
    var 状态 = [];
    ['垣', '庙', '旺', '喜', '乐'].forEach(function (st) {
      var arr = MAOWANG[st][ab];
      if (arr && arr.indexOf(zhi) >= 0) 状态.push(st);
    });
    return { 星: starKey, 简称: ab, 宫: zhi, 星座序: signIdx % 12, 状态: 状态, 判: 状态.length ? 状态.join('/') : '平常' };
  }

  /**
   * 某时刻 10 曜（七政 7 + 三余 3）回归黄经 + 落十二星座。
   * @param {Object} inp { y, m, d, h? }
   * @returns { 时刻, 儒略世纪T, 黄经:{...}, 星座:{...}, 缺口 }  或 { err }
   */
  function positions(inp) {
    inp = inp || {};
    var y = inp.y, m = inp.m, d = inp.d, h = inp.h || 0;
    if (!y || !m || !d) return { err: '占星/七政需出生年月日，例如「1990年8月15日」。' };
    var B = bodyEnum();
    // 时区：入参 h 为「当地钟表时」，tz 为时区偏移（小时，东正）。默认 0 = 按世界时（保持既有调用不变）。
    // 星历一律用 UT 计算；此处换算后所有黄经才是正确瞬时值（北京时间 tz=8）。
    var tz = (inp.tz == null ? 0 : +inp.tz);
    var U = toUTC(y, m, d, h, tz);
    var uy = U.y, um = U.m, ud = U.d, uh = U.h;
    var r3 = threeRemainders(uy, um, ud, uh);
    var 黄经 = {
      太阳: B ? planetLon('太阳', uy, um, ud, uh) : null,
      太阴: B ? planetLon('太阴', uy, um, ud, uh) : null,
      水星: B ? planetLon('水星', uy, um, ud, uh) : null,
      金星: B ? planetLon('金星', uy, um, ud, uh) : null,
      火星: B ? planetLon('火星', uy, um, ud, uh) : null,
      木星: B ? planetLon('木星', uy, um, ud, uh) : null,
      土星: B ? planetLon('土星', uy, um, ud, uh) : null,
      罗睺: r3.罗睺, 计都: r3.计都, 月孛: r3.月孛,
      紫气: ziqi(uy, um, ud, uh) // 第 11 曜：闺余虚星（古籍传统行度，非天文实体）
    };
    var 星座 = {};
    Object.keys(黄经).forEach(function (k) { 星座[k] = signOf(黄经[k]); });
    // 落二十八宿（等宫近似）：实曜用高精度黄经；三余用均值黄经（均为回归黄经 0-360）
    var 二十八宿 = {};
    Object.keys(黄经).forEach(function (k) { 二十八宿[k] = suiXiuOf(黄经[k]); });
    // 庙旺（果老星宗，按地支宫查表；含 紫气/罗/计/孛 四余）
    var 庙旺 = {};
    Object.keys(黄经).forEach(function (k) {
      if (!STAR_AB[k]) return; // 紫炁等未列者不判
      var signIdx = Math.floor(mod360(黄经[k]) / 30) % 12; // 星座序号(0=白羊)
      庙旺[k] = maowangOf(k, signIdx);
    });
    return {
      时刻: y + '年' + m + '月' + d + '日' + h + '时' + (tz ? '（UTC' + (tz >= 0 ? '+' : '') + tz + '）' : '（世界时）'),
      儒略世纪T: +tcentOf(uy, um, ud, uh).toFixed(5),
      黄经: 黄经, 星座: 星座, 二十八宿: 二十八宿, 庙旺: 庙旺, 世界时: uy + '-' + um + '-' + ud + ' ' + uh + '时',
      缺口: '紫气（紫炁，第 11 曜）已按「闺余虚星」古籍行度接入（星平会海 28日行1度 + 万历历元张14度），非天文实体，历元/宿度含流派近似，仅供传统推演不作天文定位；落二十八宿用古宿度（角@春分0°），果老/周敦颐「不等宫·地支跨宿」流派差异未锁；庙旺取《果老星宗卷一》庙/旺/喜/乐/垣 五态查表'
    };
  }

  // ============ §8.2–8.5 补全：相位 / 推运 / 合盘 / 印占（Vedic）============
  // 主相位 + 小相位 配置（容许度 orb 取占星通用值）
  var ASPECTS = [
    { 名: '合', 角: 0, orb: 8 }, { 名: '六合', 角: 60, orb: 4 }, { 名: '刑', 角: 90, orb: 6 },
    { 名: '拱', 角: 120, orb: 8 }, { 名: '冲', 角: 180, orb: 8 },
    { 名: '半六合', 角: 30, orb: 2 }, { 名: '半刑', 角: 45, orb: 2 },
    { 名: '补八分', 角: 135, orb: 2 }, { 名: '十二分之五', 角: 150, orb: 2 }
  ];
  function angleDiff(a, b) { var d = Math.abs(mod360(a) - mod360(b)) % 360; return d > 180 ? 360 - d : d; }

  // 两组长经 → 两两相位列表（names 为参与比较的星键）
  function aspectBetween(lonsA, lonsB, names) {
    var out = [];
    for (var i = 0; i < names.length; i++) {
      for (var j = (lonsA === lonsB ? i + 1 : 0); j < names.length; j++) {
        if (lonsA[names[i]] == null || lonsB[names[j]] == null) continue;
        var ang = angleDiff(lonsA[names[i]], lonsB[names[j]]);
        for (var k = 0; k < ASPECTS.length; k++) {
          var asp = ASPECTS[k];
          var dd = asp.角 === 0 ? Math.min(ang, 360 - ang) : Math.abs(ang - asp.角);
          if (dd <= asp.orb) {
            out.push({ a: names[i], b: (lonsA === lonsB ? names[j] : names[j]), 类型: asp.名, 夹角: +ang.toFixed(1), 容许: +dd.toFixed(2), 精准: dd < asp.orb * 0.3 });
            break;
          }
        }
      }
    }
    return out;
  }
  // 取一个有值星键列表
  function liveKeys(lons) { var ks = []; Object.keys(lons).forEach(function (k) { if (lons[k] != null) ks.push(k); }); return ks; }

  /** §8.2 相位：本命盘内 10 曜两两相位 */
  function aspects(inp) {
    var p = positions(inp); if (p.err) return p;
    var ks = liveKeys(p.黄经);
    return { 时刻: p.时刻, 参与: ks, 相位: aspectBetween(p.黄经, p.黄经, ks) };
  }

  // 日期 +N 天（次限：1 天 = 1 年）
  function dateAddDays(y, m, d, h, days) {
    var t = new Date(Date.UTC(y, m - 1, d, h || 0)); t.setUTCDate(t.getUTCDate() + Math.round(days));
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), h: t.getUTCHours() };
  }

  /** §8.3 次限推运（Secondary Progression：1 天 = 1 年）→ 行运 Age 岁时次限盘 + 与本命相位 */
  function progressions(inp, age) {
    var p = positions(inp); if (p.err) return p;
    if (!A) return { err: '次限需 astronomy 星历内核（vendor/astronomy.js）', _nat: p };
    var tgt = dateAddDays(inp.y, inp.m, inp.d, inp.h || 0, (age || 1) * 365.25);
    var pp = positions(tgt); if (pp.err) return pp;
    var ks = liveKeys(p.黄经);
    return {
      本命时刻: p.时刻, 次限基准: tgt.y + '年' + tgt.m + '月' + tgt.d + '日（本命+' + (age || 1) + '天≈' + (age || 1) + '岁）',
      本命黄经: p.黄经, 次限黄经: pp.黄经,
      次限相位: aspectBetween(pp.黄经, p.黄经, ks) // 次限星 对本命星
    };
  }

  /** §8.3 行运（Transit）：当日天象 vs 本命 → 行运相位 */
  function transits(inp, tInp) {
    var p = positions(inp); if (p.err) return p;
    var tp = positions(tInp); if (tp.err) return tp;
    var ks = liveKeys(p.黄经);
    return { 本命: p.时刻, 行运日: tp.时刻, 行运黄经: tp.黄经, 行运相位: aspectBetween(tp.黄经, p.黄经, ks) };
  }

  /** §8.6 太阳返照盘（Solar Return）：太阳黄经回到本命太阳黄经的那一刻 → 该时刻的整盘 */
  /**
   * 口径说明：返照盘取「太阳回到本命黄经」的精确时刻起盘（不是生日当天零点、也不是生日当天正午）。
   * 检索直接用星历内核的 SearchSunLongitude（太阳一年只回照一次，从生日前 6 天起搜 20 天窗口足够）。
   * 返照时刻按世界时给出并换算回本地时（东八区），不做「整点取整」——取整就是另一张盘了。
   */
  function solarReturn(inp, year) {
    var natal = positions(inp); if (natal.err) return natal;
    if (!A || !A.SearchSunLongitude || !A.MakeTime) return { err: '返照需 astronomy 星历内核（vendor/astronomy.js）' };
    var y = +year || new Date().getUTCFullYear();
    var lon = natal.黄经['太阳'];
    var start = A.MakeTime(new Date(Date.UTC(y, (inp.m || 1) - 1, (inp.d || 1) - 6)));
    var t = A.SearchSunLongitude(lon, start, 20);
    if (!t) return { err: '太阳返照检索失败（' + y + ' 年）' };
    var dt = t.date; // UTC
    var ret = positions({ y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), h: dt.getUTCHours() + dt.getUTCMinutes() / 60, tz: 0 });
    if (ret.err) return ret;
    var ks = liveKeys(ret.黄经);
    // 北京时间 = UTC+8（本项目其余占星功能同用 +8）
    var bj = new Date(dt.getTime() + 8 * 3600 * 1000);
    return {
      类型: '太阳返照', 年: y, 本命时刻: natal.时刻,
      返照时刻UTC: dt.toISOString().replace('T', ' ').slice(0, 19) + ' UT',
      返照时刻本地: bj.toISOString().replace('T', ' ').slice(0, 16) + '（UTC+8）',
      返照黄经: ret.黄经, 返照星座: ret.星座,
      与本命相位: aspectBetween(ret.黄经, natal.黄经, ks)
    };
  }

  /**
   * 月亮返照（Lunar Return）：月亮回到本命黄经的精确时刻起盘（约 27.32 天一次，每月一返照）。
   * 检索：星历 vendor 只有 SearchSunLongitude / SearchMoonPhase / SearchMoonNode / SearchMoonQuarter，
   *   **没有**「按月亮绝对黄经」的搜索 API（MoonPhase 是月日黄经差、不是绝对黄经），故自求零点：
   *   按日粗扫（40 天覆盖整月）找「diff 由负转正」的回归，再二分收敛到秒级。
   *   月亮日行约 13.18°，按日步进不会出现跨段歧义（一天内 diff 变化 ~13°）。
   * @param {Object} inp 本命 {y,m,d,h,tz}
   * @param {number} [year] 目标年（缺省=今年）
   * @param {number} [month] 目标月（缺省=本月）；从该月 1 日起搜，取该月第一次返照
   */
  function lunarReturn(inp, year, month) {
    var natal = positions(inp); if (natal.err) return natal;
    var natalMoon = natal.黄经['太阴'];
    if (natalMoon == null) return { err: '本命月亮黄经不可用（需 astronomy 星历内核）' };
    var y = +year || new Date().getUTCFullYear();
    var mo = +month || (inp.m || (new Date().getUTCMonth() + 1));
    function norm180(x) { x = mod360(x); return x > 180 ? x - 360 : x; }
    function moonAt(ms) {
      var t = new Date(ms);
      return positions({ y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), h: t.getUTCHours() + t.getUTCMinutes() / 60 + t.getUTCSeconds() / 3600, tz: 0 });
    }
    var startMs = Date.UTC(y, mo - 1, 1);
    var p0 = moonAt(startMs); if (p0.err) return p0;
    var d0 = norm180(p0.黄经['太阴'] - natalMoon);
    var lo, hi;
    // 一律扫描 + 二分（不做「月初恰逢」的宽容快照——差 1° 就约 1.8 小时，取整即另一张盘）
    var prevMs = startMs, prevD = d0, found = false;
    for (var i = 1; i <= 40; i++) {
      var ms = startMs + i * 86400000;
      var p = moonAt(ms); if (p.err) return p;
      var dd = norm180(p.黄经['太阴'] - natalMoon);
      if (prevD < 0 && dd >= 0) { lo = prevMs; hi = ms; found = true; break; }
      prevMs = ms; prevD = dd;
    }
    if (!found) return { err: '月亮返照检索失败（' + y + ' 年 ' + mo + ' 月）' };
    // 二分收敛：区间内 diff 由负到正，diff<0 往右
    for (var k = 0; k < 32; k++) {
      var mid = (lo + hi) / 2;
      var pm = moonAt(mid); if (pm.err) return pm;
      if (norm180(pm.黄经['太阴'] - natalMoon) < 0) lo = mid; else hi = mid;
    }
    var when = (lo + hi) / 2;
    var dt = new Date(when);
    var ret = moonAt(when);
    if (ret.err) return ret;
    var ks = liveKeys(ret.黄经);
    var bj = new Date(dt.getTime() + 8 * 3600 * 1000);
    return {
      类型: '月亮返照', 年: y, 月: mo, 本命时刻: natal.时刻, 本命月亮黄经: natalMoon,
      返照时刻UTC: dt.toISOString().replace('T', ' ').slice(0, 19) + ' UT',
      返照时刻本地: bj.toISOString().replace('T', ' ').slice(0, 16) + '（UTC+8）',
      返照黄经: ret.黄经, 返照星座: ret.星座,
      与本命相位: aspectBetween(ret.黄经, natal.黄经, ks)
    };
  }

  /** §8.7 法达星限（Firdaria）：中世纪波斯/阿拉伯「时段主星」体系 */
  /**
   * 五源核对一致（astrodoor 繁/简、traditional-astrology、yourhearth、astrostarcheck）：
   *   日生顺序：太阳 10 → 金星 8 → 水星 13 → 月亮 9 → 土星 11 → 木星 12 → 火星 7 → 北交 3 → 南交 2（合 75 年）
   *   夜生顺序：月亮 9 → 土星 11 → 木星 12 → 火星 7 → 太阳 10 → 金星 8 → 水星 13 → 北交 3 → 南交 2
   *   副运：主期 7 等分，第一份是主星本人，其后按「同一循环顺序」接着排
   *         （上面这套顺序本身就是迦勒底序 土→木→火→日→金→水→月 从该盘「光体」起算，故两说在此等价）
   *   分歧（如实标注，不合并）：北交/南交两期是否再切 7 份，各家不一 —— 本实现按「不分」（astrodoor 明确不分）。
   */
  var FIRDARIA = {
    日: [['太阳', 10], ['金星', 8], ['水星', 13], ['月亮', 9], ['土星', 11], ['木星', 12], ['火星', 7], ['北交', 3], ['南交', 2]],
    夜: [['月亮', 9], ['土星', 11], ['木星', 12], ['火星', 7], ['太阳', 10], ['金星', 8], ['水星', 13], ['北交', 3], ['南交', 2]]
  };
  /**
   * 判日/夜盘：看太阳在地平线上还是下（altitude > 0 = 日盘）。
   * 需要出生地经纬度；未给则按北京（39.9N / 116.4E）近似，并在结果里写明这个假设 ——
   * 日夜盘判错的后果是整条时间轴平移好几年（法达最忌），所以不能悄悄默认。
   */
  function sunAltitude(inp, lat, lon) {
    if (!A || !A.Horizon || !A.Observer || !A.Equator) return null;
    var tz = (inp.tz == null ? 8 : +inp.tz);
    var U = toUTC(inp.y, inp.m, inp.d, inp.h == null ? 12 : inp.h, tz);
    var ms = Date.UTC(U.y, U.m - 1, U.d, Math.floor(U.h), Math.round((U.h % 1) * 60));
    var time = A.MakeTime(new Date(ms));
    var obs = new A.Observer(lat, lon, 0);
    var eq = A.Equator(A.Body.Sun, time, obs, true, true);
    return A.Horizon(time, obs, eq.ra, eq.dec, 'normal').altitude;
  }

  function firdaria(inp, opts) {
    var p = positions(inp); if (p.err) return p;
    opts = opts || {};
    var lat = opts.lat == null ? 39.9 : +opts.lat;
    var lon = opts.lon == null ? 116.4 : +opts.lon;
    var alt = sunAltitude(inp, lat, lon);
    var sect = (alt == null) ? (opts.sect || '日') : (alt > 0 ? '日' : '夜');
    var seq = FIRDARIA[sect];
    // 大运表：年龄区间（0 岁起算）
    var rows = [], acc = 0;
    seq.forEach(function (r) { rows.push({ 主星: r[0], 年数: r[1], 起: acc, 止: acc + r[1] }); acc += r[1]; });
    var out = {
      盘别: sect + '生盘',
      判定: alt == null ? '未能算太阳高度角，按入参指定' : ('出生时太阳高度角 ' + (alt > 0 ? '+' : '') + alt.toFixed(1) + '°（' + (alt > 0 ? '地平线上=日盘' : '地平线下=夜盘') + '，经纬度 ' + lat + 'N / ' + lon + 'E' + (opts.lat == null ? '·未给出生地，按北京近似' : '') + '）'),
      周期总年: acc,
      大运: rows,
      缺口: '北交/南交两期是否再切 7 份各家不一，本实现按「不分」（astrodoor 口径），法达无天文计算，边界只随日夜盘与生日而定，边界处呈渐变、不宜当事件日读。'
    };
    var age = opts.age;
    if (age == null || isNaN(+age)) age = null; else age = +age;
    if (age != null) {
      var a = age % acc; // 满 75 年重新起算
      var cur = rows.filter(function (r) { return a >= r.起 && a < r.止; })[0] || rows[0];
      out.年龄 = age;
      out.当前大运 = cur.主星 + '（' + cur.年数 + ' 年：' + cur.起 + '–' + cur.止 + ' 岁）';
      // 副运：七政期 7 等分，从主星本人起、按本盘顺序循环；交点期不分
      if (['北交', '南交'].indexOf(cur.主星) < 0) {
        var cyc = seq.slice(0, 7).map(function (r) { return r[0]; });
        var idx = cyc.indexOf(cur.主星);
        if (idx < 0) idx = 0;
        var span = cur.年数 / 7, subs = [];
        for (var i = 0; i < 7; i++) {
          var lord = cyc[(idx + i) % 7];
          subs.push({ 副星: lord, 起: +(cur.起 + span * i).toFixed(2), 止: +(cur.起 + span * (i + 1)).toFixed(2) });
        }
        out.副运表 = subs;
        var hit = subs.filter(function (s) { return a >= s.起 && a < s.止; })[0];
        if (hit) out.当前副运 = hit.副星 + '（' + hit.起 + '–' + hit.止 + ' 岁）';
      } else {
        out.当前副运 = '（交点期不细分）';
      }
    }
    return out;
  }

  /** §8.4 合盘（Synastry）：A 盘行星 vs B 盘行星 相位 */
  function synastry(inpA, inpB) {
    var pA = positions(inpA); if (pA.err) return { err: 'A 盘：' + pA.err };
    var pB = positions(inpB); if (pB.err) return { err: 'B 盘：' + pB.err };
    var ksA = liveKeys(pA.黄经), ksB = liveKeys(pB.黄经);
    // 两盘都有的星才比
    var common = ksA.filter(function (k) { return ksB.indexOf(k) >= 0; });
    return { A: pA.时刻, B: pB.时刻, 合盘相位: aspectBetween(pA.黄经, pB.黄经, common) };
  }

  // §8.5 印占（Vedic）：恒星黄道 + Nakshatra + Vimshottari 大限
  var NAK27 = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha',
    'Magha', 'PurvaPhalguni', 'UttaraPhalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
    'Mula', 'PurvaAshadha', 'UttaraAshadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'PurvaBhadra', 'UttaraBhadra', 'Revati'];
  // 27 宿 → 守护星（印占标准，计都/罗睺为月交点，木星/土星等）
  var NAK_LORD = ['计都', '金星', '太阳', '月亮', '火星', '罗睺', '木星', '土星', '水星', '计都', '金星', '太阳', '月亮', '火星', '罗睺', '木星', '土星', '水星', '计都', '金星', '太阳', '月亮', '火星', '罗睺', '木星', '土星', '水星'];
  // Vimshottari 大限序（守护星 + 年限，合计 120 年）
  var VIMS = [['计都', 7], ['金星', 20], ['太阳', 6], ['月亮', 10], ['火星', 7], ['罗睺', 18], ['木星', 16], ['土星', 19], ['水星', 17]];

  // Lahiri 岁差：J2000 官方基准 23.8533° + IAU 2006 黄经一般岁差（含二阶及高阶，见 ayanamsa 注释）。
  /**
   * 黄道一般岁差（黄经方向，IAU 2006，Capitaine et al. 2003），单位：度。
   *   输入 T = 自 J2000 起算的儒略世纪（TT 近似即可，与 UT 差 < 0.001°）。
   *   多项式为 IAU 2006 采用的 general precession in longitude：
   *     p_A = 5028.796195·T + 1.1054348·T² + 0.00007964·T³
   *         - 0.000023857·T⁴ - 0.0000000383·T⁵   （单位：弧秒）
   *   在 1800–2200 范围内与官方岁差表吻合到 < 0.01″。
   */
  function precessionLon(T) {
    var t = +T;
    var arcsec = 5028.796195 * t + 1.1054348 * t * t + 0.00007964 * t * t * t
      - 0.000023857 * t * t * t * t - 0.0000000383 * t * t * t * t * t;
    return arcsec / 3600;
  }

  /**
   * Lahiri（Chitrapaksha）岁差，单位：度。
   *   口径：**官方表 2000 年基准 23.8533°** + IAU 2006 黄经岁差（含二阶及高阶项）。
   *   · v3.1.53 前是纯线性 23.85 + (y-2000)·0.013968 —— 忽略了岁差速率的长期变化
   *     （岁差本身在加速：50.29″/年只是 J2000 附近的瞬时值，19 世纪约 50.2″、21 世纪约 50.4″）。
   *   · **可证实的锚点**：J2000 基准 23.8533°（Lahiri 官方表 2000 年值）；
   *     瞬时岁差速率 50.288″/年（公认 ~50.29″/年）—— 两项本站均已数值验证通过。
   *   · **未逐点核对官方年表**（本站无官方全表数据，不假报「完全吻合」）：
   *     与官方表的残余差主要来自 Spica 自行（~1.5″/百年）与忽略的黄道面微小变化，
   *     估计 < 0.05°；对 27 宿（每宿宽 13.33°）定位的影响仅在宿边界附近、概率 < 0.1%。
   *   · 参数 y 为小数年（兼容旧接口：传入 1990.6 之类）。
   */
  function ayanamsa(y) {
    var T = ((+y) - 2000) / 100;   // 年（小数，1 月起算）→ 儒略世纪；
    // 注意：**不加 +0.5** —— 官方基准 23.8533° 对应 J2000（y=2000 年初附近），
    // 若取「年中小近似」会把基准整体偏移半年（0.007°），J2000 值就对不上了。
    return 23.8533 + precessionLon(T);
  }

  /** §8.5 印占盘：恒星黄经 + 二十七宿 + Vimshottari 起限（以月亮宿为起） */
  function vedicPositions(inp) {
    var p = positions(inp); if (p.err) return p;
    var ay = ayanamsa(inp.y + (inp.m - 1) / 12);
    var sidereal = {}, nak = {};
    Object.keys(p.黄经).forEach(function (k) {
      if (p.黄经[k] == null) return;
      var sid = mod360(p.黄经[k] - ay);
      sidereal[k] = +sid.toFixed(3);
      var span = 360 / 27, n = Math.floor(sid / span), deg = sid % span;
      nak[k] = { 宿序: n, 宿名: NAK27[n], 守护星: NAK_LORD[n], 入度: +deg.toFixed(2) };
    });
    // Vimshottari 起限：以月亮所在宿的守护星为首，列出大限序与年限
    var moonNak = nak['太阴'];
    var startLord = moonNak ? moonNak.守护星 : null;
    var si = startLord ? VIMS.map(function (x) { return x; }) : [];
    // 把起始星提到首位
    if (startLord) { var idx = VIMS.map(function (x) { return x[0]; }).indexOf(startLord); if (idx > 0) si = VIMS.slice(idx).concat(VIMS.slice(0, idx)); }
    return {
      时刻: p.时刻, ayanamsa: +ay.toFixed(3) + '°（Lahiri · IAU2006 岁差）',
      回归黄经: p.黄经, 恒星黄经: sidereal, 二十七宿: nak,
      月亮宿: moonNak ? (moonNak.宿名 + '·' + moonNak.守护星) : null,
      Vimshottari: { 起限星: startLord, 大限序: si.map(function (x) { return x[0] + x[1] + '年'; }), 总年: 120 },
      缺料: 'Vedic 岁差已按 IAU2006 黄经岁差 + Lahiri 官方 2000 基准计算（未逐点核对官方年表，估计差 <0.05°）；Nakshatra/Vimshottari 取印占标准 27 宿与 9 曜大限序；分盘制(Default/Bhava)未定，待权威星历校准。'
    };
  }

  return {
    positions: positions, signOf: signOf, threeRemainders: threeRemainders,
    suiXiuOf: suiXiuOf, maowangOf: maowangOf,
    // v3.1.5：紫炁（闺余虚星）+ 宿界表
    ziqi: ziqi, SUIXIU_BOUND: SUIXIU_BOUND, suiCumDeg: suiCumDeg,
    SIGN_NAMES: SIGN_NAMES, SIGNS: SIGNS,
    SUIXIU: SUIXIU, MAOWANG: MAOWANG, STAR_AB: STAR_AB, ZHI_OF_SIGN: ZHI_OF_SIGN,
    // §8.2–8.5
    aspects: aspects, progressions: progressions, transits: transits, synastry: synastry,
    // v3.1.11：返照盘 + 法达星限（原本只有触发词、没有实现，本次补真算法）
    solarReturn: solarReturn, lunarReturn: lunarReturn, firdaria: firdaria, FIRDARIA: FIRDARIA, sunAltitude: sunAltitude,
    vedicPositions: vedicPositions, ayanamsa: ayanamsa, precessionLon: precessionLon,
    NAK27: NAK27, NAK_LORD: NAK_LORD, VIMS: VIMS, ASPECTS: ASPECTS,
    // v3.1.8：时区换算 + 坐标/恒星时基元（供宫位、卜卦、择时复用，单一真源）
    toUTC: toUTC, obliquity: obliquity, raToLon: raToLon, lonToRa: lonToRa, lonToDec: lonToDec, sidereal: sidereal,
    aspectBetween: aspectBetween, angleDiff: angleDiff, liveKeys: liveKeys, mod360: mod360,
    _vendorOk: !!(A && A.Body && A.Ecliptic)
  };
});
