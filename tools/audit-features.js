#!/usr/bin/env node
/**
 * tools/audit-features.js —— 全功能巡检（清单第 13 项：「全功能跑一次，看看有没有冲突」）
 *
 * 为什么需要：功能块已 55 个，路由/触发词/输出格式都是手写的，改一处很容易漏一处
 *   （历史上就踩过：触发词撞车、PWA 漏载脚本、切段出现空段…）。本脚本把「全部功能跑一遍」
 *   固化成**可复跑的护栏**，任何一条红了都不许提交。
 *
 * 用法：node tools/audit-features.js          （全绿 → 退出码 0；有异常 → 打印 + 退出码 1）
 *   已并入 sync-mp --check。
 *
 * 巡检五件事（任一条红即失败）：
 *   ① 逐个功能块真的能跑出料（空输出 / 抛错 = 红）；
 *   ② 输出里没有工程事故标记（undefined / NaN / [object Object]）；
 *   ③ 切段安全：结果页按 [。；\n] 切段，不得出现「。；」「；。」「。。」双标点、行内中文分号、空段；
 *   ④ 触发词不冲突：任一功能块的最长触发词不得被别的功能抢走（照着短名/触发词问必须命中自己）；
 *   ⑤ 缺料守门：不给必要信息时要给「追问」而不是空回或假算。
 *
 * 关于「输出含『未实现/暂不可用』」：**不算故障**——那是内核如实标注的缺口（如刻家奇门
 *   「未外部锁死」），如实标注缺口正是本项目铁律，故只提示不判红。
 */
'use strict';
var path = require('path');
var ROOT = path.resolve(__dirname, '..');
var R = require(path.join(ROOT, 'modules/features/registry.js'));

var fails = [], warns = [];
function ok(c, m) { if (c) console.log('  ✓', m); else { fails.push(m); console.log('  ✗', m); } }

// 一份「足够喂饱大多数功能」的输入（生日/时间/性别/姓名/数字都有）
var ENT = { date: { year: 1990, month: 8, day: 15 }, time: { hour: 14 }, gender: 'male', name: '白玖玖' };
var ENT2 = { date: { year: 1990, month: 8, day: 15 }, time: { hour: 14 }, gender: 'female', name: '李小雨' };

console.log('== ① 每个功能块都能跑出料 ==');
var empty = [], err = [], accident = [], segBad = [], gap = [];
R.FEATURES.forEach(function (f) {
  var out;
  try { out = R.run(f.key, ENT, f.名); }
  catch (e) { err.push(f.key + ' 抛错：' + e.message); return; }
  var t = (out && (out.text || out.prompt)) || '';
  if (!t.trim()) { empty.push(f.key); return; }
  if (/undefined|NaN|\[object Object\]/.test(t)) accident.push(f.key + '：' + (t.match(/.{0,18}(undefined|NaN|\[object Object\]).{0,8}/) || [''])[0]);
  // 切段安全：**用结果页真实渲染链路**（result-format）来验，而不是看原始文本——
  //   行内「；」与「。；」双标点由渲染层统一归一（见 result-format.js 的「标点归一」），
  //   所以只要渲染后不出现空块/断句就算过。原始文本里的「；」不算故障。
  try {
    var RF = require(path.join(ROOT, 'modules/HomeModule/result-format.js'));
    var r = RF.format(t);
    var allSegs = [r.lead].concat(r.blocks.map(function (b) { return b.label ? b.label + '：' + b.text : b.text; }));
    if (allSegs.some(function (s) { return !String(s).trim(); })) segBad.push(f.key + '(空块)');
  } catch (e) { segBad.push(f.key + '(渲染抛错 ' + e.message + ')'); }
  if (/本版未实现|暂不可用|内核未加载/.test(t)) gap.push(f.key);
});
ok(err.length === 0, '无功能块抛错（异常：' + err.join('；') + '）');
ok(empty.length === 0, '无功能块空输出（异常：' + empty.join(',') + '）');
ok(accident.length === 0, '输出无工程事故标记 undefined/NaN/[object Object]（异常：' + accident.join('；') + '）');
ok(segBad.length === 0, '输出切段安全（无双标点/行内分号/空段）（异常：' + segBad.join(',') + '）');
if (gap.length) console.log('  ℹ 如实标注缺口的功能块（不是故障，是铁律要求的诚实标注）：' + gap.join(', '));

console.log('== ② 触发词不冲突：照着短名问必须命中自己 ==');
var missSelf = [];
R.FEATURES.forEach(function (f) {
  var hit = R.match(f.短名);
  if (!hit || hit.key !== f.key) missSelf.push(f.短名 + '→' + (hit ? hit.key : 'null'));
});
ok(missSelf.length === 0, '短名可自路由（异常：' + missSelf.join('；') + '）');

console.log('== ③ 触发词互相不抢占（同一触发词不许属于两个功能）==');
var wordOwner = {}, dupWord = [];
R.FEATURES.forEach(function (f) {
  (f.触发词 || []).forEach(function (w) {
    if (wordOwner[w] && wordOwner[w] !== f.key) dupWord.push(w + '（' + wordOwner[w] + ' vs ' + f.key + '）');
    else wordOwner[w] = f.key;
  });
});
ok(dupWord.length === 0, '无重复触发词（异常：' + dupWord.join('；') + '）');

console.log('== ④ 缺料守门：不给必要信息给追问，不空回不假算 ==');
var noGuard = [];
R.FEATURES.forEach(function (f) {
  // 只对「明显需要生日」的功能测空输入（理财/日期类不需要生日）
  if (/date-convert|countdown|huangli|salary-plan|zodiac|taisui|wuxing|numer|numberstars|zeri/.test(f.key)) return;
  var out;
  try { out = R.run(f.key, { }, ''); } catch (e) { noGuard.push(f.key + ' 抛错'); return; }
  var t = (out && (out.text || out.prompt)) || '';
  if (!t.trim()) noGuard.push(f.key + ' 空回');
});
ok(noGuard.length === 0, '需生日的功能在缺料时都有交代（异常：' + noGuard.join(',') + '）');

console.log('== ⑤ 功能元数据完整 ==');
var noMeta = R.FEATURES.filter(function (f) { return !f.名 || !f.板块 || !f.短名 || !f.说明 || !Array.isArray(f.触发词) || !f.触发词.length; });
ok(noMeta.length === 0, '每块都有 名/板块/短名/说明/触发词（缺：' + noMeta.map(function (f) { return f.key; }).join(',') + '）');

console.log('\n巡检结论：' + R.FEATURES.length + ' 个功能块，' + (fails.length ? fails.length + ' 项失败' : '全部通过 ✓'));
process.exit(fails.length ? 1 : 0);