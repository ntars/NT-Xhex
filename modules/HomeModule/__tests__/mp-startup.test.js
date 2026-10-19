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
// ⚠ 关键：这里**刻意不给 wx.loadSubpackage**（只有 getSystemInfoSync / setBackgroundColor 等基础 API）。
//   因为真实微信里，app.js 的 require 序列执行时 App() 还没跑、wx.loadSubpackage 尚未注入 ——
//   v3.1.40 的事故正是「拿 wx.loadSubpackage 当小程序判据」而它在启动链上不成立，
//   于是 settings.js 误判成 Node 端、拉分包文件、启动即崩。
//   本测试复刻这个「半初始化」时刻，确保判据在**最早期**也正确。
global.wx = {
  getSystemInfoSync: function () { return { SDKVersion: '3.17.3', platform: 'devtools' }; },
  setBackgroundColor: function () {},
  getStorageSync: function () { return ''; },
  setStorageSync: function () {},
  // 注意：故意**不提供** loadSubpackage —— 见上方说明
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

console.log('\nC. cores-loader 在小程序端的表现（wx 半初始化：loadSubpackage 未注入）');
var Cores = loaded['utils/modules/HomeModule/cores-loader.js'];
ok('cores-loader 加载成功', !!Cores);
ok('isMP = true（仅凭 wx 全局即可判定，不依赖 loadSubpackage）', Cores.isMP === true, String(Cores.isMP));
ok('PKG = occupy-cores', Cores.PKG === 'occupy-cores', Cores.PKG);

console.log('\nD. 分包不可得时「返回 null 而不是抛」（不静默假装算得出、也不崩）');
Cores.load('registry').then(function (R) {
  ok("load('registry') 在模块不可得时 resolve(null)", R === null || R === undefined, String(R));
  ok('全程无 reject（不会让壳崩掉）', true);
  return Cores.loadAll();
}).then(function (m) {
  ok('loadAll() 在不可得时也 resolve 而非 throw', !!m);
  console.log('\nD2. 会话器「延迟创建」后的判空（真机实测崩过两处）');
  // v3.1.41 真机实测：
  //   ① onLoad 里 this.conv.restore() —— 分包懒加载前 conv 还是 null → 「Cannot read property 'restore' of null」
  //   ② gotoHome / doClear 里 this.conv.clear()  —— 同因 → 「Cannot read property 'clear' of null」
  // 故两处必须判空。这里静态扫描 dist 产物（微信真正执行的那份）确认。
  var fs = require('fs');
  var idxJs = fs.readFileSync(path.join(DIST, 'pages/index/index.js'), 'utf8');
  var code2 = idxJs.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:\\])\/\/[^\n]*/g, '$1 ');
  ok('dist 壳 onLoad 里 restore 前判空', /this\.conv \? this\.conv\.restore\(\)/.test(code2));
  // 逐行查：任何一行若出现 this.conv.xxx(，其前面 12 个字符内必须有判空（? : if (this.conv)）
  function bareCalls(src, meth) {
    var bad = [];
    src.split('\n').forEach(function (line, i) {
      var m = line.match(new RegExp('this\\.conv\\.' + meth + '\\('));
      if (!m) return;
      var head = line.slice(0, m.index);
      if (head.indexOf('?') < 0 && head.indexOf('if (this.conv)') < 0) bad.push(i + 1);
    });
    return bad;
  }
  ok('dist 壳无裸 this.conv.restore() 调用', bareCalls(code2, 'restore').length === 0,
    '行号 ' + bareCalls(code2, 'restore').join(','));
  ok('dist 壳无裸 this.conv.clear() 调用', bareCalls(code2, 'clear').length === 0,
    '行号 ' + bareCalls(code2, 'clear').join(','));
  var vueJs = fs.readFileSync(path.join(ROOT, 'pages/index/index.vue'), 'utf8');
  ok('uni-app 壳 index.vue 里 restore 前判空（两壳同步）', /this\.conv \? this\.conv\.restore\(\)/.test(vueJs));

  console.log('\nE. 源码形态：路径必须运行时拼接（微信静态分析只认完整字面量）');
  var src = fs.readFileSync(path.join(ROOT, 'modules/SettingsModule/settings.js'), 'utf8');
  ok('settings.js 判据是「typeof wx !== undefined」（不依赖 loadSubpackage）',
    /var __isMP = \(typeof wx !== 'undefined'\);/.test(src));
  // 只查**代码**（剔除注释后再找）——注释里可以、也应该解释「为何不能用 loadSubpackage」
  function codeOnly(t) {
    return t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:\\])\/\/[^\n]*/g, '$1 ');
  }
  ok('settings.js 代码里不出现 wx.loadSubpackage（启动链上尚未注入）',
    codeOnly(src).indexOf('wx.loadSubpackage') < 0);
  // cores-loader 的**判据处**（UMD 头部算 isMP 那行）不许依赖 loadSubpackage；
  // 但它 load() 里的防御性检查「typeof wx.loadSubpackage === 'function'」是**合法且必要**的
  // —— 那时 App 已启动、API 已就绪，属运行时保护，不在禁止之列。
  var cloader = fs.readFileSync(path.join(ROOT, 'modules/HomeModule/cores-loader.js'), 'utf8');
  ok('cores-loader 判据处是「typeof wx !== undefined」（UMD 头部不算 loadSubpackage）',
    /var isMP = \(typeof wx !== 'undefined'\);/.test(cloader));
  ok('cores-loader 的 isMP 赋值行本身不含 loadSubpackage',
    !/var isMP = \([^\n]*loadSubpackage/.test(cloader));

  console.log('\n=== mp-startup 自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
  process.exit(fail ? 1 : 0);
}).catch(function (e) {
  console.log('  ✗ 出现 reject（违反设计）：', e && e.message);
  console.log('\n=== mp-startup 自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
  process.exit(1);
});