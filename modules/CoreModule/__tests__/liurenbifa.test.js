/**
 * modules/CoreModule/__tests__/liurenbifa.test.js —— 大六壬《毕法赋》+ 天将类象 C27 自测
 * 跑法：node modules/CoreModule/__tests__/liurenbifa.test.js
 */
var BF = require('../liuren-bifa.js');
var LR = require('../liuren.js');

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}

console.log('A. 《毕法赋》一百法目录');
ok('目录 100 条', BF.BIFA.length === 100, BF.BIFA.length + '');
ok('序号 1–100 连续无缺', BF.BIFA.every(function (x, i) { return x[0] === i + 1; }));
ok('每条含 序号/法名/卷', BF.BIFA.every(function (x) { return x.length >= 3 && x[1] && (x[2] === '上' || x[2] === '下'); }));
ok('前四法：前后引从升迁吉 / 首尾相见始终宜 / 帘幕贵人高甲第 / 催官使者赴官期',
  BF.BIFA[0][1] === '前后引从升迁吉' && BF.BIFA[1][1] === '首尾相见始终宜' &&
  BF.BIFA[2][1] === '帘幕贵人高甲第' && BF.BIFA[3][1] === '催官使者赴官期');
ok('末法「己灾凶逃返无疑」在 100 位', BF.BIFA[99][1] === '己灾凶逃返无疑' && BF.BIFA[99][0] === 100);
ok('上卷 1–50 / 下卷 51–100 分卷正确',
  BF.BIFA.slice(0, 50).every(function (x) { return x[2] === '上'; }) &&
  BF.BIFA.slice(50).every(function (x) { return x[2] === '下'; }));
ok('52 法「罡塞鬼户任谋为」已补（原书编号脱误已修正）', BF.BIFA[51][1] === '罡塞鬼户任谋为');

console.log('B. 五行十二长生表（水土同宫）');
ok('木长生亥 / 火长生寅 / 金长生巳 / 水长生申 / 土长生申',
  BF.CHANG_SHENG.木[0] === '亥' && BF.CHANG_SHENG.火[0] === '寅' && BF.CHANG_SHENG.金[0] === '巳' &&
  BF.CHANG_SHENG.水[0] === '申' && BF.CHANG_SHENG.土[0] === '申');
ok('水与土同宫（十二位全等）', BF.CHANG_SHENG.水.join('') === BF.CHANG_SHENG.土.join(''));
ok('沐浴序 1、墓序 8、绝序 9（位次自洽）',
  BF.CHANG_SHENG.木[1] === '子' && BF.CHANG_SHENG.木[8] === '未' && BF.CHANG_SHENG.木[9] === '申');
ok('十二阶段名 12 位', BF.CS_NAMES.length === 12 && BF.CS_NAMES[0] === '长生' && BF.CS_NAMES[8] === '墓' && BF.CS_NAMES[9] === '绝');
ok('每五行十二位互不重复且覆盖十二支', ['木', '火', '金', '水', '土'].every(function (w) {
  var a = BF.CHANG_SHENG[w];
  return a.length === 12 && new Set(a).size === 12;
}));

console.log('C. 十二天将类象');
var TJ = ['贵人', '螣蛇', '朱雀', '六合', '勾陈', '青龙', '天空', '白虎', '太常', '玄武', '太阴', '天后'];
ok('十二天将齐全且次序对（贵人→螣蛇→朱雀→六合→勾陈→青龙→天空→白虎→太常→玄武→太阴→天后）',
  TJ.every(function (g) { return !!BF.TIAN_JIANG_LEI[g]; }) && Object.keys(BF.TIAN_JIANG_LEI).length === 12);
ok('次序与 liuren.js 的 TIAN_JIANG 一致', LR.TIAN_JIANG.join('') === TJ.join(''), LR.TIAN_JIANG.join(''));
ok('每将含 主/类/性 三项', TJ.every(function (g) { var x = BF.TIAN_JIANG_LEI[g]; return x && x.主 && x.类 && x.性; }));

console.log('D. 毕法检出（起课 + 判格）');
var r = BF.analyze({ y: 2026, m: 10, d: 20, h: 14 });
ok('综合分析无 err', !r.err, r.err);
ok('四课 4 条 / 三传 3 传', r.四课.length === 4 && r.三传.length === 3, r.四课.length + '/' + r.三传.length);
ok('日干支在位', !!r.日干 && !!r.日支, r.日干 + r.日支);
ok('命中条目为数组（可为空）', Array.isArray(r.命中) && r.命中数 === r.命中.length);
ok('每条命中含 序/名/卷/说明', r.命中.every(function (x) { return x.序 && x.名 && x.卷 && x.说明; }));
ok('类象 3 条（初/中/末传各一）', r.类象.length === 3 && r.类象[0].位 === '初传');
ok('判定覆盖 + 缺口如实标注', /18 条/.test(r.判定覆盖) && /82 条只列目录/.test(r.缺口));

console.log('E. 逐条判据定向验证（构造课体验证判据逻辑）');
// 23 彼求我事支传干：初传 == 支上神
var 假课 = {
  四柱: { 年: '丙午', 月: '戊戌', 日: '甲子', 时: '辛未' },
  四课: [{ 位: '甲', 上: '酉' }, { 位: '酉', 上: '辰' }, { 位: '子', 上: '未' }, { 位: '未', 上: '寅' }],
  发用: { 三传: ['未', '子', '巳'] }, 三传遁干: ['辛', '丙', '癸'], 旬空: ['戌', '亥'],
  天地盘: { 天盘: { 亥: '戌', 寅: '辰' } }, 十二天将: { 未: '贵人', 子: '青龙', 巳: '朱雀' },
  月将: '辰', 占时: '未'
};
var d1 = BF.detect(假课);
ok('23 彼求我事支传干：初传未 = 支上未 → 命中', d1.命中.some(function (x) { return x.序 === 23; }),
  d1.命中.map(function (x) { return x.序 + x.名; }).join(' '));
ok('51 魁度天门：天盘戌临亥 → 命中', d1.命中.some(function (x) { return x.序 === 51; }));
ok('52 罡塞鬼户：天盘辰临寅 → 命中', d1.命中.some(function (x) { return x.序 === 52; }));
// 24 我求彼事干传支：初传 == 干上神
var 课2 = JSON.parse(JSON.stringify(假课));
课2.发用 = { 三传: ['酉', '辰', '亥'] };
var d2 = BF.detect(课2);
ok('24 我求彼事干传支：初传酉 = 干上酉 → 命中', d2.命中.some(function (x) { return x.序 === 24; }));
// 三传亥卯未 成三合局 → 83
var 课3 = JSON.parse(JSON.stringify(假课));
课3.发用 = { 三传: ['亥', '卯', '未'] };
var d3 = BF.detect(课3);
ok('83 三六合：三传亥卯未成三合局 → 命中', d3.命中.some(function (x) { return x.序 === 83; }));
// 三传递生：亥(水)生卯(木)生午(火)
var 课4 = JSON.parse(JSON.stringify(假课));
课4.发用 = { 三传: ['亥', '卯', '午'] };
var d4 = BF.detect(课4);
ok('31 三传递生：亥水→卯木→午火 → 命中', d4.命中.some(function (x) { return x.序 === 31; }));
// 三传互克：亥水克午火？改 申(金)克卯(木)克... 用 申克卯、卯克戌? 卯木克戌土 ✓
var 课5 = JSON.parse(JSON.stringify(假课));
课5.发用 = { 三传: ['申', '卯', '戌'] };
var d5 = BF.detect(课5);
ok('32 三传互克：申金克卯木、卯木克戌土 → 命中', d5.命中.some(function (x) { return x.序 === 32; }));
// 96 旬内空亡：三传含旬空戌亥
var 课6 = JSON.parse(JSON.stringify(假课));
课6.发用 = { 三传: ['戌', '亥', '子'] };
var d6 = BF.detect(课6);
ok('96 旬内空亡：三传戌亥落旬空 → 命中', d6.命中.some(function (x) { return x.序 === 96; }));
// 27 传财化鬼：甲日，初传辰(土=财)、末传申(金=鬼)
var 课7 = JSON.parse(JSON.stringify(假课));
课7.发用 = { 三传: ['辰', '子', '申'] };
var d7 = BF.detect(课7);
ok('27 传财化鬼：甲日 初辰(土·财) 末申(金·鬼) → 命中', d7.命中.some(function (x) { return x.序 === 27; }));
// 28 传鬼化财：甲日，初传申(金=鬼)、末传辰(土=财)
var 课8 = JSON.parse(JSON.stringify(假课));
课8.发用 = { 三传: ['申', '子', '辰'] };
var d8 = BF.detect(课8);
ok('28 传鬼化财：甲日 初申(金·鬼) 末辰(土·财) → 命中', d8.命中.some(function (x) { return x.序 === 28; }));
// 25 金日逢丁：庚日 + 遁干见丁
var 课9 = JSON.parse(JSON.stringify(假课));
课9.四柱.日 = '庚子'; 课9.三传遁干 = ['丁', '癸', '己'];
var d9 = BF.detect(课9);
ok('25 金日逢丁：庚日 + 遁干丁 → 命中', d9.命中.some(function (x) { return x.序 === 25; }));
// 26 水日逢丁：壬日 + 遁干见丁
var 课10 = JSON.parse(JSON.stringify(假课));
课10.四柱.日 = '壬子'; 课10.三传遁干 = ['戊', '丁', '甲'];
var d10 = BF.detect(课10);
ok('26 水日逢丁：壬日 + 遁干丁 → 命中', d10.命中.some(function (x) { return x.序 === 26; }));
// 59 华盖覆日：干上为戌
var 课11 = JSON.parse(JSON.stringify(假课));
课11.四课[0].上 = '戌'; 课11.发用 = { 三传: ['未', '子', '巳'] };
var d11 = BF.detect(课11);
ok('59 华盖覆日：干上神戌 → 命中', d11.命中.some(function (x) { return x.序 === 59; }));

console.log('F. 随机 30 课结构自洽');
var bad = [];
for (var i = 0; i < 30; i++) {
  var y = 1990 + (i * 3) % 35, m = 1 + (i * 7) % 12, dd = 1 + (i * 5) % 27, h = (i * 3) % 24;
  var x = BF.analyze({ y: y, m: m, d: dd, h: h });
  if (x.err || !Array.isArray(x.命中) || x.类象.length !== 3) bad.push(y + '-' + m + '-' + dd + ' ' + h + '时');
}
ok('30 课随机起课判毕法不抛错且字段齐全', bad.length === 0, bad.join(' '));

console.log('\n=== 毕法赋·类象 liuren-bifa 自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
process.exit(fail ? 1 : 0);
