/**
 * modules/CoreModule/__tests__/zerixiongri.test.js —— 择日·专项凶日（v3.1.12）自测
 * 覆盖：杨公忌十三日 / 红沙日（四孟酉·四仲巳·四季丑，按节气月建）/ 三娘煞六日 /
 *       嫁娶周堂八位轮值（大小月两个方向）/ 农历月大小换算 / 扣分口径。
 * 跑法：node modules/CoreModule/__tests__/zerixiongri.test.js
 *
 * 说明：本测试刻意用「另一套写法」复述古籍口诀（而不是读实现里的表），
 *      实现与测试各写一遍，两边一致才算通过——避免自己验自己。
 */
var Z = require('../zeri.js');
var L = require('../lunar.js');

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}
function addD(y, m, d, n) {
  var t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() + n);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}
function luOf(y, m, d) {
  var i = L.fromSolar(y, m, d, 12, 0, 0);
  return i.lunar;
}

console.log('A. 杨公忌十三日');
// 歌诀原文：「神仙留下十三日，举动须防有损失」——正月十三、二月十一、三月初九、四月初七、
// 五月初五、六月初三、七月初一、七月廿九、八月廿七、九月廿五、十月廿三、十一月廿一、十二月十九。
var 应在 = [[1, 13], [2, 11], [3, 9], [4, 7], [5, 5], [6, 3], [7, 1], [7, 29], [8, 27], [9, 25], [10, 23], [11, 21], [12, 19]];
ok('表长 13 条（七月两日、其余每月一日）', Z.YANGGONG.length === 13, Z.YANGGONG.length);
ok('表内容与歌诀逐条一致', JSON.stringify(Z.YANGGONG) === JSON.stringify(应在));
var 漏 = 应在.filter(function (p) { return !Z.yanggongOf(p[0], p[1]); });
ok('十三日全部判为忌（yanggongOf 为真）', 漏.length === 0, JSON.stringify(漏));
ok('非忌日不误判（正月初一/六月十二/七月廿八）',
  !Z.yanggongOf(1, 1) && !Z.yanggongOf(6, 12) && !Z.yanggongOf(7, 28));
ok('全月逐日扫描：1–30 日每月恰好命中 1 日（七月 2 日）', (function () {
  var bad = [];
  for (var m = 1; m <= 12; m++) {
    var n = 0;
    for (var d = 1; d <= 30; d++) if (Z.yanggongOf(m, d)) n++;
    var want = (m === 7) ? 2 : 1;
    if (n !== want) bad.push(m + '月' + n + '日(应' + want + ')');
  }
  return bad.length === 0;
})());

// 2026 全年：日期 → 杨公忌 应与农历月日一致
var 二零二六忌日 = [];
for (var i = 0; i < 365; i++) {
  var dt = addD(2026, 1, 1, i);
  var x = Z.dayInfo(dt.y, dt.m, dt.d);
  if (x.杨公忌) 二零二六忌日.push(x.农历月 + '月' + x.农历日 + '日');
}
ok('2026 太阳年命中 13–14 个杨公忌日（农历年跨年，十一月廿一会出现两次）',
  二零二六忌日.length >= 13 && 二零二六忌日.length <= 14, 二零二六忌日.join('、'));
ok('2026 命中的日子都在歌诀表内', 二零二六忌日.every(function (s) {
  var mm = s.match(/^(\d+)月(\d+)日$/);
  return mm && Z.yanggongOf(+mm[1], +mm[2]);
}), 二零二六忌日.join('、'));

// 闰月不套：2025 年闰六月初三 ≠ 六月初三
var 闰六月初三 = null, 六月初三 = null;
for (var j = 0; j < 400; j++) {
  var d3 = addD(2025, 5, 1, j);
  var lu = luOf(d3.y, d3.m, d3.d);
  if (Math.abs(lu.month) === 6 && lu.day === 3) {
    if (lu.isLeap) 闰六月初三 = 闰六月初三 || d3;
    else 六月初三 = 六月初三 || d3;
  }
}
ok('找到 2025 年六月初三与闰六月初三', !!六月初三 && !!闰六月初三);
if (六月初三 && 闰六月初三) {
  var a1 = Z.dayInfo(六月初三.y, 六月初三.m, 六月初三.d);
  var a2 = Z.dayInfo(闰六月初三.y, 闰六月初三.m, 闰六月初三.d);
  ok('六月初三 → 杨公忌（农历' + a1.农历月 + '月' + a1.农历日 + '日）', a1.杨公忌 === true);
  ok('闰六月初三 → 不套十三日（闰月另说）', a2.杨公忌 === false);
  ok('闰月农历月显示为「6（闰）」而非负数', a2.农历月 === '6（闰）', a2.农历月);
}

console.log('B. 红沙日（四孟金鸡四仲蛇，四季丑日是红沙）');
// 独立复述：孟=寅申巳亥 逢酉；仲=子午卯酉 逢巳；季=辰戌丑未 逢丑。月建按节气（dayInfo.月建）。
function 红沙自算(月建, 日支) {
  if ('寅申巳亥'.indexOf(月建) >= 0) return 日支 === '酉';
  if ('子午卯酉'.indexOf(月建) >= 0) return 日支 === '巳';
  if ('辰戌丑未'.indexOf(月建) >= 0) return 日支 === '丑';
  return false;
}
var 支12 = '子丑寅卯辰巳午未申酉戌亥';
var 分族 = { 孟: '寅申巳亥', 仲: '子午卯酉', 季: '辰戌丑未' };
var 对表 = [], 应日 = { 孟: '酉', 仲: '巳', 季: '丑' };
for (var k = 0; k < 12; k++) {
  var z = 支12[k], 族 = null;
  for (var f in 分族) if (分族[f].indexOf(z) >= 0) 族 = f;
  ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'].forEach(function (dz) {
    var 应 = dz === 应日[族];
    if (Z.hongshaOf(z, dz) !== 应) 对表.push(z + '月' + dz + '日');
  });
}
ok('十二个月建 × 十二日支 全部与歌诀一致（144 组）', 对表.length === 0, 对表.join(' '));

// 全年扫描：dayInfo 的红沙必须与「按月建复算」完全同步
var 不同步 = [], 红沙日数 = 0;
for (var i2 = 0; i2 < 365; i2++) {
  var e = addD(2026, 1, 1, i2);
  var y2 = Z.dayInfo(e.y, e.m, e.d);
  if (y2.红沙) 红沙日数++;
  if (!!y2.红沙 !== 红沙自算(y2.月建, y2.日支)) {
    不同步.push(y2.公历 + '(' + y2.月建 + '月' + y2.日支 + '日)');
  }
}
ok('2026 全年 365 天逐日与歌诀复算一致', 不同步.length === 0, 不同步.slice(0, 5).join(' '));
// 日支 12 日一轮，一个月建（约 30 天）内逢 2–3 个目标支 → 一年 24–36 天
ok('红沙日频次与「12 日一轮」吻合（全年 24–36 天）', 红沙日数 >= 24 && 红沙日数 <= 36, 红沙日数 + ' 天');

// 口径证据：必有一批日子「农历月」与「节气月建」不同族，判定跟月建走
var 口径分歧 = 0, 跟农历月会错 = 0;
for (var i3 = 0; i3 < 365; i3++) {
  var g = addD(2026, 1, 1, i3);
  var y3 = Z.dayInfo(g.y, g.m, g.d);
  // 农历月 → 月建族（民间口诀按农历月定：正四七十→孟、二五八十一→仲、三六九十二→季）
  var 农历序 = +y3.农历月;
  var 农历族名 = (农历序 % 3 === 1) ? '孟' : (农历序 % 3 === 2 ? '仲' : '季');
  var 节气族名 = '寅申巳亥'.indexOf(y3.月建) >= 0 ? '孟' : ('子午卯酉'.indexOf(y3.月建) >= 0 ? '仲' : '季');
  if (农历族名 !== 节气族名) {
    口径分歧++;
    if (!!y3.红沙 !== (y3.日支 === 应日[农历族名])) 跟农历月会错++;
  }
}
ok('存在「农历月口径 ≠ 节气月建口径」的日子（' + 口径分歧 + ' 天），本内核取节气月建',
  口径分歧 > 0 && 跟农历月会错 > 0, '分歧 ' + 口径分歧 + ' / 若跟农历会错 ' + 跟农历月会错);

console.log('C. 三娘煞');
ok('六日为 初三·初七·十三·十八·廿二·廿七', JSON.stringify(Z.SANNIANG) === JSON.stringify([3, 7, 13, 18, 22, 27]));
var 三娘错 = [];
for (var d4 = 1; d4 <= 30; d4++) {
  var 应4 = ([3, 7, 13, 18, 22, 27].indexOf(d4) >= 0);
  if (Z.sanniangOf(d4) !== 应4) 三娘错.push(d4);
}
ok('初一至三十逐日判定无误', 三娘错.length === 0, 三娘错.join(','));

console.log('D. 嫁娶周堂（八位轮值）');
ok('八位次序 = 夫 姑 堂 翁 第 灶 妇 厨', Z.ZHOUTANG.join('') === '夫姑堂翁第灶妇厨', Z.ZHOUTANG.join(''));
var 大月应 = ['夫', '姑', '堂', '翁', '第', '灶', '妇', '厨', '夫'];
var 大月实 = [];
for (var d5 = 1; d5 <= 9; d5++) 大月实.push(Z.zhoutangOf(d5, true).位);
ok('大月：初一起「夫」顺数（夫姑堂翁第灶妇厨夫）', 大月实.join('') === 大月应.join(''), 大月实.join(''));
var 小月应 = ['妇', '灶', '第', '翁', '堂', '姑', '夫', '厨', '妇'];
var 小月实 = [];
for (var d6 = 1; d6 <= 9; d6++) 小月实.push(Z.zhoutangOf(d6, false).位);
ok('小月：初一起「妇」逆数（妇灶第翁堂姑夫厨妇）', 小月实.join('') === 小月应.join(''), 小月实.join(''));
ok('吉位 = 堂·第·灶·厨', ['堂', '第', '灶', '厨'].every(function (w) { return Z.zhoutangOf(Z.ZHOUTANG.indexOf(w) + 1, true).吉; }) &&
  ['夫', '妇', '翁', '姑'].every(function (w) { return !Z.zhoutangOf(Z.ZHOUTANG.indexOf(w) + 1, true).吉; }));

// 自洽校验：两种月型下「值夫/值妇」的日号并集 = 民间周堂杀七日 1·7·9·15·17·23·25
function 杀日(big) {
  var a = [];
  for (var d7 = 1; d7 <= 30; d7++) { var t = Z.zhoutangOf(d7, big); if (t.杀) a.push(d7); }
  return a;
}
var 大杀 = 杀日(true), 小杀 = 杀日(false);
ok('大月周堂杀 = 初一·初七·初九·十五·十七·廿三·廿五（' + 大杀.join('、') + '）',
  大杀.join(',') === '1,7,9,15,17,23,25', 大杀.join(','));
ok('小月周堂杀同上七日（与月型无关，故称「杀日」）', 小杀.join(',') === '1,7,9,15,17,23,25', 小杀.join(','));

console.log('E. 农历月大小换算（月长 29/30）');
// 独立做法：连续太阳日按 (月, 是否闰) 分组数天数，与 lunarMonthDays 在「初一」取的值比对
var 组 = [], 当前 = null;
for (var i5 = 0; i5 < 760; i5++) {
  var s = addD(2025, 1, 1, i5);
  var lu5 = luOf(s.y, s.m, s.d);
  var key = Math.abs(lu5.month) + (lu5.isLeap ? 'L' : '');
  if (!当前 || 当前.key !== key) { 当前 = { key: key, n: 0, first: s }; 组.push(当前); }
  当前.n++;
}
var 长月 = 组.filter(function (x) { return x.n === 30; }).length;
var 短月 = 组.filter(function (x) { return x.n === 29; }).length;
// 首尾两组被扫描窗口截断（不是完整月），去掉后再判月长
var 实组 = 组.slice(1, -1);
var 月长错 = 实组.filter(function (x) { return x.n !== 29 && x.n !== 30; });
ok('分组得到的月长只可能是 29 或 30（' + 实组.length + ' 个完整月）', 月长错.length === 0,
  月长错.map(function (x) { return x.key + '=' + x.n; }).join(' '));
ok('大月与小月都出现（30 日 ' + 长月 + ' 月 / 29 日 ' + 短月 + ' 月）', 长月 > 0 && 短月 > 0);
var 换算错 = [];
实组.forEach(function (x) {
  var got = Z.lunarMonthDays(x.first.y, x.first.m, x.first.d, luOf(x.first.y, x.first.m, x.first.d));
  if (got !== x.n) 换算错.push(x.key + ' 实' + x.n + ' 算' + got);
});
ok('lunarMonthDays 与逐日计数完全一致（' + 实组.length + ' 个月全对）', 换算错.length === 0, 换算错.slice(0, 4).join(' '));
// dayInfo 的「月大小」字段与之一致（取初一那天）
var 月大小错 = 实组.filter(function (x) {
  var t = Z.dayInfo(x.first.y, x.first.m, x.first.d);
  return (t.月大小 === '大月') !== (x.n === 30);
});
ok('dayInfo.月大小 与实算月长一致', 月大小错.length === 0, 月大小错.slice(0, 3).map(function (x) { return x.key; }).join(' '));

console.log('F. 扣分口径（与 score 的 ⑤ 节对应）');
var r嫁 = Z.select({ 事项: '结婚', 起: { y: 2026, m: 1, d: 1 }, 天数: 90 });
var 有杨公忌 = r嫁.日课.filter(function (x) { return x.杨公忌; });
ok('90 天范围能扫到杨公忌日', 有杨公忌.length >= 1, 有杨公忌.length + ' 天');
ok('杨公忌日在明细里写明 −30', 有杨公忌.length === 0 || 有杨公忌.some(function (x) {
  return x.评分明细.some(function (w) { return /－30 杨公忌日/.test(w); });
}), 有杨公忌.length ? 有杨公忌[0].评分明细.join('；') : '');
var 有红沙 = r嫁.日课.filter(function (x) { return x.红沙; });
ok('红沙日在明细里写明 −25', 有红沙.length === 0 || 有红沙.some(function (x) {
  return x.评分明细.some(function (w) { return /－25 红沙日/.test(w); });
}), 有红沙.length ? 有红沙[0].评分明细.join('；') : '');
ok('嫁娶事项会就三娘煞/周堂加减分', r嫁.日课.some(function (x) {
  return x.评分明细.some(function (w) { return /三娘煞日|嫁娶周堂值/.test(w); });
}));
var r开 = Z.select({ 事项: '开业', 起: { y: 2026, m: 1, d: 1 }, 天数: 90 });
ok('非嫁娶事项不拿三娘煞/周堂扣分', r开.日课.every(function (x) {
  return x.评分明细.every(function (w) { return !/三娘煞|周堂/.test(w); });
}));
ok('非嫁娶事项仍照扣杨公忌/红沙（两者不限事项）', r开.日课.some(function (x) {
  return x.评分明细.some(function (w) { return /杨公忌日|红沙日/.test(w); });
}));

console.log('\n=== 择日专项凶日 自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
process.exit(fail ? 1 : 0);
