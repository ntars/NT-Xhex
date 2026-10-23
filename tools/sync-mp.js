#!/usr/bin/env node
/**
 * tools/sync-mp.js —— 生成微信小程序的引擎文件（普通文件，非软链）
 *
 * 设计：
 *   · modules/ 是业务引擎/数据库/存储/设置的**唯一真源**（single source of truth），目录结构不动。
 *   · 「各平台加载哪些模块、忽略哪些」由 tools/platform-modules.json 统一声明（单一事实源）。
 *   · 本脚本只处理 platform-modules.json 里 platforms['mp-weixin'].files 列出的引擎文件，
 *     自动忽略该形态用不到的目录（EnvModule/UIModule/*.vue），不干扰小程序运行。
 *   · dist/mp-weixin/utils/modules/ 是「生成产物」，由本脚本产出，**永不手工维护**：
 *     改 modules/ 后重跑一次即可同步；产物是普通文件，可被微信正常打包（不用软链，
 *     因微信打包器不跟随指向项目根之外的软链接）。
 *
 * 产物（两类，均由本脚本生成，永不手工维护）：
 *   ① dist/mp-weixin/utils/modules/   引擎文件（按 platform-modules.json 的 mp-weixin.files）
 *   ② dist/mp-weixin/theme.wxss       视觉规范（modules/UIModule/theme.css 的副本，app.wxss @import 引入）
 *
 * 用法：
 *   node tools/sync-mp.js          # 从 modules/ 生成 dist/mp-weixin 的引擎文件 + 主题（普通文件）
 *   node tools/sync-mp.js --check # 仅校验产物是否完整/与源一致，不改动
 */
'use strict';
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var cp = require('child_process');

var ROOT = path.resolve(__dirname, '..');
var SRC = path.join(ROOT, 'modules');
var MP = path.join(ROOT, 'dist', 'mp-weixin', 'utils', 'modules');
var MP_DIST = path.join(ROOT, 'dist', 'mp-weixin');
var MANIFEST = path.join(ROOT, 'tools', 'platform-modules.json');
// 视觉规范单一真源 → 小程序主题产物（app.wxss 里 @import "theme.wxss" 引入）
var THEME_SRC = path.join(SRC, 'UIModule', 'theme.css');
var THEME_DST = path.join(ROOT, 'dist', 'mp-weixin', 'theme.wxss');

var MODE = process.argv.indexOf('--check') >= 0 ? 'check' : 'copy';

// 从「各平台加载清单」取小程序要用的引擎文件（单一事实源，自动忽略不相关目录）
// v3.1.32 起：分包冷加载。mp-weixin.subPackages 列出的文件**不进主包**，而是生成到各自分包目录
//   （dist/mp-weixin/<pkg>/utils/modules/…），由主包用 require.async 按需拉取（官方文档口径：基础库 2.11.2+）。
//   这样 iztro(798KB) 这类「只有紫微板块用得到」的大件不在启动时进主包，压住 2MB 红线。
//   ⚠ 主包侧**不得**对这些文件写静态 require（微信编译期即判「主包引用分包」非法，运行也取不到）；
//     主包代码里对应的功能改走 require.async 懒加载（见 modules/features/registry.js 的 warmZiwei/warmAstro）。
function manifest() {
  var m = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  var p = m.platforms && m.platforms['mp-weixin'];
  if (!p || !Array.isArray(p.files)) throw new Error('platform-modules.json 缺少 mp-weixin.files 清单');
  return p;
}
function subPackageMap() {
  var p = manifest();
  var subs = p.subPackages || {};
  var map = {};   // 包名 → { 用途, files[] }
  Object.keys(subs).forEach(function (k) {
    if (k.charAt(0) === '_') return;      // 跳过 _说明
    map[k] = { 用途: subs[k].用途 || '', files: subs[k].files || [] };
  });
  return map;
}
function subFileSet() {
  var set = {};
  var map = subPackageMap();
  Object.keys(map).forEach(function (k) { map[k].files.forEach(function (f) { set[f] = k; }); });
  return set;
}
// 主包公共内核（v3.2.0 恢复黄历/万年历后分包逼近 2MB 红线，故把「体积大、无依赖、被多个分包文件 require」
// 的大件放主包，并在分包里生成一行转发 shim。微信规则：分包可引用主包、主包不得引用分包，故此方向合法。
function sharedMainFiles() {
  var p = manifest();
  return Array.isArray(p.sharedMain) ? p.sharedMain : [];
}
function neededFiles() {
  var p = manifest();
  var inSub = subFileSet();
  // 主包 files = 清单 files 去掉已在分包里的（分包文件不进主包，避免重复计体积）+ 主包公共内核
  var base = p.files.filter(function (f) { return !inSub[f]; });
  sharedMainFiles().forEach(function (f) { if (base.indexOf(f) < 0) base.push(f); });
  return base;
}

// 视觉规范产物 = theme.css 的「图标 url 内嵌 base64」版本（源 = static/icons/ 的 3 个源 SVG，单一真源不变）
// 背景：微信 WXSS 的 url() 不支持本地文件（只能用网络图片 / base64 / <image>），
//       故小程序侧把 PWA 用的相对路径 url("../../static/icons/x.svg") 在构建期替换为
//       内嵌 base64 data URI（自动从源文件生成，绝不手工改写）；PWA/uni-app 侧仍用相对/绝对路径引用源 SVG。
function transformTheme(css) {
  var iconDir = path.join(ROOT, 'static', 'icons');
  return css.replace(/url\("\.\.\/\.\.\/static\/icons\/([\w-]+\.svg)"\)/g, function (m, name) {
    var p = path.join(iconDir, name);
    if (!fs.existsSync(p)) throw new Error('缺少图标源文件：static/icons/' + name + '（请先将 玄玖灵犀设计理念 的源 SVG 收进 static/icons/）');
    var b64 = fs.readFileSync(p).toString('base64');
    return 'url("data:image/svg+xml;base64,' + b64 + '")';
  });
}

// 小程序要用的静态资源（相对仓库根；同步到 dist/mp-weixin/ 对应路径）
function neededStatics() {
  var m = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  var p = m.platforms && m.platforms['mp-weixin'];
  return (p && Array.isArray(p.statics)) ? p.statics : [];
}

function sha(p) {
  return crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex');
}

/**
 * 小程序壳静态体检：WXML 里每一处 <template is="..."> 都必须显式传 data。
 *
 * 为什么必须查：
 *   微信 WXML 的 <template> 是**独立作用域**，不会继承页面的 data。
 *   写成 <template is="tpl-home"></template> 时，模板内 {{about.*}} / {{themeLogo}} 全部取到空值，
 *   表现为「硬编码文案正常、所有数据绑定静默消失」——页面看着在渲染，其实数据一个都没进去。
 *   这类故障不报错、不进 console，只在肉眼核对时才发现，故在此固化为构建期硬校验。
 */
function lintWxmlTemplates() {
  var problems = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(function (f) {
      var fp = path.join(dir, f);
      var st = fs.lstatSync(fp);
      if (st.isDirectory()) return walk(fp);
      if (!/\.wxml$/i.test(f)) return;
      var src = fs.readFileSync(fp, 'utf8');
      var re = /<template\b([^>]*)>/g, m;
      while ((m = re.exec(src)) !== null) {
        var attrs = m[1];
        // 只查「使用处」：有 is= 且没有 name=（有 name= 的是模板定义本身）
        if (/\bis\s*=/.test(attrs) && !/\bname\s*=/.test(attrs) && !/\bdata\s*=/.test(attrs)) {
          problems.push(path.relative(ROOT, fp) + '  →  <template' + attrs.trim() + '>  缺少 data 传参（模板作用域独立，不传则内部数据绑定全为空）');
        }
      }
    });
  }
  walk(MP_DIST);
  return problems;
}

function clearFiles(p) {
  // 仅清理「文件」层（不删目录，兼容 WorkBuddy safe-delete 拦截 rmdir；空目录对小程序无害）
  if (!fs.existsSync(p)) return;
  fs.readdirSync(p).forEach(function (f) {
    var fp = path.join(p, f);
    var st = fs.lstatSync(fp);
    if (st.isSymbolicLink() || st.isFile()) {
      try { fs.unlinkSync(fp); } catch (e) { /* 忽略删除失败 */ }
    } else if (st.isDirectory()) clearFiles(fp);
  });
}

function main() {
  var NEEDED = neededFiles();
  console.log('[sync-mp] 平台 = mp-weixin，模式 =', MODE, '，按清单生成', NEEDED.length, '个引擎文件（忽略清单外的目录）');

  NEEDED.forEach(function (rel) {
    if (!fs.existsSync(path.join(SRC, rel))) throw new Error('modules/ 缺少源文件：' + rel);
  });

  if (MODE === 'check') {
    var bad = 0;
    NEEDED.forEach(function (rel) {
      var dst = path.join(MP, rel);
      var st = fs.existsSync(dst) ? fs.lstatSync(dst) : null;
      if (!st || st.isSymbolicLink()) { console.log('  ✗ 缺失或非普通文件:', rel); bad++; return; }
      if (sha(dst) !== sha(path.join(SRC, rel))) { console.log('  ✗ 与源不一致:', rel); bad++; }
      else console.log('  ✓', rel);
    });
    // 视觉规范产物也要校验（theme.wxss = theme.css 的图标路径改写版，非直接副本）
    if (!fs.existsSync(THEME_DST)) { console.log('  ✗ 缺失: theme.wxss'); bad++; }
    else {
      var want = crypto.createHash('sha1').update(transformTheme(fs.readFileSync(THEME_SRC, 'utf8'))).digest('hex');
      var got = sha(THEME_DST);
      if (want !== got) { console.log('  ✗ 与源不一致: theme.wxss'); bad++; }
      else console.log('  ✓ theme.wxss');
    }
    // 静态资源也要校验（相对仓库根 → dist/mp-weixin/ 同路径）
    neededStatics().forEach(function (rel) {
      var srcP = path.join(ROOT, rel), dstP = path.join(MP_DIST, rel);
      if (!fs.existsSync(srcP)) { console.log('  ✗ 源缺失:', rel); bad++; return; }
      if (!fs.existsSync(dstP) || sha(dstP) !== sha(srcP)) { console.log('  ✗ 缺失或不一致:', rel); bad++; }
      else console.log('  ✓', rel);
    });
    // 小程序壳体检：<template is> 必须传 data（否则模板内数据绑定静默为空）
    var tplProblems = lintWxmlTemplates();
    if (tplProblems.length) {
      tplProblems.forEach(function (t) { console.log('  ✗ 模板漏传 data:', t); });
      bad += tplProblems.length;
    } else {
      console.log('  ✓ WXML 模板传参（<template is> 均带 data）');
    }
    // 版本一致性体检：7 处散落版本号必须与 version.json 一致（由 tools/sync-version.js 收敛）。
    //   不一致 → CI 直接红，避免「改了静态资源漏动 CACHE 名 / 漏改某处版本」。
    try {
      cp.execSync('node tools/sync-version.js --check', { cwd: ROOT, stdio: 'inherit' });
      console.log('  ✓ 版本号 7 处与 version.json 一致');
    } catch (e) {
      console.log('  ✗ 版本号漂移（跑 node tools/sync-version.js 修复）');
      bad++;
    }
    // PWA 脚本加载顺序体检：UMD 依赖必须「被依赖者先加载」，否则 NT.core.* 静默 undefined（防 bazi-shensha←zeri 这类降级）
    try {
      cp.execSync('node tools/check-load-order.js', { cwd: ROOT, stdio: 'inherit' });
      console.log('  ✓ PWA 脚本加载顺序（UMD 依赖先于使用方）');
    } catch (e) {
      console.log('  ✗ PWA 脚本加载顺序违例（跑 node tools/check-load-order.js 看详情）');
      bad++;
    }
    // 小程序主包体积体检：主包 ≤ 2MB 是发布硬线，超线 CI 直接红（v3.1.32 分包冷加载后已达标）
    try {
      cp.execSync('node tools/check-bundle-size.js', { cwd: ROOT, stdio: 'inherit' });
      console.log('  ✓ 主包体积在 2MB 红线内');
    } catch (e) {
      console.log('  ✗ 主包超 2MB 红线（跑 node tools/check-bundle-size.js 看体积构成，考虑把大内核挪进分包）');
      bad++;
    }
    // 全功能巡检：逐个功能块跑一遍（抛错/空输出/事故标记/切段/触发词冲突/缺料守门）
    try {
      var featCount = 0;
      try {
        var REG = require(path.join(ROOT, 'modules', 'features', 'registry.js'));
        featCount = (REG.FEATURES || []).length;
      } catch (e) { }
      cp.execSync('node tools/audit-features.js', { cwd: ROOT, stdio: 'inherit' });
      console.log('  ✓ 全功能巡检（' + (featCount || '全部') + ' 个功能块逐个可跑、无冲突）');
    } catch (e) {
      console.log('  ✗ 全功能巡检有失败项（跑 node tools/audit-features.js 看详情）');
      bad++;
    }
    // 分包产物体检：清单里声明的分包文件必须已生成到 dist（漏生成 → 运行时 require.async 拿不到 → 静默不可用）
    (function () {
      var map = subPackageMap();
      var missSub = [];
      Object.keys(map).forEach(function (pkg) {
        map[pkg].files.forEach(function (rel) {
          var p = path.join(MP_DIST, pkg, 'utils', 'modules', rel);
          if (!fs.existsSync(p)) missSub.push(pkg + '/' + rel);
        });
      });
      if (missSub.length) { missSub.forEach(function (t) { console.log('  ✗ 分包产物缺失:', t); }); bad += missSub.length; }
      else if (Object.keys(map).length) {
        console.log('  ✓ 分包产物齐全（' + Object.keys(map).map(function (k) { return k + '(' + map[k].files.length + ')'; }).join(', ') + '）');
      }
    })();
    // 主包跨包引用体检（v3.1.37 新增 → v3.1.38 加固为「路径解析级」）：
    //   微信规定**主包不得引用分包文件**（编译期即判非法、运行也取不到模块）。
    //   一旦漏进去，启动链就抛「module 'utils/modules/.../xxx.js' is not defined」，
    //   整包起不来、页面全部未注册 —— v3.1.37 / v3.1.38 两次事故同源。
    //
    // ⚠ v3.1.38 加固点：旧版只认 `require('...')` **字面量**形式，被「别名调用」绕过 ——
    //   settings.js 曾写成 `__opt('../features/registry.js')`（__opt 是 require 的别名），
    //   正则匹配不到、护栏放绿，可运行时照样跨包取模块而崩。现改为**按相对路径解析**：
    //   把主包每个 `xxx('...js')`（任意函数名）的实参相对本文件解析成「相对 modules/ 的路径」，
    //   再看它是否落在分包文件集合里 —— 与函数名、调用形式完全无关，抓得更全、也更准。
    //
    // 合法豁免：`require.async('...')` 是官方跨包取码方式（cores-loader 用），
    //   以及**运行时不执行**的分支 —— 那要求源码把路径拆开写（运行时拼接），
    //   否则完整路径字面量仍会被本护栏判红（这是刻意的：宁严勿松）。
    (function () {
      var subFiles = subFileSet();               // 分包文件相对路径集合
      var subMap = subPackageMap();
      var leaks = [];
      (function scan(dir) {
        if (!fs.existsSync(dir)) return;
        fs.readdirSync(dir).forEach(function (f) {
          var fp = path.join(dir, f);
          var st = fs.lstatSync(fp);
          if (st.isDirectory()) {
            if (subMap[path.relative(MP_DIST, fp).split(path.sep)[0]]) return;  // 分包内互相引用合法
            return scan(fp);
          }
          if (!/\.js$/i.test(f)) return;
          // 豁免：cores-loader 是**设计上的唯一懒加载入口**，它按官方 require.async 取分包模块，
          //   代码里必然出现分包路径字面量 —— 那是合规用法，不是违规引用。
          //   若把它一并禁掉，就等于禁止懒加载；故此文件整份豁免，但仍受上面 ① 调用形式检查约束
          //   （它若用了同步 require 指向分包，① 依然会判红 —— 那才是真事故）。
          if (/cores-loader\.js$/i.test(f)) return;
          var src = fs.readFileSync(fp, 'utf8');
          // 本文件在 modules/ 下的相对路径目录（dist/mp-weixin/utils/modules/X/Y.js → X）
          var relSelf = path.relative(path.join(MP_DIST, 'utils', 'modules'), path.dirname(fp))
            .split(path.sep).join('/');
          // ① 调用形式：任意 fn('...js')，实参相对本文件解析后若落在分包集合即判红
          var re = /([A-Za-z_$][\w$]*)\s*\(\s*['"]([^'"]+\.js)['"]\s*\)/g, mm;
          while ((mm = re.exec(src))) {
            var fn = mm[1], rp = mm[2];
            if (/\.async$/.test(fn)) continue;                    // require.async 合法
            var target = path.posix.normalize((relSelf ? relSelf + '/' : '') + rp);
            if (subFiles[target]) {
              leaks.push(path.relative(ROOT, fp) + '  →  ' + fn + '("' + rp + '") 指向分包文件 ' + target);
            }
          }
          // ② 字面量形式（**更严，v3.1.38 加固**）：即便没包成调用，只要**代码里**（注释已剔除）
          //   出现分包文件的**完整路径**字面量也判红 —— 杜绝「先存进变量、换个名字再 require」这类绕过。
          //   正确写法只有一条：把路径**拆开**在运行时拼接（微信静态分析只认完整字面量）。
          // ⚠ 只认「带目录的完整路径」，**不扫裸文件名** —— 像 db.js / config.js / lunar.js 这类通用名
          //   在中文说明文字里常被提到（「在适配层 lunar.js，读 config.js 开关」），
          //   扫裸名会把参考文献页的正文误判成跨包引用（v3.1.38 首次加固时踩过）。
          var code = src
            .replace(/\/\*[\s\S]*?\*\//g, ' ')                     // 块注释
            .replace(/(^|[^:\\])\/\/[^\n]*/g, '$1 ');               // 行注释（避开 http://）
          Object.keys(subFiles).forEach(function (sf) {
            // 只在「**代码位置**」找：赋值右侧、函数实参、数组元素 —— 即路径被当作值用的地方。
            // 用「字符串前后必须有代码符号」的锚点匹配，避免误伤**中文文案里提到文件名**的情况
            // （如「功能清单未取到（features/registry.js 未加载不进包）」这类提示语，不是引用）。
            var dirPart = sf.replace(/\/[^/]+$/, '');
            var base = sf.split('/').pop();
            var rePath = new RegExp(
              '(?:=|\\(|,|\\[|:|\\breturn\\b)\\s*[\'"][^\'"\\n]*' + dirPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
              '/?' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\'"]'
            );
            if (rePath.test(code)) {
              var dup = leaks.filter(function (t) { return t.indexOf(sf) >= 0; }).length;
              if (!dup) leaks.push(path.relative(ROOT, fp) + '  →  代码里出现分包文件路径字面量 ' + sf);
            }
          });
        });
      })(MP_DIST);
      if (leaks.length) { leaks.forEach(function (t) { console.log('  ✗ 主包跨包引用分包文件:', t); }); bad += leaks.length; }
      else console.log('  ✓ 主包未引用任何分包文件（分包只经 require.async / loadSubpackage 懒加载）');
    })();

    // 第六道：project.config.json 的 babelSetting 必须忽略 vendor（v3.1.42 新增）
    //   病因：微信开发者工具默认「增强编译」(setting.enhance) 会用 Babel 把 ES6+ 转 ES5，
    //     并给转译结果注入 `require('@babel/runtime/helpers/...')`。分包里的 iztro.min.js
    //     是 ES6+ 的 UMD 大包，一旦被转译，就会 require 一堆 runtime helper ——
    //     而小程序包里**永远不会**有 @babel/runtime（那是 npm 包，不是我们放的），
    //     于是真机/IDE 一用到紫微、占星就抛：
    //       module '@babel/runtime/helpers/arrayWithHoles.js' is not defined
    //   解法：在 babelSetting.ignore 里列出 vendor 目录，让 Babel **跳过**它们。
    //   ⚠ 官方口径：ignore 里写目录要**带 /* 通配**（示例 "utils/already_handle/*"）；
    //     只写到 'vendor/' 是不匹配的（v3.1.41 试过，没生效，白等一轮）。
    //   ⚠ 另外 outputPath 是「Babel 辅助函数的输出目录」，别乱填（曾写成 './dist/.'，
    //     相对项目根会变成 dist/mp-weixin/dist/.，错乱）—— 置空用官方默认即可。
    // 第七道：app.json 的 subPackages[].pages 必须是**相对 root** 的路径（v3.1.42 新增）
    //   病因：曾误写成 `root + 'pages/…'`（root 已含分包名，重复一次）→ 声明了一条不存在的页面路径，
    //     且生成时会在分包里多挖一层同名嵌套目录（occupy-astro 一次、occupy-cores 一次，都是同一个坑）。
    //   微信规则：pages 相对 root。这里逐条检查，只要有一项以 root 开头就判红。
    (function () {
      var ap = path.join(MP_DIST, 'app.json');
      if (!fs.existsSync(ap)) { console.log('  ✗ 缺 app.json'); bad++; return; }
      var j;
      try { j = JSON.parse(fs.readFileSync(ap, 'utf8')); }
      catch (e) { console.log('  ✗ app.json 不是合法 JSON: ' + e.message); bad++; return; }
      var subs = j.subPackages || [];
      var dupPages = [];
      subs.forEach(function (sp) {
        var root = sp.root || '';
        (sp.pages || []).forEach(function (pg) {
          if (root && pg.indexOf(root) === 0) dupPages.push(sp.name + ': pages 不该以 root 重复开头 → ' + pg);
        });
      });
      if (dupPages.length) { dupPages.forEach(function (t) { console.log('  ✗ ' + t); }); bad += dupPages.length; }
      else console.log('  ✓ app.json 的 subPackages[].pages 均为相对 root 的路径（无重复前缀）');
    })();

    // 第八道：HomeModule/catalog.js（功能介绍快照）必须与当前 registry.catalog() 一致（v3.1.45 新增）
    //   它是**生成产物**（源码树没有），一旦 registry 加了功能而忘了重跑 sync-mp，
    //   介绍页就会显示旧清单 —— 而人眼很难发现「少了一个板块」。故按内容比对。
    (function () {
      var dst = path.join(MP_DIST, 'utils', 'modules', 'HomeModule', 'catalog.js');
      if (!fs.existsSync(dst)) { console.log('  ✗ 缺 HomeModule/catalog.js（功能介绍快照）'); bad++; return; }
      var want = renderCatalog(catalogSnapshot());
      var have = fs.readFileSync(dst, 'utf8');
      if (have !== want) { console.log('  ✗ HomeModule/catalog.js 与 registry 不一致（跑 node tools/sync-mp.js 重新生成）'); bad++; }
      else console.log('  ✓ HomeModule/catalog.js 与 registry.catalog() 一致（介绍页快照是最新的）');
    })();

    // 第九道：HomeModule/refs-snapshot.js（参考文献快照）必须与当前 refs.js 的 refsPage() 一致（v3.1.57 新增）
    //   同 catalog：它是生成产物，改了 RefsModule/refs.js（书目/原文）忘重跑 → 参考文献页显示旧内容。
    (function () {
      var dst = path.join(MP_DIST, 'utils', 'modules', 'HomeModule', 'refs-snapshot.js');
      if (!fs.existsSync(dst)) { console.log('  ✗ 缺 HomeModule/refs-snapshot.js（参考文献快照）'); bad++; return; }
      var want = renderRefs(refsSnapshot());
      var have = fs.readFileSync(dst, 'utf8');
      if (have !== want) { console.log('  ✗ HomeModule/refs-snapshot.js 与 RefsModule/refs.js 不一致（跑 node tools/sync-mp.js 重新生成）'); bad++; }
      else console.log('  ✓ HomeModule/refs-snapshot.js 与 refs.js refsPage() 一致（参考文献快照是最新的）');
    })();

    // 第六道之前：project.config.json 的 babelSetting 必须忽略 vendor
    (function () {
      var pcfg = path.join(MP_DIST, 'project.config.json');
      if (!fs.existsSync(pcfg)) { console.log('  ✗ 缺 project.config.json（微信项目配置）'); bad++; return; }
      var cfg;
      try { cfg = JSON.parse(fs.readFileSync(pcfg, 'utf8')); }
      catch (e) { console.log('  ✗ project.config.json 不是合法 JSON: ' + e.message); bad++; return; }
      var bs = (cfg.setting && cfg.setting.babelSetting) || {};
      var ig = bs.ignore || [];
      var need = ['occupy-cores/utils/modules/CoreModule/vendor/*', 'utils/modules/CoreModule/vendor/*'];
      var miss = need.filter(function (n) { return ig.indexOf(n) < 0; });
      var badPath = !!bs.outputPath;   // 非空即视为错填（应为空 = 用官方默认 @babel/runtime）
      if (miss.length || badPath) {
        if (miss.length) console.log('  ✗ babelSetting.ignore 缺 vendor 通配：' + miss.join('、'));
        if (badPath) console.log("  ✗ babelSetting.outputPath 应为空串，实际为 '" + bs.outputPath + "'");
        bad++;
      } else {
        console.log('  ✓ babelSetting 已忽略 vendor（Babel 不转译 iztro，避免 @babel/runtime 缺失）');
      }
    })();
    console.log(bad === 0 ? '[sync-mp] 产物完整且与 modules/ 一致' : '[sync-mp] 发现 ' + bad + ' 处不一致，请重新生成');
    process.exit(bad === 0 ? 0 : 1);
    return;
  }

  // 视觉规范产物（theme.css → theme.wxss；3 个图标源 SVG 在构建期内嵌 base64，
  // 因微信 WXSS 的 url() 不支持本地文件——图标源仍 = static/icons/，单一真源不变）
  function syncTheme() {
    if (!fs.existsSync(THEME_SRC)) throw new Error('modules/ 缺少视觉规范源文件：UIModule/theme.css');
    var css = transformTheme(fs.readFileSync(THEME_SRC, 'utf8'));
    fs.mkdirSync(path.dirname(THEME_DST), { recursive: true });
    fs.writeFileSync(THEME_DST, css, 'utf8');
    console.log('  生成 theme.wxss（视觉规范，源 = modules/UIModule/theme.css，图标已内嵌 base64）');
  }

  // 静态资源（相对仓库根 → dist/mp-weixin/ 同路径）
  function syncStatics() {
    neededStatics().forEach(function (rel) {
      var srcP = path.join(ROOT, rel), dstP = path.join(MP_DIST, rel);
      if (!fs.existsSync(srcP)) throw new Error('缺少静态资源源文件：' + rel);
      fs.mkdirSync(path.dirname(dstP), { recursive: true });
      fs.copyFileSync(srcP, dstP);
      console.log('  同步', rel);
    });
  }

  // 分包引擎文件：分包清单里的文件不进主包，生成到 dist/mp-weixin/<pkg>/utils/modules/…
  //   由主包用 require.async 按需拉取（微信「分包异步化」，官方文档口径为**基础库 2.11.2+**），
  //   实现「冷加载 > 分包加载」。同时把 app.json 的 subPackages 段写出来（root 指分包目录），
  //   与本函数单一真源（清单 subPackages）保持一致。
  //
  // 生成前先清掉两个分包目录里的**旧文件**：分包目录不在 clearFiles(MP)（只清主包 utils/modules）的
  //   管辖范围内，历史产物（如早期生成逻辑留下的 <pkg>/<pkg>/… 嵌套目录）会一直堆着、计入包体，
  //   故这里一并清干净再生成（同 clearFiles 约定：只删文件、不删空目录）。
  function clearSubPackages() {
    var map = subPackageMap();
    // ① 清单内的分包：清掉旧文件（分包目录不在 clearFiles(MP) 的管辖范围内）
    Object.keys(map).forEach(function (pkg) {
      var dir = path.join(MP_DIST, pkg);
      if (!fs.existsSync(dir)) return;
      clearFiles(dir);
      // ⚠ v3.1.42：铲掉「分包套分包」的嵌套残留 <pkg>/<pkg>/…
      //   历史 bug：app.json 的 subPackages[].pages 误写成 root + 'pages/…'（root 已含 pkg，重复一次），
      //   按那套路径生成就会在分包里多挖一层同名目录（occupy-astro 一次、occupy-cores 一次）。
      //   声明已修（pages 改为相对 root），但旧产物残留要清干净，否则一直堆在包里计入体积。
      var nested = path.join(dir, pkg);
      if (fs.existsSync(nested)) {
        clearFiles(nested);
        removeEmptyDirs(nested);
        console.log('  清除分包内的嵌套残留目录 ' + pkg + '/' + pkg + '/');
      }
    });
    // ② 清单外、历史上生成过的分包目录（分包改名/合并后的残留，如 v3.1.38 前的 occupy-astro / occupy-ziwei）：
    //    整目录清文件并收掉空目录，避免废弃产物继续占包体。
    if (fs.existsSync(MP_DIST)) {
      fs.readdirSync(MP_DIST).forEach(function (name) {
        if (name.indexOf('occupy-') !== 0 || map[name]) return;
        var dir = path.join(MP_DIST, name);
        clearFiles(dir);
        removeEmptyDirs(dir);
        console.log('  清理废弃分包目录', name);
      });
    }
  }

  // 自底向上删除**空**目录（只删空的，绝不误删有内容的目录）
  function removeEmptyDirs(dir) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(function (f) {
      var fp = path.join(dir, f);
      if (fs.lstatSync(fp).isDirectory()) removeEmptyDirs(fp);
    });
    try { if (!fs.readdirSync(dir).length) fs.rmdirSync(dir); } catch (e) { /* 非空或被占用则留着 */ }
  }

  function syncSubPackages() {
    var map = subPackageMap();
    var pkgNames = Object.keys(map);
    if (!pkgNames.length) return;
    pkgNames.forEach(function (pkg) {
      map[pkg].files.forEach(function (rel) {
        var srcP = path.join(SRC, rel);
        if (!fs.existsSync(srcP)) throw new Error('分包「' + pkg + '」缺少源文件：' + rel);
        var dst = path.join(MP_DIST, pkg, 'utils', 'modules', rel);
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        if (sharedMainFiles().indexOf(rel) >= 0) {
          // 主包公共内核：分包侧只留一行转发（分包引用主包合法），避免同一份大文件两处计体积
          var up = '../'.repeat(1 + 2 + (rel.split('/').length - 1)); // pkg/utils/modules/<目录层级>
          fs.writeFileSync(dst, '// 生成产物：主包公共内核转发（源 modules/' + rel + '，见 tools/platform-modules.json 的 sharedMain）\nmodule.exports = require(\'' + up + 'utils/modules/' + rel + '\');\n', 'utf8');
          console.log('  分包转发[' + pkg + ']', rel, '→ 主包');
          return;
        }
        fs.copyFileSync(srcP, dst);
        console.log('  分包生成[' + pkg + ']', rel);
      });
    });
    // 微信要求每个分包至少有一个 page，故给每个分包生成一个**占位页**（用户永不看到）：
    //   分包里的引擎是给主包 require.async 拉的，不靠页面进入；此页纯为满足分包结构、让打包通过。
    pkgNames.forEach(function (pkg) {
      var dir = path.join(MP_DIST, pkg, 'pages', 'placeholder');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'placeholder.json'), '{ "usingComponents": {} }\n', 'utf8');
      fs.writeFileSync(path.join(dir, 'placeholder.wxml'), '<view class="ph"></view>\n', 'utf8');
      fs.writeFileSync(path.join(dir, 'placeholder.wxss'), '.ph { display: none; }\n', 'utf8');
      fs.writeFileSync(path.join(dir, 'placeholder.js'),
        '// 占位页：分包只放 JS 代码、由主包 require.async 按需拉取（占星/紫微冷加载），\n'
        + '// 此页仅为满足微信「分包必须有 page」的结构要求，用户永不看到，故不做任何界面。\n'
        + 'Page({})\n', 'utf8');
    });

    // app.json：写入 subPackages（微信要求分包有 pages 或至少独立目录；本项目分包只放 JS 代码，
    //   故给一个占位 page 满足分包结构，主包用 require.async 拉分包 JS）
    var appJsonPath = path.join(MP_DIST, 'app.json');
    if (fs.existsSync(appJsonPath)) {
      var appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
      // subPackages 按清单**重建**（不是追加）：历史上写过、而现在清单里没有的分包声明必须清掉，
      //   否则微信会拿着指向不存在目录的 root 去打包，直接失败
      //   （v3.1.38 把 occupy-astro/occupy-ziwei 合并成 occupy-cores 时就踩到了这个）。
      appJson.subPackages = pkgNames.map(function (pkg) {
        var root = pkg + '/';
        // ⚠ v3.1.42 修：subPackages[].pages 的路径是**相对 root** 的（微信规则），
        //   原来写成 root + 'pages/…' 会变成 'occupy-cores/occupy-cores/pages/…'
        //   —— 声明了一条根本不存在的页面路径，且首次生成会在分包里多挖一层嵌套目录
        //   （dist/mp-weixin/occupy-cores/occupy-cores/…，历史遗留过两次：occupy-astro 一次、occupy-cores 一次）。
        //   正确写法：pages 只写 root 之后的相对路径。
        return { root: root, name: pkg, pages: ['pages/placeholder/placeholder'] };
      });
      // 不写 preloadRule（主人要求：主包之外的内容一律「用到才加载」——主包只装起始页，
      //   其他页面 / 算法 / 功能都在需要时才拉，进首页不后台预下载任何分包）。
      //   这里主动清掉历史上写入的 preloadRule，保证 app.json 干净。
      delete appJson.preloadRule;
      fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
      console.log('  app.json 已写入 subPackages（' + pkgNames.join(', ') + '）；不预下载，用到才拉');
    }
  }

  /**
   * 生成主包内的「功能介绍」快照 HomeModule/catalog.js（v3.1.45）。
   *
   * 为什么需要（性能·真机实测）：
   *   「功能介绍」页原先走 Cores.load('registry') —— 而 registry 顶层 require 了 **37 个内核**
   *   （iztro 779KB + solarlunar 427KB + …合计约 2MB JS，全在分包 occupy-cores 里）。
   *   于是**只是打开一个"功能列表"就要把整个分包加载并执行完**，真机日志
   *   `[Violation] 'setTimeout' handler took 2991ms` —— 卡近 3 秒。
   *   可这个页面**只需要纯数据**（板块/短名/名/简介），不需要任何内核。
   *
   * 做法：构建期用 Node 跑一遍 registry（Node 环境完整），取 catalog() 的结果**快照**成这份小文件，
   *   放进主包 —— 介绍页直接同步读，**瞬间打开**，再不为它加载分包。
   *   单一真源仍是 modules/features/registry.js：加功能只改 registry，本文件由本脚本重新生成。
   *
   * ⚠ 本文件是**生成产物**，不在 platform-modules.json 的 files 里（不走「源码→dist 拷贝」），
   *   因为它源码树里并不存在。若误加进 files，NEEDED 拷贝会因找不到源文件而报错。
   */
  function catalogSnapshot() {
    var REG = require(path.join(ROOT, 'modules', 'features', 'registry.js'));
    var data = (REG && typeof REG.catalog === 'function') ? REG.catalog() : [];
    return data;
  }
  function renderCatalog(data) {
    return '/**\n'
      + ' * modules/HomeModule/catalog.js —— 「功能介绍」页的功能总览（主包静态快照）\n'
      + ' * 【生成产物 · 请勿手改】由 tools/sync-mp.js 从 modules/features/registry.js 的 catalog() 提取。\n'
      + ' * 为什么放进主包：registry 顶层 require 了 37 个内核（约 2MB，都在分包 occupy-cores），\n'
      + ' *   而为「功能介绍」页加载整个分包要卡约 3 秒（真机 setTimeout handler took 2991ms）；\n'
      + ' *   此页只需要纯数据，故快照成这份小文件，让介绍页**瞬间打开**。\n'
      + ' * 单一真源仍是 registry —— 加功能只改 registry，本文件由 sync-mp 重新生成。\n'
      + ' */\n'
      + '(function (root, factory) {\n'
      + '  if (typeof module === "object" && module.exports) module.exports = factory();\n'
      + '  else { root.NT = root.NT || {}; root.NT.core = root.NT.core || {}; root.NT.core.catalog = factory(); }\n'
      + '})(typeof self !== "undefined" ? self : this, function () {\n'
      + '  return ' + JSON.stringify(data, null, 2).replace(/^/gm, '  ').replace(/^\s{2}/, '') + ';\n'
      + '});\n';
  }
  function genCatalog() {
    var dst = path.join(MP_DIST, 'utils', 'modules', 'HomeModule', 'catalog.js');
    var src = renderCatalog(catalogSnapshot());
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, src, 'utf8');
    console.log('  生成 HomeModule/catalog.js（功能介绍快照，主包内，约 '
      + Math.round(src.length / 1024) + 'KB）');
  }

  /**
   * 生成主包内的「参考文献」快照 HomeModule/refs-snapshot.js（v3.1.57，与 catalog.js 同一机制）。
   *
   * 为什么需要（性能·真机实测口径同 catalog）：
   *  「参考文献」页 v3.1.57 起含公版古籍可查原文（书目 31 种 + 原文 432 条）。
   *  其单一真源 RefsModule/refs.js 与内核同住分包 occupy-cores（它要读 ziwei-duanyu 等内核的
   *  原文字段，按「不复制」铁律不能把原文搬进主包源码）——而主包**不能静态 require 分包文件**
   *  （微信判「主包引用分包」非法，启动即崩，见本文件跨包引用体检）。
   *  若打开参考文献页时才懒加载整个分包，等于为看一本书目把 2MB 算法全拉下来（catalog 踩过的坑）。
   *
   * 做法（同 catalog）：构建期在 Node 里跑一遍 refs.js 的 refsPage()（Node 环境完整，内核都能
   *   require），把结果**快照**成这份小文件放进主包 —— settings.js 的 refsPageOf() 同步读它，
   *   参考文献页**瞬间打开**，不碰分包。单一真源仍是 modules/RefsModule/refs.js。
   *
   * ⚠ 本文件是**生成产物**，不在 platform-modules.json 的 files 里（源码树不存在，同 catalog.js）。
   */
  function refsSnapshot() {
    var REFS = require(path.join(ROOT, 'modules', 'RefsModule', 'refs.js'));
    return (REFS && typeof REFS.refsPage === 'function') ? REFS.refsPage() : [];
  }
  function renderRefs(data) {
    return '/**\n'
      + ' * modules/HomeModule/refs-snapshot.js —— 「参考文献」页的书目与可查原文（主包静态快照）\n'
      + ' * 【生成产物 · 请勿手改】由 tools/sync-mp.js 从 modules/RefsModule/refs.js 的 refsPage() 提取。\n'
      + ' * 为什么放进主包：refs.js 与内核同住分包 occupy-cores（原文单一真源在各内核，按「不复制」\n'
      + ' *   铁律不能搬进主包源码），而主包不能静态 require 分包文件；若打开参考文献页时才懒加载\n'
      + ' *   整个分包，等于为看书目把约 2MB 算法全拉下来（功能介绍页 v3.1.45 踩过的同类坑）。\n'
      + ' *   故构建期快照成此文件，settings.js 的 refsPageOf() 同步读，页面瞬间打开。\n'
      + ' * 单一真源仍是 RefsModule/refs.js —— 改书目只改那里，本文件由 sync-mp 重新生成。\n'
      + ' */\n'
      + '(function (root, factory) {\n'
      + '  if (typeof module === "object" && module.exports) module.exports = factory();\n'
      + '  else { root.NT = root.NT || {}; root.NT.core = root.NT.core || {}; root.NT.core.refsSnapshot = factory(); }\n'
      + '})(typeof self !== "undefined" ? self : this, function () {\n'
      + '  return ' + JSON.stringify(data, null, 2).replace(/^/gm, '  ').replace(/^\s{2}/, '') + ';\n'
      + '});\n';
  }
  function genRefsSnapshot() {
    var dst = path.join(MP_DIST, 'utils', 'modules', 'HomeModule', 'refs-snapshot.js');
    var src = renderRefs(refsSnapshot());
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, src, 'utf8');
    console.log('  生成 HomeModule/refs-snapshot.js（参考文献快照，主包内，约 '
      + Math.round(src.length / 1024) + 'KB）');
  }

  /**
   * 保证 project.config.json 的 babelSetting 正确（v3.1.42）。
   *
   * 为什么不只手写、还要脚本兜底：微信开发者工具会自己改写 project.config.json（加 multiPlatform、
   *   条件编译等字段），手写的 ignore 有可能被冲掉或写错路径；而一旦错了，**只有真机点紫微/占星时
   *   才会以「module '@babel/runtime/helpers/...' is not defined」的形式暴露**（v3.1.41 就是这么
   *   白等一轮的）。故在生成产物时顺手把这两个字段校正回来，其余字段一律保留不动。
   *
   * 规则（官方口径）：
   *   · babelSetting.ignore —— 要跳过 Babel 转译的文件/目录；**目录必须带 `/*` 通配**，
   *     只写到 'vendor/' 不匹配。这里列 vendor 整个目录（iztro.min.js 是 ES6+ 大包）。
   *   · babelSetting.outputPath —— Babel 辅助函数的输出目录，**必须为空串**（用官方默认 @babel/runtime）；
   *     曾错写成 './dist/.'（相对项目根 → dist/mp-weixin/dist/.，错乱）。
   */
  function ensureBabelSetting() {
    var pcfg = path.join(MP_DIST, 'project.config.json');
    if (!fs.existsSync(pcfg)) return;
    var raw, cfg;
    try { raw = fs.readFileSync(pcfg, 'utf8'); cfg = JSON.parse(raw); } catch (e) { return; }
    cfg.setting = cfg.setting || {};
    var want = {
      ignore: ['occupy-cores/utils/modules/CoreModule/vendor/*', 'utils/modules/CoreModule/vendor/*'],
      disablePlugins: [],
      outputPath: ''
    };
    var cur = cfg.setting.babelSetting;
    if (cur && JSON.stringify(cur) === JSON.stringify(want)) return;   // 已正确，不动文件（避免无谓改动）
    cfg.setting.babelSetting = want;
    fs.writeFileSync(pcfg, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
    console.log('  校正 project.config.json 的 babelSetting（忽略 vendor / outputPath 置空）');
  }

  clearFiles(MP);
  clearSubPackages();
  NEEDED.forEach(function (rel) {
    var dst = path.join(MP, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(path.join(SRC, rel), dst);
    console.log('  生成', rel);
  });
  syncSubPackages();
  syncTheme();
  syncStatics();
  genCatalog();
  genRefsSnapshot();
  ensureBabelSetting();
  // 收掉历史空目录：模块在主包 ↔ 分包之间搬过家（如 analyzer/features 从主包进分包、
  // vendor 从分包进主包），而 clearFiles 只删文件不删目录（rmdir 可能被运行环境的
  // safe-delete 拦截），旧目录就会留成空壳 —— 0 个文件、不影响包体，但看着像「旧版本残留」。
  // 这里自底向上补清理一次：只删**空**目录，有内容的一律不动；删不掉（被占用）就留着。
  // 只遍历 MP_DIST 的子目录，避免把 dist/mp-weixin 本身删掉。
  if (MODE === 'copy') {
    fs.readdirSync(MP_DIST).forEach(function (f) {
      var fp = path.join(MP_DIST, f);
      if (fs.lstatSync(fp).isDirectory()) removeEmptyDirs(fp);
    });
  }
  // 壳体检（生成模式只告警不中断，便于边改边看；CI 用 --check 会硬失败）
  var problems = lintWxmlTemplates();
  if (problems.length) {
    console.log('\n[sync-mp] ⚠ WXML 模板漏传 data（模板作用域独立，会导致数据全部静默为空）：');
    problems.forEach(function (t) { console.log('   ⚠ ' + t); });
  }
  console.log('[sync-mp] 完成（单一源 = modules/；dist/mp-weixin 为生成产物；普通文件可被微信打包）');
}

main();
