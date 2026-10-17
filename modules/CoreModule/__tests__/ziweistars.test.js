/**
 * modules/CoreModule/__tests__/ziweistars.test.js —— 紫微「星情 + 宫义」数据自测
 * 覆盖：14 主星 / 14 辅星 / 12 宫齐全、天干与阴阳五行自洽、化气非空、
 *       异名解析（交友=仆役、事业=官禄）、合成句带「合成」标识、
 *       与 ziwei.js（iztro 安星）的星名/宫名口径对得上。
 * 跑法：node modules/CoreModule/__tests__/ziweistars.test.js
 */
var S = require('../ziwei-stars.js');
var Z = require('../ziwei.js');

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}

console.log('A. 表结构（14 主星 / 14 辅星 / 12 宫）');
ok('十四主星 14 条', S.STAR14.length === 14, S.STAR14.length);
ok('辅煞星 14 条', S.MINOR.length === 14, S.MINOR.length);
ok('十二宫 12 条', S.PAL.length === 12, S.PAL.length);
ok('count 汇总正确', S.count.主星 === 14 && S.count.辅星 === 14 && S.count.宫 === 12);

// 十四主星名（通书次序：紫微起，按紫微系 + 天府系顺序）
var 应主星 = ['紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军'];
ok('主星名与 iztro 口径一致（starNames 完全相同）',
  S.STAR14.map(function (x) { return x.名; }).join(',') === Z.starNames.join(','),
  S.STAR14.map(function (x) { return x.名; }).join(',') + ' vs ' + Z.starNames.join(','));
ok('主星名集合 = 通书十四主星', 应主星.every(function (n) { return !!S.starOf(n); }));

var 辅应 = ['禄存', '左辅', '右弼', '文昌', '文曲', '天魁', '天钺', '天马', '擎羊', '陀罗', '火星', '铃星', '地空', '地劫'];
ok('辅煞星名 = 六吉 + 六煞 + 禄存天马', 辅应.every(function (n) { return !!S.starOf(n); }) &&
  辅应.length === S.MINOR.length);

console.log('B. 字段完整性（不许空白项混进来）');
var 缺 = [];
S.STAR14.forEach(function (s) {
  ['名', '干', '五', '化气', '斗', '主', '人物', '性', '优', '缺', '业'].forEach(function (k) {
    if (!s[k] || !String(s[k]).replace(/\s/g, '')) 缺.push(s.名 + '.' + k);
  });
  if (!s.词 || s.词.length < 3) 缺.push(s.名 + '.词');
});
ok('14 主星全部字段非空且关键词 ≥3 个', 缺.length === 0, 缺.join(' '));
var 缺2 = [];
S.MINOR.forEach(function (s) {
  ['名', '五', '化气', '吉凶', '类', '性'].forEach(function (k) { if (!s[k]) 缺2.push(s.名 + '.' + k); });
  if (['吉', '凶'].indexOf(s.吉凶) < 0) 缺2.push(s.名 + '.吉凶=' + s.吉凶);
});
ok('14 辅星字段非空且吉凶只取吉/凶', 缺2.length === 0, 缺2.join(' '));
var 缺3 = S.PAL.filter(function (p) { return !p.宫 || !p.职 || !p.主; });
ok('12 宫都有 宫/职/主', 缺3.length === 0, 缺3.map(function (p) { return p.宫; }).join(' '));

console.log('C. 天干 ↔ 阴阳五行自洽（阳干配阳行、阴干配阴行）');
// 甲丙戊庚壬为阳干、乙丁己辛癸为阴干；「五」字段首字为该星阴阳，须与天干阴阳一致
var 阳干 = '甲丙戊庚壬', 错 = [];
S.STAR14.forEach(function (s) {
  if (阳干.indexOf(s.干) < 0 && '乙丁己辛癸'.indexOf(s.干) < 0) { 错.push(s.名 + ' 干=' + s.干); return; }
  var 干阳 = 阳干.indexOf(s.干) >= 0;
  var 行阳 = s.五.charAt(0) === '阳';
  var 行阴 = s.五.charAt(0) === '阴';
  if (!行阳 && !行阴) { 错.push(s.名 + ' 五=' + s.五); return; }
  if (干阳 !== 行阳) 错.push(s.名 + ' ' + s.干 + ' vs ' + s.五);
});
ok('14 主星天干阴阳与五行阴阳全部一致（无一处颠倒）', 错.length === 0, 错.join(' '));
ok('五行用字只在 木火土金水 之内', S.STAR14.every(function (s) {
  return '木火土金水'.indexOf(s.五.charAt(1)) >= 0;
}), S.STAR14.map(function (s) { return s.名 + s.五; }).join(' '));
ok('星名不重复（主星与辅星互不相犯）', (function () {
  var all = S.STAR14.map(function (x) { return x.名; }).concat(S.MINOR.map(function (x) { return x.名; }));
  return all.filter(function (x, i) { return all.indexOf(x) === i; }).length === all.length;
})());

console.log('D. 查询与异名（交友=仆役、事业=官禄）');
ok('starOf 命中主星并标类别', S.starOf('紫微').类别 === '主星' && S.starOf('紫微').化气 === '尊');
ok('starOf 命中辅星并标类别', S.starOf('擎羊').类别 === '辅星' && S.starOf('擎羊').吉凶 === '凶');
ok('starOf 未收录返回 null（不瞎猜）', S.starOf('天姚') === null && S.starOf('') === null);
ok('palOf 正名直取', S.palOf('财帛').职 === '钱财');
ok('palOf 异名：交友 → 仆役', S.palOf('交友').宫 === '仆役' && S.palOf('交友宫').宫 === '仆役');
ok('palOf 异名：事业 → 官禄', S.palOf('事业').宫 === '官禄' && S.palOf('官禄宫').宫 === '官禄');
ok('palOf 未收录返回 null', S.palOf('夫妻宫宫') === null && S.palOf('') === null);
ok('starOf 返回浅拷贝（改返回值不污染真源）', (function () {
  var a = S.starOf('紫微'); a.名 = '改坏了';
  return S.STAR14[0].名 === '紫微' && S.starOf('紫微').名 === '紫微';
})());

console.log('E. 文本生成（一行可读、带口径标识）');
var l1 = S.line14('紫微');
ok('line14 带名 + 化气 + 性格 + 宜业', /^紫微（己·阴土·化气为尊/.test(l1) && /长处/.test(l1) && /宜业/.test(l1), l1.slice(0, 30));
ok('line14 对辅星返回空串（不混用）', S.line14('左辅') === '');
ok('line14 对未收录星返回空串', S.line14('天姚') === '');
ok('lineMinor 带五行 + 化气 + 吉凶', /^左辅（阳土·阳助·吉）/.test(S.lineMinor('左辅')));
ok('lineMinor 对主星返回空串', S.lineMinor('紫微') === '');
ok('brief14 只取主调一句（不含「；」）', S.brief14('天机').indexOf('；') < 0, S.brief14('天机'));
ok('comb 主星 × 宫 带「合成」标识', /（合成）$/.test(S.comb('天府', '财帛')) && S.comb('天府', '财帛').indexOf('库藏') >= 0);
ok('comb 辅星 × 宫 走「宫见星」写法', /^仆役见天魁：/.test(S.comb('天魁', '交友')), S.comb('天魁', '交友'));
ok('comb 未收录返回空串', S.comb('天姚', '命宫') === '' && S.comb('紫微', '不存在宫') === '');

console.log('F. 与安星内核口径对得上（真盘十二宫全部可解析）');
var c = Z.chart({ y: 1990, m: 8, d: 15, h: 14, gender: 'male' });
ok('紫微盘可造（1990-08-15 14时 男）', !c.err, c.err || '');
var 宫名 = c.十二宫.map(function (p) { return p.宫; });
ok('盘面 12 个宫名都能被 palOf 解析', 宫名.every(function (n) { return !!S.palOf(n); }),
  宫名.filter(function (n) { return !S.palOf(n); }).join(' '));
var 盘中星 = [];
c.十二宫.forEach(function (p) { 盘中星 = 盘中星.concat(p.主星, p.辅星); });
var 未收录 = 盘中星.filter(function (n) { return !S.starOf(n); });
ok('盘中出现的主/辅星全部能查到星情（未收录：' + 未收录.join('、') + '）', 未收录.length === 0, 未收录.join(' '));
// 空宫必有（十二宫只有 14 主星 12 宫，双星同宫时必留空宫），借星得有对宫可借
var 空宫 = c.十二宫.filter(function (p) { return !p.主星.length; });
ok('本盘存在空宫（用于验证借星路径）', 空宫.length >= 1, 空宫.map(function (p) { return p.宫; }).join(' '));

console.log('\n=== 紫微星情 自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
process.exit(fail ? 1 : 0);
