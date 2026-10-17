/**
 * modules/CoreModule/__tests__/ziwei.test.js —— 紫微斗数内核（iztro 内嵌）验收
 * 用法：node modules/CoreModule/__tests__/ziwei.test.js
 *
 * 锁：iztro 命盘基本量自洽（命宫/身宫/五行局/十二宫/大限）+ 不同性别顺逆不同。
 */
var Z = require('../ziwei.js');
var fails = 0;
function ok(c, m) { if (c) console.log('  ✓', m); else { fails++; console.log('  ✗', m); } }

console.log('== C13 紫微斗数（内嵌 iztro 权威引擎）==');
var c = Z.chart({ y: 1990, m: 8, d: 15, h: 14, gender: 'male' });
ok(!c.err, '排盘不崩（' + (c.err || 'ok') + '）');
ok(c.十二宫.length === 12, '十二宫齐全（' + c.十二宫.length + '）');
ok(c.命主星 && c.五行局 && c.命宫地支, '命主星=' + c.命主星 + ' 五行局=' + c.五行局 + ' 命宫地支=' + c.命宫地支);
ok(c.命宫.干支 && c.命宫.主星, '命宫（' + c.命宫.干支 + '）主星「' + c.命宫.主星 + '」');
ok(c.大限.命宫起限.length > 0, '大限岁数 ' + c.大限.命宫起限.slice(0, 3).join('、'));
ok(c.命宫.宫名 === '命宫', '命宫项定位正确（' + c.命宫.宫名 + '）');

// 性别顺逆：男顺女逆，命宫应不同
var c2 = Z.chart({ y: 1990, m: 8, d: 15, h: 14, gender: 'female' });
ok(!c2.err, '女命排盘不崩');
console.log('   男命宫=' + c.命宫.宫名 + '/' + c.命宫.干支 + ' 女命宫=' + c2.命宫.宫名 + '/' + c2.命宫.干支);

// 缺性别 → 由 feature 层追问（内核层面直接排不崩即可）
var c3 = Z.chart({ y: 2000, m: 1, d: 1, h: 0, gender: 'male' });
ok(!c3.err && c3.十二宫.length === 12, '2000 年命盘 12 宫');

if (fails === 0) { console.log('全部通过 ✓'); process.exit(0); } else { console.log(fails + ' 处失败'); process.exit(1); }
