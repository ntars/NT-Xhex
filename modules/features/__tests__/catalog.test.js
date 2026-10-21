/**
 * modules/features/__tests__/catalog.test.js —— 板块分类 / 短名 / 功能介绍页数据 验收
 * 用法：node modules/features/__tests__/catalog.test.js
 *
 * 锁四件事（任一条红了都不许提交）：
 *   ① 每个功能都有 板块（必须是 BANKS 里登记的）、短名（查/排/解 开头）、说明（简介的源）；
 *   ② 短名能被搜索框路由命中它自己 —— 介绍页写着「排八字」，用户照着打就必须真的出八字盘；
 *   ③ catalog() 与 FEATURES 完全对得上：不漏、不重、项数之和 = 功能总数；
 *   ④ settings 的「功能介绍」页确实吃到了 catalog（汇总行 + 每板块条目行数），
 *      首页滚动建议每条都以 查/排/解 开头、≤9 字、且真能答得出来。
 */
var R = require('../registry.js');
var S = require('../../SettingsModule/settings.js');
var A = require('../../AnalyzerModule/analyzer.js');

var fails = 0;
function ok(c, m) { if (c) console.log('  ✓', m); else { fails++; console.log('  ✗', m); } }

var FEATURES = R.FEATURES;
var BANKS = R.BANKS.map(function (b) { return b.名; });

console.log('== ① 每条功能的元数据 ==');
var missBank = FEATURES.filter(function (f) { return BANKS.indexOf(f.板块) < 0; });
ok(missBank.length === 0, '板块都在 BANKS 登记表内（异常：' + missBank.map(function (f) { return f.key; }).join(',') + '）');

var badShort = FEATURES.filter(function (f) { return !/^[查排解].{1,5}$/.test(String(f.短名 || '')); });
ok(badShort.length === 0, '短名都是「查/排/解 + 2~6 字」（异常：' + badShort.map(function (f) { return f.key + '=' + f.短名; }).join(',') + '）');

var dupShort = [], seen = {};
FEATURES.forEach(function (f) { if (seen[f.短名]) dupShort.push(f.短名); seen[f.短名] = 1; });
ok(dupShort.length === 0, '短名不重复（重复：' + dupShort.join(',') + '）');

var noDesc = FEATURES.filter(function (f) { return !String(f.说明 || '').trim(); });
ok(noDesc.length === 0, '每条功能都有说明（缺：' + noDesc.map(function (f) { return f.key; }).join(',') + '）');

console.log('== ② 短名可被路由命中自己 ==');
var selfMiss = [];
FEATURES.forEach(function (f) {
  var hit = R.match(f.短名);
  if (!hit || hit.key !== f.key) selfMiss.push(f.短名 + '→' + (hit ? hit.key : 'null'));
});
ok(selfMiss.length === 0, '照着短名问能命中该功能（异常：' + selfMiss.join('；') + '）');

console.log('== ③ catalog() 与 FEATURES 一致 ==');
var cat = R.catalog();
ok(cat.length === BANKS.length, '板块数 = ' + BANKS.length + '（实际 ' + cat.length + '）');
var total = 0, allKeys = [];
cat.forEach(function (b) {
  total += b.项数;
  ok(b.项数 > 0 && b.项数 === b.items.length, '「' + b.板块 + '」项数自洽（' + b.项数 + '）');
  b.items.forEach(function (it) { allKeys.push(it.key); });
});
ok(total === FEATURES.length, '项数之和 = 功能总数 ' + FEATURES.length + '（实际 ' + total + '）');
ok(allKeys.length === FEATURES.length && new Set(allKeys).size === FEATURES.length, '每项只出现一次、无遗漏');
var noBrief = [];
cat.forEach(function (b) { b.items.forEach(function (it) { if (!it.简介 || it.简介.length > 29) noBrief.push(it.短名 + '(' + it.简介.length + ')'); }); });
ok(noBrief.length === 0, '简介非空且 ≤29 字（异常：' + noBrief.join(',') + '）');

console.log('== ④ 功能介绍页 / 首页建议 ==');
var about = S.about();
var intro = about.aboutNotes.intro;
ok(intro[0].h === '怎么切换主题', '「怎么切换主题」仍置顶');
var sumItem = intro.filter(function (x) { return x.h === '能问什么'; })[0];
ok(!!sumItem && sumItem.text.indexOf(String(total)) >= 0, '汇总行写明总项数 ' + total);

var bankItems = intro.filter(function (x) { return /、.+ · \d+ 项$/.test(String(x.h || '')); });
ok(bankItems.length === cat.length, '介绍页板块条目数 = ' + cat.length + '（实际 ' + bankItems.length + '）');
var rowBad = [];
cat.forEach(function (b, i) {
  var it = bankItems[i];
  if (!it) { rowBad.push(b.板块 + '缺条目'); return; }
  var rows = String(it.text).split('\n');
  if (rows.length !== b.项数 + 1) rowBad.push(b.板块 + ' 行数 ' + rows.length + '≠' + (b.项数 + 1));
});
ok(rowBad.length === 0, '每板块正文 = 说明 1 行 + 功能 N 行（异常：' + rowBad.join('，') + '）');

var hints = about.searchHints;
ok(hints.length === 9, '首页建议 9 条（实际 ' + hints.length + '）');
// v3.1.30：三类前缀都要有（查/排/解统一）；缺一类即视为未统一
var hasPrefix = { 查: false, 排: false, 解: false };
hints.forEach(function (h) { var p = String(h || '').charAt(0); if (hasPrefix[p] === false) hasPrefix[p] = true; });
ok(hasPrefix.查 && hasPrefix.排 && hasPrefix.解, '首页建议覆盖 查/排/解 三类（实际：查 ' + hasPrefix.查 + ' 排 ' + hasPrefix.排 + ' 解 ' + hasPrefix.解 + '）');
var badHint = [];
hints.forEach(function (h) {
  if (!/^[查排解]/.test(h)) badHint.push(h + ' 非查/排/解 开头');
  if (h.length > 9) badHint.push(h + ' 超 9 字');
  var out = A.analyze(h);
  var txt = typeof out === 'string' ? out : (out.text || out.prompt || '');
  if (!txt || txt.indexOf('仅限玄学与传统文化') >= 0) badHint.push(h + ' 答不出（落到话题守卫）');
});
ok(badHint.length === 0, '每条建议都能答出来（异常：' + badHint.join('；') + '）');

console.log('== ⑤ 参考文献页（v3.1.31 方案 B：书目+对应内核+查证状态；v3.1.57 增公版古籍可查原文）==');
var refs = about.aboutNotes.refs;
ok(refs.length >= 25, '参考文献条目 ≥25 条（实际 ' + refs.length + '）');
ok(refs[0].h.indexOf('凡例') >= 0, '第一条是凡例（查证状态四档说明）');
// v3.1.57 起页面分两区：
//   ① 「一、书目与查证状态」——书目条目，每条必须带四档状态标记之一
//      （凡例条自身讲四档定义、示例条讲排盘例，豁免）；
//   ② 「二、可查原文 · 公版古籍」——古籍原文条目，原文本身不带状态标记，
//      查证状态在其所属书目条目与导语中说明（版权书只列书目、不进此区）。
// 故状态标记要求只覆盖书目区；原文区改查「导语存在 + 432 条公版原文 + 无版权书混入」。
var cutIdx = refs.map(function (r) { return r.h; }).indexOf('二、可查原文 · 公版古籍');
var bookZone = cutIdx >= 0 ? refs.slice(1, cutIdx) : refs.slice(1);
var noStatus = [];
bookZone.forEach(function (r) {
  // 结构性条目（凡例/总览/示例）不承载单书状态，豁免；其余书目条目必须带四档之一
  if (r.h.indexOf('凡例') >= 0 || r.h.indexOf('一、书目与查证状态') >= 0 || r.h.indexOf('算法示例') >= 0) return;
  if (!/✅已锁|✅已核|⚠单源待验|◆/.test(r.text)) noStatus.push(r.h);
});
ok(noStatus.length === 0, '书目区每条都标注查证状态档（缺：' + noStatus.join('，') + '）');
ok(cutIdx >= 0, '含「二、可查原文」导语（公版古籍原文区）');
var quoteZone = cutIdx >= 0 ? refs.slice(cutIdx) : [];
ok(quoteZone.filter(function (r) { return /^紫微 · |^周易 · |^灵签 · |^毕法 · /.test(r.h); }).length === 432,
  '原文区 432 条公版古籍原文（紫微168+周易64+灵签100+毕法100，实际 '
  + quoteZone.filter(function (r) { return /^紫微 · |^周易 · |^灵签 · |^毕法 · /.test(r.h); }).length + '）');
// 版权边界（法律红线）：原文区只允许这四个公版书系的前缀，现代著作/网站整理件不得混入
var quoteOnly = quoteZone.filter(function (r) {
  return r.h.indexOf('二、可查原文') < 0 && r.h.indexOf('算法示例') < 0
    && !/^紫微 · |^周易 · |^灵签 · |^毕法 · /.test(r.h);
});
ok(quoteOnly.length === 0, '原文区无其他内容混入（版权书只列书目）', quoteOnly.map(function (r) { return r.h; }).join('、'));
// 关键古籍必须出现在页面上（与内核头注释一一对应）
var refsAll = refs.map(function (r) { return r.h + r.text; }).join('');
var mustBook = ['金函玉镜', '子平真诠', '穷通宝鉴', '滴天髓', '奇门遁甲统宗', '大六壬指南', '心印赋', '毕法赋', '六壬大全', '大六壬金口诀', '增删卜易', '卜筮正宗', '黄金策', '金镜式经', 'iztro', 'astronomy-engine', 'Meeus', '沈氏玄空学', '神相全编', '测字秘牒', '周易小成图简述', 'lunar-javascript'];
var missBook = mustBook.filter(function (b) { return refsAll.indexOf(b) < 0; });
ok(missBook.length === 0, '关键古籍/库全部在列（缺：' + missBook.join('，') + '）');
// 「本项目独有」必须如实存在（数字命理），不许假装有权威
ok(refsAll.indexOf('本项目独有') >= 0, '自研项如实标「本项目独有」（数字命理）');
// 单源待验项必须如实存在（不许全员✅美化）
ok(/⚠单源待验/.test(refsAll), '单源待验项如实标注（刻家奇门等）');

console.log(fails === 0 ? '\n全部通过' : '\n' + fails + ' 处失败');
process.exit(fails === 0 ? 0 : 1);
