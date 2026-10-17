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
  // v3.1.8 路由修正：裸「紫微」归紫微斗数（ziwei），紫微飞星另走「紫微飞星 / 飞星」（feixing）
  '紫微 2026': 'ziwei',
  '紫微飞星 2026': 'feixing',
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
  '阴遁 阳遁 定局 2024年8月15日': 'qimen',
  '大六壬 1990年8月15日 14时': 'liuren',
  '六壬 四课三传 1990年8月15日': 'liuren',
  '月将加占时 2024年8月15日': 'liuren',
  '太乙神数 2026': 'taiyi',
  '六爻 2026年8月15日': 'liuyao',
  '相位 1990年8月15日': 'astro-xiangwei',
  '推运 1990年8月15日 30岁': 'astro-tuiyun',
  '合盘 1990年8月15日': 'astro-hepan',
  '印占 1990年8月15日': 'astro-vedic',
  '阳宅 厨房在正南': 'yangzhai',
  '相术 面相': 'xiangshu',
  '观音灵签 抽签': 'qianwen',
  '测字 好': 'cezi',
  '拆字 财 财运': 'cezi',
  '雷诺曼 心': 'qianwen',
  '如尼 太阳': 'qianwen',
  '飞盘奇门 2026年8月15日 14时': 'qimen-fei',
  '飞宫法 2026年8月15日': 'qimen-fei'
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
  ['qimen', '奇门遁甲 1990年8月15日 14时', ent(1990, 8, 15, 14)],
  ['liuren', '大六壬 1990年8月15日 14时', ent(1990, 8, 15, 14)],
  ['taiyi', '太乙神数 2026', ent(2026)],
  ['liuyao', '六爻 2026年8月15日 14时', ent(2026, 8, 15, 14)],
  ['astro-xiangwei', '相位 1990年8月15日', ent(1990, 8, 15, 14)],
  ['astro-tuiyun', '推运 1990年8月15日 30岁', ent(1990, 8, 15, 14)],
  ['astro-vedic', '印占 1990年8月15日', ent(1990, 8, 15, 14)],
  ['yangzhai', '阳宅 厨房在正南 缺西北', ent()],
  ['xiangshu', '相术 面相', ent()],
  ['qianwen', '观音灵签 抽签', ent(2026, 8, 15)],
  ['cezi', '测字 好', ent()],
  ['cezi', '拆字 财 财运', ent()],
  ['qianwen', '雷诺曼 心', ent()],
  ['qianwen', '如尼 太阳', ent()],
  ['qianwen', '雷诺曼', ent()],
  ['qimen-fei', '飞盘奇门 2026年8月15日 14时', ent(2026, 8, 15, 14)]
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

// liuren 内容锁定：完整课 + 发用/三传 + 待黄金盘验证缺口如实标注（不假报已锁）
var lOut = R.run('liuren', ent(1990, 8, 15, 14), '大六壬 1990年8月15日 14时');
ok(lOut && lOut.text && lOut.text.indexOf('【大六壬】') >= 0, '大六壬有料出标题');
ok(lOut && lOut.text && lOut.text.indexOf('三传') >= 0, '大六壬给出发用与三传');
ok(lOut && lOut.text && lOut.text.indexOf('十二天将') >= 0, '大六壬给出十二天将（贵人昼夜+顺逆布将）');
ok(lOut && lOut.text && lOut.text.indexOf('旬空') >= 0 && lOut.text.indexOf('驿马') >= 0, '大六壬给出旬空与驿马');
ok(R.run('liuren', ent(), '六壬 看看').prompt, '大六壬无日期 → 追问');

// ===== v3.1.5 新增 9 块功能锁定（三式补全 + 新增内核）=====
console.log('== v3.1.5 新增 9 块（有料/缺料不崩、出标题）==');
var tO = R.run('taiyi', ent(2026), '太乙神数 2026');
ok(tO && tO.text && tO.text.indexOf('【太乙神数】') >= 0, '太乙神数有料出标题');
var lO = R.run('liuyao', ent(2026, 8, 15, 14), '六爻 2026年8月15日 14时');
ok(lO && lO.text && lO.text.indexOf('【六爻纳甲】') >= 0, '六爻纳甲有料出标题（本卦/变卦/六亲/六神）');
var axO = R.run('astro-xiangwei', ent(1990, 8, 15, 14), '相位 1990年8月15日');
ok(axO && axO.text && axO.text.indexOf('【占星·相位】') >= 0, '占星相位有料出标题');
var atO = R.run('astro-tuiyun', ent(1990, 8, 15, 14), '推运 1990年8月15日 30岁');
ok(atO && atO.text && atO.text.indexOf('【占星·推运】') >= 0, '占星推运有料出标题');
ok(R.run('astro-hepan', ent(1990, 8, 15, 14), '合盘 1990年8月15日').prompt, '占星合盘缺双人 → 追问');
var avO = R.run('astro-vedic', ent(1990, 8, 15, 14), '印占 1990年8月15日');
ok(avO && avO.text && avO.text.indexOf('【印占 Vedic】') >= 0, '印占有料出标题（岁差/Ayanamsa/二十七宿/Vimshottari）');
var yzO = R.run('yangzhai', ent(), '阳宅 厨房在正南 缺西北');
ok(yzO && yzO.text && yzO.text.indexOf('【阳宅风水】') >= 0, '阳宅风水有料出标题（厨厕/缺角/门对门/楼层）');
var xsO = R.run('xiangshu', ent(), '相术 面相');
ok(xsO && xsO.text && xsO.text.indexOf('【相术·') >= 0, '相术有料出标题（面相/手相/痣相/骨相）');
var qwO = R.run('qianwen', ent(2026, 8, 15), '观音灵签 抽签');
ok(qwO && qwO.text && qwO.text.indexOf('【观音灵签】') >= 0, '签文有料出标题（观音灵签 deterministic）');

// ===== v3.1.5 测字 C22（康熙笔画 + 数理五行 + 先天起卦）=====
console.log('== v3.1.5 测字 C22 ==');
var czO = R.run('cezi', ent(), '测字 好');
ok(czO && czO.text && czO.text.indexOf('【测字】') >= 0, '测字有料出标题');
ok(czO && czO.text && czO.text.indexOf('康熙口径') >= 0, '测字给康熙笔画（kangxi 单一真源）');
ok(czO && czO.text && czO.text.indexOf('先天卦') >= 0, '测字给先天八卦起卦（笔画%8）');
ok(czO && czO.text && czO.text.indexOf('数理五行') >= 0, '测字给数理五行（尾数）');
var czF = R.run('cezi', ent(), '测字 財');
ok(czF && czF.text && czF.text.indexOf('不臆造') >= 0, '测字缺字据实标注（繁体不在表内，不臆造）');
var czS = R.run('cezi', ent(), '拆字 财 财运');
ok(czS && czS.text && czS.text.indexOf('财运') >= 0, '测字识别所问事类并比对生克');
ok(R.run('cezi', ent(), '测字').prompt, '测字无具体字 → 追问');

// ===== v3.1.5 雷诺曼 36 + 如尼 24 =====
console.log('== v3.1.5 雷诺曼 / 如尼 ==');
var lnO = R.run('qianwen', ent(), '雷诺曼 心');
ok(lnO && lnO.text && lnO.text.indexOf('【雷诺曼】') >= 0, '雷诺曼有料出标题');
ok(lnO && lnO.text && lnO.text.indexOf('第 24 张') >= 0, '雷诺曼按牌名查到第24张「心」');
var lnAll = R.run('qianwen', ent(), '雷诺曼');
ok(lnAll && lnAll.text && lnAll.text.indexOf('共 36 张') >= 0, '雷诺曼概览出36张');
var rnO = R.run('qianwen', ent(), '如尼 太阳');
ok(rnO && rnO.text && rnO.text.indexOf('【如尼】') >= 0, '如尼有料出标题');
ok(rnO && rnO.text && rnO.text.indexOf('索维罗') >= 0, '如尼按关键词「太阳」命中 Sowilo');
var rnAll = R.run('qianwen', ent(), '如尼');
ok(rnAll && rnAll.text && rnAll.text.indexOf('共 24 符') >= 0, '如尼概览出24符');

// ===== v3.1.6 飞盘奇门 C23 =====
console.log('== v3.1.6 飞盘奇门（飞宫法）==');
var qfO = R.run('qimen-fei', ent(2026, 8, 15, 14), '飞盘奇门 2026年8月15日 14时');
ok(qfO && qfO.text && qfO.text.indexOf('【飞盘奇门·飞宫法】') >= 0, '飞盘奇门有料出标题');
ok(qfO && qfO.text && qfO.text.indexOf('九宫') >= 0, '飞盘给出九宫布局');
ok(qfO && qfO.text && qfO.text.indexOf('值符') >= 0 && qfO.text.indexOf('值使') >= 0, '飞盘给值符/值使');
ok(qfO && qfO.text && qfO.text.indexOf('黄金范例') >= 0, '飞盘标注飞布已按黄金范例锁死');
ok(R.run('qimen-fei', ent(), '飞盘奇门').prompt, '飞盘无日期 → 追问');

// ===== v3.1.12 择日·专项凶日展示（杨公忌/红沙/三娘煞/嫁娶周堂）=====
console.log('== v3.1.12 择日专项凶日展示 ==');
var zrO = R.run('zeri', ent(2026, 11, 1, null, '鸡'), '结婚择日 2026年11月1日起30天，属鸡');
ok(zrO && zrO.text && zrO.text.indexOf('【择日·黄道吉日】') >= 0, '择日有料出标题');
ok(/杨公忌：11月3日（农历九月廿五）/.test(zrO.text), '杨公忌名单给出公历 + 农历月日（九月廿五）');
ok(zrO.text.indexOf('红沙日：') >= 0, '红沙日名单在位');
ok(zrO.text.indexOf('三娘煞：') >= 0 && /主忌嫁娶/.test(zrO.text), '嫁娶事项列出三娘煞并注明主忌嫁娶');
ok(/嫁娶周堂：周堂杀在/.test(zrO.text), '嫁娶事项列出周堂杀七日');
var zrO2 = R.run('zeri', ent(2026, 11, 1), '开业择日 2026年11月1日起20天');
ok(/另注：三娘煞、嫁娶周堂只主嫁娶/.test(zrO2.text), '非嫁娶事项明说不拿三娘煞/周堂连累');
ok(zrO2.text.indexOf('三娘煞：') < 0, '非嫁娶事项不列三娘煞名单');
ok(zrO.text.indexOf('。；') < 0, '标注段无「。；」双标点（结果页按句号分句）');
ok(zrO.text.indexOf('黄道·黄道') < 0, '建除黄道档不再重复写「黄道·黄道」');

if (fails === 0) { console.log('全部通过 ✓'); process.exit(0); } else { console.log(fails + ' 处失败'); process.exit(1); }
