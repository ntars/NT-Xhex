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
} else {
  console.log('  （未加载 Astronomy 星历，跳过星历相关断言；仅验证纯数学 ayanamsa）');
  t('positions 优雅降级', p.err || p.黄经.太阳 == null);
}

console.log('\n占星补全测试：通过 ' + pass + ' / 失败 ' + fail);
process.exit(fail ? 1 : 0);
