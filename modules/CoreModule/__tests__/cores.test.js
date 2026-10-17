/**
 * modules/CoreModule/__tests__/cores.test.js —— C02~C06 内核批量验收
 * 用法：node modules/CoreModule/__tests__/cores.test.js
 */
var G = require('../ganzhi.js');
var W = require('../wuxing.js');
var S = require('../suntime.js');
var S6 = require('../shensha.js');
var fails = 0;
function ok(c, m) { if (c) console.log('  ✓', m); else { fails++; console.log('  ✗', m); } }

console.log('== C02 干支 ==');
var p = G.solarPillars(2026, 10, 16, 14, 0, 0);
ok(p.年.干支 === '丙午' && p.月.干支 === '戊戌' && p.日.干支 === '癸亥' && p.时.干支 === '己未', '2026-10-16 14时四柱=丙午 戊戌 癸亥 己未');
ok(G.JIAZI.length === 60 && G.JIAZI[0] === '甲子' && G.JIAZI[59] === '癸亥', '六十甲子全表 60 项');
ok(G.jiaziIndex('甲子') === 0 && G.jiaziIndex('癸亥') === 59, '甲子/癸亥 索引正确');
ok(G.yearGanzhi(2005).干支 === '乙酉', '2005 年柱=乙酉（立春口径）');

console.log('== C03 节气 ==');
var j = G.jieqiOf(2026, 2, 4);
ok(j.是否交节日 === true && j.节气名 === '立春', '2026-02-04 是立春（交节日）');
var j2 = G.jieqiOf(2026, 10, 16);
ok(j2.前一节气 && j2.前一节气.名 === '寒露' && j2.后一节气 && j2.后一节气.名 === '霜降', '2026-10-16 前寒露/后霜降');
ok(Object.keys(j2.节气表).length >= 24, '节气表含 24+ 项（' + Object.keys(j2.节气表).length + '）');

console.log('== C04 真太阳时 ==');
var t = S.correct({ y: 2000, m: 6, d: 1, h: 12, i: 0, city: '乌鲁木齐' });
ok(t.ok && t.真太阳时, '乌鲁木齐 2000-06-01 12:00 → 真太阳时 ' + t.真太阳时 + '（经度校正 ' + t.经度校正分 + '分）');
ok(S.isDST(1988, 6, 1) === true && S.isDST(1992, 6, 1) === false, '夏令时判定（1988 在期内 / 1992 不在）');
ok(Object.keys(S.CITIES).length >= 100, '城市经度表 ' + Object.keys(S.CITIES).length + ' 城');

console.log('== C05 五行 ==');
ok(W.changsheng('甲', '亥') === '长生' && W.changsheng('乙', '午') === '长生' && W.changsheng('乙', '巳') === '沐浴', '十二长生（甲亥长生 / 乙午长生=阴逆，口诀 甲亥乙午丙寅丁酉戊寅己酉庚巳辛子壬申癸卯）');
ok(W.relation('木', '火') === '我生' && W.relation('木', '金') === '克我', '五行四关系');
ok(W.nayin('甲子') === '海中金' && W.nayin('乙酉') === '泉中水', '纳音反查（甲子海中金 / 乙酉泉中水）');
ok(W.taisui(2026) === '马', '2026 太岁=马');

console.log('== C06 神煞（黄历） ==');
var d = S6.daily(2026, 10, 16);
ok(d.值星 === '除', '建除值星=除');
ok(d.天神 === '玉堂' && d.天神类 === '黄道', '黄道天神=玉堂（黄道）');
ok(d.二十八宿.宿 === '亢', '二十八宿=亢');
ok(d.彭祖百忌.干.indexOf('癸不') === 0, '彭祖百忌（干）= ' + d.彭祖百忌.干);
ok(!!d.冲煞.冲生肖 && !!d.冲煞.煞方, '冲煞（冲' + d.冲煞.冲生肖 + ' 煞' + d.冲煞.煞方 + '）');
ok(d.宜.length > 0 && d.忌.length > 0, '宜/忌非空（宜' + d.宜.length + '项 忌' + d.忌.length + '项）');
ok(!!d.方位.喜神 && !!d.方位.财神, '吉神方位（喜神' + d.方位.喜神 + ' 财神' + d.方位.财神 + '）');

if (fails === 0) { console.log('全部通过 ✓'); process.exit(0); } else { console.log(fails + ' 处失败'); process.exit(1); }
