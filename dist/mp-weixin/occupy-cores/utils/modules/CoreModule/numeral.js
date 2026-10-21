/**
 * modules/CoreModule/numeral.js —— 数字命理内核 C10【单一真源】
 *
 * 算什么（用户亲撰的「数字八字」体系，本项目独有自研，详见任务清单 line 42）：
 *   ① 数字排盘：年柱 = 生肖序(1-12) / 月柱 = 公历月 / 日柱 = 公历日(10/11/20/21/30 按规则拆分) /
 *      时柱 = 生肖时辰序(子1…亥12) → 上卦数字串；
 *   ② 下卦：对上卦每个数 d，d>6 则 d-6、d<=6 则 d+6（即等于6也加6）；
 *   ③ 头尾相连：上卦数字串做循环移位枚举（白玖玖 8-6-9-1 → 6-9-1-8 / 9-1-8-6 / 1-8-6-9）；
 *   ④ 上下卦交集约束：上卦第 i 位与下卦第 i 位构成的 (上i,下i) 不可再出现于盘面；
 *   ⑤ 男女因果：男生上卦为因、下卦为果；女生反之；
 *   ⑥ 辈分：年/月/日/时分别代表祖辈(先天)/父母辈(成长)/自身(中年)/子女辈(晚年)；
 *   ⑦ 数组判定：八绝、六冲、三九、灾数、纯阳比和（配断语，本项目独有 ◆）；
 *   ⑧ 五行通关（金克木→水、木克土→火、土克水→金、水克火→木、火克金→土 + 佩戴位置）。
 *
 * ⚠ 缺口（待用户确认，不假报已锁）：
 *   - 年柱数字：按「生肖序」取（1-12）。以白玖玖 2005.06.09 为例，真实干支为乙酉鸡年=10，
 *     但用户文档示例标注「2005 年=羊=8」。本实现按真实生肖序取 10，使 2005→10-6-9-1；
 *     若须严格按文档示例取 8（即 8-6-9-1），将 yearDigit() 改为返回 8 即可（一行）。
 *   - 辈分映射、男女因果方向、上下卦交集判读，均为本系统自有解读（◆ 无外部权威）。
 * 算法来源：用户亲撰规格（任务清单 line 42），数字属性与凶阵表依《风水命理》总文档体系。
 * 校验收：  modules/CoreModule/__tests__/numeral.test.js
 * 加载：UMD —— require() 得 { paiPan, judgeArray, tongGuan, ... }；浏览器挂全局 NT.core.numeral。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./lunar.js'));
  else { root.NT = root.NT || {}; root.NT.core = root.NT.core || {}; root.NT.core.numeral = factory(root.NT.core && root.NT.core.lunar); }
})(typeof self !== 'undefined' ? self : this, function (CORE) {

  // 生肖序（1-12）：鼠1 牛2 虎3 兔4 龙5 蛇6 马7 羊8 猴9 鸡10 狗11 猪12
  var SX_ORDER = { 鼠: 1, 牛: 2, 虎: 3, 兔: 4, 龙: 5, 蛇: 6, 马: 7, 羊: 8, 猴: 9, 鸡: 10, 狗: 11, 猪: 12 };
  var SX_NUM = { 1: '鼠', 2: '牛', 3: '虎', 4: '兔', 5: '龙', 6: '蛇', 7: '马', 8: '羊', 9: '猴', 10: '鸡', 11: '狗', 12: '猪' };
  // 生肖时辰（子时起 23 时，每 2 小时一辰）
  var SHICHEN = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  // 时辰序（子=1…亥=12，按地支固定序，不取生肖序）
  var SHICHEN_SEQ = { 子: 1, 丑: 2, 寅: 3, 卯: 4, 辰: 5, 巳: 6, 午: 7, 未: 8, 申: 9, 酉: 10, 戌: 11, 亥: 12 };

  // 数字属性（1-12 → 五行，本系统口径）
  var NUM_WX = { 1: '水', 2: '水', 3: '土', 4: '木', 5: '木', 6: '火', 7: '火', 8: '土', 9: '土', 10: '金', 11: '金', 12: '水' };

  // 年柱数字：生肖序（1-12）。⚠ 见文件头缺口说明。
  function yearDigit(sx) { return SX_ORDER[sx] || 1; }

  // 时柱数字：时辰序（子1…亥12）。h 为 0-23 小时（23,0=子1；1,2=丑2；…21,22=亥12）
  function hourSeq(h) {
    var hh = ((h % 24) + 24) % 24;
    var idx = Math.floor(((hh + 1) % 24) / 2); // 23,0→0(子) 1,2→1(丑) … 21,22→11(亥)
    return SHICHEN_SEQ[SHICHEN[idx]] || 1;
  }

  // 日柱拆分（公历日 d，1-31）：
  //   10 → 1-10；11 → 1-10-1；20 → 2-10；21 → 2-10-1；30 → 3-10；其余 d<=9 直接 [d]，12→1-10-2，31→3-10-1。
  function daySeq(d) {
    d = Math.max(1, Math.min(31, d | 0));
    if (d <= 9) return [d];
    var tens = Math.floor(d / 10);   // 1(10-19) / 2(20-29) / 3(30-31)
    var ones = d % 10;               // 0-9
    var arr = [tens, 10];
    if (ones > 0) arr.push(ones);
    return arr;
  }

  // 下卦数字映射：d>6 → d-6；d<=6 → d+6（等于6也加6）
  function lowerDigit(d) { return d > 6 ? d - 6 : d + 6; }

  // 把上卦数字串做循环移位枚举（头尾相连）：[a,b,c,d] → 4 个旋转
  function cyclicRotations(arr) {
    var n = arr.length, out = [];
    for (var s = 0; s < n; s++) {
      var r = [];
      for (var i = 0; i < n; i++) r.push(arr[(s + i) % n]);
      out.push(r);
    }
    return out;
  }

  // 上下卦交集：上卦第 i 位与下卦第 i 位构成的 (上i,下i) 对，盘面不可再出现这些组合
  function crossPairs(upper, lower) {
    var p = [];
    for (var i = 0; i < upper.length && i < lower.length; i++) p.push([upper[i], lower[i]]);
    return p;
  }

  /**
   * 数字排盘（按用户亲撰规格）。
   * @param {Object} inp { y, m(公历月1-12), d(公历日1-31), h(0-23), gender('male'|'female'|'') }
   */
  function paiPan(inp) {
    var y = inp.y | 0, m = Math.max(1, Math.min(12, inp.m | 0)), d = Math.max(1, Math.min(31, inp.d | 0)), h = ((inp.h | 0) % 24 + 24) % 24;
    // 年柱生肖（立春换年已含在 lunar 年柱里）
    var lunar = CORE.fromSolar(y, m, d, h);
    var sx = lunar.ganzhi.年.生肖;
    var yearSeq = yearDigit(sx);
    var monthNum = m;                 // 月柱 = 公历月（用户规格，非农历）
    var dayNums = daySeq(d);          // 日柱拆分
    var hourS = hourSeq(h);           // 时柱 = 生肖时辰序

    // 上卦数字串：年 + 月 + 日拆分 + 时
    var upper = [yearSeq, monthNum].concat(dayNums, [hourS]);
    // 下卦：上卦每个数映射
    var lower = upper.map(lowerDigit);
    // 头尾相连循环枚举
    var rotations = cyclicRotations(upper);
    // 上下卦交集对
    var cross = crossPairs(upper, lower);
    // 男女因果方向
    var causal = (inp.gender === 'female') ? { 因: lower.slice(), 果: upper.slice(), 方向: '女：下卦为因、上卦为果' }
      : { 因: upper.slice(), 果: lower.slice(), 方向: '男：上卦为因、下卦为果' };
    // 辈分映射（◆ 本系统自有解读）
    var generations = [
      { 柱: '年', 辈分: '祖辈·先天', 数字: yearSeq },
      { 柱: '月', 辈分: '父母辈·成长', 数字: monthNum },
      { 柱: '日', 辈分: '自身·中年', 数字: d },
      { 柱: '时', 辈分: '子女辈·晚年', 数字: hourS }
    ];

    return {
      农历: lunar.lunar.text,
      生肖: sx,
      数字: { 年: yearSeq, 月: monthNum, 日: d, 时: hourS }, // 兼容旧契约 meihua/周易：年=生肖序 月=公历月 日=公历日原值 时=时支序
      上卦: upper,
      下卦: lower,
      日拆分: dayNums,
      时辰序: hourS,
      循环枚举: rotations,
      交集对: cross,
      因果: causal,
      辈分: generations,
      五行: upper.map(function (x) { return NUM_WX[x] || ''; })
    };
  }

  // ===== 数组判定（核心，本项目独有 ◆）=====
  var BAJUE = ['1-8', '8-1', '1-9', '9-1', '2-6', '6-2', '3-5', '5-3', '3-6', '6-3', '4-10', '10-4', '7-11', '11-7', '7-12', '12-7'];
  var LIUCHONG = ['1-7', '7-1', '2-8', '8-2', '3-9', '9-3', '4-10', '10-4', '5-11', '11-5', '6-12', '12-6'];
  var SANJIU = ['3-9', '9-3', '3-6', '6-3', '3-7', '7-3', '3-3', '9-9'];
  var ZAI = ['4-8', '5-9', '6-11'];
  var CHUNYANG = ['1-1', '3-3', '11-11'];

  /** 判定一组数字序列里包含哪些凶阵/凶数，返回断语数组 */
  function judgeArray(nums) {
    var found = [];
    var s = nums.join('-');
    function has(a) { return s.indexOf(a) >= 0; }
    BAJUE.forEach(function (a) { if (has(a)) found.push({ 阵: '八绝', 组合: a, 断: '绝克重疾（按落位：年头部/月胸部/日腰腹/时腿脚）' }); });
    LIUCHONG.forEach(function (a) { if (has(a)) found.push({ 阵: '六冲', 组合: a, 断: '冲克，主口舌波动、财物伏藏' }); });
    SANJIU.forEach(function (a) { if (has(a)) found.push({ 阵: '三九', 组合: a, 断: '肿瘤/结节倾向（多组出现提示筛查）' }); });
    ZAI.forEach(function (a) { if (has(a)) found.push({ 阵: '灾数', 组合: a, 断: '婚姻不顺、破耗' }); });
    CHUNYANG.forEach(function (a) { if (has(a)) found.push({ 阵: '纯阳比和', 组合: a, 断: '纯阳无阴，宜补阴' }); });
    return found;
  }

  // ===== 五行通关（C 类规则）=====
  var TONGGUAN = {
    '金克木': { 通关: '水', 物: '黑色/黑曜石' },
    '木克土': { 通关: '火', 物: '红色/朱砂' },
    '土克水': { 通关: '金', 物: '白色/金属' },
    '水克火': { 通关: '木', 物: '绿色/木质' },
    '火克金': { 通关: '土', 物: '土黄色/玉石' }
  };
  var WEAR_POS = { 年: '外衣领', 月: '内衣', 日: '内裤', 时: '鞋袜' };

  return {
    NUM_WX: NUM_WX, SX_ORDER: SX_ORDER, SX_NUM: SX_NUM,
    yearDigit: yearDigit, hourSeq: hourSeq, daySeq: daySeq, lowerDigit: lowerDigit,
    cyclicRotations: cyclicRotations, crossPairs: crossPairs,
    paiPan: paiPan, judgeArray: judgeArray, TONGGUAN: TONGGUAN, WEAR_POS: WEAR_POS,
    BAJUE: BAJUE, LIUCHONG: LIUCHONG, SANJIU: SANJIU, ZAI: ZAI, CHUNYANG: CHUNYANG
  };
});
