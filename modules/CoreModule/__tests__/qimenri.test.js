/**
 * modules/CoreModule/__tests__/qimenri.test.js —— 奇门·日家内核验收
 * 用法：node modules/CoreModule/__tests__/qimenri.test.js
 *
 * 锁什么：
 *   A 黄金盘逐宫 —— 2004-08-06 丁巳日（阴遁上元九局），出处：易德轩 qimen.yi958.com
 *     「年、月、日家奇门演局方法简介」。原文给出地盘九宫、天盘干八宫、八门八宫、八神八宫，
 *     本内核逐宫比对：地盘 9/9、天盘干 8/8（含天禽带中五之干）、八门 8/8、八神 8/8 → 全中。
 *   B 定局两派（甲子日数元 / 节气分元）并列，且三元局数序列恒为 阳 1/7/4、阴 9/3/6。
 *   C 值使落宫三例（《奇門法竅》卷二 + 易德轩例），验「按日干旬内位次数宫」的口径。
 *   D 结构性自洽：地盘九宫九干无重漏、八门八神各占八实宫、天盘干 = 星本宫地盘干。
 *   E 边界与安全：二至前后分段、跨年、日干为甲、输出文本可安全切段。
 */
var R = require('../qimen-ri.js');
var QM = require('../qimen.js');

var pass = 0, fail = 0;
function t(name, cond) { if (cond) pass++; else { fail++; console.log('  ✗ ' + name); } }
function eq(name, got, exp) {
  if (JSON.stringify(got) === JSON.stringify(exp)) pass++;
  else { fail++; console.log('  ✗ ' + name + '\n     期望 ' + JSON.stringify(exp) + '\n     实际 ' + JSON.stringify(got)); }
}

var CLOCK = [1, 8, 3, 4, 9, 2, 7, 6]; // 展示/飞布用的八实宫环（洛书地理顺时针）

// ============ A. 黄金盘：2004-08-06 丁巳日 · 阴遁上元九局 ============
console.log('== A. 黄金盘 2004-08-06 丁巳日（易德轩例）==');
var A = R.chart({ y: 2004, m: 8, d: 6 });
t('A0 无 err', !A.err);
eq('A1 日柱=丁巳', A.日柱, '丁巳');
eq('A2 阴遁', A.阴阳遁, '阴遁');
eq('A3 上元', A.元, '上元');
eq('A4 九局', A.局数, 9);
eq('A5 段起点=夏至', A.段起点.slice(0, 2), '夏至');
// 原文：丁巳日属甲寅旬 → 甲寅癸 → 癸在地盘巽四宫 → 巽四本位星天辅=值符、本位门杜门=值使
eq('A6 旬首=甲寅', A.旬首, '甲寅');
eq('A7 旬首仪=癸', A.旬首仪, '癸');
eq('A8 旬首宫=巽四', A.旬首宫, 4);
eq('A9 值符=天辅', A.值符星, '天辅');
eq('A10 值使=杜门', A.值使门, '杜');
// 原文地盘：戊离九、己艮八、庚兑七、辛乾六、壬中五、癸巽四、丁震三、丙坤二、乙坎一
eq('A11 地盘逐宫（坎1 坤2 震3 巽4 乾6 兑7 艮8 离9）',
  [1, 2, 3, 4, 6, 7, 8, 9].map(function (p) { return A.地盘[p]; }),
  ['乙', '丙', '丁', '癸', '辛', '庚', '己', '戊']);
eq('A12 中五=壬', A.地盘[5], '壬');
// 原文天盘干：癸落震三、己坎、庚坤、辛兑、壬丙离、丁艮、乙乾、戊巽
eq('A13 天盘干逐宫（环序）',
  CLOCK.map(function (p) { return A.天盘干[p]; }),
  ['己', '丁', '癸', '戊', '丙', '庚', '辛', '乙']);
eq('A14 日干丁在地盘震三宫', A.日干宫, 3);
eq('A15 天禽随天芮・同落离九', A.禽宫, 9);
eq('A16 天禽带中五之干=壬（故离九为「壬丙」）', A.禽干, '壬');
// 原文八门：杜坎一、开离九、伤乾六、生兑七、休坤二、惊巽四、死震三、景艮八
eq('A17 八门逐宫（环序）',
  CLOCK.map(function (p) { return A.八门[p]; }),
  ['杜', '景', '死', '惊', '开', '休', '生', '伤']);
eq('A18 值使杜门落坎一', A.值使落宫, 1);
// 原文八神：值符震、螣蛇艮、太阴坎、六合乾、白虎兑、玄武坤、九地离、九天巽
eq('A19 八神逐宫（环序）',
  CLOCK.map(function (p) { return A.八神[p]; }),
  ['太阴', '螣蛇', '值符', '九天', '九地', '玄武', '白虎', '六合']);

// ============ B. 定局两派 ============
console.log('== B. 定局：三元局数 + 两派并列 ==');
eq('B1 阳遁三元序列', R.JU3.阳, [1, 7, 4]);
eq('B2 阴遁三元序列', R.JU3.阴, [9, 3, 6]);
// 黄金盘同日两派同元同局（该日两派不分歧）
eq('B3 甲子派局数=9', A.甲子派.局数, 9);
eq('B4 节气派局数=9', A.节气派.局数, 9);
eq('B5 节气派所据节气=大暑（夏至~立秋=上元）', A.节气派.节气, '大暑');
// 派A 必须给出可复核的起算点与天数
t('B6 甲子派给起算甲子日', /^\d{4}-\d{2}-\d{2}$/.test(A.甲子派.起算甲子日));
t('B7 甲子派给距起算天数（≥0 且在 180 内）', A.甲子派.距起算天数 >= 0 && A.甲子派.距起算天数 < 180);
// 起算日必须是甲子日（自校验，防「往前退错天」）
(function () {
  var LUNAR = require('../lunar.js');
  var p = A.甲子派.起算甲子日.split('-');
  eq('B8 起算日确为甲子日', LUNAR.fromSolar(+p[0], +p[1], +p[2], 0).ganzhi.日.干支, '甲子');
})();
// 口径可切换
var A2 = R.chart({ y: 2004, m: 8, d: 6, 口径: '节气' });
eq('B9 指定「节气」口径时采用派B', A2.定局口径.indexOf('节气') >= 0, true);

// ============ C. 值使落宫三例（口径锁） ============
console.log('== C. 值使落宫：按「日干旬内位次」数宫 ==');
// 《奇門法竅》卷二：冬至上元阳遁一局，庚子日 →「杜门加坎」
eq('C1 庚子日·阳遁·杜门(本宫巽四)·庚第7位 → 坎一', R.zhiShiPalace('杜', 7, true), 1);
// 《奇門法竅》卷二：夏至上元阴遁九局，丁卯日 →「景门加乾」
eq('C2 丁卯日·阴遁·景门(本宫离九)·丁第4位 → 乾六', R.zhiShiPalace('景', 4, false), 6);
// 易德轩例：丁巳日·阴遁·杜门 → 坎一
eq('C3 丁巳日·阴遁·杜门(本宫巽四)·丁第4位 → 坎一', R.zhiShiPalace('杜', 4, false), 1);
// 甲日：位次1 → 值使不动
eq('C4 甲日值使不动（本宫=落宫）', R.zhiShiPalace('休', 1, true), 1);
// 八门名→本宫号反查与 GATE_HOME 单一真源一致
eq('C5 反查自 QM.GATE_HOME（不另抄表）', R.gateHome('杜'), 4);
eq('C6 反查自 QM.GATE_HOME（不另抄表）', R.gateHome('景'), 9);

// ============ D. 结构性自洽（跨若干年份逐日扫） ============
console.log('== D. 结构性自洽（2019–2027 逐年抽样）==');
var bad = [];
[2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027].forEach(function (yy) {
  [1, 3, 5, 7, 9, 11].forEach(function (mm) {
    [1, 8, 15, 22, 28].forEach(function (dd) {
      var c = R.chart({ y: yy, m: mm, d: dd });
      if (c.err) { bad.push(yy + '-' + mm + '-' + dd + ' err'); return; }
      var tag = yy + '-' + mm + '-' + dd;
      // 地盘九宫恰为三奇六仪九干，无重无漏
      var ds = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (p) { return c.地盘[p]; }).sort().join('');
      if (ds !== '丁丙乙戊己庚辛壬癸'.split('').sort().join('')) bad.push(tag + ' 地盘九干不全:' + ds);
      // 局数落在 1..9
      if (!(c.局数 >= 1 && c.局数 <= 9)) bad.push(tag + ' 局数越界:' + c.局数);
      // 阴阳遁与元、局数必须自洽（阳用 1/7/4，阴用 9/3/6）
      var exp = R.JU3[c.阴阳遁 === '阳遁' ? '阳' : '阴'][R.YUAN_NAME.indexOf(c.元)];
      if (c.局数 !== exp) bad.push(tag + ' 局数不属该元:' + c.局数 + ' vs ' + exp);
      // 八门 / 八神：八实宫各一，且不落中五
      var gs = CLOCK.map(function (p) { return c.八门[p]; });
      var ss = CLOCK.map(function (p) { return c.八神[p]; });
      if (gs.filter(Boolean).length !== 8 || new Set(gs).size !== 8) bad.push(tag + ' 八门不全/重复');
      if (ss.filter(Boolean).length !== 8 || new Set(ss).size !== 8) bad.push(tag + ' 八神不全/重复');
      // 天盘九星八实宫各一
      var ts = CLOCK.map(function (p) { return c.天盘[p]; });
      if (ts.filter(Boolean).length !== 8 || new Set(ts).size !== 8) bad.push(tag + ' 天盘不全/重复');
      // 天盘干必须等于「该宫之星的本宫地盘干」
      var S2H = {};
      for (var hp in QM.STAR_HOME) S2H[QM.STAR_HOME[hp]] = +hp;
      CLOCK.forEach(function (p) {
        var home = QM.homeOf(S2H[c.天盘[p]] || 2);
        if (c.天盘干[p] !== c.地盘[home]) bad.push(tag + ' 天盘干≠星本宫地盘干@宫' + p);
      });
      // 值符星必须落在「日干在地盘之宫」（日干落中五时寄坤二，故比较用 homeOf）
      var fuPal = 0;
      CLOCK.forEach(function (p) { if (c.天盘[p] === c.值符星) fuPal = p; });
      if (fuPal !== QM.homeOf(c.日干宫)) bad.push(tag + ' 值符未落日干宫');
      // 小值符（八神之首）必须随大值符宫
      var sfu = 0;
      CLOCK.forEach(function (p) { if (c.八神[p] === '值符') sfu = p; });
      if (sfu !== QM.homeOf(c.日干宫)) bad.push(tag + ' 小值符未随大值符');
    });
  });
});
eq('D1 抽样 270 日全部自洽', bad, []);

// ============ E. 边界与切段安全 ============
console.log('== E. 边界 / 跨年 / 甲日 / 切段 ==');
eq('E1 夏至前一日（2004-06-20）仍阳遁', R.chart({ y: 2004, m: 6, d: 20 }).阴阳遁, '阳遁');
eq('E2 夏至当日（2004-06-21）归阴遁', R.chart({ y: 2004, m: 6, d: 21 }).阴阳遁, '阴遁');
eq('E3 冬至前一日（2004-12-20）仍阴遁', R.chart({ y: 2004, m: 12, d: 20 }).阴阳遁, '阴遁');
eq('E4 冬至当日（2004-12-21）归阳遁', R.chart({ y: 2004, m: 12, d: 21 }).阴阳遁, '阳遁');
eq('E5 跨年 2005-01-05 属阳遁', R.chart({ y: 2005, m: 1, d: 5 }).阴阳遁, '阳遁');
eq('E6 跨年段起点=2004冬至', R.chart({ y: 2005, m: 1, d: 5 }).段起点.slice(0, 2), '冬至');
// 日干为甲：值符须落「旬首仪」在地盘之宫（甲遁六仪，不可空转）
(function () {
  var LUNAR = require('../lunar.js');
  // 找一个甲子日
  var found = null;
  for (var i = 0; i < 200 && !found; i++) {
    var dd = new Date(Date.UTC(2026, 0, 1 + i));
    var gz = LUNAR.fromSolar(dd.getUTCFullYear(), dd.getUTCMonth() + 1, dd.getUTCDate(), 0).ganzhi.日.干支;
    if (gz === '甲子') found = { y: dd.getUTCFullYear(), m: dd.getUTCMonth() + 1, d: dd.getUTCDate() };
  }
  t('E7 找到甲子日', !!found);
  if (found) {
    var c = R.chart(found);
    eq('E8 甲子日日干宫=旬首仪(戊)之宫', c.日干宫, QM.findHome(c.地盘, '戊'));
    eq('E9 甲子日位次=1', c.日干位次, 1);
    eq('E10 甲子日值使不动', c.值使落宫, c.值使本宫);
  }
})();
// 输出文本必须可安全切段：结果页按 [。；\n] 切段，故不得出现中文分号
(function () {
  var c = R.chart({ y: 2026, m: 2, d: 9 });
  var all = [c.日期, c.日柱, c.阴阳遁, c.元, c.定局口径, c.段起点, c.旬首, c.值符星, c.值使门,
    c.甲子派.起算甲子日, A.缺口.join('')].join('|');
  eq('E11 内核文本无中文分号', all.indexOf('；'), -1);
})();
// 非法输入
t('E12 缺日期给 prompt 式 err', !!R.chart({}).err);

console.log('\n通过 ' + pass + ' 项，失败 ' + fail + ' 项');
process.exit(fail ? 1 : 0);
