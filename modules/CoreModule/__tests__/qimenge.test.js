/**
 * modules/CoreModule/__tests__/qimenge.test.js —— 奇门吉凶格局库 C26 自测
 * 跑法：node modules/CoreModule/__tests__/qimenge.test.js
 */
var QG = require('../qimen-ge.js');
var QM = require('../qimen.js');

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}

console.log('A. 十干克应 81 格完整性');
var QI = QG.QI, n = 0, bad = [];
QI.forEach(function (a) { QI.forEach(function (b) { var k = QG.KE_YING[a + b]; n++; if (!k || !k[0]) bad.push(a + b); }); });
ok('9×9 = 81 格全收录', n === 81 && bad.length === 0, bad.join(' '));
ok('每格含 格名 + 吉凶 + 象意', QI.every(function (a) {
  return QI.every(function (b) { var k = QG.KE_YING[a + b]; return k && k[0] && k[1] && k[2]; });
}));
ok('吉凶取值合法（吉/凶/大吉/大凶/平）', QI.every(function (a) {
  return QI.every(function (b) { return ['吉', '凶', '大吉', '大凶', '平'].indexOf(QG.KE_YING[a + b][1]) >= 0; });
}));

console.log('B. 名格（多源一致的名格逐条对齐）');
var MING = [
  ['戊丙', '青龙回首', '大吉'], ['丙戊', '飞鸟跌穴', '大吉'],
  ['乙辛', '青龙逃走', '大凶'], ['辛乙', '白虎猖狂', '大凶'],
  ['丁癸', '朱雀投江', '大凶'], ['癸丁', '螣蛇夭矫', '大凶'],
  ['庚癸', '大格', '大凶'], ['庚壬', '小格', '凶'],
  ['丙庚', '荧入太白', '凶'], ['庚丙', '太白入荧', '凶'],
  ['戊庚', '值符飞宫', '凶'], ['庚戊', '值符伏宫', '大凶'],
  ['己壬', '地网高张', '大凶'], ['癸癸', '天网四张', '大凶'],
  ['丁乙', '玉女奇生', '吉'], ['丁壬', '奇仪相合', '吉'],
  ['乙丙', '奇仪顺遂', '吉'], ['乙丁', '奇仪相佐', '吉'],
  ['丙乙', '日月并行', '吉'], ['丁戊', '青龙转光', '吉']
];
var badM = [];
MING.forEach(function (m) {
  var k = QG.KE_YING[m[0]];
  if (!k || k[0] !== m[1] || k[1] !== m[2]) badM.push(m[0] + '=' + (k ? k[0] + '/' + k[1] : '缺') + '(应' + m[1] + '/' + m[2] + ')');
});
ok('20 条名格（格名 + 吉凶）全部一致', badM.length === 0, badM.join(' '));
ok('异名已标注（庚丁 / 丁庚 / 丙戊 等）', !!QG.KE_YING['庚丁'][3] && !!QG.KE_YING['丁庚'][3] && !!QG.KE_YING['戊丙'][3]);

console.log('C. 逐宫十干克应（起局后 8 实宫全覆盖）');
var c = QM.chart({ y: 2026, m: 10, d: 20, h: 14 });
var ky = QG.keYingOf(c);
ok('8 实宫（除中五）逐宫出格', ky.length === 8, ky.length + '');
ok('每宫含 天盘干/地盘干/门/星/神/格名', ky.every(function (x) { return x.天盘干 && x.地盘干 && x.门 && x.星 && x.神 && x.格名; }));
ok('天盘干 + 地盘干 能查到克应格', ky.every(function (x) { return !!QG.KE_YING[x.天盘干 + x.地盘干]; }));
ok('时干宫天盘干 = 旬首之仪（甲辰→壬）', c.天盘干[c.时干宫] === '壬', c.天盘干[c.时干宫]);

console.log('D. 吉格 / 凶格检测');
var r = QG.analyze({ y: 2026, m: 10, d: 20, h: 14 });
ok('综合分析无 err', !r.err, r.err);
ok('十干克应 8 宫', r.十干克应.length === 8);
ok('吉格/凶格为数组且总数 ≥ 1', Array.isArray(r.吉格) && Array.isArray(r.凶格) && (r.吉格数 + r.凶格数) > 0);
ok('吉凶计数与数组长度一致', r.吉格数 === r.吉格.length && r.凶格数 === r.凶格.length);
ok('总评在位', !!r.总评);
ok('破格提示 + 缺口如实标注', /五不遇时/.test(r.破格提示) && /异名/.test(r.缺口));
// 构造验证：青龙返首（天盘戊 + 地盘丙）必判大吉格
ok('青龙返首 = 戊+丙 判大吉', QG.KE_YING['戊丙'][1] === '大吉');
// 玉女守门：值使门落宫遇地盘丁 → 命中
var 守门 = false, 试 = 0;
for (var h = 0; h < 24 && !守门; h++) {
  for (var dd = 1; dd <= 28 && !守门; dd++) {
    try {
      var t = QM.chart({ y: 2026, m: 10, d: dd, h: h });
      if (t && !t.err && t.值使落宫 && t.地盘[t.值使落宫] === '丁') {
        试++;
        var rr = QG.detect(t);
        守门 = rr.吉格.some(function (x) { return x.名 === '玉女守门'; });
      }
    } catch (e) { /* 跳过越界 */ }
  }
}
ok('玉女守门可检出（值使门落宫遇地盘丁）', 守门, '命中尝试 ' + 试 + ' 次');
// 五不遇时：时干克日干必判凶（找一个实例）
var 五不遇 = false;
for (var h2 = 0; h2 < 24 && !五不遇; h2++) {
  var t2 = QM.chart({ y: 2026, m: 10, d: 20, h: h2 });
  if (t2 && !t2.err) {
    var r2 = QG.detect(t2);
    if (r2.凶格.some(function (x) { return x.名 === '五不遇时'; })) 五不遇 = true;
  }
}
ok('五不遇时可检出（时干克日干）', 五不遇);
// 六仪击刑表（戊震3 己坤2 庚艮8 辛离9 壬巽4 癸巽4）
ok('六仪击刑表对齐', QG.JI_XING.戊 === 3 && QG.JI_XING.己 === 2 && QG.JI_XING.庚 === 8 && QG.JI_XING.辛 === 9 && QG.JI_XING.壬 === 4 && QG.JI_XING.癸 === 4);
// 门迫口诀
ok('门迫口诀「惊开三四休临九，伤杜还归二八宫」', JSON.stringify(QG.MEN_PO) === JSON.stringify({ 惊: [3, 4], 开: [3, 4], 休: [9], 伤: [2, 8], 杜: [2, 8] }), JSON.stringify(QG.MEN_PO));
// 三奇得使：乙+己/辛、丙+戊/庚、丁+壬/癸
ok('三奇得使表对齐', JSON.stringify(QG.DE_SHI) === JSON.stringify({ 乙: ['己', '辛'], 丙: ['戊', '庚'], 丁: ['壬', '癸'] }));
// 天显时格
ok('天显时格：甲己子戌 / 乙庚申 / 丙辛午 / 丁壬辰 / 戊癸寅',
  QG.TIAN_XIAN.甲.join('') === '子戌' && QG.TIAN_XIAN.己.join('') === '子戌' && QG.TIAN_XIAN.乙.join('') === '申' &&
  QG.TIAN_XIAN.庚.join('') === '申' && QG.TIAN_XIAN.丙.join('') === '午' && QG.TIAN_XIAN.辛.join('') === '午' &&
  QG.TIAN_XIAN.丁.join('') === '辰' && QG.TIAN_XIAN.壬.join('') === '辰' && QG.TIAN_XIAN.戊.join('') === '寅' && QG.TIAN_XIAN.癸.join('') === '寅');

console.log('E. 随机 30 局结构自洽');
var bad2 = [];
for (var i = 0; i < 30; i++) {
  var y = 2000 + (i * 7) % 25, mm = 1 + (i * 5) % 12, ddd = 1 + (i * 3) % 27, hh = (i * 5) % 24;
  var x = QG.analyze({ y: y, m: mm, d: ddd, h: hh });
  if (x.err || x.十干克应.length !== 8 || !x.总评) bad2.push(y + '-' + mm + '-' + ddd + ' ' + hh + '时');
}
ok('30 局随机起局判格不抛错且字段齐全', bad2.length === 0, bad2.join(' '));

console.log('\n=== 奇门格局库 qimen-ge 自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
process.exit(fail ? 1 : 0);
