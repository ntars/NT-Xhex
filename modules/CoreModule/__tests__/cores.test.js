/**
 * modules/CoreModule/__tests__/cores.test.js —— C02~C03 干支/节气底座验收
 *
 * v3.2.0 裁剪后：五行（wuxing.js）、真太阳时与城市经纬表（suntime.js）、
 * 每日黄历神煞（shensha.js）三库随对应算法一并归档，本文件只保留仍在项目内的
 * 干支底座（ganzhi.js）两项验收。
 *
 * 用法：node modules/CoreModule/__tests__/cores.test.js
 */
var G = require('../ganzhi.js');
var fails = 0;
function ok(c, m) { if (c) console.log('  ✓', m); else { fails++; console.log('  ✗', m); } }

console.log('== C02 干支 ==');
var p = G.solarPillars(2026, 10, 16, 14, 0, 0);
ok(p.年.干支 === '丙午' && p.月.干支 === '戊戌' && p.日.干支 === '癸亥' && p.时.干支 === '己未', '2026-10-16 14时四柱=丙午 戊戌 癸亥 己未');
ok(G.JIAZI.length === 60 && G.JIAZI[0] === '甲子' && G.JIAZI[59] === '癸亥', '六十甲子全表 60 项');
ok(G.jiaziIndex('甲子') === 0 && G.jiaziIndex('癸亥') === 59, '甲子/癸亥 索引正确');
ok(G.yearGanzhi(2005).干支 === '乙酉', '2005 年柱=乙酉（立春口径）');
ok(G.dayGanzhi(2000, 1, 1).干支 === '戊午', '2000-01-01 日柱=戊午（日柱锚点）');
ok(G.zodiac(2005) === '鸡', '2005 生肖=鸡');

console.log('== C03 节气 ==');
var j = G.jieqiOf(2026, 2, 4);
ok(j.是否交节日 === true && j.节气名 === '立春', '2026-02-04 是立春（交节日）');
var j2 = G.jieqiOf(2026, 10, 16);
ok(j2.前一节气 && j2.前一节气.名 === '寒露' && j2.后一节气 && j2.后一节气.名 === '霜降', '2026-10-16 前寒露/后霜降');
ok(Object.keys(j2.节气表).length >= 24, '节气表含 24+ 项（' + Object.keys(j2.节气表).length + '）');

if (fails === 0) { console.log('全部通过 ✓'); process.exit(0); } else { console.log(fails + ' 处失败'); process.exit(1); }
