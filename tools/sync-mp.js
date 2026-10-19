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
//   这样 iztro(779KB)+astronomy(114KB) 这类「只有某板块用得到」的大件不在启动时进主包，压住 2MB 红线。
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
function neededFiles() {
  var p = manifest();
  var inSub = subFileSet();
  // 主包 files = 清单 files 去掉已在分包里的（分包文件不进主包，避免重复计体积）
  return p.files.filter(function (f) { return !inSub[f]; });
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
    // 全功能巡检：55 个功能块逐个跑一遍（抛错/空输出/事故标记/切段/触发词冲突/缺料守门）
    try {
      cp.execSync('node tools/audit-features.js', { cwd: ROOT, stdio: 'inherit' });
      console.log('  ✓ 全功能巡检（55 个功能块逐个可跑、无冲突）');
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
    // 主包静态 require 分包文件体检（v3.1.37 新增）：
    //   微信规定**主包不得静态 require 分包文件**（编译期即判非法、运行也取不到模块）。
    //   一旦漏进去，启动链第二句就抛「module 'utils/modules/CoreModule/ziwei.js' is not defined」，
    //   整包起不来、页面全部未注册 —— v3.1.37 修的就是这个。固化成立即判红的硬校验，防回归。
    //   合法的 require.async('...分包路径...') 是官方跨包取码方式，不在检查范围内（正则只认 require(...) 同步式）。
    (function () {
      var subBase = Object.keys(subFileSet()).map(function (f) { return f.split('/').pop(); });
      var subMap = subPackageMap();
      var leaks = [];
      (function scan(dir) {
        if (!fs.existsSync(dir)) return;
        fs.readdirSync(dir).forEach(function (f) {
          var fp = path.join(dir, f);
          var st = fs.lstatSync(fp);
          if (st.isDirectory()) {
            // 跳过分包目录本身（分包内互相 require 是允许的，只查主包）
            if (subMap[path.relative(MP_DIST, fp).split(path.sep)[0]]) return;
            return scan(fp);
          }
          if (!/\.js$/i.test(f)) return;
          var src = fs.readFileSync(fp, 'utf8');
          subBase.forEach(function (bn) {
            var re = new RegExp('require\\(\\s*[\'"][^\'"]*' + bn.replace(/\./g, '\\.') + '[\'"]\\s*\\)');
            if (re.test(src)) leaks.push(path.relative(ROOT, fp) + '  →  静态 require 了分包文件 ' + bn);
          });
        });
      })(MP_DIST);
      if (leaks.length) { leaks.forEach(function (t) { console.log('  ✗ 主包静态引用分包文件:', t); }); bad += leaks.length; }
      else console.log('  ✓ 主包未静态 require 任何分包文件（分包只经 require.async 懒加载）');
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
    Object.keys(map).forEach(function (pkg) {
      var dir = path.join(MP_DIST, pkg);
      if (fs.existsSync(dir)) clearFiles(dir);
    });
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
      appJson.subPackages = appJson.subPackages || [];
      pkgNames.forEach(function (pkg) {
        var root = pkg + '/';
        var already = appJson.subPackages.some(function (sp) { return sp.root === root; });
        if (!already) {
          appJson.subPackages.push({ root: root, name: pkg, pages: [root + 'pages/placeholder/placeholder'] });
        }
      });
      // 不写 preloadRule（主人要求：主包之外的内容一律「用到才加载」——主包只装起始页，
      //   其他页面 / 算法 / 功能都在需要时才拉，进首页不后台预下载任何分包）。
      //   这里主动清掉历史上写入的 preloadRule，保证 app.json 干净。
      delete appJson.preloadRule;
      fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
      console.log('  app.json 已写入 subPackages（' + pkgNames.join(', ') + '）；不预下载，用到才拉');
    }
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
  // 壳体检（生成模式只告警不中断，便于边改边看；CI 用 --check 会硬失败）
  var problems = lintWxmlTemplates();
  if (problems.length) {
    console.log('\n[sync-mp] ⚠ WXML 模板漏传 data（模板作用域独立，会导致数据全部静默为空）：');
    problems.forEach(function (t) { console.log('   ⚠ ' + t); });
  }
  console.log('[sync-mp] 完成（单一源 = modules/；dist/mp-weixin 为生成产物；普通文件可被微信打包）');
}

main();
