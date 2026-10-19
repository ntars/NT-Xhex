/**
 * modules/CoreModule/qimen-fei.js —— 奇门遁甲·飞盘（飞宫法）内核 C23【单一真源 · 适配层】
 *
 * 定位：与 qimen.js（转盘·排宫法）并列的另一大流派。起局**前三步与转盘相同**（四柱 / 定局 / 排地盘），
 *       区别仅在「天盘(九星) / 人盘(八门) / 神盘(九神)」是**按宫数"飞"**（阳遁顺飞、阴遁逆飞），
 *       而非转盘那样始终顺时针旋转。故本内核**复用 qimen.js 的定局**（单一真源，不重复造定局），
 *       只重写三盘飞布。
 *
 * 权威口径（多源一致：易德轩 yi958 / 问玄阁 fateask / 灵匣 lnka.tw / qqhbx 同一范例彼此一致）：
 *   · 飞盘九星序 = 洛书九宫数序：蓬1 芮2 冲3 辅4 禽5 心6 柱7 任8 英9（区别于转盘的空间方位序）。
 *   · 飞盘八门序 = 洛书数序且**中五无门**：休1 死2 伤3 杜4 开6 惊7 生8 景9。
 *   · 飞盘用**九神**（转盘用八神）：
 *       阳遁：值符·螣蛇·太阴·六合·勾陈·太常·朱雀·九地·九天
 *       阴遁：值符·螣蛇·太阴·六合·白虎·太常·玄武·九地·九天
 *   · 值符星落**时干所在宫**（同转盘）；值使门落宫 = 自旬首宫起顺/逆数至时辰（**含中五计数**）。
 *   · 八门飞布走「八宫环」（跳过中五）：阳遁 [1,2,3,4,6,7,8,9]；若值使落中五，阳遁跳乾六、阴遁跳巽四。
 *   · 地盘：戊起局数宫，阳顺阴逆，**中五保留不寄坤**（飞盘用中五，与转盘"中五寄坤二"不同）。
 *
 * 交叉验证状态（守零臆造，如实标注）：
 *   ✅ **飞布几何已按黄金范例逐宫锁死**：范例 2006-12（丙戌日丙申时，阳遁一局，值符天辅·值使杜门），
 *      九星/八门/九神 9/8/9 三盘**全中**（见 __tests__/qimenfei.test.js）。
 *   📌 流派/待验证项（不假报）：
 *      ① 范例的「局数」用上元=阳1局，本项目定局走**拆补法**（按符头甲申→中元=阳7局）；
 *         定局法差异（拆补/置闰/超神接气）属流派分歧 → 本内核默认复用 qimen.js 拆补定局，
 *         验证飞布几何时以「强制局数」方式对齐范例（测试内覆盖）。
 *      ② **阴遁值使计数方向**（顺/逆）范例仅演示阳遁，阴遁按对称性推导，**待阴遁黄金盘验证**。
 *      ③ 中五宫在飞盘有星无门、天盘干随星走，深入「飞干/伏干」细则待补。
 *
 * 加载：UMD —— require（注入 qimen + ganzhi）；浏览器挂 NT.core.qimenFei。
 * 校验：modules/CoreModule/__tests__/qimenfei.test.js
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./qimen.js'), require('./ganzhi.js'));
  } else {
    root.NT = root.NT || {}; root.NT.core = root.NT.core || {};
    root.NT.core.qimenFei = factory(root.NT.core && root.NT.core.qimen, root.NT.core && root.NT.core.ganzhi);
  }
})(typeof self !== 'undefined' ? self : this, function (QM, GANZHI) {

  // 飞盘九星序（洛书九宫数序，1-based）
  var STAR_FLY = ['天蓬', '天芮', '天冲', '天辅', '天禽', '天心', '天柱', '天任', '天英'];
  // 飞盘八门序（中五无门）；值为其「宫数」（用于定本位/值使）
  var GATE_FLY = ['休门', '死门', '伤门', '杜门', '开门', '惊门', '生门', '景门'];
  var GATE_NUM = { 休门: 1, 死门: 2, 伤门: 3, 杜门: 4, 开门: 6, 惊门: 7, 生门: 8, 景门: 9 };
  // 飞盘九神
  var GOD_YANG = ['值符', '螣蛇', '太阴', '六合', '勾陈', '太常', '朱雀', '九地', '九天'];
  var GOD_YIN = ['值符', '螣蛇', '太阴', '六合', '白虎', '太常', '玄武', '九地', '九天'];
  // 三奇六仪序
  var YI = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'];
  var XUN_YI = { 甲子: '戊', 甲戌: '己', 甲申: '庚', 甲午: '辛', 甲辰: '壬', 甲寅: '癸' };
  // 八宫环（跳过中五）
  var RING_YANG = [1, 2, 3, 4, 6, 7, 8, 9];
  var RING_YIN = [9, 8, 7, 6, 4, 3, 2, 1];

  function w9(x) { var v = ((x - 1) % 9 + 9) % 9; return v + 1; } // 1..9 环绕
  function palaceOfYi(dipan, yi) {
    for (var p in dipan) if (dipan[p] === yi) return +p;
    return 0;
  }

  /**
   * 飞盘起局。
   * @param {Object} inp { y,m,d,h }；可选 覆盖：{ 阴阳遁:'阳遁'|'阴遁', 局数:n }（验证/对齐范例用）
   */
  function feiChart(inp) {
    inp = inp || {};
    if (!QM) return { err: '飞盘需 qimen 内核（定局复用）' };
    var base = QM.chart(inp);
    if (base.err) return base;

    var yang = inp.阴阳遁 ? (inp.阴阳遁 === '阳遁') : (base.阴阳遁 === '阳遁');
    var ju = inp.局数 || base.局数;

    // —— 地盘：戊起局数宫，阳顺阴逆，中五保留（飞盘用中五）——
    var 地盘 = {};
    for (var i = 0; i < 9; i++) {
      var p = yang ? w9(ju + i) : w9(ju - i);
      地盘[p] = YI[i];
    }

    // —— 旬首 → 旬首宫 / 值符星 / 值使门 ——
    var xun = base.旬首;                       // 如 '甲午'
    var xunYi = XUN_YI[xun];
    var xunPalace = palaceOfYi(地盘, xunYi);
    var 值符星 = STAR_FLY[xunPalace - 1] || null;         // 星本位 = 旬首宫数
    var 值使门 = null;
    for (var g = 0; g < GATE_FLY.length; g++) if (GATE_NUM[GATE_FLY[g]] === xunPalace) 值使门 = GATE_FLY[g];
    if (!值使门) 值使门 = '死门'; // 旬首落中五（天禽为值符）→ 值使为死门（通则）

    // —— 时干宫：值符星落此宫 ——
    var shiGan = base.四柱.时.charAt(0);
    var shiGanPalace = palaceOfYi(地盘, shiGan);
    if (!shiGanPalace) return { err: '未能定位时干「' + shiGan + '」所在的地盘宫' };

    // —— 天盘九星飞布：自值符星(时干宫)起，按九宫数序阳顺/阴逆 ——
    var zfIdx = STAR_FLY.indexOf(值符星) + 1;
    var 天盘 = {};
    STAR_FLY.forEach(function (s, k) {
      var off = (k + 1) - zfIdx;
      天盘[yang ? w9(shiGanPalace + off) : w9(shiGanPalace - off)] = s;
    });

    // —— 人盘八门：值使落宫 = 自旬首宫数至时辰（含中五计数），再按八宫环飞布 ——
    var offXun = 0;
    if (GANZHI && GANZHI.jiaziIndex) {
      // 旬首本身即完整干支（如 '甲午'），直接索引；步数 = 时干支 - 旬首（0..9，含中五计数）
      var iShi = GANZHI.jiaziIndex(base.四柱.时), iXun = GANZHI.jiaziIndex(xun);
      offXun = ((iShi - iXun) % 60 + 60) % 60;
    }
    var zhiShiPalace = yang ? w9(xunPalace + offXun) : w9(xunPalace - offXun);
    if (zhiShiPalace === 5) zhiShiPalace = yang ? 6 : 4; // 八门不入中五：阳跳乾六、阴跳巽四
    var ring = yang ? RING_YANG : RING_YIN;
    var startIdx = ring.indexOf(zhiShiPalace);
    var zsPos = GATE_FLY.indexOf(值使门);
    var 八门 = {};
    GATE_FLY.forEach(function (gm, k) {
      八门[ring[((startIdx + (k - zsPos)) % 8 + 8) % 8]] = gm;
    });

    // —— 神盘九神：值符随值符星(时干宫)，按九宫数序阳顺/阴逆 ——
    var gods = yang ? GOD_YANG : GOD_YIN;
    var 九神 = {};
    gods.forEach(function (gd, k) {
      九神[yang ? w9(shiGanPalace + k) : w9(shiGanPalace - k)] = gd;
    });

    return {
      时刻: base.时刻,
      四柱: base.四柱,
      阴阳遁: yang ? '阳遁' : '阴遁', 局数: ju, 节气: base.节气, 元: base.元,
      定局来源: inp.局数 ? ('强制覆盖（' + (yang ? '阳' : '阴') + '遁' + ju + '局，用于对齐范例验证）') : 'qimen.js 拆补定局',
      旬首: xun, 旬首宫: xunPalace, 值符星: 值符星, 值使门: 值使门,
      时干宫: shiGanPalace, 值使落宫: zhiShiPalace,
      地盘: 地盘, 天盘: 天盘, 八门: 八门, 九神: 九神,
      _飞布验证: '飞布几何已按黄金范例（阳遁一局·值符天辅·值使杜门）逐宫锁死：九星/八门/九神 9/8/9 全中。'
        + '定局法差异（拆补/置闰）属流派分歧；阴遁值使计数方向待阴遁黄金盘验证。'
    };
  }

  return {
    feiChart: feiChart, STAR_FLY: STAR_FLY, GATE_FLY: GATE_FLY, GATE_NUM: GATE_NUM,
    GOD_YANG: GOD_YANG, GOD_YIN: GOD_YIN, YI: YI, XUN_YI: XUN_YI,
    RING_YANG: RING_YANG, RING_YIN: RING_YIN
  };
});
