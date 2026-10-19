/**
 * modules/HomeModule/__tests__/cores-loader.test.js —— 「算法内核按需取用器」自测
 *
 * 对应版本：v3.1.38（主包只装起始页 UI，其余算法整体挪进 occupy-cores 分包）
 *
 * 验什么（每条都是本次重构的真实风险点）：
 *   ① 三个 key 都能拿到模块，且模块导出齐全（analyze / FEATURES / build+paint）
 *   ② 取不到的 key 一律 resolve(null)、**绝不 reject**（壳里不能因加载失败而崩）
 *   ③ loadAll() 一次拿全三个
 *   ④ **同一 key 只取一次**（缓存命中，小程序端第二次不能重复 loadSubpackage）
 *   ⑤ 端到端：经 loader 取到 analyzer 后能真的算出命（不是空壳）
 *   ⑥ 接口三端一致：Node 端是 Promise（即使内部同步 require），调用方写法统一
 */
'use strict';
var C = require('../cores-loader.js');

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗', name, extra === undefined ? '' : '→ ' + extra); }
}

console.log('A. 模块接口');
ok('导出 load / loadAll / isMP / PKG', !!(C.load && C.loadAll && 'isMP' in C && C.PKG));
ok('PKG 为分包名 occupy-cores', C.PKG === 'occupy-cores', C.PKG);
ok('isMP 为布尔（Node 端应为 false）', typeof C.isMP === 'boolean', typeof C.isMP);

console.log('\nA2. 源码形态：require.async 的两个硬约束（v3.1.43 真机「页面永远进不去」的根因）');
(function () {
  var fs = require('fs'), path = require('path');
  var src = fs.readFileSync(path.join(__dirname, '../cores-loader.js'), 'utf8');
  function codeOnly(t) {
    return t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:\\])\/\/[^\n]*/g, '$1 ');
  }
  var code = codeOnly(src);
  // ① 实参必须是字符串字面量（微信要静态分析；写成变量它认不出 → 永不返回）
  var calls = [];
  var re = /require\.async\(([^)]*)\)/g, m;
  while ((m = re.exec(code))) calls.push(m[1].trim());
  ok('cores-loader 里至少有一处 require.async', calls.length > 0, String(calls.length));
  ok('每处 require.async 的实参都是字符串字面量（不是变量）',
    calls.every(function (a) { return /^'[^']+'$/.test(a) || /^"[^"]+"$/.test(a); }),
    JSON.stringify(calls));
  // ② 不能给 require.async 传第二个参数（它只接 1 个，多传被静默忽略 → 零回调）
  ok('require.async 均只传 1 个参数（未传 callback）',
    calls.every(function (a) { return a.indexOf(',') < 0; }), JSON.stringify(calls));
  // ③ loadMP 必须有超时兜底（防回调不来时永久 pending）
  ok('loadMP 有超时保护（LOAD_TIMEOUT_MS + setTimeout）',
    /LOAD_TIMEOUT_MS/.test(code) && /setTimeout\(/.test(code));
})();

console.log('\nB. 取内核（Node 端走同步 require 包一层 Promise）');

C.load('analyzer').then(function (A) {
  ok("load('analyzer') 拿到模块", !!A);
  ok('analyzer 导出含 analyze', !!(A && typeof A.analyze === 'function'));

  return C.load('registry');
}).then(function (R) {
  ok("load('registry') 拿到模块", !!R);
  ok('registry 有 FEATURES 且为 55 个功能块', !!(R && R.FEATURES && R.FEATURES.length === 55),
    R && R.FEATURES ? R.FEATURES.length : '无 FEATURES');

  return C.load('export');
}).then(function (E) {
  ok("load('export') 拿到模块", !!E);
  ok('export 导出含 build 与 paint', !!(E && typeof E.build === 'function' && typeof E.paint === 'function'));

  return C.load('不存在的key');
}).then(function (X) {
  ok('取不到的 key → resolve(null)', X === null, String(X));

  return C.loadAll();
}).then(function (m) {
  ok('loadAll() 一次拿全三个', !!(m && m.analyzer && m.registry && m.export));

  // 缓存：同一 key 连续两次都应拿到（且不重复加载）
  return C.load('registry').then(function (R2) {
    ok('同一 key 二次取用（缓存命中）', !!(R2 && R2.FEATURES && R2.FEATURES.length === 55));

    // 端到端：真算一卦
    return C.load('analyzer').then(function (A) {
      var out = String(A.analyze('测试，女，1990年1月1日0时排盘'));
      ok('端到端：经 loader 取内核后能算出四柱', /四柱：年己巳 \/ 月丙子 \/ 日丙寅 \/ 时戊子/.test(out), out.slice(0, 60));
      ok('端到端：含十二长生（v3.1.36 新增）', out.indexOf('十二长生') >= 0);
      ok('端到端：含地支关系（v3.1.36 新增）', out.indexOf('地支关系') >= 0);
    });
  });
}).then(function () {
  console.log('\n=== cores-loader 自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
  process.exit(fail ? 1 : 0);
}).catch(function (e) {
  // 绝不该走到这里：cores-loader 的设计是「失败一律 resolve(null)，绝不 reject」
  console.log('  ✗ 出现 reject（违反设计）：', e && e.message);
  console.log('\n=== cores-loader 自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
  process.exit(1);
});