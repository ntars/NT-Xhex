/**
 * xiangshu.test.js —— 相术词库 结构 + 检索断言
 */
var XS = require('../xiangshu.js');

var pass = 0, fail = 0;
function t(name, cond) { if (cond) pass++; else { fail++; console.log('  ✗ ' + name); } }
function eq(name, got, exp) {
  var ok = JSON.stringify(got) === JSON.stringify(exp);
  if (ok) pass++; else { fail++; console.log('  ✗ ' + name + ' 期望 ' + JSON.stringify(exp) + ' 实际 ' + JSON.stringify(got)); }
}

t('面相十二宫12项', Object.keys(XS.MIAN_12).length === 12);
t('lookup 命宫有部位', XS.lookup('面相十二宫', '命宫') && XS.lookup('面相十二宫', '命宫').部位.indexOf('印堂') >= 0);
t('lookup 三停整体', XS.lookup('三停') && XS.lookup('三停').上停);
t('lookup 五官 鼻', XS.lookup('五官', '鼻') && XS.lookup('五官', '鼻').indexOf('财') >= 0);
t('lookup 手型 金形手', XS.lookup('手型', '金形手') && XS.lookup('手型', '金形手').性.indexOf('刚毅') >= 0);
t('lookup 骨相返九骨', XS.lookup('骨相').九骨.length === 9);
t('手型五行5类', Object.keys(XS.SHOU_TYPE).length === 5);
t('手相线含生命线', !!XS.SHOU_LINE.生命线);
t('痣相通论', XS.ZHI_XIANG.通论.indexOf('面无善痣') >= 0);
t('report 可查类别', XS.report().可查类别.length === 8);

console.log('\n相术词库测试：通过 ' + pass + ' / 失败 ' + fail);
process.exit(fail ? 1 : 0);
