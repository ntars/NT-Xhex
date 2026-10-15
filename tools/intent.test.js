// 玄玖灵犀 NT-Xhex · 意图解析回归测试（单一真源 modules/AnalyzerModule/intent.js）
// 运行：node tools/intent.test.js   （示例统一用白玖玖：女 / 2005年6月9日子时）
var path = require('path');
var INTENT = require(path.join(__dirname, '..', 'modules', 'AnalyzerModule', 'intent.js'));

var pass = 0, fail = 0, fails = [];
function t(input, expectIntent, expectConf) {
  var r = INTENT.parse(input);
  var ok = r.intent === expectIntent && (!expectConf || r.confidence === expectConf);
  if (ok) pass++;
  else { fail++; fails.push({ in: input, exp: expectIntent + '/' + (expectConf || '-'), got: r.intent + '/' + r.confidence }); }
}

// ---- 八字标准格式（完整：姓名 + 性别 + 日期 + 时间）----
[
  '白玖玖 女 2005-06-09 00:01',
  '白玖玖，女，2005年6月9日子时',
  '白玖玖 女 2005/06/09 00:01',
  '白玖玖 女 2005.06.09 00:01',
  '女 白玖玖 2005-06-09 00:01',
  '白玖玖 坤造 2005年6月9日未时',
  '白玖玖 女 20050609 00:01'
].forEach(function (s) { t(s, 'bazi', 'high'); });

// ---- 黄历宜忌 ----
['今天适合做什么', '明天能搬家吗', '后天结婚好不好', '帮我查一下今天宜忌', '今天黄历', '6月9']
  .forEach(function (s) { t(s, 'almanac'); });

// ---- 节气/干支 ----
['明天什么干支', '下一个立春是哪天', '冬至是几号'].forEach(function (s) { t(s, 'calendar', 'high'); });

// ---- 姓名学 ----
['帮我看看白玖玖这名字怎么样', '白玖玖的名字打分', '我的名字叫白玖玖你帮我分析一下']
  .forEach(function (s) { t(s, 'nameology', 'high'); });

// ---- 非玄学拒答 ----
['今天天气', '帮我写代码', '1+1等于几', '今天吃什么', '导航去天安门', 'abcdefg', '123456789']
  .forEach(function (s) { t(s, 'unknown'); });

// ---- 边界 ----
['', '   ', '...', '???'].forEach(function (s) { t(s, 'unknown', 'none'); });

console.log('===== 意图解析回归 =====');
console.log('通过: ' + pass + ' / ' + (pass + fail));
if (fails.length) {
  console.log('\n失败用例:');
  fails.forEach(function (f) {
    console.log('  [' + f.in + '] 期望 ' + f.exp + ' 实得 ' + f.got);
  });
  process.exitCode = 1;
}
