/**
 * modules/HomeModule/__tests__/mp-startup.test.js —— 小程序启动链「模拟真机」自测
 *
 * 为什么需要这个测试（v3.1.38 真实事故换来的）：
 *   微信开发者工具真机跑时抛 `module 'utils/modules/features/registry.js' is not defined,
 *   require args is '../features/registry.js'`（栈：app.js → settings.js → registry.js），
 *   整条启动链断掉、页面全部未注册。**而 Node 端 45 个测试全绿** —— 因为 Node 里分包文件
 *   在源码树中确实存在，只有「产物包」里才缺它们。
 *
 *   所以必须有这个「**把主包以外的文件全部藏起来**」的模拟测试：
 *   模块解析器只认 dist/mp-weixin 下的**主包 8 个文件**，其余一律报 MODULE_NOT_FOUND
 *   —— 与微信运行时「只在本包里找模块」的行为一致。
 *
 * 验什么：
 *   ① 主包 8 个文件逐个 require 不报错（模拟 app.js 的启动 require 序列）
 *   ② settings.js 在小程序端**不触发**任何跨包 require（就是本次事故那一处）
 *   ③ settings.setRegistry 注入口存在（功能介绍页靠它拿清单）
 *   ④ cores-loader 在小程序端 isMP=true、PKG=occupy-cores
 *   ⑤ cores-loader.load 在模块不可得时**返回 null 而不是抛**（工程原则：不静默假装、不崩）
 *   ⑥ 真源码用「路径运行时拼接」而非字面量（微信静态依赖分析只认完整字面量）
 *
 * 跑法：node modules/HomeModule/__tests__/mp-startup.test.js
 */
'use strict';
var path = require('path');
var Module = require('module');

var ROOT = path.resolve(__dirname, '../../..');
var DIST = path.join(ROOT, 'dist', 'mp-weixin');

// 主包清单（与 tools/platform-modules.json 的 mp-weixin.files 一致，测试里独立列一份便于阅读）
var MAIN = [
  'utils/modules/StorageModule/storage.js',
  'utils/modules/SettingsModule/settings.js',
  'utils/modules/HomeModule/conversation.js',
  'utils/modules/HomeModule/result-format.js',
  'utils/modules/HomeModule/cores-loader.js',
  'utils/modules/UIModule/safe-area.js',
  'utils/modules/UIModule/theme.js',
  'utils/modules/UIModule/transition.js'
];

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗', name, extra === undefined ? '' : '→ ' + extra); }
}

// —— 搭建「小程序运行时」：wx 存在，且模块系统只认主包 ——
global.wx = {
  loadSubpackage: function (opt) { (global.__loadedSubPkgs = global.__loadedSubPkgs || []).push(opt && opt.package); },
  getSystemInfoSync: function () { return { SDKVersion: '3.17.3' }; }
};

var origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent) {
  // 放行 Node 内置模块（本测试自身要读文件）与相对测试目录的源码文件，
  // 只对「dist/mp-weixin 下的相对路径」施加「分包不可见」的限制。
  if (request.charAt(0) !== '.' || request.slice(-3) !== '.js' || /__tests__|\/modules\//.test(request)) {
    return origResolve.apply(this, arguments);
  }
  var base = parent && parent.filename ? path.dirname(parent.filename) : DIST;
  var abs = path.resolve(base, request);
  var rel = path.relative(DIST, abs).split(path.sep).join('/');
  if (rel.slice(-3) !== '.js') rel += '.js';
  // 分包文件不在主包 → 模拟微信：找不到就抛「module ... is not defined」
  if (MAIN.indexOf(rel) < 0 && rel.slice(0, 5) !== 'pages') {
    var err = new Error("module '" + rel + "' is not defined");
    err.code = 'MODULE_NOT_FOUND';
    err.simulated = true;
    throw err;
  }
  return origResolve.apply(this, arguments);
};

console.log('A. 主包文件逐个可 require（模拟 app.js 启动链）');
var loaded = {};
MAIN.forEach(function (rel) {
  try { loaded[rel] = require(path.join(DIST, rel)); ok(rel, true); }
  catch (e) { ok(rel, false, e.message); }
});

console.log('\nB. 本次事故那一处：settings.js 不得跨包 require');
ok('settings.js 加载成功', !!loaded['utils/modules/SettingsModule/settings.js']);
ok('about() 可用且有版本号', !!(loaded['utils/modules/SettingsModule/settings.js'] && loaded['utils/modules/SettingsModule/settings.js'].about().version));
ok('setRegistry 注入口存在（功能介绍页靠它拿清单）',
  typeof loaded['utils/modules/SettingsModule/settings.js'].setRegistry === 'function');

console.log('\nC. cores-loader 在小程序端的表现');
var Cores = loaded['utils/modules/HomeModule/cores-loader.js'];
ok('cores-loader 加载成功', !!Cores);
ok('isMP = true（识别出小程序环境）', Cores.isMP === true, String(Cores.isMP));
ok('PKG = occupy-cores', Cores.PKG === 'occupy-cores', Cores.PKG);

console.log('\nD. 分包不可得时「返回 null 而不是抛」（不静默假装算得出、也不崩）');
Cores.load('registry').then(function (R) {
  ok("load('registry') 在模块不可得时 resolve(null)", R === null || R === undefined, String(R));
  ok('全程无 reject（不会让壳崩掉）', true);
  return Cores.loadAll();
}).then(function (m) {
  ok('loadAll() 在不可得时也 resolve 而非 throw', !!m);
  console.log('\nE. 源码形态：路径必须运行时拼接（微信静态分析只认完整字面量）');
  var fs = require('fs');
  var src = fs.readFileSync(path.join(ROOT, 'modules/SettingsModule/settings.js'), 'utf8');
  ok("settings.js 源码不含完整字面量 '../features/registry.js'",
    src.indexOf("'../features/registry.js'") < 0 && src.indexOf('"../features/registry.js"') < 0);
  ok("settings.js 用运行时拼接 '../features/' + 'registry.js'",
    src.indexOf("'../features/' + 'registry.js'") >= 0);

  console.log('\n=== mp-startup 自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
  process.exit(fail ? 1 : 0);
}).catch(function (e) {
  console.log('  ✗ 出现 reject（违反设计）：', e && e.message);
  console.log('\n=== mp-startup 自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
  process.exit(1);
});