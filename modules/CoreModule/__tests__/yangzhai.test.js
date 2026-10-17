/**
 * yangzhai.test.js —— 阳宅风水内核确定性断言
 */
var YZ = require('../yangzhai.js');

var pass = 0, fail = 0;
function t(name, cond) { if (cond) pass++; else { fail++; console.log('  ✗ ' + name); } }
function eq(name, got, exp) {
  var ok = JSON.stringify(got) === JSON.stringify(exp);
  if (ok) pass++; else { fail++; console.log('  ✗ ' + name + ' 期望 ' + JSON.stringify(exp) + ' 实际 ' + JSON.stringify(got)); }
}

// 八宫映射
t('八宫映射含乾', !!YZ.GONG_MAP.乾 && YZ.GONG_MAP.乾.成员.indexOf('男主人') >= 0);
t('中宫映射', YZ.GONG_MAP.中.方位 === '中宫');

// 厨房正南大凶
eq('厨房正南大凶', YZ.KITCHEN.正南.吉凶, '大凶');
t('厨房正北吉', YZ.KITCHEN.正北.吉凶 === '吉');
t('厨房正南含水局化解', YZ.KITCHEN.正南.化解.indexOf('申子辰') >= 0);

// 厕所正南化解
t('厕所正南化解含绿萝', YZ.TOILET.正南.化解.indexOf('绿萝') >= 0);

// 门对门
t('入户对电梯化解含八卦镜', YZ.DOOR_PAIRS['入户对电梯'].indexOf('八卦镜') >= 0);
t('卧对卧含家和万事兴', YZ.DOOR_PAIRS['卧对卧'].indexOf('家和万事兴') >= 0);
t('门对门共13类', Object.keys(YZ.DOOR_PAIRS).length === 13);

// 缺角
t('缺角含西北危害', YZ.MISSING.西北.危害.indexOf('男主人') >= 0);
t('乾坤艮巽不能缺', YZ.不能缺.join('') === '乾坤艮巽');

// 楼层五行
eq('楼层尾数五行 11→水', YZ.floorWx(11).五行, '水');
eq('楼层尾数五行 23→木', YZ.floorWx(23).五行, '木');
eq('楼层尾数五行 10→土', YZ.floorWx(10).五行, '土');

// 楼层+生肖匹配
var fz = YZ.floorZodiac(8, '虎');
t('8楼层木/虎木→比和', fz.楼层五行 === '木' && fz.生肖五行 === '木' && fz.匹配.indexOf('比和') >= 0);

// analyze 聚合
var a = YZ.analyze({ 缺角: ['西北', '东南'], 厨房: '正南', 厕所: '正北', 门对门: '卧对卧', 楼层: 8, 生肖: '虎' });
t('analyze 缺角2项', a.缺角.length === 2);
t('analyze 西北标损丁煞', a.缺角[0].方位 === '西北' && a.缺角[0].严重.indexOf('损丁煞') >= 0);
t('analyze 厨房大凶', a.厨厕.some(function (x) { return x.类型 === '厨房' && x.吉凶 === '大凶'; }));
t('analyze 门对门含家和', a.门对门[0].化解.indexOf('家和万事兴') >= 0);
t('analyze 楼层比和', a.楼层.匹配.indexOf('比和') >= 0);

console.log('\n阳宅风水测试：通过 ' + pass + ' / 失败 ' + fail);
process.exit(fail ? 1 : 0);
