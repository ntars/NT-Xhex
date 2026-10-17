/**
 * modules/CoreModule/__tests__/cezi.test.js —— 测字内核（数理五行 + 先天起卦 + 增删法）验收
 * 用法：node modules/CoreModule/__tests__/cezi.test.js
 */
var CZ = require('../cezi.js');
var KX = require('../kangxi-strokes.js');

var pass = 0, fail = 0;
function t(name, cond) { if (cond) pass++; else { fail++; console.log('  ✗ ' + name); } }
function eq(name, got, exp) {
  if (JSON.stringify(got) === JSON.stringify(exp)) pass++;
  else { fail++; console.log('  ✗ ' + name + '\n     期望 ' + JSON.stringify(exp) + '\n     实际 ' + JSON.stringify(got)); }
}

console.log('== 康熙笔画（复用 kangxi-strokes 单一真源）==');
t('kangxi 表已接入', !!CZ.strokeOf && !!KX.KANGXI);
eq('好=6画', CZ.strokeOf('好'), 6);
eq('王=4画', CZ.strokeOf('王'), 4);
eq('财=10画', CZ.strokeOf('财'), 10);
eq('不在表内返回 null（不臆造）', CZ.strokeOf('財'), null); // 繁体不在 3500 简体表

console.log('== 数理五行（尾数：1/2木 3/4火 5/6土 7/8金 9/0水）==');
eq('6→土', CZ.wxOfTail(6), '土');
eq('4→火', CZ.wxOfTail(4), '火');
eq('10(尾0)→水', CZ.wxOfTail(10), '水');
eq('8→金', CZ.wxOfTail(8), '金');
eq('2→木', CZ.wxOfTail(2), '木');

console.log('== 先天八卦起卦（笔画%8，余0=坤8）==');
eq('6画→坎(6)', [CZ.guaOfStrokes(6).卦名, CZ.guaOfStrokes(6).先天数], ['坎', 6]);
eq('4画→震(4)', [CZ.guaOfStrokes(4).卦名, CZ.guaOfStrokes(4).先天数], ['震', 4]);
eq('10画→兑(2)', [CZ.guaOfStrokes(10).卦名, CZ.guaOfStrokes(10).先天数], ['兑', 2]);
eq('8画→坤(8，整除)', [CZ.guaOfStrokes(8).卦名, CZ.guaOfStrokes(8).先天数], ['坤', 8]);
eq('乾1', CZ.guaOfStrokes(1).卦名, '乾');
eq('卦五行 坎=水', CZ.guaOfStrokes(6).五行, '水');

console.log('== 五行生克关系（客观）==');
eq('金生水', CZ.relBetween('金', '水'), '金生水');
eq('水克火', CZ.relBetween('水', '火'), '水克火');
eq('同=比和', CZ.relBetween('木', '木'), '比和');

console.log('== analyze 主流程 ==');
var a = CZ.analyze({ 字: '好' });
t('无 err', !a.err);
eq('好 总画 6', a.总康熙笔画, 6);
eq('好 总数理五行 土', a.总数理五行, '土');
eq('好 卦 坎', a.卦.卦名, '坎');
t('断语多条', a.断语.length >= 3);
// 财（水）问财运（金）→ 金生水
var b = CZ.analyze({ 字: '财', 事: '财运' });
eq('财 问财运 → 金生水', b.五行比对, ['水 ↔ 金：金生水']);
// 增删法
var c = CZ.analyze({ 字: '十' });
t('十 出增删断语', c.断语.some(function (d) { return d.indexOf('加一笔可作') >= 0; }));
// 缺字不臆造
var d = CZ.analyze({ 字: '好財' });
eq('缺字 財', d.缺字, ['財']);
eq('缺字时总画置 null（不臆造）', d.总康熙笔画, null);
t('缺料有说明', d.缺料.indexOf('不臆造') >= 0);
// 无输入
t('无字给 err', !!CZ.analyze({}).err);
t('空串给 err', !!CZ.analyze({ 字: '   ' }).err);
// 限制如实标注
t('说明含「部首不可行」限制', a.说明.indexOf('部首') >= 0 && a.说明.indexOf('Unicode') >= 0);
t('说明含「未做自动取部首」', a.说明.indexOf('未做自动取部首') >= 0);

console.log('\n测字内核测试：通过 ' + pass + ' / 失败 ' + fail);
process.exit(fail ? 1 : 0);
