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
 *
 * 缺口（严守零臆造，核到权威源才补，当前留空不硬写）：
 *   ① 紫炁（第 11 曜）：七政四余传统有「日拱点(地球远日点) vs Chiron(小行星 2060)」两说，
 *      定义待权威裁定 → positions() 不输出紫炁，标 `缺口`。
 *   ② 落二十八宿：需「现代回归二十八宿黄经度界表」（不等度，逐宿主星定界）权威源，暂不出。
 *   ③ 庙旺（果老星宗）：需「8 曜 × 12 宫 庙/旺/中/落/陷」数据表权威源，暂不出。
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
    return {
      时刻: y + '年' + m + '月' + d + '日' + h + '时',
      儒略世纪T: +tcentOf(y, m, d, h).toFixed(5),
      黄经: 黄经, 星座: 星座,
      缺口: '紫炁（第 11 曜）定义待权威裁定；落二十八宿/庙旺需权威表，暂缺'
    };
  }

  return {
    positions: positions, signOf: signOf, threeRemainders: threeRemainders,
    SIGN_NAMES: SIGN_NAMES, SIGNS: SIGNS,
    _vendorOk: !!(A && A.Body && A.Ecliptic)
  };
});
