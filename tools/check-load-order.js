#!/usr/bin/env node
/**
 * tools/check-load-order.js —— PWA 脚本加载顺序自检（防「UMD 依赖静默降级」）
 * ------------------------------------------------------------------
 * 背景：PWA 是手写 <script> 全局挂载 NT.core.*。某模块的 UMD 头会
 *   factory(require('./x.js'))，而浏览器分支读的是「此刻已挂载的 NT.core.x」。
 *   若被依赖者 x.js 在 index.html 里排在依赖者**之后**，挂载时 NT.core.x 还是 undefined，
 *   → 该模块**静默降级**（功能部分失灵但页面不报错）。
 * 事故实例：v3.1.23 补 bazi-shensha.js 漏载后，zeri.js 仍排在 bazi-shensha.js 之后，
 *   bazi-shensha 复用 zeri.js 的天乙贵人表 → 神煞的天乙贵人静默拿不到。
 *
 * 用法：node tools/check-load-order.js          （0 违例 → 退出码 0；有违例 → 打印 + 退出码 1）
 *   本脚本**只读**，不改任何文件；已并入 sync-mp --check（见 sync-mp.js 末尾）。
 *
 * 校验逻辑：
 *   1) 读仓库根 index.html 里所有 `./modules/<dir>/<file>.js` 的加载顺序；
 *   2) 对每个被加载模块，读其文件头 UMD 里 `require('./x.js')` 的**同目录**依赖；
 *   3) 若该依赖也在 index.html 中、却排在当前模块**之后** → 违例（被依赖者必须在前）。
 *   （依赖不在 index.html 的情况：浏览器分支走全局兜底，非顺序问题，不算违例。）
 */
'use strict';
var fs = require('fs'), path = require('path');
var ROOT = path.resolve(__dirname, '..');
var htmlPath = path.join(ROOT, 'index.html');
var html = fs.readFileSync(htmlPath, 'utf8');

// 1) 提取 index.html 里 modules 脚本的加载顺序（有序）
var order = (html.match(/src="\.\/modules\/[^"]+"/g) || []).map(function (m) {
  return m.match(/modules\/(.*?)"/)[1];
});
var pos = {};
order.forEach(function (f, i) { pos[f] = i; });

// 2) 逐模块读 UMD 头的同目录依赖，检查被依赖者是否在前
var viol = [];
order.forEach(function (f) {
  var p = path.join(ROOT, 'modules', f);
  if (!fs.existsSync(p)) { viol.push(f + '：文件缺失'); return; }
  var head = fs.readFileSync(p, 'utf8').slice(0, 4000);
  var deps = (head.match(/require\('\.\/[^']+\.js'\)/g) || [])
    .map(function (d) { return d.match(/require\('\.\/(.*?)'\)/)[1]; })
    .filter(function (v, i, a) { return a.indexOf(v) === i; });   // 去重
  var dir = f.split('/').slice(0, -1).join('/');
  deps.forEach(function (d) {
    var full = dir ? dir + '/' + d : d;
    if (full in pos && pos[full] >= pos[f]) {
      viol.push(f + '（第' + (pos[f] + 1) + '项）依赖 ' + full + '（第' + (pos[full] + 1) + '项）：被依赖者必须在前加载');
    }
  });
});

if (viol.length) {
  console.error('✗ PWA 脚本加载顺序违例 ' + viol.length + ' 处（UMD 依赖静默降级风险）：');
  viol.forEach(function (v) { console.error('  - ' + v); });
  process.exit(1);
} else {
  console.log('✓ PWA 脚本加载顺序正确（' + order.length + ' 项，UMD 依赖均先于使用方加载）');
}
