/**
 * modules/CoreModule/__tests__/zodiac-rel.test.js —— 生肖关系内核验收
 * 用法：node modules/CoreModule/__tests__/zodiac-rel.test.js
 *
 * 锁：十二生肖关系表（5 源核对）——六合/三合/六冲/六害/六破/自刑/犯太岁。
 */
var Z = require('../zodiac-rel.js');
var fails = 0;
function ok(c, m) { if (c) console.log('  ✓', m); else { fails++; console.log('  ✗', m); } }
function has(sx1, sx2, tag) { return Z.relOf(sx1, sx2).关系.indexOf(tag) >= 0; }

console.log('== 六合（暗合）==');
ok(has('鼠', '牛', '六合'), '子丑合（鼠牛）');
ok(has('虎', '猪', '六合'), '寅亥合（虎猪）');
ok(has('兔', '狗', '六合'), '卯戌合（兔狗）');

console.log('== 三合（明合局）==');
ok(Z.relOf('猴', '鼠').关系.join().indexOf('水局') >= 0 && Z.relOf('鼠', '龙').关系.join().indexOf('水局') >= 0, '申子辰水局（猴鼠龙）');
ok(Z.relOf('猪', '兔').关系.join().indexOf('木局') >= 0 && Z.relOf('兔', '羊').关系.join().indexOf('木局') >= 0, '亥卯未木局（猪兔羊）');

console.log('== 六冲 ==');
ok(has('鼠', '马', '六冲'), '子午冲（鼠马）');
ok(has('龙', '狗', '六冲'), '辰戌冲（龙狗）');

console.log('== 六害 ==');
ok(has('鼠', '羊', '六害'), '子未害（鼠羊）');
ok(has('鸡', '狗', '六害'), '酉戌害（鸡狗）');

console.log('== 相刑 / 自刑 ==');
ok(has('虎', '蛇', '三刑'), '寅巳申三刑（虎蛇）');
ok(has('牛', '羊', '三刑'), '丑未戌三刑（牛羊）');
ok(has('龙', '龙', '自刑'), '辰自刑（龙龙）');

console.log('== 单生肖速查 ==');
var niu = Z.detail('牛');
ok(niu.六合贵人.indexOf('鼠') >= 0 && niu.六冲.indexOf('羊') >= 0 && niu.六害.indexOf('马') >= 0, '属牛：六合鼠/冲羊/害马');
ok(Z.detail('龙').自刑.indexOf('龙') >= 0, '属龙：自刑');

console.log('== 犯太岁（2026 = 马太岁）==');
ok(Z.taisui('马', '马').some(function (x) { return x.indexOf('值太岁') >= 0; }), '马年属马 = 值太岁');
ok(Z.taisui('马', '鼠').some(function (x) { return x.indexOf('冲太岁') >= 0; }), '马年属鼠 = 冲太岁');
ok(Z.taisui('马', '牛').some(function (x) { return x.indexOf('害太岁') >= 0; }), '马年属牛 = 害太岁（丑午相害）');
ok(Z.taisui('马', '虎').length === 0, '马年属虎 = 不犯（寅与午无值冲刑害破）');

if (fails === 0) { console.log('全部通过 ✓'); process.exit(0); } else { console.log(fails + ' 处失败'); process.exit(1); }
