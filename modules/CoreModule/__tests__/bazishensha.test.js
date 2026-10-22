/**
 * bazi-shensha 自测（C31 神煞全表 + 八字合婚）
 * 黄金盘：1990-08-15 14时（庚午 甲申 壬子 丁未），各神煞已按表手工复核。
 */
var S = require('../bazi-shensha.js');
var B = require('../bazi.js');

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name + (extra ? '  [' + extra + ']' : '')); }
  else { fail++; console.log('  ✗ ' + name + '  [' + (extra || '') + ']'); }
}
var P1 = { y: 1990, m: 8, d: 15, h: 14, gender: 'male' };

// A. 四柱基准
console.log('A. 四柱与日主');
var r = S.analyze(P1);
ok('四柱 = 年柱庚午 月柱甲申 日柱壬子 时柱丁未', r.四柱 === '年柱庚午 月柱甲申 日柱壬子 时柱丁未', r.四柱);
ok('日主 = 壬（水）', r.日主 === '壬（水）', r.日主);

// B. 神煞表逐条查（表值本身是权威口诀，此处锁死防手滑）
console.log('B. 神煞表值');
ok('天乙贵人 壬 → 卯巳（bazi-shensha 自持 GUI_REN，v3.2.0 起为唯一真源）', (function () {
  return S.GUI_REN['壬'].join('') === '卯巳';
})(), 'ok');
ok('太极贵人 壬 → 巳申', S.TAIJI['壬'].join('') === '巳申', S.TAIJI['壬'].join(''));
ok('文昌 甲巳 乙午 丙申 丁酉 戊申 己酉 庚亥 辛子 壬寅 癸卯',
  S.WENCHANG.甲 === '巳' && S.WENCHANG.乙 === '午' && S.WENCHANG.丙 === '申' && S.WENCHANG.丁 === '酉' &&
  S.WENCHANG.戊 === '申' && S.WENCHANG.己 === '酉' && S.WENCHANG.庚 === '亥' && S.WENCHANG.辛 === '子' &&
  S.WENCHANG.壬 === '寅' && S.WENCHANG.癸 === '卯', 'ok');
ok('天德 正月(寅)丁 / 二月(卯)申 / 五月(午)亥', S.TIANDE.寅 === '丁' && S.TIANDE.卯 === '申' && S.TIANDE.午 === '亥', 'ok');
ok('月德 申子辰月见壬', S.YUEDE.申 === '壬' && S.YUEDE.子 === '壬' && S.YUEDE.辰 === '壬', 'ok');
ok('驿马 申子辰马在寅、亥卯未马在巳', S.YIMA.申 === '寅' && S.YIMA.亥 === '巳', 'ok');
ok('桃花 申子辰在酉、寅午戌在卯', S.TAOHUA.申 === '酉' && S.TAOHUA.寅 === '卯', 'ok');
ok('华盖 申子辰在辰、亥卯未在未', S.HUAGAI.申 === '辰' && S.HUAGAI.亥 === '未', 'ok');
ok('将星 申子辰在子（帝旺）', S.JIANGXING.申 === '子' && S.JIANGXING.寅 === '午', 'ok');
ok('劫煞 申子辰在巳、寅午戌在亥', S.JIESHA.申 === '巳' && S.JIESHA.寅 === '亥', 'ok');
ok('灾煞 申子辰在午、寅午戌在子', S.ZAISHA.申 === '午' && S.ZAISHA.寅 === '子', 'ok');
ok('亡神 申子辰在亥、寅午戌在巳', S.WANGSHEN.申 === '亥' && S.WANGSHEN.寅 === '巳', 'ok');
ok('红鸾 子年见卯、丑年见寅（逆行）', S.HONGLUAN.子 === '卯' && S.HONGLUAN.丑 === '寅', 'ok');
ok('孤辰 亥子丑见寅、巳午未见申', S.GUCHEN.子 === '寅' && S.GUCHEN.午 === '申', 'ok');
ok('寡宿 亥子丑见戌、巳午未见辰', S.GUASU.子 === '戌' && S.GUASU.午 === '辰', 'ok');
ok('禄神 甲寅 乙卯 丙巳 丁午 戊巳 己午 庚申 辛酉 壬亥 癸子',
  S.LU.甲 === '寅' && S.LU.丙 === '巳' && S.LU.戊 === '巳' && S.LU.壬 === '亥' && S.LU.癸 === '子', 'ok');
ok('羊刃 甲卯 丙午 庚酉 壬子（阳干帝旺）',
  S.YANGREN.甲 === '卯' && S.YANGREN.丙 === '午' && S.YANGREN.庚 === '酉' && S.YANGREN.壬 === '子', 'ok');
ok('金舆 甲辰 乙巳 壬丑 癸寅', S.JINYU.甲 === '辰' && S.JINYU.壬 === '丑' && S.JINYU.癸 === '寅', 'ok');

// C. 黄金盘命中项（手工复核）
console.log('C. 黄金盘命中（手工复核）');
function has(name, pos) {
  var x = r.神煞.filter(function (s) { return s.名 === name; })[0];
  return !!x && (pos ? x.位.indexOf(pos) >= 0 : x.位 !== '无');
}
ok('太极贵人 在月柱（月支申，壬见巳申）', has('太极贵人', '月'), r.神煞.filter(function (s) { return s.名 === '太极贵人'; })[0].位);
ok('月德贵人 在日柱（申子辰月见壬，日干壬）', has('月德贵人', '日'), '日');
ok('驿马 在月柱（年支午→申）', has('驿马', '月'), '月');
ok('将星 在年柱与日柱（午见午、子见子）', has('将星', '年') && has('将星', '日'), '年、日');
ok('灾煞 在年柱与日柱（午见子、子见午）', has('灾煞', '年') && has('灾煞', '日'), '年、日');
ok('孤辰 在月柱（年支午→申）', has('孤辰', '月'), '月');
ok('羊刃 在日柱（壬见子）', has('羊刃', '日'), '日');
ok('天乙贵人 未命中（壬见卯巳，四支午申子未）', !has('天乙贵人'), '无');
ok('共查 21 类神煞', r.神煞.length === 21, r.神煞.length);
ok('每类神煞均带查法与释义', r.神煞.every(function (s) { return s.查法 && s.义; }), 'ok');
ok('汇总句式完整', /共查 21 类神煞，命中 \d+ 类/.test(r.汇总), r.汇总);

// D. 空亡与 bazi 旬空一致
console.log('D. 空亡');
var c = B.chart(P1);
var kw = c.旬空.日.split('');
var kwHit = kw.some(function (z) { return ['午', '申', '子', '未'].indexOf(z) >= 0; });
var kwShen = r.神煞.filter(function (s) { return s.名 === '空亡'; })[0];
ok('空亡查法带日柱旬空（寅卯）', kwShen.查法.indexOf('寅卯') >= 0, kwShen.查法);
ok('壬子日旬空寅卯，四支无寅卯 → 空亡不落柱', kwHit === false && kwShen.位 === '无', kwShen.位);

// E. 地支关系表（合婚地基）
console.log('E. 地支关系');
ok('子丑 = 六合', S.relOf('子', '丑') === '六合', S.relOf('子', '丑'));
ok('子午 = 六冲', S.relOf('子', '午') === '六冲', S.relOf('子', '午'));
ok('寅午 = 三合', S.relOf('寅', '午') === '三合', S.relOf('寅', '午'));
ok('子卯 = 相刑', S.relOf('子', '卯') === '相刑', S.relOf('子', '卯'));
ok('卯辰 = 六害', S.relOf('卯', '辰') === '六害', S.relOf('卯', '辰'));
ok('子子 = 同支', S.relOf('子', '子') === '同支', S.relOf('子', '子'));
ok('子寅 = 无涉', S.relOf('子', '寅') === '无涉', S.relOf('子', '寅'));
ok('六合表自反（12 组对称）', (function () {
  var zs = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  return zs.every(function (z) { return S.LIUHE[S.LIUHE[z]] === z; });
})(), 'ok');
ok('六冲表自反（12 组对称）', (function () {
  var zs = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  return zs.every(function (z) { return S.LIUCHONG[S.LIUCHONG[z]] === z; });
})(), 'ok');

// F. 合婚
console.log('F. 八字合婚');
var h = S.hehun({ y: 1990, m: 8, d: 15, h: 14, gender: 'male' }, { y: 1992, m: 3, d: 20, h: 9, gender: 'female' });
ok('合婚出双方四柱', /庚午年/.test(h.甲) && /壬申年/.test(h.乙), h.甲 + ' / ' + h.乙);
ok('合婚七项判据', h.项.length === 7, h.项.length);
ok('每项带判（吉/平/忌）与说明', h.项.every(function (x) { return /^(吉|平|忌)$/.test(x.判) && x.说; }), 'ok');
ok('年支说用生肖字（马/猴）', /男属马/.test(h.项[0].说) && /女属猴/.test(h.项[0].说), h.项[0].说);
ok('日支 子未 判六害', /六害/.test(h.项[1].说), h.项[1].说);
ok('评分 0–100', h.评分 >= 0 && h.评分 <= 100, h.评分);
ok('出吉凶档', /配/.test(h.档), h.档);
ok('明标不作断言', /不作婚姻断言/.test(h.说明), 'ok');
ok('缺参数给提示', !!S.hehun({}, {}).err, S.hehun({}, {}).err);

// G. 天干五合/相冲对照
console.log('G. 天干五合');
var h2 = S.hehun({ y: 1984, m: 2, d: 4, h: 10, gender: 'male' }, { y: 1985, m: 6, d: 6, h: 10, gender: 'female' });
ok('合婚对任意两盘不报错', !h2.err && h2.项.length === 7, h2.err || 'ok');
ok('多点合婚稳定（随机 30 组不抛错）', (function () {
  var bad = 0;
  for (var i = 0; i < 30; i++) {
    var a = { y: 1960 + i, m: (i % 12) + 1, d: (i % 27) + 1, h: (i % 24), gender: i % 2 ? 'male' : 'female' };
    var b = { y: 1970 + i, m: ((i + 3) % 12) + 1, d: ((i + 5) % 27) + 1, h: ((i + 7) % 24), gender: i % 2 ? 'female' : 'male' };
    var x = S.hehun(a, b);
    if (x.err || !x.项) bad++;
  }
  return bad === 0;
})(), 'ok');
ok('神煞对随机 30 盘不抛错且恒 21 类', (function () {
  for (var i = 0; i < 30; i++) {
    var x = S.analyze({ y: 1960 + i, m: (i % 12) + 1, d: (i % 27) + 1, h: i % 24 });
    if (x.err || x.神煞.length !== 21) return false;
  }
  return true;
})(), 'ok');

// ===== v3.1.36 对拍问真八字（pcbz.iwzwh.com）后补：十二长生（星运/自坐）+ 地支暗合 =====
console.log('\nD. 十二长生（星运/自坐）与地支暗合（对拍问真八字，1990-01-01 00:00 女）');
var B = require('../bazi.js');
ok('changSheng(丙,子)=胎', B.changSheng('丙', '子') === '胎', 'ok');
ok('changSheng(丙,寅)=长生', B.changSheng('丙', '寅') === '长生', 'ok');
ok('changSheng(丙,巳)=临官', B.changSheng('丙', '巳') === '临官', 'ok');
ok('changSheng(己,巳)=帝旺', B.changSheng('己', '巳') === '帝旺', 'ok');
ok('阴阳干分列：戊土长生寅、己土长生酉', B.changSheng('戊', '寅') === '长生' && B.changSheng('己', '酉') === '长生', 'ok');
ok('十二长生名 12 个齐全', (B.CS12_NAMES || []).length === 12, 'ok');
ok('10 天干 × 12 地支全覆盖无空', (function () {
  for (var g = 0; g < B.CS12_GAN && Object.keys(B.CS12_GAN).length; g++) { /* 占位 */ }
  var gans = '甲乙丙丁戊己庚辛壬癸', zhis = '子丑寅卯辰巳午未申酉戌亥', miss = [];
  for (var i = 0; i < 10; i++) for (var j = 0; j < 12; j++) if (!B.changSheng(gans[i], zhis[j])) miss.push(gans[i] + zhis[j]);
  return miss.length === 0;
})(), 'ok');
// 对拍：己巳/丙子/丙寅/戊子 → 星运 临官 胎 长生 胎；自坐 帝旺 胎 长生 胎（与问真八字逐格一致）
ok('对拍星运：临官 胎 长生 胎', (function () {
  var c = B.chart({ y: 1990, m: 1, d: 1, h: 0, gender: 'female' });
  var dm = c.dayMaster.干;
  var star = [c.pillars.年.支, c.pillars.月.支, c.pillars.日.支, c.pillars.时.支].map(function (z) { return B.changSheng(dm, z); }).join(' ');
  return star === '临官 胎 长生 胎';
})(), 'ok');
ok('对拍自坐：帝旺 胎 长生 胎', (function () {
  var c = B.chart({ y: 1990, m: 1, d: 1, h: 0, gender: 'female' });
  var P = c.pillars;
  return [P.年, P.月, P.日, P.时].map(function (p) { return B.changSheng(p.干, p.支); }).join(' ') === '帝旺 胎 长生 胎';
})(), 'ok');
// 暗合（5 源核对口径：通合 2 组 + 通禄合 4 组 + 辰酉六合兼暗合）
ok('暗合 子巳=通禄合（戊癸）', S.anheOf('子', '巳') === '通禄合（戊癸）' && S.relOf('子', '巳') === '暗合', 'ok');
ok('暗合 寅丑=通合（甲己·丙辛·戊癸）', S.anheOf('寅', '丑').indexOf('通合') === 0, 'ok');
ok('暗合 午亥=通合（丁壬·甲己）', S.anheOf('午', '亥').indexOf('通合') === 0, 'ok');
ok('暗合 卯申=通禄合（乙庚）', S.anheOf('卯', '申').indexOf('通禄合') === 0, 'ok');
ok('暗合对称（丑寅 / 亥午 同判）', S.relOf('丑', '寅') === '暗合' && S.relOf('亥', '午') === '暗合', 'ok');
ok('辰酉 六合兼暗合（两关系并存）', S.relOf('辰', '酉') === '六合' && S.anheOf('辰', '酉').indexOf('暗合') >= 0, 'ok');
ok('relsOf 列全并存关系（寅巳 = 相刑 + 六害）', (function () {
  var r = S.relsOf('寅', '巳').map(function (x) { return x.关系; });
  return r.indexOf('相刑') >= 0 && r.indexOf('六害') >= 0;
})(), 'ok');
ok('暗合组 7 对齐全', (S.ANHE_PAIRS || []).length === 7, 'ok');
ok('未暗合之支返回空', S.anheOf('子', '午') === '' && S.relOf('子', '午') === '六冲', 'ok');
// 十二长生命名（防回归：八字阴阳干分列 与 六壬水土同宫是两套口径，必须并存不混用）
ok('八字口径戊土长生在寅；六壬口径土长生在申（两套口径并存，各守其用）',
  B.changSheng('戊', '寅') === '长生' && require('../liuren-bifa.js').CHANG_SHENG['土'][0] === '申', 'ok');

console.log('\n=== bazi-shensha 自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
if (fail) process.exit(1);
