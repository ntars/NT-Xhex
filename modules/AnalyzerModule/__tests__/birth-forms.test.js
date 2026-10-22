/**
 * modules/AnalyzerModule/__tests__/birth-forms.test.js —— 生辰四形式 验收
 * 用法：node modules/AnalyzerModule/__tests__/birth-forms.test.js
 *
 * 锁七件事（任一条红了都不许提交）：
 *   ① 国历四种写法（2005年6月9日 / 2005-06-09 / 2005.6.9 / 2005/6/9）都解析成同一个日期；
 *   ② 农历中文写法（五月初三 / 廿三 / 腊月 / 冬月 / 闰月 / 二〇〇五）都能解析，且**换算成公历**；
 *   ③ 农历换算结果与 CoreModule 底座一致（已知锚点：农历二〇〇五年五月初三 = 2005-06-09）；
 *   ④ 四柱三种写法（空格分隔 / 年月日时带字 / 只给三柱）都能识别，四柱能反查成公历；
 *   ⑤ 「查农历 2026年8月15日」这类**换算请求**不会被当成农历日期（不重复换算）；
 *   ⑥ 生辰句里的「农历/公历/阴历/阳历」不算「点名算法」，完整生辰仍走全套排盘；
 *   ⑦ 不是生辰的输入一律 lastReject='birth'，且文案是用户指定的「请输入农历、国历、四柱、八字」。
 */
var A = require('../analyzer.js');
var I = require('../intent.js');
var L = require('../../CoreModule/lunar.js');

var fails = 0;
function ok(c, m) { if (c) console.log('  ✓', m); else { fails++; console.log('  ✗', m); } }
function ymd(e) {
  if (!e || !e.date) return null;
  return e.date.year + '-' + e.date.month + '-' + e.date.day;
}

// ---------------------------------------------------------------------------
console.log('== ① 国历四种写法 ==');
var solarForms = [
  '2005年6月9日 子时 女',
  '2005-06-09 00:30 女',
  '2005.6.9 子时 女',
  '2005/6/9 子时 女'
];
solarForms.forEach(function (q) {
  var e = I.parse(q).entities;
  ok(ymd(e) === '2005-6-9', q + ' → ' + ymd(e));
});

// ---------------------------------------------------------------------------
console.log('== ② 农历中文写法（数字日 / 中文日 / 特殊月 / 闰月 / 中文年）==');
var lunarCases = [
  ['农历2005年5月3日 子时 女', '2005-5-3'],
  ['农历2005年五月初三 子时 女', '2005-5-3'],
  ['二〇〇五年五月初三 子时 女', '2005-5-3'],
  ['二零零五年五月初三 子时 女', '2005-5-3'],
  ['农历2005年五月廿三 子时 女', '2005-5-23'],
  ['农历2005年五月三十 子时 女', '2005-5-30'],
  ['农历2005年腊月廿三 子时 女', '2005-12-23'],
  ['农历2005年冬月初十 子时 女', '2005-11-10'],
  ['农历2005年正月初一 子时 女', '2005-1-1']
];
lunarCases.forEach(function (c) {
  var e = I.parse(c[0]).entities;
  var got = e.date ? (e.date.year + '-' + e.date.month + '-' + e.date.day) : 'null';
  ok(got === c[1] && e.date && e.date.isLunar === true, c[0] + ' → ' + got + '（isLunar=' + (e.date && e.date.isLunar) + '）');
});
// 闰月：2004 年有闰二月（不是闰四月）——「闰四月初三」在 2004 应报错，在 2006 不成立
var leap = I.parse('农历2004年闰二月初三 子时 女').entities;
ok(leap.date && leap.date._lunarLeap === true, '闰月标记 _lunarLeap（' + ymd(leap) + '）');

// ---------------------------------------------------------------------------
console.log('== ③ 农历换算结果（analyzer 层归一为公历）==');
// 已知锚点：农历 2005 年五月初三 = 公历 2005-06-09（底座核对）
var anchor = L.fromLunar(2005, 5, 3, false, 0, 0, 0);
ok(anchor.solar.y === 2005 && anchor.solar.m === 6 && anchor.solar.d === 9,
  '底座锚点：农历二〇〇五年五月初三 = ' + anchor.solar.text);

var conv = I.parse('农历2005年五月初三 子时 女').entities;
ok(conv.date.isLunar === true, 'intent 层保留 isLunar 标记（供 analyzer 换算）');
// 走 analyze 后必须变成公历（全套结果首块「查黄历」显示的是公历日期）
var fullLunar = String(A.analyze('农历2005年五月初三 子时 女'));
ok(fullLunar.indexOf('2005年6月9日') >= 0, '农历生辰换算成公历 2005年6月9日 并出席全套排盘');
ok(fullLunar.indexOf('乙酉') >= 0 && fullLunar.indexOf('壬午') >= 0 && fullLunar.indexOf('甲子') >= 0,
  '换算正确 → 四柱应为 乙酉 壬午 甲子（实测出现）');

// ---------------------------------------------------------------------------
console.log('== ④ 四柱三种写法 ==');
var p1 = I.parse('乙酉 壬午 甲子 甲子 男').entities;
ok(p1._pillars && p1._pillars.length === 4 && p1._pillars[0] === '乙酉', '空格分隔四柱 → ' + JSON.stringify(p1._pillars));
ok(p1.name !== '乙酉', '四柱不被误当成人名（name=' + JSON.stringify(p1.name) + '）');
var p2 = I.parse('乙酉年壬午月甲子日甲子时 男').entities;
ok(p2._pillars && p2._pillars.length === 4, '年月日时带字 → ' + JSON.stringify(p2._pillars));
var p3 = I.parse('乙酉 壬午 甲子 男').entities;
ok(p3._pillars && p3._pillars.length === 3, '只给三柱 → ' + JSON.stringify(p3._pillars));
var three = I.parse('乙酉 壬午 甲子 男');
ok(three.intent === 'bazi' && !!three.prompt && three.prompt.indexOf('时辰') >= 0,
  '三柱追问时辰（' + String(three.prompt).slice(0, 24) + '…）');

// 反查：乙酉 壬午 甲子 甲子 → 2005-06-09（离今天最近的候选）
var pfull = String(A.analyze('乙酉 壬午 甲子 甲子 男'));
ok(pfull.indexOf('2005年6月9日') >= 0, '四柱反查到公历 2005年6月9日（首行 ' + pfull.split('\n')[0].slice(0, 32) + '）');
// 年份线索优先：显式给 1945 年 → 应取 1945 那个候选
var pHint = String(A.analyze('1945年的乙酉 壬午 甲子 甲子 男'));
ok(pHint.indexOf('1945年6月24日') >= 0, '年份线索优先取 1945-06-24（首行 ' + pHint.split('\n')[0].slice(0, 32) + '）');

// ---------------------------------------------------------------------------
console.log('== ⑤ 「查农历 X」是换算请求，不是农历日期 ==');
var q1 = I.parse('查农历 2026年8月15日').entities;
ok(q1.date && q1.date.isLunar === false, '「查农历 2026年8月15日」不标农历（isLunar=' + (q1.date && q1.date.isLunar) + '）');
var r1 = String(A.analyze('查农历 2026年8月15日'));
ok(r1.indexOf('2026年8月15日') >= 0 && r1.indexOf('农历：') >= 0, '换算结果仍是 2026年8月15日（' + r1.split('\n')[0] + '）');
var q2 = I.parse('公历换农历 2026年8月15日').entities;
ok(q2.date && q2.date.isLunar === false, '「公历换农历 …」同样不标农历');

// ---------------------------------------------------------------------------
console.log('== ⑥ 生辰句里的日期单位词不算「点名算法」==');
['2005年6月9日子时 女', '农历2005年五月初三 子时 女', '乙酉 壬午 甲子 甲子 男'].forEach(function (q) {
  var t = String(A.analyze(q));
  ok(A.lastHits() > 1 && A.lastSections() && A.lastSections().length >= 6,
    q + ' → 全套（hits=' + A.lastHits() + '，类数=' + (A.lastSections() ? A.lastSections().length : 0) + '）');
});
// 真点名仍只跑单块
A.analyze('排紫微 2005年6月9日子时 女');
ok(A.lastHits() === 1 && A.lastSections() === null, '「排紫微 …」只跑紫微单块（hits=' + A.lastHits() + '）');
A.analyze('查农历 2026年8月15日');
ok(A.lastHits() === 1 && A.lastSections() === null, '「查农历 …」不铺全套（hits=' + A.lastHits() + '）');

// ---------------------------------------------------------------------------
console.log('== ⑦ 不是生辰 → lastReject=birth 且文案是用户指定口径 ==');
var rejects = [
  ['帮我算算命', 'birth'],
  ['测测运气', 'birth'],
  ['算命', 'birth'],
  ['今天天气怎么样', 'nonmeta'],
  ['外卖点什么', 'nonmeta']
];
rejects.forEach(function (c) {
  var out = String(A.analyze(c[0]));
  ok(A.lastReject() === c[1], c[0] + ' → lastReject=' + A.lastReject());
  if (c[1] === 'birth') {
    ok(out.indexOf('请输入农历、国历、四柱、八字') === 0, c[0] + ' 文案以「请输入农历、国历、四柱、八字」开头');
    ok(out.indexOf('农历二〇〇五年五月初三') >= 0 && out.indexOf('乙酉 壬午 甲子 甲子') >= 0,
      c[0] + ' 三条例句齐全（农历 / 国历 / 四柱）');
  }
});
// 正常出结果时 lastReject 必须是 null（否则壳层会误弹窗、不跳结果页）
A.analyze('2005年6月9日子时 女');
ok(A.lastReject() === null, '正常生辰 → lastReject=null');
A.analyze('查黄历');
ok(A.lastReject() === null, '黄历查询 → lastReject=null（不属于「不是生辰」，不弹窗）');
// 农历日期不存在 / 四柱查不到 → 各自的原因码（壳层据此刻不同标题）
var bad = String(A.analyze('农历2004年闰四月初三 子时 女'));
ok(A.lastReject() === 'lunar' && bad.indexOf('这个农历日期不存在') === 0, '不存在的闰月 → lastReject=lunar');
var badP = String(A.analyze('甲子 甲子 甲子 甲子 甲子 男'));
ok(A.lastReject() === 'pillar' || A.lastReject() === null, '异常四柱不崩（lastReject=' + A.lastReject() + '）');

// ---------------------------------------------------------------------------
console.log('\n================================');
if (fails) { console.log('失败 ' + fails + ' 项'); process.exit(1); }
console.log('全部通过 ✓');
