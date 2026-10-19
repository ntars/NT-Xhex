/**
 * modules/HomeModule/cores-loader.js —— 「算法内核」按需取用器【单一真源】
 *
 * 为什么要它
 *   主人要求：**主包只装起始页 UI，其他页面 / 算法 / 功能都在需要时才加载**。
 *   于是小程序端把「全部算法」整体挪进分包 `occupy-cores`：
 *     · CoreModule/*        全部内核（含 solarlunar 历法底座 427KB）
 *     · features/registry.js 功能注册表（190KB，触发词路由单一真源）
 *     · AnalyzerModule/*     分析装配层（把内核结果组织成给用户看的正文）
 *     · ExportModule/*       导出图片（结果页「导出图片」才用）
 *
 *   为什么是「整体一包」而不是按板块细拆（这一点很关键）：
 *     内核之间是**同步 require**（如 bazi → lunar → solarlunar），且几乎全部内核都依赖
 *     solarlunar 这座底座；而微信规定**分包之间不能同步 require**。底座与内核一旦被分到两个包，
 *     就必然产生非法引用。故只能整包挪 —— 结论是「主包只装起始页」，而不是「主包装一半算法」。
 *
 * 怎么用（壳里）
 *   Cores.load('analyzer').then(function (ANA) { ... })   // 用户提问时才要
 *   Cores.load('registry').then(function (REG) { ... })   // 功能介绍页 / 功能路由
 *   Cores.load('export').then(function (EXP) { ... })     // 点「导出图片」时才要
 *   三个一起拿：Cores.loadAll().then(function (m) { m.registry / m.analyzer / m.export })
 *
 * 三端行为（接口完全一致，只是「从哪拿」不同）
 *   · 小程序      ：首次 load 时 wx.loadSubpackage 拉分包 → 官方 require.async 取模块（基础库 2.11.2+）；
 *                   取到的模块**缓存**，同一 key 只拉一次，之后秒回。
 *   · Node / uni-app：源码树完整，直接同步 require（外面包一层 Promise，接口一样）。
 *   · PWA         ：各模块由 <script> 挂在 NT.*，直接取全局（PWA 本就全量同步加载，无分包概念）；
 *                   本文件**不列进 PWA 清单**，PWA 壳走自己的 NT.*，故这里只是接口对齐的兜底分支。
 *   失败一律 resolve(null)、**绝不 reject** —— 上层给「引擎未就绪」之类的兜底提示，
 *   不静默假装算得出（宁可让用户重试，也不给假结果）。
 *
 * 注意：本文件在**主包**里，所以对分包文件的引用一律走 `require.async`（官方跨包取码）
 *       或间接调用，**绝不能出现指向分包文件的静态 require** —— 微信会判定「主包引用分包」非法，
 *       启动即抛「module ... is not defined」（v3.1.37 修的就是这个坑，构建期已有护栏拦它）。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    var isMP = (typeof wx !== 'undefined' && typeof wx.loadSubpackage === 'function');
    // 小程序端两个参数都不注入（它只能走 require.async 拉分包）；
    // Node / uni-app 注入同步 require（源码树完整，直接加载）。
    module.exports = factory(root, isMP, isMP ? null : require);
  } else {
    root.NT = root.NT || {};
    root.NT.cores = factory(root, false, null);
  }
})(typeof self !== 'undefined' ? self : this, function (root, isMP, syncRequire) {

  // 分包名（与 tools/platform-modules.json 的 subPackages 键、app.json 的 subPackages[].name 一致）
  var PKG = 'occupy-cores';

  /**
   * 三个入口模块，每个三条取用路径：
   *   · mp     —— 小程序：一次 require.async 调用。**路径必须是静态字符串字面量**，
   *               微信的依赖分析才认得出（动态拼接的路径解析不到，会静默失败），故逐个写死。
   *               路径基准 = 本文件（utils/modules/HomeModule/）：上三级到包根，再进分包。
   *   · sync   —— Node / uni-app：相对本文件的源码树路径（经 syncRequire 间接调用，
   *               避免微信静态分析在主包产物里留下指向分包文件的 require）。
   *   · global —— PWA：模块在 <script> 里挂上的全局名。
   */
  var MODS = {
    registry: {
      mp: function (ok, fail) { require.async('../../../occupy-cores/utils/modules/features/registry.js', ok, fail); },
      sync: '../features/registry.js',
      global: 'features'
    },
    analyzer: {
      mp: function (ok, fail) { require.async('../../../occupy-cores/utils/modules/AnalyzerModule/analyzer.js', ok, fail); },
      sync: '../AnalyzerModule/analyzer.js',
      global: 'analyzer'
    },
    export: {
      mp: function (ok, fail) { require.async('../../../occupy-cores/utils/modules/ExportModule/export-image.js', ok, fail); },
      sync: '../ExportModule/export-image.js',
      global: 'exportImage'
    }
  };

  var cache = {};   // key → 已取到的模块（**只缓存成功的**，失败可重试）

  // 非小程序路径：同步 require（Node/uni-app）或取全局（PWA）
  function loadSync(key) {
    var def = MODS[key];
    if (!def) return null;
    if (syncRequire) { try { return syncRequire(def.sync) || null; } catch (e) { return null; } }
    var g = root && root.NT;
    return (g && g[def.global]) || null;
  }

  // 小程序路径：先确保分包下载完成，再 require.async 取模块
  function loadMP(key) {
    var def = MODS[key];
    if (!def || typeof require.async !== 'function') return Promise.resolve(null);
    return new Promise(function (resolve) {
      var take = function () {
        try { def.mp(function (m) { resolve(m || null); }, function () { resolve(null); }); }
        catch (e) { resolve(null); }
      };
      if (typeof wx !== 'undefined' && typeof wx.loadSubpackage === 'function') {
        // 首次会走网络下载分包；已下载则立即回调。失败就放弃这次，由上层提示。
        try { wx.loadSubpackage({ name: PKG, success: take, fail: function () { resolve(null); } }); }
        catch (e) { take(); }
      } else { take(); }
    });
  }

  /**
   * 取一个模块。返回 Promise<模块|null>。同一 key 成功取到后走缓存，后续同步秒回。
   */
  function load(key) {
    if (!MODS[key]) return Promise.resolve(null);
    if (cache[key]) return Promise.resolve(cache[key]);
    return (isMP ? loadMP(key) : Promise.resolve(loadSync(key))).then(function (m) {
      if (m) cache[key] = m;
      return m;
    });
  }

  /** 三个模块一起取（少写几层 then）。 */
  function loadAll() {
    return Promise.all([load('registry'), load('analyzer'), load('export')])
      .then(function (r) { return { registry: r[0], analyzer: r[1], export: r[2] }; });
  }

  return { load: load, loadAll: loadAll, isMP: isMP, PKG: PKG };
});
