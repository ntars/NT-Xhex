/**
 * modules/CoreModule/astro.js —— 占星 / 七政四余内核 C18/C19【单一真源 · 适配层】
 *
 * 算什么：某时刻「七政」（日/月/水/金/火/木/土）+「三余」（罗睺/计都/月孛）的
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
 *   ── 落二十八宿（v3.1.3 补）：宿度取《淮南子·天文训》（角12 亢9 氐15 房5 心5 尾18 箕11…轸17，
 *      4 源逐字一致、整数和 365·余 0.25 即"四分度之一"）。落宿走**等宫近似**：角宿初度对齐
 *      春分 0° 黄经、按宿度占比铺满 360°（果老/周敦颐派用「不等宫·地支跨宿」为流派差异，此处不锁）。
 *   ── 七政庙旺（v3.1.3 补）：《果老星宗卷一》「星曜庙/旺/喜/乐宫」表 +「入垣」（4 源逐字一致，
 *      含四余 罗/计/孛）。12 等分宫（白羊 0°）按「地支宫」命名（戌白羊/酉金牛/…亥双鱼，果老"宫分所属"）
 *      查表 → 某曜在某宫 = 庙/旺/喜/乐/垣（多态可叠加），皆无 = 平常。
 *
 * 缺口（严守零臆造，核到权威源才补）：
 *   ① 紫炁（第 11 曜）：七政四余传统有「日拱点(地球远日点) vs Chiron(小行星 2060)」两说，
 *      定义待权威裁定 → positions() 不输出紫炁，标 `缺口`。
 *      （原②落二十八宿 / ③庙旺 已按上述权威表补齐；果老「不等宫」宿度、紫炁定义 仍属流派/待裁定。）
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

  // 某实星地心回归黄经（0-360）。A 缺失 → 返回 null（三余仍可用公式，单独给）
  function planetLon(bodyKey, y, m, d, h) {
    var B = bodyEnum(); if (!B) return null;
    var t = A.MakeTime(new Date(Date.UTC(y, m - 1, d, h || 0)));
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

  // ── 落二十八宿（宿度《淮南子·天文训》，4 源逐字一致；等宫近似，角初度对齐春分 0°）──
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

  // 落二十八宿（等宫近似）：回归黄经 L(0-360, 0=春分) → 宿主 + 入度（角初度@0°，按宿度占比铺满 360°）
  function suiXiuOf(lon) {
    var L = mod360(lon), x = L * SUIXIU_TOTAL / 360; // 换算到古人 365 整数尺度
    var acc = 0, i = 0;
    while (i < SUIXIU.length) { var wd = SUIXIU[i][1]; if (x < acc + wd || i === SUIXIU.length - 1) break; acc += wd; i++; }
    var 度 = Math.floor(x - acc) + 1; // 入宿 N 度（1-based，古历"每宿俱有初度一"）
    var s = SUIXIU[i];
    return { 宿: s[0], 入度: 度, 全名: s[0] + s[2] + s[3], 五行: s[2], 动物: s[3], 宿度: s[1] };
  }

  // ── 七政庙旺（《果老星宗卷一》，4 源逐字一致；含四余 罗/计/孛，紫炁定义未定不输出）──
  // 每行 = 某态下，各曜(简)落入哪些地支宫。键 7 政简 + 四余 罗/计/孛 + 气(紫炁,保留不输出)。
  var MAOWANG = {
    垣: { 日: ['午'], 月: ['未'], 水: ['巳', '申'], 金: ['辰', '酉'], 火: ['卯', '戌'], 木: ['子', '丑'] },
    庙: { 日: ['午'], 月: ['戌'], 水: ['午'], 金: ['辰', '酉'], 火: ['卯'], 木: ['亥'], 土: ['子', '丑'], 气: ['申'], 孛: ['未'], 罗: ['寅', '午'], 计: ['巳', '亥'] },
    旺: { 日: ['巳', '戌'], 月: ['酉'], 水: ['子', '巳', '申'], 金: ['午', '亥'], 火: ['丑'], 木: ['未'], 土: ['卯', '辰'], 气: ['丑', '亥'], 孛: ['寅', '巳'], 罗: ['卯'], 计: ['寅', '卯', '戌'] },
    喜: { 日: ['寅'], 月: ['亥', '卯'], 水: ['辰'], 金: ['巳'], 火: ['丑', '申'], 木: ['未'], 土: ['午'], 气: ['戌'], 孛: ['亥'], 罗: ['戌'], 计: ['子'] },
    乐: { 日: ['午', '辰'], 月: ['未'], 水: ['巳', '申'], 金: ['辰', '酉'], 火: ['卯'], 木: ['寅', '亥'], 土: ['丑', '子'], 孛: ['子', '酉'], 计: ['卯'] }
  };
  var STAR_AB = { 太阳: '日', 太阴: '月', 水星: '水', 金星: '金', 火星: '火', 木星: '木', 土星: '土', 罗睺: '罗', 计都: '计', 月孛: '孛' };

  // 某曜在某宫的庙旺状态（果老表）：stateStrong→Weak = 垣/庙/旺/喜/乐（可叠加），皆无 = 平常
  function maowangOf(starKey, signIdx) {
    var ab = STAR_AB[starKey]; if (!ab) return null; // 紫炁等未列者不判
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
    var r3 = threeRemainders(y, m, d, h);
    var 黄经 = {
      太阳: B ? planetLon('太阳', y, m, d, h) : null,
      太阴: B ? planetLon('太阴', y, m, d, h) : null,
      水星: B ? planetLon('水星', y, m, d, h) : null,
      金星: B ? planetLon('金星', y, m, d, h) : null,
      火星: B ? planetLon('火星', y, m, d, h) : null,
      木星: B ? planetLon('木星', y, m, d, h) : null,
      土星: B ? planetLon('土星', y, m, d, h) : null,
      罗睺: r3.罗睺, 计都: r3.计都, 月孛: r3.月孛
    };
    var 星座 = {};
    Object.keys(黄经).forEach(function (k) { 星座[k] = signOf(黄经[k]); });
    // 落二十八宿（等宫近似）：实曜用高精度黄经；三余用均值黄经（均为回归黄经 0-360）
    var 二十八宿 = {};
    Object.keys(黄经).forEach(function (k) { 二十八宿[k] = suiXiuOf(黄经[k]); });
    // 庙旺（果老星宗，按地支宫查表；紫炁定义未定不判）
    var 庙旺 = {};
    Object.keys(黄经).forEach(function (k) {
      if (!STAR_AB[k]) return; // 紫炁等未列者不判
      var signIdx = Math.floor(mod360(黄经[k]) / 30) % 12; // 星座序号(0=白羊)
      庙旺[k] = maowangOf(k, signIdx);
    });
    return {
      时刻: y + '年' + m + '月' + d + '日' + h + '时',
      儒略世纪T: +tcentOf(y, m, d, h).toFixed(5),
      黄经: 黄经, 星座: 星座, 二十八宿: 二十八宿, 庙旺: 庙旺,
      缺口: '紫炁（第 11 曜）定义（日拱点 vs Chiron）待权威裁定，暂不输出；落二十八宿走「等宫近似」（角初度对齐春分），果老/周敦颐「不等宫·地支跨宿」为流派差异未锁；庙旺取《果老星宗卷一》庙/旺/喜/乐/垣 五态查表'
    };
  }

  return {
    positions: positions, signOf: signOf, threeRemainders: threeRemainders,
    suiXiuOf: suiXiuOf, maowangOf: maowangOf,
    SIGN_NAMES: SIGN_NAMES, SIGNS: SIGNS,
    SUIXIU: SUIXIU, MAOWANG: MAOWANG, STAR_AB: STAR_AB, ZHI_OF_SIGN: ZHI_OF_SIGN,
    _vendorOk: !!(A && A.Body && A.Ecliptic)
  };
});
