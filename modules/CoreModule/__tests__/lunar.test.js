/**
 * modules/CoreModule/__tests__/lunar.test.js —— C01 适配层验收（node 直跑）
 * 用法：node modules/CoreModule/__tests__/lunar.test.js
 */
var L = require('../lunar.js');
var CFG = require('../config.js');
var fails = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓', msg); } else { fails++; console.log('  ✗', msg); } }

console.log('== lunar.js 适配层 ==');
var r = L.fromSolar(2005, 6, 9, 0, 0, 0);
// 与《玄玖灵犀》示例：白玖玖 2005-6-9 子时 → 乙酉/壬午/甲子/甲子（年柱为立春口径年干支）
ok(r.ganzhi.时.干支 === '甲子', '2005-06-09 00时 时柱=甲子（得 ' + r.ganzhi.时.干支 + '）');
ok(r.ganzhi.日.干支 === '甲子', '日柱=甲子（得 ' + r.ganzhi.日.干支 + '）');
ok(r.生肖 === '鸡', '生肖=鸡（得 ' + r.生肖 + '）');
ok(r.lunar.isLeap === false, '2005-06-09 非闰月');

console.log('== 闰月换算 ==');
var r2 = L.fromLunar(2020, 4, 15, true, 0, 0, 0);   // 闰四月十五
ok(r2.lunar.isLeap === true, '农历2020闰四月十五 isLeap=true');
console.log('   农历2020闰四月十五 → 公历', r2.solar.y + '-' + r2.solar.m + '-' + r2.solar.d, r2.solar.cn);

console.log('== 节气表 ==');
var jt = L.jieqiTable(2026);
ok(jt && jt['立春'] && jt['冬至'], '2026 节气表含立春/冬至');

console.log('== 口径开关生效 ==');
CFG.set({ yearBoundary: 'lichun' });
var r3 = L.fromSolar(1990, 2, 4, 0, 0, 0);   // 立春前后
ok(typeof r3.ganzhi.年.干支 === 'string' && r3.ganzhi.年.干支.length === 2, '年柱可切换口径后仍输出两字干支（' + r3.ganzhi.年.干支 + '）');
CFG.reset();

console.log('== 儒略日 ==');
var jd = L.julianDay(2000, 1, 1, 12, 0, 0);
ok(typeof jd === 'number', '儒略日返回数字（' + jd + '）');

if (fails === 0) { console.log('全部通过 ✓'); process.exit(0); }
else { console.log(fails + ' 处失败'); process.exit(1); }
