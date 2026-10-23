/**
 * modules/features/__tests__/features.test.js —— 扩展功能注册表验收
 * 用法：node modules/features/__tests__/features.test.js
 *
 * 锁：① 每个功能触发词都能 match；② run 不崩、缺料给 prompt、有料给 text。
 *
 * v3.2.0：项目按用户白名单裁剪为 8 大类（八字命理/紫微斗数/六爻纳甲/奇门遁甲/
 * 大六壬/梅花易数/风水堪舆/解梦灵签），并按用户要求保留黄历与万年历，
 * 共 5 大板块 30 个功能块；本测试的期望值同步对齐。
 */
var R = require('../registry.js');
var A = require('../../AnalyzerModule/analyzer.js');
var fails = 0;
function ok(c, m) { if (c) console.log('  ✓', m); else { fails++; console.log('  ✗', m); } }

function ent(y, mo, dy, h, g) { return { date: y ? { year: y, month: mo || 1, day: dy || 1 } : null, time: h != null ? { hour: h } : null, gender: g || null }; }

console.log('== 触发词路由（match）==');
var expectKey = {
  '白玖玖 2005年6月9日 排盘': 'bazi-chart',
  '大运 1990年8月1日': 'dayun',
  // v3.1.8 路由修正：裸「紫微」归紫微斗数（ziwei），紫微飞星另走「紫微飞星 / 飞星」（feixing）
  '紫微 2026': 'ziwei',
  '紫微飞星 2026': 'feixing',
  '八宅 命卦 1990': 'bazhai',
  '梅花 1990年8月1日': 'meihua',
  '紫微斗数 1990年8月15日 男': 'ziwei',
  '斗数 1990年8月15日': 'ziwei',
  '坐北 坐向': 'fengshui',
  '1990男 1992女 八等婚': 'fengshui',
  '九宫飞星 2026 月飞星': 'feixing',
  '奇门遁甲 1990年8月15日 14时': 'qimen',
  '值符 值使 1990年8月15日': 'qimen',
  '阴遁 阳遁 定局 2024年8月15日': 'qimen',
  '大六壬 1990年8月15日 14时': 'liuren',
  '六壬 四课三传 1990年8月15日': 'liuren',
  '月将加占时 2024年8月15日': 'liuren',
  '六爻 2026年8月15日': 'liuyao',
  '阳宅 厨房在正南': 'yangzhai',
  '观音灵签 抽签': 'qianwen',
  // 黄历 / 万年历 / 择日（按用户要求保留）
  '今日黄历': 'huangli',
  '查农历': 'date-convert',
  '公历换农历 2026年8月15日': 'date-convert',
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
  ['ziwei', '紫微斗数 1990年8月15日 14时 男', ent(1990, 8, 15, 14, 'male')],
  ['fengshui', '1990男 1992女 八等婚', ent()],
  ['fengshui', '坐北 坐向', ent()],
  ['feixing', '九宫飞星 2026年8月15日 月飞星', ent(2026, 8, 15, 14)],
  ['bazhai', '八宅 1990 男', ent(1990, 1, 1, undefined, 'male')],
  ['meihua', '梅花 1990年8月1日', ent(1990, 8, 1, 14)],
  ['qimen', '奇门遁甲 1990年8月15日 14时', ent(1990, 8, 15, 14)],
  ['qimen-ri', '日家奇门 2004年8月6日', ent(2004, 8, 6, 0)],
  ['qimen-ke', '刻家奇门 2026年2月9日10时24分', ent(2026, 2, 9, 10)],
  ['qimen-nianyue', '年家奇门 2026年', ent(2026, 6, 1, 0)],
  ['qimen-bj', '宝鉴日奇门 2026年8月15日', ent(2026, 8, 15, 14)],
  ['liuren', '大六壬 1990年8月15日 14时', ent(1990, 8, 15, 14)],
  ['liuyao', '六爻 2026年8月15日 14时', ent(2026, 8, 15, 14)],
  ['yangzhai', '阳宅 厨房在正南 缺西北', ent()],
  ['qianwen', '观音灵签 抽签', ent(2026, 8, 15)],
  ['huangli', '今日黄历', ent(2026, 10, 22)],
  ['date-convert', '查农历 2026年8月15日', ent(2026, 8, 15)],
  ['qimen-fei', '飞盘奇门 2026年8月15日 14时', ent(2026, 8, 15, 14)],
  ['bazi-pattern', '看格局 1990年8月15日 男', ent(1990, 8, 15, 14, 'male')],
  ['qimen-ge', '奇门格局 1990年8月15日', ent(1990, 8, 15, 14)],
  ['liuren-bifa', '毕法 1990年8月15日 14时', ent(1990, 8, 15, 14)],
  ['liuyao-wangshuai', '旺衰 2026年10月17日', ent(2026, 10, 17, 14)],
  ['ziwei-sihua', '四化 1990年8月15日 男', ent(1990, 8, 15, 14, 'male')],
  ['bazi-shensha', '八字神煞 1990年8月15日', ent(1990, 8, 15, 14)],
  ['bazi-hehun', '合婚 1990年8月15日 男', ent(1990, 8, 15, 14, 'male')]
];
have.forEach(function (c) {
  var out = R.run(c[0], c[2], c[1]);
  ok(out && out.text, c[0] + ' 有料 → ' + (out && out.text ? out.text.split('\n')[0].slice(0, 26) : '失败'));
});

console.log('== 缺料 run（返回 prompt，引导补全）==');
ok(R.run('bazhai', ent(1990, 1, 1, undefined, null), '八宅 1990').prompt, '八宅无性别 → 追问');
ok(R.run('ziwei', ent(1990, 8, 15, 14, null), '紫微 1990年8月15日').prompt, '紫微无性别 → 追问');

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

// ===== v3.1.24 六壬细分（天马/连茹/孤虚/应期）输出锁定 =====
ok(lOut.text.indexOf('天马') >= 0, '大六壬给出天马（驿马·三传带马判定）');
ok(lOut.text.indexOf('连茹') >= 0, '大六壬给出连茹（进/退连茹或「非连茹」）');
ok(lOut.text.indexOf('孤虚') >= 0 && lOut.text.indexOf('日孤') >= 0, '大六壬给出孤虚（日孤/日虚/月孤/月虚）');
ok(lOut.text.indexOf('成期') >= 0 && lOut.text.indexOf('散期') >= 0, '大六壬给出应期（成期=初传所合·散期=末传所冲）');
ok(R.match('天马 1990年8月15日').key === 'liuren', '「天马」路由到大六壬');
ok(R.match('连茹 1990年8月15日14时').key === 'liuren', '「连茹」路由到大六壬');

// ===== 六爻 / 阳宅 / 签文 =====
var lO = R.run('liuyao', ent(2026, 8, 15, 14), '六爻 2026年8月15日 14时');
ok(lO && lO.text && lO.text.indexOf('【六爻纳甲】') >= 0, '六爻纳甲有料出标题（本卦/变卦/六亲/六神）');
var yzO = R.run('yangzhai', ent(), '阳宅 厨房在正南 缺西北');
ok(yzO && yzO.text && yzO.text.indexOf('【阳宅风水】') >= 0, '阳宅风水有料出标题（厨厕/缺角/门对门/楼层）');
var qwO = R.run('qianwen', ent(2026, 8, 15), '观音灵签 抽签');
ok(qwO && qwO.text && qwO.text.indexOf('【观音灵签】') >= 0, '签文有料出标题（观音灵签 deterministic）');

// ===== v3.1.6 飞盘奇门 C23 =====
console.log('== 飞盘奇门（飞宫法）==');
var qfO = R.run('qimen-fei', ent(2026, 8, 15, 14), '飞盘奇门 2026年8月15日 14时');
ok(qfO && qfO.text && qfO.text.indexOf('【飞盘奇门·飞宫法】') >= 0, '飞盘奇门有料出标题');
ok(qfO && qfO.text && qfO.text.indexOf('九宫') >= 0, '飞盘给出九宫布局');
ok(qfO && qfO.text && qfO.text.indexOf('值符') >= 0 && qfO.text.indexOf('值使') >= 0, '飞盘给值符/值使');
ok(qfO && qfO.text && qfO.text.indexOf('黄金范例') >= 0, '飞盘标注飞布已按黄金范例锁死');
ok(R.run('qimen-fei', ent(), '飞盘奇门').prompt, '飞盘无日期 → 追问');

// ===== v3.1.13 紫微星情（十四主星 + 辅星 + 宫义合成）=====
console.log('== 紫微星情 ==');
var zrw = R.run('ziwei', ent(1990, 8, 15, 14, 'male'), '紫微 1990年8月15日 男');
ok(zrw && zrw.text && zrw.text.indexOf('【紫微斗数】') >= 0, '紫微有料出标题');
ok(/星情·命宫：天机（乙·阴木·化气为善/.test(zrw.text), '命宫主星给出星情（天机·乙阴木·化气为善）');
ok(zrw.text.indexOf('三方四正：') >= 0, '给出三方四正（财帛/官禄/迁移）');
// v3.1.46：紫微「解」升级为**断语库**（ziwei-duanyu：古籍要点+白话），
//   机械合成降级为兜底。原三条断言随之升级——测试应盯住新口径而不是旧措辞。
ok(/落宫断语：/.test(zrw.text), '落宫改出「落宫断语」行（不再只是机械合成）');
ok(zrw.text.indexOf('（推演）') >= 0 || zrw.text.indexOf('（古籍）') >= 0,
  '断语句末标「推演 / 古籍」来源，不冒充古籍原文');
ok(zrw.text.indexOf('断语口径：') >= 0, '标注断语出处与边界口径');
ok(zrw.text.indexOf('（空宫）') >= 0 && zrw.text.indexOf('「（空宫）」') < 0, '空宫显示不再套双括号');
var zrw2 = R.run('ziwei', ent(2000, 3, 5, 10, 'female'), '紫微 2000年3月5日 女');
ok(/命宫空宫（无主星），依「借星安宫」借对宫迁移/.test(zrw2.text), '命宫空宫时走借星安宫（借迁移）');
ok(/星情·借（取迁移宫）：/.test(zrw2.text), '借星后星情标明是借来的');
ok(zrw2.text.indexOf('命宫辅星：文曲（阴水·科甲·吉）') >= 0, '命宫辅星给出星情');

// ===== v3.1.14 八字运程（小运 + 流月 + 流日 + 十神）=====
console.log('== 八字运程 ==');
var byO = R.run('dayun', ent(1990, 8, 15, 14, 'male'), '大运 1990年8月15日 男');
ok(byO && byO.text && byO.text.indexOf('【八字运程】') >= 0, '运程有料出标题');
ok(/庚午年 甲申月 壬子日 丁未时/.test(byO.text) && /日主壬（水）/.test(byO.text), '首行给四柱与日主');
ok(/小运（自时柱『丁未』顺行/.test(byO.text), '小运起于时柱（丁未）且阳男顺行');
ok(/1岁『戊申』/.test(byO.text), '小运 1 岁 = 时柱下一位戊申');
ok(byO.text.indexOf('流年（') >= 0, '流年给十年');
ok(byO.text.indexOf('口径：大运起于月柱、小运起于时柱') >= 0, '标注大小运起点与异说取舍');
var byLm = R.run('dayun', ent(1990, 8, 15, 14, 'male'), '流月 2026年 男');
ok(/流月（2026，按节气月/.test(byLm.text), '问「流月」才铺十二个月');
ok(/寅月（立春 2026-02-04）『庚寅』/.test(byLm.text), '流月寅月合五虎遁（丙年庚寅）+ 交节日期');
ok(/丑月（小寒 2027-01-05）『辛丑』/.test(byLm.text), '丑月落在次年小寒');
ok(byO.text.indexOf('流月（') < 0, '没问流月时不铺十二个月（不占地）');
var byLr = R.run('dayun', ent(1990, 8, 15, 14, 'male'), '流日 2026年10月17日 男');
ok(/流日（2026-10-17 起 30 天/.test(byLr.text) && /10-17『甲子』（食神）/.test(byLr.text), '流日从指定日起 30 天并标十神');

// ===== v3.1.15 解梦词库扩容（多类 + 真检索）=====
console.log('== 解梦 ==');
var dmO = R.run('qianwen', ent(), '梦到蛇');
ok(dmO && dmO.text && dmO.text.indexOf('【解梦】梦见「蛇」（动物类）') >= 0, '梦到蛇 给出词条（动物类）');
ok(dmO.text.indexOf('传统向：') >= 0 && dmO.text.indexOf('心理向：') >= 0, '传统向 + 心理向双栏并列');
ok(dmO.text.indexOf('口径：传统向取民间《周公解梦》') >= 0, '标注口径（无权威定本，不作断言）');
var dmO2 = R.run('qianwen', ent(), '梦见掉牙了');
ok(dmO2 && dmO2.text.indexOf('「掉牙」（身体类）') >= 0, '长词优先：梦见掉牙 → 掉牙（非「牙」）');
var dmO3 = R.run('qianwen', ent(), '解梦 动物');
ok(/动物类共 \d+ 条/.test(dmO3.text), '按类别列举：动物类条数与词库一致');
var dmO4 = R.run('qianwen', ent(), '梦到独角兽跳舞');
ok(/词库现有 \d+ 条 \/ \d+ 类/.test(dmO4.text), '未收录给总览并明说不硬编');
ok(dmO4.text.indexOf('暂未收录') >= 0, '未收录明确说「暂未收录」');

// ===== v3.1.16 六爻分门断语（黄金策用神体系）=====
console.log('== 六爻分门断语 ==');
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

// ===== v3.1.20 日家奇门（六十日一局 · 值符随日干 · 值使按日干位次）=====
console.log('== 日家奇门 ==');
// 路由：不能落到时家块（时家块的触发词已去掉「日家奇门」，日家必须自成一块）
var qrM = R.match('日家奇门 2004年8月6日');
ok(qrM && qrM.key === 'qimen-ri', '「日家奇门」路由到日家块，不被时家抢走');
var qrE = ent(2004, 8, 6, 0);
var qrO = R.run('qimen-ri', qrE, '日家奇门 2004年8月6日');
ok(qrO && qrO.text && qrO.text.indexOf('【日家奇门】') >= 0, '日家有料出标题');
ok(qrO.text.indexOf('阴遁上元9局') >= 0, '黄金盘基准：2004-08-06 丁巳日 = 阴遁上元九局（易德轩例）');
ok(qrO.text.indexOf('值符随日干') >= 0 && qrO.text.indexOf('值使随日干位次') >= 0, '把两条日家专属锚点写明白');
ok(qrO.text.indexOf('甲子日数元') >= 0 && qrO.text.indexOf('节气分元') >= 0, '定元两派并列输出（不替用户选）');
ok(qrO.text.indexOf('六十日一局') >= 0, '点明日家的「六十日一局」节奏，与时家时辰起局区分');
ok(qrO.text.indexOf('不能互相顶替') >= 0, '明说日家/时家不是同一张盘');
// 分歧日必须真的报警，而非只在文档里写「有分歧」
var qrD = R.run('qimen-ri', ent(2026, 4, 20, 0), '日家奇门 2026年4月20日');
ok(qrD.text.indexOf('两派本日局数不同') >= 0, '两派局数真不同时给出分歧提示（2026-04-20：4局 vs 7局）');
// 口径可切换
var qrQ = R.run('qimen-ri', ent(2026, 4, 20, 0), '日家奇门 2026年4月20日 节气分元');
ok(qrQ.text.indexOf('（节气分元）') >= 0, '说「节气分元」即切换口径');
// 时家块被问日家时要指路，不能默认当时家排
var qrW = R.run('qimen', ent(2026, 2, 9, 10), '日家奇门 2026年2月9日');
ok(qrW.text.indexOf('另有一套内核') >= 0 && qrW.text.indexOf('日家奇门 2026年2月9日') >= 0,
  '时家块被问日家时指路到日家内核（并给出可直接复制的说法）');
// 年家/月家现已实现，时家块被问到时同样要指路（不再说「未实现」）
var qrY = R.run('qimen', ent(2026, 2, 9, 10), '年家奇门 2026年2月9日');
ok(qrY.text.indexOf('另有一套内核') >= 0, '年家现已实现：时家块被问年家时指路，不说「未实现」');
// 缺日期
var qrN = R.run('qimen-ri', { date: null, time: null }, '日家奇门');
ok(qrN && qrN.prompt && qrN.prompt.indexOf('日家奇门需要日期') >= 0, '缺日期给提示');
// 切段安全：结果页按 [。；\n] 切段，正文不得出现中文分号与「。；」双标点
ok(qrO.text.indexOf('；') < 0, '日家输出无中文分号（切段安全）');
ok(qrO.text.indexOf('。。') < 0 && qrD.text.indexOf('。。') < 0, '无重复句号（缺口拼接不叠加）');

// ===== v3.1.21 刻家奇门（十二分钟一刻 · 时家局内推 · 每刻移一宫）=====
console.log('== 刻家奇门 ==');
var qkM = R.match('刻家奇门 2026年2月9日10时24分');
ok(qkM && qkM.key === 'qimen-ke', '「刻家奇门」路由到刻家块，不被时家抢走');
var qkE = ent(2026, 2, 9, 10); qkE.time.minute = 24;
var qkO = R.run('qimen-ke', qkE, '刻家奇门 2026年2月9日10时24分');
ok(qkO && qkO.text && qkO.text.indexOf('【刻家奇门】') >= 0, '刻家有料出标题');
ok(qkO.text.indexOf('十二分钟为一刻') >= 0, '点明刻长与刻数');
ok(qkO.text.indexOf('刻') >= 0 && qkO.text.indexOf('辛未') >= 0, '10:24 落在刻序内并给日干支');
ok(qkO.text.indexOf('本时辰十刻一览') >= 0, '给出十刻一览');
ok((qkO.text.match(/刻/g) || []).length >= 10, '一览含十刻');
ok(qkO.text.indexOf('与时家的区别') >= 0, '明说刻家/时家不是同一张盘');
ok(qkO.text.indexOf('缺口') >= 0 && qkO.text.indexOf('实质单源') >= 0, '缺口如实标注（实质单源）');
ok(qkO.text.indexOf('未外部锁死') >= 0, '明说飞布未外部锁死，不假报已锁');
ok(qkO.text.indexOf('；') < 0, '刻家输出无中文分号（切段安全）');
// 时家块被问刻家要指路
var qkW = R.run('qimen', ent(2026, 2, 9, 10), '刻家奇门 2026年2月9日10时24分');
ok(qkW.text.indexOf('另有一套内核') >= 0 && qkW.text.indexOf('刻家奇门 2026') >= 0, '时家块被问刻家时指路到刻家内核');
// 缺时刻
var qkN = R.run('qimen-ke', { date: null, time: null }, '刻家奇门');
ok(qkN && qkN.prompt && qkN.prompt.indexOf('刻家奇门需要') >= 0, '缺日期给提示');

// ===== v3.1.22 年家 / 月家奇门（全阴遁 · 三元 1/4/7 · 值符随干）=====
console.log('== 年家/月家奇门 ==');
var qnM = R.match('年家奇门 2026年');
ok(qnM && qnM.key === 'qimen-nianyue', '「年家奇门」路由到年家月家块，不被时家抢走');
var qyM = R.match('月家奇门 2026年2月');
ok(qyM && qyM.key === 'qimen-nianyue', '「月家奇门」路由到年家月家块');
var qnE = ent(2026, 6, 1, 0);
var qnO = R.run('qimen-nianyue', qnE, '年家奇门 2026年');
ok(qnO && qnO.text && qnO.text.indexOf('【年家奇门】') >= 0, '年家有料出标题');
ok(qnO.text.indexOf('全用阴遁') >= 0 && qnO.text.indexOf('1、4、7 局') >= 0, '点明全阴遁与三元局数 1/4/7');
ok(qnO.text.indexOf('年柱 丙午') >= 0, '给出年柱');
ok(qnO.text.indexOf('值符随年干') >= 0 && qnO.text.indexOf('值使随年支') >= 0, '给出值符随干/值使随支两条规则');
ok(qnO.text.indexOf('八神一律逆排') >= 0, '点明八神一律逆排');
ok(qnO.text.indexOf('✅已核') >= 0, '缺口如实标注（v3.1.58 起：年家取得完整外部算例，标 ✅已核；八门伏吟派分歧仍并列）');
ok(qnO.text.indexOf('；') < 0, '年家输出无中文分号（切段安全）');
// 月家
var qyE = ent(2026, 2, 15, 0);
var qyO = R.run('qimen-nianyue', qyE, '月家奇门 2026年2月');
ok(qyO.text.indexOf('【月家奇门】') >= 0 && qyO.text.indexOf('月柱 庚寅') >= 0, '月家出标题并给月柱');
ok(qyO.text.indexOf('值符随月干') >= 0 && qyO.text.indexOf('值使随月支') >= 0, '月家值符随月干/值使随月支');
ok(qyO.text.indexOf('四孟') >= 0, '月家缺口提及另一派（年支四孟定元）');
ok(qyO.text.indexOf('；') < 0, '月家输出无中文分号');
// 时家块被问年家/月家要指路
var qnW = R.run('qimen', ent(2026, 6, 1, 10), '年家奇门 2026年');
ok(qnW.text.indexOf('另有一套内核') >= 0 && qnW.text.indexOf('年家奇门 2026') >= 0, '时家块被问年家时指路到年家内核');
ok(qnW.text.indexOf('本版未实现') < 0, '时家块不再说年家「未实现」（已实现）');
// 缺日期
var qnN = R.run('qimen-nianyue', { date: null, time: null }, '年家奇门');
ok(qnN && qnN.prompt && qnN.prompt.indexOf('需要日期') >= 0, '缺日期给提示');

// ===== v3.1.23 多命中路由（一个输入依次调用多个算法，按常用性排序并列输出）=====
console.log('== 多命中路由 ==');
ok(typeof R.matchAll === 'function', '导出 matchAll（多命中）');
var ma = R.matchAll('1990年8月15日14时 八字 紫微 神煞');
ok(ma.length === 3, '三个触发词命中三个功能');
ok(ma.map(function (x) { return x.key; }).join(',') === 'bazi-chart,ziwei,bazi-shensha', '按常用性排序（八字→紫微→神煞）');
// 去从属：更长的具体触发词胜出，被包含者剔除
ok(R.matchAll('紫微飞星').map(function (x) { return x.key; }).join(',') === 'feixing', '「紫微飞星」只命中飞星，不被「紫微」抢');
ok(R.matchAll('八字神煞').map(function (x) { return x.key; }).join(',') === 'bazi-shensha', '「八字神煞」只命中神煞，不被「八字」抢');
// v3.2.0 数字八字：「数字八字」4 字触发词长于「八字」2 字，最长优先 → 路由 name-shuzi
ok(R.matchAll('日家奇门').map(function (x) { return x.key; }).join(',') === 'qimen-ri', '「日家奇门」只命中日家，不被「奇门」抢');
// 通用动作词保护：「奇门遁甲排盘」不该再带出八字排盘
ok(R.matchAll('奇门遁甲排盘').map(function (x) { return x.key; }).join(',') === 'qimen', '通用动作词「排盘」不额外带出功能');
// 端到端：多算法并列输出，各带可辨识标题
var multi = A.analyze('1990年8月15日14时 八字 紫微 神煞');
var mt = multi.split('\n').filter(function (l) { return l.indexOf('【') === 0; });
ok(mt.length === 3, '多命中时结果页有三条独立标题');
ok(multi.indexOf('；') < 0 && !/\n\s*\n/.test(multi), '多算法输出无中文分号、无空段（切段安全）');
// 单命中行为不变（与旧版一致）
var single = A.analyze('奇门遁甲 1990年8月15日 14时');
ok(single.indexOf('【奇门遁甲】') === 0, '单命中仍只出一个结果（行为不变）');

if (fails === 0) { console.log('全部通过 ✓'); process.exit(0); } else { console.log(fails + ' 处失败'); process.exit(1); }
