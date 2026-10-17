/**
 * modules/CoreModule/__tests__/baziliuyun.test.js —— 八字「小运 / 流月 / 流日 / 十神」自测（v3.1.14）
 * 覆盖：小运起于时柱（不是月柱）、阳男阴女顺阴男阳女逆、一位一年；
 *       十神十天干逐一对表；流月按节气（五虎遁）、十二月连续、丑月落次年小寒；
 *       流日连续不断、跨月跨年不跳、与择日内核的日柱一致。
 * 跑法：node modules/CoreModule/__tests__/baziliuyun.test.js
 */
var B = require('../bazi.js');
var Z = require('../zeri.js');
var L = require('../lunar.js');

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}
// 1990-08-15 14时：庚午 甲申 壬子 丁未（日主壬），阳年（庚）= 阳男 → 顺行
var C = B.chart({ y: 1990, m: 8, d: 15, h: 14, gender: '男' });

console.log('A. 六十甲子表');
ok('六十甲子 60 条且首尾正确', B.GANZHI60.length === 60 && B.GANZHI60[0] === '甲子' && B.GANZHI60[59] === '癸亥');
ok('每条都是「干+支」两字且不重复',
  B.GANZHI60.every(function (x) { return x.length === 2; }) &&
  B.GANZHI60.filter(function (x, i) { return B.GANZHI60.indexOf(x) === i; }).length === 60);

console.log('B. 十神（甲日十干全表，标准口诀）');
var 甲表 = { 甲: '比肩', 乙: '劫财', 丙: '食神', 丁: '伤官', 戊: '偏财', 己: '正财', 庚: '七杀', 辛: '正官', 壬: '偏印', 癸: '正印' };
var 错 = Object.keys(甲表).filter(function (g) { return B.shishen('甲', g) !== 甲表[g]; });
ok('甲日见十干 = 比劫食伤财官印（10/10）', 错.length === 0, 错.map(function (g) { return g + B.shishen('甲', g); }).join(' '));
// 壬日（本盘日主）：壬见壬=比肩、见丁=正财（壬丁合）、见戊=七杀、见己=正官
ok('壬日：壬比肩 / 丁正财 / 戊七杀 / 己正官',
  B.shishen('壬', '壬') === '比肩' && B.shishen('壬', '丁') === '正财' &&
  B.shishen('壬', '戊') === '七杀' && B.shishen('壬', '己') === '正官');
ok('同一对干支互换日主，十神不同（方向性正确）',
  B.shishen('甲', '庚') === '七杀' && B.shishen('庚', '甲') === '偏财');
ok('非法天干返回空串', B.shishen('甲', 'X') === '' && B.shishen('', '甲') === '');

console.log('C. 小运（起于时柱，阳男阴女顺行）');
var xy = B.xiaoyun(C._ec, '男', 12);
ok('本盘时柱 = 丁未', C.pillars.时.干支 === '丁未', C.pillars.时.干支);
ok('小运起点 = 时柱（不是月柱甲申）', xy.起点 === '丁未', xy.起点);
ok('阳年男 → 顺行', xy.顺逆 === '顺行', xy.顺逆);
ok('1 岁 = 时柱下一位戊申', xy.列表[0].干支 === '戊申', xy.列表[0].干支);
ok('12 位逐年相接（无跳位）', xy.列表.every(function (x, i) {
  if (i === 0) return true;
  return B.GANZHI60.indexOf(x.干支) === (B.GANZHI60.indexOf(xy.列表[i - 1].干支) + 1) % 60;
}), xy.列表.map(function (x) { return x.干支; }).join(' '));
ok('年龄从 1 起、连续到 12', xy.列表.length === 12 && xy.列表[11].年龄 === 12);
var xyF = B.xiaoyun(C._ec, '女', 3);
ok('同为阳年，女 → 逆行', xyF.顺逆 === '逆行', xyF.顺逆);
ok('女 1 岁 = 时柱上一位丙午', xyF.列表[0].干支 === '丙午', xyF.列表[0].干支);
// 阴年男应逆行：2025 乙巳年
var C2 = B.chart({ y: 2025, m: 6, d: 10, h: 8, gender: '男' });
var xy2 = B.xiaoyun(C2._ec, '男', 3);
ok('阴年（乙巳）男 → 逆行', xy2.顺逆 === '逆行', C2.pillars.年.干支 + ' ' + xy2.顺逆);
// 小运与大运起点必须不同（一个起时柱、一个起月柱）
var dy = C.大运;
ok('大运首步 ≠ 小运首位（同起月柱就错了）',
  !dy.列表.length || dy.列表[0].干支 !== xy.列表[0].干支,
  (dy.列表[0] || {}).干支 + ' vs ' + xy.列表[0].干支);

console.log('D. 流月（节气月 + 五虎遁）');
// 五虎遁：甲己之年丙作首、乙庚之岁戊为头、丙辛必定寻庚起、丁壬壬位顺行流、戊癸之年何方觅，甲寅之上好追求
var 遁 = { 甲: '丙寅', 己: '丙寅', 乙: '戊寅', 庚: '戊寅', 丙: '庚寅', 辛: '庚寅', 丁: '壬寅', 壬: '壬寅', 戊: '甲寅', 癸: '甲寅' };
var 遁错 = [];
Object.keys(遁).forEach(function (yg) {
  // 找该年干的一个流年（甲=1984、乙=1985…按干支年取整）
  var base = { 甲: 1984, 乙: 1985, 丙: 1986, 丁: 1987, 戊: 1988, 己: 1989, 庚: 1990, 辛: 1991, 壬: 1992, 癸: 1993 }[yg];
  var r = B.liuyue(base, '甲');
  if (!r.月.length || r.月[0].干支 !== 遁[yg]) 遁错.push(yg + '年 寅月=' + (r.月[0] || {}).干支 + ' 应' + 遁[yg]);
});
ok('十天干流年寅月全部合五虎遁（10/10）', 遁错.length === 0, 遁错.join(' '));
var lm = B.liuyue(2026, C.dayMaster.干);
ok('流月 12 个月齐全', lm.月.length === 12, lm.月.length);
ok('月支序 = 寅卯辰巳午未申酉戌亥子丑', lm.月.map(function (x) { return x.月支; }).join('') === '寅卯辰巳午未申酉戌亥子丑');
ok('月柱逐位相接（寅→丑 走完 12 位）', lm.月.every(function (x, i) {
  if (i === 0) return true;
  return B.GANZHI60.indexOf(x.干支) === (B.GANZHI60.indexOf(lm.月[i - 1].干支) + 1) % 60;
}), lm.月.map(function (x) { return x.干支; }).join(' '));
ok('丑月起于次年小寒（' + lm.月[11].起 + '）', /^2027-01/.test(lm.月[11].起), lm.月[11].起);
ok('十二月都有交节日期且递增', (function () {
  var ds = lm.月.map(function (x) { return x.起; });
  for (var i = 1; i < ds.length; i++) if (!(ds[i] > ds[i - 1])) return false;
  return ds.every(function (s) { return /^\d{4}-\d{2}-\d{2}$/.test(s); });
})(), lm.月.map(function (x) { return x.起; }).join(' '));
ok('流月带十神（对日主）', lm.月.every(function (x) { return !!x.十神; }));
// 与底座对表：在每个月中间那天取月柱，应与本函数给的月柱一致
var 月错 = lm.月.filter(function (x) {
  var m = x.起.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  var t = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  t.setUTCDate(t.getUTCDate() + 10);     // 交节后第 10 天，稳妥落在该月内
  var info = L.fromSolar(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate(), 12, 0, 0);
  return info.ganzhi.月.干支 !== x.干支;
});
ok('每月中段取底座月柱，与本函数完全一致', 月错.length === 0, 月错.map(function (x) { return x.月支 + x.干支; }).join(' '));

console.log('E. 流日（日柱连续）');
var lr = B.liuri(2026, 10, 17, 60, C.dayMaster.干);
ok('60 天逐日齐全', lr.日.length === 60, lr.日.length);
ok('首日 = 2026-10-17 甲子（与择日内核同日）', lr.日[0].日期 === '2026-10-17' && lr.日[0].干支 === '甲子', lr.日[0].日期 + lr.日[0].干支);
ok('日柱逐日相接（60 天刚好走完一轮，末日 = 癸亥）',
  lr.日[59].干支 === '癸亥' && lr.日.every(function (x, i) {
    if (i === 0) return true;
    return B.GANZHI60.indexOf(x.干支) === (B.GANZHI60.indexOf(lr.日[i - 1].干支) + 1) % 60;
  }), lr.日.slice(-2).map(function (x) { return x.日期 + x.干支; }).join(' '));
ok('跨月（10 月 31 → 11 月 1）不跳日', (function () {
  var idx = -1;
  lr.日.forEach(function (x, i) { if (x.日期 === '2026-10-31') idx = i; });
  return idx >= 0 && lr.日[idx + 1].日期 === '2026-11-01' &&
    B.GANZHI60.indexOf(lr.日[idx + 1].干支) === (B.GANZHI60.indexOf(lr.日[idx].干支) + 1) % 60;
})());
ok('跨年（12 月 31 → 次年 1 月 1）不跳日', (function () {
  var r = B.liuri(2026, 12, 30, 4, '甲');
  return r.日[1].日期 === '2026-12-31' && r.日[2].日期 === '2027-01-01' &&
    B.GANZHI60.indexOf(r.日[2].干支) === (B.GANZHI60.indexOf(r.日[1].干支) + 1) % 60;
})());
var 日柱错 = lr.日.filter(function (x) {
  var m = x.日期.split('-');
  var z = Z.dayInfo(+m[0], +m[1], +m[2]);
  return z.日干 + z.日支 !== x.干支;
});
ok('与择日内核（zeri.dayInfo）的日柱完全一致', 日柱错.length === 0, 日柱错.slice(0, 3).map(function (x) { return x.日期 + x.干支; }).join(' '));
ok('流日带农历与十神', lr.日.every(function (x) { return !!x.农历 && !!x.十神; }));

console.log('\n=== 八字小运·流月·流日 自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
process.exit(fail ? 1 : 0);
