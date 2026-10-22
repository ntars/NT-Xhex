#!/usr/bin/env node
/**
 * tools/check-bundle-size.js —— 小程序包体体检（2MB 主包红线 + 2MB 单分包红线）
 *
 * 为什么需要：微信对包体有**三条**硬线：
 *   · 主包 ≤ 2MB
 *   · **单个分包 ≤ 2MB**（v3.2.0 补上：此前只测主包，v3.2.0 裁剪后分包 occupy-cores
 *     一度涨到 2.059MB，DevTools 直接判「大于 2M」，主包体检却全绿 —— 这个洞必须补）
 *   · 整个包（主包 + 所有分包）≤ 30MB
 * 本脚本**只读测量**，不改任何文件，用于：每次提交前看三红线是否越界；决定「该把哪个大件挪走」。
 *
 * 用法：node tools/check-bundle-size.js          （任一红线越界 → 退出码 1）
 *   --json  输出机器可读 JSON（给 CI 用）
 *   已并入 sync-mp --check（见 sync-mp.js 末尾）。
 *
 * 分包为何不能再细分拆（架构约束，勿轻易改）：
 *   小程序是**静态依赖分析**：只要主包里任何文件 require 了某个模块，它就进主包。
 *   registry.js 静态 require 全部内核 → 全部 CoreModule 都进分包。
 *   而内核之间是**同步 require**（bazi → lunar → solarlunar），且几乎全部内核都依赖
 *   solarlunar 底座；微信规定**分包之间不能同步 require** —— 底座与内核一旦分到两个包，
 *   就必然产生非法引用。故只能整包挪 + 用 require.async 跨包拉取。
 *
 * v3.2.0 的实际处置：导出图片（ExportModule/*，103KB，不依赖任何内核、只在结果页
 *   点按钮时才用）从分包挪进主包 —— 主包 0.396 → 0.481MB，分包 2.059 → 1.961MB。
 */
'use strict';
var fs = require('fs'), path = require('path');
var ROOT = path.resolve(__dirname, '..');
var MP = path.join(ROOT, 'dist/mp-weixin');
var MAIN_LIMIT = 2 * 1024 * 1024;     // 2MB 主包红线
var SUB_LIMIT = 2 * 1024 * 1024;      // 2MB 单个分包红线（v3.2.0 补）
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

// 逐个分包测量（v3.2.0 补：微信对**单个分包**也有 2MB 上限）
var subs = subRoots.map(function (r) {
  var name = path.relative(MP, r);
  var fs_ = files.filter(function (f) { return f.p.indexOf(r) === 0; });
  var size = fs_.reduce(function (s, f) { return s + f.size; }, 0);
  return {
    分包: name,
    字节: size,
    MB: +(size / 1048576).toFixed(3),
    占比: +(size / SUB_LIMIT * 100).toFixed(1) + '%',
    超线: size > SUB_LIMIT,
    最大文件Top5: fs_.slice().sort(function (a, b) { return b.size - a.size; }).slice(0, 5)
      .map(function (f) { return { 文件: path.relative(MP, f.p), KB: +(f.size / 1024).toFixed(1) }; })
  };
});
var overSubs = subs.filter(function (s) { return s.超线; });

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
  分包: subs,
  分包超线数: overSubs.length,
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
    + (over ? '  ✗ 超线' : '  ✓ 未超')
    + '；整包 ' + report.整包MB + ' MB（分包 ' + report.分包目录数 + ' 个）');
  subs.forEach(function (s) {
    console.log('       分包 ' + s.分包 + ' ' + s.MB + ' MB / 红线 2MB（' + s.占比 + '）'
      + (s.超线 ? '  ✗ 超线' : '  ✓ 未超'));
    s.最大文件Top5.forEach(function (x) {
      console.log('              ' + String(x.KB).padStart(7) + ' KB  ' + x.文件);
    });
  });
  console.log('       主包最大文件 Top12：');
  report.最大文件Top12.forEach(function (x) {
    console.log('         ' + String(x.KB).padStart(7) + ' KB  ' + x.文件);
  });
  if (over) {
    console.log('       ⚠ 主包超线处置：把最大件挪进「分包 + require.async 冷加载」（基础库 2.26.1+）。');
    console.log('         注意 require.async 是异步的，需把对应功能块改成异步路径，属架构级改动，勿草率改。');
  }
  overSubs.forEach(function (s) {
    console.log('       ⚠ 分包「' + s.分包 + '」超 2MB 单分包红线：'
      + '把不依赖内核的大件（如 ExportModule 导出图片）挪进主包，或拆分内核。');
  });
}
process.exit((over || overSubs.length) ? 1 : 0);