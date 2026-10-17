/**
 * modules/CoreModule/__tests__/zeri.test.js —— 择日学（主动择吉）C24 自测
 * 跑法：node modules/CoreModule/__tests__/zeri.test.js
 */
var Z = require('../zeri.js');

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}

console.log('A. 建除十二神起法（日支 − 节气月建支）');
// 2026-10-20：丙午年戊戌月（寒露后戌月）丁卯日 → 建除序 = (卯3 − 戌10) mod 12 = 5 → 执（黄道）
var d1 = Z.dayInfo(2026, 10, 20);
ok('2026-10-20 月建戌（节气月）', d1.月建 === '戌', d1.月建);
ok('2026-10-20 日支卯', d1.日支 === '卯', d1.日支);
ok('2026-10-20 建除 = 执（(卯−戌)mod12=5）', d1.建除 === '执' && d1.建除序 === 5, d1.建除 + '/' + d1.建除序);
ok('执为黄道', d1.道 === '黄', d1.道);
// 月建日必为「建」：找一个月建支 == 日支的日子（戌月戌日）
var jcAll = {};
for (var i = 0; i < 40; i++) {
  var dt = addD(2026, 10, 20, i);
  var dd = Z.dayInfo(dt.y, dt.m, dt.d);
  jcAll[dd.公历] = dd;
}
var 见建日 = Object.keys(jcAll).filter(function (k) { return jcAll[k].日支 === jcAll[k].月建; });
ok('日支 == 月建支 之日必为「建」日（' + 见建日.length + ' 例）',
  见建日.length > 0 && 见建日.every(function (k) { return jcAll[k].建除 === '建'; }),
  见建日.map(function (k) { return k + jcAll[k].建除; }).join(' '));
// 建除循环：连续 12 天必须遍历十二神各一次
var seq = [];
for (var j = 0; j < 12; j++) { var d2 = addD(2026, 10, 20, j); seq.push(Z.dayInfo(d2.y, d2.m, d2.d).建除); }
var uniq = seq.filter(function (x, k) { return seq.indexOf(x) === k; });
ok('连续 12 日遍历十二建除各一次：' + seq.join(''), uniq.length === 12, uniq.length + ' 种');

console.log('B. 黄黑道口诀（建满平收黑，除危定执黄；成开皆可用，闭破不可当）');
var huang = ['除', '危', '定', '执', '成', '开'], hei = ['建', '满', '平', '收', '破', '闭'];
ok('黄道六日 = 除危定执成开', huang.every(function (x) { return Z.JC_DAO[x] === '黄'; }));
ok('黑道六日 = 建满平收破闭', hei.every(function (x) { return Z.JC_DAO[x] === '黑'; }));
ok('破、闭 为大凶档', Z.JC_LEVEL['破'] === '大凶' && Z.JC_LEVEL['闭'] === '大凶');
ok('成、开 为大吉档', Z.JC_LEVEL['成'] === '大吉' && Z.JC_LEVEL['开'] === '大吉');
ok('黄黑道合计 12 项且互斥', Object.keys(Z.JC_DAO).length === 12 &&
  Object.keys(Z.JC_DAO).every(function (x) { return (huang.indexOf(x) >= 0) === (Z.JC_DAO[x] === '黄'); }));

console.log('C. 十二宫神次序与起青龙诀（(2×日支序+8) mod 12）');
var 神序 = Z.SHEN12.map(function (s) { return s.名; }).join('');
ok('十二神次序 = 青龙明堂天刑朱雀金匮天德白虎玉堂天牢玄武司命勾陈',
  神序 === '青龙明堂天刑朱雀金匮天德白虎玉堂天牢玄武司命勾陈', 神序);
ok('黄道六神 = 青龙·明堂·金匮·天德·玉堂·司命',
  Z.SHEN12.filter(function (s) { return s.道 === '黄'; }).map(function (s) { return s.名; }).join('') === '青龙明堂金匮天德玉堂司命');
ok('黑道六神 = 天刑·朱雀·白虎·天牢·玄武·勾陈',
  Z.SHEN12.filter(function (s) { return s.道 === '黑'; }).map(function (s) { return s.名; }).join('') === '天刑朱雀白虎天牢玄武勾陈');
// 起青龙：子午→申 丑未→戌 寅申→子 卯酉→寅 辰戌→辰 巳亥→午
var QL = { 子: '申', 午: '申', 丑: '戌', 未: '戌', 寅: '子', 申: '子', 卯: '寅', 酉: '寅', 辰: '辰', 戌: '辰', 巳: '午', 亥: '午' };
var 支 = '子丑寅卯辰巳午未申酉戌亥', badQL = [];
for (var q = 0; q < 12; q++) {
  var t = Z.吉时('甲', 支[q]);
  if (t.起青龙 !== QL[支[q]]) badQL.push(支[q] + '→' + t.起青龙 + '(应' + QL[支[q]] + ')');
}
ok('起青龙诀十二支全对（子午申 / 丑未戌 / 寅申子 / 卯酉寅 / 辰戌辰 / 巳亥午）', badQL.length === 0, badQL.join(' '));
// 公式自洽：青龙时支序 = (2×日支序 + 8) mod 12
var badF = [];
for (var q2 = 0; q2 < 12; q2++) {
  var 应 = 支[((2 * q2 + 8) % 12)];
  if (Z.吉时('甲', 支[q2]).起青龙 !== 应) badF.push(支[q2]);
}
ok('公式 (2×日支序+8) mod 12 与口诀完全一致', badF.length === 0, badF.join(' '));
// 十二时辰恰好轮完十二神
ok('每日十二时辰轮遍十二神各一次', (function () {
  var t = Z.吉时('甲', '子');
  var names = t.时辰.map(function (x) { return x.神; });
  return names.filter(function (x, k) { return names.indexOf(x) === k; }).length === 12;
})());

console.log('D. 五不遇时 / 天乙贵人 / 五鼠遁');
// 丁卯日：五不遇时 = 壬癸时 → 壬寅、癸卯 应被判不吉
var t2 = Z.吉时('丁', '卯');
var wu = t2.时辰.filter(function (x) { return /五不遇/.test(x.注); }).map(function (x) { return x.时干支; });
ok('丁日五不遇时 = 壬寅、癸卯（古籍「丙丁日忌壬癸时」）', wu.join('、') === '壬寅、癸卯', wu.join('、'));
// 甲日贵人 = 丑未
var t3 = Z.吉时('甲', '子');
var gr = t3.时辰.filter(function (x) { return /天乙贵人/.test(x.注); }).map(function (x) { return x.时支; });
ok('甲日天乙贵人在丑、未时（「甲戊兼牛羊」）', gr.join('') === '丑未', gr.join(''));
// 五鼠遁：甲日子时 = 甲子
ok('五鼠遁：甲日子时起甲子', t3.时辰[0].时干支 === '甲子', t3.时辰[0].时干支);
ok('五鼠遁：丁日子时起庚子（「丁壬庚子居」）', Z.吉时('丁', '卯').时辰[0].时干支 === '庚子');
// 司命夜时不吉（寅至申吉、酉至丑不吉）：卯日青龙起寅 → 司命落子时（属酉至丑，夜）
var si = Z.吉时('丙', '卯').时辰.filter(function (x) { return x.神 === '司命'; })[0];
ok('卯日司命落子时（夜）→ 标「司命夜时不吉」', si.时支 === '子' && /司命夜时/.test(si.注) && si.吉 === false, si.时支 + '|' + si.注);
// 午日青龙起申 → 司命落午时（属寅至申，昼）→ 不标夜时
var si2 = Z.吉时('丙', '午').时辰.filter(function (x) { return x.神 === '司命'; })[0];
ok('午日司命落午时（昼）→ 不标夜时', si2.时支 === '午' && !/司命夜时/.test(si2.注), si2.时支 + '|' + si2.注);

console.log('E. 单日日课字段（底座宜忌/二十八宿/彭祖/冲煞 复用）');
var dd = Z.dayInfo(2026, 10, 20, { 属相: '鸡' });
ok('日课无 err', !dd.err);
ok('宜/忌非空（底座通书宜忌）', dd.宜.length > 0 && dd.忌.length > 0, dd.宜.length + '/' + dd.忌.length);
ok('二十八宿 + 吉凶 + 歌诀齐全', !!dd.二十八宿 && !!dd.宿吉凶 && !!dd.宿歌, dd.二十八宿 + dd.宿吉凶);
ok('彭祖百忌（干 + 支各一条）', /丁不剃头/.test(dd.彭祖) && /卯不穿井/.test(dd.彭祖), dd.彭祖);
ok('日冲：卯日冲酉（鸡）', dd.冲肖 === '鸡' && /鸡/.test(dd.冲), dd.冲);
ok('冲命主识别（属相鸡 → 冲命主为真）', dd.冲命主 === true);
ok('建除宜忌文本在位', !!dd.建除宜忌);

console.log('F. 择日主流程（事项识别 + 评分排序 + 吉时）');
var r = Z.select({ 事项: '结婚', 起: { y: 2026, m: 10, d: 20 }, 天数: 30, 属相: '鸡' });
ok('「结婚」识别为嫁娶事项', r.事项 === '嫁娶', r.事项);
ok('日课 30 条', r.日课.length === 30, r.日课.length);
ok('推荐 3 条且分数递减', r.推荐.length === 3 && r.推荐[0].分 >= r.推荐[1].分 && r.推荐[1].分 >= r.推荐[2].分,
  r.推荐.map(function (x) { return x.分; }).join('>'));
ok('每条日课都带吉时列表', r.日课.every(function (x) { return x.吉时 && x.吉时.时辰.length === 12; }));
ok('推荐条目含宜命中说明或扣分说明', r.推荐.every(function (x) { return x.评分明细.length > 0; }));
ok('权重说明与缺口如实标注', /评分权重（本项目设定/.test(r.权重说明) && /不等于专业日师/.test(r.缺口));
var r2 = Z.select({ 事项: '开业', 起: { y: 2026, m: 11, d: 1 }, 天数: 20 });
ok('「开业」识别为开市事项', r2.事项 === '开市', r2.事项);
var r3 = Z.select({ 事项: '随便什么', 起: { y: 2026, m: 11, d: 1 }, 天数: 5 });
ok('未识别事项 → err + 提示', !!r3.err && !!r3.提示, r3.err);

console.log('G. 随机 40 日结构自洽（跨月跨年不抛错）');
var bad = [];
for (var k = 0; k < 40; k++) {
  var dt2 = addD(2025, 12, 20, k * 9);
  var x = Z.dayInfo(dt2.y, dt2.m, dt2.d, { 属相: '龙' });
  if (x.err || !x.建除 || !x.宜 || x.吉凶档 === undefined) bad.push(x.公历 || dt2.y);
}
ok('40 个随机日课结构齐全且不抛错', bad.length === 0, bad.join(' '));

function addD(y, m, d, n) {
  var t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() + n);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

console.log('\n=== 择日学 zeri 自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
process.exit(fail ? 1 : 0);
