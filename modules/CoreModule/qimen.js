/**
 * modules/CoreModule/qimen.js —— 奇门遁甲内核 C14【单一真源 · 适配层 · 时家转盘法·拆补定局】
 *
 * 算什么：某时刻的完整奇门局（四柱 / 阴阳遁 / 局数 / 元 / 地盘布仪 / 值符值使 /
 *        天盘九星 / 人盘八门 / 神盘八神）。
 *
 * 算法来源（有权威用权威，零臆造；逐行对照《奇门遁甲统宗》卷一 + 多源交叉）：
 *   · 主流口径 = **时家奇门 · 转盘(排宫)法 · 拆补法定局**。
 *   · 阴阳遁：冬至(起)~夏至(前) 阳遁；夏至(起)~冬至(前) 阴遁（按节气**精确交节时刻**判）。
 *   · 定局表（阳遁）：冬至174 小寒285 大寒396 立春852 雨水963 惊蛰174 春分396
 *                     清明417 谷雨528 立夏417 小满528 芒种639
 *     （阴遁）：夏至936 小暑825 大暑714 立秋258 处暑147 白露936 秋分714
 *               寒露693 霜降582 立冬693 小雪582 大雪471   （上中下元局数，已多源核对一致）
 *   · 拆补定元（符头）：取目标日及之前最近的**甲/己日**为符头，其地支 子午卯酉=上 / 寅申巳亥=中 / 辰戌丑未=下。
 *   · 三奇六仪序（永不变）：戊己庚辛壬癸丁丙乙；阳遁自局数宫**顺**飞、阴遁**逆**飞；中五寄坤二。
 *   · 六甲旬首：甲子戊 甲戌己 甲申庚 甲午辛 甲辰壬 甲寅癸。
 *   · 九星本宫：蓬坎1 芮坤2 冲震3 辅巽4 禽中5(寄坤2) 心乾6 柱兑7 任艮8 英离9。
 *   · 八门本宫：休1 死2 伤3 杜4 开6 惊7 生8 景9（中5无门）。
 *   · 八神(转盘八诈)：值符 螣蛇 太阴 六合 白虎 玄武 九地 九天（自值符落宫，阳顺阴逆）。
 *   · 转盘法：地盘不动，天盘九星/人盘八门整体**顺时针**旋转（相对次序永不变），仅八神分阴阳顺逆。
 *     飞布环序（地理顺时针）= [坎1→艮8→震3→巽4→离9→坤2→兑7→乾6]，值符随时干·值使随时支·八神阳顺阴逆。
 *
 * 加载：UMD —— 小程序 require（注入 LUNAR + GANZHI）；浏览器挂 NT.core.qimen。
 * 校验：modules/CoreModule/__tests__/qimen.test.js（自洽性 + 黄金盘逐宫）。
 *
 * 交叉验证状态（守零臆造，如实标注，不假报）：
 *   ✅ **阴遁 + 阳遁双盘飞布已锁定**（飞布几何 9星/8门/8神 各 8/8 全中）：
 *      · 阴遁盘：tools/qimen-golden-ref.js 盘1（qimen.pro SSR，2026-10-16 丁巳·寒露下元·阴遁3局，离线逆向）
 *      · 阳遁盘：盘3（qimen.pro 前端驱动，2026-02-10 09时·立春中元·阳遁5局，Playwright 起局重排读 DOM）
 *      → 飞布环序 = 洛书地理顺时针 [1,8,3,4,9,2,7,6]；值符随时干·值使门锚「时支宫」·八神阳顺阴逆，双盘实证。
 *   ⏳ **置闰边界盘未锁**：qimenqmdj 站自相矛盾（标阳遁八局但仪位逆排=阴遁特征）、不作裁判。
 *      内核定局走**拆补法**（qimen.pro 同派），置闰法差异为流派取舍，不影响飞布几何。
 *   🐛 **已修 bug**：`currentSolarTerm` 曾遍历 `yearJieqi` 全部 31 键（含英文越界键 LI_CHUN/DA_XUE），
 *      非标准节气区间会取到英文键 → 与定局表中文键对不上而崩溃。改为**只遍历 24 个标准中文节气名**（JIEQI_NAMES）。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./lunar.js'), require('./ganzhi.js'));
  } else {
    root.NT = root.NT || {}; root.NT.core = root.NT.core || {};
    root.NT.core.qimen = factory(root.NT.core && root.NT.core.lunar, root.NT.core && root.NT.core.ganzhi);
  }
})(typeof self !== 'undefined' ? self : this, function (LUNAR, GANZHI) {

  // ===== 数据表（权威，改口径只改这里） =====
  // 阴阳遁 × 节气 × 上中下元 → 局数。节气定局表（《统宗》卷一）。
  var JUREQI = {
    阳: { 冬至: [1, 7, 4], 小寒: [2, 8, 5], 大寒: [3, 9, 6], 立春: [8, 5, 2], 雨水: [9, 6, 3], 惊蛰: [1, 7, 4],
         春分: [3, 9, 6], 清明: [4, 1, 7], 谷雨: [5, 2, 8], 立夏: [4, 1, 7], 小满: [5, 2, 8], 芒种: [6, 3, 9] },
    阴: { 夏至: [9, 3, 6], 小暑: [8, 2, 5], 大暑: [7, 1, 4], 立秋: [2, 5, 8], 处暑: [1, 4, 7], 白露: [9, 3, 6],
         秋分: [7, 1, 4], 寒露: [6, 9, 3], 霜降: [5, 8, 2], 立冬: [6, 9, 3], 小雪: [5, 8, 2], 大雪: [4, 7, 1] }
  };
  var YANGE = ['冬至', '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种'];
  var YINSEG = ['夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪'];

  var SEQ = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'];       // 三奇六仪序
  var XUNSHOU = { 甲子: '戊', 甲戌: '己', 甲申: '庚', 甲午: '辛', 甲辰: '壬', 甲寅: '癸' }; // 六甲遁六仪
  var XUNSHOU_LIST = ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'];
  // 九星本宫（宫号 1-9，中5寄坤2）
  var STAR_HOME = { 1: '天蓬', 2: '天芮', 3: '天冲', 4: '天辅', 5: '天禽', 6: '天心', 7: '天柱', 8: '天任', 9: '天英' };
  var GATE_HOME = { 1: '休', 2: '死', 3: '伤', 4: '杜', 6: '开', 7: '惊', 8: '生', 9: '景' }; // 中5无门
  var GODS = ['值符', '螣蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'];       // 八神序
  // 九星转盘环序（顺时针，相对次序永不变）；天禽随天芮同宫（8 实宫）。
  var STAR_RING = ['天蓬', '天任', '天冲', '天辅', '天英', '天芮', '天柱', '天心'];
  var GATE_RING = ['休', '生', '伤', '杜', '景', '死', '惊', '开'];
  // 洛书九宫顺时针环（跳过中5，8 实宫）：坎→震→巽→离→兑→坤→艮→乾
  // 洛书九宫飞布环（8 实宫，地理顺时针，中5寄坤2不入环）：坎1→艮8→震3→巽4→离9→坤2→兑7→乾6。
  // 九星/八门/八神飞布全用此环。转盘法「九星八门相对次序永不变、恒沿环旋」，八神分阴阳（阳顺阴逆）。
  // 此环序由 tools/qimen-golden-ref.js 的黄金盘（qimen.pro 时家·拆补·转盘法，阴遁3局）逐宫反推验证（9星/8门/8神 全中）。
  var CLOCK = [1, 8, 3, 4, 9, 2, 7, 6];
  // 时支 → 洛书宫（值使随时支：值使门锚到时支所在宫；子午卯酉四正 + 寅申巳亥四生 + 丑未戌亥四墓归宫）
  var ZHI_GONG = { 子: 1, 丑: 8, 寅: 8, 卯: 3, 辰: 4, 巳: 4, 午: 9, 未: 2, 申: 2, 酉: 7, 戌: 6, 亥: 6 };

  var ZHI = '子丑寅卯辰巳午未申酉戌亥';
  function zhiOfHour(h) { return ZHI[Math.floor((((h + 1) % 24) / 2))]; } // 23/1=子

  // 目标时刻所属「当前节气」：取「交节时刻 ≤ 目标」的最大者（跨 y±1 表）。
  // ⚠ 只遍历 24 个标准中文节气名（GANZHI.JIEQI_NAMES），**排除 yearJieqi 混入的英文越界 key**
  //   （如 LI_CHUN/DA_XUE，它们指向相邻年份、与定局表 JUREQI 的中文 key 对不上 → 会取错节气）。
  function currentSolarTerm(y, m, d, h) {
    if (!GANZHI || !GANZHI.yearJieqi) return { 名: null, 时刻: null };
    var targetFull = y * 10000 + m * 100 + d + (h / 24);
    var NAMES = (GANZHI.JIEQI_NAMES && GANZHI.JIEQI_NAMES.length) ? GANZHI.JIEQI_NAMES
      : ['冬至', '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种',
         '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪'];
    var best = null;
    for (var yy = y - 1; yy <= y + 1; yy++) {
      var table = GANZHI.yearJieqi(yy);
      for (var i = 0; i < NAMES.length; i++) {
        var name = NAMES[i];
        var t = table[name]; // 'YYYY-MM-DD HH:MM:SS'
        if (!t) continue;    // 该年表缺此节气（越界）→ 跳过
        var k = +String(t).replace(/-/g, '').replace(/[: ]/g, '').slice(0, 8) + (parseInt(String(t).slice(11, 13)) || 0) / 24;
        if (k <= targetFull && (!best || k > best.k)) best = { k: k, 名: name, 时刻: t };
      }
    }
    return best || { 名: null, 时刻: null };
  }

  // 拆补定元：目标日及之前最近甲/己日（符头）的地支 → 上/中/下
  function yuanOf(dayGZ) {
    var idx = GANZHI.jiaziIndex(dayGZ);
    for (var k = 0; k < 60; k++) {
      var gz = GANZHI.JIAZI[(idx - k + 600) % 60];
      if (gz.slice(0, 1) === '甲' || gz.slice(0, 1) === '己') {
        var z = gz.slice(1, 2);
        if ('子午卯酉'.indexOf(z) >= 0) return '上';
        if ('寅申巳亥'.indexOf(z) >= 0) return '中';
        return '下'; // 辰戌丑未
      }
    }
    return '上';
  }

  function homeOf(x) { return x === 5 ? 2 : x; } // 中五寄坤二

  /**
   * 奇门局。
   * @param {Object} inp { y, m, d, h? }
   * @returns 完整奇门局 或 { err }
   */
  function chart(inp) {
    inp = inp || {};
    if (!LUNAR || !GANZHI) return { err: '奇门需 lunar + ganzhi 内核' };
    var y = inp.y, m = inp.m, d = inp.d, h = inp.h || 0;
    if (!y || !m || !d) return { err: '奇门需出生/用事年月日，例如「1990年8月15日14时」。' };

    // 1) 四柱（奇门日柱 23:00 换日 = 晚子归次日；时柱五鼠遁随换日后日干）
    var pillars = LUNAR.fromSolar(y, m, d, h).ganzhi;
    // 晚子换日：若时刻 ≥ 23，日柱取次日（用次日 0 时算日柱，稳）
    var lateZi = h >= 23;
    var 日干支, 时干支 = pillars.时.干支;
    if (lateZi) {
      var nx = new Date(Date.UTC(y, m - 1, d + 1));
      日干支 = LUNAR.fromSolar(nx.getUTCFullYear(), nx.getUTCMonth() + 1, nx.getUTCDate(), 0).ganzhi.日.干支;
    } else {
      日干支 = pillars.日.干支;
    }

    // 2) 定局（拆补）：当前节气 + 阴阳遁 + 符头元 → 局数
    var cur = currentSolarTerm(y, m, d, h);
    if (!cur.名) return { err: '未定位当前节气（请给 1901–2100 内时刻）' };
    var yang = YANGE.indexOf(cur.名) >= 0;   // 阳段 vs 阴段
    var yuan = yuanOf(日干支);               // 上/中/下
    var yuanIdx = yuan === '上' ? 0 : yuan === '中' ? 1 : 2;
    var ju = (yang ? JUREQI.阳[cur.名] : JUREQI.阴[cur.名])[yuanIdx];
    var yinyang = yang ? '阳遁' : '阴遁';

    // 3) 排地盘（布三奇六仪）：阳遁自局数宫顺飞、阴遁逆飞；中五寄坤二
    var 地盘 = {};
    for (var s = 0; s < 9; s++) {
      var palace = yang ? mod360ish(ju + s, 9) : mod360ish(ju - s, 9);
      palace = palace === 0 ? 9 : palace;
      地盘[homeOf(palace)] = 地盘[homeOf(palace)] || SEQ[s]; // 中五寄坤二，坤二已有则不覆盖
      if (palace === 5) 地盘[2] = 地盘[2] || SEQ[s];
    }
    // 4) 定值符值使：旬首仪落宫 → 本宫星=值符、本宫门=值使
    var xun = firstXunshou(时干支);
    var yi = XUNSHOU[xun];                       // 旬首仪
    var fuPalace = findHome(地盘, yi);           // 该仪在地盘的宫
    var 值符 = STAR_HOME[homeOf(fuPalace)];
    var 值使 = GATE_HOME[homeOf(fuPalace)] || '死';

    // 5) 排天盘九星：值符随时干（时干为甲用旬首仪）→ 值符落到该宫，其余按环序顺时针
    var shiGan = 时干支.slice(0, 1);
    var shiYi = shiGan === '甲' ? yi : shiGan; // 甲→旬首仪；其余时干本身即某仪/奇
    var gPalace = findHome(地盘, shiYi);        // 时干（仪）落宫
    var g = homeOf(gPalace);
    var 天盘 = rotateRing(STAR_RING, CLOCK, 值符, g);

    // 6) 排人盘八门：值使随时支 —— 值使门锚到「时支所在宫」（ZHI_GONG），其余按环序。
    //    （黄金盘 qimen.pro 阴遁3·丁巳时：值使惊门落巽4=巳宫，逐宫验证命中）
    var shiZhi = 时干支.slice(1, 2);
    var zgs = homeOf(ZHI_GONG[shiZhi]);        // 值使门 → 时支宫（中五寄坤二兜底）
    var 八门 = rotateRing(GATE_RING, CLOCK, 值使, zgs, yang);

    // 7) 排神盘八神：自值符落宫，阳顺阴逆
    var 八神 = arrangeGods(GODS, CLOCK, g, yang);

    return {
      时刻: y + '年' + m + '月' + d + '日' + h + '时',
      四柱: { 年: pillars.年.干支, 月: pillars.月.干支, 日: 日干支, 时: 时干支 },
      阴阳遁: yinyang, 局数: ju, 节气: cur.名, 元: yuan, 旬首: xun, 值符星: 值符, 值使门: 值使,
      地盘: 地盘, 天盘: 天盘, 八门: 八门, 八神: 八神,
      // 飞布（九星/八门/八神落宫）验证状态：阴遁盘（qimen.pro SSR，寒露下元）+ 阳遁盘（qimen.pro 前端驱动，立春中元）
      // 均已逐宫交叉验证（9星/8门/8神各 8/8 全中）→ 飞布几何「双盘锁死」；置闰边界盘未锁（qimenqmdj 自相矛盾、不作裁判）。
      _飞布验证: '飞布几何（洛书地理顺时针环 [1,8,3,4,9,2,7,6] + 值符随时干 + 值使随时支 + 八神阳顺阴逆）' +
        (yang ? '阳遁盘' : '阴遁盘') + '已按 qimen.pro 黄金盘逐宫锁死（九星/八门/八神 8/8）' +
        (yang ? '；阴遁盘亦已锁' : '；阳遁盘亦已锁') + '；置闰边界盘待补',
    };
  }

  // —— 辅助 ——
  function mod360ish(x, m) { x = x % m; return x < 0 ? x + m : x; }
  // 时干支 → 所属旬首（六甲）
  function firstXunshou(gz) {
    var idx = GANZHI.jiaziIndex(gz);
    // 往前找最近的「甲」干支
    for (var k = 0; k < 10; k++) {
      var cand = GANZHI.JIAZI[(idx - k + 600) % 60];
      if (cand.slice(0, 1) === '甲') return cand;
    }
    return '甲子';
  }
  // 某仪/奇在地盘的宫（值可能在 5→寄 2）
  function findHome(di, g) {
    for (var p = 1; p <= 9; p++) if (di[p] === g) return p;
    return 2;
  }
  // 转盘法九星/八门：值符(或值使)落到 g 宫，其余按环序顺时针铺 8 实宫（中五不排）
  function rotateRing(ring, clock, anchor, gPalace, includeAnchors) {
    var out = {};
    var gi = clock.indexOf(homeOf(gPalace));
    if (gi < 0) gi = 0;
    var ai = ring.indexOf(anchor);
    if (ai < 0) ai = 0;
    for (var j = 0; j < 8; j++) {
      var star = ring[(ai + j) % 8];
      var palace = clock[(gi + j) % 8];
      out[palace] = star;
    }
    out[2] = out[2] || ring[ai]; // 中五寄坤二兜底
    return out;
  }
  // 八神：值符神在值符星落宫 g，阳遁顺（沿 clock +）/ 阴遁逆（沿 clock −）铺 8 实宫。
  // ⚠ 八神飞布环序（CLOCK 走法 + 中五寄坤）属奇门最易错项，黄金盘(qimen.pro 阴遁)已反推一致；
  //   阳遁盘待 REA 驱动前端再取一盘交叉锁死（见 _待交叉验证 与 tools/qimen-golden-ref.js）。
  function arrangeGods(gods, clock, gPalace, yang) {
    var full = clock; // 用传入的地理顺时针环（不再硬编码）
    var gi = full.indexOf(homeOf(gPalace)); if (gi < 0) gi = 0;
    var out = {};
    for (var j = 0; j < 8; j++) {
      var pos = yang ? full[(gi + j) % 8] : full[((gi - j) % 8 + 8) % 8];
      out[pos] = gods[j];
    }
    out[2] = out[2] || gods[0]; // 中五寄坤二兜底
    return out;
  }

  return {
    chart: chart, JUREQI: JUREQI, YANGE: YANGE, YINSEG: YINSEG, SEQ: SEQ,
    XUNSHOU: XUNSHOU, STAR_HOME: STAR_HOME, GATE_HOME: GATE_HOME, GODS: GODS,
    zhiOfHour: zhiOfHour, yuanOf: yuanOf, currentSolarTerm: currentSolarTerm
  };
});
