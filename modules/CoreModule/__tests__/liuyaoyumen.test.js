/**
 * modules/CoreModule/__tests__/liuyaoyumen.test.js —— 六爻分门断语（《黄金策》用神体系形式化）自测 v3.1.16
 * 覆盖：六门齐备、门类识别、六亲↔五行互逆、各门用神/原神/忌神正确、
 *       婚姻按性别换用神、判分档位自洽、装卦确定性、依据不空。
 * 跑法：node modules/CoreModule/__tests__/liuyaoyumen.test.js
 */
var L = require('../liuyao.js');

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}
var 盘 = L.cast({ y: 2026, m: 10, d: 17, h: 14, backs: [3, 1, 2, 0, 3, 2] });

console.log('A. 六门与门类识别');
ok('六门齐备（求财/婚姻/疾病/官讼/功名/出行）',
  Object.keys(L.MEN).join(',') === '求财,婚姻,疾病,官讼,功名,出行', Object.keys(L.MEN).join(','));
ok('每门都有用神与备注', Object.keys(L.MEN).every(function (m) { return L.MEN[m].用神 && L.MEN[m].备注; }));
ok('「问一下财运如何」→ 求财', L.menOf('问一下财运如何') === '求财');
ok('「官司能赢吗」→ 官讼', L.menOf('官司能赢吗') === '官讼');
ok('「身体有毛病」→ 疾病', L.menOf('身体有毛病') === '疾病');
ok('「想问他俩感情」→ 婚姻', L.menOf('想问他俩感情') === '婚姻');
ok('「面试能过吗」→ 功名', L.menOf('面试能过吗') === '功名');
ok('「下周出差顺利吗」→ 出行', L.menOf('下周出差顺利吗') === '出行');
ok('无关键词返回 null（不硬套门）', L.menOf('今天天气') === null);

console.log('B. 六亲 ↔ 五行 互逆（五行 × 宫五行 全 25 组）');
var WX = ['木', '火', '土', '金', '水'], 逆错 = [];
WX.forEach(function (g) {
  ['父母', '兄弟', '子孙', '妻财', '官鬼'].forEach(function (q) {
    var w = L.qinWx(q, g);
    if (!w) { 逆错.push(g + '/' + q + ' 无五行'); return; }
    if (L.qinOfWx(w, g) !== q) 逆错.push(g + '/' + q + '→' + w + '→' + L.qinOfWx(w, g));
  });
});
ok('25 组「六亲→五行→六亲」全部回得来', 逆错.length === 0, 逆错.join(' '));
ok('坎宫(水)：妻财=火 / 子孙=木 / 官鬼=土 / 父母=金 / 兄弟=水',
  L.qinWx('妻财', '水') === '火' && L.qinWx('子孙', '水') === '木' &&
  L.qinWx('官鬼', '水') === '土' && L.qinWx('父母', '水') === '金' && L.qinWx('兄弟', '水') === '水');

console.log('C. 各门用神／原神／忌神（按六爻生克定，不是随手填的）');
var 应 = {
  求财: ['妻财', '子孙', '兄弟'],   // 财为用、子孙为财源（原神）、兄弟劫财（忌）
  疾病: ['官鬼', '妻财', '子孙'],   // 病为用、妻财生官鬼（原）、子孙克官鬼（忌，故为医药）
  官讼: ['官鬼', '妻财', '子孙'],
  功名: ['官鬼', '妻财', '子孙'],
  出行: ['兄弟', '父母', '官鬼']
};
Object.keys(应).forEach(function (m) {
  var j = L.menJudge(盘, m);
  ok(m + '门：用神' + 应[m][0] + ' / 原神' + 应[m][1] + ' / 忌神' + 应[m][2],
    j.用神 === 应[m][0] && j.原神 === 应[m][1] && j.忌神 === 应[m][2],
    j.用神 + '/' + j.原神 + '/' + j.忌神);
});
var 男 = L.menJudge(盘, '婚姻', { 性别: '男' }), 女 = L.menJudge(盘, '婚姻', { 性别: '女' });
ok('婚姻门：男占以妻财为用神', 男.用神 === '妻财', 男.用神);
ok('婚姻门：女占以官鬼为用神', 女.用神 === '官鬼', 女.用神);

console.log('D. 判分与档位自洽');
var 档 = function (s) {
  return s >= 3 ? '大吉' : s >= 1 ? '吉' : s === 0 ? '平' : s >= -2 ? '不顺' : '凶';
};
var 全部对 = true, 空依据 = [];
Object.keys(L.MEN).forEach(function (m) {
  var j = L.menJudge(盘, m);
  if (!j.判 || j.判.indexOf(档(j.分)) < 0) 全部对 = false;
  if (!j.依据 || !j.依据.length) 空依据.push(m);
});
ok('六门得分与「大吉/吉/平/不顺/凶」档位一致', 全部对);
ok('六门都给出逐条依据（不许空手）', 空依据.length === 0, 空依据.join(' '));
ok('依据里每条都带加减分号', Object.keys(L.MEN).every(function (m) {
  return L.menJudge(盘, m).依据.every(function (s) { return /^＋\d+ |^－\d+ /.test(s); });
}));
ok('未收录门类 → err（不瞎断）', !!L.menJudge(盘, '求仙').err);
ok('未装卦 → err', !!L.menJudge(null, '求财').err);

console.log('E. 装卦确定性（同背数必同盘，否则断语无从复核）');
var a = L.cast({ y: 2026, m: 10, d: 17, h: 14, backs: [3, 1, 2, 0, 3, 2] });
var b = L.cast({ y: 2026, m: 10, d: 17, h: 14, backs: [3, 1, 2, 0, 3, 2] });
ok('同一背数两次装卦同卦同变', a.本卦 === b.本卦 && a.变卦 === b.变卦, a.本卦 + '/' + a.变卦);
ok('同一背数两次断语同分同判', JSON.stringify(L.menJudge(a, '求财').依据) === JSON.stringify(L.menJudge(b, '求财').依据));
ok('本盘为水泽节（坎宫水，世1应4）', a.本卦 === '水泽节' && a.宫 === '坎宫(水)' && a.世 === 1 && a.应 === 4,
  a.本卦 + ' ' + a.宫);

console.log('F. 边界：用神全无时判凶且说明「无着落」');
// 构造一张没有某一六亲的盘不容易，改为直接验证「用神全无」分支的文案与扣分口径
var 空盘 = {
  爻线: [{ 爻: 1, 干支: '甲子', 五行: '水', 六亲: '兄弟', 六神: '青龙', 世应: '世', 标记: '' }],
  世: 1, 应: 1, 动爻: [], 月建: '', 日辰: '', 旬空: [], 宫: '坎宫(水)', 伏飞神: []
};
var jj = L.menJudge(空盘, '求财');
ok('用神（妻财）全无 → 判凶', jj.判.indexOf('凶') === 0, jj.判);
ok('用神全无的说明写「无着落」', jj.依据.join('').indexOf('无着落') >= 0, jj.依据.join('；'));

console.log('\n=== 六爻分门断语 自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
process.exit(fail ? 1 : 0);
