/**
 * modules/CoreModule/__tests__/jinkou.test.js —— 大六壬金口诀内核自测 v3.1.17
 * 覆盖：起课四步（地分/将神/贵神/人元）、外部黄金盘逐位核对、五动三动方向性、
 *       用爻五条规则（含独阳独阴兜底）、月将与六合互校、地分三种给法、旺相休囚死自洽、
 *       五行环 25 组生克、十二贵神本家支自洽。
 * 跑法：node modules/CoreModule/__tests__/jinkou.test.js
 *
 * ⚠ 本文件刻意「另算一遍」再与实现比对：将神用「逐格数」而非同一公式、
 *   贵人用口诀原文重排，避免自己验自己。
 */
var J = require('../jinkou.js');
var LR = require('../liuren.js');

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}
var ZHI = '子丑寅卯辰巳午未申酉戌亥';

console.log('A. 起课四步 · 外部黄金盘（爱占星算例：甲日·昼占·亥将·巳时·酉地分）');
// ① 立地分
ok('地分直给地支「地分酉」→ 酉', (J.diFenOf('金口诀 地分酉') || {}).支 === '酉');
// ② 将神：手工逐格数（亥加巳 → 巳上亥、午上子、未上丑、申上寅、酉上卯）
(function () {
  var 盘 = {}, start = ZHI.indexOf('巳');
  for (var i = 0; i < 12; i++) 盘[ZHI.charAt((start + i) % 12)] = ZHI.charAt((11 + i) % 12);
  ok('将神逐格数：巳上亥…酉上卯（与公式同值）', 盘['酉'] === '卯' && J.jiangShen('亥', '巳', '酉') === '卯',
    '逐格=' + 盘['酉'] + ' 公式=' + J.jiangShen('亥', '巳', '酉'));
})();
// ③ 贵神：甲日昼贵丑，顺布 → 丑贵 寅螣 卯朱 辰合 巳勾 午青 未空 申白 酉常
(function () {
  var seq = ['贵人', '螣蛇', '朱雀', '六合', '勾陈', '青龙', '天空', '白虎', '太常', '玄武', '太阴', '天后'];
  var manual = {};
  for (var i = 0; i < 12; i++) manual[ZHI.charAt((1 + i) % 12)] = seq[i];  // 丑起顺布
  var gs = J.guiShen('甲', '巳', '酉');
  ok('贵神逐格排：酉落太常（与实现同）', manual['酉'] === '太常' && gs.名 === '太常', manual['酉'] + '/' + gs.名);
  ok('贵神本家支 = 未（不是配干辛）', gs.支 === '未', gs.支);
  ok('贵人起点丑 · 昼占 · 顺布', gs.贵人 === '丑' && gs.昼夜 === '昼' && gs.顺逆 === '顺');
})();
// ④ 人元：甲日起甲子，酉位得癸；卯位丁；未位辛
ok('人元（甲日·酉位）＝癸', J.dunGan('甲', '酉') === '癸', J.dunGan('甲', '酉'));
ok('遁干（甲日·卯位）＝丁', J.dunGan('甲', '卯') === '丁', J.dunGan('甲', '卯'));
ok('遁干（甲日·未位）＝辛', J.dunGan('甲', '未') === '辛', J.dunGan('甲', '未'));

console.log('B. 端到端：2026-02-09 10时（甲寅日·寅月·巳时）+ 地分酉');
var r = J.cast({ y: 2026, m: 2, d: 9, h: 10, text: '金口诀 地分酉' });
ok('cast 不报错', !r.err, r.err);
ok('四柱 乙巳 庚寅 甲寅 己巳', r.四柱.年 === '乙巳' && r.四柱.月 === '庚寅' && r.四柱.日 === '甲寅' && r.四柱.时 === '己巳',
  JSON.stringify(r.四柱));
(function () {
  var by = {}; r.四位.forEach(function (x) { by[x.位] = x; });
  ok('四位：人元癸 / 贵神辛未 / 将神丁卯 / 地分癸酉',
    by.人元.干 === '癸' && by.贵神.干 + by.贵神.支 === '辛未' && by.将神.干 + by.将神.支 === '丁卯' && by.地分.干 + by.地分.支 === '癸酉',
    [by.人元.干, by.贵神.干 + by.贵神.支, by.将神.干 + by.将神.支, by.地分.干 + by.地分.支].join(' '));
  ok('贵神名太常、将神名太冲', by.贵神.神名 === '太常' && by.将神.将名 === '太冲');
  ok('月将 登明（亥）', r.月将.支 === '亥' && r.月将.名 === '登明');
  ok('四位纯阴 → 以将为用，取将神卯', r.用爻.序.indexOf('纯阴') >= 0 && r.用爻.爻.位 === '将神' && r.用爻.爻.支 === '卯',
    r.用爻.序 + '/' + r.用爻.爻.位);
  ok('五动 = 官动 + 财动（无妻/鬼/贼动）', r.五动.map(function (d) { return d.名; }).sort().join(',') === '官动,财动',
    r.五动.map(function (d) { return d.名; }).join(','));
  ok('三动 = 父母动（方生干：酉金生癸水）', r.三动.length === 1 && r.三动[0].名 === '父母动',
    r.三动.map(function (d) { return d.名; }).join(','));
})();

console.log('C. 五动三动 · 方向性（对调干方，父母/子孙必互换）');
(function () {
  function w(di, ren) {
    return [
      { 位: '地分', 支: 'x', 五行: di, 阴阳: '阴' },
      { 位: '将神', 支: 'y', 五行: '土', 阴阳: '阳' },
      { 位: '贵神', 支: 'z', 五行: '土', 阴阳: '阳' },
      { 位: '人元', 干: 'w', 五行: ren, 阴阳: '阳' }
    ];
  }
  var a = J.sanDong(w('金', '水')).map(function (d) { return d.名; }).join(',');
  var b = J.sanDong(w('水', '金')).map(function (d) { return d.名; }).join(',');
  ok('地分金生人元水 → 父母动', a === '父母动', a);
  ok('人元金生地分水 → 子孙动', b === '子孙动', b);
  ok('干方同五行 → 兄弟动', J.sanDong(w('木', '木')).map(function (d) { return d.名; }).join(',') === '兄弟动');
  // 五动各构造一例：每一例都刻意让其余三对「不成克」，确保只命中一个动
  // （干=人元、神=贵神、将=将神、方=地分；五动实为 4 个无向对：干-方、神-干、神-将、方-干）
  function wu(gan, shen, jiang, fang) {
    return [
      { 位: '地分', 支: 'x', 五行: fang, 阴阳: '阴' },
      { 位: '将神', 支: 'y', 五行: jiang, 阴阳: '阳' },
      { 位: '贵神', 支: 'z', 五行: shen, 阴阳: '阳' },
      { 位: '人元', 干: 'w', 五行: gan, 阴阳: '阳' }
    ];
  }
  var g = function (arr) { return J.wuDong(arr).map(function (d) { return d.名; }).join(','); };
  ok('干克方 → 妻动（木克土），其余三对不成克', g(wu('木', '火', '土', '土')) === '妻动', g(wu('木', '火', '土', '土')));
  ok('神克干 → 官动（土克水），其余三对不成克', g(wu('水', '土', '金', '木')) === '官动', g(wu('水', '土', '金', '木')));
  ok('神克将 → 贼动（土克水），其余三对不成克', g(wu('金', '土', '水', '土')) === '贼动', g(wu('金', '土', '水', '土')));
  ok('将克神 → 财动（水克火），其余三对不成克', g(wu('木', '火', '水', '水')) === '财动', g(wu('木', '火', '水', '水')));
  ok('方克干 → 鬼动（金克木），其余三对不成克', g(wu('木', '水', '木', '金')) === '鬼动', g(wu('木', '水', '木', '金')));
})();

console.log('D. 用爻五条规则（用爻只能在贵神与将神之间）');
(function () {
  function w(ganY, shenY, jiangY, fangY) {
    return [
      { 位: '地分', 支: 'x', 五行: '金', 阴阳: fangY },
      { 位: '将神', 支: 'y', 五行: '木', 阴阳: jiangY },
      { 位: '贵神', 支: 'z', 五行: '土', 阴阳: shenY },
      { 位: '人元', 干: 'w', 五行: '水', 阴阳: ganY }
    ];
  }
  var y1 = J.yongYao(w('阴', '阴', '阳', '阴'));   // 三阴一阳
  ok('三阴一阳 → 以阳为用（将神）', y1.序.indexOf('三阴一阳') >= 0 && y1.爻.位 === '将神');
  var y2 = J.yongYao(w('阳', '阳', '阴', '阳'));   // 三阳一阴
  ok('三阳一阴 → 以阴为用（将神）', y2.序.indexOf('三阳一阴') >= 0 && y2.爻.位 === '将神');
  var y3 = J.yongYao(w('阳', '阴', '阳', '阴'));   // 二阴二阳
  ok('二阴二阳 → 以将为用', y3.爻.位 === '将神');
  var y4 = J.yongYao(w('阴', '阴', '阴', '阴'));   // 纯阴
  ok('四位纯阴 → 反阳以将为用', y4.序.indexOf('纯阴') >= 0 && y4.爻.位 === '将神');
  var y5 = J.yongYao(w('阳', '阳', '阳', '阳'));   // 纯阳
  ok('四位纯阳 → 反阴以神为用', y5.序.indexOf('纯阳') >= 0 && y5.爻.位 === '贵神');
  var y6 = J.yongYao(w('阳', '阴', '阴', '阴'));   // 独阳在人元（不在神将）
  ok('独阳落人元（不在神将）→ 兜底取将神并标注', y6.爻.位 === '将神' && y6.兜底 === true, y6.序);
  var y7 = J.yongYao(w('阴', '阳', '阳', '阳'));   // 独阴在地分（不在神将）
  ok('独阴落地分（不在神将）→ 兜底取将神并标注', y7.爻.位 === '将神' && y7.兜底 === true, y7.序);
})();

console.log('E. 月将 · 月建六合与六壬中气月将互校');
(function () {
  // 六合(月建) 应与六壬 YUEJIANG 表「支」逐月对应：寅→亥、卯→戌、辰→酉、巳→申、午→未、未→午、申→巳、酉→辰、戌→卯、亥→寅、子→丑、丑→子
  var expect = { 寅: '亥', 卯: '戌', 辰: '酉', 巳: '申', 午: '未', 未: '午', 申: '巳', 酉: '辰', 戌: '卯', 亥: '寅', 子: '丑', 丑: '子' };
  var bad = Object.keys(expect).filter(function (k) { return J.LIUHE[k] !== expect[k]; });
  ok('十二个月建 → 月将（六合）全对', bad.length === 0, bad.join(','));
  var lrSet = {};
  LR.YUEJIANG.forEach(function (x) { lrSet[x[1]] = x[2]; });
  ok('六壬月将表 12 支齐全（与本内核逐支同名）', Object.keys(lrSet).length === 12
    && Object.keys(expect).every(function (k) { return !!J.JIANG_NAME[expect[k]]; }));
  // 交节后、中气前：金口诀已换将、大六壬未换 → 差异必须显形（不是错盘，是流派差）
  var a = J.cast({ y: 2026, m: 2, d: 9, h: 10, text: '地分酉' });    // 立春后、雨水前
  var b = J.cast({ y: 2026, m: 2, d: 25, h: 10, text: '地分酉' });   // 雨水后
  ok('立春后雨水前：金口诀亥将 vs 大六壬子将（差异显形）',
    a.月将.支 === '亥' && /子/.test(a.月将.六壬口径 || ''), a.月将.六壬口径);
  ok('雨水后：两者同为亥将', b.月将.支 === '亥' && /亥/.test(b.月将.六壬口径 || ''), b.月将.六壬口径);
})();

console.log('F. 地分三种给法（不猜四隅）');
ok('地支直给：地分午 → 午', (J.diFenOf('地分：午') || {}).支 === '午');
ok('四正方位：地分正北 → 子', (J.diFenOf('地分正北') || {}).支 === '子');
ok('四正方位：地分正西 → 酉', (J.diFenOf('地分正西') || {}).支 === '酉');
ok('报数：37 ÷12 余 1 → 子', (J.diFenOf('地分 37') || {}).支 === '子');
ok('报数：12 → 亥（余 0 作亥）', (J.diFenOf('地分 12') || {}).支 === '亥');
ok('报数：24 → 亥（余 0 作亥）', (J.diFenOf('地分 24') || {}).支 === '亥');
ok('报数：1 → 子', (J.diFenOf('地分 1') || {}).支 === '子');
ok('没给地分 → null（不瞎猜）', J.diFenOf('金口诀 排一卦') === null);
ok('四隅方位（东北）不猜 → null', J.diFenOf('地分东北') === null);
ok('cast 缺地分给「需」清单', (J.cast({ y: 2026, m: 2, d: 9, h: 10, text: '金口诀' }) || {}).需 instanceof Array);

console.log('G. 旺相休囚死（当令者旺、我生者相、生我者休、克我者囚、我克者死）');
(function () {
  var wx = '木火土金水';
  var bad = [];
  wx.split('').forEach(function (w) {
    var m = J.wangXiang(w);
    // 旺 = 当令；相 = 我生；休 = 生我；囚 = 克我；死 = 我克
    if (m.旺 !== w) bad.push(w + '.旺');
    if (m.相 !== J.wangXiang(w)['相']) bad.push(w + '.相');
    if (!J.sheng(w, m.相)) bad.push(w + '.相≠我生');
    if (!J.sheng(m.休, w)) bad.push(w + '.休≠生我');
    if (!J.ke(m.囚, w)) bad.push(w + '.囚≠克我');
    if (!J.ke(w, m.死)) bad.push(w + '.死≠我克');
  });
  ok('五态 5 个当令五行全自洽（25 条关系）', bad.length === 0, bad.join(','));
  ok('木当令：旺木 相火 休水 囚金 死土',
    JSON.stringify(J.wangXiang('木')) === JSON.stringify({ 旺: '木', 相: '火', 休: '水', 囚: '金', 死: '土' }));
  ok('stateOf(土, 木当令) = 死', J.stateOf('土', '木') === '死');
})();

console.log('H. 五行环（20 组无向对，每对恰好一种关系，不允许自生自克）');
(function () {
  var wx = '木火土金水', bad = [], cnt = { s: 0, k: 0 };
  wx.split('').forEach(function (a) {
    wx.split('').forEach(function (b) {
      if (a === b) {
        if (J.sheng(a, b) || J.ke(a, b)) bad.push(a + '自身生克');
        return;
      }
      // 任意两行必居「我生他 / 他生我 / 我克他 / 他克我」之一，且只居其一
      var n = (J.sheng(a, b) ? 1 : 0) + (J.sheng(b, a) ? 1 : 0) + (J.ke(a, b) ? 1 : 0) + (J.ke(b, a) ? 1 : 0);
      if (n !== 1) bad.push(a + '-' + b + ' 命中 ' + n + ' 种关系');
      if (J.sheng(a, b)) cnt.s++;
      if (J.ke(a, b)) cnt.k++;
    });
  });
  ok('任意两行恰好一种关系（生/被生/克/被克 四态取一）', bad.length === 0, bad.join(','));
  ok('有向相生 5 组 · 有向相克 5 组', cnt.s === 5 && cnt.k === 5, cnt.s + '/' + cnt.k);
})();

console.log('I. 十二贵神本家支（数据自洽）');
(function () {
  var names = Object.keys(J.GUI_BEN);
  ok('十二贵神齐备且与六壬天将序完全一致（不重不漏）',
    names.length === 12 && LR.TIAN_JIANG.every(function (n) { return J.GUI_BEN[n]; })
    && names.every(function (n) { return LR.TIAN_JIANG.indexOf(n) >= 0; }),
    names.join(','));
  var zhis = names.map(function (n) { return J.GUI_BEN[n]; });
  ok('十二本家支两两不同（恰好用满十二支）', new Set(zhis).size === 12 && zhis.every(function (z) { return ZHI.indexOf(z) >= 0; }), zhis.join(''));
  ok('贵神本家支：贵丑 螣巳 朱午 合卯 勾辰 青寅 空戌 白申 常未 玄子 阴酉 后亥',
    J.GUI_BEN.贵人 === '丑' && J.GUI_BEN.螣蛇 === '巳' && J.GUI_BEN.朱雀 === '午' && J.GUI_BEN.六合 === '卯'
    && J.GUI_BEN.勾陈 === '辰' && J.GUI_BEN.青龙 === '寅' && J.GUI_BEN.天空 === '戌' && J.GUI_BEN.白虎 === '申'
    && J.GUI_BEN.太常 === '未' && J.GUI_BEN.玄武 === '子' && J.GUI_BEN.太阴 === '酉' && J.GUI_BEN.天后 === '亥');
  // 五行按本家支取：太常未＝土（不是配干辛金）
  ok('贵神五行按本家支取（太常未=土，不按配干辛=金）', LR.ZHI_W[J.GUI_BEN.太常] === '土');
})();

console.log('J. 课内旺衰');
(function () {
  var wei = [
    { 位: '地分', 支: '酉', 五行: '金', 阴阳: '阴' },
    { 位: '将神', 支: '卯', 五行: '木', 阴阳: '阴' },
    { 位: '贵神', 支: '未', 五行: '土', 阴阳: '阴' },
    { 位: '人元', 干: '癸', 五行: '水', 阴阳: '阴' }
  ];
  var nw = J.neiWang(wei);
  ok('分值与明细条数一致', Object.keys(nw.分).length === 4 && Object.keys(nw.明细).length === 4);
  ok('最旺者必为分值最高者', nw.旺.every(function (k) { return nw.分[k] === Math.max.apply(null, [nw.分.地分, nw.分.将神, nw.分.贵神, nw.分.人元]); }));
  ok('黄金盘课内最旺＝地分（克将、得贵神生、一无所受克）', nw.旺.length === 1 && nw.旺[0] === '地分', nw.旺.join(','));
})();

console.log('K. 输出可切段（结果页按 [。；\\n] 切，不得出现双标点与空段）');
(function () {
  var r2 = J.cast({ y: 2026, m: 2, d: 9, h: 10, text: '地分酉' });
  var all = [r2.说明].concat(r2.缺口).join('');
  ok('内核说明与缺口文案不含中文分号（避免结果页切出空段）', all.indexOf('；') < 0);
  ok('说明里明写「不作吉凶断言」', /不作吉凶断言/.test(r2.说明));
  ok('缺口至少 4 项且逐项非空', r2.缺口.length >= 4 && r2.缺口.every(function (s) { return !!s; }));
})();

console.log('L. 五动爻诵（v3.1.18 收全原歌）');
(function () {
  var names = ['妻动', '官动', '贼动', '财动', '鬼动'];
  ok('五动齐备且与 DONG5 一一对应',
    Object.keys(J.DONG_VERSE).length === 5
    && names.every(function (n) { return J.DONG5.some(function (d) { return d.名 === n; }); }));
  ok('每动恰好八句', names.every(function (n) { return J.DONG_VERSE[n].length === 8; }),
    names.map(function (n) { return n + '=' + J.DONG_VERSE[n].length; }).join(' '));
  ok('每句都带古人自注（括号）', names.every(function (n) {
    return J.DONG_VERSE[n].every(function (s) { return /（.+）$/.test(s); });
  }));
  // 首句逐字核对（4 源共本）
  var first = { 妻动: '妻动于妻妾（占事主于妻妾）', 官动: '官动利求官（官禄爻动，官职大利，若逢驿马，必然迁官转职）' };
  ok('妻动首句原文无误', J.DONG_VERSE.妻动[0] === first.妻动, J.DONG_VERSE.妻动[0]);
  ok('官动首句原文无误', J.DONG_VERSE.官动[0] === first.官动, J.DONG_VERSE.官动[0]);
  ok('贼动/财动/鬼动首句各就位',
    J.DONG_VERSE.贼动[0].indexOf('贼动内贼生') === 0
    && J.DONG_VERSE.财动[0].indexOf('财动利求财') === 0
    && J.DONG_VERSE.鬼动[0].indexOf('鬼动忧灾怪') === 0);
  // OCR 劣本的错字一个都不许混进来（4 源共本才是正）
  var all = names.map(function (n) { return J.DONG_VERSE[n].join(''); }).join('');
  var 劣本错字 = ['访人人不见', '外分来索取', '舍得官中物', '架构奸私', '卦父终暗昧', '卑偷尊', '疫病物仰合'];
  ok('劣本 OCR 错字未混入（' + 劣本错字.length + ' 个一律不采）',
    劣本错字.every(function (w) { return all.indexOf(w) < 0; }),
    劣本错字.filter(function (w) { return all.indexOf(w) >= 0; }).join(','));
  ok('正字在位：访人人不悦 / 外边来索取 / 合得官中物 / 架媾 / 卦爻 / 卑逾尊',
    all.indexOf('访人人不悦') >= 0 && all.indexOf('外边来索取') >= 0 && all.indexOf('合得官中物') >= 0
    && all.indexOf('架媾奸私意') >= 0 && all.indexOf('卦爻终暗昧') >= 0 && all.indexOf('卑逾尊') >= 0);
  ok('verseOf 未收录返回 null（不瞎凑）', J.verseOf('父母动') === null && J.verseOf('乱动') === null);
  ok('verseOf 已收录返回 8 句', (J.verseOf('财动') || []).length === 8);
  ok('dongNamesIn 按文本取动名', J.dongNamesIn('问一下官动和财动').join(',') === '官动,财动',
    J.dongNamesIn('问一下官动和财动').join(','));
  ok('三动有散文义且注明源间不一', ['父母动', '子孙动', '兄弟动'].every(function (n) {
    return J.DONG3_NOTE[n] && J.DONG3_NOTE[n].indexOf('说') > 0;
  }));
  ok('三动不塞进 DONG_VERSE（古本无歌诀，不冒充）', !J.DONG_VERSE.父母动 && !J.DONG_VERSE.兄弟动);
})();

console.log('-----');
console.log('通过 ' + pass + ' 项，失败 ' + fail + ' 项');
process.exit(fail ? 1 : 0);
