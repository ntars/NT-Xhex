/**
 * modules/CoreModule/__tests__/qimen.test.js —— 奇门遁甲 C14 自测（时家转盘法·拆补定局）
 * 跑法：node modules/CoreModule/__tests__/qimen.test.js
 *
 * 锁定分两层（守「不假报」铁律）：
 *   A. 确定性权威部分（已逐项手算核验）：四柱 / 阴阳遁 / 节气 / 元 / 局数 / 旬首 /
 *      值符星 / 值使门 / 地盘布仪 / 天盘九星转盘环序 —— 逐例断言。
 *   B. 结构自洽 + 最易错标注：值使走宫 / 八神顺逆 = 奇门公认最易错、各引擎有 1-step 分歧，
 *      本轮**只断结构**（九宫填满、星/门/神不重错置、值符落在时干宫），具体宫位留 REA
 *      逆向问真八字站黄金盘例逐宫锁定（内核 return._待交叉验证 已标注）。
 */
var assert = require('assert');
var Q = require('../qimen.js');

var passed = 0, failed = 0;
function ok(name, cond, detail) { if (cond) { passed++; console.log('  ✓', name); } else { failed++; console.log('  ✗', name, detail || ''); } }

// A. 确定性权威锁定（1990-8-15 14 时，已手算核验）
console.log('A. 确定性权威部分（已逐项手算核验）');
var c = Q.chart({ y: 1990, m: 8, d: 15, h: 14 });
ok('无 err', !c.err, c.err);
ok('四柱 = 庚午 甲申 壬子 丁未', c.四柱.年 === '庚午' && c.四柱.月 === '甲申' && c.四柱.日 === '壬子' && c.四柱.时 === '丁未', JSON.stringify(c.四柱));
ok('当前节气 = 立秋（8/15 在立秋后·处暑前）', c.节气 === '立秋', c.节气);
ok('拆补定元 = 上（符头己酉·酉=上）', c.元 === '上', c.元);
ok('阴遁（夏至后段）', c.阴阳遁 === '阴遁', c.阴阳遁);
ok('局数 = 阴遁 2 局（立秋上元）', c.局数 === 2, String(c.局数));
ok('旬首 = 甲辰（丁未往回 3 位）', c.旬首 === '甲辰', c.旬首);
ok('值符星 = 天柱（旬首甲辰→壬，壬在兑7宫，7宫本星天柱）', c.值符星 === '天柱', c.值符星);
ok('值使门 = 惊（兑7宫本门惊）', c.值使门 === '惊', c.值使门);
// 地盘布仪（阴遁2局·自2宫逆飞·戊己庚辛壬癸丁丙乙）
var expectDi = { 1: '己', 2: '戊', 3: '乙', 4: '丙', 6: '癸', 7: '壬', 8: '辛', 9: '庚' };
ok('地盘布仪 8 宫全对', Object.keys(expectDi).every(function (p) { return c.地盘[p] === expectDi[p]; }), JSON.stringify(c.地盘));
// 天盘九星：值符天柱落时干「丁」所在宫（丁在中五·寄坤2），天柱应落 2 宫
ok('天盘九星：值符天柱落时干丁宫（中五寄坤2）', c.天盘[2] === '天柱', JSON.stringify(c.天盘));

// B. 结构自洽（值使走宫 / 八神顺逆 —— 最易错，只验结构，不锁具体宫）
console.log('B. 结构自洽（值使走宫 / 八神 —— 留 REA 黄金盘例逐宫锁定）');
// 九星转盘：天盘必须铺满 8 实宫（中五寄坤，8 个实宫各一星、不重不错）
var starVals = [1, 3, 4, 9, 7, 2, 8, 6].map(function (p) { return c.天盘[p]; });
ok('天盘 8 实宫各一星、无空无重', starVals.length === 8 && new Set(starVals).size === 8 && starVals.every(function (x) { return x; }), JSON.stringify(starVals));
// 八门：铺满 8 实宫、不重（门序固定 休生伤杜景死惊开）
var gateVals = [1, 3, 4, 9, 7, 2, 8, 6].map(function (p) { return c.八门[p]; });
ok('八门 8 实宫各一门、不重', gateVals.length === 8 && new Set(gateVals).size === 8 && gateVals.every(function (x) { return x; }), JSON.stringify(gateVals));
// 八神：铺满 8 实宫、值符神在值符同宫、不重
var godVals = [1, 3, 4, 9, 7, 2, 8, 6].map(function (p) { return c.八神[p]; });
ok('八神 8 实宫各一神、不重', godVals.length === 8 && new Set(godVals).size === 8 && godVals.every(function (x) { return x; }), JSON.stringify(godVals));
ok('八神「值符」神与九星值符同宫（值符在 2 宫）', c.八神[2] === '值符', JSON.stringify(c.八神));
// 内核如实标注飞布验证状态（阴遁盘已按黄金盘逐宫锁死，阳遁盘待补；不假报全锁）
ok('内核 _飞布验证 标注在位（阴遁盘已锁 / 阳遁盘待补）', typeof c._飞布验证 === 'string' && c._飞布验证.indexOf('飞布几何') >= 0, c._飞布验证);

// C. 缺料 / 边界
console.log('C. 缺料 / 边界');
ok('缺日期给 prompt', Q.chart({}).err !== undefined);
ok('定局表 24 节气齐全（阳 12 + 阴 12）', Q.YANGE.length === 12 && Q.YINSEG.length === 12);
ok('三奇六仪序 = 戊己庚辛壬癸丁丙乙', Q.SEQ.join('') === '戊己庚辛壬癸丁丙乙');
ok('六甲旬首六对全', ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'].every(function (x) { return Q.XUNSHOU[x]; }));
ok('九星本宫 蓬1芮2冲3辅4禽5心6柱7任8英9', Q.STAR_HOME[1] === '天蓬' && Q.STAR_HOME[2] === '天芮' && Q.STAR_HOME[9] === '天英');

// D. 黄金盘例（qimen.pro 时家·拆补法 2026-10-16 丁巳时，已离线逆向取 SSR 盘）
// 锁「局级锚点」（确定性权威）：四柱/节气/元/局数/旬首/值符星名/值使门名 —— 均已对上。
// 九星·八门·八神「飞布落宫」= 奇门最易错项，黄金盘值符落坎1/值使落震3，
//   与当前转盘环序实现不一致 → **留 REA 驱动 qimen.pro 前端逐宫锁定后再锁**（不臆造、不假报）。
console.log('D. 黄金盘例（qimen.pro 时家拆补 · 2026-10-16 丁巳时）');
var h = Q.chart({ y: 2026, m: 10, d: 16, h: 9 }); // 09:54 → 丁巳时（时柱按时辰，h=9）
ok('黄金盘 无 err', !h.err, h.err);
ok('四柱 = 丙午 戊戌 癸亥 丁巳', h.四柱.年 === '丙午' && h.四柱.月 === '戊戌' && h.四柱.日 === '癸亥' && h.四柱.时 === '丁巳', JSON.stringify(h.四柱));
ok('节气 = 寒露（下元）', h.节气 === '寒露' && h.元 === '下', h.节气 + h.元);
ok('阴遁 3 局', h.阴阳遁 === '阴遁' && h.局数 === 3, h.阴阳遁 + h.局数);
ok('旬首 = 甲寅（遁癸）', h.旬首 === '甲寅', h.旬首);
ok('值符星名 = 天柱（黄金盘「值符天柱」）', h.值符星 === '天柱', h.值符星);
ok('值使门名 = 惊（黄金盘「值使惊门」）', h.值使门 === '惊', h.值使门);
// 飞布逐宫锁定：黄金盘（qimen.pro 时家·拆补·转盘法，阴遁3局）逐宫 9星/8门/8神 全中
//   （这是奇门最易错项「飞布落宫」—— 已由离线逆向黄金盘锁死；阳遁盘待补）
console.log('D. 黄金盘逐宫锁定（qimen.pro 时家拆补 · 阴遁 · 2026-10-16 丁巳时）');
var G = require('../../../tools/qimen-golden-ref.js');
var P = G.盘1;
var h = Q.chart({ y: P.起局.y, m: P.起局.m, d: P.起局.d, h: 9 }); // 09:54 → 丁巳时（h=9 归巳时）
ok('黄金盘 无 err', !h.err, h.err);
ok('局锚点：四柱 丙午/戊戌/癸亥/丁巳', h.四柱.年 === '丙午' && h.四柱.月 === '戊戌' && h.四柱.日 === '癸亥' && h.四柱.时 === '丁巳', JSON.stringify(h.四柱));
ok('节气 寒露下元 · 阴遁3局', h.节气 === '寒露' && h.元 === '下' && h.阴阳遁 === '阴遁' && h.局数 === 3, h.节气 + h.元 + h.阴阳遁 + h.局数);
ok('旬首 甲寅 · 值符天柱 · 值使惊', h.旬首 === '甲寅' && h.值符星 === '天柱' && h.值使门 === '惊', h.旬首 + h.值符星 + h.值使门);
// 逐宫飞布（8 实宫；中5寄坤2 非独立实宫）：九星/八门/八神
var MAPG = { 巽: 4, 离: 9, 坤: 2, 震: 3, 兑: 7, 艮: 8, 坎: 1, 乾: 6 };
function palaceOf(key) { return MAPG[key.charAt(0)]; }
var hit = 0, tot = 0;
['星', '门', '神'].forEach(function (t) {
  var src = t === '星' ? h.天盘 : t === '门' ? h.八门 : h.八神;
  Object.keys(P.九宫).forEach(function (k) {
    if (k === '中5') return;                       // 中五寄坤二，非独立实宫
    var want = P.九宫[k][t];
    if (!want) return;
    tot++;
    var got = src[palaceOf(k)];
    if (String(got).indexOf(want) >= 0 || String(want).indexOf(got) >= 0) hit++;
  });
});
ok('飞布逐宫锁定：九星/八门/八神 全中（' + hit + '/' + tot + '）', hit === tot && tot === 24, '命中 ' + hit + '/' + tot);
ok('内核 _飞布验证 标注在位（阴遁盘已锁 / 阳遁盘待补）', typeof h._飞布验证 === 'string' && h._飞布验证.indexOf('飞布几何') >= 0, h._飞布验证);

console.log('\n=== qimen 自测：' + passed + ' 通过 / ' + failed + ' 失败 ===');
process.exit(failed ? 1 : 0);
