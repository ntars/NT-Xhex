/**
 * modules/CoreModule/__tests__/solarlunar.test.js —— 内嵌历法库（lunar-javascript / 6tail, MIT）冒烟验收
 *
 * 为什么单独测：solarlunar.js 是全项目**历法底座**（437KB），公历↔农历 / 干支 / 八字 / 每日黄历全依赖它；
 *   它是「整文件替换式内嵌库」，一旦升级或传输损坏会**静默**算错，且从上层测试难以定位到它。
 *   本文件锁「关键换算已知值」+「黄历方法完整性」，solarlunar.js 头注释里的「校验收」即指本文件。
 */
var SL = require('../solarlunar.js');
var passed = 0, failed = 0;
function ok(name, cond, detail) { if (cond) { passed++; console.log('  ✓', name); } else { failed++; console.log('  ✗', name, detail || ''); } }

// ===== A. 导出完整性 =====
console.log('A. 导出完整性');
['Solar', 'Lunar', 'EightChar', 'SolarUtil', 'LunarUtil', 'NineStar'].forEach(function (k) {
  ok('导出 ' + k, !!SL[k]);
});

// ===== B. 公历→农历/干支/八字（项目基准例：白玖玖 2005-6-9 子时 → 乙酉/壬午/甲子/甲子）=====
console.log('B. 公历→农历/干支/八字（项目基准例）');
var s = SL.Solar.fromYmd(2005, 6, 9), l = s.getLunar(), ec = l.getEightChar();
ok('农历 = 二〇〇五年五月初三', l.toString() === '二〇〇五年五月初三', l.toString());
ok('干支 = 乙酉 壬午 甲子', l.getYearInGanZhi() === '乙酉' && l.getMonthInGanZhi() === '壬午' && l.getDayInGanZhi() === '甲子',
  [l.getYearInGanZhi(), l.getMonthInGanZhi(), l.getDayInGanZhi()].join(' '));
ok('八字（子时）= 乙酉 壬午 甲子 甲子',
  ec.getYear() === '乙酉' && ec.getMonth() === '壬午' && ec.getDay() === '甲子' && ec.getTime() === '甲子',
  [ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime()].join(' '));
ok('生肖 = 鸡', l.getYearShengXiao() === '鸡', l.getYearShengXiao());
ok('星期 = 4（周四）', s.getWeek() === 4, String(s.getWeek()));

// ===== C. 现代日期 + 黄历方法完整性（每日黄历 shensha.js 直接依赖这些）=====
console.log('C. 2026-10-18 + 黄历方法完整性');
var s2 = SL.Solar.fromYmd(2026, 10, 18), l2 = s2.getLunar();
ok('2026-10-18 农历 = 九月初九（重阳）', l2.toString() === '二〇二六年九月初九', l2.toString());
['getZhiXing', 'getDayTianShen', 'getDayTianShenType', 'getDayTianShenLuck', 'getXiu', 'getXiuLuck',
 'getPengZuGan', 'getPengZuZhi', 'getDayPositionTai', 'getDayYi', 'getDayJi',
 'getDayChongShengXiao', 'getDaySha', 'getDayNineStar'].forEach(function (m) {
  ok('Lunar.' + m + ' 是函数', typeof l2[m] === 'function');
});
ok('值星（建除）= 平', l2.getZhiXing() === '平', l2.getZhiXing());
ok('宜/忌 均为非空数组', Array.isArray(l2.getDayYi()) && l2.getDayYi().length > 0 && Array.isArray(l2.getDayJi()) && l2.getDayJi().length > 0,
  '宜' + (l2.getDayYi() || []).length + ' 忌' + (l2.getDayJi() || []).length);
ok('九星可取字符串', !!l2.getDayNineStar() && !!l2.getDayNineStar().toString());

// ===== D. 农历→公历反查 =====
console.log('D. 农历→公历反查');
ok('农历2005年五月初三 → 2005-06-09', SL.Lunar.fromYmd(2005, 5, 3).getSolar().toYmd() === '2005-06-09',
  SL.Lunar.fromYmd(2005, 5, 3).getSolar().toYmd());

console.log('\n=== solarlunar 冒烟验收：' + passed + ' 通过 / ' + failed + ' 失败 ===');
process.exit(failed ? 1 : 0);
