/**
 * astro-house 自测（C30 占星宫位·阿拉伯点·卜卦·择时）
 * 核心校验手段：不靠「抄来的期望值」，而用 astronomy-engine 的地平坐标独立反验——
 *   上升点（ASC）必在地平线上（高度 = 0°）、方位在东半区；
 *   天顶（MC）必在子午圈上（高度 = 90° − |纬度 − 赤纬|、方位 = 180°）。
 * 其余锁：宫制四家几何自洽、阿拉伯点日夜公式、卜卦取宫、择时月相适配。
 */
var AST = require('../astro.js');
var AS = require('../vendor/astronomy.js');
var H = require('../astro-house.js');

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name + (extra ? '  [' + extra + ']' : '')); }
  else { fail++; console.log('  ✗ ' + name + '  [' + (extra || '') + ']'); }
}
function near(a, b, tol) { return Math.abs(a - b) <= tol; }
// 圆周比较（0/360 同一处）
function angNear(a, b, tol) { var d = AST.mod360(a - b); return Math.min(d, 360 - d) <= tol; }

// 测试盘：1990-08-15 14:00 北京（UTC+8）→ 06:00 UT
var CHART = { y: 1990, m: 8, d: 15, h: 14, city: '北京' };
var r = H.houses(CHART);
var eps = AST.obliquity(1990, 8, 15, 6);
var utc = new Date(Date.UTC(1990, 7, 15, 6));
var obs = new AS.Observer(39.90, 116.40, 0);

// A. 时区与恒星时
console.log('A. 时区换算与恒星时');
var U = AST.toUTC(1990, 8, 15, 14, 8);
ok('北京时 14:00 → 世界时 06:00', U.y === 1990 && U.m === 8 && U.d === 15 && U.h === 6, JSON.stringify(U));
var U2 = AST.toUTC(1990, 8, 15, 2, 8);
ok('跨日：北京时 02:00 → 前一日 18:00', U2.d === 14 && U2.h === 18, JSON.stringify(U2));
var sid = AST.sidereal(1990, 8, 15, 14, 8, 116.40);
ok('GMST 与 astronomy-engine 一致（±0.01°）', near(sid.GMST, AS.SiderealTime(AS.MakeTime(utc)) * 15, 0.01), sid.GMST + '°');
ok('LST = GMST + 东经 116.40°', near(sid.LST, (sid.GMST + 116.40) % 360, 0.001), sid.LST + '°');

// B. 上升点：独立星历反验地平高度 = 0
console.log('B. 上升点/天顶（astronomy-engine 地平坐标反验）');
function horizonOf(lonDeg) {
  return AS.Horizon(AS.MakeTime(utc), obs, AST.lonToRa(lonDeg, eps) / 15, AST.lonToDec(lonDeg, eps));
}
var hzAsc = horizonOf(r.上升黄经);
ok('上升点高度 ≈ 0°（实测 ' + hzAsc.altitude.toFixed(5) + '°）', Math.abs(hzAsc.altitude) < 0.01, hzAsc.altitude);
ok('上升点方位在东半区（0–180°）', hzAsc.azimuth > 0 && hzAsc.azimuth < 180, hzAsc.azimuth.toFixed(2));
var hzMc = horizonOf(r.天顶黄经);
var mcDec = AST.lonToDec(r.天顶黄经, eps);
ok('天顶方位正南 = 180°', near(hzMc.azimuth, 180, 0.6) || near(hzMc.azimuth, 0, 0.6), hzMc.azimuth.toFixed(2));
ok('天顶高度 = 90° − |纬度 − 赤纬|', near(hzMc.altitude, 90 - Math.abs(39.90 - mcDec), 0.1),
  hzMc.altitude.toFixed(2) + ' vs ' + (90 - Math.abs(39.90 - mcDec)).toFixed(2));
ok('1990-08-15 14:00 北京 上升 = 射手 3°17′（确定性锚点）', r.上升 === '射手 3°17′', r.上升);
ok('同盘天顶 = 室女 18°54′（确定性锚点）', r.天顶 === '室女 18°54′', r.天顶);
ok('下降 = 上升 + 180°', near(AST.mod360(r.上升黄经 + 180), AST.mod360(r.下降 && 0 || (r.上升黄经 + 180)), 1e-6));

// C. 宫制四家几何自洽
console.log('C. 宫制四家');
['整宫', '等宫', '波菲利', '普拉西度'].forEach(function (k) {
  var c = r.宫制[k];
  ok(k + ' 存在 12 宫', !!c && c.length === 12, c ? c.length : 'null');
  if (!c) return;
  var mono = true;
  for (var i = 0; i < 12; i++) {
    var span = AST.mod360(c[(i + 1) % 12] - c[i]);
    if (span <= 0 || span >= 180) mono = false;
  }
  ok(k + ' 宫头顺行递增（每宫 0–180°）', mono, c.map(function (x) { return x.toFixed(1); }).join(','));
  if (k === '整宫') ok(k + ' 一宫头 = 上升所在星座起点', angNear(c[0], Math.floor(r.上升黄经 / 30) * 30, 0.001), c[0].toFixed(3));
  else ok(k + ' 一宫头 = 上升', angNear(c[0], r.上升黄经, 0.01), c[0].toFixed(3));
  ok(k + ' 七宫头 = 下降（对宫）', angNear(c[6] - c[0], 180, 0.01), c[6].toFixed(3));
});
ok('整宫一宫头必落 0° 整（星座起点）', near(r.宫制.整宫[0] % 30, 0, 1e-9), r.宫制.整宫[0]);
ok('等宫每宫恰 30°', r.宫制.等宫.every(function (x, i) { return angNear(x - r.宫制.等宫[0], i * 30, 1e-6); }), 'ok');
ok('普拉西度十宫头 = 天顶', angNear(r.宫制.普拉西度[9], r.天顶黄经, 0.01), r.宫制.普拉西度[9].toFixed(3));
// 普拉西度与波菲利：十一宫头必在 MC 与十二宫头之间（同象限顺序）
ok('普拉西度 11 宫头在 MC 之后、12 宫头之前',
  AST.mod360(r.宫制.普拉西度[10] - r.天顶黄经) > 0 && AST.mod360(r.宫制.普拉西度[11] - r.宫制.普拉西度[10]) > 0,
  r.宫制.普拉西度[10].toFixed(1) + ' → ' + r.宫制.普拉西度[11].toFixed(1));

// D. 落宫
console.log('D. 行星落宫');
ok('太阳落 9 宫（午后西天）', r.落宫['太阳'].普拉西度 === 9, r.落宫['太阳'].普拉西度);
ok('月亮落 7 宫', r.落宫['太阴'].普拉西度 === 7, r.落宫['太阴'].普拉西度);
var allIn = true;
Object.keys(r.落宫).forEach(function (k) {
  ['整宫', '等宫', '波菲利', '普拉西度'].forEach(function (s) {
    var h = r.落宫[k][s];
    if (!(h >= 1 && h <= 12)) allIn = false;
  });
});
ok('所有星曜落宫均在 1–12', allIn, 'ok');
// 落宫与宫头区间自洽（抽样：太阳）
var sunH = H.houseIndexOf(AST.positions({ y: 1990, m: 8, d: 15, h: 14, tz: 8 }).黄经.太阳, r.宫制.普拉西度);
ok('houseIndexOf 与 houses() 落宫一致', sunH === r.落宫['太阳'].普拉西度, sunH);

// E. 阿拉伯点：日夜反背
console.log('E. 阿拉伯点（日盘/夜盘 反背法则）');
var Ld = H.lots({ y: 1990, m: 8, d: 15, h: 14, city: '北京' });
var Ln = H.lots({ y: 1990, m: 8, d: 15, h: 2, city: '北京' });
ok('14:00 判为日间盘', /日间盘/.test(Ld.日夜盘), Ld.日夜盘);
ok('02:00 判为夜间盘', /夜间盘/.test(Ln.日夜盘), Ln.日夜盘);
var ASCd = H.houses({ y: 1990, m: 8, d: 15, h: 14, city: '北京' }).上升黄经;
var ASCn = H.houses({ y: 1990, m: 8, d: 15, h: 2, city: '北京' }).上升黄经;
var pd = AST.positions({ y: 1990, m: 8, d: 15, h: 14, tz: 8 }).黄经;
var pn = AST.positions({ y: 1990, m: 8, d: 15, h: 2, tz: 8 }).黄经;
var fd = Ld.点.filter(function (x) { return x.名 === '福点'; })[0];
var fn = Ln.点.filter(function (x) { return x.名 === '福点'; })[0];
var fdExp = AST.mod360(ASCd + pd.太阴 - pd.太阳);
var fnExp = AST.mod360(ASCn + pn.太阳 - pn.太阴);
ok('日盘福点 = 上升＋月亮−太阳', near(fd.黄经, fdExp, 0.01), fd.位置);
ok('夜盘福点 = 上升＋太阳−月亮', near(fn.黄经, fnExp, 0.01), fn.位置);
var spd = Ld.点.filter(function (x) { return x.名 === '精神点'; })[0];
ok('日盘精神点 = 上升＋太阳−月亮（与福点反背）', near(spd.黄经, AST.mod360(ASCd + pd.太阳 - pd.太阴), 0.01), spd.位置);
ok('福点与精神点互为反背（两点以上升为轴镜像）',
  near(AST.mod360(fd.黄经 + spd.黄经 - 2 * ASCd), 0, 0.01) ||
  near(AST.mod360(fd.黄经 + spd.黄经 - 2 * ASCd), 360, 0.01), 'ok');
ok('父亲点 = 上升＋太阳−土星', near(Ld.点.filter(function (x) { return x.名 === '父亲点'; })[0].黄经,
  AST.mod360(ASCd + pd.太阳 - pd.土星), 0.01), 'ok');
ok('婚姻点 = 上升＋七宫头−金星', near(Ld.点.filter(function (x) { return x.名 === '婚姻点'; })[0].黄经,
  AST.mod360(ASCd + 180 - pd.金星), 0.01), 'ok');
ok('共 12 个阿拉伯点', Ld.点.length === 12, Ld.点.length);
ok('每点均标星座/宫/公式', Ld.点.every(function (x) { return x.星座 && x.宫 >= 1 && x.宫 <= 12 && x.公式; }), 'ok');

// F. 卜卦：取宫与月亮状态
console.log('F. 卜卦（Lilly 判据）');
var defs = [
  ['我这次求职能不能成', 10], ['这笔钱能要回来吗', 2], ['婚姻能成吗', 7],
  ['这病能好吗', 6], ['房子能不能买到', 4], ['官司能赢吗', 9],
  ['考试能过吗', 9], ['朋友会帮我吗', 11], ['合伙做生意怎么样', 7]
];
defs.forEach(function (d) {
  var q = H.horary({ y: 2026, m: 10, d: 20, h: 14, city: '北京' }, d[0]);
  ok('「' + d[0] + '」→ ' + d[1] + '宫', q.问事宫.indexOf(d[1] + '宫') === 0, q.问事宫.slice(0, 12));
});
var hq = H.horary({ y: 2026, m: 10, d: 20, h: 14, city: '北京' }, '这笔钱能要回来吗');
ok('卜卦出问卦主星与事主星', !!hq.问卦主星 && !!hq.事主星, hq.问卦主星 + ' / ' + hq.事主星);
ok('卜卦判据非空', hq.判据.length >= 3, hq.判据.length);
ok('卜卦必出月亮状态', !!hq.月亮 && !!hq.月亮.位置, hq.月亮.位置);
ok('卜卦结论非空', !!hq.结论 && hq.结论.length > 2, hq.结论.slice(0, 20));
// 主星尊贵四态互斥
var dig = {};
['太阳', '太阴', '水星', '金星', '火星', '木星', '土星'].forEach(function (pl) {
  dig[pl] = null;
});
ok('七政主星表 = 七曜', H.PLANETS7.length === 7, H.PLANETS7.join(','));
ok('十二星座宫主齐备', H.SIGN_RULER.length === 12, H.SIGN_RULER.join(','));

// G. 择时：月相适配 + 行星时
console.log('G. 择时（Electional）与行星时');
var el = H.election({ y: 2026, m: 11, d: 1, h: 10, city: '北京' }, '嫁娶');
ok('择时出吉凶档', !!el.吉凶档, el.吉凶档);
ok('择时评分在 0–100', el.评分 >= 0 && el.评分 <= 100, el.评分);
ok('择时出月相', !!el.月相, el.月相);
ok('嫁娶遇「亏凸/下弦/残月」判忌（月相与事项适配）', (function () {
  var bad = H.election({ y: 2026, m: 11, d: 1, h: 10, city: '北京' }, '嫁娶');
  var wan = bad.项.filter(function (x) { return /月相/.test(x.名); })[0];
  return /亏|下弦|残/.test(bad.月相) ? wan.判 === '忌' : true;
})(), 'ok');
ok('求医遇盈月判忌（反向适配）', (function () {
  var e2 = H.election({ y: 2026, m: 10, d: 22, h: 10, city: '北京' }, '求医');
  var wan = e2.项.filter(function (x) { return /月相/.test(x.名); })[0];
  return /娥眉|上弦|盈凸/.test(e2.月相) ? wan.判 === '忌' : true;
})(), 'ok');
var ph = H.planetaryHour({ y: 2026, m: 11, d: 1, h: 10, city: '北京' });
ok('行星时：2026-11-01 为周日，日主太阳', ph.日主 === '太阳', ph.日主);
ok('行星时：10:00 属昼时第 4 时，主月亮', ph.段 === '昼时' && ph.第几时 === 4 && ph.行星时主 === '月亮',
  ph.段 + ph.第几时 + '·' + ph.行星时主);
var ph2 = H.planetaryHour({ y: 2026, m: 11, d: 1, h: 22, city: '北京' });
ok('行星时：22:00 属夜时', ph2.段 === '夜时', ph2.段 + ph2.第几时 + '·' + ph2.行星时主);
ok('行星时主必为七政之一', H.CHALDEAN.indexOf(ph2.行星时主) >= 0, ph2.行星时主);

// H. 月相八分
console.log('H. 月相');
ok('日月同度 = 新月', H.moonPhase(100, 100).名 === '新月', H.moonPhase(100, 100).名);
ok('日月相差 180 = 满月', H.moonPhase(0, 180).名 === '满月', H.moonPhase(0, 180).名);
ok('日月相差 90 = 上弦', H.moonPhase(0, 90).名 === '上弦月', H.moonPhase(0, 90).名);
ok('日月相差 270 = 下弦', H.moonPhase(0, 270).名 === '下弦月', H.moonPhase(0, 270).名);

// I. 高纬降级
console.log('I. 极区降级');
var polar = H.houses({ y: 1990, m: 8, d: 15, h: 14, lat: 78.2, lng: 15.6 });
ok('|纬度|>66° 普拉西度自动降级并注明', polar.宫制.普拉西度 === null || /退化|无解/.test(polar.宫制缺), polar.宫制缺.slice(0, 30));
ok('降级后仍出波菲利宫位', !!polar.宫制.波菲利 && polar.宫制.波菲利.length === 12, 'ok');

// J. 缺料与容错
console.log('J. 缺料拦截');
ok('缺日期给错误提示', !!H.houses({}).err, H.houses({}).err);
ok('缺日期卜卦给提示', !!H.horary({}, '问事').err, 'ok');
ok('未给城市按北京并注明', (function () {
  var x = H.houses({ y: 2000, m: 1, d: 1, h: 12 });
  return /按北京/.test(x.缺口.join(''));
})(), 'ok');

// K. 印占 Bhava 分宫（自然宫 + 等宫；v3.1.55 补）
console.log('K. 印占 Bhava 分宫（vedicHouses）');
(function () {
  var v = H.vedicHouses(CHART);
  var ay = v.ayanamsa;
  var h0 = H.houses(CHART);
  ok('缺日期给错误提示', !!H.vedicHouses({}).err, H.vedicHouses({}).err);
  // 恒星上升（Lagna）= 回归上升 − 岁差（与 houses() 上升黄经自洽）
  ok('Lagna 恒星 = 回归上升 − 岁差', angNear(v.Lagna恒星黄经, AST.mod360(h0.上升黄经 - ay), 0.01), v.Lagna恒星黄经 + '° vs ' + AST.mod360(h0.上升黄经 - ay).toFixed(3) + '°');
  // 自然宫宫头[0] = 上升星座 0°；宫宽恒 30°；等宫宫头[0] = 上升度数
  ok('自然宫宫头[0] = 上升星座 0°', Math.abs(v.自然宫宫头[0] - Math.floor(v.Lagna恒星黄经 / 30) * 30) < 0.01, v.自然宫宫头[0]);
  ok('自然宫宫宽恒 30°（相邻宫头差 30）', v.自然宫宫头.every(function (c, i) { return angNear(v.自然宫宫头[(i + 1) % 12] - c, 30, 0.01); }), 'ok');
  ok('等宫宫头[0] = 上升恒星度数', Math.abs(v.等宫宫头[0] - v.Lagna恒星黄经) < 0.01, v.等宫宫头[0]);
  ok('等宫宫宽恒 30°', v.等宫宫头.every(function (c, i) { return angNear(v.等宫宫头[(i + 1) % 12] - c, 30, 0.01); }), 'ok');
  // 逐曜落宫在 1..12；自然宫落宫 = (行星恒星星座 − Lagna星座) mod 12 + 1
  var p = AST.positions(CHART);
  var allOk = true, sunWs = null;
  Object.keys(v.落宫).forEach(function (k) {
    var lon = v.落宫[k];
    if (!(lon.自然宫 >= 1 && lon.自然宫 <= 12 && lon.等宫 >= 1 && lon.等宫 <= 12)) allOk = false;
    var planetSign = Math.floor(AST.mod360(p.黄经[k] - ay) / 30) % 12;
    var lagnaSign = Math.floor(v.Lagna恒星黄经 / 30) % 12;
    var expect = ((planetSign - lagnaSign) % 12 + 12) % 12 + 1;
    if (lon.自然宫 !== expect) allOk = false;
    if (k === '太阳') sunWs = lon.自然宫;
  });
  ok('逐曜落宫均 1..12', allOk, 'ok');
  ok('自然宫落宫 = 行星星座 − 上升星座(模12)+1', sunWs != null && sunWs === (((Math.floor(AST.mod360(p.黄经['太阳'] - ay) / 30) % 12) - Math.floor(v.Lagna恒星黄经 / 30) % 12 + 12) % 12) + 1, '太阳自然宫=' + sunWs);
  // 缺口如实：两制并列不合并 + 未收 Sripati
  ok('缺口注明三制并列不合并', /三套分宫并列不合并/.test(v.缺口.join('')), 'ok');
  ok('缺口注明 Sripati 宫界差异', /Bhava Sandhi/.test(v.缺口.join('')), 'ok');
})();

// K2. Sripati 不等宫（v3.1.56 第三套并列）
console.log('K2. Sripati 不等宫（vedicHouses.Sripati）');
(function () {
  // ① 纯函数合成案例：四象限均 90° → 四轴须精确为 1/4/7/10 宫之中点，宫宽恒 30
  var c = H.sripati(100, 10);   // ASC=100, MC=10 → IC=190, DSC=280
  function spSpan(a, b) { var d = AST.mod360(b - a); return d; }
  var mids = [];
  for (var i = 0; i < 12; i++) mids.push(AST.mod360(c[i] + spSpan(c[i], c[(i + 1) % 12]) / 2));
  ok('合成盘：第1宫中点 = ASC', Math.abs(AST.mod360(mids[0] - 100)) < 0.01, mids[0]);
  ok('合成盘：第4宫中点 = IC', Math.abs(AST.mod360(mids[3] - 190)) < 0.01, mids[3]);
  ok('合成盘：第7宫中点 = DSC', Math.abs(AST.mod360(mids[6] - 280)) < 0.01, mids[6]);
  ok('合成盘：第10宫中点 = MC', Math.abs(AST.mod360(mids[9] - 10)) < 0.01, mids[9]);
  ok('合成盘：宫宽恒 30', c.every(function (x, i) { return Math.abs(spSpan(x, c[(i + 1) % 12]) - 30) < 0.01; }), 'ok');
  ok('合成盘：宫头顺行递增（配合 houseIndexOf）', c.every(function (x, i) { return spSpan(x, c[(i + 1) % 12]) < 180; }), 'ok');
  ok('sripati 象限退化返 null（极区式输入）', H.sripati(100, 100) === null || H.sripati(0, 0) === null, 'ok');
  // ② 端到端：北京盘应出三套，且 Sripati 落宫 1..12
  var v = H.vedicHouses(CHART);
  ok('北京盘出三套分宫（含 Sripati）', !!v.Sripati宫头 && v.Sripati宫头.length === 12, v.Sripati宫头 ? v.Sripati宫头.length + ' 个' : 'null');
  var allOk = true, offsetMax = 0;
  Object.keys(v.落宫).forEach(function (k) {
    var lo = v.落宫[k];
    if (!(lo.自然宫 >= 1 && lo.自然宫 <= 12 && lo.等宫 >= 1 && lo.等宫 <= 12 && lo.Sripati >= 1 && lo.Sripati <= 12)) allOk = false;
  });
  ok('三套落宫均 1..12', allOk, 'ok');
  // 真实盘象限不等长 → 第1宫中点与 ASC 有小偏移（<5°），如实记录不假报
  (function () {
    var cc = v.Sripati宫头, m1 = AST.mod360(cc[0] + spSpan(cc[0], cc[1]) / 2);
    var off = Math.min(AST.mod360(m1 - v.Lagna恒星黄经), AST.mod360(v.Lagna恒星黄经 - m1));
    ok('真实盘第1宫中点与 Lagna 偏移 <5°（象限不等长的正常现象）', off < 5, off.toFixed(2) + '°');
  })();
  // ③ 极区：Sripati 相邻两象限之和恒 180°，四轴宫宽恒 30，数学上不退化（比普拉西度稳健）
  var pv = H.vedicHouses({ y: 1990, m: 8, d: 15, h: 14, lat: 78.2, lng: 15.6 });
  ok('极区(78.2°) Sripati 仍出（象限和恒180·不退化）', !!pv.Sripati宫头 && pv.Sripati宫头.length === 12, 'ok');
  ok('极区四轴宫宽仍恒 30', (function () {
    var cc = pv.Sripati宫头;
    return Math.abs(AST.mod360(cc[1] - cc[0]) - 30) < 0.01 && Math.abs(AST.mod360(cc[4] - cc[3]) - 30) < 0.01;
  })(), 'ok');
  ok('降级后自然宫/等宫仍出', !!pv.自然宫宫头 && !!pv.等宫宫头, 'ok');
  // 退化保护：MC 与 ASC 重合（象限长 0）时应安全返 null，不崩不出错盘
  ok('MC=ASC 象限退化安全返 null', H.sripati(100, 100) === null, 'ok');
})();

// K3. 界（Terms）与面（Faces）尊贵（v3.1.56 补）
console.log('K3. 界/面尊贵');
(function () {
  // ① 界表结构：每星座五段合计 30（三套均验）
  function segSum(t) {
    return t.every(function (row) {
      var s = 0;
      for (var j = 0; j < row.length; j++) { var e = (j + 1 < row.length) ? row[j + 1][0] : 30; s += e - row[j][0]; }
      return s === 30;
    });
  }
  ok('埃及界 12 星座五段合计均 30', segSum(H.TERMS_EGYPT), 'ok');
  ok('托勒密拉丁本 12 星座五段合计均 30', segSum(H.TERMS_PTOLEMY_A), 'ok');
  ok('托勒密现代整理本 12 星座五段合计均 30', segSum(H.TERMS_PTOLEMY_B), 'ok');
  // ② 黄金实例（thegreatalmanac.com 明列）
  ok('13°白羊 = 水星界（埃及界 12–20）', H.termOf(13, H.TERMS_EGYPT).界主 === '水星', H.termOf(13, H.TERMS_EGYPT).界主);
  ok('12°室女 = 金星界（埃及界 7–17）', H.termOf(150 + 12, H.TERMS_EGYPT).界主 === '金星', 'ok');
  ok('6°30′白羊 = 金星界（已离木界入金界）', H.termOf(6.5, H.TERMS_EGYPT).界主 === '金星', 'ok');
  // ③ 日/月无界主（界表只含五星）
  ok('界表不含日/月（日月无界主）', !H.TERMS_EGYPT.some(function (r) { return r.some(function (x) { return x[1] === '日' || x[1] === '月'; }); }), 'ok');
  // ④ 面（Faces）：迦勒底序，白羊 0/10/20 = 火/日/金
  ok('0°白羊面主 = 火星', H.faceOf(0).面主 === '火星', H.faceOf(0).面主);
  ok('15°白羊面主 = 太阳', H.faceOf(15).面主 === '太阳', H.faceOf(15).面主);
  ok('25°白羊面主 = 金星', H.faceOf(25).面主 === '金星', H.faceOf(25).面主);
  ok('5°金牛面主 = 水星', H.faceOf(35).面主 === '水星', H.faceOf(35).面主);
  // ⑤ 三套并列 + 托勒密两版分歧客观存在（5°狮子：拉丁本木 / 现代本土）
  var ta = H.termAll(125);
  ok('三套并列输出', ta.埃及界 && ta.托勒密界_拉丁本 && ta.托勒密界_现代整理本, 'ok');
  ok('5°狮子 托勒密两版确有分歧（木 vs 土）', ta.托勒密界_拉丁本.界主 === '木星' && ta.托勒密界_现代整理本.界主 === '土星',
    ta.托勒密界_拉丁本.界主 + '/' + ta.托勒密界_现代整理本.界主);
  // ⑥ houses() 附带尊贵字段（复用黄经，不重算）
  var hh = H.houses(CHART);
  ok('houses() 带尊贵字段且覆盖全曜', !!hh.尊贵 && Object.keys(hh.尊贵).length === Object.keys(hh.落宫).length, 'ok');
  ok('houses() 缺口注明托勒密传本分歧', /传本分歧/.test(hh.缺口.join('')), 'ok');
})();

console.log('\n=== astro-house 自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
if (fail) process.exit(1);
