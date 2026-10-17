/**
 * modules/CoreModule/__tests__/bazi.test.js —— C07 八字内核验收
 * 用法：node modules/CoreModule/__tests__/bazi.test.js
 */
var B = require('../bazi.js');
var fails = 0;
function ok(c, m) { if (c) console.log('  ✓', m); else { fails++; console.log('  ✗', m); } }

console.log('== 八字内核 C07 ==');
var c = B.chart({ y: 2005, m: 6, d: 9, h: 0, name: '白玖玖', gender: '女' });
ok(c.pillars.年.干支 === '乙酉' && c.pillars.月.干支 === '壬午' && c.pillars.日.干支 === '甲子' && c.pillars.时.干支 === '甲子',
  '四柱 = 乙酉 壬午 甲子 甲子（得 ' + [c.pillars.年.干支, c.pillars.月.干支, c.pillars.日.干支, c.pillars.时.干支].join(' ') + '）');
ok(c.dayMaster.干 === '甲' && c.dayMaster.五行 === '木', '日主 = 甲木');
ok(c.藏干.日.length >= 1, '日支藏干非空（' + c.藏干.日.join('') + '）');
ok(c.十神.年 === '劫财', '年干十神 = 劫财（得 ' + c.十神.年 + '）');
ok(!!c.纳音.日, '纳音非空（日=' + c.纳音.日 + '）');
ok(!!c.旬空.日, '旬空非空（日=' + c.旬空.日 + '）');
ok(!!c.胎元 && !!c.命宫, '胎元/命宫非空（' + c.胎元 + ' / ' + c.命宫 + '）');
ok(c.五行.统计.金 + c.五行.统计.木 + c.五行.统计.水 + c.五行.统计.火 + c.五行.统计.土 === 8, '五行统计共 8 字');
console.log('   五行分布:', JSON.stringify(c.五行.统计), c.五行.缺文本);
ok(['极旺', '身旺', '中和偏弱', '身弱', '极弱'].indexOf(c.旺衰.判) >= 0, '旺衰五档判定（' + c.旺衰.判 + '，分 ' + c.旺衰.加权分 + '）');
ok(!!c.旺衰.用神.第一用神, '用神非空（第一用神=' + c.旺衰.用神.第一用神 + '）');
ok(c.大运.列表.length > 0, '大运列表非空（' + c.大运.列表.length + ' 步，' + c.大运.顺逆 + '）');
if (c.大运.列表.length) console.log('   起运:', c.大运.起运, '| 首步:', JSON.stringify(c.大运.列表[0]), '| 次步:', JSON.stringify(c.大运.列表[1]));

if (fails === 0) { console.log('全部通过 ✓'); process.exit(0); } else { console.log(fails + ' 处失败'); process.exit(1); }
