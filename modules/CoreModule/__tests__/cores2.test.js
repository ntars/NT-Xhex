/**
 * modules/CoreModule/__tests__/cores2.test.js —— C08~C20 第二批内核验收
 * 用法：node modules/CoreModule/__tests__/cores2.test.js
 */
var BZ = require('../bazhai.js');
var FX = require('../feixing.js');
var NU = require('../numeral.js');
var N81 = require('../name81.js');
var NS = require('../numberstars.js');
var IC = require('../iching.js');
var XS = require('../xiaoshu.js');
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

console.log('== C10 数字命理 ==');
var pp = NU.paiPan({ y: 2005, m: 6, d: 9, h: 0 });
ok(pp.数字.年 && pp.数字.日, '数字排盘（年' + pp.数字.年 + ' 月' + pp.数字.月 + ' 日' + pp.数字.日 + ' 时' + pp.数字.时 + '）');
ok(NU.judgeArray([1, 8]).length >= 0, '数组判定不崩');
var fnd = NU.judgeArray([1, 8]);
ok(fnd.some(function (x) { return x.阵 === '八绝'; }), '1-8 命中八绝数组');

console.log('== C11 姓名五格 ==');
var w = N81.score('白玖玖');
ok(w.五格 && w.五格.天格, '五格（天' + w.五格.天格 + ' 人' + w.五格.人格 + ' 地' + w.五格.地格 + '）' + (w.得分 != null ? ' 得' + w.得分 + '分' : ' [笔画缺字]'));
console.log('   ', w.incomplete ? w.note : ('人格数理=' + w.数理.人.吉凶 + ' ' + w.数理.人.提要.slice(0, 10)));

console.log('== C12 号码八星 ==');
var ph = NS.analyze('13800138000');
ok(ph.吉星数 + ph.凶星数 > 0, '手机号八星（吉' + ph.吉星数 + ' 凶' + ph.凶星数 + '）');
ok(NS.letterToNum('Z') === 8, '车牌 Z→8（26→2+6）');
var pl = NS.analyze('川A12345');
ok(pl.八星明细.length > 0, '车牌号八星（' + pl.八星明细.length + ' 段）');

console.log('== C15/16/17 周易/六爻/梅花 ==');
var q = IC.qigua();
ok(q.本卦.卦名 && q.互卦, '铜钱起卦（本卦 ' + q.本卦.卦名 + '，互卦 ' + IC.hexName(IC.BAGUA[q.互卦.上卦].名, IC.BAGUA[q.互卦.下卦].名) + '）');
var ty = IC.tiyong(q.爻, 0);
ok(ty.体卦 && ty.关系, '梅花体用（体' + ty.体卦 + ' 用' + ty.用卦 + ' ' + ty.关系 + ' → ' + ty.吉凶 + '）');

console.log('== C20 小术数 ==');
var yz = XS.yizhangjing('子', 5, 8, 4, false);
ok(yz.本命星 && yz.十二宫.length === 12, '一掌经（子年五月初八巳时 男顺 → 时宫' + yz.时宫 + '，本命 ' + yz.本命星 + '）');
// 权威古籍实例（《神机妙算·达摩一掌经》）：巳年正月十二午时·男顺 → 日辰(天奸) 时戌(天艺)
ok(XS.yizhangjing('巳', 1, 12, 6, false).时宫 === '戌(天艺)', '一掌经权威例1（巳年正月十二午时男 → 时戌天艺）');
// 戌年九月廿四戌时·女逆 → 月寅(天权) 日卯(天破) 时巳(天文)
var yz2 = XS.yizhangjing('戌', 9, 24, 10, true);
ok(yz2.月宫 === '寅(天权)' && yz2.日宫 === '卯(天破)' && yz2.时宫 === '巳(天文)', '一掌经权威例2（戌年九月廿四戌时女 → 月寅/日卯/时巳）');
var xl = XS.xiaoliuren(5, 15, 3);
ok(xl.定课 && xl.吉凶, '小六壬（' + xl.定课 + ' ' + xl.吉凶 + '）');
var mq = XS.maqianke(5, 15, 3);
ok(mq.课, '马前课（' + mq.课 + '）');
var br = XS.biorhythm(100);
ok(br.体力 != null && br.情绪 != null, '人体节律（体力' + br.体力 + ' 情绪' + br.情绪 + ' 智力' + br.智力 + '）');

if (fails === 0) { console.log('全部通过 ✓'); process.exit(0); } else { console.log(fails + ' 处失败'); process.exit(1); }
