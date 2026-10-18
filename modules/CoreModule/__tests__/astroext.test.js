/**
 * astroext.test.js —— 占星补全（§8.2–8.5 相位/推运/合盘/印占）确定性 + 结构断言
 */
var ASTRO = require('../astro.js');

var pass = 0, fail = 0;
function t(name, cond) { if (cond) pass++; else { fail++; console.log('  ✗ ' + name); } }
function eqf(name, got, exp, tol) {
  if (Math.abs(got - exp) <= tol) pass++; else { fail++; console.log('  ✗ ' + name + ' 期望≈' + exp + ' 实际 ' + got); }
}
function eq(name, got, exp) {
  var ok = JSON.stringify(got) === JSON.stringify(exp);
  if (ok) pass++; else { fail++; console.log('  ✗ ' + name + ' 期望 ' + JSON.stringify(exp) + ' 实际 ' + JSON.stringify(got)); }
}

// 纯数学：Lahiri 岁差近似
eqf('ayanamsa(2000)≈23.85', ASTRO.ayanamsa(2000), 23.85, 0.01);
eqf('ayanamsa(2026)≈24.21', ASTRO.ayanamsa(2026), 23.85 + 26 * 0.013968, 0.01);

// ===== v3.1.5：紫气（紫炁，第 11 曜·闺余虚星）+ 宿界表 =====
// 行度校验：相隔 28 年须回到同位（《星平会海》"28 年周天"）
(function () {
  var a = ASTRO.ziqi(1990, 8, 15, 12), b = ASTRO.ziqi(2018, 8, 15, 12);
  var d = Math.abs(((a - b) % 360 + 360) % 360); d = Math.min(d, 360 - d);
  eqf('ziqi 28年周天（相隔28年回同位）', d, 0, 0.01);
})();
// 年行度 ≈ 360/28 = 12.857°
(function () {
  var a = ASTRO.ziqi(1990, 1, 1, 0), b = ASTRO.ziqi(1991, 1, 1, 0);
  eqf('ziqi 年行≈12.857°', ((b - a) % 360 + 360) % 360, 360 / 28, 0.1);
})();
// 宿界表：角起 0°；张宿累计古度 312 → 起点黄经 312×360/365
eq('宿界表-角起点=0°', ASTRO.SUIXIU_BOUND[0].起点, 0);
eq('张宿累计古度=312', ASTRO.suiCumDeg('张'), 312);
eqf('张宿起点黄经=312×360/365', ASTRO.SUIXIU_BOUND[25].起点, 312 * 360 / 365, 0.01);
t('宿界表 28 项', ASTRO.SUIXIU_BOUND.length === 28);
// positions 输出 11 曜（含紫气），且紫气为非天文实体如实标注
var zp = ASTRO.positions({ y: 1990, m: 8, d: 15, h: 12 });
t('positions 输出 11 曜', !zp.err && Object.keys(zp.黄经).length === 11);
t('紫气黄经已算', zp.黄经 && zp.黄经.紫气 != null);
t('紫气落座/落宿/庙旺已算', zp.星座.紫气 && zp.二十八宿.紫气 && zp.庙旺.紫气);
t('紫气庙旺简称=气（果老表）', zp.庙旺.紫气 && zp.庙旺.紫气.简称 === '气');
t('紫气如实标注为非天文实体', zp.缺口.indexOf('非天文实体') >= 0 && zp.缺口.indexOf('闺余') >= 0);

// 本命盘（需 Astronomy 星历；无 vendor 则降级跳过星历相关断言）
var p = ASTRO.positions({ y: 1990, m: 8, d: 15, h: 12 });
if (!p.err && p.黄经.太阳 != null) {
  console.log('  （Astronomy 星历已加载，跑星历相关断言）');
  // §8.1 结构
  t('七政黄经非 null', p.黄经.太阳 != null && p.黄经.土星 != null);
  t('落座已算', p.星座.太阳 && p.星座.太阳.星座);

  // §8.2 相位
  var asp = ASTRO.aspects({ y: 1990, m: 8, d: 15, h: 12 });
  t('相位返回数组', Array.isArray(asp.相位));
  t('相位含类型字段', asp.相位.every(function (x) { return x.类型 && x.夹角 != null; }));

  // §8.3 次限推运
  var prog = ASTRO.progressions({ y: 1990, m: 8, d: 15, h: 12 }, 30);
  t('次限无 err', !prog.err);
  t('次限黄经已算', prog.次限黄经 && prog.次限黄经.太阳 != null);
  t('次限相位数组', Array.isArray(prog.次限相位));

  // §8.3 行运
  var tr = ASTRO.transits({ y: 1990, m: 8, d: 15, h: 12 }, { y: 2026, m: 1, d: 1, h: 12 });
  t('行运相位数组', Array.isArray(tr.行运相位));

  // §8.4 合盘
  var syn = ASTRO.synastry({ y: 1990, m: 8, d: 15, h: 12 }, { y: 1988, m: 3, d: 20, h: 6 });
  t('合盘无 err', !syn.err);
  t('合盘相位数组', Array.isArray(syn.合盘相位));

  // §8.5 印占
  var vd = ASTRO.vedicPositions({ y: 1990, m: 8, d: 15, h: 12 });
  t('印占无 err', !vd.err);
  t('恒星黄经存在', vd.恒星黄经 && vd.恒星黄经.太阳 != null);
  eqf('恒星≈回归-岁差', vd.恒星黄经.太阳, vd.回归黄经.太阳 - 24.2, 0.5);
  t('二十七宿-太阴已定', vd.二十七宿.太阴 && vd.二十七宿.太阴.宿名);
  t('Vimshottari 起限星非空', !!vd.Vimshottari.起限星);
  t('Vimshottari 大限序9项', vd.Vimshottari.大限序.length === 9);
  eq('Vimshottari 总年120', vd.Vimshottari.总年, 120);
  t('印占缺料标注', vd.缺料.length > 0);

  // §8.6 月亮返照（Lunar Return：月亮回到本命黄经）
  var lrN = ASTRO.positions({ y: 1990, m: 8, d: 15, h: 14, tz: 8 });
  var lr = ASTRO.lunarReturn({ y: 1990, m: 8, d: 15, h: 14, tz: 8 }, 2026, 10);
  t('月亮返照无 err 且给返照黄经', !lr.err && lr.返照黄经 && lr.返照黄经.太阴 != null);
  eqf('返照点月亮≈本命月亮（<0.001°）', lr.返照黄经.太阴, lrN.黄经.太阴, 0.001);
  t('返照时刻落在目标月 2026-10', lr.返照时刻UTC.slice(0, 7) === '2026-10');
  t('月亮返照带与本命相位数组', Array.isArray(lr.与本命相位));
} else {
  console.log('  （未加载 Astronomy 星历，跳过星历相关断言；仅验证纯数学 ayanamsa）');
  t('positions 优雅降级', p.err || p.黄经.太阳 == null);
}

console.log('\n占星补全测试：通过 ' + pass + ' / 失败 ' + fail);
process.exit(fail ? 1 : 0);
