/**
 * modules/HomeModule/__tests__/result-format.test.js —— 结果页排版（三分支）验收
 * 用法：node modules/HomeModule/__tests__/result-format.test.js
 *
 * 锁六件事（任一条红了都不许提交）：
 *   ① 单算法：`{title, lead, blocks}`，没有 multi / grouped 字段，旧壳层不受影响；
 *   ② 用户点名多个算法：`{multi, sections}`，每个【标题】一小节，不互相吞并；
 *   ③ 全套排盘：`{multi, grouped, groups}`，类→块→段落三级，类顺序 = 用户规定顺序；
 *   ④ **块边界只认「中点两侧有空格」** —— 块自带的紧凑标题（【择日·黄道吉日】
 *      【神煞断语·建除】）既不能被切成假块，也不能让单算法被误判成全套排盘；
 *   ⑤ 末尾「【需补充信息】」是类外尾巴，进 `note`，不占第八个「其他」类；
 *   ⑥ 恢复路径（只有文本、没传 sections）重建出的分组与有 sections 时**完全一致**。
 */
var RF = require('../result-format.js');
var A = require('../../AnalyzerModule/analyzer.js');
var FC = require('../../AnalyzerModule/full-chart.js');
var I = require('../../AnalyzerModule/intent.js');

var fails = 0;
function ok(c, m) { if (c) console.log('  ✓', m); else { fails++; console.log('  ✗', m); } }

var BIRTH = '白玖玖，女，2005年6月9日子时';

// ---------------------------------------------------------------------------
console.log('== ① 单算法形态不变 ==');

var one = RF.format('【八字排盘】白玖玖（女）2005年6月9日0时。\n四柱：乙酉 壬午 甲子 甲子');
ok(one.title === '八字排盘', '单算法 title 取自【标题】（实际：' + one.title + '）');
ok(!one.multi && !one.grouped, '单算法没有 multi/grouped 字段（旧壳层走原路径）');
ok(Array.isArray(one.blocks) && one.blocks.length > 0, '单算法有 blocks');

// ---------------------------------------------------------------------------
console.log('== ② 多算法并列（点名多个） ==');

var t2 = A.analyze(BIRTH + ' 奇门 六爻');
var f2 = RF.format(t2, true, A.lastSections());
ok(f2.multi === true, '多命中返回 multi');
ok(!f2.grouped, '点名两块**不是**全套排盘（grouped 为假）');
ok(f2.sections && f2.sections.length === 2, '切成 2 小节（实际 ' + (f2.sections ? f2.sections.length : 0) + '）');
var t2titles = f2.sections.map(function (s) { return s.title; });
ok(t2titles.indexOf('奇门遁甲') >= 0 && t2titles.indexOf('六爻纳甲') >= 0,
  '两小节标题各自独立（' + t2titles.join(' | ') + '））');

// ---------------------------------------------------------------------------
console.log('== ③ 全套排盘分组 ==');

var t3 = A.analyze(BIRTH);
var f3 = RF.format(t3, true, A.lastSections());
ok(f3.multi === true && f3.grouped === true, '全套排盘返回 multi + grouped');
ok(Array.isArray(f3.groups) && f3.groups.length === 7, '7 类有料（实际 ' + (f3.groups ? f3.groups.length : 0) + '）');

var want = ['万年历黄历', '八字命理', '紫微斗数', '六爻占卜', '奇门遁甲', '梅花易数', '风水堪舆'];
var got = f3.groups.map(function (g) { return g.name; });
ok(JSON.stringify(got) === JSON.stringify(want), '类顺序与用户规定一致（' + got.join('→') + '）');

var sum = f3.groups.reduce(function (n, g) { return n + g.count; }, 0);
ok(sum === 24, '块数合计 24（实际 ' + sum + '）');
ok(f3.groups.every(function (g) { return g.count === g.blocks.length; }), '每类项数与 blocks 长度一致');
ok(f3.groups.every(function (g) { return typeof g.name === 'string' && g.name && typeof g.short === 'string'; }), '分组键全是 ASCII（name/short/count），模板可直接渲染');

var blockTitles = [];
f3.groups.forEach(function (g) { g.blocks.forEach(function (s) { blockTitles.push(s.title); }); });
ok(blockTitles.every(function (t) { return /^\S+\s+·\s+\S+$/.test(t); }),
  '块标题都是「大类 · 短名」形态（首个：' + blockTitles[0] + '）');
ok(blockTitles.indexOf('其他') < 0 && got.indexOf('其他') < 0, '没有出现「其他」这种兜底类');

// ---------------------------------------------------------------------------
console.log('== ④ 块内紧凑标题不被误切 / 不误判 ==');

// 单跑一个择日：块自带标题【择日·黄道吉日】是紧凑写法，绝不能被当成全套排盘
var t4 = A.analyze(BIRTH + ' 想择日搬家');
var f4 = RF.format(t4, true, A.lastSections());
ok(!f4.grouped, '「择日」单跑不被误判成全套排盘（实际 grouped=' + !!f4.grouped + '）');
ok(!f4.groups || f4.groups.length === 0, '「择日」没有多出假的「择日」类');

// 黄历块自身的多个【】小标题不能被切碎成多小节
var t5 = A.analyze('查黄历');
var f5 = RF.format(t5, true, A.lastSections());
ok(!f5.grouped, '「查黄历」不是全套排盘');

// 构造一个含紧凑内标题的全套文本，确认内部标题仍留在块体内，不另起一节
var ent = I.parse(BIRTH).entities;
var full = FC.runAll(ent, BIRTH);
var fakeText = full.text;
var f6 = RF.format(fakeText, true, full.sections);
var heads6 = [];
f6.groups.forEach(function (g) { g.blocks.forEach(function (s) { heads6.push(s.title); }); });
ok(heads6.length === full.sections.reduce(function (n, s) { return n + s.blocks.length; }, 0),
  '块数与小节声明一致（' + heads6.length + '）');

var innerCut = heads6.filter(function (t) { return t.indexOf('神煞断语') >= 0 || t === '宜' || t === '忌'; });
ok(innerCut.length === 0, '块内的【神煞断语·建除】【宜】【忌】等没被切成独立块（误切：' + innerCut.join(',') + '）');

// ---------------------------------------------------------------------------
console.log('== ⑤ 需补充信息是类外尾巴 ==');

ok(typeof f3.note === 'string' && f3.note.length > 0, 'note 带出「需补充信息」正文');
ok(f3.note.indexOf('需额外条件') >= 0, 'note 说明需额外条件且可追问');
ok(got.indexOf('其他') < 0, '尾巴没占「其他」类（现在只有 7 类）');
var flatHasTail = f3.blocks.some(function (b) { return String(b.text).indexOf('【需补充信息】') === 0; });
ok(flatHasTail, '摊平视图（导出图片吃这个）里仍保留尾巴');

// 没有缺料时 note 应为空，不产生噪音
var noTail = RF.format('【甲类 · 查一】\n正文一。\n【乙类 · 查二】\n正文二。', true);
ok(noTail.grouped === true && !noTail.note, '没缺料时 note 为空（不产生噪音）');

// ---------------------------------------------------------------------------
console.log('== ⑥ 恢复路径（无 sections）与有 sections 一致 ==');

var back = RF.format(t3, true);      // 模拟刷新后只从本地存储拿到答案文本
ok(back.grouped === true, '恢复路径也能重建分组');
var gotBack = back.groups.map(function (g) { return g.name; });
ok(JSON.stringify(gotBack) === JSON.stringify(want), '恢复路径类顺序一致（' + gotBack.join('→') + '）');
var sumBack = back.groups.reduce(function (n, g) { return n + g.count; }, 0);
ok(sumBack === sum, '恢复路径块数一致（' + sumBack + ' vs ' + sum + '）');
ok(back.note === f3.note, '恢复路径 note 一致');

// ---------------------------------------------------------------------------
console.log('================================');
if (fails) { console.log('失败 ' + fails + ' 项'); process.exit(1); }
console.log('全部通过 ✓');
