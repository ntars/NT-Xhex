#!/usr/bin/env node
/**
 * tools/check-bundle-size.js —— 小程序主包体积体检（清单第 10 项：2MB 主包红线）
 *
 * 为什么需要：小程序主包上限 2MB。本项目引擎全量进主包（registry 静态 require 全部内核），
 *   一旦超线就无法发布。本脚本**只读测量**，不改任何文件，用于：
 *   ① 每次提交前看主包是否逼近/超红线；② 决定「该把哪个内核挪进分包」。
 *
 * 用法：node tools/check-bundle-size.js          （超 2MB → 退出码 1）
 *   --json  输出机器可读 JSON（给 CI 用）
 *   已并入 sync-mp --check（见 sync-mp.js 末尾）。
 *
 * 红线口径（微信官方）：
 *   · 主包 ≤ 2MB（本次体检的硬线）
 *   · 整个包（主包+所有分包）≤ 30MB（项目指令记 30M，官方上限随版本浮动，此处只提示）
 *
 * 为什么现在超线、能不能靠「不 require」解决：
 *   小程序是**静态依赖分析**：只要主包里任何文件 require 了某个模块，它就进主包。
 *   registry.js 静态 require 全部 36 个内核 → 44 个 CoreModule 文件全进主包。
 *   「分包异步化」（基础库 2.26.1+）支持 require.async 跨包加载 JS，可把大内核挪进分包、
 *   用到时才异步拉取 —— 这正是「冷加载 > 分包加载」的正解；
 *   ⚠ 但 require.async 是**异步**的，同步的 registry.run() 用不了，需把对应功能块改成
 *     「先 await 加载、再算」的异步路径，故属架构级改动，须专门排期，不可草率改。
 */
'use strict';
var fs = require('fs'), path = require('path');
var ROOT = path.resolve(__dirname, '..');
var MP = path.join(ROOT, 'dist/mp-weixin');
var MAIN_LIMIT = 2 * 1024 * 1024;     // 2MB 主包红线
var TOTAL_LIMIT = 30 * 1024 * 1024;   // 30MB 整包红线

function walk(dir, acc) {
  acc = acc || [];
  if (!fs.existsSync(dir)) return acc;
  fs.readdirSync(dir).forEach(function (f) {
    var p = path.join(dir, f);
    var st = fs.lstatSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (st.isFile()) acc.push({ p: p, size: st.size });
  });
  return acc;
}

// 测量口径：排除 macOS / 编辑器垃圾（.DS_Store 等）。这些文件被 .gitignore 忽略、
// 不会进发布包，只是本地 macOS 在 dist 里自动生成，若不排除会虚增主包体积、误导红线判定。
var JUNK = ['.DS_Store', 'Thumbs.db', '.DS_Store?'];
function isJunk(p) { var b = path.basename(p); return JUNK.indexOf(b) >= 0; }
var files = walk(MP).filter(function (f) { return !isJunk(f.p); });
var total = files.reduce(function (s, f) { return s + f.size; }, 0);

// 分包目录（app.json subPackages 的 root 指向）算「整包」但不计入主包
var appJson = {};
try { appJson = JSON.parse(fs.readFileSync(path.join(MP, 'app.json'), 'utf8')); } catch (e) { }
var subRoots = (appJson.subPackages || []).map(function (sp) { return path.join(MP, sp.root); });
function inSub(p) { return subRoots.some(function (r) { return p.indexOf(r) === 0; }); }

var mainFiles = files.filter(function (f) { return !inSub(f.p); });
var main = mainFiles.reduce(function (s, f) { return s + f.size; }, 0);

// 主包最大若干文件（找该挪谁进分包）
var top = mainFiles.slice().sort(function (a, b) { return b.size - a.size; }).slice(0, 12);

var pct = (main / MAIN_LIMIT * 100);
var over = main > MAIN_LIMIT;

var report = {
  主包字节: main,
  主包MB: +(main / 1048576).toFixed(3),
  主包红线MB: 2,
  主包占比: +pct.toFixed(1) + '%',
  超线: over,
  整包MB: +(total / 1048576).toFixed(3),
  整包红线MB: 30,
  分包目录数: subRoots.length,
  最大文件Top12: top.map(function (f) {
    return { 文件: path.relative(MP, f.p), KB: +(f.size / 1024).toFixed(1) };
  })
};

if (process.argv.indexOf('--json') >= 0) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('[包体] 主包 ' + report.主包MB + ' MB / 红线 2MB（' + report.主包占比 + '）'
    + (over ? '  ✗ 超线' : '  ✓ 未超') + '；整包 ' + report.整包MB + ' MB（分包 ' + report.分包目录数 + ' 个）');
  console.log('       主包最大文件 Top12：');
  report.最大文件Top12.forEach(function (x) {
    console.log('         ' + String(x.KB).padStart(7) + ' KB  ' + x.文件);
  });
  if (over) {
    console.log('       ⚠ 超线处置：把最大件挪进「分包 + require.async 冷加载」（基础库 2.26.1+）。');
    console.log('         注意 require.async 是异步的，需把对应功能块改成异步路径，属架构级改动，勿草率改。');
  }
}
process.exit(over ? 1 : 0);