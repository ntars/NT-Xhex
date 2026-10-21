/**
 * modules/CoreModule/qimen-ri.js —— 奇门遁甲·日家内核 C26【单一真源 · 适配层 · 日家转盘法】
 *
 * 算什么：某一天（不需时辰）的日家奇门局 —— 日柱 / 阴阳遁 / 元 / 局数 / 地盘布仪 /
 *        值符星值使门 / 天盘九星 / 人盘八门 / 神盘八神 / 天盘干。
 *
 * 为什么单独一套：日家与**时家**不是同一盘。时家以「时辰」起局（值符随时干、值使随时支），
 *   日家以「日」起局（**值符随日干、值使按日干在旬中的位次**），且定局不是查节气三元表，
 *   而是「六十日一局、一百八十日走完三元」。拿时家属局当日家局用是错盘，故必须另立内核。
 *
 * ===== 算法来源（零臆造；逐条标注出处，关键项 ≥3 源）=====
 *
 * 【一、定局：60 日一局，180 日三元】（5 源一致）
 *   · 阴阳遁：冬至(起)~夏至(前) 用阳遁；夏至(起)~冬至(前) 用阴遁。
 *   · 阳遁三元局数 = **1、7、4**；阴遁三元局数 = **9、3、6**。
 *   · 出自：
 *     ① 《奇門寶鑑》【二】「又法日奇門起例」原文：
 *        「冬至第一甲子六十日,用陽遁一局。第二甲子六十日,用陽遁七局。第三甲子六十日,用陽遁四局。
 *          夏至第一甲子六十日,用陰遁九局。第二甲子六十日,用陰遁三局。第三甲子六十日,用陰遁六局。」
 *     ② 《奇門法竅》【卷二】「論日奇法」：「陽遁用一七四三局,陰遁用九三六三局,一歲三百六十日,
 *        十五日一氣,一元統四氣,三元共十二氣」。
 *     ③ 易德轩 qimen.yi958.com「年、月、日家奇门演局方法简介」：
 *        「以最接近冬至的甲子日到夏至前用陽遁起局，分上中下三元，即按一、七、四的排局順序起局；
 *          以最接近夏至甲子日到冬至前用九、三、六的陰局，六十日為一局，180天用上中下三局按順序排列」。
 *     ④ 易象乾坤 yixiangqiankun.com「第11章 年、月、日家奇门」：同上，逐字相同。
 *     ⑤ 佟氏 «宫廷派» 转述（kknews）：「日家奇门以六十天为一元」。
 *
 *   ⚠ **元的起算有两派，本内核**并列输出**、不替你选（流派分歧，非谁对谁错）**：
 *     派A「甲子日数元」（本内核主口径）：以**二至之前最近的那个甲子日**为起算点，此后每 60 日进一元。
 *        可复现、日期连续，故取为主口径；输出里同时给出「起算甲子日」与「距起算日天数」，可自行核对。
 *        异文：另有按「二至**前后最接近**的甲子日」起算者，当甲子日距二至仅 1–2 日时，边界日会差一元。
 *     派B「节气分元」：按节气分段，一元统四气（《奇門法竅》原文即此说）——
 *        阳遁：冬至~立春=上元(1局) / 雨水~清明=中元(7局) / 谷雨~芒种=下元(4局)；
 *        阴遁：夏至~立秋=上元(9局) / 处暑~寒露=中元(3局) / 霜降~大雪=下元(6局)。
 *        （悟行阁、佟氏「第一种方法」同此，分界写作「冬至到雨水」= 以雨水分界之意，与「一元统四气」一致。）
 *
 * 【二、地盘布仪】（与时家完全相同）
 *   三奇六仪序 戊己庚辛壬癸丁丙乙；阳遁自局数宫**顺**飞、阴遁**逆**飞；九宫独立布仪（含中五），
 *   「中五寄坤二」只用于落宫取值，不占位。
 *
 * 【三、值符值使】日干支的旬首 → 旬首仪在地盘所落宫 → **该宫本位星 = 值符、本位门 = 值使**。
 *   例（易德轩 2004-08-06 例）：丁巳日属甲寅旬，甲寅癸，癸在地盘巽四宫 → 巽四本位星天辅=值符、
 *   本位门杜门=值使。
 *
 * 【四、天盘九星】**值符星落到「日干」在地盘所落之宫**（日干为甲时用其旬首仪），
 *   其余八星沿转盘顺时针环序（蓬·任·冲·辅·英·芮·柱·心）铺开；天禽随天芮同宫。
 *   天盘干 = 该星「本宫」的地盘干（天禽带中五之干，故天芮所落宫常有两干）。
 *   ✅ 实证：易德轩例 丁巳日 → 日干丁在地盘震三宫，天辅落震三；推算全盘
 *      「震三癸 / 巽四戊 / 离九壬丙 / 坤二庚 / 兑七辛 / 乾六乙 / 坎一己 / 艮八丁」→ **8/8 逐宫全中**。
 *
 * 【五、人盘八门】值使门落宫 = 从值使「本宫」起，按**九宫数序（1→2→…→9 循环，中五占位）**、
 *   **阳遁顺数 / 阴遁逆数**，走「**日干在旬中的位次 − 1**」步；落在中五则寄坤二（八门不入中五）。
 *   其余七门自该宫起，沿转盘顺时针环序（休·生·伤·杜·景·死·惊·开）铺开。
 *   📌 注意：古书常简写作「值使随日支」，**实为按日干位次数宫**，非按日支固定宫 ——
 *      《奇門法竅》原文即作「从旬首逆数至**本日的天干**」（不是地支）。
 *   三例逐条验算（全部命中）：
 *     ① 易德轩例 丁巳日·阴遁九局：值使杜门本宫巽4，丁第4位 → 4−3=1 坎一 →「杜门落坎一」✓
 *        八门铺开 坎1杜/离9开/乾6伤/兑7生/坤2休/巽4惊/震3死/艮8景 → **8/8 全中**。
 *     ② 《奇門法竅》庚子日·阳遁一局：值使杜门本宫巽4，庚第7位 → 4+6=10→1 坎一 →「杜门加坎」✓
 *     ③ 《奇門法竅》丁卯日·阴遁九局：值使景门本宫离9，丁第4位 → 9−3=6 乾六 →「景门加乾」✓
 *
 * 【六、神盘八神】小值符（八神之首）随大值符（九星值符）所落之宫，阳遁顺、阴遁逆铺八宫。
 *   ✅ 实证：易德轩例 阴遁 → 值符震3、螣蛇艮8、太阴坎1、六合乾6、白虎兑7、玄武坤2、九地离9、九天巽4
 *      → **8/8 全中**。
 *
 * ===== 缺口 / 未锁（如实标注，不假报）=====
 *   · 八门「值使落宫」的**数宫方式**：本内核按九宫数序（含中五占位）。另有一派按八宫环序数，
 *     当步数跨中五时两者差一宫；本内核采数序派，因三例古籍算例（含跨中五的庚子日例）全部命中数序。
 *   · **飞盘派**日家（《奇門法竅》第一例的八门排布为「九宫数序顺飞」而非转盘环序）本内核不实现，
 *     其八门连排方式与转盘不同（例：杜1开2惊3生4景6休7死8伤9）；需要时请用 qimen-fei.js 的飞盘口径另推。
 *   · 《奇門寶鑑》「附日奇門起例」另有**第三种日奇门**（不按元，纯以日支定局：子午=2局、丑未=6局、
 *     寅申=1局、卯酉=8局、辰戌=4局、巳亥=9局；九星一日移一位、八门三日移一宫）——
 *     **v3.1.58 已由 bjJian() 实现**（原文 4 源独立转录逐字一致；九星「顺飞九宫」含中五占位、
 *     八门「不入中五」，两环之别由原文两例算例锁死，见 bjJian 头注考证）。与本 chart() 并列不合并。
 *   · 日家专用神煞与断辞未纳入。
 *
 * 加载：UMD —— require（注入 lunar + ganzhi + qimen）；浏览器挂 NT.core.qimenRi。
 * 校验：modules/CoreModule/__tests__/qimenri.test.js
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./lunar.js'), require('./ganzhi.js'), require('./qimen.js'));
  } else {
    root.NT = root.NT || {}; root.NT.core = root.NT.core || {};
    root.NT.core.qimenRi = factory(root.NT.core && root.NT.core.lunar,
      root.NT.core && root.NT.core.ganzhi, root.NT.core && root.NT.core.qimen);
  }
})(typeof self !== 'undefined' ? self : this, function (LUNAR, GANZHI, QM) {

  var GAN = '甲乙丙丁戊己庚辛壬癸';
  var ZHI = '子丑寅卯辰巳午未申酉戌亥';

  // 三元局数（阳 1/7/4、阴 9/3/6）：改口径只改这里。
  var JU3 = { 阳: [1, 7, 4], 阴: [9, 3, 6] };
  // 节气分元（派B）：一元统四气。节气名 → 元序（0上 1中 2下）。
  var QI_YUAN = {
    阳: { 冬至: 0, 小寒: 0, 大寒: 0, 立春: 0, 雨水: 1, 惊蛰: 1, 春分: 1, 清明: 1,
          谷雨: 2, 立夏: 2, 小满: 2, 芒种: 2 },
    阴: { 夏至: 0, 小暑: 0, 大暑: 0, 立秋: 0, 处暑: 1, 白露: 1, 秋分: 1, 寒露: 1,
          霜降: 2, 立冬: 2, 小雪: 2, 大雪: 2 }
  };
  var YUAN_NAME = ['上元', '中元', '下元'];

  // —— 日期工具：一律用「UTC 日序号」算天数差，避开夏令时/时区 ——
  function dayNo(y, m, d) { return Math.floor(Date.UTC(y, m - 1, d) / 86400000); }
  function fromDayNo(n) {
    var dt = new Date(n * 86400000);
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
  }
  // 取某年某节气的「日期」（GANZHI.yearJieqi 给 'YYYY-MM-DD HH:MM:SS'）
  // ⚠ yearJieqi(Y) 的表是「从 Y-1 年冬至排到 Y 年大雪」的干支年式表 ——
  //   里面 key='冬至' 指向的是**上一年**的冬至。故不能直接取，必须跨 Y-1/Y/Y+1 三表合并后按真实日期挑。
  function termDate(Y, name) {
    if (!GANZHI || !GANZHI.yearJieqi) return null;
    var t = GANZHI.yearJieqi(Y)[name];
    if (!t) return null;
    return { y: +String(t).slice(0, 4), m: +String(t).slice(5, 7), d: +String(t).slice(8, 10), 时刻: t };
  }
  function termsNear(y, name) {
    var out = [], seen = {};
    [y - 1, y, y + 1].forEach(function (Y) {
      var td = termDate(Y, name);
      if (!td) return;
      var k = td.y + '-' + td.m + '-' + td.d;
      if (seen[k]) return;
      seen[k] = 1;
      td.n = dayNo(td.y, td.m, td.d);
      out.push(td);
    });
    out.sort(function (a, b) { return a.n - b.n; });
    return out;
  }
  // 目标日之前（含当日）最近的一个同名节气
  function latestTermBefore(y, m, d, name) {
    var list = termsNear(y, name), tgt = dayNo(y, m, d), best = null;
    for (var i = 0; i < list.length; i++) if (list[i].n <= tgt) best = list[i];
    return best;
  }

  /**
   * 判断目标日落在「阳遁段」还是「阴遁段」，并给出该段起点（冬至 / 夏至）。
   * 判法：二至里**最近过去的那一个**是夏至 → 阴遁段；是冬至 → 阳遁段。
   * 交节当日归新段（日家以「日」为单位，不细分到刻）。
   */
  function segmentOf(y, m, d) {
    var xz = latestTermBefore(y, m, d, '夏至');
    var dz = latestTermBefore(y, m, d, '冬至');
    if (!xz || !dz) return null;
    // 夏至更近（在冬至之后到来）→ 落在 [夏至, 冬至) → 阴遁
    if (xz.n > dz.n) return { 阴阳: '阴', 起点: xz, 起点名: '夏至' };
    return { 阴阳: '阳', 起点: dz, 起点名: '冬至' };
  }

  /**
   * 派A 甲子日数元：取「段起点之前（含当日）最近的甲子日」为起算点，数天数 → 元。
   * @returns { 元序, 起算甲子日, 距起算天数, 局数 }
   */
  function yuanByJiazi(y, m, d, seg) {
    var s = seg.起点;
    var gz = LUNAR.fromSolar(s.y, s.m, s.d, 0).ganzhi.日.干支;
    var idx = GANZHI.jiaziIndex(gz);            // 甲子 = 0
    var startDay = dayNo(s.y, s.m, s.d) - idx;  // 段起点往回退 idx 天 = 最近的甲子日
    var jz = fromDayNo(startDay);
    var diff = dayNo(y, m, d) - startDay;       // ≥ 0
    var yuan = Math.floor(diff / 60) % 3;
    return {
      元序: yuan, 元: YUAN_NAME[yuan],
      起算甲子日: jz.y + '-' + p2(jz.m) + '-' + p2(jz.d),
      距起算天数: diff,
      局数: JU3[seg.阴阳][yuan]
    };
  }

  /** 派B 节气分元：按当前节气落在「一元统四气」的哪一元。 */
  function yuanByQi(y, m, d, seg) {
    var cur = QM && QM.currentSolarTerm ? QM.currentSolarTerm(y, m, d, 0) : null;
    var name = cur && cur.名;
    if (!name) return null;
    var tbl = QI_YUAN[seg.阴阳];
    if (!(name in tbl)) {
      // 跨段边界（如阴遁段里出现「冬至」）：按节气所属段回推一个安全值
      return null;
    }
    var yuan = tbl[name];
    return { 元序: yuan, 元: YUAN_NAME[yuan], 节气: name, 局数: JU3[seg.阴阳][yuan] };
  }

  function p2(n) { return (n < 10 ? '0' : '') + n; }

  // 八门名 → 本宫号（自 QM.GATE_HOME 反查，不另抄一份表）
  function gateHome(name) {
    var h = QM.GATE_HOME;
    for (var k in h) if (h[k] === name) return +k;
    return 0;
  }

  /**
   * 值使门落宫（日家专用）：自值使本宫起，按九宫数序（1→…→9 循环，**中五占位**）数宫，
   * 阳遁顺数 / 阴遁逆数，走「日干在旬中的位次 − 1」步；落中五则寄坤二（八门不入中五）。
   * 三例古籍验算：丁巳日阴遁（杜本宫4、丁第4位）→ 坎1；庚子日阳遁（杜4、庚第7位）→ 坎1；
   *               丁卯日阴遁（景本宫9、丁第4位）→ 乾6。全部命中。
   */
  function zhiShiPalace(gateName, ganXu, yang) {
    var home = gateHome(gateName) || 1;
    var step = ganXu - 1;
    var p = yang ? QM.mod360ish(home - 1 + step, 9) + 1 : QM.mod360ish(home - 1 - step, 9) + 1;
    return p === 5 ? 2 : p;
  }

  /**
   * 日家奇门局。
   * @param {Object} inp { y, m, d, 口径? '节气'|'甲子'（默认甲子=派A） }
   */
  function chart(inp) {
    inp = inp || {};
    if (!LUNAR || !GANZHI || !QM) return { err: '日家奇门需 lunar + ganzhi + qimen 内核' };
    var y = inp.y, m = inp.m, d = inp.d;
    if (!y || !m || !d) return { err: '日家奇门需用事日期，例如「2026年2月9日」（日家以日为单位，不需时辰）。' };

    var G = LUNAR.fromSolar(y, m, d, 0).ganzhi;
    var 日干支 = G.日.干支, 日干 = 日干支.slice(0, 1), 日支 = 日干支.slice(1, 2);

    // 1) 阴阳遁段 + 两派定元
    var seg = segmentOf(y, m, d);
    if (!seg) return { err: '未定位二至（请给 1901–2100 内日期）' };
    var yang = seg.阴阳 === '阳';
    var A = yuanByJiazi(y, m, d, seg);
    var B = yuanByQi(y, m, d, seg);
    var useQi = String(inp.口径 || '') === '节气' && B;
    var ju = useQi ? B.局数 : A.局数;
    var yuan = useQi ? B.元 : A.元;

    // 2) 地盘：三奇六仪 戊己庚辛壬癸丁丙乙，阳顺阴逆，九宫独立布仪（含中五）
    var 地盘 = {};
    for (var s = 0; s < 9; s++) {
      var pal = yang ? QM.mod360ish(ju + s, 9) : QM.mod360ish(ju - s, 9);
      地盘[pal === 0 ? 9 : pal] = QM.SEQ[s];
    }

    // 3) 旬首 → 值符星 / 值使门（旬首仪在地盘宫的本位星、本位门）
    var xun = QM.firstXunshou(日干支);
    var yi = QM.XUNSHOU[xun];
    var xunPal = QM.findHome(地盘, yi);
    var xunHome = QM.homeOf(xunPal);            // 中五寄坤二
    var 值符星 = QM.STAR_HOME[xunHome];
    var 值使门 = QM.GATE_HOME[xunHome] || '死';

    // 4) 天盘九星：值符落「日干」在地盘之宫（日干为甲用旬首仪）
    var 日干仪 = 日干 === '甲' ? yi : 日干;
    var 日干宫 = QM.findHome(地盘, 日干仪);
    var 天盘 = QM.rotateRing(QM.STAR_RING, QM.CLOCK, 值符星, 日干宫);

    // 5) 人盘八门：值使本宫 + (日干旬内位次 − 1)，阳顺阴逆，九宫数序（含中五占位）→ 落中五寄坤二
    var 干序 = GAN.indexOf(日干) + 1;            // 甲=1 … 癸=10
    var 使本宫 = gateHome(值使门) || 1;
    var 使落宫 = zhiShiPalace(值使门, 干序, yang);
    var 八门 = QM.rotateRing(QM.GATE_RING, QM.CLOCK, 值使门, 使落宫);

    // 6) 神盘八神：小值符随大值符宫，阳顺阴逆
    var 八神 = QM.arrangeGods(QM.GODS, QM.CLOCK, 日干宫, yang);

    // 7) 天盘干：星带其「本宫」地盘干；天禽（本宫5）随天芮同宫 → 该宫两干
    var STAR2HOME = {};
    for (var hp in QM.STAR_HOME) STAR2HOME[QM.STAR_HOME[hp]] = +hp;
    var 天盘干 = {}, 禽宫 = 0;
    for (var p in 天盘) {
      var st = 天盘[p];
      var home = STAR2HOME[st] || 2;
      天盘干[p] = 地盘[QM.homeOf(home)];
      if (st === '天芮') 禽宫 = +p;
    }
    var 禽干 = 禽宫 ? 地盘[5] : null;

    return {
      日期: y + '年' + m + '月' + d + '日',
      日柱: 日干支, 四柱: { 年: G.年.干支, 月: G.月.干支, 日: 日干支 },
      阴阳遁: yang ? '阳遁' : '阴遁', 段起点: seg.起点名 + '（' + seg.起点.y + '-' + p2(seg.起点.m) + '-' + p2(seg.起点.d) + '）',
      元: yuan, 局数: ju, 定局口径: useQi ? '节气分元' : '甲子日数元',
      甲子派: A, 节气派: B,
      旬首: xun, 旬首仪: yi, 旬首宫: xunPal, 值符星: 值符星, 值使门: 值使门,
      日干: 日干, 日支: 日支, 日干宫: 日干宫, 日干位次: 干序,
      值使本宫: 使本宫, 值使落宫: 使落宫,
      地盘: 地盘, 天盘: 天盘, 八门: 八门, 八神: 八神,
      天盘干: 天盘干, 禽宫: 禽宫, 禽干: 禽干,
      缺口: [
        '八门「值使落宫」按九宫数序数宫（含中五占位），另有按八宫环序数者，跨中五时差一宫。',
        '飞盘派日家的八门为「九宫数序连排」，与转盘环序不同，本内核不实现（用 qimen-fei.js 的飞盘口径另推）。',
        '《奇門寶鑑》第三种日奇门（按日支定局：子午2、丑未6、寅申1、卯酉8、辰戌4、巳亥9）v3.1.58 已由 bjJian() 实现（九星顺飞九宫含中五、八门三日一宫不入中五，原文 4 源一致），与本 chart() 六十日一局是两套系统，并列不合并。',
        '日家专用神煞与断辞未纳入。'
      ]
    };
  }

  /**
   * 《奇門寶鑑》日支定局法（v3.1.58 补，原缺口「第三种日奇门」收口）。
   *
   * 来源（4 源独立转录逐字一致，关键项 5 源档）：
   *   ① ctext《奇門遁甲統宗》卷二「附日奇門起例」
   *   ② 玄霖易学《附日奇门起例》 ③ 古书网《奇門遁甲統宗》 ④ 中华易经天书三式协会《奇門寶鑑》【二】
   * 原文要点（逐字）：
   *   · 定局：「冬至後用陽遁，夏至後用陰遁，子午日用二局。冬至後，子午日用陽遁二局。
   *     夏至後，子午日用陰遁二局，餘倣此。丑未日用六局，寅申日用一局，卯酉日用八局，
   *     辰戌日用四局，巳亥日用九局。」
   *   · 起九星：「其起九星八門之法，不必復分陰遁陽遁。凡甲子日，天蓬起艮八，天芮在離九，
   *     順飛九宮。乙丑日，天蓬起離九，天芮在坎一，一日順移一位。」
   *   · 起八門：「甲子日休門起坎一，三日順轉一宮，不入中五。如甲子乙丑丙寅三日，休門起坎一。
   *     丁卯戊辰己巳三日，休門起坤二。庚午辛未壬申三日，休門起震三。癸酉甲戌乙亥三日，
   *     休門起巽四。丙子丁丑戊寅三日，休門起乾六，餘倣此。」
   *
   * ⚠ 环序考证（原文两例锁死，非想当然）：
   *   · 九星「顺飞九宫」= 洛书**九宫数序（含中五占位）**：坎1→坤2→震3→巽4→中5→乾6→兑7→艮8→离9。
   *     甲子日天蓬艮8→天芮离9 ✓；乙丑日天蓬离9→天芮坎1 ✓（两例只在含中五的数序下成立；
   *     若走时家 CLOCK 八实宫环「坎→艮→震→巽→离→坤→兑→乾」，乙丑日天芮应落坤二，与原文不合）。
   *   · 八门「不入中五」= 洛书数序**跳过中五**：1→2→3→4→6→7→8→9→1。
   *     原文五组验算全中：甲子-丙寅休门坎1 / 丁卯-己巳坤2 / 庚午-壬申震3 / 癸酉-乙亥巽4 / 丙子-戊寅乾6。
   *   · 两处用词有意不同（星「顺飞九宫」对门「不入中五」），故分用两环，不混。
   *
   * 原文未给（不臆造，故不输出）：八神排法、天盘三奇六仪、值符值使（本式无旬首概念）。
   */
  var ZHI_JU = { 子: 2, 丑: 6, 寅: 1, 卯: 8, 辰: 4, 巳: 9, 午: 2, 未: 6, 申: 1, 酉: 8, 戌: 4, 亥: 9 };
  var LUO9 = [1, 2, 3, 4, 5, 6, 7, 8, 9];      // 洛书九宫数序（含中五）——九星环
  var LUO8 = [1, 2, 3, 4, 6, 7, 8, 9];         // 洛书数序跳过中五——八门环
  var STAR9 = ['天蓬', '天芮', '天冲', '天辅', '天禽', '天心', '天柱', '天任', '天英'];

  // 目标日往前找最近的甲子日（含当日），返回 { 甲子日: Date, 日差 }
  function jiaziAnchor(y, m, d) {
    var cur = new Date(Date.UTC(y, m - 1, d));
    for (var i = 0; i < 60; i++) {
      var dt = new Date(cur.getTime() - i * 86400000);
      var g = LUNAR.fromSolar(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), 0).ganzhi;
      if (g.日.干支 === '甲子') return { 甲子日: dt, 日差: i };
    }
    return null;
  }

  function bjJian(inp) {
    inp = inp || {};
    if (!LUNAR || !GANZHI || !QM) return { err: '宝鉴日奇门需 lunar + ganzhi + qimen 内核' };
    var y = inp.y, m = inp.m, d = inp.d;
    if (!y || !m || !d) return { err: '宝鉴日奇门需用事日期，例如「2026年2月9日」。' };

    var G = LUNAR.fromSolar(y, m, d, 0).ganzhi;
    var 日干支 = G.日.干支, 日干 = 日干支.slice(0, 1), 日支 = 日干支.slice(1, 2);
    var seg = segmentOf(y, m, d);
    if (!seg) return { err: '未定位二至（请给 1901–2100 内日期）' };
    var yang = seg.阴阳 === '阳';

    // 1) 局数 = 日支定局表（阴阳遁只改顺逆，不改局数——原文「子午日用二局」不分遁式）
    var ju = ZHI_JU[日支] || 0;
    if (!ju) return { err: '日支不在定局表：' + 日支 };

    // 2) 地盘：三奇六仪戊己庚辛壬癸丁丙乙，阳顺阴逆，九宫独立布仪（含中五）——与时家同法
    var 地盘 = {};
    for (var s = 0; s < 9; s++) {
      var pal = yang ? QM.mod360ish(ju + s, 9) : QM.mod360ish(ju - s, 9);
      地盘[pal === 0 ? 9 : pal] = QM.SEQ[s];
    }

    // 3) 甲子日锚 + 日差 → 九星每日顺移一位（含中五数序），八门每三日顺转一宫（不入中五）
    var anchor = jiaziAnchor(y, m, d);
    if (!anchor) return { err: '甲子日锚定失败（60 日内无甲子日）' };
    var N = anchor.日差;

    var 九星 = {};
    var base9 = LUO9.indexOf(8);                 // 艮八 = 甲子日天蓬位
    for (var i = 0; i < 9; i++) {
      九星[LUO9[(base9 + N + i) % 9]] = STAR9[i];
    }

    var 八门 = {};
    var base8 = LUO8.indexOf(1);                 // 坎一 = 甲子日休门位
    var 休门位 = LUO8[(base8 + Math.floor(N / 3)) % 8];
    for (var gi = 0; gi < 8; gi++) {
      var gpos = LUO8[(LUO8.indexOf(休门位) + gi) % 8];
      八门[gpos] = QM.GATE_RING[gi];            // 休→生→伤→杜→景→死→惊→开
    }

    return {
      名: '日支定局法（奇門寶鑑·附日奇门起例）',
      日期: y + '年' + m + '月' + d + '日',
      日柱: 日干支, 四柱: { 年: G.年.干支, 月: G.月.干支, 日: 日干支 },
      阴阳遁: yang ? '阳遁' : '阴遁',
      节气界: seg.起点名 + '后（' + seg.起点.y + '-' + p2(seg.起点.m) + '-' + p2(seg.起点.d) + ' 起）',
      局数: ju, 定局依据: '日支' + 日支 + ' → ' + ju + ' 局',
      甲子锚日: anchor.甲子日.getUTCFullYear() + '-' + p2(anchor.甲子日.getUTCMonth() + 1) + '-' + p2(anchor.甲子日.getUTCDate()),
      日差: N,
      地盘: 地盘, 九星: 九星, 八门: 八门,
      缺口: [
        '原文只给定局、九星、八门三事；八神排法、天盘三奇六仪、值符值使（本式无旬首概念）原文未给，故不输出——不臆造。',
        '九星走洛书九宫数序「顺飞九宫」（含中五占位）：原文「天蓬起艮八、芮在离九」「乙丑日天蓬起离九、天芮在坎一」两例只在含中五数序下成立；八门明写「不入中五」，两环分用（考证见文件头注释）。',
        '本式与 chart() 转盘日家（六十日一局）是两套系统，输出并列不合并，混排即错盘。',
        '原文按语自存疑「门三日过一宫…皆不可解，姑存之」（古人原话照录，不作强解）。',
        '日家专用神煞与断辞未纳入。'
      ]
    };
  }

  return {
    chart: chart, bjJian: bjJian, JU3: JU3, QI_YUAN: QI_YUAN, YUAN_NAME: YUAN_NAME,
    segmentOf: segmentOf, yuanByJiazi: yuanByJiazi, yuanByQi: yuanByQi,
    gateHome: gateHome, zhiShiPalace: zhiShiPalace,
    ZHI_JU: ZHI_JU, LUO9: LUO9, LUO8: LUO8, STAR9: STAR9
  };
});
