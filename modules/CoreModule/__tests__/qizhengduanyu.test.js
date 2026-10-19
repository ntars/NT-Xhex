/**
 * modules/CoreModule/__tests__/qizhengduanyu.test.js —— 七政四余断语库自测
 *
 * 护栏目标（v3.1.46 新增）：
 *   ① 十一曜齐全（七政 + 四余）且各带「原文 + 白话」；
 *   ② 余气对应正确（罗=火余、计=土余、炁=木余、孛=水余）；
 *   ③ 星格**只作「相关提示」**、绝不冒充判定（防误报 —— 本轮实测踩过）；
 *   ④ 昼夜阴阳分类正确（阳星：日木土水；阴星：月火金罗）；
 *   ⑤ 曜入十二宫断语可用、未知查询安全返回 null。
 */
var Q = require('../qizheng-duanyu.js');

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}

console.log('=== 七政四余断语库自测 ===\n');

console.log('A. 十一曜规格');
ok('十一曜齐全', Q.count.曜 === 11, String(Q.count.曜));
ok('入命断语 11 条', Q.count.入命断语 === 11, String(Q.count.入命断语));
ok('星格 ≥ 15', Q.count.星格 >= 15, String(Q.count.星格));
var names = Q.YAO11.map(function (y) { return y.曜; });
['太阳', '太阴', '金星', '木星', '水星', '火星', '土星', '紫炁', '月孛', '罗睺', '计都'].forEach(function (n) {
  ok('含曜「' + n + '」', names.indexOf(n) >= 0);
});

console.log('\nB. 每曜「原文 + 白话」双全');
var bad = Q.YAO11.filter(function (y) { return !y.原文 || !y.白 || !y.象 || !y.性; });
ok('星性字段完整（原文/白话/象/性）', bad.length === 0, bad.map(function (x) { return x.曜; }).join(','));

console.log('\nC. 余气对应（紫微人生/快懂百科两源一致）');
ok('罗睺 = 火之余气', Q.yaoOf('罗睺').性 === '火余气');
ok('计都 = 土之余气', Q.yaoOf('计都').性 === '土余气');
ok('紫炁 = 木之余气', Q.yaoOf('紫炁').性 === '木余气');
ok('月孛 = 水之余气', Q.yaoOf('月孛').性 === '水余气');

console.log('\nD. 昼夜阴阳分类（果老：昼喜阳星、夜喜阴星）');
ok('阳星 = 日木土水', Q.YIN_YANG.阳星.join('') === '太阳木星水星土星', Q.YIN_YANG.阳星.join(','));
ok('阴星 = 月火金罗', Q.YIN_YANG.阴星.join('') === '太阴火星金星罗睺', Q.YIN_YANG.阴星.join(','));
ok('阳星与阴星不重叠', (function () {
  return Q.YIN_YANG.阳星.every(function (x) { return Q.YIN_YANG.阴星.indexOf(x) < 0; });
})());

console.log('\nE. 星格只作「相关提示」，不冒充判定');
var hint = Q.gejuList(['太阳', '太阴', '罗睺', '计都']);
ok('gejuList 返回的格均带「待校验」标记', hint.every(function (g) { return g.待校验 === true; }));
ok('未知曜不会误入', Q.gejuList(['不存在的曜']).length === 0);
ok('空输入不抛', Array.isArray(Q.gejuList([])));
var geFields = Q.XING_GE.every(function (g) { return g.名 && g.断 && g.吉凶 && g.源 && g.曜.length; });
ok('星格字段完整（名/曜/断/吉凶/源）', geFields);

console.log('\nF. 查询函数行为');
ok('yaoOf 吃简称：罗 → 罗睺', Q.yaoOf('罗') && Q.yaoOf('罗').曜 === '罗睺');
ok('yaoOf 吃简称：孛 → 月孛', Q.yaoOf('孛') && Q.yaoOf('孛').曜 === '月孛');
ok('yaoMingOf(太阳) 有原文', Q.yaoMingOf('太阳') && !!Q.yaoMingOf('太阳').原文);
ok('gongDuanOf(太阳,官禄) 有断语', !!Q.gongDuanOf('太阳', '官禄'));
ok('gongDuanOf 未知组合返回 null', Q.gongDuanOf('紫炁', '财帛') !== null && Q.gongDuanOf('太阳', '不存在的宫') === null);
ok('lineYao 一行含曜名与白话', Q.lineYao('太阳').indexOf('太阳') === 0 && Q.lineYao('太阳').length > 20);
ok('lineYao 未知曜返回空串', Q.lineYao('未知') === '');
ok('曜入宫断语总数 ≥ 50', (function () {
  var n = 0; Object.keys(Q.YAO_GONG).forEach(function (k) { n += Object.keys(Q.YAO_GONG[k]).length; });
  return n >= 50;
})());

console.log('\nG. 庙旺五态');
var mk = Object.keys(Q.MIAO_TEXT);
ok('五态齐全（庙旺喜乐垣）', mk.join('') === '庙旺喜乐垣', mk.join(','));
ok('文案不含重复前缀', Q.MIAO_TEXT.庙.indexOf('庙 =') < 0);

console.log('\n=== 七政四余断语库自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
if (fail) process.exit(1);
