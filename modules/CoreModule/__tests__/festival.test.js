/**
 * modules/CoreModule/__tests__/festival.test.js —— festival 内核自测
 *
 * 校验重点：
 *   ① 公历固定节日齐全（植树节/青年节/建党节/建军节/公祭日）；
 *   ② 法定节假日安排逐条对得上国务院公告（2024/2025/2026 各抽若干关键日）；
 *   ③ 「假期 / 调休上班 / 调休补休」三态判定正确，且**同一节日不会因调休判错**；
 *   ④ 未覆盖年份如实返回 null，不瞎猜；
 *   ⑤ 与 C01 底座合成后，节日名去重（元旦 / 元旦节 不重复出现）。
 *
 * 运行：node modules/CoreModule/__tests__/festival.test.js
 */
var F = require('../festival.js');
var S = require('../shensha.js');

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '　→ ' + extra : '')); }
}
function eq(name, actual, expect) {
  ok(name, actual === expect, '实际 ' + JSON.stringify(actual) + '，期望 ' + JSON.stringify(expect));
}

console.log('== ① 公历固定节日 ==');
eq('3-12 植树节', F.solarFixed(3, 12).join(), '植树节');
eq('5-4 青年节', F.solarFixed(5, 4).join(), '青年节');
eq('7-1 建党节', F.solarFixed(7, 1).join(), '建党节');
eq('8-1 建军节', F.solarFixed(8, 1).join(), '建军节');
eq('12-13 国家公祭日', F.solarFixed(12, 13).join(), '国家公祭日');
eq('10-23 平日无节日', F.solarFixed(10, 23).length, 0);

console.log('== ② 法定节假日安排（对国务院公告）==');
// 2026：元旦 1/1-1/3 放，1/4 上班；春节 2/15-2/23 放，2/14、2/28 上班
eq('2026-01-01 元旦假期', F.statutory(2026, 1, 1).名, '元旦');
eq('2026-01-02 属调休补休', F.statutory(2026, 1, 2).调休, true);
eq('2026-01-04 调休上班', F.statutory(2026, 1, 4).类型, '上班');
eq('2026-02-14 春节前补班', F.statutory(2026, 2, 14).类型, '上班');
eq('2026-02-23 春节末日', F.statutory(2026, 2, 23).名, '春节');
eq('2026-02-24 春节已过', F.statutory(2026, 2, 24), null);
eq('2026-05-09 劳动节后补班', F.statutory(2026, 5, 9).类型, '上班');
eq('2026-09-20 国庆前补班', F.statutory(2026, 9, 20).类型, '上班');
eq('2026-10-07 国庆末日', F.statutory(2026, 10, 7).名, '国庆节');
// 2025：春节 1/28-2/4；国庆中秋合并 10/1-10/8
eq('2025-01-28 春节首日', F.statutory(2025, 1, 28).名, '春节');
eq('2025-02-04 春节末日', F.statutory(2025, 2, 4).名, '春节');
eq('2025-10-08 国庆中秋末日', F.statutory(2025, 10, 8).名, '国庆节·中秋节');
// 2024：春节 2/10-2/17；劳动节 5/1-5/5，4/28 与 5/11 补班
eq('2024-02-10 春节首日', F.statutory(2024, 2, 10).名, '春节');
eq('2024-04-28 劳动节前补班', F.statutory(2024, 4, 28).类型, '上班');
eq('2024-11 劳动节后补班', F.statutory(2024, 5, 11).类型, '上班');

console.log('== ③ 三态判定互斥 ==');
// 一个日子不能同时是「假期」和「上班」
var dates = [[2026, 1, 4], [2026, 2, 14], [2026, 10, 1], [2025, 9, 28], [2024, 9, 29]];
var bad = dates.filter(function (d) {
  var st = F.statutory(d[0], d[1], d[2]);
  return st && st.类型 !== '假期' && st.类型 !== '上班';
});
ok('所有判定结果只在「假期 / 上班」两态', bad.length === 0, bad.map(function (d) { return d.join('-'); }).join('、'));
// 补班日必带调休标记
ok('调休上班日都带「调休」标记', F.statutory(2026, 1, 4).调休 === true);

console.log('== ④ 未覆盖年份如实返回 null ==');
eq('2019 年（未收录）', F.statutory(2019, 10, 1), null);
eq('2030 年（未收录）', F.statutory(2030, 1, 1), null);
ok('覆盖年份声明为 2024/2025/2026', F.YEARS.join() === '2024,2025,2026', F.YEARS.join());

console.log('== ⑤ 与底座合成去重 ==');
// 2026-01-01：底座给「元旦节」，法定名「元旦」，不能两个都留
var r1 = S.daily(2026, 1, 1);
eq('元旦只出现一次', r1.节日.filter(function (n) { return /元旦/.test(n); }).length, 1);
eq('2026-01-01 节日 = 元旦节', r1.节日.join(), '元旦节');
eq('2026-01-01 法定假期 = 元旦', r1.法定假期.名, '元旦');

// 春节：农历节日给「春节」，法定给「春节」，也只留一个
var r2 = S.daily(2026, 2, 17);
eq('春节只出现一次', r2.节日.filter(function (n) { return n === '春节'; }).length, 1);

// 公历节日原本缺失，现在必须有
var r3 = S.daily(2026, 10, 1);
ok('国庆节出现在节日里（原先缺失）', r3.节日.indexOf('国庆节') >= 0, r3.节日.join());
var r4 = S.daily(2026, 5, 1);
ok('劳动节出现在节日里（原先缺失）', r4.节日.indexOf('劳动节') >= 0, r4.节日.join());
var r5 = S.daily(2026, 3, 8);
ok('妇女节出现在节日里（原先缺失）', r5.节日.indexOf('妇女节') >= 0, r5.节日.join());

// 农历节日不受影响，仍在
var r6 = S.daily(2026, 9, 25);
ok('中秋节仍在（农历侧）', r6.节日.indexOf('中秋节') >= 0, r6.节日.join());

console.log('== ⑥ 黄历其余字段未被破坏 ==');
var r7 = S.daily(2026, 10, 23);
['值星', '天神', '二十八宿', '彭祖百忌', '宜', '忌', '冲煞'].forEach(function (k) {
  ok('字段仍在：' + k, r7[k] !== undefined && r7[k] !== '');
});
ok('节日字段类型为数组', Array.isArray(r7.节日));

console.log('=== festival 自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
process.exit(fail === 0 ? 0 : 1);
