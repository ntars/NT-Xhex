/** 行运/合盘/印视 三个解读库自测（v3.1.51） */
var TD = require('../transit-duanyu.js'), SD = require('../synastry-duanyu.js'), VD = require('../vedic-duanyu.js');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (e ? '  → ' + e : '')); } }
console.log('=== 三库自测 ===\n');
console.log('A. 行运 transit-duanyu');
ok('行运过宫 84', TD.count.行运过宫 === 84);
ok('行运相位 35', TD.count.行运相位 === 35);
ok('返照 2', TD.count.返照 === 2);
ok('firdaria 主星 9', TD.count.firdaria主星 === 9);
ok('transitHouseOf(土星,10) 有', !!TD.transitHouseOf('土星', 10));
ok('transitHouseOf 吃异名（月亮→太阴）', TD.transitHouseOf('月亮', 4) === TD.transitHouseOf('太阴', 4));
ok('transitHouseOf 未知返回 null', TD.transitHouseOf('太阳', 99) === null);
ok('transitAspectOf(太阳,冲) 有', !!TD.transitAspectOf('太阳', '冲'));
ok('transitAspectOf 未知返回 null', TD.transitAspectOf('太阳', '不存在') === null);
ok('firdariaLordOf(罗睺) 有', !!TD.firdariaLordOf('罗睺'));
ok('returnTextOf(太阳返照) 有', !!TD.returnTextOf('太阳返照'));
ok('returnTextOf(不存在) → null', TD.returnTextOf('x') === null);
console.log('\nB. 合盘 synastry-duanyu');
ok('行星对 21', SD.count.行星对 === 21);
ok('相位性质 5', SD.count.相位性质 === 5);
ok('pairOf 无序（月-日=日-月）', SD.pairOf('月亮', '太阳') === SD.pairOf('太阳', '月亮'));
ok('pairOf 异名兼容', !!SD.pairOf('月亮', '水星'));
ok('pairOf 未知返回 null', SD.pairOf('天王', '海王') === null);
ok('aspectNatureOf(合) 有', !!SD.aspectNatureOf('合'));
ok('lineOf 组合句', /太阳与月亮成合：/.test(SD.lineOf('太阳', '月亮', '合')));
ok('lineOf 未知对返回 null', SD.lineOf('天王', '冥王', '合') === null);
console.log('\nC. 印视 vedic-duanyu');
ok('二十七宿 27', VD.count.二十七宿 === 27);
ok('vims 主星 9', VD.count.vims主星 === 9);
ok('tara 9', VD.count.tara === 9);
ok('nakOf(8) = 普什亚', VD.nakOf(8).中 === '普什亚');
ok('nakByName 吃梵文', VD.nakByName('Rohini').中 === '罗希尼');
ok('nakByName 吃中文', VD.nakByName('罗希尼').梵 === 'Rohini');
ok('nakByName 未知返回 null', VD.nakByName('不存在') === null);
ok('vimsLordOf(金星) 含 20 年', /20 年/.test(VD.vimsLordOf('金星')));
ok('taraOf 越界返回 null', VD.taraOf(0, 5) === null && VD.taraOf(1, 28) === null);
ok('taraOf(1,10) = 生宿', VD.taraOf(1, 10).名.indexOf('生宿') >= 0);
ok('taraOf(8,8) 自反 = 生宿', VD.taraOf(8, 8).名.indexOf('生宿') >= 0);
ok('taraOf(1,2) = 财宿（吉）', VD.taraOf(1, 2).凶 === '吉');
console.log('\nD. 27 宿字段完整');
var miss = [];
for (var i = 1; i <= 27; i++) { var n = VD.nakOf(i); if (!n.中 || !n.梵 || !n.主 || !n.象 || !n.质) miss.push(i); }
ok('27 宿五字段全（中/梵/主/象/质）', miss.length === 0, miss.join(','));
console.log('\n=== 三库自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
if (fail) process.exit(1);

// v3.1.52 追加：双人 Tara + Composite 中点盘（功能级，走 analyzer）
console.log('\nE. 双人 Tara 与 Composite（v3.1.52）');
var ANA = require('../../AnalyzerModule/analyzer.js');
var taraOut = String(ANA.analyze('1990年8月15日12时 与 1992年3月20日6时 印占 Tara'));
ok('双人 Tara 输出含双向（A 对 B / B 对 A）',
  /A 对 B/.test(taraOut) && /B 对 A/.test(taraOut), taraOut.slice(0, 80));
ok('双人 Tara 有吉凶判定', /（吉|凶|大吉|平偏阻）/.test(taraOut));
ok('双人 Tara 有口径行', /Tara 口径/.test(taraOut));
ok('单人印占不触发 Tara（仍是本命盘）',
  String(ANA.analyze('1990年8月15日12时 印占')).indexOf('双人 Tara') < 0);
var compOut = String(ANA.analyze('1990年8月15日12时 与 1992年3月20日6时 合盘 中点'));
ok('Composite 输出 7 行星落座', /中点盘行星落座：太阳/.test(compOut) && /土星/.test(compOut));
ok('Composite 有关系语境解读', /中点盘解读：.*这段关系的核心气质/.test(compOut));
ok('Composite 有口径行（标注现代通行技法、非单一古籍权威）', /Composite 口径/.test(compOut) && /◆非单一古籍权威/.test(compOut));
ok('Composite 补关系主轴与中点相位', /关系主轴/.test(compOut) && /中点盘内部相位/.test(compOut));
// v3.1.56：上升/宫位已补（度数中点法），并如实注明另有时空中点法
ok('Composite 补上升/宫位（度数中点法）并注明时空中点法', /Composite 上升\/宫位（度数中点法）/.test(compOut) && /时空中点法/.test(compOut));
ok('合盘不带「中点」仍是比较盘', /合盘解读/.test(String(ANA.analyze('1990年8月15日12时 与 1992年3月20日6时 合盘'))));
console.log('\n=== 三库+功能自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
if (fail) process.exit(1);
