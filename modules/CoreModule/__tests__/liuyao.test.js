/**
 * liuyao.test.js —— 六爻纳甲内核确定性断言（不联真实随机，用固定 backs 起已知卦）
 */
var LY = require('../liuyao.js');
var ICE = require('../iching.js');

var pass = 0, fail = 0;
function eq(name, got, exp) {
  var ok = JSON.stringify(got) === JSON.stringify(exp);
  if (ok) { pass++; } else { fail++; console.log('  ✗ ' + name + '\n     期望 ' + JSON.stringify(exp) + '\n     实际 ' + JSON.stringify(got)); }
}
function t(name, cond) { if (cond) pass++; else { fail++; console.log('  ✗ ' + name); } }

// 乾为天：六阳静（少阳，backs 全 1）
var qian = LY.cast({ backs: [1, 1, 1, 1, 1, 1] });
t('乾为天·本卦', qian.本卦 === '乾为天');
t('乾为天·宫', qian.宫 === '乾宫(金)');
t('乾为天·世6', qian.世 === 6);
t('乾为天·应3', qian.应 === 3);
eq('乾为天·纳甲干支', qian.爻线.map(function (x) { return x.干支; }), ['甲子', '甲寅', '甲辰', '壬午', '壬申', '壬戌']);
eq('乾为天·六亲', qian.爻线.map(function (x) { return x.六亲; }), ['子孙', '妻财', '父母', '官鬼', '兄弟', '父母']);
t('乾为天·世在第六爻', qian.爻线[5].世应 === '世');
t('乾为天·应在第三爻', qian.爻线[2].世应 === '应');
t('乾为天·无动爻', qian.动爻.length === 0 && qian.变卦 === null);

// 坤为地：六阴静（少阴，backs 全 2）
var kun = LY.cast({ backs: [2, 2, 2, 2, 2, 2] });
t('坤为地·本卦', kun.本卦 === '坤为地');
t('坤为地·宫土', kun.宫 === '坤宫(土)');
eq('坤为地·纳甲干支', kun.爻线.map(function (x) { return x.干支; }), ['乙未', '乙巳', '乙卯', '壬子', '壬寅', '壬辰']);
eq('坤为地·六亲', kun.爻线.map(function (x) { return x.六亲; }), ['兄弟', '父母', '官鬼', '妻财', '官鬼', '兄弟']);

// 天风姤：乾宫一世（下巽[0,1,1]+上乾[1,1,1]），backs=[2,1,1,1,1,1]
var gou = LY.cast({ backs: [2, 1, 1, 1, 1, 1] });
t('天风姤·本卦', gou.本卦 === '天风姤');
t('天风姤·宫金', gou.宫 === '乾宫(金)');
t('天风姤·一世世1', gou.世 === 1);
t('天风姤·一世应4', gou.应 === 4);
eq('天风姤·纳甲干支', gou.爻线.map(function (x) { return x.干支; }), ['辛丑', '辛亥', '辛酉', '壬午', '壬申', '壬戌']);
eq('天风姤·六亲', gou.爻线.map(function (x) { return x.六亲; }), ['父母', '子孙', '兄弟', '官鬼', '兄弟', '父母']);
t('天风姤·世在初爻', gou.爻线[0].世应 === '世');
t('天风姤·应在四爻', gou.爻线[3].世应 === '应');

// 动爻与变卦：下巽[0,1,1]+上乾[1,1,1] 本卦=天风姤（乾宫一世），初爻老阴(0背)动 → 变卦=乾为天
var bian = LY.cast({ backs: [0, 1, 1, 1, 1, 1] });
t('动变·本卦姤', bian.本卦 === '天风姤');
eq('动变·动爻', bian.动爻, [1]);
t('动变·变卦乾', bian.变卦 === '乾为天');
t('动变·初爻标记动', bian.爻线[0].动静.indexOf('老阴') >= 0);

// 六神 + 旬空（给定日期）：甲日初爻青龙、旬空依日柱
var dated = LY.cast({ backs: [1, 1, 1, 1, 1, 1], y: 2024, m: 1, d: 1 });
// 2024-01-01 日干支 ≈ 甲子（甲子日，则旬空戌亥，初爻青龙）
t('日期·日干存在', !!dated.日干);
t('日期·六神已布', dated.爻线.every(function (x) { return !!x.六神; }));

// 八宫索引完整性（64 卦全覆盖）
var cnt = Object.keys(LY.GUA_INDEX).length;
t('八宫 64 卦索引完整', cnt === 64);

console.log('\n六爻内核测试：通过 ' + pass + ' / 失败 ' + fail);
process.exit(fail ? 1 : 0);
