/**
 * modules/CoreModule/__tests__/astrotuiyun.test.js —— 推运四法（次限 / 行运 / 太阳返照 / 法达）校验
 *
 * 为什么单独一个文件：这四法里有三法原本只有触发词、没有实现（问「法达」答次限、问「太阳返照」答次限），
 * 属「假承诺」。本次补真算法后，必须把「答的是不是那个东西」锁住，否则以后又会悄悄退化成串答。
 *
 * 法达口径（五源核对：astrodoor 繁/简、traditional-astrology、yourhearth、astrostarcheck）：
 *   日生 太阳10 金星8 水星13 月亮9 土星11 木星12 火星7 北交3 南交2（合 75）
 *   夜生 月亮9 土星11 木星12 火星7 太阳10 金星8 水星13 北交3 南交2
 *   副运 = 主期 7 等分，首份为主星本人，其后按同一次序循环；交点期本实现不分（各家有分歧，已标注）。
 */
var A = require('../astro.js');
var R = require('../../features/registry.js');

var fails = 0;
function ok(cond, label, extra) {
  if (cond) console.log('  ✓ ' + label);
  else { fails++; console.log('  ✗ ' + label + (extra ? '（' + extra + '）' : '')); }
}
function ent(y, m, d, h) { return { date: { year: y, month: m, day: d }, time: { hour: h == null ? 12 : h } }; }

// ============ ① 法达表本身 ============
console.log('== ① 法达星限表 ==');
var daySum = A.FIRDARIA['日'].reduce(function (a, r) { return a + r[1]; }, 0);
var nightSum = A.FIRDARIA['夜'].reduce(function (a, r) { return a + r[1]; }, 0);
ok(daySum === 75, '日生九期合计 75 年（实际 ' + daySum + '）');
ok(nightSum === 75, '夜生九期合计 75 年（实际 ' + nightSum + '）');
ok(A.FIRDARIA['日'][0][0] === '太阳' && A.FIRDARIA['夜'][0][0] === '月亮', '日生首期太阳 / 夜生首期月亮');
ok(A.FIRDARIA['日'].map(function (r) { return r[0]; }).join(',') === '太阳,金星,水星,月亮,土星,木星,火星,北交,南交', '日生顺序对五源口径');
ok(A.FIRDARIA['夜'].map(function (r) { return r[0]; }).join(',') === '月亮,土星,木星,火星,太阳,金星,水星,北交,南交', '夜生顺序对五源口径');

// ============ ② 法达落点 ============
console.log('== ② 法达落点（日/夜盘）==');
var fd = A.firdaria({ y: 1990, m: 8, d: 15, h: 12, tz: 8 }, { age: 36 });
ok(fd.盘别 === '日生盘', '1990-08-15 12 时（东八区）判为日生盘（实际 ' + fd.盘别 + '）');
ok(/月亮/.test(fd.当前大运) && /31–40/.test(fd.当前大运), '36 岁落太阳 0-10/金星 10-18/水星 18-31/月亮 31-40 → 月亮期');
ok(/火星/.test(fd.当前副运), '月亮期 7 等分（1.286 年/份）36 岁落第 4 份 = 火星（实际 ' + fd.当前副运 + '）');
ok(fd.副运表 && fd.副运表.length === 7, '副运表 7 条');
ok(fd.副运表[0].副星 === '月亮', '副运首份是主星本人');
var fn = A.firdaria({ y: 1990, m: 8, d: 15, h: 2, tz: 8 }, { age: 20 });
ok(fn.盘别 === '夜生盘', '同日凌晨 2 时判为夜生盘（实际 ' + fn.盘别 + '）');
ok(/木星/.test(fn.当前大运) && /20–32/.test(fn.当前大运), '夜生 20 岁落月亮 0-9/土星 9-20/木星 20-32 → 木星期');
var nodeP = A.firdaria({ y: 1990, m: 8, d: 15, h: 12, tz: 8 }, { age: 71 });
ok(/北交/.test(nodeP.当前大运) && /不细分/.test(String(nodeP.当前副运)), '交点期按「不细分」处理并写明');
ok(/未给出生地/.test(fd.判定), '未给出生地时明确标注「按北京近似」，不悄悄默认');

// ============ ③ 太阳返照 ============
console.log('== ③ 太阳返照盘 ==');
var nat = A.positions({ y: 1990, m: 8, d: 15, h: 12, tz: 8 });
var sr = A.solarReturn({ y: 1990, m: 8, d: 15, h: 12, tz: 8 }, 2026);
ok(!sr.err, '返照可算（err：' + (sr.err || '无') + '）');
var gap = Math.abs(((sr.返照黄经['太阳'] - nat.黄经['太阳'] + 540) % 360) - 180);
ok(gap < 0.01, '返照时刻太阳黄经 = 本命太阳黄经（差 ' + gap.toFixed(4) + '°）');
ok(/2026-08-1[3-6]/.test(sr.返照时刻本地), '返照落在生日前后（实际 ' + sr.返照时刻本地 + '）');
ok(Array.isArray(sr.与本命相位) && sr.与本命相位.length > 0, '返照盘带出对本命相位');
var sr2 = A.solarReturn({ y: 1990, m: 8, d: 15, h: 12, tz: 8 }, 2027);
ok(sr2.返照时刻UTC !== sr.返照时刻UTC, '不同年份返照时刻不同（不是拿当年生日充数）');

// ============ ④ 行运 ============
console.log('== ④ 行运 ==');
var tr = A.transits({ y: 1990, m: 8, d: 15, h: 12, tz: 8 }, { y: 2026, m: 10, d: 17, h: 12, tz: 8 });
ok(!tr.err && Array.isArray(tr.行运相位) && tr.行运相位.length > 0, '行运相位可算（' + tr.行运相位.length + ' 条）');
ok(!!tr.行运黄经 && tr.行运黄经['太阳'] != null, '行运带出该日行星黄经（可核对）');

// ============ ⑤ 搜索框四路分流 ============
console.log('== ⑤ 搜索框分流（不再串答）==');
var E36 = ent(1990, 8, 15, 12);
var qF = R.run('astro-tuiyun', E36, '法达 36岁');
ok(/【占星·推运】法达星限/.test(qF.text || ''), '问「法达」答法达（不是次限）');
ok(/九期/.test(qF.text || '') && /副运/.test(qF.text || ''), '法达输出九期 + 副运');
var qS = R.run('astro-tuiyun', E36, '太阳返照');
ok(/【占星·推运】太阳返照/.test(qS.text || ''), '问「太阳返照」答返照盘（不是次限）');
ok(/不按生日当天零点/.test(qS.text || ''), '返照口径写明「不取整」');
var qT = R.run('astro-tuiyun', E36, '2026年10月17日 行运');
ok(/【占星·推运】行运/.test(qT.text || '') && /2026年10月17日/.test(qT.text || ''), '问「某日 行运」用该日期算行运');
var qP = R.run('astro-tuiyun', E36, '推运 36岁');
ok(/【占星·推运】次限/.test(qP.text || ''), '问「推运」仍走次限');
ok(qP.text.indexOf('[object Object]') < 0 && qS.text.indexOf('[object Object]') < 0, '输出里没有 [object Object]（对象未格式化的典型症状）');
var qL = R.run('astro-tuiyun', E36, '月亮返照');
ok(/未实现/.test(qL.prompt || ''), '月亮返照未实现时明说，不拿太阳返照冒充');

// ============ ⑥ 奇门家数不许冒充 ============
console.log('== ⑥ 奇门家数 ==');
var Eq = { date: { year: 1990, month: 8, day: 15 }, time: { hour: 14 } };
// 刻家/日家已各有内核 → 时家块被问到时必须「指路」过去，而不是拿时家属局冒充
var qk = R.run('qimen', Eq, '刻家奇门');
ok(/另有一套内核/.test(qk.text || '') && /刻家奇门 1990/.test(qk.text || ''), '问「刻家奇门」时指路到刻家内核（并给出可复制的说法）');
ok((qk.text || '').indexOf('⚠️') === 0, '警告放在首行（不会被结果页裁掉）');
var qr = R.run('qimen', Eq, '日家奇门');
ok(/另有一套内核/.test(qr.text || '') && /日家奇门 1990/.test(qr.text || ''), '问「日家奇门」时指路到日家内核');
// 年家/月家仍未实现 → 必须如实声明、不冒充
var qy = R.run('qimen', Eq, '年家奇门');
ok(/未实现/.test(qy.text || ''), '问「年家奇门」如实声明本版未实现（不冒充）');
var qn = R.run('qimen', Eq, '奇门');
ok((qn.text || '').indexOf('⚠️') < 0, '正常问奇门不加警告（不打扰）');

console.log(fails === 0 ? '\n全部通过' : '\n' + fails + ' 处失败');
process.exit(fails === 0 ? 0 : 1);
