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
t('chart 落宫标待验证', c.太乙落宫.indexOf('待黄金盘验证') >= 0);
t('chart 缺口说明', c.缺料.length > 0);

console.log('\n太乙内核测试：通过 ' + pass + ' / 失败 ' + fail);
process.exit(fail ? 1 : 0);
