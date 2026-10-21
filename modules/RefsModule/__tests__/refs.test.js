/**
 * modules/RefsModule/__tests__/refs.test.js —— 「参考文献」书目与可查原文校验
 * 用法：node modules/RefsModule/__tests__/refs.test.js
 *
 * 守两条红线：
 *   ① 版权边界：公版古籍才挂可查原文；开源库/现代著作/网站整理件（有版权）只列书目，
 *      **不允许**挂 quoter —— 这条是法律红线，写成断言，谁改谁红；
 *   ② 原文保真：可查原文必须与内核数据**逐字一致**（本模块只读不抄，条数也要对上），
 *      宁空不编（quoter 取不到 → 空数组，页面降级为「仅列书目」）。
 * 另锁：书目 id 唯一、字段齐全、refsPage 结构完整、与 settings.about() 派生一致。
 */
var R = require('../refs.js');
var Z = require('../../CoreModule/ziwei-duanyu.js');
var S = require('../../SettingsModule/settings.js');

var fails = 0;
function ok(cond, label, extra) {
  if (cond) console.log('  ✓ ' + label);
  else { fails++; console.log('  ✗ ' + label + (extra ? '（' + extra + '）' : '')); }
}

// ============ ① 书目表结构 ============
console.log('== ① 书目表结构 ==');
ok(R.BOOKS.length >= 30, '书目不少于 30 种（实际 ' + R.BOOKS.length + '）');
var ids = {};
var dup = [];
R.BOOKS.forEach(function (b) {
  if (ids[b.id]) dup.push(b.id);
  ids[b.id] = 1;
  if (!b.h || !b.朝代 || typeof b.公版 !== 'boolean' || !b.text) dup.push(b.id + ':字段缺失');
});
ok(dup.length === 0, '书目 id 唯一且字段齐全', dup.join('、'));

// ============ ② 版权边界（法律红线） ============
console.log('== ② 版权边界 ==');
// 有 quoter 的书必须公版；不公版的书必须没有 quoter（现代著作不载原文）
var badQuoter = R.BOOKS.filter(function (b) { return b.quoter && !b.公版; });
ok(badQuoter.length === 0, '有原文的书全部公版（版权作品不挂 quoter）', badQuoter.map(function (b) { return b.id; }).join('、'));
// 抽查三本已知版权书：小成图（霍斐然现代著作）/ iztro+中州派 / astronomy+Meeus
['xiaocheng', 'ziwei-iztro', 'astro', 'qimen-geju', 'qimen-rike'].forEach(function (id) {
  var b = R.BOOKS.filter(function (x) { return x.id === id; })[0];
  ok(!!b && b.公版 === false && !b.quoter, id + ' 为版权作品：仅列书目、无原文');
});
// 抽查两本已知公版书：必须有 quoter
['ziwei-benshu', 'yijing', 'guanyin', 'bifa'].forEach(function (id) {
  var b = R.BOOKS.filter(function (x) { return x.id === id; })[0];
  ok(!!b && b.公版 === true && !!b.quoter, id + ' 为公版古籍：附可查原文');
});

// ============ ③ 原文条数与内核逐一对应 ============
console.log('== ③ 原文条数（与内核数据一致） ==');
ok(R.quotesOf('ziwei-benshu').length === 168, '紫微 168 格（14 主星 × 12 宫，实际 ' + R.quotesOf('ziwei-benshu').length + '）');
ok(R.quotesOf('yijing').length === 64, '周易 64 卦（实际 ' + R.quotesOf('yijing').length + '）');
ok(R.quotesOf('guanyin').length === 100, '观音灵签 100 签（实际 ' + R.quotesOf('guanyin').length + '）');
ok(R.quotesOf('bifa').length === 100, '毕法赋 100 法（实际 ' + R.quotesOf('bifa').length + '）');
ok(R.quoteCount() === 442, '原文总计 442 条（实际 ' + R.quoteCount() + '）');
// 非公版/无 quoter 的书取原文必须为空（宁空不编）
ok(R.quotesOf('xiaocheng').length === 0 && R.quotesOf('lunar-js').length === 0, '版权书/无 quoter 书取原文为空');
ok(R.quotesOf('不存在的id').length === 0, '未知 id 取原文为空');

// ============ ④ 原文逐字保真（抽样对内核） ============
console.log('== ④ 原文逐字保真（抽样） ==');
var zw = R.quotesOf('ziwei-benshu');
var z0 = Z.STAR12['紫微'].原文[0];
ok(zw[0].h === '紫微 · 紫微居命宫' && zw[0].text === z0.文, '紫微首格与内核逐字一致');
var zwLast = Z.STAR12['破军'].原文.filter(function (q) { return q.宫 === '父'; })[0];
var zwFound = zw.filter(function (q) { return q.h === '紫微 · 破军居父母'; })[0];
ok(!!zwLast && !!zwFound && zwFound.text === zwLast.文, '紫微末格（破军居父母）与内核逐字一致');
var yj = R.quotesOf('yijing');
ok(yj[0].h === '周易 · 第1卦 乾' && yj[0].text.indexOf('卦辞：元，亨，利，贞。') === 0, '周易乾卦卦辞与内核一致');
var gy = R.quotesOf('guanyin');
ok(gy[0].h.indexOf('第1签') >= 0 && gy[0].text.indexOf('签诗：') === 0, '灵签第 1 签以签诗起头');
var bf = R.quotesOf('bifa');
ok(bf[22].h === '毕法 · 第23法 彼求我事支传干' && bf[22].text.indexOf('卷九上') >= 0, '毕法第 23 法归属卷九上');
ok(bf[70].h === '毕法 · 第71法 病符克宅全家患' && bf[70].text.indexOf('卷十一下') >= 0, '毕法第 71 法起归卷十一下');

// ============ ⑤ refsPage 面板结构 ============
console.log('== ⑤ refsPage 面板结构 ==');
var page = R.refsPage();
ok(page.length === 477, '面板条目 477 = 凡例1 + 总览1 + 书目31 + 原文导语1 + 原文442 + 示例1（实际 ' + page.length + '）');
var struct = page.every(function (x) { return x && typeof x.h === 'string' && x.h && typeof x.text === 'string' && x.text; });
ok(struct, '每条均为 {h, text} 且非空');
ok(page[0].h === '凡例 · 查证状态四档', '首条为凡例');
ok(page.filter(function (x) { return x.h === '一、书目与查证状态'; }).length === 1, '含「一、书目与查证状态」总览');
ok(page.filter(function (x) { return x.h === '二、可查原文 · 公版古籍'; }).length === 1, '含「二、可查原文」导语');
ok(page[page.length - 1].h === '算法示例（白玖玖）', '末条为算法示例');
// 凡例必须写明版权边界（用户可见的承诺）
ok(page[0].text.indexOf('现代著作') >= 0 && page[0].text.indexOf('不载原文') >= 0, '凡例向用户说明版权边界');
// 幂等：两次调用结果一致（快照机制依赖确定性）
ok(JSON.stringify(R.refsPage()) === JSON.stringify(R.refsPage()), 'refsPage 输出确定（幂等）');

// ============ ⑥ settings.about() 派生一致（Node 端走真源） ============
console.log('== ⑥ settings 派生 ==');
var refs = S.about().aboutNotes.refs;
ok(refs.length === page.length, 'settings.about().aboutNotes.refs 与 refsPage 一致（' + refs.length + ' 条）');
ok(JSON.stringify(refs) === JSON.stringify(page), 'settings 侧内容逐字一致（单一真源无漂移）');
ok(S.about().aboutNotes.intro.length >= 6, '功能介绍面板仍正常派生（' + S.about().aboutNotes.intro.length + ' 条）');

console.log(fails === 0 ? '\n[refs.test] 全部通过' : '\n[refs.test] 失败 ' + fails + ' 项');
process.exit(fails === 0 ? 0 : 1);
