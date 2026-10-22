/**
 * qianwen.test.js —— 签文/解梦 结构 + 生成确定性断言
 *
 * v3.2.0 裁剪后：塔罗（TAROT/tarotCard/tarotSpread）、占星骰子（DICE_ 星象 / astroDice）、
 * 雷诺曼（LENORMAND/lenormandCard）、如尼符文（RUNES/runeCard）随对应算法一并归档，
 * 本文件只保留仍在项目内的解梦词典、观音灵签、答案之书。
 */
var QW = require('../qianwen.js');

var pass = 0, fail = 0;
function t(name, cond) { if (cond) pass++; else { fail++; console.log('  ✗ ' + name); } }
function eq(name, got, exp) {
  var ok = JSON.stringify(got) === JSON.stringify(exp);
  if (ok) pass++; else { fail++; console.log('  ✗ ' + name + ' 期望 ' + JSON.stringify(exp) + ' 实际 ' + JSON.stringify(got)); }
}

// 解梦
t('解梦 蛇', QW.dreamOf('蛇') && QW.dreamOf('蛇').类别 === '动物');
t('解梦 水', QW.dreamOf('水') && QW.dreamOf('水').心理.indexOf('情绪') >= 0);
t('解梦未命中返null', QW.dreamOf('不存在的词xyz') === null);

// 观音灵签
eq('观音总签100', QW.GUANYIN_COUNT, 100);
var g1 = QW.guanyinDraw('2026-01-01');
var g2 = QW.guanyinDraw('2026-01-01');
t('观音抽签确定性', g1.签号 === g2.签号 && g1.签号 >= 1 && g1.签号 <= 100);
t('观音签文库 100 条', QW.GUANYIN.length === 100, QW.GUANYIN.length);

// 答案之书
var a1 = QW.answerBook(0), a2 = QW.answerBook(0);
eq('答案之书确定性', a1.句, a2.句);

// ===== v3.1.5：解梦词典扩容（v3.1.59：古籍逐字/原版汇编/通行整理三级来源）=====
console.log('== 解梦词典 ==');
(function () {
  t('E1 总条数 ≥250（原 161 + 扩容）', QW.dreamCount() >= 250, QW.dreamCount());
  t('E2 动物类 ≥60（古籍逐字 50+）', Object.keys(QW.DREAM.动物).length >= 60);
  t('E3 综合类 ≥40（原版汇编，剔除跨类重词与三字敷衍条后）', Object.keys(QW.DREAM.综合).length >= 40, Object.keys(QW.DREAM.综合).length);
  // 古籍出处逐字保真（抽 3 条）
  t('E4 蛇咬人主得大财（周公解梦）', QW.dreamOf('蛇咬人').传统 === '主得大财。《周公解梦》');
  t('E5 齿自落父母凶（汇编）', QW.dreamOf('齿自落').传统 === '父母凶。');
  t('E6 心理栏明标◆通行整理', QW.dreamOf('蛇缠身').心理.indexOf('◆通行整理') >= 0);
  // 原 161 条不被覆盖（猪的旧条仍在）
  t('E7 原条目不被覆盖', !!QW.dreamOf('死人'));
  t('E8 自然语言匹配命中新条', QW.dreamMatch('昨晚梦见杀猪') && QW.dreamMatch('昨晚梦见杀猪').词 === '杀猪');
})();

console.log('\n签文/解梦测试：通过 ' + pass + ' / 失败 ' + fail);
process.exit(fail ? 1 : 0);
