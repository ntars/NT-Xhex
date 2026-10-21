/**
 * modules/CoreModule/__tests__/dreamdata.test.js —— 解梦词库（v3.1.15 扩到 14 类 / 160+ 词；
 * v3.1.59 有据扩容到 15 类 / 250+ 词，新增「综合」类收无明确归属的通用条）自测
 * 覆盖：分类与条数、每条两栏（传统/心理）非空且有理有据、跨类不重词、
 *       精确取词、自然句取梦象（最长优先 + 先出现优先）、壳词剥离、未收录不瞎猜。
 * 跑法：node modules/CoreModule/__tests__/dreamdata.test.js
 */
var Q = require('../qianwen.js');

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}

console.log('A. 分类与规模');
var cats = Q.dreamCats();
ok('共 15 类（v3.1.59 起新增「综合」）', cats.length === 15, cats.length);
ok('类别名与顺序固定（人物/动物/自然/身体/财物/出行/鬼神/居所/婚恋/职场/饮食/器物/丧葬/天象/综合）',
  cats.map(function (x) { return x.类别; }).join(',') === '人物,动物,自然,身体,财物,出行,鬼神,居所,婚恋,职场,饮食,器物,丧葬,天象,综合',
  cats.map(function (x) { return x.类别; }).join(','));
ok('词条总数 250+（实际 ' + Q.dreamCount() + '）', Q.dreamCount() >= 250);
ok('每类至少 7 条（没有空壳类）', cats.every(function (x) { return x.词数 >= 7; }),
  cats.map(function (x) { return x.类别 + x.词数; }).join(' '));
ok('各类词数之和 = 总数', cats.reduce(function (n, x) { return n + x.词数; }, 0) === Q.dreamCount());

console.log('B. 词条内容（两栏都不许留白）');
var 缺 = [], 短 = [];
cats.forEach(function (c) {
  Q.dreamList(c.类别).forEach(function (e) {
    if (!e.传统 || !e.传统.replace(/\s/g, '')) 缺.push(c.类别 + '/' + e.词 + '.传统');
    if (!e.心理 || !e.心理.replace(/\s/g, '')) 缺.push(c.类别 + '/' + e.词 + '.心理');
    if (e.传统.length < 4) 短.push(c.类别 + '/' + e.词);
  });
});
ok('每条都有「传统」与「心理」两栏', 缺.length === 0, 缺.slice(0, 6).join(' '));
ok('传统栏不是两个字敷衍（≥4 字）', 短.length === 0, 短.slice(0, 6).join(' '));
// 跨类不重词：同一个词出现在两类里，查询就会「看类别顺序决定答案」，必须禁止
var 全词 = [];
cats.forEach(function (c) { Q.dreamList(c.类别).forEach(function (e) { 全词.push(e.词); }); });
var 重 = 全词.filter(function (w, i) { return 全词.indexOf(w) !== i; });
ok('词条跨类不重复（' + 全词.length + ' 个词唯一）', 重.length === 0, 重.join(' '));
ok('传统栏措辞不写死结论（不出现「一定会」「必然是」）', (function () {
  var bad = [];
  cats.forEach(function (c) {
    Q.dreamList(c.类别).forEach(function (e) {
      if (/一定会|必然是|必定会/.test(e.传统)) bad.push(e.词);
    });
  });
  return bad.length === 0;
})());

console.log('C. 精确取词');
ok('dreamOf 命中「蛇」（动物）', Q.dreamOf('蛇').类别 === '动物');
ok('dreamOf 命中「掉牙」（身体）', Q.dreamOf('掉牙').类别 === '身体');
ok('dreamOf 未收录返回 null', Q.dreamOf('独角兽') === null);
ok('dreamOf 空值返回 null', Q.dreamOf('') === null && Q.dreamOf(null) === null);
ok('dreamOf 首尾空格不影响', Q.dreamOf('  蛇  ').词 === '蛇');

console.log('D. 自然句取梦象');
ok('「梦到蛇」→ 蛇', Q.dreamMatch('梦到蛇').词 === '蛇');
ok('「梦见一条大蛇」→ 蛇（壳词剥掉）', Q.dreamMatch('梦见一条大蛇').词 === '蛇');
ok('「梦见掉牙了」→ 掉牙（长词优先，不被「牙」截断）', Q.dreamMatch('梦见掉牙了').词 === '掉牙');
ok('「梦到星星坠落」→ 星星坠落（不被「星」截断）', Q.dreamMatch('梦到星星坠落').词 === '星星坠落');
ok('「梦到会飞的猫」→ 飞（同长取先出现，不按类别顺序抢）', Q.dreamMatch('梦到会飞的猫').词 === '飞',
  Q.dreamMatch('梦到会飞的猫').词);
ok('「昨晚梦到水很大」→ 水', Q.dreamMatch('昨晚梦到水很大').词 === '水');
ok('未收录的梦象返回 null（不硬编）', Q.dreamMatch('梦到独角兽跳舞') === null);
ok('空串返回 null', Q.dreamMatch('') === null);

console.log('E. 分类列举');
var lst = Q.dreamList('动物');
ok('dreamList(动物) 69 条（v3.1.59 扩容后）', lst.length === 69, lst.length);
ok('dreamList 吃「动物类」写法', Q.dreamList('动物类') && Q.dreamList('动物类').length === 69);
ok('dreamList 未收录返回 null', Q.dreamList('天宫') === null);
ok('分类列举的词都能单独取到释义', cats.every(function (c) {
  return Q.dreamList(c.类别).every(function (e) { return !!Q.dreamOf(e.词); });
}));

console.log('F. 旧词条没被扩表冲掉（v3.1.5 的 18 条仍在）');
var 旧 = ['死人', '陌生人', '蛇', '狗', '猫', '水', '火', '山', '牙', '血', '钱', '丢钱', '飞', '迷路', '神', '鬼', '房', '旧居'];
var 丢 = 旧.filter(function (w) { return !Q.dreamOf(w); });
ok('18 个旧词条全部保留', 丢.length === 0, 丢.join(' '));

console.log('\n=== 解梦词库 自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
process.exit(fail ? 1 : 0);
