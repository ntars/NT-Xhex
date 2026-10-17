/**
 * qianwen.test.js —— 签文/解梦/塔罗/占星骰子 结构 + 生成确定性断言
 */
var QW = require('../qianwen.js');

var pass = 0, fail = 0;
function t(name, cond) { if (cond) pass++; else { fail++; console.log('  ✗ ' + name); } }
function eq(name, got, exp) {
  var ok = JSON.stringify(got) === JSON.stringify(exp);
  if (ok) pass++; else { fail++; console.log('  ✗ ' + name + ' 期望 ' + JSON.stringify(exp) + ' 实际 ' + JSON.stringify(got)); }
}

// 塔罗 78 张
eq('塔罗总数78', QW.TAROT.length, 78);
t('塔罗含22大阿尔克纳', QW.TAROT.filter(function (x) { return x.类 === '大阿尔克纳'; }).length === 22);
t('塔罗含56小阿尔克纳', QW.TAROT.filter(function (x) { return x.类 === '小阿尔克纳'; }).length === 56);
t('塔罗卡 愚人检索', QW.tarotCard('愚人') && QW.tarotCard('愚人').类 === '大阿尔克纳');
t('塔罗三张占', QW.tarotSpread('three', [0, 1, 2]).length === 3);
t('塔罗首牌生成', QW.tarotCard('权杖A') && QW.tarotCard('权杖A').正位.indexOf('新始') >= 0);

// 解梦
t('解梦 蛇', QW.dreamOf('蛇') && QW.dreamOf('蛇').类别 === '动物');
t('解梦 水', QW.dreamOf('水') && QW.dreamOf('水').心理.indexOf('情绪') >= 0);
t('解梦未命中返null', QW.dreamOf('不存在的词xyz') === null);

// 占星骰子（10×12×12 = 1440 组合）
eq('骰子行星数10', QW.DICE_PLANET.length, 10);
eq('骰子星座数12', QW.DICE_SIGN.length, 12);
var d1 = QW.astroDice(0, 0, 0);
eq('骰子(0,0,0)', [d1.行星, d1.星座, d1.宫位], ['太阳', '白羊', '1命宫']);
var d2 = QW.astroDice(9, 11, 11);
eq('骰子(9,11,11)', [d2.行星, d2.星座, d2.宫位], ['冥王星', '双鱼', '12玄秘']);

// 观音灵签
eq('观音总签100', QW.GUANYIN_COUNT, 100);
var g1 = QW.guanyinDraw('2026-01-01');
var g2 = QW.guanyinDraw('2026-01-01');
t('观音抽签确定性', g1.签号 === g2.签号 && g1.签号 >= 1 && g1.签号 <= 100);

// 答案之书
var a1 = QW.answerBook(0), a2 = QW.answerBook(0);
eq('答案之书确定性', a1.句, a2.句);

console.log('\n签文/解梦/塔罗测试：通过 ' + pass + ' / 失败 ' + fail);
process.exit(fail ? 1 : 0);
