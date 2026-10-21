/**
 * modules/CoreModule/__tests__/numeral.test.js
 * 数字命理内核 C10 自测（按任务清单 line 42 用户亲撰规格）。
 * 运行：node modules/CoreModule/__tests__/numeral.test.js
 */
var N = require('../numeral.js');
var ok = 0, fail = 0, fails = [];
function eq(label, got, want) {
  var g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { ok++; } else { fail++; fails.push(label + ' 期望 ' + w + ' 实得 ' + g); }
}
function has(label, hay, needle) {
  if (hay.indexOf(needle) >= 0) { ok++; } else { fail++; fails.push(label + ' 未包含 ' + JSON.stringify(needle) + ' 于 ' + JSON.stringify(hay)); }
}

// ---- 下卦映射 d>6减6、d≤6加6（等于6也加6）----
eq('lowerDigit(8)', N.lowerDigit(8), 2);
eq('lowerDigit(12)', N.lowerDigit(12), 6);
eq('lowerDigit(6)', N.lowerDigit(6), 12);   // 等于6也加6
eq('lowerDigit(1)', N.lowerDigit(1), 7);

// ---- 日柱拆分边界 ----
eq('daySeq(9)', N.daySeq(9), [9]);
eq('daySeq(10)', N.daySeq(10), [1, 10]);
eq('daySeq(11)', N.daySeq(11), [1, 10, 1]);
eq('daySeq(20)', N.daySeq(20), [2, 10]);
eq('daySeq(21)', N.daySeq(21), [2, 10, 1]);
eq('daySeq(30)', N.daySeq(30), [3, 10]);
eq('daySeq(31)', N.daySeq(31), [3, 10, 1]);

// ---- 时辰序：子1…亥12 ----
eq('hourSeq(0)', N.hourSeq(0), 1);     // 子
eq('hourSeq(1)', N.hourSeq(1), 2);     // 丑
eq('hourSeq(2)', N.hourSeq(2), 2);     // 丑
eq('hourSeq(23)', N.hourSeq(23), 1);   // 子

// ---- 头尾相连循环枚举 ----
var rot = N.cyclicRotations([8, 6, 9, 1]).map(function (r) { return r.join('-'); });
eq('循环枚举数量', rot.length, 4);
has('循环含 6-9-1-8', rot.join('|'), '6-9-1-8');
has('循环含 9-1-8-6', rot.join('|'), '9-1-8-6');
has('循环含 1-8-6-9', rot.join('|'), '1-8-6-9');

// ---- 上下卦交集：上卦8-6-9-1 下卦2-12-3-7 ----
eq('交集对', N.crossPairs([8, 6, 9, 1], [2, 12, 3, 7]), [[8, 2], [6, 12], [9, 3], [1, 7]]);

// ===== 示例①：白玖玖 2005.06.09 子时(0) 女 =====
var bjj = N.paiPan({ y: 2005, m: 6, d: 9, h: 0, gender: 'female' });
// ⚠ 年柱：真实 2005=乙酉鸡=10；用户文档示例标"羊=8"。本实现依真实生肖序=10，已诚实标注。
eq('白玖玖 上卦', bjj.上卦, [10, 6, 9, 1]);
eq('白玖玖 下卦', bjj.下卦, [4, 12, 3, 7]);
has('白玖玖 因果(女下卦为因)', bjj.因果.方向, '下卦为因');
eq('白玖玖 日拆分', bjj.日拆分, [9]);

// ===== 示例②：2005.12.23 丑时(2) 男 =====
var ex2 = N.paiPan({ y: 2005, m: 12, d: 23, h: 2, gender: 'male' });
eq('示例② 上卦', ex2.上卦, [10, 12, 2, 10, 3, 2]);   // 与文档 8-12-2-10-3-2 仅年位差(8 vs 10)
eq('示例② 下卦', ex2.下卦, [4, 6, 8, 4, 9, 8]);       // 与文档 2-6-8-4-9-8 完全一致
has('示例② 因果(男上卦为因)', ex2.因果.方向, '上卦为因');

// ---- 凶数判定（◆ 自研）----
var hits = N.judgeArray([8, 6, 9, 1, 2, 12, 3, 7]);
has('命中八绝 8-1/1-8', JSON.stringify(hits), '八绝');
// 注意 judgeArray 为子串包含判定，用例需避免相邻数字误触凶阵
var none = N.judgeArray([4, 4, 4, 4, 4]);
eq('无凶数判定为空', none.length, 0);
// 9-1 属八绝，验证判定函数生效
var hit91 = N.judgeArray([9, 1, 2, 3]);
has('命中八绝 9-1', JSON.stringify(hit91), '9-1');

console.log('数字八字内核 C10 自测：通过 ' + ok + ' / 失败 ' + fail);
if (fail) { console.log('失败项：\n' + fails.join('\n')); process.exit(1); }
