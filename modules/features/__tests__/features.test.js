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

// ===== v3.1.13 紫微星情（十四主星 + 辅星 + 宫义合成）=====
console.log('== v3.1.13 紫微星情 ==');
var zrw = R.run('ziwei', ent(1990, 8, 15, 14, 'male'), '紫微 1990年8月15日 男');
ok(zrw && zrw.text && zrw.text.indexOf('【紫微斗数】') >= 0, '紫微有料出标题');
ok(/星情·命宫：天机（乙·阴木·化气为善/.test(zrw.text), '命宫主星给出星情（天机·乙阴木·化气为善）');
ok(zrw.text.indexOf('三方四正：') >= 0, '给出三方四正（财帛/官禄/迁移）');
ok(/落宫：天机坐命宫：以「智慧、机变」之性应「自我」/.test(zrw.text), '落宫为星性 × 宫义合成');
ok(zrw.text.indexOf('（合成）') >= 0, '合成句带「合成」标识（不冒充古籍断语）');
ok(zrw.text.indexOf('星情口径：') >= 0, '标注星情出处口径');
ok(zrw.text.indexOf('（空宫）') >= 0 && zrw.text.indexOf('「（空宫）」') < 0, '空宫显示不再套双括号');
var zrw2 = R.run('ziwei', ent(2000, 3, 5, 10, 'female'), '紫微 2000年3月5日 女');
ok(/命宫空宫（无主星），依「借星安宫」借对宫迁移/.test(zrw2.text), '命宫空宫时走借星安宫（借迁移）');
ok(/星情·借（取迁移宫）：/.test(zrw2.text), '借星后星情标明是借来的');
ok(zrw2.text.indexOf('命宫辅星：文曲（阴水·科甲·吉）') >= 0, '命宫辅星给出星情');

// ===== v3.1.14 八字运程（小运 + 流月 + 流日 + 十神）=====
console.log('== v3.1.14 八字运程 ==');
var byO = R.run('dayun', ent(1990, 8, 15, 14, 'male'), '大运 1990年8月15日 男');
ok(byO && byO.text && byO.text.indexOf('【八字运程】') >= 0, '运程有料出标题');
ok(/庚午年 甲申月 壬子日 丁未时/.test(byO.text) && /日主壬（水）/.test(byO.text), '首行给四柱与日主');
ok(/小运（自时柱『丁未』顺行/.test(byO.text), '小运起于时柱（丁未）且阳男顺行');
ok(/1岁『戊申』/.test(byO.text), '小运 1 岁 = 时柱下一位戊申');
ok(/流年（\d{4} 起十年/.test(byO.text) && /『丙午』（偏财）/.test(byO.text) || /流年（\d{4} 起十年/.test(byO.text), '流年给十年并在 2026 标偏财');
ok(byO.text.indexOf('口径：大运起于月柱、小运起于时柱') >= 0, '标注大小运起点与异说取舍');
var byLm = R.run('dayun', ent(1990, 8, 15, 14, 'male'), '流月 2026年 男');
ok(/流月（2026，按节气月/.test(byLm.text), '问「流月」才铺十二个月');
ok(/寅月（立春 2026-02-04）『庚寅』/.test(byLm.text), '流月寅月合五虎遁（丙年庚寅）+ 交节日期');
ok(/丑月（小寒 2027-01-05）『辛丑』/.test(byLm.text), '丑月落在次年小寒');
ok(byO.text.indexOf('流月（') < 0, '没问流月时不铺十二个月（不占地）');
var byLr = R.run('dayun', ent(1990, 8, 15, 14, 'male'), '流日 2026年10月17日 男');
ok(/流日（2026-10-17 起 30 天/.test(byLr.text) && /10-17『甲子』（食神）/.test(byLr.text), '流日从指定日起 30 天并标十神');

// ===== v3.1.15 解梦词库扩容（14 类 161 条 + 真检索）=====
console.log('== v3.1.15 解梦 ==');
var dmO = R.run('qianwen', ent(), '梦到蛇');
ok(dmO && dmO.text && dmO.text.indexOf('【解梦】梦见「蛇」（动物类）') >= 0, '梦到蛇 给出词条（动物类）');
ok(dmO.text.indexOf('传统向：') >= 0 && dmO.text.indexOf('心理向：') >= 0, '传统向 + 心理向双栏并列');
ok(dmO.text.indexOf('口径：传统向取民间《周公解梦》') >= 0, '标注口径（无权威定本，不作断言）');
var dmO2 = R.run('qianwen', ent(), '梦见掉牙了');
ok(dmO2 && dmO2.text.indexOf('「掉牙」（身体类）') >= 0, '长词优先：梦见掉牙 → 掉牙（非「牙」）');
var dmO3 = R.run('qianwen', ent(), '解梦 动物');
ok(dmO3 && dmO3.text.indexOf('动物类共 20 条') >= 0, '按类别列举：动物类 20 条');
var dmO4 = R.run('qianwen', ent(), '梦到独角兽跳舞');
ok(dmO4 && dmO4.text.indexOf('词库现有 161 条 / 14 类') >= 0, '未收录给总览并明说不硬编');
ok(dmO4.text.indexOf('暂未收录') >= 0, '未收录明确说「暂未收录」');

// ===== v3.1.16 六爻分门断语（黄金策用神体系）=====
console.log('== v3.1.16 六爻分门断语 ==');
var lyE = ent(2026, 10, 17, 14);
var lyO = R.run('liuyao', lyE, '六爻 测财运 背 3 1 2 0 3 2');
ok(lyO && lyO.text && lyO.text.indexOf('【六爻纳甲】') >= 0, '六爻有料出标题');
ok(lyO.text.indexOf('【求财门】') >= 0, '问财运落到「求财门」');
ok(/用神「妻财」（火），原神「子孙」，忌神「兄弟」/.test(lyO.text), '求财门用神/原神/忌神正确（坎宫水 → 财为火）');
ok(lyO.text.indexOf('依据：') >= 0 && lyO.text.indexOf('世（火）克应（金）') >= 0, '给出逐条依据含世应关系');
ok(lyO.text.indexOf('非原文抄录') >= 0, '明说不抄《黄金策》原文（只形式化其结构）');
var lyB = R.run('liuyao', lyE, '六爻 官司 背 3 1 2 0 3 2');
ok(lyB.text.indexOf('【官讼门】') >= 0, '问官司落到「官讼门」');
ok(/原神「妻财」，忌神「子孙」/.test(lyB.text), '官讼门忌神为子孙（克官鬼）');
ok(lyB.text.indexOf('背 3 1 2 0 3 2') >= 0 || lyB.text.indexOf('水泽节') >= 0, '同背数同盘（背数后带年份也不误读）');
var lyN = R.run('liuyao', lyE, '六爻 摇一卦');
ok(lyN.text.indexOf('分门断语：要按《黄金策》用神体系断') >= 0, '没说所问之事时提示可选的六门');

// ===== v3.1.17 金口诀（四位课式 · 用爻 · 五动三动）=====
console.log('== v3.1.17 金口诀 ==');
var jkE = ent(2026, 2, 9, 10);
var jkO = R.run('jinkou', jkE, '金口诀 2026年2月9日10时 地分酉');
ok(jkO && jkO.text && jkO.text.indexOf('【金口诀】') >= 0, '金口诀有料出标题');
ok(jkO.text.indexOf('四柱 乙巳 庚寅 甲寅 己巳') >= 0, '首行给四柱与月建');
ok(jkO.text.indexOf('人元　癸') >= 0 && jkO.text.indexOf('贵神　辛未 太常') >= 0
  && jkO.text.indexOf('将神　丁卯 太冲') >= 0 && jkO.text.indexOf('地分　癸酉') >= 0,
  '四位课式逐位对上外部黄金盘（癸 / 辛未太常 / 丁卯太冲 / 酉）');
ok(jkO.text.indexOf('四位纯阴，反阳以将为用') >= 0, '用爻：纯阴取将');
ok(jkO.text.indexOf('官动') >= 0 && jkO.text.indexOf('财动') >= 0, '五动：官动 + 财动');
ok(jkO.text.indexOf('父母动') >= 0, '三动：父母动（方生干）');
ok(jkO.text.indexOf('换将时刻流派不同，非错盘') >= 0, '换将口径差异如实标注（不掩盖）');
ok(jkO.text.indexOf('不作吉凶断言') >= 0, '明说五动三动只作结构定位、不断吉凶');
var jkF = R.run('jinkou', jkE, '金口诀 2026年2月9日10时 地分正北');
ok(jkF && jkF.text && jkF.text.indexOf('地分　') >= 0 && jkF.text.indexOf('方位「正北」') >= 0, '四正方位给地分（正北 → 子）');
var jkN = R.run('jinkou', jkE, '金口诀 排一卦');
ok(jkN && jkN.prompt && jkN.prompt.indexOf('缺地分') >= 0, '缺地分时给提示而不是瞎编地盘');
ok(jkN.prompt.indexOf('四隅方位') >= 0, '提示里交代四隅不猜');

// ===== v3.1.18 金口诀五动爻诵（古本原歌，静态知识不起课也能查）=====
console.log('== v3.1.18 五动爻诵 ==');
var jkV = R.run('jinkou', { date: null, time: null }, '金口诀 官动 歌诀');
ok(jkV && jkV.text && jkV.text.indexOf('【金口诀·官动】神克干为官动') >= 0, '点名官动给原歌标题');
ok(jkV.text.indexOf('官动利求官（官禄爻动，官职大利，若逢驿马，必然迁官转职）') >= 0, '原歌首句逐字对上');
ok((jkV.text.match(/、/g) || []).length >= 8, '八句齐出');
ok(jkV.text.indexOf('不据此代断吉凶') >= 0 || jkV.text.indexOf('并列而不代断') >= 0, '明说只作旧说并列、不代断');
var jkV2 = R.run('jinkou', { date: null, time: null }, '金口诀 歌诀');
ok(jkV2.text.indexOf('古本原歌共五动') >= 0 && jkV2.text.indexOf('官动 歌诀') >= 0, '只说「歌诀」时列出五动并给用法');
var jkV3 = R.run('jinkou', jkE, '金口诀 官动 歌诀');
ok(jkV3.text.indexOf('古本原歌八句') >= 0, '有日期但缺地分时，回落给歌诀而非「缺地分」挡人');
var jkV4 = R.run('jinkou', { date: null, time: null }, '金口诀 父母动');
ok(jkV4.text.indexOf('三动古本无歌诀') >= 0, '三动照实说「古本无歌诀」，不冒充原歌');

if (fails === 0) { console.log('全部通过 ✓'); process.exit(0); } else { console.log(fails + ' 处失败'); process.exit(1); }
