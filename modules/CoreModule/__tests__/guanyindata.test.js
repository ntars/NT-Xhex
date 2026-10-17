/**
 * modules/CoreModule/__tests__/guanyindata.test.js —— 观音灵签 100 签签文校验
 *
 * 守的是「数据可信」而不只是「代码不崩」：
 *   ① 结构：100 条、字段齐全、签诗四句、每句 5–9 字；
 *   ② 宫位：十二宫齐全且合计 100；
 *   ③ 顺序：第 i 条的签号必须等于 i+1（顺序错了会串签，用户看不出来）；
 *   ④ 等级/吉凶归一自洽：吉凶必须与等级首字对得上；
 *   ⑤ 抽签确定性：同日同签、不同日期不能全都同签；
 *   ⑥ 搜索框真跑：按号 / 按名 / 中文数字签号都要答得出，且不能答成别的签；
 *   ⑦ 抽样对底本：第 1 / 2 / 100 签的签诗逐字核对；
 *   ⑧ 圣意体例：99 条为「项目：断语」，第 100 签原文即整句，单独放行。
 */
var G = require('../guanyin-data.js');
var QW = require('../qianwen.js');
var R = require('../../features/registry.js');

var fails = 0;
function ok(cond, label, extra) {
  if (cond) console.log('  ✓ ' + label);
  else { fails++; console.log('  ✗ ' + label + (extra ? '（' + extra + '）' : '')); }
}

// ============ ① 结构 ============
console.log('== ① 结构完整性 ==');
ok(G.count === 100 && G.LIST.length === 100, '共 100 签（实际 ' + G.LIST.length + '）');
var bad = [];
G.LIST.forEach(function (r) {
  if (!(r.length === 9)) { bad.push(r[0] + ':字段数'); return; }
  if (typeof r[0] !== 'number' || !r[1] || !r[2] || !r[3] || !r[4]) bad.push(r[0] + ':头部字段');
  if (!Array.isArray(r[5]) || r[5].length !== 4) bad.push(r[0] + ':签诗句数');
  else for (var i = 0; i < 4; i++) {
    var n = String(r[5][i]).length;
    if (n < 5 || n > 9) bad.push(r[0] + ':第' + (i + 1) + '句字数 ' + n);
  }
  if (!r[6] || !r[7] || !r[8]) bad.push(r[0] + ':意/解/圣缺');
});
ok(bad.length === 0, '字段齐全、签诗四句且每句 5–9 字', bad.join(' '));

// ============ ② 宫位 ============
console.log('== ② 十二宫分布 ==');
var HOUSES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
var houseCnt = {}, sum = 0;
G.LIST.forEach(function (r) {
  var h = String(r[4]).charAt(0);
  houseCnt[h] = (houseCnt[h] || 0) + 1;
  sum++;
});
var missHouse = HOUSES.filter(function (h) { return !houseCnt[h]; });
ok(sum === 100, '宫位合计 100（实际 ' + sum + '）');
ok(missHouse.length === 0, '十二宫无缺（缺：' + missHouse.join('、') + '）');

// ============ ③ 顺序 ============
console.log('== ③ 签号顺序 ==');
var seqBad = G.LIST.filter(function (r, i) { return r[0] !== i + 1; }).map(function (r) { return r[0]; });
ok(seqBad.length === 0, '第 i 条签号 = i+1（异常：' + seqBad.join(',') + '）');

// ============ ④ 等级 / 吉凶归一自洽 ============
console.log('== ④ 等级与吉凶三档 ==');
var lvBad = [];
G.LIST.forEach(function (r) {
  var want = '大上'.indexOf(String(r[2]).charAt(0)) >= 0 ? '吉' : (String(r[2]).charAt(0) === '中' ? '平' : '凶');
  if (r[3] !== want) lvBad.push(r[0] + ':' + r[2] + '≠' + r[3]);
  if (['吉', '平', '凶'].indexOf(r[3]) < 0) lvBad.push(r[0] + ':档位非法');
});
ok(lvBad.length === 0, '吉凶三档与等级首字一致', lvBad.join(' '));
var lvSet = {};
G.LIST.forEach(function (r) { lvSet[r[2]] = (lvSet[r[2]] || 0) + 1; });
ok(Object.keys(lvSet).length >= 5, '等级写法不少于 5 种（实际 ' + Object.keys(lvSet).join('/') + '）');

// ============ ⑤ 抽签确定性 ============
console.log('== ⑤ 抽签机制 ==');
var g1 = QW.guanyinDraw('2026-01-01'), g2 = QW.guanyinDraw('2026-01-01');
ok(g1.签号 === g2.签号, '同日期同签（' + g1.签号 + '）');
ok(g1.签号 >= 1 && g1.签号 <= 100, '签号落在 1–100');
ok(!!g1.签名 && !!g1.签诗 && g1.签诗.length === 4, '抽签能带出签名与四句签诗');
var seen = {};
['2026-01-01', '2026-02-14', '2026-05-20', '2026-08-08', '2026-12-31'].forEach(function (d) {
  seen[QW.guanyinDraw(d).签号] = 1;
});
ok(Object.keys(seen).length >= 2, '不同日期不会永远是同一签（5 个日期得到 ' + Object.keys(seen).length + ' 种）');

// ============ ⑥ 搜索框真跑 ============
console.log('== ⑥ 搜索框真跑 ==');
function run(q) { return R.run('qianwen', {}, q) || {}; }
var a = run('观音灵签 第11签');
ok(/第 11 签/.test(a.text || '') && /书荐姜维/.test(a.text || ''), '「第11签」答第 11 签「书荐姜维」');
ok(/共 100 签/.test(a.text || ''), '总签数已带出（不是 undefined）');
ok(/签诗：/.test(a.text || '') && /圣意：/.test(a.text || ''), '签诗 / 圣意齐全');
var b = run('灵签 第一百签');
ok(/第 100 签/.test(b.text || '') && /三教谈道/.test(b.text || ''), '中文数字「第一百签」能识别');
var c = run('观音 苏秦不第');
ok(/苏秦不第/.test(c.text || '') && /第 2 签/.test(c.text || ''), '按典故名查到第 2 签');
var d = run('观音灵签 第101签');
ok(/1–100/.test(d.prompt || ''), '越界签号给提示、不瞎猜');
var e = run('抽观音灵签');
ok(/第 \d{1,3} 签/.test(e.text || ''), '不指定则按日期抽签');

// ============ ⑦ 抽样对底本 ============
console.log('== ⑦ 抽样对底本 ==');
var t1 = G.byNo(1);
ok(t1.名 === '钟离成道', '第 1 签签名「钟离成道」（主源误作「锤离」，已按二源取正）');
ok(t1.诗[0] === '天开地辟结良缘' && t1.诗[1] === '日吉时良万事全', '第 1 签首二句对底本');
ok(t1.意.indexOf('盘古初开天地') >= 0, '第 1 签诗意对底本');
ok(G.byNo(2).诗[0] === '鲸鱼未化守江湖', '第 2 签首句对「版本一」系');
ok(G.byNo(100).诗[3] === '莫若守常且待时', '第 100 签末句对底本');
ok(G.byNo(84).名 === '庄子试妻', '第 84 签签名「庄子试妻」');

// ============ ⑧ 圣意体例 ============
console.log('== ⑧ 圣意体例 ==');
var pairBad = G.LIST.filter(function (r) { return r[0] !== 100 && String(r[8]).indexOf('：') < 0; }).map(function (r) { return r[0]; });
ok(pairBad.length === 0, '99 条圣意为「项目：断语」（异常：' + pairBad.join(',') + '）');
ok(/家宅：/.test(G.byNo(1).圣) && /山坟：/.test(G.byNo(1).圣), '第 1 签圣意含家宅…山坟');
ok(/满签/.test(G.byNo(100).圣) && String(G.byNo(100).圣).indexOf('：') < 0, '第 100 签保留原整句式');
var gloss = G.LIST.filter(function (r) { return /（|）/.test(String(r[8])); }).map(function (r) { return r[0]; });
ok(gloss.length === 0, '站点白话括注已清干净（残留：' + gloss.join(',') + '）');

// ============ ⑨ 取签边界 ============
console.log('== ⑨ 取签边界 ==');
ok(G.byNo(0) === null && G.byNo(101) === null && G.byNo(-1) === null, '越界返回 null');
ok(G.byNo('11').号 === 11, '字符串签号可用');
ok((G.byName('苏秦') || {}).号 === 2, '签名模糊查可用');
ok(G.byName('') === null && G.byName('不存在的签') === null, '空词 / 无匹配返回 null（不瞎猜）');

console.log(fails === 0 ? '\n全部通过' : '\n' + fails + ' 处失败');
process.exit(fails === 0 ? 0 : 1);
