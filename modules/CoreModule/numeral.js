/**
 * modules/CoreModule/numeral.js —— 数字命理内核 C10【单一真源】
 *
 * 算什么（圣经第四章"数字八字"，本项目独有自研体系）：
 *   ① 数字排盘：年柱(生肖序 1-12，立春换年)、月柱(农历几月写几)、日柱(13-19拆1-10-n,20-29拆2-10-n,30/31拆3-10)、
 *      时柱(生肖时辰序) → 上卦/下卦；
 *   ② 数组判定：八绝、六冲、双木克土、三九、灾数、纯阳比和（配重疾/婚姻断语）；
 *   ③ 五行通关（金克木→水、木克土→火、土克水→金、水克火→木、火克金→土 + 佩戴位置）。
 * 算法来源：自研，依《风水命理》总文档（doc6）体系 + 图表 xlsx 规格。
 * 校验收：  modules/CoreModule/__tests__/numeral.test.js
 * 加载：UMD —— require() 得 { paiPan, judgeArray, tongGuan, ... }；浏览器挂全局 NT.core.numeral。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./lunar.js'));
  else { root.NT = root.NT || {}; root.NT.core = root.NT.core || {}; root.NT.core.numeral = factory(root.NT.core && root.NT.core.lunar); }
})(typeof self !== 'undefined' ? self : this, function (CORE) {

  var SL = CORE._SL;
  var SX_ORDER = { 鼠: 1, 牛: 2, 虎: 3, 兔: 4, 龙: 5, 蛇: 6, 马: 7, 羊: 8, 猴: 9, 鸡: 10, 狗: 11, 猪: 12 };
  var SX_NUM = { 1: '鼠', 2: '牛', 3: '虎', 4: '兔', 5: '龙', 6: '蛇', 7: '马', 8: '羊', 9: '猴', 10: '鸡', 11: '狗', 12: '猪' };

  // 数字属性（1-12 → 五行，圣经 4.2）
  var NUM_WX = { 1: '水', 2: '水', 3: '土', 4: '木', 5: '木', 6: '火', 7: '火', 8: '土', 9: '土', 10: '金', 11: '金', 12: '水' };

  // 数字 → 生肖时辰序号（23 时起为 1；重合取上一位）：时(h) → 序号
  function hourNum(h) {
    // 23,24(0)=1(子)；1,2=3? 按 doc6：4 时写 3，5 时取 3，17 时取 9
    var table = { 23: 1, 0: 1, 1: 3, 2: 3, 3: 5, 4: 3, 5: 3, 6: 5, 7: 7, 8: 7, 9: 9, 10: 9, 11: 11, 12: 11, 13: 13, 14: 13, 15: 15, 16: 15, 17: 9, 18: 11, 19: 13, 20: 15, 21: 17, 22: 19 };
    // doc6 时柱按生肖时辰顺序（重合取上一位）——简化：每 2 小时一个生肖序
    var shichen = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    var idx = Math.floor(((h + 1) % 24) / 2);   // 23-1 子 … 21-23 亥
    return SX_ORDER[shichen[idx]] || 1;
  }

  /**
   * 数字排盘。
   * @param {Object} inp { y, m, d, h, lunarMonth?（农历月，闰月传负），isLeap? }
   * 输入公历，内部转农历取月/日。
   */
  function paiPan(inp) {
    var r = CORE.fromSolar(inp.y, inp.m, inp.d, inp.h || 0);
    // 年柱：生肖序（立春换年已含在 fromSolar 的年柱里）
    var yearNum = SX_NUM[{'鼠':1,'牛':2,'虎':3,'兔':4,'龙':5,'蛇':6,'马':7,'羊':8,'猴':9,'鸡':10,'狗':11,'猪':12}[r.ganzhi.年.生肖] || 0] || r.ganzhi.年.生肖;
    var yearSeq = r.ganzhi.年.生肖 ? SX_ORDER[r.ganzhi.年.生肖] : 1;
    var monthNum = Math.abs(r._raw.getMonth());     // 农历几月写几（闰月取负，abs 后即该月序）
    var dayNum = r._raw.getDay();                    // 1-30/31
    var hourSeq = hourNum(inp.h || 0);
    // 日柱拆分：13-19→1-10-n；20-29→2-10-n；30/31→3-10(-1)
    var daySeqs = daySeq(dayNum);
    // 上卦/下卦（doc6：上卦>6减6，≤6加6，作用在下卦）
    var raw = [yearSeq, monthNum, dayNum, hourSeq]; // 年/月/日/时 四柱序
    return {
      数字: { 年: yearSeq, 月: monthNum, 日: dayNum, 时: hourSeq, 日拆分: daySeqs },
      五行: { 年: NUM_WX[yearSeq] || '', 月: NUM_WX[monthNum] || '', 日: NUM_WX[dayNum] || '', 时: NUM_WX[hourSeq] || '' },
      生肖: r.ganzhi.年.生肖, 农历: r.lunar.text,
      _raw: r._raw
    };
  }
  function daySeq(d) {
    if (d <= 12) return [d];
    if (d <= 19) return [1, 10, d - 10];
    if (d <= 29) return [2, 10, d - 20];
    return [3, 10, d === 31 ? -1 : d - 30];
  }

  // ===== 数组判定（核心，doc6 + xlsx 生克强度）=====
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

  return { NUM_WX: NUM_WX, paiPan: paiPan, judgeArray: judgeArray, TONGGUAN: TONGGUAN, WEAR_POS: WEAR_POS,
    BAJUE: BAJUE, LIUCHONG: LIUCHONG, SANJIU: SANJIU, ZAI: ZAI, CHUNYANG: CHUNYANG };
});
