/**
 * 占星宫位 · 阿拉伯点 · 卜卦/择时占星（C30）
 * ------------------------------------------------------------------
 * 数据与口径（多源核对，均标来源，不臆造）：
 *  1) 上升/天顶：球面天文标准式（Meeus《Astronomical Algorithms》第 13 章赤黄坐标互换），
 *     并可用 astronomy-engine 的 Horizon 独立反验（本文件 __tests__ 即以此交叉校验）。
 *  2) 宫制四家：
 *     · 整宫 Whole Sign（希腊化/传统占星主流）
 *     · 等宫 Equal House（ASC 起每宫 30°，现代常用）
 *     · 波菲利 Porphyry（四轴弧三分，古典）
 *     · 普拉西度 Placidus（半日弧/半夜间弧三分迭代，现代最通用）
 *  3) 阿拉伯点：日盘 A+B−C、夜盘取反的「日月反背」法则（Robert Zoller《The Arabic Parts
 *     in Astrology》、Robert Hand《Horoscope Symbols》口径；中文 5 源一致）。
 *     婚姻点用现代主流式（ASC+七宫头−金星），古法「男 ASC+金−土 / 女 ASC+火−金」并列注明。
 *  4) 卜卦：William Lilly《Christian Astrology》(1647) 判据——入相位/出相位、月空亡(VOC)、
 *     燃烧/日光下、尊贵五态、翻译之光、光之收集。VOC 定义取 Lilly 原文：
 *     「已与一星分离，在本宫之内不再入相于他星」。
 *  5) 择时：Lilly 择时通则 + 行星时（迦勒底序，日出日落十二等分）。
 *
 * 已知缺口（如实标注，不假报已锁）：
 *  · 普拉西度在 |纬度| > 66° 处数学退化（极区太阳不升不落），本内核自动降级波菲利并注明；
 *  · 阿拉伯点只收 5 源一致的常用 12 点，其余百余点流派分歧大，不收；
 *  · 卜卦为「规则提示」不作绝对断言（Lilly 亦强调须参问卦人实情）；
 *  · 界/面（Terms/Faces）尊贵未收（埃及界与托勒密界两派分歧），只出庙/旺/陷/落四态。
 *
 * 依赖：astro.js（时区/恒星时/黄经，单一真源）、suntime.js（城市经纬）、vendor/astronomy.js（日出日落）。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    try { if (typeof self === 'undefined' && typeof globalThis !== 'undefined') globalThis.self = globalThis; } catch (e) { }
    module.exports = factory(require('./astro.js'), require('./suntime.js'), require('./vendor/astronomy.js'));
  } else {
    root.NT = root.NT || {}; root.NT.core = root.NT.core || {};
    root.NT.core.astroHouse = factory(root.NT.core.astro, root.NT.core.suntime,
      (typeof globalThis !== 'undefined' && globalThis.Astronomy) || root.Astronomy || null);
  }
})(typeof self !== 'undefined' ? self : this, function (AST, ST, A) {

  var mod360 = AST.mod360;
  var angleDiff = AST.angleDiff;
  var SIGNS = ['白羊', '金牛', '双子', '巨蟹', '狮子', '室女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼'];
  var SIGN_SYM = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
  var ZHI = ['戌', '酉', '申', '未', '午', '巳', '辰', '卯', '寅', '丑', '子', '亥']; // 星座→地支（沿用项目既有映射）

  // 七政（古典）宫主：白羊火、金牛金、双子水、巨蟹月、狮子日、室女水、天秤金、天蝎火、射手木、摩羯土、水瓶土、双鱼木
  var SIGN_RULER = ['火星', '金星', '水星', '月亮', '太阳', '水星', '金星', '火星', '木星', '土星', '土星', '木星'];
  // 旺（Exaltation）：[星座序, 度数]
  var EXALT = { 太阳: [0, 19], 月亮: [1, 3], 水星: [5, 15], 金星: [11, 27], 火星: [9, 28], 木星: [3, 15], 土星: [6, 21] };
  var PLANETS7 = ['太阳', '太阴', '水星', '金星', '火星', '木星', '土星'];
  var CHALDEAN = ['土星', '木星', '火星', '太阳', '金星', '水星', '月亮']; // 迦勒底序（由慢到快）
  var WEEK_RULER = ['太阳', '月亮', '火星', '水星', '木星', '金星', '土星']; // 周日→周六

  function signIdxOf(lon) { return Math.floor(mod360(lon) / 30) % 12; }
  function fmtLon(lon) {
    var L = mod360(lon), i = signIdxOf(L), d = L % 30;
    var deg = Math.floor(d), min = Math.round((d - deg) * 60);
    if (min === 60) { min = 0; deg += 1; }
    return SIGNS[i] + ' ' + deg + '°' + (min < 10 ? '0' + min : min) + '′';
  }

  /** 城市或经纬 → {lat, lng, 说明}。缺省北京。 */
  function geo(inp) {
    var lat = inp.lat != null ? +inp.lat : null;
    var lng = inp.lng != null ? +inp.lng : (inp.lon != null ? +inp.lon : null);
    var city = inp.city || inp.城市 || '';
    if (city && ST && ST.CITIES) {
      if (lng == null && ST.CITIES[city] != null) lng = ST.CITIES[city];
      if (lat == null && ST.CITY_LAT && ST.CITY_LAT[city] != null) lat = ST.CITY_LAT[city];
    }
    var 说明 = '';
    if (lat == null) { lat = 39.90; 说明 = '未给城市/纬度，按北京 39.90°N 计（宫位对纬度敏感，建议给城市）'; }
    if (lng == null) { lng = 116.40; 说明 = 说明 || '未给经度，按北京 116.40°E 计'; }
    return { lat: lat, lng: lng, 说明: 说明 };
  }

  // ---------- 上升/天顶 ----------
  /**
   * 上升点（ASC）与天顶（MC）。RAMC = 本地恒星时（度）。
   * 标准式（Meeus 13.1 反解）：tan(ASC) = cos(RAMC) / −(sin(RAMC)cosε + tanφ sinε)
   *                          tan(MC)  = tan(RAMC) / cosε
   */
  function axes(RAMC, latDeg, epsDeg) {
    var R = RAMC * Math.PI / 180, e = epsDeg * Math.PI / 180, p = latDeg * Math.PI / 180;
    var mc = Math.atan2(Math.sin(R), Math.cos(R) * Math.cos(e));
    var asc = Math.atan2(Math.cos(R), -(Math.sin(R) * Math.cos(e) + Math.tan(p) * Math.sin(e)));
    return { ASC: mod360(asc * 180 / Math.PI), MC: mod360(mc * 180 / Math.PI) };
  }

  // 波菲利：四轴弧三分
  function porphyry(ASC, MC) {
    var c = new Array(12);
    c[0] = ASC; c[9] = MC; c[3] = mod360(MC + 180); c[6] = mod360(ASC + 180);
    function tri(a, b, k) { return mod360(a + (mod360(b - a)) * k / 3); }
    c[1] = tri(ASC, c[3], 1); c[2] = tri(ASC, c[3], 2);      // 1→4 弧三分 = 2、3 宫
    c[4] = tri(c[3], c[6], 1); c[5] = tri(c[3], c[6], 2);    // 4→7 弧三分 = 5、6 宫
    c[7] = tri(c[6], c[9], 1); c[8] = tri(c[6], c[9], 2);    // 7→10 弧三分 = 8、9 宫
    c[10] = tri(c[9], ASC, 1); c[11] = tri(c[9], ASC, 2);    // 10→1 弧三分 = 11、12 宫
    return c;
  }

  // 普拉西度：半弧三分迭代（11/12/2/3 宫头，其余由对宫取）
  function placidus(ASC, MC, RAMC, latDeg, epsDeg) {
    var p = latDeg * Math.PI / 180;
    if (Math.abs(latDeg) > 66) return { ok: false, cusps: null, why: '|纬度|>66° 普拉西度退化' };
    function cusp(targetFrac, base, useSD) {
      // useSD=true：从 MC 起算白昼半弧（90+AD）；false：从 IC 起算夜间半弧（90−AD）
      var lam = mod360(base), ra = 0;
      for (var i = 0; i < 40; i++) {
        var dec = AST.lonToDec(lam, epsDeg) * Math.PI / 180;
        var t = Math.tan(p) * Math.tan(dec);
        if (Math.abs(t) > 1) return null;
        var AD = Math.asin(t) * 180 / Math.PI;
        var semi = useSD ? (90 + AD) : (90 - AD);
        var ra2 = useSD ? mod360(RAMC + targetFrac * semi) : mod360(RAMC + 180 - targetFrac * semi);
        var lam2 = AST.raToLon(ra2, epsDeg);
        var d = Math.abs(mod360(lam2 - lam));
        if (d > 180) d = 360 - d;
        lam = lam2; ra = ra2;
        if (d < 1e-7) break;
      }
      return mod360(lam);
    }
    var c11 = cusp(1 / 3, 0, true), c12 = cusp(2 / 3, 0, true);
    var c2 = cusp(2 / 3, 180, false), c3 = cusp(1 / 3, 180, false);
    if ([c11, c12, c2, c3].some(function (x) { return x == null; })) {
      return { ok: false, cusps: null, why: '普拉西度在该纬度无解（极昼/极夜）' };
    }
    var c = new Array(12);
    c[0] = ASC; c[9] = MC; c[3] = mod360(MC + 180); c[6] = mod360(ASC + 180);
    c[10] = c11; c[11] = c12; c[1] = c2; c[2] = c3;
    c[4] = mod360(c[10] + 180); c[5] = mod360(c[11] + 180);
    c[7] = mod360(c[1] + 180); c[8] = mod360(c[2] + 180);
    return { ok: true, cusps: c, why: '' };
  }

  function wholeSign(ASC) {
    var s = Math.floor(mod360(ASC) / 30) * 30, c = [];
    for (var i = 0; i < 12; i++) c.push(mod360(s + 30 * i));
    return c;
  }
  function equalHouse(ASC) {
    var c = []; for (var i = 0; i < 12; i++) c.push(mod360(ASC + 30 * i)); return c;
  }

  // 某黄经落第几宫（宫头起点含、下宫头不含；按黄道顺行判定）
  function houseIndexOf(lon, cusps) {
    for (var i = 0; i < 12; i++) {
      var a = cusps[i], b = cusps[(i + 1) % 12];
      var span = mod360(b - a), off = mod360(lon - a);
      if (off < span || span === 0) return i + 1;
    }
    return 12;
  }

  /**
   * 宫位盘。入参：{y,m,d,h, tz(默认8), lat, lng, city}
   * 出：{ 上升, 天顶, 下降, 天底, 恒星时, 宫制:{整宫,等宫,波菲利,普拉西度}, 落宫, 缺口 }
   */
  function houses(inp) {
    inp = inp || {};
    if (!inp.y || !inp.m || !inp.d) return { err: '宫位需出生年月日时（例「1990年8月15日14时 北京」）。' };
    var tz = (inp.tz == null ? 8 : +inp.tz);       // 本项目全部输入按北京时间
    var g = geo(inp);
    var h = inp.h || 0;
    var sid = AST.sidereal(inp.y, inp.m, inp.d, h, tz, g.lng);
    var U = sid.世界时;
    var eps = AST.obliquity(U.y, U.m, U.d, U.h);
    var ax = axes(sid.LST, g.lat, eps);
    var ASC = ax.ASC, MC = ax.MC;

    var sys = {};
    sys.整宫 = wholeSign(ASC);
    sys.等宫 = equalHouse(ASC);
    sys.波菲利 = porphyry(ASC, MC);
    var pl = placidus(ASC, MC, sid.LST, g.lat, eps);
    sys.普拉西度 = pl.ok ? pl.cusps : null;

    var p = AST.positions({ y: inp.y, m: inp.m, d: inp.d, h: h, tz: tz });
    var 落宫 = {};
    if (p && p.黄经) {
      Object.keys(p.黄经).forEach(function (k) {
        if (p.黄经[k] == null) return;
        落宫[k] = {};
        Object.keys(sys).forEach(function (s) {
          if (!sys[s]) return;
          落宫[k][s] = houseIndexOf(p.黄经[k], sys[s]);
        });
      });
    }
    return {
      上升: fmtLon(ASC), 上升黄经: +ASC.toFixed(3),
      天顶: fmtLon(MC), 天顶黄经: +MC.toFixed(3),
      下降: fmtLon(ASC + 180), 天底: fmtLon(MC + 180),
      地点: g.lat.toFixed(2) + '°N ' + g.lng.toFixed(2) + '°E',
      恒星时: sid.LST.toFixed(2) + '°（RAMC）',
      黄赤交角: eps.toFixed(4) + '°',
      宫制: sys, 宫制缺: pl.ok ? '' : ('普拉西度不可用：' + pl.why + '（已降级波菲利）'),
      落宫: 落宫,
      各宫宫头: sys.普拉西度 || sys.波菲利,
      缺口: [
        g.说明,
        '宫制四家并列不合并：整宫（希腊化）、等宫（现代常用）、波菲利（古典四轴三分）、普拉西度（半弧三分，现代最通用）',
        '上升/天顶为球面天文标准解，可用 astronomy-engine 地平坐标反验（见测试）'
      ].filter(Boolean)
    };
  }

  // ---------- 阿拉伯点 ----------
  /** 日盘判定：太阳落第 7–12 宫（地平线以上）→ 日间盘。
   *  一轮宫位由上升起顺黄道排 1–12，故 (日−上升) mod 360 ∈ (0,180) 为 1–6 宫（地平线下），
   *  ∈ (180,360) 为 7–12 宫（地平线上）。 */
  function isDay(sunLon, ascLon) { return mod360(sunLon - ascLon) > 180; }

  function lots(inp) {
    var hp = houses(inp); if (hp.err) return hp;
    var tz = (inp.tz == null ? 8 : +inp.tz);
    var p = AST.positions({ y: inp.y, m: inp.m, d: inp.d, h: inp.h || 0, tz: tz });
    var L = p.黄经, ASC = hp.上升黄经;
    var day = isDay(L.太阳, ASC);
    // 日盘：ASC + A − B；夜盘取反：ASC + B − A
    function lot(A, B) {
      return day ? mod360(ASC + L[A] - L[B]) : mod360(ASC + L[B] - L[A]);
    }
    function one(name, lon, 式, 说明) {
      return { 名: name, 黄经: +mod360(lon).toFixed(3), 位置: fmtLon(lon), 星座: SIGNS[signIdxOf(lon)], 宫: houseIndexOf(lon, hp.各宫宫头), 公式: 式, 说明: 说明 };
    }
    var 福 = lot('太阴', '太阳'), 精神 = day ? mod360(ASC + L.太阳 - L.太阴) : mod360(ASC + L.太阴 - L.太阳);
    var out = [];
    out.push(one('福点', 福, day ? '日盘：上升＋月亮−太阳' : '夜盘：上升＋太阳−月亮', '运势、身体、物质所得之所主'));
    out.push(one('精神点', 精神, day ? '日盘：上升＋太阳−月亮' : '夜盘：上升＋月亮−太阳', '心智、意志、行动之所主'));
    out.push(one('爱欲点', day ? mod360(ASC + L.金星 - 精神) : mod360(ASC + 精神 - L.金星), day ? '日盘：上升＋金星−精神点' : '夜盘：上升＋精神点−金星', '情欲与吸引力（Paulus 口径）'));
    out.push(one('必然点', day ? mod360(ASC + L.水星 - 福) : mod360(ASC + 福 - L.水星), day ? '日盘：上升＋水星−福点' : '夜盘：上升＋福点−水星', '不得已之事、环境所迫（Paulus 口径）'));
    out.push(one('勇气点', day ? mod360(ASC + L.火星 - 福) : mod360(ASC + 福 - L.火星), day ? '日盘：上升＋火星−福点' : '夜盘：上升＋福点−火星', '胆气、争斗、冒险（Paulus 口径）'));
    out.push(one('胜利点', day ? mod360(ASC + L.木星 - 精神) : mod360(ASC + 精神 - L.木星), day ? '日盘：上升＋木星−精神点' : '夜盘：上升＋精神点−木星', '信心、得胜、贵人（Paulus 口径）'));
    out.push(one('父亲点', mod360(ASC + L.太阳 - L.土星), '上升＋太阳−土星', '父系、权威、庇护（日夜同式）'));
    out.push(one('母亲点', mod360(ASC + L.太阴 - L.金星), '上升＋月亮−金星', '母系、养育、感性（日夜同式）'));
    var dsc = mod360(ASC + 180);
    out.push(one('婚姻点', mod360(dsc - L.金星), '上升＋七宫头−金星', '亲密关系与婚姻（现代主流式，古法另有「男 上升＋金−土、女 上升＋火−金」一派，并列不合并）'));
    out.push(one('健康点', mod360(ASC + L.火星 - L.土星), '上升＋火星−土星', '体魄与病厄（日夜同式）'));
    out.push(one('职业点', mod360(ASC + L.太阴 - L.火星), '上升＋月亮−火星', '营生、技艺、劳力（日夜同式）'));
    var c2 = hp.各宫宫头[1], r2 = SIGN_RULER[signIdxOf(c2)];
    out.push(one('财产点', mod360(c2 - L[r2]), '上升＋二宫头−二宫主星', '财物、动产、积蓄'));
    return {
      日夜盘: day ? '日间盘（太阳在地平线以上）' : '夜间盘（太阳在地平线以下）',
      生成: '日盘一律 上升＋A−B；夜盘取反 上升＋B−A（日月反背法则）',
      上升: hp.上升,
      点: out,
      说明: '阿拉伯点原为希腊「特殊点(Lot)」，后被阿拉伯占星家扩增至 97 点以上。本表只收 5 源一致的常用 12 点。',
      缺口: '报应点/死亡点等流派公式分歧过大，未收（不臆造）；界/面尊贵未收（埃及界与托勒密界两派）。'
    };
  }

  // ---------- 卜卦（Horary）----------
  var Q_HOUSE = [
    { 宫: 1, 词: ['自身', '本人', '我', '寿'] },
    { 宫: 2, 词: ['钱财', '财', '收入', '工资', '钱', '存款', '价值'] },
    { 宫: 3, 词: ['兄弟', '姐妹', '短途', '消息', '文书', '考试消息', '邻'] },
    { 宫: 4, 词: ['房', '宅', '家', '父亲', '地基', '失物', '祖', '搬家'] },
    { 宫: 5, 词: ['子女', '孩子', '孕', '怀', '恋爱', '投机', '赌', '娱乐'] },
    { 宫: 6, 词: ['病', '疾', '健康', '雇', '下属', '仆', '宠物', '琐事'] },
    { 宫: 7, 词: ['婚姻', '结婚', '配偶', '合作', '合伙', '对手', '被告', '婚'] },
    { 宫: 8, 词: ['他人之财', '继承', '遗产', '借贷', '死亡', '疾厄', '保险'] },
    { 宫: 9, 词: ['远行', '出国', '留学', '学业', '考试', '法律', '诉讼', '官司', '师'] },
    { 宫: 10, 词: ['事业', '工作', '求职', '应聘', '面试', '升职', '创业', '官', '职位', '名声', '老板', '升迁', '母亲'] },
    { 宫: 11, 词: ['朋友', '愿望', '人脉', '收益', '团体', '贵人'] },
    { 宫: 12, 词: ['隐忧', '暗中', '小人', '囚', '秘密', '潜', '医院', '损耗'] }
  ];
  function pickHouse(q) {
    var best = { 宫: 1, 词: '' }, bestLen = 0;
    Q_HOUSE.forEach(function (row) {
      row.词.forEach(function (w) {
        if (q.indexOf(w) >= 0 && w.length > bestLen) { best = { 宫: row.宫, 词: w }; bestLen = w.length; }
      });
    });
    return best;
  }
  var HOUSE_NAME = ['自身', '财帛', '兄弟', '田宅', '子女', '奴仆/疾病', '夫妻/合作', '疾厄/他人之财', '迁移/学业', '官禄/事业', '福德/交友', '玄秘/隐忧'];

  /** 某时刻七政黄经（卜卦用，带小时偏移） */
  function lonsAt(inp, addHours) {
    var tz = (inp.tz == null ? 8 : +inp.tz);
    var t = new Date(Date.UTC(inp.y, inp.m - 1, inp.d, inp.h || 0));
    t.setUTCMinutes(t.getUTCMinutes() + Math.round((addHours || 0) * 60));
    var p = AST.positions({
      y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(),
      h: t.getUTCHours() + t.getUTCMinutes() / 60, tz: tz
    });
    return p.黄经;
  }

  /** 两星当前相位状态：{角, 名, 入相(bool), 容许差} */
  function aspectState(la, lb, dLonA, dLonB) {
    var ASP = AST.ASPECTS.filter(function (a) { return [0, 60, 90, 120, 180].indexOf(a.角) >= 0; });
    var d = angleDiff(la, lb), best = null;
    ASP.forEach(function (a) {
      var diff = Math.abs(d - a.角);
      if (!best || diff < best.diff) best = { 角: a.角, 名: a.名, diff: diff, orb: a.orb };
    });
    if (!best) return null;
    // 变化率：相对位置的角距随时间增大 → 出相；减小 → 入相
    var d2 = angleDiff(la + dLonA, lb + dLonB);
    var diff2 = Math.abs(d2 - best.角);
    var 入相 = diff2 < best.diff;
    return { 角: best.角, 名: best.名, 入相: 入相, 容许差: +best.diff.toFixed(2), 在容许内: best.diff <= best.orb };
  }

  /** 月空亡（Lilly 定义）+ 出宫前最后一个入相 */
  function moonVoid(moonLon, moonSpeedPerDay, lons, speeds) {
    var degToExit = 30 - (mod360(moonLon) % 30);
    var hoursToExit = (degToExit / Math.max(moonSpeedPerDay, 0.01)) * 24;
    var best = null;
    PLANETS7.forEach(function (pl) {
      if (pl === '太阴') return;
      var st = aspectState(moonLon, lons[pl], moonSpeedPerDay / 24, speeds[pl] / 24);
      if (!st || !st.入相) return;
      var relSpd = Math.abs((moonSpeedPerDay - speeds[pl]) / 24); // 度/小时
      var hrs = relSpd > 1e-6 ? (st.容许差 / relSpd) : Infinity;
      if (hrs <= hoursToExit && (!best || hrs < best.小时)) {
        best = { 星: pl, 名: st.名, 角: st.角, 小时: +hrs.toFixed(2), 度数: +st.容许差.toFixed(2) };
      }
    });
    return { 空亡: !best, 出宫前入相: best, 距出宫: +hoursToExit.toFixed(2) };
  }

  /**
   * 卜卦盘。入参同 houses，另 q=所问之事。
   * 出：{ 问事宫, 问卦主星, 事主星, 月, 判据[], 结论 }
   */
  function horary(inp, q) {
    var hp = houses(inp); if (hp.err) return hp;
    q = String(q || '');
    var pick = pickHouse(q);
    var asc = hp.上升黄经, cusps = hp.各宫宫头;
    var ascLord = SIGN_RULER[signIdxOf(asc)];
    var qCusp = cusps[pick.宫 - 1], qLord = SIGN_RULER[signIdxOf(qCusp)];
    var L0 = lonsAt(inp, 0), L1 = lonsAt(inp, 24);
    var speeds = {};
    PLANETS7.forEach(function (k) { speeds[k] = mod360(L1[k] - L0[k]) > 180 ? mod360(L1[k] - L0[k]) - 360 : mod360(L1[k] - L0[k]); });

    var 判 = [];
    function add(s) { 判.push(s); }

    // ① 主星同异
    if (ascLord === qLord) add('问卦主星与事主星同为「' + ascLord + '」：事在己手，成否全看自身作为。');

    // ② 尊贵（庙/旺/陷/落）
    function dignity(pl) {
      var s = signIdxOf(L0[pl]);
      var ruler = SIGN_RULER[s];
      var 态 = '平常', 分 = 0;
      if (ruler === pl) { 态 = '庙（入庙有力）'; 分 = 5; }
      else if (EXALT[pl] && EXALT[pl][0] === s) { 态 = '旺（旺相有力）'; 分 = 4; }
      else if (SIGN_RULER[(s + 6) % 12] === pl) { 态 = '陷（失势无力）'; 分 = -4; }
      else if (EXALT[pl] && EXALT[pl][0] === (s + 6) % 12) { 态 = '落（落陷无力）'; 分 = -5; }
      return { 星座: SIGNS[s], 态: 态, 分: 分 };
    }
    var dA = dignity(ascLord), dQ = dignity(qLord);
    add('问卦主星「' + ascLord + '」在' + dA.星座 + '：' + dA.态 + '。');
    add('事主星「' + qLord + '」在' + dQ.星座 + '：' + dQ.态 + '。');

    // ③ 日月状态
    var sun = L0.太阳, moon = L0.太阴;
    var sepSun = angleDiff(moon, sun);
    var 月态 = [];
    if (sepSun < 8.5) 月态.push('月亮燃烧（距日 ' + sepSun.toFixed(1) + '°，主受制、事难显）');
    else if (sepSun < 17) 月态.push('月亮在日光下（距日 ' + sepSun.toFixed(1) + '°，力弱）');
    var mv = moonVoid(moon, speeds['太阴'], L0, speeds);
    if (mv.空亡) 月态.push('月亮空亡（出宫前无入相位，Lilly：事多无成）');
    else 月态.push('月亮出宫前入相于「' + mv.出宫前入相.星 + '」' + mv.出宫前入相.名 + '（约 ' + mv.出宫前入相.小时 + ' 小时内精准，可作应期参考）');
    if (speeds['太阴'] > 13.6) 月态.push('月行疾（' + speeds['太阴'].toFixed(2) + '°/日，事速）');
    else if (speeds['太阴'] < 12.8) 月态.push('月行迟（' + speeds['太阴'].toFixed(2) + '°/日，事缓）');
    add('月亮：' + 月态.join('；') + '。');

    // ④ 主星之间入相位/出相位
    var st = aspectState(L0[ascLord], L0[qLord], speeds[ascLord] / 24, speeds[qLord] / 24);
    var 断 = '未定';
    if (ascLord === qLord) {
      断 = '自身即事，看该星尊贵与月亮状态定成败。';
    } else if (st && st.在容许内) {
      if (st.入相) {
        var good = [0, 60, 120].indexOf(st.角) >= 0;
        断 = (good ? '两主星入相' + st.名 + '：事可成' : '两主星入相' + st.名 + '：成而带阻，须费力') + '（容许差 ' + st.容许差 + '°）。';
      } else {
        断 = '两主星出相' + st.名 + '：事已过或正在脱手，非新起之象。';
      }
      add(断);
    } else {
      // 翻译之光 / 光之收集
      var trans = null, collect = null;
      PLANETS7.forEach(function (p) {
        if (p === ascLord || p === qLord) return;
        var sA = aspectState(L0[p], L0[ascLord], speeds[p] / 24, speeds[ascLord] / 24);
        var sQ = aspectState(L0[p], L0[qLord], speeds[p] / 24, speeds[qLord] / 24);
        if (sA && sQ && !sA.入相 && sQ.入相 && sA.在容许内 && sQ.在容许内 && !trans) trans = { 星: p, 由: sA.名, 至: sQ.名 };
        // 收集之光：两主星皆入相于同一第三星
        var cA = aspectState(L0[ascLord], L0[p], speeds[ascLord] / 24, speeds[p] / 24);
        var cQ = aspectState(L0[qLord], L0[p], speeds[qLord] / 24, speeds[p] / 24);
        if (cA && cQ && cA.入相 && cQ.入相 && cA.在容许内 && cQ.在容许内 && !collect) collect = { 星: p };
      });
      if (trans) { 断 = '两主星无相位，但「' + trans.星 + '」由问卦主星出相、转向事主星入相——翻译之光，事经中介而可成。'; add(断); }
      else if (collect) { 断 = '两主星无相位，但皆入相于「' + collect.星 + '」——光之收集，须待第三方成全。'; add(断); }
      else { 断 = '两主星无相位（且容许度外）：彼此不相及，事多不成或无从下手。'; add(断); }
    }

    // ⑤ 逆行提示
    var retro = PLANETS7.filter(function (p) { return p !== '太阳' && p !== '太阴' && speeds[p] < 0; });
    if (retro.length) add('逆行：' + retro.join('、') + '。逆行主反复、延迟、旧事重提。');

    return {
      所问: q || '（未指明，按自身事论）',
      问事宫: pick.宫 + '宫（' + HOUSE_NAME[pick.宫 - 1] + '）' + (pick.词 ? '，因「' + pick.词 + '」取此宫' : '，未识别事类，按一宫自身论'),
      问卦主星: ascLord + '（上升' + hp.上升 + '）',
      事主星: qLord + '（' + pick.宫 + '宫头 ' + fmtLon(qCusp) + '）',
      月亮: { 位置: fmtLon(moon), 速度: +speeds['太阴'].toFixed(2), 空亡: mv.空亡, 出宫前入相: mv.出宫前入相 },
      判据: 判,
      结论: 断,
      说明: '判据按 Lilly《Christian Astrology》(1647)：入相位主成、出相位主过、无相主不成，月空亡主无成，辅以庙旺陷落与翻译/收集之光。',
      缺口: '本盘只作规则提示，不作绝对断言；界/面尊贵、月之「feral」等细则未收。'
    };
  }

  // ---------- 择时（Electional）----------
  var HOUR_RULER_SEQ = CHALDEAN;

  function sunTimes(inp) {
    if (!A || !A.SearchRiseSet) return null;
    var tz = (inp.tz == null ? 8 : +inp.tz);
    var g = geo(inp);
    var obs = new A.Observer(g.lat, g.lng, 0);
    var start = A.MakeTime(new Date(Date.UTC(inp.y, inp.m - 1, inp.d, 0) - tz * 3600 * 1000));
    var rise = A.SearchRiseSet(A.Body.Sun, obs, +1, start, 1);
    var set = A.SearchRiseSet(A.Body.Sun, obs, -1, start, 1);
    if (!rise || !set) return null;
    return { 日出: rise.date, 日落: set.date, obs: obs };
  }

  /** 行星时：昼 12 等分、夜 12 等分，迦勒底序由当日日主起轮转 */
  function planetaryHour(inp) {
    var t = sunTimes(inp); if (!t) return { err: '行星时需 astronomy 星历（日出日落）' };
    var tz = (inp.tz == null ? 8 : +inp.tz);
    var now = new Date(Date.UTC(inp.y, inp.m - 1, inp.d, 0) + ((inp.h || 0) - tz) * 3600 * 1000);
    var rise = t.日出, set = t.日落;
    var dayRuler = WEEK_RULER[new Date(Date.UTC(inp.y, inp.m - 1, inp.d)).getUTCDay()];
    var idx = HOUR_RULER_SEQ.indexOf(dayRuler);
    var 段, k, span, nightStart = null, nightEnd = null;
    if (now >= rise && now < set) {
      段 = '昼'; span = (set - rise) / 12; k = Math.floor((now - rise) / span);
    } else {
      段 = '夜';
      if (now >= set) {
        nightStart = set;
        var nr = A.SearchRiseSet(A.Body.Sun, t.obs, +1, A.MakeTime(new Date(set.getTime() + 60000)), 1);
        nightEnd = nr ? nr.date : new Date(set.getTime() + 12 * 3600 * 1000);
      } else {
        var ps = A.SearchRiseSet(A.Body.Sun, t.obs, -1, A.MakeTime(new Date(rise.getTime() - 60000)), 1);
        nightStart = ps ? ps.date : new Date(rise.getTime() - 12 * 3600 * 1000);
        nightEnd = rise;
      }
      span = (nightEnd - nightStart) / 12;
      k = Math.floor((now - nightStart) / span);
    }
    if (!(k >= 0)) k = 0; if (k > 11) k = 11;
    var seqIdx = 段 === '昼' ? k : 12 + k;   // 昼 0–11、夜 12–23 连续排
    var ruler = HOUR_RULER_SEQ[(idx + seqIdx) % 7];
    return {
      日主: dayRuler, 段: 段 + '时', 第几时: k + 1, 行星时主: ruler,
      日出: fmtTime(rise, tz), 日落: fmtTime(set, tz),
      说明: '行星时：日出至日落十二等分（昼时），日落至次日日出十二等分（夜时），按迦勒底序 土→木→火→日→金→水→月 轮转，当日首时之主的次序由日主起。'
    };
  }
  function fmtTime(d, tz) {
    var t = new Date(d.getTime() + tz * 3600 * 1000);
    var h = t.getUTCHours(), m = t.getUTCMinutes();
    return (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m);
  }

  // 月相八分（以日月黄经差）
  function moonPhase(sunLon, moonLon) {
    var d = mod360(moonLon - sunLon), i = Math.floor(d / 45) % 8;
    var names = ['新月', '娥眉月', '上弦月', '盈凸月', '满月', '亏凸月', '下弦月', '残月'];
    return { 名: names[i], 差: +d.toFixed(1) };
  }

  var ELECTION_TOPIC = {
    嫁娶: { 宜: '月盈（上弦至满月）、金星有力、七宫主不受克', 忌: '月空亡、月亏、火星刑冲七宫、金逆' },
    开业: { 宜: '月盈、木星/太阳有力、十宫主得吉', 忌: '水逆、月空亡、土火刑冲天顶' },
    签约: { 宜: '水星顺行有力、月入相吉星', 忌: '水逆、月空亡、月被土火刑克' },
    出行: { 宜: '月入相吉星、三/九宫主有力', 忌: '月空亡、火星刑冲上升、水逆' },
    动土: { 宜: '月盈、四宫主稳、土星不克月', 忌: '月空亡、月亏、火星克四宫' },
    求医: { 宜: '月渐亏（消减）、六宫主得吉', 忌: '月空亡、月入疾病宫受克' },
    诉讼: { 宜: '七宫主弱、一宫主强、月入相一宫主', 忌: '月空亡、一宫主受克' },
    安葬: { 宜: '月渐亏、土星得地', 忌: '月空亡、月盈' }
  };

  /**
   * 择时盘。入参同 houses，另 topic=事项。
   */
  function election(inp, topic) {
    var hp = houses(inp); if (hp.err) return hp;
    var tz = (inp.tz == null ? 8 : +inp.tz);
    var p = AST.positions({ y: inp.y, m: inp.m, d: inp.d, h: inp.h || 0, tz: tz });
    var L = p.黄经, asc = hp.上升黄经;
    var L1 = lonsAt(inp, 24);
    var sp = {};
    PLANETS7.forEach(function (k) { sp[k] = mod360(L1[k] - L[k]) > 180 ? mod360(L1[k] - L[k]) - 360 : mod360(L1[k] - L[k]); });
    var mv = moonVoid(L.太阴, sp['太阴'], L, sp);
    var ph = moonPhase(L.太阳, L.太阴);
    var 项 = [], 分 = 50;

    // 月空亡
    if (mv.空亡) { 项.push({ 名: '月空亡', 判: '忌', 说: '月亮出宫前无入相位——Lilly：事多无成，不宜起新事。' }); 分 -= 25; }
    else { 项.push({ 名: '月在相位', 判: '吉', 说: '月出宫前入相「' + mv.出宫前入相.星 + '」，气脉不绝。' }); 分 += 8; }

    // 月相（按事项适配：生发之事宜盈、消减之事宜亏）
    var 盈 = /娥眉|上弦|盈凸/.test(ph.名), 亏 = /亏凸|下弦|残月/.test(ph.名);
    var 宜盈 = ['嫁娶', '开业', '动土'].indexOf(topic) >= 0;
    var 宜亏 = ['求医', '安葬'].indexOf(topic) >= 0;
    if (ph.名 === '新月' || ph.名 === '满月') {
      项.push({ 名: '月相·' + ph.名, 判: '平', 说: ph.名 === '新月' ? '新月主始，宜谋划不宜成事（事未成形）。' : '满月主极盛将转，宜收成不宜开新。' });
    } else if (盈) {
      if (宜盈) { 项.push({ 名: '月相·' + ph.名, 判: '吉', 说: '月渐盈，正合' + topic + '生发之机。' }); 分 += 10; }
      else if (宜亏) { 项.push({ 名: '月相·' + ph.名, 判: '忌', 说: '月渐盈，' + topic + '宜消不宜长，此月相不合。' }); 分 -= 8; }
      else { 项.push({ 名: '月相·' + ph.名, 判: '吉', 说: '月渐盈，气机向外，宜进不宜退。' }); 分 += 6; }
    } else if (亏) {
      if (宜亏) { 项.push({ 名: '月相·' + ph.名, 判: '吉', 说: '月渐亏，正合' + topic + '消减之机。' }); 分 += 10; }
      else if (宜盈) { 项.push({ 名: '月相·' + ph.名, 判: '忌', 说: '月渐亏，' + topic + '欲其生长，此月相不合。' }); 分 -= 8; }
      else { 项.push({ 名: '月相·' + ph.名, 判: '平', 说: '月渐亏，气机内收。' }); }
    }

    // 水逆
    if (sp['水星'] < 0) { 项.push({ 名: '水星逆行', 判: '忌', 说: '水逆主文书反复、约期生变，忌签约、远行、购器。' }); 分 -= 15; }
    else { 项.push({ 名: '水星顺行', 判: '吉', 说: '水星顺行，文书、沟通、交通无碍。' }); 分 += 5; }

    // 火土刑冲上升/天顶
    ['火星', '土星'].forEach(function (bad) {
      var sA = aspectState(L[bad], asc, sp[bad] / 24, 0.0);
      if (sA && sA.在容许内 && [90, 180].indexOf(sA.角) >= 0) {
        项.push({ 名: bad + '刑冲上升', 判: '忌', 说: bad + '以' + sA.名 + '加于上升（容许差 ' + sA.容许差 + '°），主阻滞、耗损、争执。' }); 分 -= 12;
      }
    });

    // 吉星照命
    ['金星', '木星'].forEach(function (good) {
      var sA = aspectState(L[good], asc, sp[good] / 24, 0.0);
      if (sA && sA.在容许内 && [0, 60, 120].indexOf(sA.角) >= 0) {
        项.push({ 名: good + sA.名 + '上升', 判: '吉', 说: good + '以' + sA.名 + '加于上升，主顺利、有助。' }); 分 += 10;
      }
    });

    // 行星时
    var ph2 = planetaryHour(inp);
    if (!ph2.err) {
      var 主 = ph2.行星时主;
      var 事主 = { 嫁娶: '金星', 开业: '太阳', 签约: '水星', 出行: '水星', 动土: '土星', 求医: '月亮', 诉讼: '火星', 安葬: '土星' }[topic];
      项.push({
        名: '行星时·' + 主, 判: (事主 && 主 === 事主) ? '吉' : '平',
        说: '当值行星时为' + 主 + (事主 ? (主 === 事主 ? '，与所办之事同主，得时。' : '，与所办之事（主' + 事主 + '）不同主。') : '。')
      });
      if (事主 && 主 === 事主) 分 += 8;
    }

    var tp = ELECTION_TOPIC[topic];
    if (分 > 75) var 档 = '大吉可用';
    else if (分 > 60) var 档 = '可用（有小碍）';
    else if (分 >= 45) var 档 = '平（可备而缓行）';
    else var 档 = '不宜（另择）';

    return {
      事项: topic || '（未指明）',
      时刻: p.时刻, 地点: hp.地点,
      月相: ph.名, 月: fmtLon(L.太阴), 月亮空亡: mv.空亡,
      上升: hp.上升,
      项: 项, 评分: Math.max(0, Math.min(100, 分)), 吉凶档: 档,
      通则: tp ? ('宜：' + tp.宜 + '；忌：' + tp.忌) : '未识别事项，仅出通用吉凶项。',
      行星时: ph2,
      说明: '择时（Electional）以月亮为首要（Lilly：月为万事之引路者），次看水逆、凶星刑冲四轴、吉星照命、行星时。',
      缺口: '评分是本内核为便于排序所设的启发式权重，非古籍定量；古籍只论「宜/忌/可用/不可用」，故吉凶档以文字为准。'
    };
  }

  return {
    houses: houses, lots: lots, horary: horary, election: election,
    planetaryHour: planetaryHour, moonPhase: moonPhase,
    axes: axes, fmtLon: fmtLon, houseIndexOf: houseIndexOf,
    SIGN_RULER: SIGN_RULER, EXALT: EXALT, PLANETS7: PLANETS7,
    cities: (ST && ST.CITIES) ? Object.keys(ST.CITIES) : [],
    CHALDEAN: CHALDEAN, WEEK_RULER: WEEK_RULER, ELECTION_TOPIC: ELECTION_TOPIC, Q_HOUSE: Q_HOUSE
  };
});
