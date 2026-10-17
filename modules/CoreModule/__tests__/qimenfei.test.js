/**
 * modules/CoreModule/__tests__/qimenfei.test.js —— 奇门·飞盘（飞宫法）内核验收
 * 用法：node modules/CoreModule/__tests__/qimenfei.test.js
 *
 * 锁：以黄金范例（2006-12，丙戌日丙申时，阳遁一局，值符天辅·值使杜门）逐宫验证飞布几何。
 *     范例出处：易德轩 yi958 / 问玄阁 fateask / 灵匣 lnka.tw / qqhbx（同一范例彼此一致）。
 */
var F = require('../qimen-fei.js');
var QM = require('../qimen.js');

var pass = 0, fail = 0;
function t(name, cond) { if (cond) pass++; else { fail++; console.log('  ✗ ' + name); } }
function eq(name, got, exp) {
  if (JSON.stringify(got) === JSON.stringify(exp)) pass++;
  else { fail++; console.log('  ✗ ' + name + '\n     期望 ' + JSON.stringify(exp) + '\n     实际 ' + JSON.stringify(got)); }
}

// ===== 黄金范例：2006-12-23 16时 → 丙戌日丙申时；强制 阳遁一局 对齐范例 =====
// （范例原文写 12-22 但其四柱「丙戌日丙申时」实为 12-23，已核实；本内核定局走拆补法默认得阳7局，
//   故此处强制 局数=1 以对齐范例的冬至上元，仅用于验证「飞布几何」。）
var c = F.feiChart({ y: 2006, m: 12, d: 23, h: 16, 阴阳遁: '阳遁', 局数: 1 });
t('飞盘无 err', !c.err);

console.log('== 范例基准 ==');
eq('四柱时=丙申', c.四柱.时, '丙申');
eq('旬首=甲午', c.旬首, '甲午');
eq('值符星=天辅（旬首宫4→辅）', c.值符星, '天辅');
eq('值使门=杜门（旬首宫4→杜）', c.值使门, '杜门');
eq('时干宫=8（丙落艮八）', c.时干宫, 8);
eq('值使落宫=6（甲午4→乙未5→丙申6）', c.值使落宫, 6);

console.log('== 地盘 9/9（戊起局数宫，阳顺，中五保留）==');
eq('地盘', c.地盘, { 1: '戊', 2: '己', 3: '庚', 4: '辛', 5: '壬', 6: '癸', 7: '丁', 8: '丙', 9: '乙' });

console.log('== 天盘九星 9/9（飞数序 蓬1…英9，自值符辅@8 顺飞）==');
eq('天盘', c.天盘, {
  1: '天心', 2: '天柱', 3: '天任', 4: '天英', 5: '天蓬',
  6: '天芮', 7: '天冲', 8: '天辅', 9: '天禽'
});

console.log('== 人盘八门 8/8（八宫环跳中五，自值使杜@6）==');
eq('八门', c.八门, {
  1: '景门', 2: '休门', 3: '死门', 4: '伤门',
  6: '杜门', 7: '开门', 8: '惊门', 9: '生门'
});
t('中五宫无门', c.八门[5] === undefined);

console.log('== 神盘九神 9/9（阳遁九神，值符随时干宫@8 顺飞）==');
eq('九神', c.九神, {
  1: '太阴', 2: '六合', 3: '勾陈', 4: '太常', 5: '朱雀',
  6: '九地', 7: '九天', 8: '值符', 9: '螣蛇'
});

console.log('== 结构自洽（随机样例，阴阳遁各若干）==');
var bad = 0;
for (var i = 0; i < 120; i++) {
  var y = 1980 + (i % 40), mo = 1 + (i % 12), dd = 1 + (i % 28), hh = i % 24;
  var r = F.feiChart({ y: y, m: mo, d: dd, h: hh });
  if (r.err) continue;
  if (Object.keys(r.地盘).length !== 9) bad++;
  if (Object.keys(r.天盘).length !== 9) bad++;          // 九星满九宫（含中五）
  if (Object.keys(r.八门).length !== 8) bad++;          // 八门只占八宫（不入中五）
  if (Object.keys(r.九神).length !== 9) bad++;          // 九神满九宫
  if (r.八门[5] !== undefined) bad++;                   // 中五必无门
}
t('随机120例结构自洽（9/9/8/9 + 中五无门）', bad === 0);

console.log('== 与转盘(qimen.js)并列：同输入应同为阳遁/同节气 ==');
var b = QM.chart({ y: 2006, m: 12, d: 23, h: 16 });
var fb = F.feiChart({ y: 2006, m: 12, d: 23, h: 16 });
t('飞盘复用转盘定局（节气一致）', fb.节气 === b.节气);
t('飞盘默认用拆补定局（局数同转盘）', fb.局数 === b.局数);
t('飞盘与转盘流派不同（值符星可不同）', typeof fb.值符星 === 'string' && typeof b.值符星 === 'string');

console.log('\n飞盘奇门测试：通过 ' + pass + ' / 失败 ' + fail);
process.exit(fail ? 1 : 0);
