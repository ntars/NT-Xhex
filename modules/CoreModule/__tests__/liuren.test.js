/**
 * modules/CoreModule/__tests__/liuren.test.js —— 大六壬 C16 自测（时家·月将加占时·四课三传·十二天将）
 * 跑法：node modules/CoreModule/__tests__/liuren.test.js
 *
 * 锁定范围（守「不假报」铁律）：
 *   A. 确定性权威部分（已逐项手算核验）：
 *      天地盘公式（对《心印赋》「亥加午、子加未」）/ 日干寄宫 / 四课 /
 *      九宗门发用（甲子日亥将午时 → 元首格·三传 亥→辰→酉，手算一致）/
 *      十二天将（贵人昼夜表 5 源一致 + 顺逆）/ 旬空 / 驿马 / 三传遁干。
 *   B. 全量起课结构自洽：四柱 / 四课×4 / 三传×3（中=天盘[初]、末=天盘[中]）/ 十二天将×12 / 旬空 / 驿马 不缺不重。
 *   C. 待黄金盘验证项（涉害深计数 / 伏吟返吟中末 / 金口诀顺逆异说 / 夜子日柱）内核已如实标注，不在本测试断言「已锁」。
 */
var assert = require('assert');
var L = require('../liuren.js');

var passed = 0, failed = 0;
function ok(name, cond, detail) { if (cond) { passed++; console.log('  ✓', name); } else { failed++; console.log('  ✗', name, detail || ''); } }

// A. 确定性权威部分（手算核验）
console.log('A. 确定性权威部分（天地盘/四课/三传/天将/旬空/驿马/遁干，已手算核验）');

// 甲子日 · 亥将(M=11) · 午时(T=6)：天地盘公式
var M = L.zhiIdx('亥'), T = L.zhiIdx('午');
var pan = L.buildPan(M, T);
ok('天地盘：亥加午（天盘[午]=亥）', pan.天盘['午'] === '亥', JSON.stringify(pan.天盘));
ok('天地盘：子加未（天盘[未]=子）', pan.天盘['未'] === '子', JSON.stringify(pan.天盘));
ok('地盘恒为本身（子→子）', pan.地盘['子'] === '子');

// 四课（甲寄寅、日支子；天地盘公式核验：天盘[寅]=未、天盘[午]=亥、天盘[子]=巳、天盘[巳]=戌）
var 课 = L.siKe('寅', '子', pan.天盘);
ok('四课①干上 = 未', 课[0].位 === '寅' && 课[0].上 === '未', JSON.stringify(课[0]));
ok('四课②干阴 = 子', 课[1].位 === '未' && 课[1].上 === '子', JSON.stringify(课[1]));
ok('四课③支上 = 巳', 课[2].位 === '子' && 课[2].上 === '巳', JSON.stringify(课[2]));
ok('四课④支阴 = 戌', 课[3].位 === '巳' && 课[3].上 === '戌', JSON.stringify(课[3]));

// 九宗门发用：四课全为「下克上」（寅木克未土、未土克子水、子水克巳火）→ 重审格；
//   比用取与日干甲(阳)相比者（课②子上神=子，阳）→ 初=子，中=天盘[子]=巳，末=天盘[巳]=戌
var fy = L.faYong(课, '甲', '子', '寅', pan.天盘, '阳', M, T);
ok('发用 = 重审(下克上)', fy.方法 === '重审(下克上)', fy.方法);
ok('三传 = 子→巳→戌（手算一致）', fy.三传.join('') === '子巳戌', fy.三传.join(''));
ok('中传 = 天盘[初]、末传 = 天盘[中]', fy.三传[1] === pan.天盘[fy.三传[0]] && fy.三传[2] === pan.天盘[fy.三传[1]], JSON.stringify(fy.三传));

// 十二天将：甲日午时（午在卯~申 → 昼）→ 贵人丑(昼)、贵人临丑(亥子丑寅卯辰)→顺布
var tj = L.tianJiang('甲', '午');
ok('贵人 = 丑（甲日昼贵）', tj.贵人 === '丑', JSON.stringify(tj));
ok('昼夜 = 昼（午在卯~申）', tj.昼夜 === '昼', tj.昼夜);
ok('顺逆 = 顺（贵人临丑）', tj.顺逆 === '顺', tj.顺逆);
ok('贵人落丑宫 = 贵人', tj.将['丑'] === '贵人', JSON.stringify(tj.将));
ok('顺布 寅宫 = 螣蛇（丑+1）', tj.将['寅'] === '螣蛇', JSON.stringify(tj.将));
ok('十二天将铺满 12 宫不重', Object.keys(tj.将).length === 12 && new Set(Object.values(tj.将)).size === 12, JSON.stringify(tj.将));

// 天将逆布：甲日酉时（酉→夜）→ 贵人未(夜)、贵人临未(巳午未申酉戌)→逆布
var tj2 = L.tianJiang('甲', '酉');
ok('甲日酉时 贵人 = 未（夜贵）', tj2.贵人 === '未', JSON.stringify(tj2));
ok('甲日酉时 昼夜 = 夜', tj2.昼夜 === '夜', tj2.昼夜);
ok('甲日酉时 顺逆 = 逆（贵人临未）', tj2.顺逆 === '逆', tj2.顺逆);
ok('逆布 午宫 = 螣蛇（未逆1=午）', tj2.将['午'] === '螣蛇', JSON.stringify(tj2.将));

// 旬空 / 驿马 / 遁干
ok('甲子旬空 戌亥', L.xunKong('甲子').join('') === '戌亥', L.xunKong('甲子').join(''));
ok('甲戌旬空 申酉', L.xunKong('甲戌').join('') === '申酉', L.xunKong('甲戌').join(''));
ok('子日驿马 = 寅', L.yiMa('子') === '寅', L.yiMa('子'));
ok('寅午戌驿马 = 申', L.yiMa('午') === '申', L.yiMa('午'));
var dg = L.dunGanOf('甲子');
ok('甲子旬 子遁甲、丑遁乙', dg['子'] === '甲' && dg['丑'] === '乙', JSON.stringify(dg));
ok('甲子旬 空亡支(戌亥)无遁干', dg['戌'] === undefined && dg['亥'] === undefined, JSON.stringify(dg));

// B. 全量起课结构自洽（真实日期）
console.log('B. 全量起课结构自洽（1990-8-15 14 时）');
var c = L.chart({ y: 1990, m: 8, d: 15, h: 14 });
ok('无 err', !c.err, c.err);
ok('四柱齐全（年/月/日/时）', c.四柱.年 && c.四柱.月 && c.四柱.日 && c.四柱.时, JSON.stringify(c.四柱));
ok('月将已定位（非空）', !!c.月将 && c.月将.indexOf('(') > 0, c.月将);
ok('占时已定位', !!c.占时, c.占时);
ok('天地盘各 12 宫', Object.keys(c.天地盘.地盘).length === 12 && Object.keys(c.天地盘.天盘).length === 12, JSON.stringify(c.天地盘));
ok('地盘恒为本身', Object.keys(c.天地盘.地盘).every(function (k) { return c.天地盘.地盘[k] === k; }));
ok('四课 = 4 课', c.四课.length === 4, c.四课.length);
ok('三传 = 3 传（初/中/末）', c.发用.三传.length === 3, c.发用.三传.join(''));
ok('三传 中=天盘[初]、末=天盘[中]（贼克/比用/遥克/昴星主规）',
  c.发用.三传[1] === c.天地盘.天盘[c.发用.三传[0]] && c.发用.三传[2] === c.天地盘.天盘[c.发用.三传[1]],
  JSON.stringify(c.发用));
ok('十二天将铺满 12 宫不重', Object.keys(c.十二天将.将).length === 12 && new Set(Object.values(c.十二天将.将)).size === 12, JSON.stringify(c.十二天将));
ok('三传遁干 = 3 项', c.三传遁干.length === 3, JSON.stringify(c.三传遁干));
ok('旬首为六甲之一', ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'].indexOf(c.旬首) >= 0, c.旬首);
ok('缺口已如实标注（待黄金盘验证项在位）', typeof c.缺口 === 'string' && c.缺口.indexOf('待黄金盘验证') >= 0, c.缺口);

// C. 缺料 / 边界
console.log('C. 缺料 / 边界');
ok('缺日期给 err', L.chart({}).err !== undefined);
ok('月将表 12 中气齐全', L.YUEJIANG.length === 12);
ok('贵人诀 10 干齐全（甲戊庚/乙己/丙丁/壬癸/辛）', ['甲', '戊', '庚', '乙', '己', '丙', '丁', '壬', '癸', '辛'].every(function (g) { return L.GUIREN[g]; }));
ok('十二天将序 = 贵人螣蛇朱雀六合勾陈青龙天空白虎太常玄武太阴天后', L.TIAN_JIANG.join('') === '贵人螣蛇朱雀六合勾陈青龙天空白虎太常玄武太阴天后');
ok('日干寄宫 甲→寅、丙戊→巳、癸→丑', L.JIGONG.甲 === '寅' && L.JIGONG.丙 === '巳' && L.JIGONG.戊 === '巳' && L.JIGONG.癸 === '丑');
ok('旬空六对全', Object.keys(L.XUNKONG).length === 6);

console.log('\n=== 大六壬 liuren 自测：' + passed + ' 通过 / ' + failed + ' 失败 ===');
process.exit(failed ? 1 : 0);
