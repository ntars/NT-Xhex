/**
 * 玄玖灵犀 NT-Xhex · 页面转场方向【回归测试】
 *
 * 为什么需要它：转场方向由 transition.js 的 DEPTH 层级比对得出，只要层级写错一格，
 * 就会出现「明明是返回、却播成前进」的动画。用户实测反馈过一条：
 * 从「关于我们」页左上角返回「关于」页时，播成了「起始页→关于」的前进动画。
 * 根因是 DEPTH 里 us 与 about 同为 1（同级）→ 深度相等 → 判成前进。
 *
 * 本测试把**全部真实导航边**列出来逐一断言方向，改 DEPTH 后跑一遍即可。
 * 用法：node tools/transition.test.js
 */
'use strict';

var path = require('path');
var T = require(path.join(__dirname, '..', 'modules', 'UIModule', 'transition.js'));

// [起点, 终点, 期望方向, 说明]（期望方向 = 用户按操作逻辑的心理预期）
var CASES = [
  ['home', 'result', false, '首页提交提问 → 结果页'],
  ['home', 'about', false, '首页点「关于」→ 关于页'],
  ['result', 'home', true, '结果页左上「‹」'],
  ['result', 'home', true, '结果页「再问一个」'],
  ['about', 'home', true, '关于页左上「‹」'],
  ['about', 'us', false, '关于页点「关于我们」卡'],
  ['about', 'detail', false, '关于页点「参考文献 / 功能介绍」'],
  ['us', 'about', true, '关于我们页左上「‹」  ← 用户报的那一条'],
  ['us', 'detail', false, '关于我们页点「星玖工作室 / 协议条款 / 开源声明」'],
  ['detail', 'about', true, '内容详情页「‹」回「关于」'],
  ['detail', 'us', true, '内容详情页「‹」回「关于我们」'],
  ['about', 'home', true, '关于页清除缓存后回落首页'],
  ['detail', 'home', true, '内容详情页直达首页（兜底，不该反向）']
];

var bad = 0;
console.log('===== 转场方向回归 =====');
CASES.forEach(function (c) {
  var from = c[0], to = c[1], wantBack = c[2], desc = c[3];
  var gotBack = T.isBack(from, to);
  var ok = gotBack === wantBack;
  if (!ok) bad++;
  console.log(
    (ok ? '  ✓' : '  ✗') + ' ' + (from + ' → ' + to).padEnd(18) +
    (gotBack ? '返回' : '前进') + '（期望 ' + (wantBack ? '返回' : '前进') + '）' +
    '  ' + T.dirClass(from, to).padEnd(11) + T.slideClass(from, to).padEnd(18) + desc
  );
});

// 层级自洽性：detail 必须比它的两个父页都深；us 必须比 about 深
var D = T.DEPTH;
var depthOk = D.detail > D.us && D.detail > D.about && D.us > D.about && D.about > D.home;
if (!depthOk) bad++;
console.log('\n  层级自洽 home(' + D.home + ') < about(' + D.about + ') < us(' + D.us + ') < detail(' + D.detail + ') = ' + depthOk);

console.log('\n' + (bad === 0 ? '通过: ' + CASES.length + ' / ' + CASES.length : '失败: ' + bad + ' 条'));
process.exit(bad ? 1 : 0);
