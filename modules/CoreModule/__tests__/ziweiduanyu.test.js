/**
 * modules/CoreModule/__tests__/ziweiduanyu.test.js —— 紫微断语库自测
 *
 * 护栏目标（v3.1.46 新增）：
 *   ① 十四主星 × 十二宫 = 168 组断语 **齐全**（任一格缺失即判红）；
 *   ② 有古籍明文者必须「原文 + 白话」双全（遵铁律：原文必配白话）；
 *   ③ 无明文者标「推演」，不冒充古籍；
 *   ④ 十干四化表齐全、庚干分歧有标注；
 *   ⑤ 格局库字段完整（名/条件/断/吉凶/源）。
 */
var D = require('../ziwei-duanyu.js');

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}

console.log('=== 紫微断语库自测 ===\n');

console.log('A. 断语表规格');
ok('count 主星 = 14', D.count.主星 === 14, String(D.count.主星));
ok('count 宫断语 = 168', D.count.宫断语 === 168, String(D.count.宫断语));
ok('count 四化干 = 10', D.count.四化干 === 10, String(D.count.四化干));
ok('count 格局 ≥ 20', D.count.格局 >= 20, String(D.count.格局));

console.log('\nB. 十四主星 × 十二宫 无缺格');
var PAL = ['命', '兄', '夫', '子', '财', '疾', '迁', '友', '官', '田', '福', '父'];
var 缺 = [];
Object.keys(D.STAR12).forEach(function (star) {
  var d = D.STAR12[star].断 || {};
  PAL.forEach(function (p) { if (!d[p]) 缺.push(star + '·' + p); });
});
ok('168 格全部有白话断语', 缺.length === 0, 缺.slice(0, 8).join(','));

console.log('\nC. 有原文者必须「原文 + 白话」双全');
var bad = [];
Object.keys(D.STAR12).forEach(function (star) {
  (D.STAR12[star].原文 || []).forEach(function (it) {
    if (!it.文 || !it.文.trim()) bad.push(star + '·' + it.宫 + ' 原文空');
    if (PAL.indexOf(it.宫) < 0) bad.push(star + '·' + it.宫 + ' 宫键非法');
    var d = D.STAR12[star].断[it.宫];
    if (!d || !d.trim()) bad.push(star + '·' + it.宫 + ' 缺白话');
  });
});
ok('原文均非空且对应白话存在', bad.length === 0, bad.slice(0, 6).join(','));

console.log('\nD. duanyuOf 行为');
var a = D.duanyuOf('紫微', '夫妻');
ok('紫微·夫妻 有原文', a && !!a.原文);
ok('紫微·夫妻 源标古籍', a && /古籍/.test(a.源));
ok('紫微·夫妻 非推演', a && a.推 === false);
var b = D.duanyuOf('天机', '官禄');
ok('天机·官禄 无原文 → 标推演', b && b.推 === true && b.原文 === '');
ok('吃异名：交友 = 仆役', D.duanyuOf('天府', '交友') && D.duanyuOf('天府', '仆役') &&
  D.duanyuOf('天府', '交友').白 === D.duanyuOf('天府', '仆役').白);
ok('吃俗称：紫微星 = 紫微', D.duanyuOf('紫微星', '命宫') && D.duanyuOf('紫微星', '命宫').白 === D.duanyuOf('紫微', '命宫').白);
ok('未知星返回 null', D.duanyuOf('不存在的星', '命宫') === null);
ok('未知宫返回 null', D.duanyuOf('紫微', '不存在的宫') === null);

console.log('\nE. 四化表');
var gan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
var okGan = gan.every(function (g) {
  var x = D.sihuaOf(g);
  return x && x.禄 && x.权 && x.科 && x.忌;
});
ok('十干四化齐全（禄权科忌）', okGan);
ok('庚干标注流派分歧', D.sihuaOf('庚') && !!D.sihuaOf('庚').分歧);
ok('甲干四化正确（廉贞禄/破军权/武曲科/太阳忌）',
  (function () { var x = D.sihuaOf('甲'); return x.禄 === '廉贞' && x.权 === '破军' && x.科 === '武曲' && x.忌 === '太阳'; })());
ok('己干四化正确（武曲禄/贪狼权/天梁科/文曲忌）',
  (function () { var x = D.sihuaOf('己'); return x.禄 === '武曲' && x.权 === '贪狼' && x.科 === '天梁' && x.忌 === '文曲'; })());

console.log('\nF. 格局库');
var badG = D.GEJU.filter(function (g) { return !g.名 || !g.条件 || !g.断 || !g.吉凶 || !g.源; });
ok('格局字段完整（名/条件/断/吉凶/源）', badG.length === 0, badG.map(function (x) { return x.名; }).join(','));
ok('含「杀破狼」', D.gejuOf('杀破狼').length > 0);
ok('含「紫府朝垣」', D.gejuOf('紫府朝垣').length > 0);
ok('无参返回全部格局', D.gejuOf('').length === D.GEJU.length);

console.log('\nG. 行式断语');
var line = D.lineDuanyu('紫微', '夫妻');
ok('lineDuanyu 含星名/宫名/白话', line.indexOf('紫微坐夫妻') === 0 && line.length > 10);
ok('推演格标注「（推演）」', D.lineDuanyu('天机', '官禄').indexOf('（推演）') >= 0);
ok('古籍格标注「（古籍）」', D.lineDuanyu('紫微', '夫妻').indexOf('（古籍）') >= 0);

console.log('\n=== 紫微断语库自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
if (fail) process.exit(1);
