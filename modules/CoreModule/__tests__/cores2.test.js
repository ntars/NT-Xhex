/**
 * modules/CoreModule/__tests__/cores2.test.js —— C08~C17 八宅/飞星/周易自测
 *
 * v3.2.0 裁剪后：数字命理（numeral.js）、姓名五格（name81.js）、号码八星（numberstars.js）、
 * 小术数（xiaoshu.js）随对应算法一并归档，本文件只保留仍在项目内的
 * 八宅（bazhai.js）、九宫飞星（feixing.js）、周易（iching.js）三块验收。
 *
 * 用法：node modules/CoreModule/__tests__/cores2.test.js
 */
var BZ = require('../bazhai.js');
var FX = require('../feixing.js');
var IC = require('../iching.js');
var fails = 0;
function ok(c, m) { if (c) console.log('  ✓', m); else { fails++; console.log('  ✗', m); } }

console.log('== C08 八宅 ==');
var g = BZ.mingGua(1990, '男');
ok(g.命卦数 && g.卦, '男 1990 命卦=' + g.卦 + '（' + g.方位 + '）' + g.东西命 + '命');
var g2 = BZ.mingGua(1990, '女');
ok(g2.命卦数 && g2.卦, '女 1990 命卦=' + g2.卦);
var hh = BZ.hehun(g.卦, g2.卦);
ok(hh.等 >= 1 && hh.等 <= 8, '八等婚（' + hh.名 + '，' + hh.关系星 + '）');

console.log('== C09 飞星 ==');
ok(FX.ruZhong(2010) === 8, '2010 入中星=8（八白）（得 ' + FX.ruZhong(2010) + '）');
ok(FX.ruZhong(2011) === 7, '2011 入中星=7（七赤）');
ok(FX.yuanYun(2030).运 === 9 && FX.yuanYun(2030).说明.indexOf('九紫离火') >= 0, '2030 属九紫离火运');
var fc = FX.yearChart(2026);
ok(fc.入中星 && Object.keys(fc.盘).length === 9, '2026 飞星盘 9 宫（入中 ' + fc.入中星 + '）');

// 日紫白（C09 dayChart + C02 dayZiBaiAnchor）：6 个节气段「甲子日当天入中 = 段起星」是权威铁点
ok(FX.dayChart(2025, 12, 21).入中星 === 1, '冬至段 甲子日(2025-12-21) 入中=1（铁点，跨年锚点）');
ok(FX.dayChart(2026, 2, 19).入中星 === 7, '雨水段 甲子日(2026-02-19) 入中=7（铁点）');
ok(FX.dayChart(2026, 4, 20).入中星 === 4, '谷雨段 甲子日(2026-04-20) 入中=4（铁点）');
ok(FX.dayChart(2026, 8, 18).入中星 === 9, '夏至段 甲子日(2026-08-18) 入中=9（铁点）');
ok(FX.dayChart(2026, 10, 17).入中星 === 3, '处暑段 甲子日(2026-10-17) 入中=3（铁点）');
ok(FX.dayChart(2026, 12, 16).入中星 === 6, '霜降段 甲子日(2026-12-16) 入中=6（铁点）');
// 冬至段逐日顺推：甲子日=1，次日=2
ok(FX.dayChart(2025, 12, 22).入中星 === 2, '冬至段 甲子日次日(2025-12-22) 入中=2（逐日顺推）');

console.log('== C15/16/17 周易/六爻/梅花 ==');
var q = IC.qigua();
ok(q.本卦.卦名 && q.互卦, '铜钱起卦（本卦 ' + q.本卦.卦名 + '，互卦 ' + IC.hexName(IC.BAGUA[q.互卦.上卦].名, IC.BAGUA[q.互卦.下卦].名) + '）');
var ty = IC.tiyong(q.爻, 0);
ok(ty.体卦 && ty.关系, '梅花体用（体' + ty.体卦 + ' 用' + ty.用卦 + ' ' + ty.关系 + ' → ' + ty.吉凶 + '）');

if (fails === 0) { console.log('全部通过 ✓'); process.exit(0); } else { console.log(fails + ' 处失败'); process.exit(1); }
