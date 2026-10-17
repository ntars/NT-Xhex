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

// ===== v3.1.5 补：飞神 / 伏神 / 基础断语 =====
var FH_RELS = ['飞生伏（易出）', '飞克伏（受压难出）', '伏生飞（泄气）', '伏克飞（可出）', '比和'];
// ① 本宫纯卦「乾为天」（乾宫代0）：飞伏同位 → 六爻飞神干支 == 伏神干支，且标注「飞伏同位」
var qfh = LY.flyingHidden(LY.GUA_INDEX['乾为天'], ['甲子', '甲寅', '甲辰', '壬午', '壬申', '壬戌']);
eq('纯卦·六爻飞伏同位', qfh.map(function (f) { return f.飞神.干支 === f.伏神.干支; }), [true, true, true, true, true, true]);
t('纯卦·标注飞伏同位', qfh.every(function (f) { return f.同位 === '本宫纯卦，飞伏同位'; }));
t('飞伏关系取值合法', qfh.every(function (f) { return FH_RELS.indexOf(f.飞伏关系) >= 0; }));

// ② 非纯卦「天风姤」（乾宫一世，下巽上乾）：飞=巽内+乾外，伏=乾纯 → 仅下卦三位不同
var gi = LY.GUA_INDEX['天风姤'];
t('姤·乾宫一世·下巽上乾', gi.宫 === '乾' && gi.代 === 1 && gi.下 === '巽' && gi.上 === '乾');
var gfh = LY.flyingHidden(gi, LY.NAJIA.巽.内.concat(LY.NAJIA.乾.外));
eq('姤·第1爻 飞辛丑/伏甲子', [gfh[0].飞神.干支, gfh[0].伏神.干支], ['辛丑', '甲子']);
eq('姤·仅下卦三位飞伏不同', gfh.map(function (f) { return f.飞神.干支 !== f.伏神.干支; }), [true, true, true, false, false, false]);
eq('姤·第1爻 飞辛丑(土)克伏甲子(水)→飞克伏', gfh[0].飞伏关系, '飞克伏（受压难出）');

// ③ cast 输出含 伏飞神(6爻) / 断语
t('cast·伏飞神 6 爻', qian.伏飞神 && qian.伏飞神.length === 6);
t('cast·断语为数组', Array.isArray(qian.断语));
// 乾为天 世6=壬戌(土) → 土生金(宫) → 父母持世
t('乾为天·世6六亲=父母', qian.爻线[5].六亲 === '父母');
t('乾为天·出「父母持世」断语', qian.断语.some(function (d) { return d.项 === '父母持世'; }));

// ④ 用神·可见路径：乾为天父母现于 3/6 爻 → 出「现于第…爻」
var jv = LY.judge(LY.GUA_INDEX['乾为天'], qian.爻线, '父母', qfh, []);
t('用神可见→出「现于第…爻」', jv.some(function (d) { return d.类 === '用神' && d.项.indexOf('现于第') >= 0; }));
// ⑤ 用神·伏藏路径：姤卦本卦无「妻财」，应伏于乾纯卦第2爻(甲寅木·妻财)
var linesGou = [{ 爻: 1, 六亲: '父母' }, { 爻: 2, 六亲: '子孙' }, { 爻: 3, 六亲: '兄弟' },
                { 爻: 4, 六亲: '官鬼' }, { 爻: 5, 六亲: '兄弟' }, { 爻: 6, 六亲: '父母' }];
var jh = LY.judge(gi, linesGou, '妻财', gfh, []);
t('用神不现→走伏藏路径', jh.some(function (d) { return d.类 === '用神' && d.项.indexOf('伏于第2爻') >= 0; }));
t('伏藏断语带飞伏关系', jh.some(function (d) { return d.类 === '用神' && FH_RELS.some(function (r) { return d.断.indexOf(r) >= 0; }); }));

// ⑥ 结构不变式：随机 300 次，伏飞神恒 6 爻 + 关系合法 + 断语为数组
var structBad = 0;
for (var si = 0; si < 300; si++) {
  var rr = LY.cast({ y: 1990, m: 8, d: 15, h: 14 });
  if (rr.err) continue;
  if (!rr.伏飞神 || rr.伏飞神.length !== 6) structBad++;
  if (!Array.isArray(rr.断语)) structBad++;
  rr.伏飞神.forEach(function (f) { if (FH_RELS.indexOf(f.飞伏关系) < 0) structBad++; });
}
t('随机300次结构检查无异常', structBad === 0);

console.log('\n六爻内核测试：通过 ' + pass + ' / 失败 ' + fail);
process.exit(fail ? 1 : 0);
