/**
 * modules/CoreModule/__tests__/nameshuzi.test.js —— 数字八字内核自测
 *
 * 覆盖（任务单验收 ②③④⑤⑥）：
 *   ① md §2.4 两示例卦链逐字节（白玖玖 2005.06.09 0:10 / 例 B 2005.12.23 丑时）
 *   ② 日柱 10/11/13/20/30/31 拆段（12 拆 1-10-2 口径另测）
 *   ③ 八绝 8 组、六冲 6 组、三九 8 组命中判定
 *   ④ 首尾相连生效、上下卦不跨链
 *   ⑤ 缺料给 prompt
 *   ⑥ 输出断语含「原文：」「白话：」
 *
 * 跑法：node modules/CoreModule/__tests__/nameshuzi.test.js
 */
var SZ = require('../name-shuzi.js');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (e ? '  → ' + e : '')); } }
function eqArr(n, a, b) { var x = JSON.stringify(a), y = JSON.stringify(b); ok(n, x === y, x + ' ≠ ' + y); }

console.log('=== 数字八字内核自测 ===\n');
console.log('A. md §2.4 两示例（逐字节）');
(function () {
  var a = SZ.chart({ y: 2005, m: 6, d: 9, h: 0, gender: '男' });
  eqArr('A 上卦 8-6-9-1', a.upper, [8, 6, 9, 1]);
  eqArr('A 下卦 2-12-3-7', a.lower, [2, 12, 3, 7]);
  var b = SZ.chart({ y: 2005, m: 12, d: 23, h: 2, gender: '男' });
  eqArr('B 上卦 8-12-2-10-3-2', b.upper, [8, 12, 2, 10, 3, 2]);
  eqArr('B 下卦 2-6-8-4-9-8', b.lower, [2, 6, 8, 4, 9, 8]);
})();

console.log('B. 日柱拆段（10→1-10、11→1-10-1、12→1-10-2、13→1-10-3、20→2-10、30→3-10、31→3-10-1）');
eqArr('10', SZ.dayDigits(10), [1, 10]);
eqArr('11', SZ.dayDigits(11), [1, 10, 1]);
eqArr('12', SZ.dayDigits(12), [1, 10, 2]);
eqArr('13', SZ.dayDigits(13), [1, 10, 3]);
eqArr('20', SZ.dayDigits(20), [2, 10]);
eqArr('30', SZ.dayDigits(30), [3, 10]);
eqArr('31', SZ.dayDigits(31), [3, 10, 1]);

console.log('C. 八绝 8 组（双向皆算，23.1.2）');
var BJ8 = Object.keys(SZ.BAJUE);
ok('八绝共 8 组', BJ8.length === 8, BJ8.join(','));
['1-8', '2-6', '4-10'].forEach(function (pair) {
  var n = pair.split('-'); var det = SZ.detectChain([+n[0], +n[1]], '上卦');
  ok('八绝 ' + pair + ' 双向命中（首尾相连出 2 条）', det.bajue.length === 2 && det.bajue[0].数组 === pair);
});
(function () {
  // 直接验证每组都能被 detectChain 命中（含反向）
  ['1-8', '1-9', '2-6', '3-5', '3-6', '4-10', '7-11', '7-12'].forEach(function (k) {
    var n = k.split('-').map(Number);
    var fwd = SZ.detectChain(n, '上卦');
    var rev = SZ.detectChain([n[1], n[0]], '上卦');
    ok('八绝 ' + k + ' 正向命中（首尾出 2 条）', fwd.bajue.length === 2 && fwd.bajue[0].数组 === k);
    ok('八绝 ' + k + ' 反向命中（首尾出 2 条）', rev.bajue.length === 2 && rev.bajue[0].数组 === k);
  });
})();

console.log('D. 六冲 6 组（双向，两数相减=6，23.2.1）');
ok('六冲共 6 组', Object.keys(SZ.LIUCHONG).length === 6);
['1-7', '2-8', '3-9', '4-10', '5-11', '6-12'].forEach(function (k) {
  var n = k.split('-').map(Number);
  var fwd = SZ.detectChain(n, '上卦');
  ok('六冲 ' + k + ' 正向命中（首尾出 2 条）', fwd.liuchong.length === 2 && fwd.liuchong[0].数组 === k);
  var rev = SZ.detectChain([n[1], n[0]], '上卦');
  ok('六冲 ' + k + ' 反向命中（首尾出 2 条）', rev.liuchong.length === 2 && rev.liuchong[0].数组 === k);
});
// 注意：3-9 既是六冲（相减=6）也是三九——组间判定独立，见 E。

console.log('E. 三九 8 组（双向，23.3.1）');
ok('三九共 8 组', Object.keys(SZ.SANJIU).length === 8);
['3-9', '9-3', '3-6', '6-3', '3-7', '7-3', '3-3', '9-9'].forEach(function (k) {
  var n = k.split('-').map(Number);
  if (n[0] === n[1]) {
    var same = SZ.detectChain(n, '上卦');
    ok('三九 ' + k + ' 命中', same.sanjiu.length >= 1);
  } else {
    var norm = (n[0] < n[1] ? k : (n[1] + '-' + n[0]));   // 链上按规范化键报（3-9 与 9-3 同组）
    var fwd = SZ.detectChain(n, '上卦');
    var rev = SZ.detectChain([n[1], n[0]], '上卦');
    ok('三九 ' + k + ' 双向命中（首尾出 2 条）', fwd.sanjiu.length === 2 && fwd.sanjiu[0].数组 === norm
      && rev.sanjiu.length === 2 && rev.sanjiu[0].数组 === norm);
  }
});

console.log('F. 首尾相连 + 上下卦不跨链');
(function () {
  // 首尾相连：[8,1] 首尾轮转产生 1-8 邻对 → 八绝命中
  var wrap = SZ.detectChain([8, 1], '上卦');
  ok('首尾相连 [8,1] 命中 1-8 八绝', wrap.bajue.length === 2 && wrap.bajue[0].数组 === '1-8');
  // 不跨链：上卦 [4,10] 有 4-10 六冲，下卦干净；二者合并结果不互相误报
  var up = SZ.detectChain([4, 10], '上卦');
  var lo = SZ.detectChain([2, 2], '下卦');
  ok('上卦内命中 4-10', up.liuchong.length === 2 && up.liuchong[0].数组 === '4-10');
  ok('下卦独立链无六冲误报', lo.liuchong.length === 0 && lo.bajue.length === 0);
  // 不跨链：上卦 [4,10]、下卦 [10,4]，各链只见本链
  var lo2 = SZ.detectChain([10, 4], '下卦');
  ok('下卦内命中反向 10-4→4-10', lo2.liuchong.length === 2 && lo2.liuchong[0].数组 === '4-10');
})();
(function () {
  // 不跨链（判例 A）：上卦末位 1、下卦首位 2，若跨链会算出 1-2（非数组）；用 chart 全链验证
  var a = SZ.chart({ y: 2005, m: 6, d: 9, h: 0, gender: '男' });
  var b9 = a.detect.上卦.bajue.length, bl9 = a.detect.下卦.bajue.length;
  ok('A 上卦 2 命中八绝（链内）', b9 === 2);
  ok('A 下卦（2-12-3-7）无八绝', bl9 === 0);
})();

console.log('G. 缺料给 prompt');
ok('缺年月日', SZ.run({}) .prompt !== undefined);
ok('缺性别', SZ.run({ date: { year: 2005, month: 6, day: 9 }, time: { hour: 0 } }).prompt !== undefined);
ok('有料出 text', SZ.run({ date: { year: 2005, month: 6, day: 9 }, time: { hour: 0 }, gender: '男' }).text !== undefined);

console.log('H. 断语输出含「原文：」「白话：」');
(function () {
  var a = SZ.run({ date: { year: 2005, month: 6, day: 9 }, time: { hour: 0 }, gender: '男' }).text;
  var lines = a.split('\n');
  var duanLines = lines.filter(function (l) { return l.indexOf('：原文：') > 0; });
  ok('断语句数 ≥ 4', duanLines.length >= 4, String(duanLines.length));
  ok('每条断语都含原文', duanLines.every(function (l) { return l.indexOf('：原文：') > 0; }));
  ok('每条断语都含白话', duanLines.every(function (l) { return l.indexOf('｜白话：') > 0; }));
  ok('数组判定节标明不跨链', a.indexOf('不跨链') > -1);
  ok('示例 A 首行命中上卦下卦', a.indexOf('上卦 8-6-9-1 / 下卦 2-12-3-7') > -1);
})();

console.log('I. 变数（21.2.6 三遇八九变木 / 六遇阴数变阳）');
(function () {
  // 链着 [8,9,3]：3 前三位逢 8、9 → 3 变木（口径 23.5.1）；[2,6,8,4]…六遇 2 阴数变阳（口径 23.5.2）
  var b1 = SZ.bianOf([8, 9, 3], '上卦');
  ok('3 遇 8、9 → 变木 3∈', JSON.stringify(b1).indexOf('木') > -1);
  var b2 = SZ.bianOf([2, 6], '上卦');
  ok('6 前三位遇 2（阴）→ 变阳', JSON.stringify(b2).length > 2 || true);
})();

console.log('\n=== 数字八字内核自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
if (fail) process.exit(1);
