/**
 * modules/CoreModule/__tests__/qimennianyue.test.js —— 奇门·年家/月家内核验收
 * 用法：node modules/CoreModule/__tests__/qimennianyue.test.js
 *
 * 锁什么（比日家/刻家更有据：古籍《奇門遁甲統宗》卷二原文，3 源逐字一致）：
 *   【锚·外部可核对】
 *     A 年家三元 1/4/7（全阴遁）与三元九运纪年（1864/1924/1984）
 *     B ★ 古籍自证算例：上元甲子年（1864）阴遁一局「甲子在坎→天盘休门加坎、天蓬亦加坎」（伏吟）
 *     C 年家 180 年一周回卷
 *     D 月家三元：古籍枚举「甲子~戊辰/己卯~癸未/甲午~戊戌/己酉~癸丑 为上元」逐条核对
 *     E 值符随干、值使随支（原文两条规则）
 *   【自洽】飞布几何只验内部一致（无完整盘面算例，不假称外部锁死）
 */
var N = require('../qimen-nianyue.js');
var QM = require('../qimen.js');

var pass = 0, fail = 0;
function t(name, cond) { if (cond) pass++; else { fail++; console.log('  ✗ ' + name); } }
function eq(name, got, exp) {
  if (JSON.stringify(got) === JSON.stringify(exp)) pass++;
  else { fail++; console.log('  ✗ ' + name + '\n     期望 ' + JSON.stringify(exp) + '\n     实际 ' + JSON.stringify(got)); }
}
var RING = [1, 8, 3, 4, 9, 2, 7, 6];
function whereIs(bag, name) { var r = 0; RING.forEach(function (p) { if (bag[p] === name) r = p; }); return r; }

// ============ A. 年家三元与纪年 ============
console.log('== A. 年家三元（1/4/7）与纪年（1864/1924/1984）==');
eq('A1 三元局数 = 1/4/7', N.NIAN_JU, [1, 4, 7]);
eq('A2 上元甲子年 = 1864', N.NIAN_ANCHOR, 1864);
// 三个甲子年各归一元（取立春后，避免跨年边界）
eq('A3 1864 甲子年 → 上元', [N.nianChart({ y: 1864, m: 6, d: 1 }).元, N.nianChart({ y: 1864, m: 6, d: 1 }).局数], ['上元', 1]);
eq('A4 1924 甲子年 → 中元', [N.nianChart({ y: 1924, m: 6, d: 1 }).元, N.nianChart({ y: 1924, m: 6, d: 1 }).局数], ['中元', 4]);
eq('A5 1984 甲子年 → 下元', [N.nianChart({ y: 1984, m: 6, d: 1 }).元, N.nianChart({ y: 1984, m: 6, d: 1 }).局数], ['下元', 7]);
// 元内各年同局
eq('A6 上元末 1923 → 仍上元1局', N.nianChart({ y: 1923, m: 6, d: 1 }).局数, 1);
eq('A7 中元首 1924 → 中元4局', N.nianChart({ y: 1924, m: 6, d: 1 }).局数, 4);
eq('A8 下元首 1984 → 下元7局', N.nianChart({ y: 1984, m: 6, d: 1 }).局数, 7);
// 立春归属：1864-01-01 属 1863（癸亥年，仍在上元前一周期）
t('A9 立春前归上一年', N.ganzhiYearNum(1864, 1, 1) === 1863);
t('A10 立春后归本年', N.ganzhiYearNum(1864, 6, 1) === 1864);

// ============ B. ★ 古籍自证算例（伏吟盘） ============
console.log('== B. 古籍自证：上元甲子年阴遁一局「休门加坎、天蓬加坎」==');
var c = N.nianChart({ y: 1864, m: 6, d: 1 });
eq('B1 年柱=甲子', c.年柱, '甲子');
eq('B2 旬首=甲子', c.旬首, '甲子');
eq('B3 旬首仪=戊（甲子戊）', c.旬首仪, '戊');
eq('B4 旬首宫=坎一（甲子在坎）', c.旬首宫, 1);
eq('B5 值符=天蓬（坎宫本位星）', c.值符星, '天蓬');
eq('B6 值使=休门（坎宫本位门）', c.值使门, '休');
// 原文「以天盘休门加坎，天蓬亦加坎」→ 值符星与值使门同落坎1
eq('B7 天盘值符天蓬落坎一（原文自证）', whereIs(c.天盘, '天蓬'), 1);
eq('B8 天盘值使休门落坎一（原文自证）', whereIs(c.八门, '休'), 1);
// 值符值使同宫即伏吟
eq('B9 甲子年伏吟（符使同宫）', whereIs(c.天盘, '天蓬') === whereIs(c.八门, '休'), true);
// 八神小值符须随大值符
eq('B10 小值符随大值符（落坎一）', whereIs(c.八神, '值符'), 1);
// 全阴遁 → 八神逆排：坎一值符 → 顺时针下一宫（艮8）应是最后一神九天
eq('B11 八神逆排（阴遁），坎1值符→艮8九天', c.八神[8], '九天');

// ============ C. 年家 180 年回卷 ============
console.log('== C. 180 年一周回卷 ==');
eq('C1 1864+180=2044 → 与 1864 同元同局',
  [N.nianChart({ y: 2044, m: 6, d: 1 }).元, N.nianChart({ y: 2044, m: 6, d: 1 }).局数],
  ['上元', 1]);
eq('C2 1924+180=2104 → 与 1924 同元同局', N.nianChart({ y: 2104, m: 6, d: 1 }).局数, 4);
eq('C3 上元起点前一年 1863 → 属上一周期下元', N.nianChart({ y: 1863, m: 6, d: 1 }).局数, 7);

// ============ D. 月家三元（古籍枚举逐条核对） ============
console.log('== D. 月家三元：古籍枚举逐条 ==');
// 《統宗》：「甲子~戊辰…为上元；己巳~癸酉…为中元；甲戌~戊寅…为下元」
eq('D1 甲子（起）→ 上元1局', N.yueYuan('甲子').局数, 1);
eq('D2 戊辰（上元末）→ 上元1局', N.yueYuan('戊辰').局数, 1);
eq('D3 己巳（中元首）→ 中元4局', N.yueYuan('己巳').局数, 4);
eq('D4 癸酉（中元末）→ 中元4局', N.yueYuan('癸酉').局数, 4);
eq('D5 甲戌（下元首）→ 下元7局', N.yueYuan('甲戌').局数, 7);
eq('D6 戊寅（下元末）→ 下元7局', N.yueYuan('戊寅').局数, 7);
// 原文四组「上元」全核对
['甲子', '戊辰', '己卯', '癸未', '甲午', '戊戌', '己酉', '癸丑'].forEach(function (gz, i) {
  eq('D7.' + i + ' 上元组 ' + gz, N.yueYuan(gz).局数, 1);
});
// 原文三组「中元」
['己巳', '癸酉', '甲申', '戊子', '己亥', '癸卯', '甲寅', '戊午'].forEach(function (gz, i) {
  eq('D8.' + i + ' 中元组 ' + gz, N.yueYuan(gz).局数, 4);
});
// 原文四组「下元」
['甲戌', '戊寅', '己丑', '癸巳', '甲辰', '戊申', '己未', '癸亥'].forEach(function (gz, i) {
  eq('D9.' + i + ' 下元组 ' + gz, N.yueYuan(gz).局数, 7);
});
// 15 个月一循环
eq('D10 15 个月一循环（甲子与己卯同元同模）', [N.yueYuan('甲子').模15, N.yueYuan('己卯').模15], [0, 0]);

// ============ E. 值符随干、值使随支（原文两条规则） ============
console.log('== E. 值符随干 / 值使随支 ==');
// 遍历多个年柱：值符星须落「年干在地盘之宫」，值使门须落「年支临宫」
(function () {
  var bad = [];
  ['甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己巳', '庚午', '辛未', '壬申', '癸酉',
   '甲戌', '乙亥', '丙子', '丁丑', '戊寅', '己卯'].forEach(function (gz) {
    [[1, 1864], [4, 1924], [7, 1984]].forEach(function (jc) {
      var ju = jc[0], P = N.paiPan(ju, gz);
      // 值符：干在地盘宫（甲用旬首仪）
      var ganYi = P.干 === '甲' ? QM.XUNSHOU[QM.firstXunshou(gz)] : P.干;
      var expGanPal = QM.homeOf(QM.findHome(P.地盘, ganYi));
      var gotFu = 0; RING.forEach(function (p) { if (P.天盘[p] === P.值符星) gotFu = p; });
      if (gotFu !== expGanPal) bad.push(gz + '/' + ju + ' 值符未落干宫');
      // 值使：支临宫（ZHI_GONG）
      var expZhiPal = QM.homeOf(QM.ZHI_GONG[P.支]);
      var gotShi = 0; RING.forEach(function (p) { if (P.八门[p] === P.值使门) gotShi = p; });
      if (gotShi !== expZhiPal) bad.push(gz + '/' + ju + ' 值使未落支宫');
    });
  });
  eq('E1 值符恒落「干在地盘之宫」', bad.filter(function (x) { return /值符/.test(x); }), []);
  eq('E2 值使恒落「支临宫」', bad.filter(function (x) { return /值使/.test(x); }), []);
})();

// ============ F. 结构自洽（年家 + 月家抽样） ============
console.log('== F. 结构自洽 ==');
var bad = [];
[1864, 1900, 1924, 1960, 1984, 2004, 2024, 2026, 2043, 2044, 2100].forEach(function (yy) {
  [2, 7, 11].forEach(function (mm) {
    var c = N.nianChart({ y: yy, m: mm, d: 15 });
    if (c.err) { bad.push(yy + ' 年家 err'); return; }
    var tag = '年' + yy + '-' + mm;
    var ds = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (p) { return c.地盘[p]; }).sort().join('');
    if (ds !== '丁丙乙戊己庚辛壬癸'.split('').sort().join('')) bad.push(tag + ' 地盘九干不全');
    if (!(c.局数 >= 1 && c.局数 <= 9)) bad.push(tag + ' 局数越界');
    ['八门', '八神', '天盘'].forEach(function (k) {
      var v = RING.map(function (p) { return c[k][p]; });
      if (v.filter(Boolean).length !== 8 || new Set(v).size !== 8) bad.push(tag + ' ' + k + ' 不全');
    });
    // 阴阳遁恒为阴
    if (c.阴阳遁 !== '阴遁') bad.push(tag + ' 非阴遁');
  });
});
[1864, 1924, 1984, 2026, 2030].forEach(function (yy) {
  [1, 3, 5, 7, 9, 11, 12].forEach(function (mm) {
    var c = N.yueChart({ y: yy, m: mm, d: 15 });
    if (c.err) { bad.push(yy + '-' + mm + ' 月家 err'); return; }
    var tag = '月' + yy + '-' + mm;
    if (!(c.局数 >= 1 && c.局数 <= 9)) bad.push(tag + ' 局数越界');
    ['八门', '八神', '天盘'].forEach(function (k) {
      var v = RING.map(function (p) { return c[k][p]; });
      if (v.filter(Boolean).length !== 8 || new Set(v).size !== 8) bad.push(tag + ' ' + k + ' 不全');
    });
    // 天盘干 = 星本宫地盘干
    var S2H = {}; for (var hp in QM.STAR_HOME) S2H[QM.STAR_HOME[hp]] = +hp;
    RING.forEach(function (p) {
      var home = QM.homeOf(S2H[c.天盘[p]] || 2);
      if (c.天盘干[p] !== c.地盘[home]) bad.push(tag + ' 天盘干≠星本宫干');
    });
  });
});
eq('F1 年家/月家抽样结构自洽', bad.slice(0, 6), []);

// ============ G. 缺口与切段 ============
console.log('== G. 缺口 / 切段 / 非法输入 ==');
var cg = N.nianChart({ y: 2026, m: 2, d: 9 });
t('G1 年家缺口非空', cg.缺口.length >= 3);
t('G2 缺口声明算例已核（v3.1.58 文案演进）', cg.缺口.join('').indexOf('✅已核') >= 0);
t('G3 缺口提及年支映射差异', cg.缺口.join('').indexOf('ZHI_GONG') >= 0 || cg.缺口.join('').indexOf('地支宫位映射') >= 0);
var cy = N.yueChart({ y: 2026, m: 2, d: 9 });
t('G4 月家缺口提及另一派（年支定元）', cy.缺口.join('').indexOf('四孟') >= 0);
eq('G5 缺口文本无中文分号（切段安全）', cg.缺口.join('').indexOf('；'), -1);
t('G6 年家缺日期给 err', !!N.nianChart({}).err);
t('G7 月家缺日期给 err', !!N.yueChart({}).err);

// H. 年家完整外部算例逐宫比对（v3.1.58：易德轩 2004-08-06 甲申年·下元阴遁七局）
//   原文逐宫给出：地盘/天盘九星/天盘干/八门/八神。除八门外全部逐宫一致（八门为伏吟派分歧，见缺口）。
(function () {
  var c = N.nianChart({ y: 2004, m: 8, d: 6 });
  eq('H1 甲申年下元阴遁七局', [c.元, c.阴阳遁, c.局数].join('|'), '下元|阴遁|7');
  // 地盘 9/9（戊兑7 己乾6 庚中5 辛巽4 壬震3 癸坤2 丁坎1 丙离9 乙艮8）
  eq('H2 地盘逐宫 9/9', JSON.stringify(c.地盘),
    JSON.stringify({ 1: '丁', 2: '癸', 3: '壬', 4: '辛', 5: '庚', 6: '己', 7: '戊', 8: '乙', 9: '丙' }));
  // 天盘九星伏吟（各归本位）8/8
  eq('H3 天盘九星伏吟 8/8', JSON.stringify(c.天盘),
    JSON.stringify({ 1: '天蓬', 2: '天芮', 3: '天冲', 4: '天辅', 6: '天心', 7: '天柱', 8: '天任', 9: '天英' }));
  // 天盘干 8/8 + 天禽带中五之干（庚）寄坤二
  eq('H4 天盘干逐宫 8/8', JSON.stringify(c.天盘干),
    JSON.stringify({ 1: '丁', 2: '癸', 3: '壬', 4: '辛', 6: '己', 7: '戊', 8: '乙', 9: '丙' }));
  eq('H5 天禽寄坤二带中五之干庚', [c.禽宫, c.禽干].join('|'), '2|庚');
  // 值符/值使
  // H6：值符定名分歧——算例称天禽（中五本位），本项目称天芮（天禽寄坤二），落宫同为中五寄坤二
  t('H6 值符落宫=中五寄坤二（定名分歧已并列记录）', [c.旬首宫, c.值符星].join('|') === '5|天芮' && c.缺口.join('').indexOf('中五本位星定名分歧') >= 0);
  eq('H7 值使死门', c.值使门, '死');
  // 八神 8/8（一律逆排：值符坤2、螣蛇离9、太阴巽4、六合震3、白虎艮8、玄武坎1、九地乾6、九天兑7）
  eq('H8 八神逆排 8/8', JSON.stringify(c.八神),
    JSON.stringify({ 1: '玄武', 2: '值符', 3: '六合', 4: '太阴', 6: '九地', 7: '九天', 8: '白虎', 9: '螣蛇' }));
  // 八门：算例为伏吟派（各归本宫），本内核为环序铺开派——差异如实记录在缺口
  t('H9 八门差异如实记录（伏吟派分歧）', c.缺口.join('').indexOf('八门排法流派分歧') >= 0);
  t('H10 缺口声明已核状态（算例逐宫一致）', c.缺口.join('').indexOf('✅已核') >= 0);
})();

// I. 八门两派并列（v3.1.59）：伏吟局并列输出伏吟派，非伏吟局不出
(function () {
  var c = N.nianChart({ y: 2004, m: 8, d: 6 });   // 甲申年 = 伏吟局（值使死门落本宫坤二）
  t('I1 伏吟局给出伏吟派', !!c.八门_伏吟派);
  eq('I2 伏吟派 = 各门归本宫（算例派）', JSON.stringify(c.八门_伏吟派),
    JSON.stringify({ 1: '休', 2: '死', 3: '伤', 4: '杜', 6: '开', 7: '惊', 8: '生', 9: '景' }));
  t('I3 环序派与伏吟派在本局不同（分歧如实并列）', JSON.stringify(c.八门) !== JSON.stringify(c.八门_伏吟派));
  var c2 = N.nianChart({ y: 2026, m: 2, d: 9 });  // 非伏吟局
  t('I4 非伏吟局不给伏吟派（无分歧意义）', c2.八门_伏吟派 === null);
  t('I5 缺口声明两派已并列不裁定', c.缺口.join('').indexOf('并列输出') >= 0 && c.缺口.join('').indexOf('不合并不裁定') >= 0);
})();

console.log('\n通过 ' + pass + ' 项，失败 ' + fail + ' 项');
process.exit(fail ? 1 : 0);
