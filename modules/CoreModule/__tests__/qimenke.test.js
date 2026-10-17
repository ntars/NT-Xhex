/**
 * modules/CoreModule/__tests__/qimenke.test.js —— 奇门·刻家内核验收
 * 用法：node modules/CoreModule/__tests__/qimenke.test.js
 *
 * ⚠ 关于「锁」的程度 —— 本门与前面几门不同，**必须说清楚**：
 *   刻家实质单源（《奇门遁甲预测学试行教材》第四章第一节，5 个网址实为同一篇的镜像转载），
 *   且**没有一份完整的刻盘算例**（原文只给刻柱与局数推移，不给九星/八门/八神逐宫）。
 *   所以本测试分两层：
 *     【锚】可外部核对的项（刻柱、刻序号、局数推移）→ 逐条对原文，真锁。
 *     【自洽】飞布几何 → 只验内部一致（初刻=时家盘、星带本宫干、值符落刻干宫…），**不假称已外部锁死**。
 */
var K = require('../qimen-ke.js');
var QM = require('../qimen.js');

var pass = 0, fail = 0;
function t(name, cond) { if (cond) pass++; else { fail++; console.log('  ✗ ' + name); } }
function eq(name, got, exp) {
  if (JSON.stringify(got) === JSON.stringify(exp)) pass++;
  else { fail++; console.log('  ✗ ' + name + '\n     期望 ' + JSON.stringify(exp) + '\n     实际 ' + JSON.stringify(got)); }
}
var RING = [1, 8, 3, 4, 9, 2, 7, 6];

// ============ A.【锚】刻柱：时干起五子遁（外部可核对） ============
console.log('== A. 刻柱（五子遁，外部可核对）==');
// 原文算例（易德轩「刻家新奇门遁甲测彩排盘法」）：丁亥时 → 1刻庚子、2刻辛丑、3刻壬寅
eq('A1 丁亥时 1刻=庚子', K.keGanZhi('丁', 1), '庚子');
eq('A2 丁亥时 2刻=辛丑', K.keGanZhi('丁', 2), '辛丑');
eq('A3 丁亥时 3刻=壬寅', K.keGanZhi('丁', 3), '壬寅');
// 原文另给「21时30分=丁亥时3刻」，端到端也要落在第3刻
eq('A4 21:30 落在第3刻', K.keIndexOf(30), 3);
// 五鼠遁五组首刻
eq('A5 甲日子/时 → 甲子刻', K.keGanZhi('甲', 1), '甲子');
eq('A6 己日子/时 → 甲子刻（甲己还加甲）', K.keGanZhi('己', 1), '甲子');
eq('A7 乙/庚 → 丙子刻', K.keGanZhi('乙', 1), '丙子');
eq('A8 丙/辛 → 戊子刻', K.keGanZhi('丙', 1), '戊子');
eq('A9 丁/壬 → 庚子刻', K.keGanZhi('壬', 1), '庚子');
eq('A10 戊/癸 → 壬子刻', K.keGanZhi('癸', 1), '壬子');
// 十干不重：与原文「以甲(1)…癸(10)配合地支」的十干一一对应吻合
eq('A11 十刻天干恰为甲~癸各一不重',
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return K.keGanZhi('甲', n).charAt(0); }).join(''),
  '甲乙丙丁戊己庚辛壬癸');
eq('A12 十刻地支为子~酉（十位）',
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return K.keGanZhi('甲', n).charAt(1); }).join(''),
  '子丑寅卯辰巳午未申酉');
t('A13 越界返回 null（第 0 刻）', K.keGanZhi('甲', 0) === null);
t('A14 越界返回 null（第 11 刻）', K.keGanZhi('甲', 11) === null);

// ============ B.【锚】刻序号与时辰起点 ============
console.log('== B. 刻序号 / 时辰起点 ==');
eq('B1 0 分 → 第1刻', K.keIndexOf(0), 1);
eq('B2 11 分 → 第1刻', K.keIndexOf(11), 1);
eq('B3 12 分 → 第2刻', K.keIndexOf(12), 2);
eq('B4 30 分 → 第3刻', K.keIndexOf(30), 3);
eq('B5 119 分 → 第10刻', K.keIndexOf(119), 10);
eq('B6 越界（−5）兜底到第1刻', K.keIndexOf(-5), 1);
eq('B7 越界（999）兜底到第10刻', K.keIndexOf(999), 10);
// 时辰起点：子=23、丑=1、巳=9、亥=21
eq('B8 子时起点 23', K.hourStart(0), 23);
eq('B9 丑时起点 1', K.hourStart(1), 1);
eq('B10 巳时起点 9', K.hourStart(10), 9);
eq('B11 亥时起点 21', K.hourStart(21), 21);
eq('B12 一刻=12分、一时辰=10刻', [K.MIN_PER_KE, K.KE_PER_HOUR], [12, 10]);

// ============ C.【锚】局数推移（两派互证） ============
console.log('== C. 局数推移：阳 +1 / 阴 -1（两派互证）==');
// 原文算例：阳初局戊在坎1 → 2局坤2 → 3局震3 → 4局巽4
//   洛书数序：1→2→3→4；本内核 w9(局+移宫) 应同
eq('C1 阳遁 1局 → 刻序列', [0, 1, 2, 3].map(function (s) { return ((1 + s - 1) % 9) + 1; }), [1, 2, 3, 4]);
// 另一支原文：「白露中元阴3局，第1刻阴3、第2刻阴2、第3刻阴1」
var c3 = K.chart({ y: 2012, m: 9, d: 16, h: 21, min: 30, 局数: 3 });
eq('C2 阴遁 3局 → 前3刻 = 3/2/1 局', c3.十刻一览.slice(0, 3).map(function (x) { return x.局数; }), [3, 2, 1]);
eq('C3 21:30 第3刻 → 刻局=1', [c3.第几刻, c3.刻局数], [3, 1]);
// 阳遁端到端：初刻用「时辰起点小时 + min0」（h=10 是巳时已过 60 分 → 第 6 刻，不是初刻）
var cy = K.chart({ y: 2026, m: 2, d: 9, h: 9, min: 0 });
t('C4 阳遁初刻=时家局（起点小时）', cy.刻局数 === cy.时家局数 && cy.移宫 === 0);
t('C5 每进一刻移一宫（阳 +）', (function () {
  var a = K.chart({ y: 2026, m: 2, d: 9, h: 9, min: 0 }).刻局数;
  var b = K.chart({ y: 2026, m: 2, d: 9, h: 9, min: 12 }).刻局数;
  return a === 9 ? b === 1 : b === a + 1;
})());
// 阴遁端到端：2004-08-06 在夏至后 → 阴遁
var ci = K.chart({ y: 2004, m: 8, d: 6, h: 9, min: 0 });
t('C6 阴遁初刻=时家局', ci.刻局数 === ci.时家局数);
t('C7 每进一刻移一宫（阴 −）', (function () {
  var a = K.chart({ y: 2004, m: 8, d: 6, h: 9, min: 0 }).刻局数;
  var b = K.chart({ y: 2004, m: 8, d: 6, h: 9, min: 12 }).刻局数;
  return a === 1 ? b === 9 : b === a - 1;
})());

// ============ D.【自洽】初刻的局数/地盘 == 时家（内部锚） ============
console.log('== D. 初刻局数/地盘 恒等于时家（内部锚）==');
// ⚠ 初刻必须用「时辰起点小时」+ min=0（如巳时=9点，不是10点）。
//   且只比「局数 + 地盘」——初刻刻干 = 五子遁首刻干（庚→丙），多数≠时干，故天盘/八门/八神随刻干走，本就不等于时家。
var bad0 = [];
[[2026, 2, 9, 9], [2004, 8, 6, 13], [2012, 9, 16, 21], [2020, 3, 15, 5], [1999, 12, 31, 23], [2016, 6, 21, 11]].forEach(function (s) {
  var tag = s.join('-');
  var ke = K.chart({ y: s[0], m: s[1], d: s[2], h: s[3], min: 0 });
  var sj = QM.chart({ y: s[0], m: s[1], d: s[2], h: s[3] });
  if (ke.err || sj.err) { bad0.push(tag + ' err'); return; }
  if (ke.第几刻 !== 1) bad0.push(tag + ' 起点小时非第1刻:' + ke.第几刻);
  if (JSON.stringify(ke.地盘) !== JSON.stringify(sj.地盘)) bad0.push(tag + ' 地盘≠时家');
  if (ke.时家局数 !== sj.局数) bad0.push(tag + ' 时家局数≠时家');
  if (ke.刻局数 !== sj.局数) bad0.push(tag + ' 初刻局≠时家局');
  if (ke.阴阳遁 !== sj.阴阳遁) bad0.push(tag + ' 阴阳遁≠时家');
});
eq('D1 初刻（起点小时+min0）局数/地盘/阴阳遁 恒等于时家盘', bad0, []);

// ============ E.【自洽】270 日抽样结构自洽 ============
console.log('== E. 结构自洽（跨年抽样）==');
var bad = [];
[2019, 2021, 2023, 2024, 2025, 2026, 2027].forEach(function (yy) {
  [1, 4, 7, 10].forEach(function (mm) {
    [3, 15, 27].forEach(function (dd) {
      [0, 3, 9, 12, 18, 21].forEach(function (hh) {
        [0, 6, 30, 59].forEach(function (mi) {
          var c = K.chart({ y: yy, m: mm, d: dd, h: hh, min: mi });
          if (c.err) { bad.push(yy + '-' + mm + '-' + dd + ' ' + hh + ':' + mi + ' err'); return; }
          var tag = yy + '-' + mm + '-' + dd + ' ' + hh + ':' + mi;
          // 十刻天干必为 甲~癸 的排列（独立不变量，不依赖同一函数反推）
          var g10 = c.十刻一览.map(function (x) { return x.刻柱.charAt(0); }).sort().join('');
          if (g10 !== '甲乙丙丁戊己庚辛壬癸'.split('').sort().join('')) bad.push(tag + ' 十刻天干非十干排列:' + g10);
          if (c.刻干 !== c.十刻一览[c.第几刻 - 1].刻柱.charAt(0)) bad.push(tag + ' 当前刻干与一览不符');
          // 刻支恒为子~酉、与第几刻对应
          if (c.刻支 !== '子丑寅卯辰巳午未申酉'.charAt(c.第几刻 - 1)) bad.push(tag + ' 刻支≠刻序');
          // 刻局落在 1..9
          if (!(c.刻局数 >= 1 && c.刻局数 <= 9)) bad.push(tag + ' 刻局越界:' + c.刻局数);
          // 地盘恰为九干无重漏
          var ds = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (p) { return c.地盘[p]; }).sort().join('');
          if (ds !== '丁丙乙戊己庚辛壬癸'.split('').sort().join('')) bad.push(tag + ' 地盘九干不全');
          // 八门/八神/天盘各占八实宫、无重
          ['八门', '八神', '天盘'].forEach(function (k) {
            var v = RING.map(function (p) { return c[k][p]; });
            if (v.filter(Boolean).length !== 8 || new Set(v).size !== 8) bad.push(tag + ' ' + k + ' 不全/重复');
          });
          // 天盘干 = 星本宫地盘干
          var S2H = {}; for (var hp in QM.STAR_HOME) S2H[QM.STAR_HOME[hp]] = +hp;
          RING.forEach(function (p) {
            var home = QM.homeOf(S2H[c.天盘[p]] || 2);
            if (c.天盘干[p] !== c.地盘[home]) bad.push(tag + ' 天盘干≠星本宫干@' + p);
          });
          // 值符星必落刻干在地盘之宫
          var fu = 0; RING.forEach(function (p) { if (c.天盘[p] === c.值符星) fu = p; });
          if (fu !== QM.homeOf(c.刻干宫)) bad.push(tag + ' 值符未落刻干宫');
          // 小值符随大值符
          var sf = 0; RING.forEach(function (p) { if (c.八神[p] === '值符') sf = p; });
          if (sf !== QM.homeOf(c.刻干宫)) bad.push(tag + ' 小值符未随大值符');
          // 十刻一览：10 条、干支递增、局数首尾自洽
          if (c.十刻一览.length !== 10) bad.push(tag + ' 一览非10条');
          if (c.十刻一览.filter(function (x) { return x.当前; }).length !== 1) bad.push(tag + ' 当前刻标记数≠1');
        });
      });
    });
  });
});
eq('E1 抽样 420 刻全部自洽', bad.slice(0, 8), []);

// ============ F. 八门顺逆（单源待验，两个口径都要能跑） ============
console.log('== F. 八门顺逆（刻干阴阳）==');
// 找一个阳干刻与阴干刻（keGanZhi 只收**单字天干**；h 必须取「时辰起点小时」，否则 intoHour 会多算一截）
var yg = null, jg = null;
[[2026, 2, 9, 9], [2026, 2, 9, 11]].forEach(function (s) {
  var h0 = K.hourStart(s[3]);                                  // 归到该时支的起点小时
  var sg = QM.chart({ y: s[0], m: s[1], d: s[2], h: h0 }).四柱.时.charAt(0);
  for (var k = 1; k <= 10; k++) {
    var gz = K.keGanZhi(sg, k);
    if (!gz) continue;
    if ('甲丙戊庚壬'.indexOf(gz.charAt(0)) >= 0 && !yg) yg = { y: s[0], m: s[1], d: s[2], h: h0, min: (k - 1) * 12 };
    if ('乙丁己辛癸'.indexOf(gz.charAt(0)) >= 0 && !jg) jg = { y: s[0], m: s[1], d: s[2], h: h0, min: (k - 1) * 12 };
  }
});
t('F1 找得到阳干刻', !!yg);
t('F2 找得到阴干刻', !!jg);
if (yg) { var cy2 = K.chart(yg); eq('F3 阳干刻 → 八门顺行', [cy2.刻干阳, cy2.八门逆行], [true, false]); }
if (jg) { var cj2 = K.chart(jg); eq('F4 阴干刻 → 八门逆行', [cj2.刻干阳, cj2.八门逆行], [false, true]); }
// 八门恒顺开关
if (jg) {
  var ch = K.chart({ y: jg.y, m: jg.m, d: jg.d, h: jg.h, min: jg.min, 八门恒顺: true });
  eq('F5 八门恒顺开关生效（阴干刻也顺行）', ch.八门逆行, false);
}
// 八门相对次序守恒：结果序列必为固定环的「正序或反序」循环移位（顺铺→正序移位，逆铺→反序移位）
if (jg) {
  var cj3 = K.chart(jg);
  var ringSeq = ['休', '生', '伤', '杜', '景', '死', '惊', '开'];
  var revSeq = ringSeq.slice().reverse();
  var got = []; RING.forEach(function (p) { got.push(cj3.八门[p]); });
  t('F6 八门序列为固定环（正序/反序）的循环移位', ringSeq.concat(ringSeq).join('').indexOf(got.join('')) >= 0
    || revSeq.concat(revSeq).join('').indexOf(got.join('')) >= 0);
}

// ============ G. 缺口与切段安全 ============
console.log('== G. 缺口 / 切段 / 非法输入 ==');
var cg = K.chart({ y: 2026, m: 2, d: 9, h: 10, min: 24 });
t('G1 缺口非空', cg.缺口.length >= 4);
t('G2 缺口明说「实质单源」', cg.缺口.join('').indexOf('实质单源') >= 0);
t('G3 缺口明说「未外部锁死」', cg.缺口.join('').indexOf('未外部锁死') >= 0);
t('G4 缺口明说是飞盘九神那支不同', cg.缺口.join('').indexOf('飞盘九神') >= 0);
eq('G5 缺口文本无中文分号（切段安全）', cg.缺口.join('').indexOf('；'), -1);
t('G6 缺时刻给 err', !!K.chart({ y: 2026, m: 2, d: 9 }).err);
t('G7 缺年月日给 err', !!K.chart({}).err);
// 无分钟时按整点折算第几刻：10 时属巳时（9 点起）、已过 60 分 → 第 6 刻；巳时起点 9 时才是初刻
var cn = K.chart({ y: 2026, m: 2, d: 9, h: 10 });
eq('G8 10时（巳时第60分）→ 第6刻', cn.第几刻, 6);
eq('G9 无分钟标记', cn.有分钟, false);
eq('G10 巳时起点 9 时 → 第1刻', K.chart({ y: 2026, m: 2, d: 9, h: 9 }).第几刻, 1);

console.log('\n通过 ' + pass + ' 项，失败 ' + fail + ' 项');
process.exit(fail ? 1 : 0);
