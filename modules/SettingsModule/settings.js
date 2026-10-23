/**
 * modules/SettingsModule/settings.js —— 关于面板数据（品牌 / 简介 / 版本 / 备案 / 版权 / 更新日志）【单一真源】
 * 三端关于面板与页脚都从这里取（about()），不另写一份。
 * 3.0.2 起按《玄玖灵犀 NT-Xhex.sketch》设计稿重构「关于」体系为两级：
 *   关于页(4 卡) ─┬─ 参考文献 / 功能介绍   → 内容详情页（back 回「关于」）
 *                 ├─ 关于我们            → 「关于我们」页(3 卡) ─┬─ 星玖工作室 / 协议条款 / 开源声明 → 内容详情页（back 回「关于我们」）
 *                 └─ 清除数据(红)        → 就地弹「清除缓存」确认弹窗（不跳页）
 * v3.2.2：「参考文献」页为纯书目（只列书名与作者、按功能板块分组），单一真源在
 *   RefsModule/refs.js（纯数据模块，不依赖任何内核；v3.1.57 起曾附「公版古籍可查原文」区，
 *   已按用户要求精简移除，原文另见仓库 refs-texts/ 资料库）。小程序端用主包快照
 *   HomeModule/refs-snapshot.js 同步秒开，Node/uni-app 运行时 require 真源，PWA 取全局 NT.refs。
 * 依赖：StorageModule/storage.js（清缓存用）、features/registry.js（「功能介绍」页的功能总览）、
 *       RefsModule/refs.js（「参考文献」页的书目与可查原文）
 * 加载：UMD —— 小程序/uni-app/Node 被 require（storage/registry/refs 相对路径注入）；浏览器挂到全局 NT.settings。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // 小程序端**绝对不能**碰分包里的 features/registry.js —— 微信只在本包里找模块，
    //   一取就抛「module 'utils/modules/features/registry.js' is not defined」，
    //   整条启动链（app.js → settings.js）断掉、页面全部未注册（v3.1.37~v3.1.40 连续三次同源事故）。
    //
    // ⚠⚠ v3.1.40 血泪教训：**判定小程序端绝不能用 `wx.loadSubpackage` 做判据**。
    //   本文件是被 **app.js 第 6 行 require 的**，那时 `App()` 还没执行、微信尚未注入
    //   `wx.loadSubpackage` → `typeof wx.loadSubpackage === 'function'` 为 **false**
    //   → 误判成 Node/浏览器 → 走进 require 分支 → 启动即崩。
    //   这正是前两次「加了判定却没修好」的真因：**判定条件本身在启动链上就不成立**。
    //
    // ✅ 正确判据：**存在 `wx` 全局即小程序端**。它在 app.js 执行前就已注入，
    //   在整个启动链上恒为真，且不依赖任何尚未就绪的 API。
    var __isMP = (typeof wx !== 'undefined');
    // 路径**运行时拼接**：微信静态依赖分析只认完整字符串字面量，拼接后编译期扫不到这个路径，
    //   不会判「主包引用分包」（构建期护栏 sync-mp --check 第五道也按此口径放行）。
    //   两条保险互补：__isMP 保证**运行时不取**（小程序端），拼接保证**编译期不判非法**。
    var __p = '../features/' + 'registry.js';
    // 「功能介绍」页的功能总览**快照**（主包内、约 9KB，由 tools/sync-mp.js 生成）：
    //   小程序端专用 —— 介绍页只需要纯数据，有它就不必加载整个分包（registry 顶层 require 了
    //   37 个内核、约 2MB，真机实测卡 2991ms）。源码树里没有此文件（生成产物），故 try 兜底。
    var __cat = null;
    try { __cat = require('../HomeModule/catalog.js'); } catch (e) { __cat = null; }
    // 「参考文献」页的书目 + 公版古籍可查原文（v3.1.57）：单一真源在 RefsModule/refs.js，
    //   它与内核同住分包 occupy-cores，主包不能静态 require —— 同样走「主包快照」机制：
    //   tools/sync-mp.js 构建期在 Node 里跑 refs.js 的 refsPage()，快照成 HomeModule/refs-snapshot.js
    //   放进主包（源码树无此文件，try 兜底）；Node/uni-app 端不走快照，直接 require 真源（路径运行时拼接，
    //   与 registry 同一套防静态分析写法；小程序端 __isMP 保证运行时不取分包）。
    var __refsSnap = null;
    try { __refsSnap = require('../HomeModule/refs-snapshot.js'); } catch (e) { __refsSnap = null; }
    var __rp = '../RefsModule/' + 'refs.js';
    module.exports = factory(require, __isMP ? null : require(__p), __cat, __isMP ? null : require(__rp), __refsSnap);
  }
  else { root.NT = root.NT || {}; root.NT.settings = factory(null, root.NT.features || null, null, root.NT.refs || null, null); }
})(typeof self !== 'undefined' ? self : this, function (require, REG, CATALOG_SNAP, REFS, REFS_SNAP) {
  // 跨模块依赖 storage：Node 用相对路径 require；浏览器用已挂载的全局 NT.storage
  var S;
  if (typeof module === 'object' && module.exports) {
    S = require('../StorageModule/storage.js');
  } else {
    var NS = (typeof self !== 'undefined' && self) ? self : this;
    S = (NS && NS.NT ? NS.NT.storage : null);
  }

  // 本应用使用到的开源项目及其协议（供「开源声明」页正文引用，单一真源）
  //   ⚖️ 合规要求：这里的清单必须与仓库根 NOTICE、README「十一、许可与开源声明」逐项一致；
  //      内嵌库的版权与许可全文在 modules/CoreModule/vendor/*.LICENSE.txt 与
  //      modules/ExportModule/qrcode.LICENSE.txt；MIT 要求保留版权声明，不得删除。
  //      构建期依赖（uni-app / vue / sass）不随发布产物分发，故不在本页列示（见 NOTICE 第三节）。
  var DEPS = [
    {
      name: 'lunar-javascript', ver: 'v1.6.x', lic: 'MIT', holder: 'Copyright (c) 6tail',
      why: '历法内核：公历↔农历、节气、干支纪年月日时、纳音、神煞、四柱的精确离线算法（内嵌于 solarlunar.js，内部算法未改，不联网）',
      url: 'https://github.com/6tail/lunar-javascript'
    },
    {
      name: 'iztro', ver: '2.6.2', lic: 'MIT', holder: 'Copyright (c) SylarLong',
      why: '紫微斗数安星引擎：十二宫、四化、大限（内嵌于 vendor/iztro.min.js，未修改，不联网）',
      url: 'https://github.com/SylarLong/iztro'
    },
    {
      name: 'QR Code Generator for JavaScript', ver: '—', lic: 'MIT', holder: 'Copyright (c) 2009 Kazuhiko Arase',
      why: '导出图片右下角离线二维码的矢量绘制（内嵌于 ExportModule/qrcode.js，未修改，不联网；QR Code 为 DENSO WAVE 注册商标）',
      url: 'http://www.d-project.com/'
    },
    {
      name: 'chinese-days', ver: '—', lic: 'MIT', holder: 'Copyright (c) 2024 Yawei sun',
      why: '法定节假日的编排格式参照（放假日 / 调休补班 / 调休补休）；数据本身抄自国务院办公厅历年放假公告，未复制其源代码、未引入其 npm 包',
      url: 'https://github.com/Shonee/chinese-days'
    }
  ];

  // ===== 「功能介绍」页的功能总览（唯一来源 = features/registry.js 的 catalog()）=====
  //   为什么在数据层拼：三端的内容详情页都只吃 aboutNotes[id] = [{h, text}]，所以只要这里把
  //   板块分组拼成同样的结构，PWA / 小程序 / uni-app 的渲染代码一行都不用改，也不会各写一份。
  //   为什么不在本文件写死清单：功能一增一减就会漏改，界面上就会出现「功能介绍里没有这个功能」。
  var CN_ORDER = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

  // 注入 registry（小程序端专用）：主包不能静态 require 分包里的 features/registry.js，
  //   故壳在打开「功能介绍」前先 Cores.load('registry')，再把结果 setRegistry 进来。
  function setRegistry(R) { if (R) REG = R; }

  // 取功能总览：REG 是构建期/加载期注入的 registry（Node / uni-app 走静态 require，
  // 避免在 ESM 化的 uni-app 里 typeof module/require 判断失效）；PWA 在工厂调用时取 NT.features；
  // 小程序由壳经 setRegistry 注入。
  function catalogOf() {
    var R = REG;
    if (!R) {
      try {
        var NS = (typeof self !== 'undefined' && self) ? self : this;
        R = NS && NS.NT && NS.NT.features;
      } catch (e) { R = null; }
    }
    if (R && R.catalog) return R.catalog();
    // 小程序端路径：registry 在分包里（加载它要 3 秒），而介绍页只需要"板块/短名/名/简介"这点纯数据，
    //   故优先用构建期生成的**主包快照** —— 介绍页**瞬间打开**，不碰分包。
    if (CATALOG_SNAP && CATALOG_SNAP.length) return CATALOG_SNAP;
    return [];
  }

  // ===== 「参考文献」页的书目清单（单一真源 = RefsModule/refs.js）=====
  //   与功能介绍同构：三端详情页只吃 [{h,text}]，这里只负责「取到 refs 模块 → 出条目」。
  //   小程序端 REG/REFS 为 null（不许主包碰分包），吃主包快照 REFS_SNAP；
  //   Node/uni-app 端 REFS 是真源（settings.js 的 UMD 头已 require 进来）；
  //   PWA 端 REFS = 全局 NT.refs（refs.js 先于本文件加载）。
  //   两边都取不到时给一句实话（清单没取到），不留白、不假装「没有文献」。
  function refsPageOf() {
    if (REFS && REFS.refsPage) return REFS.refsPage();
    if (REFS_SNAP && REFS_SNAP.length) return REFS_SNAP;
    return [{ h: '参考文献', text: '书目数据未加载（RefsModule 未进包），请重新导入小程序包或刷新网页版。' }];
  }

  // fixed = [怎么切换主题, 怎么用, 示例, 更新日志]（这 4 条不随功能增减变化）
  // 返回顺序：怎么切换主题（用户要求置顶）→ 怎么用 → 能问什么（总览）→ 各板块 → 示例 → 更新日志
  function introPage(fixed) {
    var out = [fixed[0], fixed[1]];
    var cat = catalogOf();
    if (!cat.length) {
      // 加载顺序异常时不留白，也不假装「没有功能」，直接说清单没取到
      out.push({ h: '能问什么', text: '功能清单未取到（features/registry.js 未加载不进包），请重新导入小程序包或刷新网页版。' });
      out.push(fixed[2], fixed[3]);
      return out;
    }
    var total = 0;
    cat.forEach(function (b) { total += b.项数; });
    var sum = cat.map(function (b) { return b.板块 + ' ' + b.项数 + ' 项'; }).join(' · ');
    out.push({
      h: '能问什么',
      text: '共 ' + cat.length + ' 大板块、' + total + ' 项功能：' + sum + '。\n'
        + '每一项都能直接在首页搜索框里问：写「短名」即可（如「排八字」「查吉日」），也可以按你自己的说法问；缺生辰、性别这类必要信息时会当场追问你。\n'
        + '问天气、热点、在线求解这类超纲内容，统一回「抱歉，NT-Xhex 知识库仅限玄学与传统文化领域」。'
    });
    cat.forEach(function (b, i) {
      var lines = [b.说明];
      b.items.forEach(function (it) { lines.push(it.短名 + '｜' + it.简介); });
      out.push({ h: (CN_ORDER[i] || String(i + 1)) + '、' + b.板块 + ' · ' + b.项数 + ' 项', text: lines.join('\n') });
    });
    out.push(fixed[2], fixed[3]);
    return out;
  }

  return {
    // 关于我们：版权/简介/版本/备案（统一品牌信息，单一真源）
    about: function () {
      var version = 'v3.4.0'; // 唯一版本真值；由 tools/sync-version.js 从 version.json 同步，勿手改第二份
      return {
        name: '玄玖灵犀', en: 'NT-Xhex', version: version,
        desc: '中国传统术数文献整理、校勘与数字化演算的学术研究辅助工具。',
        slogan: '演乾坤 · 知天命',
        icp: '蜀ICP备2026027050号',
        footerCopy: '©2024-2026 Ntarstudio. All Rights Reserved.',

        // —— 开屏页（设计稿 开屏：品牌 Logo + 玄玖灵犀 28pt + 演乾坤·知天命 12pt 黑30% + 备案）——
        splash: { title: '玄玖灵犀', sub: '演乾坤 · 知天命' },

        // —— 导出图片版式文案（单一真源：PWA 与小程序的「导出图片」按钮都从这里取，不在壳里各写一份）——
        //   v3.1.1 起按新设计稿「导出图片格式」画板重排：品牌头右对齐 → 两条 1px 黑线夹住的
        //   文本区（推演信息＋玄玖灵犀推演结果两段，离线各 18px）→ 页脚 4 行 + 右下角两个矢量码
        //   （网页二维码 + 小程序码，均 Canvas 矢量逐格绘制、非 PNG；守黑白灰）。
        exportMeta: {
          brand: '玄玖灵犀',
          slogan: '演乾坤 · 知天命',
          questionLabel: '你的提问',
          infoLabel: '推演信息：',          // 文本区第一段小标题（设计稿「推演信息：」，18pt 黑100%）
          resultLabel: '玄玖灵犀推演结果：', // 文本区第二段小标题（设计稿「玄玖灵犀推演结果：」）
          // 页脚前三行（设计稿）；第四行「导出时间」由 export-image.js 动态追加
          footLines: [
            '仅本地生成 · 未经任何上传与存储',
            '小程序：玄玖灵犀（公众号同名）',
            '网页版：https://yi.ntars.cn/'
          ],
          miniCodeLabel: '小程序',
          // 第二个码「小程序码」：全离线、appid 未配置，无法生成可扫真码 → 默认空串，
          // export-image.js 就画成「圆角方框 + N·T 品牌字标 + 小程序」矢量占位（非 PNG）。
          // 若日后拿到可扫的小程序入口 URL，填到 miniQrUrl 即自动改成真实可扫二维码。
          miniQrUrl: '',
          qrUrl: 'https://yi.ntars.cn/'   // 第一个码（网页二维码）内容，扫码开网页版；纯数据、不联网
        },

        // —— 起始页（首页输入态；设计稿 起始页）——
        // 搜索框常驻文案（固定一句，不轮换）。
        //   出处：用户 2026-10-22 指定「搜索框固定显示：今天想了解点什么」。
        //   为什么固定一句：本应用所有功能都由生辰驱动，一条生辰就能跑齐全套排盘，
        //   首页不需要再用 9 条示例词去教"能问什么"——一句轻提示足够，视觉也更干净。
        //   ⚠️ 宽度上限：胶囊内可用横向空间 200pt（272 − 左内边距 24 − 右端放大镜键 48），
        //      17pt 字下约合 9 个汉字（≈153pt）；「今天想了解点什么」8 字，安全。
        //   ⚠️ 改词后必须重跑 modules/features/__tests__/catalog.test.js（它会校验本字段非空）。
        searchPlaceholder: '今天想了解点什么',
        homeDisclaimer: '内容仅供交流学习',

        // —— 关于页(顶级) 4 张卡（设计稿 关于页：354×84 卡、卡距 16pt；标题 17pt/600 + 描述 15pt 黑50%）——
        // 顺序 = 设计稿自上而下：参考文献 / 功能介绍 / 关于我们 / 清除数据(红)。
        // id='us' 的项点进「关于我们」页(二级)；refs/intro 直接进内容详情页；danger 项就地弹窗。
        aboutRows: [
          { id: 'refs',  title: '参考文献', desc: '本应用的算法依据与来源' },
          { id: 'intro', title: '功能介绍', desc: '查阅本应用的功能和算法' },
          { id: 'us',    title: '关于我们', desc: '了解相关开源声明与条款' },
          { id: 'clear', title: '清除数据', desc: '将清除本应用所有本地缓存', danger: true }
        ],

        // —— 关于我们(二级) 3 张卡（设计稿 关于我们：星玖工作室 / 协议条款 / 开源声明）——
        usRows: [
          { id: 'studio', title: '星玖工作室', desc: '联系我们与反馈建议' },
          { id: 'terms',  title: '协议条款',   desc: '此应用使用前应阅读本应用协议' },
          { id: 'open',   title: '开源声明',   desc: '本应用所有代码采用“AGPL-3.0 协议”开源' }
        ],

        // —— 内容详情页标题（5 个内容子页一稿两用；清除数据不走此页，只弹窗）——
        resTitle: { refs: '参考文献', intro: '功能介绍', studio: '星玖工作室', terms: '协议条款', open: '开源声明' },

        // 「关于我们」页（二级）导航标题（设计稿 关于我们：顶栏标题「关于我们」）
        usPageTitle: '关于我们',

        // —— 结果页 / 内容详情页 的「顶栏标题 + 页名」两级文字（设计稿：顶栏标题图层名「页面标题」内容「玄玖灵犀」，
        //    页名 140,130 122×44 17pt 居中，紧贴正文卡上沿）——
        // 设计稿这两处各页都是同一份，故提到 here 单一真源，壳不写死。
        navTitle: '玄玖灵犀',
        resultPageTitle: '搜索结果',
        // 结果页正文内的分区标题（设计稿 搜索结果页：正文先回显提问、再给答案）
        questionLabel: '你的提问',

        // —— 结果页底部双按钮文案（设计稿 搜索结果页：导出图片 24,726 153×48 描边；再问一个 225,726 153×48 黑底）——
        resultActions: { export: '导出图片', again: '再问一个' },

        // 内容详情页返回指向（决定「‹」回哪一级）：关于页直接项回「关于」；关于我们页 3 项回「关于我们」
        backTarget: { refs: 'about', intro: 'about', studio: 'us', terms: 'us', open: 'us' },

        // —— 内容详情页正文（§内容页：306×552 范围内顶格排版，15pt 苹方黑；示例统一用虚构人设「白玖玖」）——
        // 每项 = [{h:小标题, text:正文}]，壳只负责遍历渲染，不在壳里另写文案。
        aboutNotes: {
          // 参考文献（v3.2.2 精简：只列书名与作者、按功能板块分组；单一真源 = RefsModule/refs.js）：
          //   书目表在 refs.js 的 BOOKS/GROUPS；小程序端经主包快照 HomeModule/refs-snapshot.js
          //   同步取（见 refsPageOf），不加载分包、不抄一份。
          //   铁律：只列代码注释中已实际标注的来源，不臆造书名/作者；公版古籍原文另见仓库
          //   refs-texts/ 资料库（本页不载原文）；数字八字为本项目独有体系，无外部文献故不列。
          refs: refsPageOf(),
          // 功能介绍（设计稿：含怎样使用、示例、更新日志）
          // ⚠️ 用户要求「切换主题的方法」放在本页**置顶**（第一条即它），其余条目顺延。
          // ⚠️ 功能总览（几大板块 / 多少项）一律由 introPage() 从 features/registry.js 的
          //    catalog() 派生：加功能只改 registry，本页自动跟上，**不在本文件里再抄一份清单**。
          //    传进来的 4 条是「不随功能增减变化」的固定文案（主题 / 怎么用 / 示例 / 更新日志）。
          intro: introPage([
            { h: '怎么切换主题', text: '主题只有两种来源，不再按时辰自动切：① 跟随系统——读得出你设备/系统的浅色或深色模式时，界面就跟着系统走（系统深色→深色界面，系统浅色→浅色界面）；② 搜索框关键词手动切——在首页搜索框输入「切换主题」后回车（或点放大镜），即在浅色与深色间翻转并记住，也可以说「换个主题」「深色模式」「浅色模式」「暗黑」「反色」等同义说法，命中即切换、不进结果页。你手动选过之后，系统模式就不再干预（清除缓存则回落跟随系统）。切换时底色/纸面/文字/图标做 320ms 平滑过渡。' },
            { h: '怎么用', text: '在首页搜索框输入一句信息或问题（可带姓名、生辰、问题），点击放大镜「发送」，即可在结果页看到「标题 + 术语 + 详情 + 白话 + 参考」的结构化答案；点「再问一个」回到首页。' },
            { h: '示例（白玖玖）', text: '输入「白玖玖，女，2005年6月9日子时」→ 返回四柱干支、日主旺衰、十神与一句白话解读；也可输入「梦见蛇」查解梦、「抽一签」求观音灵签。' },
            { h: '更新日志', text: 'v3.2.2：生辰四种写法与网页端就位——① 搜索框只认国历、农历、四柱、八字四种生辰写法，农历日期经历法底座换算后排盘，其余输入就地弹窗提醒、不跳结果页；② 网页端 PWA 移入仓库根目录，EdgeOne Pages 自动部署开箱即用。\nv3.2.1：生辰驱动全套排盘——输入一个生辰，万年历黄历、八字命理、紫微斗数、六爻占卜、奇门遁甲、大六壬、梅花易数、风水堪舆八大类按序一次跑齐；结果页支持多算法并列。\nv3.2.0：功能聚焦八类——八字命理、紫微斗数、六爻纳甲、奇门遁甲、大六壬、梅花易数、风水堪舆、解梦灵签，连同黄历万年历与择日共 31 项；小程序包体压进双红线。\nv3.1.8：搜索框补齐八套演算法——八字格局与喜用神、择日学、奇门吉凶格局、六壬毕法赋、六爻旺衰进阶、紫微四化流运、八字神煞与合婚。\nv3.1.0：模块化与搜索框单一入口——内核编号体系统一管理、触发词最长优先路由、排盘几何黄金盘逐宫锁死；按设计稿重建视觉与动效体系（开屏品牌交接、黑白双主题、无描边分层）；小程序分包懒加载，主包只装起始页。\nv3.0：从零重写为纯离线玄学计算器——无后端、无网络、无登录；精确离线历法（节气定四柱、五虎遁五鼠遁、建除十二神、日主旺衰）；三视图单轮问答。\nv1.x：玄玖灵犀初代——万年历与干支黄历的离线查询工具（PWA + 微信小程序）。' }
          ]),
          // 星玖工作室（应用介绍 + 工作室介绍 + 官网 + 三个在营项目官网 + 各渠道联系方式）
          //   v3.4.0：工作室项目由「5 个地址」收敛为「3 个在营项目」——原玄玖数据库（k）、
          //   玄玖测试题（q）已下线，故删除；新增玄宠 NT-Dpet、玄玖大模型 NT-Sine。
          studio: [
            { h: '应用介绍', text: '玄玖灵犀 NT-Xhex：中国传统术数文献整理、校勘与数字化演算的学术研究辅助工具。无后端、无网络、无登录、无大模型，所有推算在你设备本地完成，不收集、不外传任何数据；内容与结论仅供传统文化学习与学术研究参考，不构成任何预测、建议或决策依据。' },
            { h: '工作室', text: '星玖工作室 Ntarstudio，由白玖玖主理（微信号 Ntarso）。旗下三个在营项目：玄玖灵犀 NT-Xhex（传统文化术数文献数字化工具）、玄宠 NT-Dpet、玄玖大模型 NT-Sine。' },
            { h: '官网', text: 'https://www.ntars.cn/' },
            { h: '玄玖灵犀 NT-Xhex · 网页版', text: 'https://yi.ntars.cn/' },
            { h: '玄宠 NT-Dpet · 官网', text: 'https://pet.ntars.cn/' },
            { h: '玄玖大模型 NT-Sine · 官网', text: 'https://ai.ntars.cn/' },
            { h: '各渠道联系方式', text: '微信公众平台「玄玖灵犀」（微信号 Ntarso）；邮箱与渠道信息见官网 https://www.ntars.cn/ 的「联系」页。' }
          ],
          // 协议条款（设计稿：仿腾讯系应用各项协议，格式和风格详尽；示例统一用「白玖玖」）
          terms: [
            { h: '一、总则', text: '1.1 本应用「玄玖灵犀 NT-Xhex」由星玖工作室 Ntarstudio 开发并提供。你继续访问或使用本应用，即视为你已阅读、理解并同意本协议全部条款；若不同意，请停止使用。' },
            { h: '二、服务性质与内容边界', text: '2.1 本应用定位于中国传统文化与古籍整理领域，仅提供八类术数古籍知识体系（八字命理、紫微斗数、六爻纳甲、奇门遁甲、大六壬、梅花易数、风水堪舆、解梦灵签）与干支节气等历法常识的本地整理、校勘与数字化演算，属传统文化学习与学术研究辅助，不构成命理、医疗、投资、法律或任何其他专业建议，不对任何具体事项作出预测或决策依据。' },
            { h: '三、知识产权', text: '3.1 本应用代码以 GNU AGPL v3.0 协议开源，但界面、品牌「玄玖灵犀 NT-Xhex」、版式与设计归 Ntarstudio 所有，第三方不得盗用品牌标识。' },
            { h: '四、个人信息与隐私', text: '4.1 本应用无账号、无登录、无网络上传。你所输入的信息（如示例中的白玖玖生辰）仅保存在你本机本地缓存，用于离线推算，「清除数据」即可全部删除，我们不收集、不上传、不共享。' },
            { h: '五、免责', text: '5.1 内容与结论仅供传统文化学习与学术研究参考，非科学结论，不构成任何预测、建议或决策依据。你依本应用结果所做的任何决定，责任自负；对因使用本应用而产生的直接 / 间接损失，Ntarstudio 不承担责任。' },
            { h: '六、协议的变更与适用', text: '6.1 我们可能随版本更新调整本协议条款，重大变更会以版本说明告知。本应用受中华人民共和国法律管辖，相关争议依中国法律解决。' }
          ],
          // 开源声明（设计稿：开源方式与复刻要求 + AGPL-3.0 授权与源码获取 + 所用开源项目及协议）
          open: [
            { h: '开源方式与复刻要求', text: '本应用全部代码以 GNU AGPL v3.0（GNU Affero 通用公共许可证第 3 版）开源。你可以自由使用、复制、修改、再分发，要求是：① 保留本开源声明与版权声明；② 分发修改版时同样以 AGPL-3.0 开放对应源码；③ 若把修改版作为网络服务提供给他人使用，须按第 13 条向使用者提供对应的完整源码；④ 名称「玄玖灵犀 / NT-Xhex」、Logo、界面版式与设计稿归星玖工作室 Ntarstudio 所有——AGPL-3.0 只授予代码权利，不授予品牌与视觉资产的使用许可，修改版不得盗用品牌标识，也不得暗示原作者为其背书。复刻时请保持「无后端 / 无网络 / 无登录 / 全本地计算」的边界，不得接入网络回传用户输入。' },
            { h: 'AGPL-3.0 协议（全文与源码获取）', text: 'Copyright (C) 2026 星玖工作室 (Ntarstudio)\n\n本应用为自由软件：你可以在自由软件基金会发布的 GNU Affero 通用公共许可证第 3 版（或你选择的任何更新版本）条款下再分发和/或修改它。\n\n本应用希望其有用，但不提供任何担保，甚至不提供适销性或特定用途适用性的默示担保。详见 GNU Affero 通用公共许可证。\n\n协议全文随源码提供（仓库根目录 LICENSE 文件）：https://github.com/ntars/NT-Xhex/blob/main/LICENSE\n\n依第 13 条，通过网络与本应用交互的使用者有权获得对应源码，源码仓库：https://github.com/ntars/NT-Xhex' },
            { h: '本应用使用到的开源项目', text: '本应用除下列内嵌库外均为自研离线实现（全部内嵌、运行时不联网、不发起任何远程请求）：\n'
              + DEPS.map(function (d) { return '· ' + d.name + (d.ver && d.ver !== '—' ? ' ' + d.ver : '') + '（' + d.lic + '，' + d.holder + '）——' + d.why; }).join('\n')
              + '\n以上均为 MIT 许可，版权声明与许可全文随源码保留在 modules/CoreModule/vendor/ 与 modules/ExportModule/ 下的 *.LICENSE.txt，与本仓 NOTICE 一致。构建期依赖（uni-app / vue / sass）不随发布产物分发，清单见仓库根 NOTICE。' }
          ]
        },

        // —— 关于页 / 结果页 / 内容页 底部信息条（设计稿：黑30% / 12pt，两行居中；版本引用上面真值）——
        //   字重按 Apple HIG：12pt = Caption 1 → Regular（设计稿画得偏粗，已纠回 400）。
        aboutFoot: [
          '仅供传统文化学习与学术研究参考',
          '玄玖灵犀 ' + version + ' · 星玖工作室'
        ],

        // —— 「清除数据」卡点开后，就地在当前页弹起的确认弹窗（设计稿 弹窗：面板 354×184，标题 22pt，双按钮 135×44）——
        clearModal: {
          title: '清除缓存',
          desc: '我们不会上传和记录您的任何信息，此操作将彻底清除本应用所有的本地记录和缓存',
          cancel: '取消',
          confirm: '确认',
          done: '已彻底清除缓存'    // 清除完成后的轻提示（Toast）文案；三端都取这里，不各写一份
        },

        // —— 搜索框「只认生辰」的拦下弹窗（v3.2.2）——
        //   用户要求：搜索框只支持农历 / 国历 / 四柱 / 八字四种生辰形式；其他形式**不跳二级页**，
        //   就地在首页弹窗提醒。版式完全复用设计稿「弹窗」画板（面板 354×184 圆角 24、
        //   标题 22/26 左、描述 15/18 左 黑50%、按钮 135×44 圆角胶囊），与 clearModal 同一套样式。
        //   ⚠️ 只有两键版式：这里第二键（确定）就是「知道了」——不留「取消」，因为没有可取消的动作。
        birthModal: {
          title: '请输入生辰',
          // ⚠️ 描述必须压在 2 行内：设计稿弹窗面板固定 354×184，内容区 136pt 里
          //    标题 26+14、按钮 44 已占 84，只剩约 2 行 15/18 给描述，写长会溢出面板。
          desc: '只支持农历、国历、四柱、八字四种写法，例「2005年6月9日子时 女」。',
          confirm: '知道了',
          // 三种「拦下原因」的标题与描述（analyzer.lastReject 的取值 → 文案）
          lunarTitle: '农历日期不存在',
          lunarDesc: '该年没有这个闰月或没有这一天，请核对后重新输入。',
          pillarTitle: '四柱查不到日期',
          pillarDesc: '请检查四柱是否写错（年柱、月柱、日柱、时柱各两个字）。',
          nonmetaTitle: '不在知识范围',
          nonmetaDesc: '本应用只做玄学与传统文化的本地推演。'
        }
      };
    },

    // 清除本地数据（对话结果缓存 / 主题偏好等）
    clearData: function () { if (S && S.clearAll) S.clearAll(); },

    // 小程序端注入 registry（分包 occupy-cores 里的 features/registry.js），供「功能介绍」页取功能总览
    setRegistry: setRegistry,

    // 「关于/设置卡 点下去去哪」单一真源（v3.1.0 去重：三端不再各写一份 if/else）。
    // 输入一张卡的行（{ id, danger, ... }），返回动作：
    //   'clear'  → danger 行（清除数据）→ 就地弹确认弹窗
    //   'us'     → 关于我们 卡（id==='us'）→ 关于我们页
    //   'detail' → 其余（refs/intro/studio/terms/open）→ 各自内容详情页
    // 各壳据此分发（PWA 直接给 DOM 事件、小程序按 id 查出行、uni 直接绑 row），判定只此一份。
    rowAction: function (row) {
      if (!row) return null;
      if (row.danger) return 'clear';
      if (row.id === 'us') return 'us';
      return 'detail';
    }
  };
});
