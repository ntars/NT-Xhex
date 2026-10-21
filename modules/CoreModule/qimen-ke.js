/**
 * modules/CoreModule/qimen-ke.js —— 奇门遁甲·刻家内核 C27【单一真源 · 适配层 · 时家局内推】
 *
 * 算什么：某一刻（12 分钟为一刻）的刻家奇门局 —— 刻柱 / 属第几刻 / 刻局数 / 地盘布仪 /
 *        值符星值使门 / 天盘九星 / 人盘八门 / 神盘八神 / 天盘干，外加「本时辰十刻一览」。
 *
 * 为什么另立：刻家不是时家，也不是日家。它以「时辰之内的十二分钟」为单元，**只在时家局内推**：
 *   初刻即本时辰的时家局，此后每进一刻戊宫移一位（阳遁 +1、阴遁 −1）。所以必须先有时家局，
 *   再谈刻家局 —— 初刻恒等于时家盘，这是可自检的锚。
 *
 * ===== 算法来源（守零臆造；**本门源薄，如实标注**）=====
 *   主张来源（实质只有 1 支，其余为镜像转载）：
 *     《奇门遁甲预测学试行教材》第四章「刻家奇门」第一节「刻家奇门的起局方法」——
 *     易德轩 qimen.yi958.com/Article_3409、qimenpai.com/blog/2407、zgyjwhg.com、d5168.com、
 *     lqdxcxe.cn 均为同一篇的转载/繁简改写，**不构成独立多源**。
 *   原文要点（逐句照录）：
 *     ①「刻家奇门则以十二分钟为一局，一小时为五局，两个小时共十局。」
 *     ②「其刻家奇门十局仅在时家奇门内定局，按时间干支再遁干支的方法，将刻干旬首加在所用刻干上，
 *        其值符随阴阳转移而转移，旬首的值使加在刻支的宫位上，小值符依然随大值符转动而转动。」
 *     ③「刻干以甲丙戊庚壬为阳干时，八门顺行；刻干以乙丁己辛癸为阴干时，八门逆行。」
 *     ④「初局以本时间宫位奇门格局为准，二局开始阳顺阴逆，阳局向前推移一宫，三局向前推移二宫…
 *        阴局则初局用本局宫，二局向后推一宫…」
 *     ⑤ 算例：「如阳初局甲子戊在坎一宫，二局甲子戊则在坤二宫，三局甲子戊则在震三宫，四局甲子戊则在巽四宫」
 *             「阴遁逆推，初局如在坎一宫，二局则在离九宫，三局甲子戊在艮八宫，四局甲子戊则在兑七宫」
 *     ⑥「定刻干的方法：以甲(1)乙(2)丙(3)丁(4)戊(5)己(6)庚(7)辛(8)壬(9)癸(10)配合地支使用。」
 *
 *   两处原文含糊，本内核这样落实（并在输出与缺口里标明依据）：
 *   · **刻柱怎么排** —— ⑥ 那句「以甲(1)…癸(10)配合地支使用」本身不可直接计算。
 *     本内核取「**时干起五子遁**」：把时辰天干套五鼠遁歌诀，得「子位刻」的天干，再顺排，
 *     第 n 刻 = 该干 + (n−1)、支取子丑寅…顺排第 n 位。依据与旁证：
 *       ① 原文 ② 说「按时间干支再遁干支」，即**时的下一级再遁一次**（时之于日，正如刻之于时）
 *       ② 独立来源（易德轩「刻家新奇门遁甲测彩排盘法」）明写：「丁亥时…第 1 刻是根据丁壬庚子起，
 *          即第 1 刻为庚子刻，第 2 刻就是辛丑刻，第 3 刻就是壬寅刻」——正是时干起五子遁。
 *       ③ 自洽校验：五子遁序列前 10 位的天干恰好是 甲~癸 **各一不重**，与 ⑥「甲(1)…癸(10)」
 *          的十干一一对应吻合（故十刻配十干、支取子~酉，缺戌亥）。
 *
 *   · **八门顺逆按刻干阴阳**（原文 ③）—— 单源、且原文未给任何算例，**本内核照录但标「待验」**。
 *     另有流派「八门恒顺（与时家转盘一致）」，本内核以参数 `八门恒顺` 提供，默认不采。
 *
 *   局数推移方向（④⑤）两派互证：本门「阴遁逆推」+ 另一支「白露中元阴 3 局，第 1 刻阴 3、第 2 刻阴 2、
 *   第 3 刻阴 1」——同为阴遁减一宫，**这一条是交叉印证过的**。
 *
 * ===== 一支并存的异说（**不实现，如实登记**）=====
 *   易德轩「刻家新奇门遁甲测彩排盘法」是另一套：
 *     · 刻长作 **10 分钟一刻、一时辰 12 刻**（非 12 分钟/10 刻）
 *     · 刻柱仍时干起五子遁（与本内核一致），但取满 12 位（子~亥）
 *     · 排盘用**飞盘九神**（符蛇阴六白常玄地天 阳遁配 1-9、阴遁配 9-1），非转盘八神
 *   两套的刻长与神盘都不同，混排即错盘，故不并入。
 *
 * ===== 缺口（如实标注，不假报已锁）=====
 *   · 本门实质单源，未见独立第二支同法；无任何完整刻盘算例可比对 → **飞布仅自洽、未外部锁死**。
 *     （v3.1.58 联网复核结论：可检索到的 5 处——罗维周易测试网《奇门遁甲预测学试行教材》第四章
 *     原站 + 奇门派 ×2 + 易德轩 ×2——**全部为该教材同源转载**（易德轩自注「部分内容来于网络」），
 *     仍无独立第二支；原文唯一断课例「2002-09-08 17:55 辛酉刻」只给断课思路、未给九星/八门/八神
 *     逐宫盘面，无法用于锁定。检索路径与失败原因如实记录，不假报已锁。）
 *   · 八门顺逆随刻干阴阳：单源无算例，待验（原文「刻干以甲丙戊庚壬为阳干时八门顺行、乙丁己辛癸为
 *     阴干时八门逆行」，本内核照录，另提供「八门恒顺」参数可改回与时家一致）。
 *   · 刻家专用神煞与断辞（原文第二节）未纳入。
 *
 * 加载：UMD —— require（注入 lunar + ganzhi + qimen）；浏览器挂 NT.core.qimenKe。
 * 校验：modules/CoreModule/__tests__/qimenke.test.js
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./lunar.js'), require('./ganzhi.js'), require('./qimen.js'));
  } else {
    root.NT = root.NT || {}; root.NT.core = root.NT.core || {};
    root.NT.core.qimenKe = factory(root.NT.core && root.NT.core.lunar,
      root.NT.core && root.NT.core.ganzhi, root.NT.core && root.NT.core.qimen);
  }
})(typeof self !== 'undefined' ? self : this, function (LUNAR, GANZHI, QM) {

  var GAN = '甲乙丙丁戊己庚辛壬癸';
  var ZHI = '子丑寅卯辰巳午未申酉戌亥';
  var YANG_GAN = '甲丙戊庚壬';                  // 五阳干 → 八门顺行
  // 五鼠遁（五子遁）歌诀：日/时干 → 子位之干。甲己还加甲、乙庚丙作初、丙辛从戊起、丁壬庚子居、戊癸壬子。
  var WUZI = { 甲: '甲', 己: '甲', 乙: '丙', 庚: '丙', 丙: '戊', 辛: '戊', 丁: '庚', 壬: '庚', 戊: '壬', 癸: '壬' };
  var KE_PER_HOUR = 10;      // 一时辰十刻
  var MIN_PER_KE = 12;       // 一刻十二分钟

  function w9(x) { x = x % 9; return x <= 0 ? x + 9 : x; } // 1..9 循环（0 → 9）

  /** 时支序号 0..11（23/0=子） */
  function zhiIdxOfHour(h) { return Math.floor((((h + 1) % 24) / 2)); }
  /** 该时辰的起点小时（子=23、丑=1、寅=3 … 亥=21） */
  function hourStart(h) { return (zhiIdxOfHour(h) * 2 + 23) % 24; }

  /**
   * 第 n 刻的刻柱（时干起五子遁顺排；n 自 1 起，支取子~酉共十位）。
   * 校验例：丁亥时 → 1 刻庚子、2 刻辛丑、3 刻壬寅（与易德轩「测彩排盘法」原文一致）。
   */
  function keGanZhi(shiGan, n) {
    var g0 = WUZI[shiGan];
    if (!g0 || n < 1 || n > KE_PER_HOUR) return null;
    var gi = (GAN.indexOf(g0) + (n - 1)) % 10;
    return GAN.charAt(gi) + ZHI.charAt(n - 1);
  }

  /** 由分钟定位第几刻（同一时辰内 0–119 分，每 12 分一刻） */
  function keIndexOf(minute) {
    var m = Math.max(0, Math.min(119, minute | 0));
    return Math.floor(m / MIN_PER_KE) + 1;  // 1..10
  }

  /**
   * 刻家奇门局。
   * @param {Object} inp { y, m, d, h, min?, 八门恒顺? }
   */
  function chart(inp) {
    inp = inp || {};
    if (!LUNAR || !GANZHI || !QM) return { err: '刻家奇门需 lunar + ganzhi + qimen 内核' };
    var y = inp.y, m = inp.m, d = inp.d, h = inp.h;
    if (!y || !m || !d || h == null) return { err: '刻家奇门需年月日与时刻，例如「2026年2月9日10时24分」（要精确到分才定得出第几刻）。' };

    // 1) 底盘 = 本时辰的时家局（**初刻的局数与地盘**恒等于它，这是可自检的锚）。
    //    ⚠ 注意分寸：初刻**并非整盘**等于时家盘 —— 初刻刻干 = 五子遁首刻干（庚→丙），
    //    多数时候 ≠ 时干，故天盘九星/八门/八神随「刻干」走，唯时干为甲时才整盘重合。
    //    inp.局数 可强制指定时家局数 —— 用于对齐外部范例的定元口径（破坏性仅限本次调用，同 qimen-fei 惯例）。
    var baseInp = { y: y, m: m, d: d, h: h };
    if (inp.局数 != null && inp.局数 !== '' && !isNaN(+inp.局数)) baseInp.局数 = +inp.局数;
    var base = QM.chart(baseInp);
    if (base.err) return { err: base.err };
    var yang = base.阴阳遁 === '阳遁';
    var 时干支 = base.四柱.时, 时干 = 时干支.slice(0, 1);

    // 2) 定位第几刻：按「该钟点距本时支起点多少分钟」折算，每 12 分一刻。
    //    不给分时按整点算（如「10时」= 巳时第 60 分 → 第 6 刻；要初刻请给时辰起点小时，如巳时给 9 时）。
    var start = hourStart(h);
    var intoHour = ((h - start + 24) % 24) * 60 + (inp.min != null ? (inp.min | 0) : 0);
    if (intoHour < 0 || intoHour > 119) intoHour = 0;      // 兜底，防越界
    var n = keIndexOf(intoHour);
    var 刻柱 = keGanZhi(时干, n);
    if (!刻柱) return { err: '刻柱推算失败（时干「' + 时干 + '」不在十干内）' };
    var 刻干 = 刻柱.slice(0, 1), 刻支 = 刻柱.slice(1, 2);

    // 3) 刻局数：初刻 = 时家局；此后阳遁 +1 宫、阴遁 −1 宫（原文「阳局向前推移一宫…阴遁逆推」）
    //    两派互证：另一支算例「白露中元阴3局 → 第1刻阴3、第2刻阴2、第3刻阴1」同此。
    var shift = n - 1;
    var ju = yang ? w9(base.局数 + shift) : w9(base.局数 - shift);

    // 4) 地盘（与时家同一份实现）
    var 地盘 = QM.diPan(ju, yang);

    // 5) 值符值使：刻柱旬首 → 旬首仪在地盘宫 → 本位星=值符、本位门=值使
    var xun = QM.firstXunshou(刻柱);
    var yi = QM.XUNSHOU[xun];
    var xunPal = QM.findHome(地盘, yi);
    var xunHome = QM.homeOf(xunPal);
    var 值符星 = QM.STAR_HOME[xunHome];
    var 值使门 = QM.GATE_HOME[xunHome] || '死';

    // 6) 天盘九星：值符落「刻干」在地盘之宫（刻干为甲用旬首仪），转盘顺时针
    var 刻干仪 = 刻干 === '甲' ? yi : 刻干;
    var 刻干宫 = QM.findHome(地盘, 刻干仪);
    var 天盘 = QM.rotateRing(QM.STAR_RING, QM.CLOCK, 值符星, 刻干宫);

    // 7) 人盘八门：值使落「刻支」宫；顺逆按**刻干阴阳**（原文③，单源待验）
    var 刻支宫 = QM.homeOf(QM.ZHI_GONG[刻支]);
    var 刻干阳 = YANG_GAN.indexOf(刻干) >= 0;
    var 门逆 = inp.八门恒顺 ? false : !刻干阳;
    var 八门 = QM.rotateRing(QM.GATE_RING, QM.CLOCK, 值使门, 刻支宫, null, 门逆);

    // 8) 神盘八神：小值符随大值符，阳顺阴逆（随遁，不随刻干）
    var 八神 = QM.arrangeGods(QM.GODS, QM.CLOCK, 刻干宫, yang);

    // 9) 天盘干：星带本宫地盘干；天禽随天芮同宫 → 该宫两干
    var S2H = {};
    for (var hp in QM.STAR_HOME) S2H[QM.STAR_HOME[hp]] = +hp;
    var 天盘干 = {}, 禽宫 = 0;
    for (var p in 天盘) {
      var st = 天盘[p];
      var home = S2H[st] || 2;
      天盘干[p] = 地盘[QM.homeOf(home)];
      if (st === '天芮') 禽宫 = +p;
    }

    // 10) 本时辰十刻一览
    var 一览 = [];
    for (var k = 1; k <= KE_PER_HOUR; k++) {
      var gz = keGanZhi(时干, k);
      var js = yang ? w9(base.局数 + (k - 1)) : w9(base.局数 - (k - 1));
      一览.push({ 刻: k, 刻柱: gz, 局数: js, 当前: k === n });
    }

    return {
      时刻: y + '年' + m + '月' + d + '日' + h + '时' + (inp.min != null ? (inp.min | 0) + '分' : ''),
      有分钟: inp.min != null,
      四柱: base.四柱,
      阴阳遁: base.阴阳遁,
      第几刻: n, 刻柱: 刻柱, 刻干: 刻干, 刻支: 刻支,
      时家局数: base.局数, 刻局数: ju, 移宫: shift,
      旬首: xun, 旬首仪: yi, 旬首宫: xunPal, 值符星: 值符星, 值使门: 值使门,
      刻干宫: 刻干宫, 刻支宫: 刻支宫, 刻干阳: 刻干阳, 八门逆行: 门逆,
      地盘: 地盘, 天盘: 天盘, 八门: 八门, 八神: 八神,
      天盘干: 天盘干, 禽宫: 禽宫, 禽干: 禽宫 ? 地盘[5] : null,
      十刻一览: 一览,
      缺口: [
        '刻家框架实质单源（《奇门遁甲预测学试行教材》第四章，其余为镜像转载），未见独立第二支同法，也无完整刻盘算例可分逐宫比对，故飞布仅自洽、未外部锁死。',
        '八门顺逆随刻干阴阳属单源且原文无算例，本内核照录但标待验，可用参数「八门恒顺」改回与时家一致的恒顺。',
        '另一支刻家作 10 分钟一刻、一时辰 12 刻，并用飞盘九神，本内核不并入（混排即错盘）。',
        '刻家专用神煞与断辞未纳入。'
      ]
    };
  }

  return {
    chart: chart, keGanZhi: keGanZhi, keIndexOf: keIndexOf,
    hourStart: hourStart, zhiIdxOfHour: zhiIdxOfHour,
    WUZI: WUZI, KE_PER_HOUR: KE_PER_HOUR, MIN_PER_KE: MIN_PER_KE
  };
});
