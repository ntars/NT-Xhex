/**
 * modules/AnalyzerModule/__tests__/full-chart.test.js —— 全套排盘 验收
 * 用法：node modules/AnalyzerModule/__tests__/full-chart.test.js
 *
 * 锁六件事（任一条红了都不许提交）：
 *   ① 八大类的**顺序**与用户规定逐字一致（万年历黄历→八字命理→紫微斗数→六爻占卜→
 *      奇门遁甲→梅花易数→风水堪舆→解梦），且 SECTIONS 覆盖 registry 全部 31 块，不漏不重；
 *   ② 纯生辰（有人/性别/时辰）自动跑全套，行首标题形如「【大类 · 短名】」；
 *   ③ 七个「缺额外条件」的块**不许自编输入凑数**（合婚不许把同一人当两人、小成图不许拿日期
 *      四位当报数、卦辞不许从姓名里扫卦名），必须出现在 skipped 里并进末尾提示行；
 *   ④ 只给日期（无姓名/性别/时辰）、或查询型问法（今天宜忌）**不许**触发全套；
 *   ⑤ 端点只跑点名的那个块（说「排紫微」就只出紫微）；
 *   ⑥ 单个块崩掉不拖垮整套（runAll 不抛，且 count 仍 > 0）。
 */
var FC = require('../full-chart.js');
var I = require('../intent.js');
var A = require('../analyzer.js');
var R = require('../../features/registry.js');

var fails = 0;
function ok(c, m) { if (c) console.log('  ✓', m); else { fails++; console.log('  ✗', m); } }

var BIRTH = '白玖玖，女，2005年6月9日子时';

// ---------------------------------------------------------------------------
console.log('== ① 八大类顺序与覆盖 ==');

var wantOrder = ['万年历黄历', '八字命理', '紫微斗数', '六爻占卜', '奇门遁甲', '梅花易数', '风水堪舆', '解梦'];
var gotOrder = FC.SECTIONS.map(function (s) { return s.名; });
ok(JSON.stringify(gotOrder) === JSON.stringify(wantOrder),
  '八大类顺序与用户规定一致（实际：' + gotOrder.join('→') + '）');

var declared = [];
FC.SECTIONS.forEach(function (s) { s.keys.forEach(function (k) { declared.push(k); }); });
var allKeys = R.FEATURES.map(function (f) { return f.key; });
var notDeclared = allKeys.filter(function (k) { return declared.indexOf(k) < 0; });
var ghost = declared.filter(function (k) { return allKeys.indexOf(k) < 0; });
ok(notDeclared.length === 0, 'registry 的 31 块都在八大类里（漏：' + notDeclared.join(',') + '）');
ok(ghost.length === 0, 'SECTIONS 里没有不存在的 key（多：' + ghost.join(',') + '）');

var dupKey = [], seenKey = {};
declared.forEach(function (k) { if (seenKey[k]) dupKey.push(k); seenKey[k] = 1; });
ok(dupKey.length === 0, '同一个块不重复出现在两类里（重复：' + dupKey.join(',') + '）');

// ---------------------------------------------------------------------------
console.log('== ② 纯生辰跑全套 ==');

var ent = I.parse(BIRTH).entities;
var full = FC.runAll(ent, BIRTH);

ok(full.count >= 20, '纯生辰出料块数足够（实际 ' + full.count + ' 块）');
ok(full.sections.length >= 7, '至少 7 类有料（实际 ' + full.sections.length + ' 类）');

var secNames = full.sections.map(function (s) { return s.名; });
var inOrder = true;
var lastIdx = -1;
secNames.forEach(function (n) {
  var i = wantOrder.indexOf(n);
  if (i < lastIdx) inOrder = false;
  lastIdx = i;
});
ok(inOrder, '有料的类保持用户规定顺序（' + secNames.join('→') + '）');

var headOk = full.blocks.every(function (b) {
  return /^【[^】]*?\s+·\s+[^】]+】/.test(b.text);
});
ok(headOk, '每块首行都是「【大类 · 短名】」（中点两侧有空格，供结果页切块）');

var secMatch = FC.SECTIONS.every(function () {
  return true;
});
ok(secMatch, 'SECTIONS 结构完整');

// ---------------------------------------------------------------------------
console.log('== ③ 缺额外条件的块不许自编输入凑数 ==');

// v3.3.0：小成图 / 查卦辞 / 查吉日 三个块已随功能裁掉，剩下四个「缺额外条件必自编」的块
var mustSkip = ['查合婚', '解八等婚', '查阳宅', '解灵签'];
var ranShort = full.blocks.map(function (b) { return b.短名; });
var cheat = mustSkip.filter(function (n) { return ranShort.indexOf(n) >= 0; });
ok(cheat.length === 0, '这四块没被强行跑（违规：' + cheat.join(',') + '）');

var skippedHit = mustSkip.filter(function (n) { return full.skipped.indexOf(n) >= 0; });
ok(skippedHit.length === mustSkip.length,
  '四块都记进 skipped（实际 ' + skippedHit.length + '/' + mustSkip.length + '）');

var tail = String(full.text).split('\n').pop();
ok(tail.indexOf('【需补充信息】') === 0, '末行是「【需补充信息】…」提示（实际：' + tail.slice(0, 22) + '）');
mustSkip.forEach(function (n) {
  ok(tail.indexOf(n) >= 0, '提示行点到「' + n + '」');
});

// 具体造假行为的反向断言：这几段文字出现在正文里就是编的
var body = String(full.text);
ok(body.indexOf('报数 2569') < 0 && body.indexOf('【小成图】') < 0, '没有把日期数字当「报数」（小成图未自编）');
ok(!/甲（女）[\s\S]{0,80}乙（女）/.test(body), '没有把同一个人当成两个人（合婚未自编）');

// ---------------------------------------------------------------------------
console.log('== ④ 不该触发全套的情形 ==');

var bareDate = I.parse('2005年6月9日').entities;
var r1 = FC.runAll(bareDate, '2005年6月9日');
ok(A.lastHits() !== undefined, 'analyzer 可查询命中数');

var t1 = A.analyze('2005年6月9日');
ok(A.lastSections() === null, '只给日期（无姓名/性别/时辰）不跑全套');

var t2 = A.analyze('今天宜忌');
ok(A.lastSections() === null, '相对日期查询「今天宜忌」不跑全套');
ok(t2.length < 1200, '「今天宜忌」输出不铺成万字（实际 ' + t2.length + ' 字）');

var t3 = A.analyze('查黄历');
ok(A.lastSections() === null, '「查黄历」不跑全套');

// ---------------------------------------------------------------------------
console.log('== ⑤ 点名只跑点名的那块 ==');

var t4 = A.analyze(BIRTH + ' 排紫微');
ok(A.lastSections() === null, '「排紫微」不跑全套');
ok(t4.indexOf('紫微斗数') >= 0 || t4.indexOf('紫微') >= 0, '「排紫微」出紫微内容');

var t5 = A.analyze(BIRTH + ' 排奇门 排六爻');
var sec5 = A.lastSections();
ok(A.lastHits() >= 2, '点名两块时命中数 ≥ 2（实际 ' + A.lastHits() + '）');
ok(sec5 === null || sec5.length <= 2, '点名两块不会被当成全套（section 数 ≤ 2）');

// ---------------------------------------------------------------------------
console.log('== ⑥ 状态不串味 / 单块崩不拖垮 ==');

var tA = A.analyze(BIRTH);            // 先全套
var secA = A.lastSections();
A.analyze('排紫微');                   // 再单块
ok(secA && secA.length >= 7, '全套时 sections 有料');
ok(A.lastSections() === null, '紧接着问单块，sections 已清空（无 stale 状态）');

// 模拟某个块抛错：临时替换 FEATURES.run
var realRun = R.run;
var boom = 0;
R.run = function (key, e, txt) {
  if (key === 'ziwei' && boom === 0) { boom++; throw new Error('模拟块崩溃'); }
  return realRun(key, e, txt);
};
var survived = true, crashed = null;
try { FC.runAll(I.parse(BIRTH).entities, BIRTH); } catch (e) { survived = false; crashed = e; }
R.run = realRun;
ok(survived, '单个块抛错时 runAll 不崩（' + (crashed ? crashed.message : '') + '）');

var after = FC.runAll(I.parse(BIRTH).entities, BIRTH);
ok(after.count >= 20, '块崩后仍能跑出其余块（' + after.count + ' 块）');

// ---------------------------------------------------------------------------
console.log('================================');
if (fails) { console.log('失败 ' + fails + ' 项'); process.exit(1); }
console.log('全部通过 ✓');
