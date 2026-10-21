/**
 * taiyi.test.js —— 太乙神数内核确定性断言（对照《太乙金镜式经》明文规则与 71 局示例）
 */
var TY = require('../taiyi.js');

var pass = 0, fail = 0;
function t(name, cond) { if (cond) pass++; else { fail++; console.log('  ✗ ' + name); } }
function eq(name, got, exp) {
  var ok = JSON.stringify(got) === JSON.stringify(exp);
  if (ok) pass++; else { fail++; console.log('  ✗ ' + name + ' 期望 ' + JSON.stringify(exp) + ' 实际 ' + JSON.stringify(got)); }
}

// 积年：724 年 ⇒ 1937281（金镜式经明文）
eq('积年(724)', TY.jinian(724), 1937281);
eq('积年(2026)', TY.jinian(2026), 1937281 + (2026 - 724));

// 入局数 / 元序 / 阴阳遁
var rj = TY.ruju(2026);
eq('入局数(2026)', rj.入局数, 55);
t('元序(2026)=4(壬子)', rj.元序 === 4 && rj.元名 === '壬子');
t('2026 阳遁', rj.阴阳 === '阳');
// 入局数范围
t('入局数 1..72', rj.入局数 >= 1 && rj.入局数 <= 72);

// 十六神全表（16 神，首神地主）
eq('十六神数量', TY.SHEN16.length, 16);
t('十六神首=地主', TY.SHEN16[0].名 === '地主' && TY.SHEN16[0].神 === '子');
t('十六神含大义(亥)', TY.SHEN16[15].名 === '大义' && TY.SHEN16[15].神 === '亥');

// 天目（文昌）对照金镜式经示例：入局 71 ⇒ 阳遁大武坤 / 阴遁和德艮
var tm阳 = TY.tianmu(71, false);
t('天目(71,阳)=大武(坤)', tm阳.名 === '大武' && tm阳.神 === '坤');
var tm阴 = TY.tianmu(71, true);
t('天目(71,阴)=和德(艮)', tm阴.名 === '和德' && tm阴.神 === '艮');
// 入局 55（2026）阳遁 ⇒ 余数1 ⇒ 武德(申)
var tm55 = TY.tianmu(55, false);
t('天目(55,阳)=武德(申)', tm55.名 === '武德' && tm55.神 === '申');

// 计神 / 始击 结构自洽（不臆造具体值，仅结构）
var js = TY.jishen(55, false);
t('计神为十二支之一', '子丑寅卯辰巳午未申酉戌亥'.indexOf(js.地支) >= 0);
var sj = TY.shiji(55, false);
t('始击为十六神之一', TY.SHEN16.some(function (s) { return s.名 === sj.十六神; }));

// chart 聚合
var c = TY.chart({ y: 2026 });
t('chart 无 err', !c.err);
t('chart 阳遁', c.阴阳遁 === '阳');
t('chart 天目含武德', c.天目文昌.indexOf('武德') >= 0);
// v3.1.56：落宫两说并列；主口径「三年一宫」。v3.1.58：年份落宫取得两独立算例交叉锁定（已核）
t('chart 落宫主口径为三年一宫', c.太乙落宫.indexOf('三年一宫') >= 0, c.太乙落宫);
t('chart 落宫并列九局一宫（流派异说不合并）', c.落宫_九局一宫 && c.落宫_九局一宫.indexOf('九局一宫') >= 0, c.落宫_九局一宫);
t('chart 落宫标「两独立算例交叉锁定」（v3.1.58 状态升级，依旧不称已锁）', c.太乙落宫.indexOf('两独立算例交叉锁定') >= 0, c.太乙落宫);
t('chart 缺口说明含两说不合并', c.缺料.indexOf('并列不合并') >= 0);
t('chart 缺口如实记明网传算例非年份锁定', c.缺料.indexOf('非年份算例') >= 0 || c.缺料.indexOf('起局规则') >= 0);

// ===== v3.1.56 太乙落宫·三年一宫（周期结构五源一致 + 自洽已验）=====
console.log('太乙落宫·三年一宫');
// ① 周期自洽：24 年一周（1588 与 1612 同宫）；3 年递进一宫
t('三年一宫：24 年一周（1588 与 1612 同宫）', TY.taiyiPalace3(TY.jinian(1588), false) === TY.taiyiPalace3(TY.jinian(1612), false),
  TY.taiyiPalace3(TY.jinian(1588), false) + ' vs ' + TY.taiyiPalace3(TY.jinian(1612), false));
t('三年一宫：相邻三年递进一宫', (function () {
  var a = TY.taiyiPalace3(TY.jinian(1588), false), b = TY.taiyiPalace3(TY.jinian(1591), false);
  var BAGUA8 = [1, 2, 3, 4, 6, 7, 8, 9];
  return BAGUA8.indexOf(b) === (BAGUA8.indexOf(a) + 1) % 8;
})(), 'ok');
// ② 八宫不入中五（永不出 5）
t('三年一宫：八宫俱不入中五（多年扫描无 5）', (function () {
  for (var y = 1500; y <= 2100; y++) {
    var v = TY.taiyiPalace3(TY.jinian(y), y % 2 === 0);
    if (v === 5) return false;
    if ([1, 2, 3, 4, 6, 7, 8, 9].indexOf(v) < 0) return false;
  }
  return true;
})(), 'ok');
// ③ 阴阳遁互为逆序（同一积年，阳遁第 k 步 = 阴遁第 7−k 步）
t('三年一宫：阴阳遁逆序（阳 idx 与阴 idx 互补）', (function () {
  var BAGUA8 = [1, 2, 3, 4, 6, 7, 8, 9];
  for (var y = 1600; y <= 1700; y++) {
    var p = TY.taiyiPalace3(TY.jinian(y), false), q = TY.taiyiPalace3(TY.jinian(y), true);
    if (BAGUA8.indexOf(p) + BAGUA8.indexOf(q) !== 7) return false;
  }
  return true;
})(), 'ok');
// ④ 与九局一宫是两套（多数年份不同，证明未混用）
t('三年一宫与九局一宫为两套（存在分歧年份）', (function () {
  var diff = 0;
  for (var y = 1900; y <= 2026; y++) {
    var r = TY.ruju(y);
    if (TY.taiyiPalace3(TY.jinian(y), r.阴) !== TY.taiyiPalace(r.入局数, r.阴)) diff++;
  }
  return diff > 0;
})(), 'ok');

// v3.1.58：年份落宫两个独立算例交叉锁定（DestinyNet 2004 例 / 中国易学网 2026 岁局）
(function () {
  function palaceOf(y) {
    var r = TY.ruju(y);
    return TY.taiyiPalace3(TY.jinian(y), r.阴);
  }
  eq('2004 年落艮三宫（DestinyNet：10155921%24=9，艮三宫第 3 年）', palaceOf(2004), 3);
  eq('2026 年落艮三宫（易学网岁局：343%24=7，艮三宫第 1 年理天）', palaceOf(2026), 3);
  eq('2005 年落震四宫（2004 第 3 年之后入下一宫，周期自洽）', palaceOf(2005), 4);
  eq('1990 年落坎八宫（长周期抽样自洽）', palaceOf(1990), 8);
  // 24 年一周：1980 与 2004 同宫（相差 24 年）
  eq('24 年一周：1980 与 2004 同落艮三宫', palaceOf(1980), palaceOf(2004));
  // 输出文案已升级为「已核」（两独立算例），不再写「待黄金盘」
  t('输出状态升级为 ✅已核（两独立算例交叉锁定）',
    String(TY.chart({ y: 2004 }).太乙落宫).indexOf('两独立算例交叉锁定') >= 0);
})();

console.log('\n太乙内核测试：通过 ' + pass + ' / 失败 ' + fail);
process.exit(fail ? 1 : 0);
