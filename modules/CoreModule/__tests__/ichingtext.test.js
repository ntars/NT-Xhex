/**
 * modules/CoreModule/__tests__/ichingtext.test.js —— 周易六十四卦经文（iching-text.js）验收
 * 用法：node modules/CoreModule/__tests__/ichingtext.test.js
 *
 * 锁什么：
 *   ① 64 卦齐全、每卦 6 爻（乾多「用九」、坤多「用六」共 386 条）、字段非空、句读收尾；
 *   ② 通行卦序正确（1 乾 / 2 坤 / 11 泰 / 12 否 / 29 坎 / 30 离 / 63 既济 / 64 未济）——
 *      这条是回归：旧实现拿 HEX64 的键序当卦序，查「第11卦」会答成「泽火革」；
 *   ③ textOf 三种入参（卦序 / 全名 / 单名）指向同一卦；
 *   ④ 经文抽样与底本逐字一致（乾、坤、泰、既济、未济）；
 *   ⑤ 搜索框真跑：registry.run('zhouyi') 出「卦辞 / 爻辞 / 白话」，且不再答错卦。
 */
var T = require('../iching-text.js');
var I = require('../iching.js');
var R = require('../../features/registry.js');

var fails = 0;
function ok(c, m) { if (c) console.log('  ✓', m); else { fails++; console.log('  ✗', m); } }

console.log('== ① 结构完整性 ==');
ok(Object.keys(T.GUA).length === 64, '共 64 卦（实际 ' + Object.keys(T.GUA).length + '）');
var bad = [], yaoTotal = 0;
for (var i = 1; i <= 64; i++) {
  var g = T.GUA[i];
  if (!g) { bad.push(i + '缺'); continue; }
  if (!g.名 || !g.辞 || !g.象 || !g.白) bad.push(i + '字段缺');
  if (!Array.isArray(g.爻) || g.爻.length < 6) bad.push(i + '爻数不足');
  yaoTotal += (g.爻 || []).length;
  (g.爻 || []).forEach(function (y) { if (!y[0] || !y[1]) bad.push(i + '爻空'); });
  if (!/。$/.test(g.辞)) bad.push(i + '卦辞未收句号');
}
ok(bad.length === 0, '每卦字段齐全、爻辞非空、卦辞以句号收尾（异常：' + bad.join(',') + '）');
ok(yaoTotal === 386, '爻辞总数 386 = 384 + 用九 + 用六（实际 ' + yaoTotal + '）');
ok(T.GUA[1].爻.length === 7 && T.GUA[2].爻.length === 7, '乾坤各 7 条（含用九 / 用六）');

console.log('== ② 通行卦序（回归） ==');
var orderExpect = { 1: '乾', 2: '坤', 11: '泰', 12: '否', 29: '坎', 30: '离', 63: '既济', 64: '未济' };
var orderBad = [];
Object.keys(orderExpect).forEach(function (k) {
  if (T.GUA[k].名 !== orderExpect[k]) orderBad.push(k + '应为' + orderExpect[k] + '实为' + T.GUA[k].名);
});
ok(orderBad.length === 0, '八个抽查位次对得上通行序（异常：' + orderBad.join('；') + '）');
ok(I.ORDER_BY_NAME['地天泰'] === 11 && I.ORDER_BY_NAME['火水未济'] === 64, '全名→卦序表正确');

console.log('== ③ textOf 三种入参 ==');
ok(I.textOf(11).名 === '泰' && I.textOf('11').名 === '泰', '卦序 11 / "11" → 泰');
ok(I.textOf('地天泰').序 === 11 && I.textOf('泰').序 === 11, '全名「地天泰」与单名「泰」→ 第 11 卦');
ok(I.textOf('未济').序 === 64 && I.textOf('乾为天').序 === 1, '单名 / 重卦全名都能定位');
ok(I.textOf('不存在的卦') === null && I.textOf(65) === null, '越界与乱输入返回 null（不瞎猜）');

console.log('== ④ 经文抽样（对底本） ==');
ok(T.GUA[1].辞 === '元，亨，利，贞。', '乾卦辞');
ok(T.GUA[1].爻[0][1] === '潜龙，勿用。', '乾初九');
ok(T.GUA[2].爻[1][1] === '直、方、大，不习，无不利。', '坤六二');
ok(T.GUA[11].辞 === '小往大来，吉，亨。', '泰卦辞');
ok(T.GUA[63].辞 === '亨小，利贞。初吉终乱。', '既济卦辞');
ok(T.GUA[64].辞 === '亨。小狐汔济，濡其尾，无攸利。', '未济卦辞');
ok(T.GUA[15].爻[3][1].indexOf('撝谦') >= 0, '谦六四「撝谦」已按通行本补正（底本缺字）');
ok(T.GUA[26].爻[4][1].indexOf('豮豕') >= 0, '大畜六五「豮豕」已补正');

console.log('== ⑤ 搜索框真跑 ==');
var r = R.run('zhouyi', {}, '第11卦');
var txt = (r && r.text) || '';
ok(r && r.text, '「第11卦」有输出');
ok(txt.indexOf('地天泰') >= 0, '答的是「地天泰」而不是旧 bug 里的「泽火革」');
ok(txt.indexOf('卦辞：') >= 0 && txt.indexOf('爻辞：') >= 0 && txt.indexOf('白话：') >= 0, '卦辞 / 爻辞 / 白话齐全');
ok(txt.indexOf('拔茅茹') >= 0, '爻辞原文已带出（泰初九）');
ok(txt.indexOf('泽火革') < 0, '不再串卦');
var r2 = R.run('zhouyi', {}, '乾为天');
ok(r2 && /元，亨，利，贞/.test(r2.text) && /潜龙/.test(r2.text), '按全名查乾卦，经文正确');
var r3 = R.run('zhouyi', {}, '山火贲');
ok(r3 && /贲/.test(r3.text) && /贲其趾/.test(r3.text), '按全名查贲卦，爻辞正确');

console.log(fails === 0 ? '\n全部通过' : '\n' + fails + ' 处失败');
process.exit(fails === 0 ? 0 : 1);
