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

// ===== v3.1.5：雷诺曼 36 + 如尼 24 =====
console.log('== 雷诺曼 36（Lenormand 国际通用名目）==');
t('雷诺曼共 36 张', QW.LENORMAND.length === 36);
t('编号连续 1-36', QW.LENORMAND.every(function (c, i) { return c.编号 === i + 1; }));
t('首张=骑手 / 末张=十字', QW.LENORMAND[0].名 === '骑手' && QW.LENORMAND[35].名 === '十字');
t('牌名唯一', new Set(QW.LENORMAND.map(function (c) { return c.名; })).size === 36);
t('每张有关键词与牌义', QW.LENORMAND.every(function (c) { return c.关键词 && c.牌义; }));
t('查「心」=第24张', QW.lenormandCard('心') && QW.lenormandCard('心').编号 === 24);
t('查编号「36」=十字', QW.lenormandCard(36) && QW.lenormandCard(36).名 === '十字');

console.log('== 如尼 24（Elder Futhark 古弗萨克）==');
t('如尼共 24 符', QW.RUNES.length === 24);
t('首符=ᚠ费胡 / 末符=ᛟ奥萨拉', QW.RUNES[0].中名 === '费胡' && QW.RUNES[0].符 === 'ᚠ' && QW.RUNES[23].中名 === '奥萨拉' && QW.RUNES[23].符 === 'ᛟ');
t('符形唯一 24', new Set(QW.RUNES.map(function (r) { return r.符; })).size === 24);
t('每符有罗马音/关键词/符义', QW.RUNES.every(function (r) { return r.罗马音 && r.关键词 && r.符义; }));
t('按罗马音查 Sowilo=索维罗', QW.runeCard('Sowilo') && QW.runeCard('Sowilo').中名 === '索维罗');
t('按关键词查「太阳」命中', QW.runeCard('太阳') && QW.runeCard('太阳').罗马音 === 'Sowilo');
t('按符形查 ᛟ =奥萨拉', QW.runeCard('ᛟ') && QW.runeCard('ᛟ').中名 === '奥萨拉');

// E. 解梦词典扩容（v3.1.59：古籍逐字/原版汇编/通行整理三级来源）
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

console.log('\n签文/解梦/塔罗测试：通过 ' + pass + ' / 失败 ' + fail);
process.exit(fail ? 1 : 0);
