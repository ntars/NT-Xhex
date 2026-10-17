/**
 * modules/CoreModule/__tests__/astro.test.js —— 占星/七政内核自测
 * 跑法：node modules/CoreModule/__tests__/astro.test.js
 * 裁判基准：
 *   七政 7 曜 = ephem(JPL) 回归黄经（tools/astro-gen-ref.py 产出，J2000 与 2026 两个样本）。
 *   三余 3 曜 = Meeus §38.B 均值公式在 J2000（T=0）的解析值（Ω=125.0445/ϖ=83.3532 公认基准点）。
 *   落星座   = 回归黄经 ÷30° 等分（0=白羊）的确定性映射。
 */
var assert = require('assert');
var astro = require('../astro.js');

var passed = 0, failed = 0;
function ok(name, cond, detail) { if (cond) { passed++; console.log('  ✓', name); } else { failed++; console.log('  ✗', name, detail || ''); } }

// 1. vendor 已接线
console.log('1. vendor/astronomy.js 接线');
ok('astronomy 可用（_vendorOk）', astro._vendorOk === true);

// 2. 七政 7 曜对 ephem（回归黄经，容差 0.1°，实测 <0.01°）
console.log('2. 七政对 ephem(JPL)');
// J2000 基准（ephem 回归口径：Ecliptic(body, epoch=dt)）
var REF_2000 = { 太阳: 280.379, 太阴: 223.328, 水星: 271.899, 金星: 241.574, 火星: 327.971, 木星: 25.256, 土星: 40.397 };
var p2000 = astro.positions({ y: 2000, m: 1, d: 1, h: 12 });
ok('J2000 无 err', !p2000.err, p2000.err);
Object.keys(REF_2000).forEach(function (k) {
  var diff = Math.abs(p2000.黄经[k] - REF_2000[k]);
  diff = Math.min(diff, 360 - diff);
  ok('2000 ' + k + '=' + p2000.黄经[k].toFixed(2) + ' (ephem ' + REF_2000[k] + ')', diff < 0.1, 'Δ=' + diff.toFixed(3));
});
// 2026 样本
var REF_2026 = { 太阳: 203.23, 太阴: 270.517, 水星: 227.749, 金星: 215.076, 火星: 130.506, 木星: 142.194, 土星: 10.357 };
var p2026 = astro.positions({ y: 2026, m: 10, d: 16, h: 14 });
ok('2026 无 err', !p2026.err, p2026.err);
Object.keys(REF_2026).forEach(function (k) {
  var diff = Math.abs(p2026.黄经[k] - REF_2026[k]);
  diff = Math.min(diff, 360 - diff);
  ok('2026 ' + k + '=' + p2026.黄经[k].toFixed(2) + ' (ephem ' + REF_2026[k] + ')', diff < 0.1, 'Δ=' + diff.toFixed(3));
});

// 3. 三余（mean）J2000 解析基准：Ω=125.0445, ϖ+180=263.3532
console.log('3. 三余 Meeus 均值公式（J2000 T=0）');
var r3 = astro.threeRemainders(2000, 1, 1, 12);
ok('罗睺(Ω)=125.045', Math.abs(r3.罗睺 - 125.045) < 0.01, String(r3.罗睺));
ok('计都(Ω+180)=305.045', Math.abs(r3.计都 - 305.045) < 0.01, String(r3.计都));
ok('月孛(ϖ+180)=263.353', Math.abs(r3.月孛 - 263.353) < 0.01, String(r3.月孛));
// 三余随时间变化（非常数）：J2000 vs 2026 不同
var r3b = astro.threeRemainders(2026, 10, 16, 14);
ok('罗睺随 T 变化（非冻结）', Math.abs(r3b.罗睺 - r3.罗睺) > 1, 'J2000=' + r3.罗睺 + ' 2026=' + r3b.罗睺);

// 4. 落十二宫（回归等分）确定性映射
console.log('4. 落十二星座');
ok('J2000 太阳 280.38°→摩羯', p2000.星座.太阳.星座 === '摩羯', p2000.星座.太阳.星座);
ok('白羊 0°', astro.signOf(0).星座 === '白羊');
ok('白羊 29.9°', astro.signOf(29.9).星座 === '白羊');
ok('金牛 30°', astro.signOf(30).星座 === '金牛');
ok('双鱼 359°', astro.signOf(359).星座 === '双鱼');
ok('360° 回绕=白羊', astro.signOf(360).星座 === '白羊');

// 5. 缺口诚实标注
console.log('5. 缺口标注');
ok('紫炁不臆造（缺口字段存在）', typeof p2000.缺口 === 'string' && p2000.缺口.indexOf('紫炁') >= 0);
ok('黄经表无紫炁键', p2000.黄经['紫炁'] === undefined);

// 6. 缺料
console.log('6. 缺料拦截');
ok('缺日期给 prompt', astro.positions({}).err !== undefined);

console.log('\n=== astro 自测：' + passed + ' 通过 / ' + failed + ' 失败 ===');
process.exit(failed ? 1 : 0);
