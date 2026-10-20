/**
 * modules/CoreModule/__tests__/qizhengduanyu.test.js —— 七政四余断语库自测
 *
 * 护栏目标（v3.1.46 新增）：
 *   ① 十一曜齐全（七政 + 四余）且各带「原文 + 白话」；
 *   ② 余气对应正确（罗=火余、计=土余、炁=木余、孛=水余）；
 *   ③ 星格分层：gejuList 只作「相关提示」（按曜在场），gejuJudge 按结构化条件（同宫/同度/入宿/居支/坐命/夹）**逐条精确判定**、只报命中，两者不混；
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

console.log('\nH. 星格精确判定（gejuJudge，v3.1.55）');
// 构造盘：太阳/太阴同坐命宫(宫1)，太阳午(狮子)、太阴子(水瓶)；水星与太阳同度(121°)；
//   火星相貌宫(12)、月孛财帛宫(2)、计都相貌宫(12) → 孛计夹命宫；罗睺财帛(2)。
var ch = {
  太阳: { 宫: 1, 支: '午', 宿: '柳', 经: 120 },
  太阴: { 宫: 1, 支: '子', 宿: '虚', 经: 310 },
  水星: { 宫: 1, 支: '午', 宿: '柳', 经: 121 },
  金星: { 宫: 9, 支: '寅', 宿: '尾', 经: 15 },
  火星: { 宫: 12, 支: '戌', 宿: '角', 经: 5 },
  木星: { 宫: 9, 支: '寅', 宿: '尾', 经: 20 },
  土星: { 宫: 2, 支: '酉', 宿: '昴', 经: 35 },
  罗睺: { 宫: 2, 支: '酉', 宿: '昴', 经: 40 },
  计都: { 宫: 12, 支: '戌', 宿: '角', 经: 2 },
  月孛: { 宫: 2, 支: '酉', 宿: '昴', 经: 45 }
};
var hitNames = Q.gejuJudge(ch).map(function (g) { return g.名; });
ok('日月并明命中（同宫+日午+月子）', hitNames.indexOf('日月并明') >= 0, hitNames.join(','));
ok('太阳居午命中', hitNames.indexOf('太阳居午') >= 0);
ok('太阴居子命中', hitNames.indexOf('太阴居子') >= 0);
ok('孛计夹命命中（孛宫2+计宫12夹命宫1）', hitNames.indexOf('孛计夹身') >= 0);
ok('火金子位战不命中（火星在戌非申酉）', hitNames.indexOf('火金子位战') < 0);
ok('水土条件不满足不误报（如木日同迁移：木宫9但日非迁移）', hitNames.indexOf('木日同迁移') < 0);
ok('gejuJudge(null) 不崩且返 0', Q.gejuJudge(null).length === 0);
ok('gejuJudge({}) 不崩且返 0', Q.gejuJudge({}).length === 0);
// 阴性盘：只把太阳放午、其余远离 → 只命中「太阳居午」
var ch2 = { 太阳: { 宫: 5, 支: '午', 宿: '柳', 经: 120 }, 太阴: { 宫: 8, 支: '辰', 宿: '心', 经: 100 } };
var h2 = Q.gejuJudge(ch2).map(function (g) { return g.名; });
ok('仅太阳居午命中（不连带误报）', h2.length === 1 && h2[0] === '太阳居午', h2.join(','));
// 宿条件：月在参、日在娄 → 阴阳得体
var ch3 = { 太阳: { 宫: 3, 支: '申', 宿: '娄', 经: 200 }, 太阴: { 宫: 7, 支: '卯', 宿: '参', 经: 250 } };
ok('阴阳得体命中（月参日娄）', Q.gejuJudge(ch3).map(function (g) { return g.名; }).indexOf('阴阳得体') >= 0);
ok('GEJU_COND 覆盖全部 18 星格', Object.keys(Q.GEJU_COND).length === Q.XING_GE.length, Object.keys(Q.GEJU_COND).length + '/' + Q.XING_GE.length);

// 度夹（v3.1.56）：宫央不成立但度央成立 → 应命中；度央跨度过大 → 不命中
(function () {
  // 命度黄经 100°；月孛 92°、计都 108°（分居命度两侧各 8°，总张角 16° ≤30°）→ 度央成立
  // 宫号故意错开（月孛宫5、计都宫7，非 12/2）→ 宫央不成立，以此单独验证度央路径
  var chD = {
    太阳: { 宫: 3, 支: '申', 宿: '毕', 经: 40 }, 太阴: { 宫: 8, 支: '辰', 宿: '心', 经: 300 },
    水星: { 宫: 4, 支: '未', 宿: '井', 经: 120 }, 金星: { 宫: 6, 支: '巳', 宿: '斗', 经: 150 },
    火星: { 宫: 5, 支: '午', 宿: '柳', 经: 130 }, 木星: { 宫: 9, 支: '寅', 宿: '尾', 经: 20 },
    土星: { 宫: 2, 支: '酉', 宿: '昴', 经: 35 }, 罗睺: { 宫: 6, 支: '巳', 宿: '危', 经: 145 },
    计都: { 宫: 7, 支: '卯', 宿: '房', 经: 108 }, 月孛: { 宫: 5, 支: '午', 宿: '星', 经: 92 },
    __度中: { 经: 100 }
  };
  var hd = Q.gejuJudge(chD).map(function (g) { return g.名; });
  ok('孛计夹身·度央命中（宫央不成立时走度央）', hd.indexOf('孛计夹身') >= 0, hd.join(','));
  // 同盘但把月孛挪到命度背面（280°）→ 度央不成立、宫央也不成立 → 不命中
  var chD2 = JSON.parse(JSON.stringify(chD));
  chD2.月孛 = { 宫: 5, 支: '午', 宿: '星', 经: 280 };
  var hd2 = Q.gejuJudge(chD2).map(function (g) { return g.名; });
  ok('被夹点在背面 → 孛计夹身不命中（不误报）', hd2.indexOf('孛计夹身') < 0, hd2.join(','));
  // 跨度过大：月孛 60°、计都 140°（总张角 80° >30°）→ 度央不成立
  var chD3 = JSON.parse(JSON.stringify(chD));
  chD3.月孛 = { 宫: 5, 支: '午', 宿: '星', 经: 60 }; chD3.计都 = { 宫: 7, 支: '卯', 宿: '房', 经: 140 };
  ok('度央总张角 >30° → 不成立（从严防误报）', Q.gejuJudge(chD3).map(function (g) { return g.名; }).indexOf('孛计夹身') < 0);
  // 未注入 __度中 时，「夹命」度央路径应安全返回不成立（不崩）
  var chNoMid = JSON.parse(JSON.stringify(chD)); delete chNoMid.__度中;
  ok('未注入上升黄经时夹命度央不崩', typeof Q.gejuJudge(chNoMid) === 'object');
})();

console.log('\n=== 七政四余断语库自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
if (fail) process.exit(1);
