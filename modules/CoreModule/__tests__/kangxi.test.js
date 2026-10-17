/**
 * modules/CoreModule/__tests__/kangxi.test.js —— 康熙笔画 3500 字表 + 姓名五格 验收
 * 用法：node modules/CoreModule/__tests__/kangxi.test.js
 *
 * 锁两条：
 *   ① kangxi-strokes.js 覆盖通用规范汉字 3500 字，高频姓与主流五格软件一致；
 *   ② name81.js 接上该表后 KANGXI_COVERAGE=3500，常用名可算、缺字报缺不臆造。
 */
var KX = require('../kangxi-strokes.js');
var N81 = require('../name81.js');
var fails = 0;
function ok(c, m) { if (c) console.log('  ✓', m); else { fails++; console.log('  ✗', m); } }

console.log('== kangxi-strokes.js（3500 字表，TDEM 康熙部首口径）==');
ok(KX.COUNT === 3500, '条目数 = ' + KX.COUNT + '（应为 3500）');
// 高频姓康熙值（主流五格软件口径，与 TDEM kangxi-strokecount / bename 一致）
var known = { 张: 11, 刘: 15, 杨: 13, 黄: 12, 周: 8, 马: 10, 罗: 20, 谢: 17, 韩: 17, 王: 4, 陈: 16, 郑: 19 };
var spotBad = 0;
for (var ch in known) { if (KX.KANGXI[ch] !== known[ch]) { spotBad++; console.log('      偏差：' + ch + ' 期望' + known[ch] + ' 得' + KX.KANGXI[ch]); } }
ok(spotBad === 0, '高频姓康熙值全部命中（' + Object.keys(known).length + ' 个，含康熙部首旧制 陈16/郑19/罗20）');
// 康熙部首旧制敏感字（TDEM 定标）：万→萬15、花(艸部)10、远→遠17、门→門8
ok(KX.KANGXI['万'] === 15 && KX.KANGXI['花'] === 10 && KX.KANGXI['远'] === 17 && KX.KANGXI['门'] === 8, '部首旧制敏感字（万15/花10/远17/门8）');
// 值域合法（1..40）
var inRange = Object.keys(KX.KANGXI).every(function (c) { var v = KX.KANGXI[c]; return v >= 1 && v <= 40; });
ok(inRange, '笔画值域 1..40 合法');

console.log('== name81.js 接 3500 表 ==');
ok(N81.KANGXI_COVERAGE === 3500, 'KANGXI_COVERAGE = ' + N81.KANGXI_COVERAGE);
var w = N81.wuge('张一鸣');
ok(!w.incomplete && w.天格 && w.人格 && w.地格, '「张一鸣」五格（天' + w.天格 + ' 人' + w.人格 + ' 地' + w.地格 + ' 总' + w.总格 + '）');
var sc = N81.score('张一鸣');
ok(sc.得分 != null && sc.五格, '「张一鸣」评分 ' + sc.得分 + '/100（' + sc.评语 + '）');
// 三才五行新映射（1,2木 3,4火 5,6土 7,8金 9,0水）
ok(w.三才[0] && N81.wuge('张一鸣').三才[0] === '木', '三才数→五行：12（天/人格）=木');

console.log('== 81 数理档位（熊崎氏标准表，5 源核对）==');
// 权威明确项：吉/凶/半吉 各抽查（与道客易/熊崎氏表一致）
ok(N81.grade(81).吉凶 === '吉', '81=万物回春·吉（最极之数，与 1 等）');
ok(N81.grade(9).吉凶 === '凶', '9=凶（有才无命）');
ok(N81.grade(12).吉凶 === '凶', '12=凶（薄弱无力）');
ok(N81.grade(14).吉凶 === '凶', '14=凶（忍得苦难，必有后福，成敗靠坚）');
ok(N81.grade(17).吉凶 === '吉', '17=吉（排除万难，贵人相助）');
ok(N81.grade(29).吉凶 === '吉', '29=吉（果敢刚毅，突破万难）');
ok(N81.grade(44).吉凶 === '凶', '44=凶（事业萎缩，万事终局）');
ok(N81.grade(45).吉凶 === '吉', '45=吉（顺风通达，德高望重）');
ok(N81.grade(49).吉凶 === '半吉', '49=半吉（吉凶参半，独立未定）');
// 档位统计（吉39/半吉13/凶29）
var cnt = { 吉: 0, 半吉: 0, 凶: 0 };
for (var n = 1; n <= 81; n++) cnt[N81.grade(n).吉凶]++;
ok(cnt.吉 === 39 && cnt.半吉 === 13 && cnt.凶 === 29, '81 档统计：吉' + cnt.吉 + ' / 半吉' + cnt.半吉 + ' / 凶' + cnt.凶);

if (fails === 0) { console.log('全部通过 ✓'); process.exit(0); } else { console.log(fails + ' 处失败'); process.exit(1); }
