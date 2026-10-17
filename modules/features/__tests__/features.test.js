/**
 * modules/features/__tests__/features.test.js —— 扩展功能注册表验收
 * 用法：node modules/features/__tests__/features.test.js
 *
 * 锁：① 每个功能触发词都能 match；② run 不崩、缺料给 prompt、有料给 text。
 */
var R = require('../registry.js');
var fails = 0;
function ok(c, m) { if (c) console.log('  ✓', m); else { fails++; console.log('  ✗', m); } }

function ent(y, mo, dy, h, g) { return { date: y ? { year: y, month: mo || 1, day: dy || 1 } : null, time: h != null ? { hour: h } : null, gender: g || null }; }

console.log('== 触发词路由（match）==');
var expectKey = {
  '白玖玖 2005年6月9日 排盘': 'bazi-chart',
  '大运 1990年8月1日': 'dayun',
  '手机八星 13812345678': 'numberstars',
  '紫微 2026': 'feixing',
  '易经 起卦 42': 'iching',
  '八宅 命卦 1990': 'bazhai',
  '梅花 1990年8月1日': 'meihua',
  '数字八字 1990年8月1日': 'numeral-chart',
  '数字命理 1990年8月1日': 'numeral-chart',
  '凶数 1990年8月1日': 'numeral-judge',
  '通关 1990年8月1日': 'numeral-fix',
  '属鼠 属马': 'zodiac',
  '属虎 犯太岁': 'taisui',
  '雷天大壮': 'zhouyi',
  '查卦 地天泰': 'zhouyi',
  '起名 2008年3月1日': 'naming',
  '紫微斗数 1990年8月15日 男': 'ziwei',
  '斗数 1990年8月15日': 'ziwei',
  '坐北 坐向': 'fengshui',
  '1990男 1992女 八等婚': 'fengshui',
  '穿衣 2026年8月15日': 'wuxing-color',
  '九宫飞星 2026 月飞星': 'feixing',
  '五格 白玖玖': 'wuge',
  '木 相生相克': 'wuxing',
  '小六壬 2000年5月6日': 'xiaoshu',
  '占星 星盘 1990年8月15日': 'astro',
  '七政 黄经 1990年8月15日': 'astro',
  '罗睺 月孛': 'astro',
  '奇门遁甲 1990年8月15日 14时': 'qimen',
  '值符 值使 1990年8月15日': 'qimen',
  '阴遁 阳遁 定局 2024年8月15日': 'qimen'
};
for (var tx in expectKey) {
  var f = R.match(tx);
  ok(f && f.key === expectKey[tx], '「' + tx + '」→ ' + (f ? f.key : '未命中') + '（期望 ' + expectKey[tx] + '）');
}

console.log('== 有料 run（返回 text，不崩）==');
var have = [
  ['bazi-chart', '白玖玖，女，2005年6月9日子时 排盘', ent(2005, 6, 9, 0, 'female')],
  ['dayun', '大运 1990年8月1日 男', ent(1990, 8, 1, 14, 'male')],
  ['numberstars', '13812345678', ent()],
  ['numeral-chart', '数字八字 1990年8月1日', ent(1990, 8, 1, 14)],
  ['numeral-judge', '凶数 1990年8月1日', ent(1990, 8, 1, 14)],
  ['numeral-fix', '通关 1990年8月1日', ent(1990, 8, 1, 14)],
  ['zodiac', '属鼠 属马', ent()],
  ['taisui', '属鼠 2026 犯太岁', ent()],
  ['naming', '起名 2008年3月1日 女', ent(2008, 3, 1, 14, 'female')],
  ['ziwei', '紫微斗数 1990年8月15日 14时 男', ent(1990, 8, 15, 14, 'male')],
  ['fengshui', '1990男 1992女 八等婚', ent()],
  ['fengshui', '坐北 坐向', ent()],
  ['wuxing-color', '穿衣 2026年8月15日', ent(2026, 8, 15)],
  ['feixing', '九宫飞星 2026年8月15日 月飞星', ent(2026, 8, 15, 14)],
  ['feixing', '九宫飞星 2026年8月15日 月飞星', ent(2026, 8, 15, 14)],
  ['iching', '易经 起卦 42', ent()],
  ['bazhai', '八宅 1990 男', ent(1990, 1, 1, undefined, 'male')],
  ['meihua', '梅花 1990年8月1日', ent(1990, 8, 1, 14)],
  ['zhouyi', '查卦 地天泰', ent()],
  ['wuge', '五格 白玖玖', ent()],
  ['wuxing', '木 相生相克', ent()],
  ['xiaoshu', '小六壬 2000年5月6日', ent(2000, 5, 6, 2)],
  ['astro', '占星 星盘 1990年8月15日 14时', ent(1990, 8, 15, 14)],
  ['qimen', '奇门遁甲 1990年8月15日 14时', ent(1990, 8, 15, 14)]
];
have.forEach(function (c) {
  var out = R.run(c[0], c[2], c[1]);
  ok(out && out.text, c[0] + ' 有料 → ' + (out && out.text ? out.text.split('\n')[0].slice(0, 26) : '失败'));
});
// astro 内容锁定：落座 + 缺口「紫炁」如实标注（不臆造）
var aOut = R.run('astro', ent(1990, 8, 15, 14), '占星 1990年8月15日 14时');
ok(aOut && aOut.text && aOut.text.indexOf('【占星·七政四余】') >= 0, '占星有料出标题');
ok(aOut && aOut.text && aOut.text.indexOf('（黄经') >= 0, '占星给出各曜黄经');
ok(aOut && aOut.text && aOut.text.indexOf('紫炁') >= 0, '占星如实标注紫炁缺口（不臆造）');
ok(aOut && aOut.text && aOut.text.indexOf('落二十八宿') >= 0, '占星给落二十八宿（等宫近似·淮南子宿度）');
ok(aOut && aOut.text && aOut.text.indexOf('庙旺') >= 0, '占星给庙旺（果老星宗查表）');

console.log('== 缺料 run（返回 prompt，引导补全）==');
ok(R.run('numberstars', ent(), '号码八星 看看').prompt, '号码八星无数字 → 追问');
ok(R.run('bazhai', ent(1990, 1, 1, undefined, null), '八宅 1990').prompt, '八宅无性别 → 追问');
ok(R.run('wuge', ent(), '测名').prompt, '五格无姓名（「测名」为触发词）→ 追问');
ok(R.run('wuxing', ent(), '生克').prompt, '五行无具体行 → 追问');
ok(R.run('astro', ent(), '占星 看看').prompt, '占星无日期 → 追问');
// qimen 内容锁定：完整局 + 飞布锁定状态如实标注（不假报全锁）
var qOut = R.run('qimen', ent(1990, 8, 15, 14), '奇门遁甲 1990年8月15日 14时');
ok(qOut && qOut.text && qOut.text.indexOf('【奇门遁甲】') >= 0, '奇门有料出标题');
ok(qOut && qOut.text && qOut.text.indexOf('阴遁2局') >= 0, '奇门给出局数（阴遁2局·已手算核验）');
ok(qOut && qOut.text && qOut.text.indexOf('飞布几何') >= 0, '奇门标注飞布锁定状态（阴阳遁双盘已锁·拆补法无置闰，不假报）');
ok(R.run('qimen', ent(), '奇门 看看').prompt, '奇门无日期 → 追问');

if (fails === 0) { console.log('全部通过 ✓'); process.exit(0); } else { console.log(fails + ' 处失败'); process.exit(1); }
