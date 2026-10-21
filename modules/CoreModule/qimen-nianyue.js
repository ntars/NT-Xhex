/**
 * modules/CoreModule/qimen-nianyue.js —— 奇门遁甲·年家 / 月家内核 C28【单一真源 · 适配层】
 *
 * 算什么：
 *   · 年家奇门 nianChart({y,m,d})：某年的年家局（年柱/三元/局数/旬首/值符值使/地盘/天盘九星/八门/八神）。
 *   · 月家奇门 yueChart({y,m,d})：某月的月家局（月柱/元/局数/旬首/值符值使/地盘/天盘九星/八门/八神）。
 *
 * 为什么合一：年家与月家**同一套骨架**（纪年/纪月三元 + 阴遁 1/4/7 局 + 值符随干、值使随支 + 八神一律逆排），
 *   仅「时间单位」与「定元依据」不同。合在一个内核里，公共排盘逻辑只写一遍。
 *
 * ===== 权威来源（**本门古籍清楚，比日家/刻家更有据**）=====
 *   《奇门遁甲統宗》卷二「附年奇門起例」「附月奇門起例」，**3 源逐字一致**：
 *     ① 维基文库 奇門遁甲統宗（zh.wikisource.org）②《中国哲学书电子化计划》ctext.org 奇門遁甲統宗卷之二
 *     ③ 福山堂 fushantang.com。三者原文完全相同。
 *
 *   【年奇門起例】原文逐句：
 *     「上元甲子六十年用陰遁一局，中元甲子六十年用陰遁四局，下元甲子六十年用陰遁七局。
 *       皆以其年旬首所值之門為值使，所值之星為值符，看其年支臨於地盤何宮，即以天盤值使加之；
 *       看其年干臨於地盤何宮，即以天盤值符加之。
 *       如上元甲子年用陰遁一局，甲子即為旬首，休門為值使，天蓬為值符。因甲子在坎，即以天盤休門加坎，
 *       天蓬亦加坎。若乙丑年，乙在坤二、丑在離九，即以天盤休門加離九，天蓬加坤二，又以八神之值符
 *       加於天蓬逆轉，餘倣此。共一百八十年為一週，用逆不用順者，天道左旋，日月隨之而左，故逆也。」
 *     → 要点：① 三元局数 **1 / 4 / 7（全阴遁）**，180 年一周；② **值符随年干**、**值使随年支**；
 *       ③ 八神「加於天蓬逆轉」= 阴遁一律**逆排**。
 *
 *   【月奇門起例】原文逐句：
 *     「甲子至戊辰、己卯至癸未、甲午至戊戌、己酉至癸丑為上元二十年，用陰遁一局；
 *       己巳至癸酉、甲申至戊子、己亥至癸卯、甲寅至戊午為中元二十年，用陰遁四局；
 *       甲戌至戊寅、己丑至癸巳、甲辰至戊申、己未至癸亥為下元二十年，用陰遁七局。
 *       年以月建，旬首所值之門為值使，所值之星為值符。看月建之支臨於地盤何宮，即以天盤值使加之；
 *       看月建之干臨於地盤何宮，即以天盤值符加之，與年奇門同。」
 *     → 要点：① 三元局数同样 **1 / 4 / 7**；② **值符随月干、值使随月支**（「月建」= 月柱）；
 *       ③ 定元按**月柱在六十甲子中的分组**（原文以「甲子至戊辰…」枚举，即每 5 个一组、三组一气、
 *          15 个月一循环，详见下条「元序如何算」）。
 *
 * ===== 两处落实方式（原文简，逐条说明依据，绝不臆造）=====
 *
 * 【一、年家三元起点】原文只说「上元甲子」，未写具体公元年。本内核取**三元九运通行纪年**：
 *   上元甲子 = 1864 甲子年、中元甲子 = 1924 甲子年、下元甲子 = 1984 甲子年（三源一致：百度百科
 *   「三元九运」/ 搜狐「三元九运是与非」/ 搜狐「排山掌上起三元甲子诀」，均列 1864-1923 上元、
 *   1924-1983 中元、1984-2043 下元）。→ `(干支年 - 1864) mod 180`：<60 上元、<120 中元、其余下元。
 *   干支年按**立春**归属（立春前算上一年），故与公历年表述会有数日之差（三元九运表本身也如此说明）。
 *
 * 【二、月家元序】原文枚举「甲子至戊辰、己卯至癸未、甲午至戊戌、己酉至癸丑为上元」——
 *   把这四组换成年月柱六十甲子序号：甲子=0…戊辰=4、己卯=15…癸未=19、甲午=30…戊戌=34、己酉=45…癸丑=49。
 *   可见上元 = **序号 mod 15 ∈ {0,1,2,3,4}**，中元 = mod 15 ∈ {5..9}，下元 = mod 15 ∈ {10..14}。
 *   即「每 5 个月一组、三组一气、15 个月一循环」。本内核按此字面实现。
 *   📌 **并列流派（不采，仅说明）**：另有「按年支四孟/四仲/四季定元」一派（易德轩 / 易象乾坤 / 新都网，
 *      均出自《奇门遁甲预测学试行教材》），且该派内部对「孟仲季 ↔ 1/4/7 局」的对应**互不一致**
 *      （易德轩作四仲→坎一、易象乾坤作四孟→坎一，恰好相反）。本内核以**古籍《統宗》**为准，此派列缺口。
 *
 * ===== 缺口（如实标注，不假报已锁）=====
 *   · **年支 / 月支「临于地盘何宫」的映射**：原文年家算例写「乙丑年…丑在離九」，而按本项目通行的
 *     地支宫位映射（子坎1、丑艮8，时家/日家/刻家同用）丑应在艮八。二者不符，且原文未给年支落宫的
 *     一般规则。本内核采**通行地支宫位映射（ZHI_GONG）**以保持三处单一真源，并在缺口写明此差异。
 *   · 年家/月家均**无完整盘面算例**（原文仅给局数与符使，不给九星/八门/八神逐宫）→ 飞布几何
 *     **只验内部自洽 + 一条原文自证（甲子年伏吟）**，不假称已外部整盘锁死。
 *     ✅ v3.1.58 收口：取得现代整理版完整算例——易德轩 2004-08-06 甲申年（下元阴遁七局）逐宫比对，
 *       地盘 9/9、天盘九星 8/8（伏吟）、天盘干 8/8+禽干、值符/值使、八神 8/8 全中 → 标 ✅已核；
 *       唯一不一致项为八门伏吟排法（该例各归本宫 vs 本内核与时家一致的环序铺开），属流派分歧，并列不合并。
 *   · 月家「年支定元」派与《統宗》「月柱分组定元」派的分歧见上，仅以古籍为准。
 *   · 年家/月家的专用神煞与断辞未纳入。
 *
 * 加载：UMD —— require（注入 lunar + ganzhi + qimen）；浏览器挂 NT.core.qimenNianYue。
 * 校验：modules/CoreModule/__tests__/qimennianyue.test.js
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./lunar.js'), require('./ganzhi.js'), require('./qimen.js'));
  } else {
    root.NT = root.NT || {}; root.NT.core = root.NT.core || {};
    root.NT.core.qimenNianYue = factory(root.NT.core && root.NT.core.lunar,
      root.NT.core && root.NT.core.ganzhi, root.NT.core && root.NT.core.qimen);
  }
})(typeof self !== 'undefined' ? self : this, function (LUNAR, GANZHI, QM) {

  var GAN = '甲乙丙丁戊己庚辛壬癸';
  var ZHI = '子丑寅卯辰巳午未申酉戌亥';
  var NIAN_JU = [1, 4, 7];              // 上/中/下元局数（年家、月家同）
  var YUAN_NAME = ['上元', '中元', '下元'];
  var NIAN_ANCHOR = 1864;               // 上元甲子年（三元九运通行纪年）

  function w9(x) { x = x % 9; return x <= 0 ? x + 9 : x; }
  function p2(n) { return (n < 10 ? '0' : '') + n; }

  /** 立春当日归属新年；返回该日期所属「干支年」的公历年份 */
  function ganzhiYearNum(y, m, d) {
    if (!GANZHI || !GANZHI.yearJieqi) return y;
    var t = GANZHI.yearJieqi(y)['立春'];
    if (!t) return y;
    var lcM = +String(t).slice(5, 7), lcD = +String(t).slice(8, 10);
    return (m > lcM || (m === lcM && d >= lcD)) ? y : y - 1;
  }

  // 年家三元：180 年一周，60 年一元
  function nianYuan(y, m, d) {
    var gy = ganzhiYearNum(y, m, d);
    var period = ((gy - NIAN_ANCHOR) % 180 + 180) % 180;
    var idx = period < 60 ? 0 : period < 120 ? 1 : 2;
    return { 元序: idx, 元: YUAN_NAME[idx], 局数: NIAN_JU[idx], 干支年: gy, 距上元: period };
  }

  // 月家三元：月柱序位 mod 15 分三元（《統宗》字面）
  function yueYuan(yueGZ) {
    var i = GANZHI.jiaziIndex(yueGZ);
    var idx = Math.floor((i % 15) / 5);   // 0/1/2
    return { 元序: idx, 元: YUAN_NAME[idx], 局数: NIAN_JU[idx], 月柱序: i, 模15: i % 15 };
  }

  // —— 公共排盘（年家/月家骨架相同）——
  // 参：ju 局数（全阴遁）、gz 该级干支（年柱或月柱）
  function paiPan(ju, gz) {
    var 干 = gz.slice(0, 1), 支 = gz.slice(1, 2);
    var 地盘 = QM.diPan(ju, false);                    // 阴遁：逆布六仪、顺飞三奇
    var xun = QM.firstXunshou(gz);
    var yi = QM.XUNSHOU[xun];
    var xunPal = QM.findHome(地盘, yi);
    var xunHome = QM.homeOf(xunPal);
    var 值符星 = QM.STAR_HOME[xunHome];
    var 值使门 = QM.GATE_HOME[xunHome] || '死';

    // 值符随「干」：干在地盘之宫（干为甲时用旬首仪）
    var 干仪 = 干 === '甲' ? yi : 干;
    var 干宫 = QM.findHome(地盘, 干仪);
    // 值使随「支」：支临宫（用本项目统一的地支宫位映射 ZHI_GONG）
    var 支宫 = QM.homeOf(QM.ZHI_GONG[支]);

    // 天盘九星：转盘顺时针铺（九星不论阴阳遁恒顺时针）
    var 天盘 = QM.rotateRing(QM.STAR_RING, QM.CLOCK, 值符星, 干宫);
    // 八门：阴遁逆铺
    var 八门 = QM.rotateRing(QM.GATE_RING, QM.CLOCK, 值使门, 支宫, null, true);
    // 八神：全阴遁 → 一律逆排（小值符随大值符）
    var 八神 = QM.arrangeGods(QM.GODS, QM.CLOCK, 干宫, false);

    // 天盘干：星带本宫地盘干；天禽随天芮同宫
    var S2H = {};
    for (var hp in QM.STAR_HOME) S2H[QM.STAR_HOME[hp]] = +hp;
    var 天盘干 = {}, 禽宫 = 0;
    for (var p in 天盘) {
      var st = 天盘[p];
      var home = QM.homeOf(S2H[st] || 2);
      天盘干[p] = 地盘[home];
      if (st === '天芮') 禽宫 = +p;
    }
    return {
      干支: gz, 干: 干, 支: 支, 局数: ju,
      旬首: xun, 旬首仪: yi, 旬首宫: xunPal, 值符星: 值符星, 值使门: 值使门,
      干宫: 干宫, 支宫: 支宫,
      地盘: 地盘, 天盘: 天盘, 八门: 八门, 八神: 八神,
      天盘干: 天盘干, 禽宫: 禽宫, 禽干: 禽宫 ? 地盘[5] : null
    };
  }

  var GAP_COMMON = [
    '年支或月支「临于地盘何宫」原文无一般规则（年家算例「乙丑年丑在離九」与通行地支宫位映射丑→艮八不符），本内核采通行映射 ZHI_GONG 以保单一真源，此差异属流派/待考。',
    'v3.1.58 取得年家完整外部算例：易德轩「年、月、日家奇门演局方法简介」2004-08-06 甲申年例（下元阴遁七局）逐宫比对——地盘 9/9、天盘九星 8/8（九星伏吟，各归本位）、天盘干 8/8+天禽带中五之干、值符（天禽落中五寄坤二）、值使死门（坤二）、八神 8/8（逆排）全部逐宫一致 → 年家飞布标 ✅已核（一个现代整理版完整算例，非多源黄金盘，不称已锁）。',
    '⚠ 八门排法流派分歧（算例中唯一不一致项）：该例值使死门恰落本宫坤二，其八门为「伏吟各归本宫」（景离9/杜巽4/伤震3/生艮8/休坎1/开乾6/惊兑7），本内核按与时家同一的环序铺开口径（值使落宫后 GATE_RING 顺环展开），伏吟局下门会「转起来」。两派并列不合并，改八门口径须同时改时家（单一真源），故不迁就算例。',
    '中五本位星定名分歧（不影响落宫）：本项目 STAR_HOME 表（时家黄金盘同款）中五本位为天芮、天禽寄坤二，易德轩算例则以中五本位为天禽。2004 甲申年例中值符落点两边同为中五寄坤二，落宫一致、定名不同，并列不裁定。',
    '年家月家专用神煞与断辞未纳入。'
  ];

  /** 年家奇门 */
  function nianChart(inp) {
    inp = inp || {};
    if (!LUNAR || !GANZHI || !QM) return { err: '年家奇门需 lunar + ganzhi + qimen 内核' };
    var y = inp.y, m = inp.m, d = inp.d;
    if (!y || !m || !d) return { err: '年家奇门需年月日，例如「年家奇门 2026年2月9日」（年家以年为单位）。' };
    var 年柱 = LUNAR.fromSolar(y, m, d, 12).ganzhi.年.干支;
    var yu = nianYuan(y, m, d);
    var P = paiPan(yu.局数, 年柱);
    var out = {
      日期: y + '年' + m + '月' + d + '日',
      年柱: 年柱, 干支年: yu.干支年, 元: yu.元, 局数: yu.局数, 阴阳遁: '阴遁',
      距上元: yu.距上元,
      缺口: [
        '年家定局采三元九运通行纪年：上元甲子=1864、中元=1924、下元=1984（三源一致）。干支年按立春归属，故与公历年表述有数日之差。'
      ].concat(GAP_COMMON)
    };
    for (var k1 in P) out[k1] = P[k1];
    return out;
  }

  /** 月家奇门（主口径 = 《統宗》月柱分组定元） */
  function yueChart(inp) {
    inp = inp || {};
    if (!LUNAR || !GANZHI || !QM) return { err: '月家奇门需 lunar + ganzhi + qimen 内核' };
    var y = inp.y, m = inp.m, d = inp.d;
    if (!y || !m || !d) return { err: '月家奇门需年月日，例如「月家奇门 2026年2月9日」（月家以月为单位，按节气取月柱）。' };
    var 月柱 = LUNAR.fromSolar(y, m, d, 12).ganzhi.月.干支;
    var yu = yueYuan(月柱);
    var P = paiPan(yu.局数, 月柱);
    var out = {
      日期: y + '年' + m + '月' + d + '日',
      月柱: 月柱, 月柱序: yu.月柱序, 模15: yu.模15, 元: yu.元, 局数: yu.局数, 阴阳遁: '阴遁',
      缺口: [
        '月家定元采古籍《奇門遁甲統宗》月奇门起例（按月柱六十甲子序位分组，模15分三元）。',
        '另有「按年支四孟/四仲/四季定元」派（出自《奇门遁甲预测学试行教材》），该派内部对孟仲季与1/4/7局的对应互不一致，本内核不采。'
      ].concat(GAP_COMMON)
    };
    for (var k2 in P) out[k2] = P[k2];
    return out;
  }

  return {
    nianChart: nianChart, yueChart: yueChart,
    NIAN_JU: NIAN_JU, YUAN_NAME: YUAN_NAME, NIAN_ANCHOR: NIAN_ANCHOR,
    ganzhiYearNum: ganzhiYearNum, nianYuan: nianYuan, yueYuan: yueYuan, paiPan: paiPan
  };
});
