/**
 * modules/HomeModule/cores-loader.js —— 「算法内核」按需取用器【单一真源】
 *
 * 为什么要它
 *   主人要求：**主包只装起始页 UI，其他页面 / 算法 / 功能都在需要时才加载**。
 *   于是小程序端把「全部算法」整体挪进分包 `occupy-cores`：
 *     · CoreModule/*        全部内核（含 solarlunar 历法底座 427KB）
 *     · features/registry.js 功能注册表（190KB，触发词路由单一真源）
 *     · AnalyzerModule/*     分析装配层（把内核结果组织成给用户看的正文）
 *
 *   v3.2.0 起 **ExportModule/*（导出图片）已移进主包**：分包体积 2.059MB 超了微信
 *   「单分包 ≤ 2MB」硬限，而导出图片不依赖任何内核、只在结果页点按钮时才用，
 *   挪进主包后主包 0.494MB、分包 1.96MB，两边都在限内。
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
    // ⚠ 判据只能是「存在 wx 全局」，**不能**用 `wx.loadSubpackage`：
    //   本文件同样在 app.js 的 require 序列里（App() 尚未执行），此时微信还没注入
    //   wx.loadSubpackage，用它判定会误判成 Node 端 → 传进同步 require → 走错分支。
    //   v3.1.40 在 settings.js 上踩过这个坑，这里同步修正（详见 settings.js 里的详细说明）。
    var isMP = (typeof wx !== 'undefined');
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
      // ⚠⚠ 两个必须同时满足的硬约束（v3.1.43 真机「页面永远进不去」的根因）：
      //   ① **路径必须是字符串字面量、直接写在 require.async(...) 实参位置** ——
      //      微信要在编译期静态分析出「主包依赖哪个分包文件」；写成变量（如 def.path）它认不出，
      //      不会登记这条依赖 → 运行时永远拿不到（且不报错）。
      //   ② **require.async 只接 1 个参数，返回 Promise**（官方《分包异步化》口径）——
      //      回调风格是 require(path, ok, fail)，两者别混；给 require.async 传 callback 会被静默忽略。
      mp: function () { return require.async('../../../occupy-cores/utils/modules/features/registry.js'); },
      sync: '../features/registry.js',
      global: 'features'
    },
    analyzer: {
      mp: function () { return require.async('../../../occupy-cores/utils/modules/AnalyzerModule/analyzer.js'); },
      sync: '../AnalyzerModule/analyzer.js',
      global: 'analyzer'
    },
    export: {
      // v3.2.0：导出图片模块**移进主包**。原因：分包 occupy-cores 体积 2.059MB 超了微信
      // 「单分包 ≤ 2MB」硬限（整包 30MB 无虞）；导出图片版式（export-image.js 46KB + qrcode.js 57KB）
      // 不依赖任何内核、只在结果页点「导出图片」时才用，挪进主包最划算：
      // 主包 0.396MB → 0.494MB（仍远在 2MB 红线内），分包 2.059MB → 1.96MB（回到限内）。
      // 它在主包里，故可用**静态 require**（微信的禁令只针对「主包引用分包文件」，
      // 同在主包互引是合法的）——不需要再走 require.async，也**不必下载分包**（main: true）。
      main: true,
      mp: function () { return require('../ExportModule/export-image.js'); },
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

  // 加载兜底超时（毫秒）。正常路径：分包下载 + 模块执行，实测约 1 秒内完成；
  //   取 6 秒是为了容忍弱网下的分包下载。**超时必须存在**：require.async 没有 fail 回调，
  //   一旦模块加载出问题就零回调，没有超时就会「无报错但页面永远进不去」（v3.1.43 真机实测）。
  var LOAD_TIMEOUT_MS = 6000;

  // 小程序路径：主包内模块直接取；分包内模块先确保分包下载完成，再 require.async 取模块。
  //   返回的 Promise **保证在 LOAD_TIMEOUT_MS 内 settle**（要么拿到模块/ null，要么超时 null），
  //   绝不永久 pending —— 上层的「正在加载引擎」提示与兜底文案才有机会出现。
  function loadMP(key) {
    var def = MODS[key];
    // 主包内模块（main: true）不需要 require.async；其余走分包异步化，必须有 require.async。
    if (!def || (!def.main && typeof require.async !== 'function')) return Promise.resolve(null);
    return new Promise(function (resolve) {
      // resolve 幂等：超时后回调又来了，也不会重复 settle（Promise 本身只认第一次，这里显式标记便于早退）
      var done = false;
      var finish = function (m) { if (done) return; done = true; clearTimeout(timer); resolve(m || null); };
      var timer = setTimeout(function () { finish(null); }, LOAD_TIMEOUT_MS);

      var take = function () {
        try {
          // def.mp() 内部就是 `return require.async('<字面量>')`，返回 Promise（见 MODS 注释）。
          var r = def.mp();
          if (r && typeof r.then === 'function') {
            r.then(function (m) { finish(m); }, function () { finish(null); });
          } else {
            finish(r || null);   // 兜底：万一某环境 require.async 直接返回模块
          }
        } catch (e) { finish(null); }
      };
      if (def.main) {
        // 主包内模块（v3.2.0 的导出图片）：**不必下载分包**，直接取。
        // 走 require.async 也行，但主包内同步 require 最直接、也最省一次分包下载。
        take();
      } else if (typeof wx !== 'undefined' && typeof wx.loadSubpackage === 'function') {
        // 首次会走网络下载分包；已下载则立即回调。
        try {
          wx.loadSubpackage({ name: PKG, success: take, fail: function () { finish(null); } });
        } catch (e) { take(); }
      } else {
        // 没有 loadSubpackage（如某些环境）→ 直接试 require.async
        take();
      }
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
