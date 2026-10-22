/**
 * modules/RefsModule/__tests__/refs.test.js —— 「参考文献」书目清单校验
 * 用法：node modules/RefsModule/__tests__/refs.test.js
 *
 * 守四条红线（v3.2.2 起本页只列书名与作者，按板块分组）：
 *   ① 书目 id 唯一、字段齐全、组都在 GROUPS 登记表内；
 *   ② 分组自洽：每组至少一本、booksOf 过滤与「组」字段一致、每本书只归一个组；
 *   ③ refsPage 面板结构完整：凡例 → 组标题（书名）→ 查原文指引，每条 {h, text} 非空；
 *   ④ 与 settings.about() 派生一致（单一真源无漂移），关键书目在列。
 * 另锁两条「不臆造」口径：数字八字（本项目独有）不列书目、凡例如实说明。
 */
var R = require('../refs.js');
var S = require('../../SettingsModule/settings.js');

var fails = 0;
function ok(cond, label, extra) {
  if (cond) console.log('  ✓ ' + label);
  else { fails++; console.log('  ✗ ' + label + (extra ? '（' + extra + '）' : '')); }
}

// ============ ① 书目表结构 ============
console.log('== ① 书目表结构 ==');
ok(R.BOOKS.length >= 20, '书目不少于 20 种（实际 ' + R.BOOKS.length + '）');
var groupNames = R.GROUPS.map(function (g) { return g.名; });
var ids = {};
var dup = [];
R.BOOKS.forEach(function (b) {
  if (ids[b.id]) dup.push(b.id);
  ids[b.id] = 1;
  if (!b.id || !b.组 || !b.书名 || !b.作者) dup.push(b.id + ':字段缺失');
  if (groupNames.indexOf(b.组) < 0) dup.push(b.id + ':组未登记');
});
ok(dup.length === 0, '书目 id 唯一、字段齐全、组已登记', dup.join('、'));

// ============ ② 分组自洽 ============
console.log('== ② 分组自洽 ==');
var emptyGroup = R.GROUPS.filter(function (g) { return R.booksOf(g.名).length === 0; });
ok(emptyGroup.length === 0, '每组至少一本书（空组：' + emptyGroup.map(function (g) { return g.名; }).join('、') + '）');
var sum = 0;
R.GROUPS.forEach(function (g) { sum += R.booksOf(g.名).length; });
ok(sum === R.BOOKS.length, '各组书目数之和 = 书目总数（' + sum + ' / ' + R.BOOKS.length + '）');
var crossGroup = R.BOOKS.filter(function (b) { return R.booksOf(b.组).indexOf(b) < 0; });
ok(crossGroup.length === 0, '每本书都能在所属组里取到（booksOf 与「组」字段一致）');

// ============ ③ refsPage 面板结构 ============
console.log('== ③ refsPage 面板结构 ==');
var page = R.refsPage();
var expectLen = 1 + R.GROUPS.filter(function (g) { return R.booksOf(g.名).length; }).length + R.BOOKS.length + 1;
ok(page.length === expectLen, '面板条目数 = 凡例1 + 组标题N + 书目N + 查原文1（期望 ' + expectLen + '，实际 ' + page.length + '）');
var struct = page.every(function (x) { return x && typeof x.h === 'string' && x.h && typeof x.text === 'string' && x.text; });
ok(struct, '每条均为 {h, text} 且非空');
ok(page[0].h === '凡例', '首条为凡例');
ok(page[page.length - 1].h === '查原文', '末条为查原文指引');
// 组标题行（一、二、…）数量 = 非空组数；书目行书名必须带《》
var headRows = page.filter(function (x) { return /^[一二三四五六]、/.test(x.h); });
var nonEmptyGroups = R.GROUPS.filter(function (g) { return R.booksOf(g.名).length; });
ok(headRows.length === nonEmptyGroups.length, '组标题行数 = 非空组数（' + headRows.length + ' / ' + nonEmptyGroups.length + '）');
var bookRows = page.filter(function (x) { return x.h.indexOf('《') === 0 && x.h.indexOf('》') > 0; });
ok(bookRows.length === R.BOOKS.length, '书目行数 = 书目总数（' + bookRows.length + ' / ' + R.BOOKS.length + '）');
// 幂等：两次调用结果一致（快照机制依赖确定性）
ok(JSON.stringify(R.refsPage()) === JSON.stringify(R.refsPage()), 'refsPage 输出确定（幂等）');

// ============ ④ settings 派生一致（Node 端走真源） ============
console.log('== ④ settings 派生 ==');
var refs = S.about().aboutNotes.refs;
ok(refs.length === page.length, 'settings.about().aboutNotes.refs 与 refsPage 一致（' + refs.length + ' 条）');
ok(JSON.stringify(refs) === JSON.stringify(page), 'settings 侧内容逐字一致（单一真源无漂移）');

// ============ ⑤ 关键书目在列（与内核头注释一一对应） ============
console.log('== ⑤ 关键书目在列 ==');
var refsAll = page.map(function (r) { return r.h + ' ' + r.text; }).join('\n');
var mustBook = ['子平真诠', '穷通宝鉴', '滴天髓', '金函玉镜', '奇门遁甲统宗', '奇门宝鉴',
  '大六壬指南', '心印赋', '毕法赋', '六壬大全', '增删卜易', '卜筮正宗', 'iztro', '沈氏玄空学',
  '周易小成图简述', '紫微斗数全书', 'lunar-javascript', '灵觉经'];
var missBook = mustBook.filter(function (b) { return refsAll.indexOf(b) < 0; });
ok(missBook.length === 0, '关键书目全部在列（缺：' + missBook.join('，') + '）');

// ============ ⑥ 不臆造口径 ============
console.log('== ⑥ 不臆造口径 ==');
// 数字八字为本项目独有体系：书目里不许出现，凡例必须如实说明
var szBook = R.BOOKS.filter(function (b) { return b.书名.indexOf('数字八字') >= 0; });
ok(szBook.length === 0, '数字八字（本项目独有）不列书目');
ok(page[0].text.indexOf('数字八字') >= 0 && page[0].text.indexOf('独有') >= 0, '凡例如实说明数字八字无外部文献');
// 只列书名与作者：页面不得出现旧版的「查证状态四档」长文
ok(refsAll.indexOf('查证状态四档') < 0, '页面已无查证状态长文（只留书名与作者）');

console.log(fails === 0 ? '\n[refs.test] 全部通过' : '\n[refs.test] 失败 ' + fails + ' 项');
process.exit(fails === 0 ? 0 : 1);
