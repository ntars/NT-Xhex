/**
 * modules/SettingsModule/settings.js —— 关于面板数据（品牌 / 简介 / 版本 / 备案 / 版权 / 更新日志）【单一真源】
 * 三端关于面板与页脚都从这里取（about()），不另写一份。
 * 3.0.2 起按《玄玖灵犀 NT-Xhex.sketch》设计稿重构「关于」体系为两级：
 *   关于页(4 卡) ─┬─ 参考文献 / 功能介绍   → 内容详情页（back 回「关于」）
 *                 ├─ 关于我们            → 「关于我们」页(3 卡) ─┬─ 星玖工作室 / 协议条款 / 开源声明 → 内容详情页（back 回「关于我们」）
 *                 └─ 清除数据(红)        → 就地弹「清除缓存」确认弹窗（不跳页）
 * 依赖：StorageModule/storage.js（清缓存用）、features/registry.js（「功能介绍」页的功能总览）
 * 加载：UMD —— 小程序/uni-app/Node 被 require（storage 与 registry 相对路径注入）；浏览器挂到全局 NT.settings。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require, require('../features/registry.js'));
  else { root.NT = root.NT || {}; root.NT.settings = factory(null, root.NT.features || null); }
})(typeof self !== 'undefined' ? self : this, function (require, REG) {
  // 跨模块依赖 storage：Node 用相对路径 require；浏览器用已挂载的全局 NT.storage
  var S;
  if (typeof module === 'object' && module.exports) {
    S = require('../StorageModule/storage.js');
  } else {
    var NS = (typeof self !== 'undefined' && self) ? self : this;
    S = (NS && NS.NT ? NS.NT.storage : null);
  }

  // 本应用使用到的开源项目及其协议（供「开源声明」页正文引用，单一真源）
  var DEPS = [
    { name: 'lunar-javascript', ver: 'v1.6.x', lic: 'MIT', why: '历法内核参考：干支 / 节气 / 四柱 / 建除的精确离线算法口径（本仓内自实现、无运行时联网）' }
  ];

  // ===== 「功能介绍」页的功能总览（唯一来源 = features/registry.js 的 catalog()）=====
  //   为什么在数据层拼：三端的内容详情页都只吃 aboutNotes[id] = [{h, text}]，所以只要这里把
  //   板块分组拼成同样的结构，PWA / 小程序 / uni-app 的渲染代码一行都不用改，也不会各写一份。
  //   为什么不在本文件写死清单：功能一增一减就会漏改，界面上就会出现「功能介绍里没有这个功能」。
  var CN_ORDER = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

  // 取功能总览：REG 是构建期/加载期注入的 registry（Node / 小程序 / uni-app 都走静态 require，
  // 避免在 ESM 化的 uni-app 里 typeof module/require 判断失效）；浏览器在工厂调用时取 NT.features。
  function catalogOf() {
    var R = REG;
    if (!R) {
      try {
        var NS = (typeof self !== 'undefined' && self) ? self : this;
        R = NS && NS.NT && NS.NT.features;
      } catch (e) { R = null; }
    }
    return (R && R.catalog) ? R.catalog() : [];
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
        + '问天气、热点、在线批命这类超纲内容，统一回「抱歉，NT-Xhex 知识库仅限玄学与传统文化领域」。'
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
      var version = 'v3.1.28'; // 唯一版本真值；由 tools/sync-version.js 从 version.json 同步，勿手改第二份
      return {
        name: '玄玖灵犀', en: 'NT-Xhex', version: version,
        desc: '算法演乾坤，一问知天命，以数据重现千年术数。',
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
        // 滚动搜索建议词条（真实示例，不是写死的提示语）。
        //   用途：搜索胶囊在「输入为空」时，于 48pt 高的胶囊内逐条上滚展示这些词条，
        //   让人一眼看出「这里能搜什么、能怎么问」。视觉/动效走 theme.css 的 .nt-ph*，
        //   各壳只负责把本数组渲染成一列、并在输入非空时整体隐藏（HIG：占位提示不应与输入内容重叠）。
        //   ⚠️ 词条要能真的被本应用答出来（与 analyzer/intent 支持的范围一致），否则等于误导用户。
        //   ⚠️ 句式统一为「动词 + 功能」：查×× / 排×× / 解××，一个字都不多写（v3.1.9 起）。
        //      与「功能介绍」页各功能的短名同一套口径（短名在 features/registry.js 的 短名 字段）。
        //   ⚠️ 增减条数时记得同步改 theme.css 的**两处**（注释互相指向）：
        //      ① `--d-ph-rotate`：轮换一整圈的总时长 = 条数 × 5.5s（停留 5s + 上滑 0.5s）；
        //      ② `@keyframes nt-ph-step`：档位个数与百分比（8 条 → 12.5%/档，9 条 → 11.11%/档）。
        //      否则条数一变，轮换的快慢与档位就全错位了。
        //   ⚠️ 单条长度有上限：胶囊内可用的横向空间只有 200pt（272 − 左内边距 24 − 右端放大镜键 48），
        //      17pt 字下约合 9 个汉字（≈153pt）。超过就会被裁成省略号 —— 实测 12 字那条会钻到放大镜底下，
        //      故文案控制在 9 字内。
        //   ⚠️ 每一条都实测过「进得去、答得出」（不是空壳示例）——改词后必须重跑
        //      modules/features/__tests__/catalog.test.js，它会逐条问一遍，答不出（落到话题守卫）即红。
        searchHints: [
          '查今日宜忌',
          '查本月吉日',
          '查今日穿衣',
          '查属马三合',
          '排六爻卦',
          '查九宫飞星',
          '查今年干支',
          '查今日冲煞'
        ],
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
          { id: 'open',   title: '开源声明',   desc: '本应用所有代码采用“MIT协议”开源' }
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
          // 参考文献（设计稿：含参考文献、算法示例）
          refs: [
            { h: '算法依据', text: '历法内核全部本地离线计算，无任何外部联网引用，算法口径参考：' },
            { h: '廿四节气', text: '基于 NOAA 太阳黄经低精度式 + 二分求节时刻，精确到「天」（东八区）。年柱以「立春」换年（节气定界，非阳历 1 月 1 日）。' },
            { h: '四柱排盘', text: '月柱 = 节气定月建 + 五虎遁（年干起寅月干）；时柱 = 五鼠遁（日干起子时干）；日柱 = 甲子纪日（儒略日计数、锚点常量内置）。' },
            { h: '建除十二神', text: '以节气月建 + 日支推「建除满平定执破危成收开闭」值日，定每日宜忌基调。' },
            { h: '五行与宜忌', text: '天干 / 地支五行生克、地支六冲、得令得地得势（日主旺衰），内置静态表（见 db.js）。' },
            { h: '彭祖百忌', text: '按当日天干、地支各出一条忌（天干 10 条 + 地支 12 条，查证标准版，存 db.js）作宜忌细化依据。' },
            { h: '算法示例（白玖玖）', text: '例：白玖玖（女，2005 年 6 月 9 日子时）—— 排得「乙酉 / 壬午 / 甲子 / 甲子」，日主甲木生午月，得令得势，建除为「建」日，宜会亲友、忌动土。' }
          ],
          // 功能介绍（设计稿：含怎样使用、示例、更新日志）
          // ⚠️ 用户要求「切换主题的方法」放在本页**置顶**（第一条即它），其余条目顺延。
          // ⚠️ 功能总览（几大板块 / 多少项）一律由 introPage() 从 features/registry.js 的
          //    catalog() 派生：加功能只改 registry，本页自动跟上，**不在本文件里再抄一份清单**。
          //    传进来的 4 条是「不随功能增减变化」的固定文案（主题 / 怎么用 / 示例 / 更新日志）。
          intro: introPage([
            { h: '怎么切换主题', text: '主题只有两种来源，不再按时辰自动切：① 跟随系统——读得出你设备/系统的浅色或深色模式时，界面就跟着系统走（系统深色→深色界面，系统浅色→浅色界面）；② 搜索框关键词手动切——在首页搜索框输入「切换主题」后回车（或点放大镜），即在浅色与深色间翻转并记住，也可以说「换个主题」「深色模式」「浅色模式」「暗黑」「反色」等同义说法，命中即切换、不进结果页。你手动选过之后，系统模式就不再干预（清除缓存则回落跟随系统）。切换时底色/纸面/文字/图标做 320ms 平滑过渡。' },
            { h: '怎么用', text: '在首页搜索框输入一句信息或问题（可带姓名、生辰、问题），点击放大镜「发送」，即可在结果页看到「标题 + 术语 + 详情 + 白话 + 参考」的结构化答案；点「再问一个」回到首页。' },
            { h: '示例（白玖玖）', text: '输入「2005年6月9日子时 今天宜忌」→ 返回白玖玖当日建除值日、宜忌清单、日主旺衰与一句白话解读。' },
            { h: '更新日志', text: 'v3.1.8：搜索框补齐八套算法——八字格局与喜用神（《子平真诠》取格四条 + 《穷通宝鉴》调候表 120 项）、择日学（黄黑道十二神 + 起青龙诀 + 五不遇时 + 二十八宿吉凶，按事项取宜忌）、奇门吉凶格局（81 组十干克应 + 九遁 + 三奇得使 + 玉女守门）、六壬毕法赋一百法与十二天将类象、六爻旺衰进阶（暗动与日破二分、进退神、化墓化绝、三合局、反吟伏吟）、紫微四化与流年流月流日流时、占星宫位四家宫制与阿拉伯点十二点与卜卦择时（Lilly 判据）、八字神煞二十一类与八字合婚；占星时区修正为北京时间（原来太阳差 0.32 度、月亮差 4.4 度）；八字神煞、合婚、卜卦、择时、宫位均走搜索框触发、结果页与导出图共用一套。\nv3.0.7：新增开屏页（Logo + 玄玖灵犀 + 演乾坤·知天命，停留后 400ms 淡出，三端一致）；弹窗补出场动画（先播 nt-fall 淡出下沉 200ms 再卸载，避免直接消失）；配色治理为全黑白灰，仅宜忌与五行保留彩色且双主题适配（浅色深版/深色亮版）；主题判定改为「设备黑白模式 → 北京日出日落（年均 07:00–17:10 离线固定值）→ 手动」三级优先，全端适配并同步补上 uni-app 的主题切换；导出图片按 NT-List 卡片形式重做（顶规则线 + 品牌头 + 提问/答案 + 页脚本地生成声明/版本/导出时间 + 右下角离线二维码，指向网页版 yi.ntars.cn）；PWA 结果页双按钮改读 about.resultActions 单一真源；删无障碍降级、copyright 字段与 7 个死 token；固化 v3.0.7。\nv3.0.6：搜索框常驻光环换款（粗扩散环 → 1px 细环 + 极淡柔晕呼吸）；新增「主题切换」过渡动画（底色 / 纸面 / 文字 / 线性图标在 320ms 内交叉渐变，不再硬切）；「功能介绍」置顶新增「怎么切换主题」；按用户要求撤掉无障碍降级（prefers-reduced-motion）代码。\nv3.0.5：按设计稿重画「‹」「›」图标（开合 90°、平头端帽、尖端走三次贝塞尔），放大镜按墨迹外框校正尺寸（原偏小 10.6%）；搜索框新增常驻强调光环；滚动建议词条停留时长 2.5s → 5s；固化 UI 并归档备份。\nv3.0.4：去掉全部描边与常驻特效（设计稿线框只作范围标注，实际界面改用「面」区分层级）；搜索框占位改为真实滚动的示例词条；按 Apple HIG 修正各档字重；修掉深色模式上下滑动的白色底（窗口底色跟随主题）；修掉小程序返回上一页时的一帧闪烁；清除缓存提示改为「已彻底清除缓存」。\nv3.0.3：补齐动效三层体系（转场 / 内容错落入场 / 按压反馈），新增返回方向滑入并修掉方向反转问题，内容入场改为只在冷启动首屏播（消除与切页滑入叠加形成的重影）。\nv3.0.2：按设计稿重构「关于」体系为两级（关于页 4 卡 + 关于我们页 3 卡），新增协议条款 / 开源声明 / 星玖工作室 3 个内容详情页。\nv3.0.1：统一三端视觉 token，清除未调用模块。\nv3.0.0：单轮问答三视图（首页 / 结果 / 关于）。' }
          ]),
          // 星玖工作室（设计稿：应用介绍 + 工作室介绍 + 官网 / 网页版 / 数据库 / 测试题 / 各渠道联系方式）
          studio: [
            { h: '应用介绍', text: '玄玖灵犀 NT-Xhex：算法演乾坤，一问知天命，以数据重现千年术数。无后端、无网络、无登录、无大模型，所有推算在你设备本地完成，不收集、不外传任何数据。' },
            { h: '工作室', text: '星玖工作室 Ntarstudio，由白玖玖主理（微信号 Ntarso）。做玄学工具的本地化、开源化与多形态适配（小程序 / 网页 / 移动 App）。' },
            { h: '官网', text: 'https://www.ntars.cn/' },
            { h: '玄玖灵犀 · 网页版', text: 'https://yi.ntars.cn/' },
            { h: '玄玖数据库', text: 'https://k.ntars.cn/' },
            { h: '玄玖测试题', text: 'https://q.ntars.cn/' },
            { h: '各渠道联系方式', text: '微信公众平台「玄玖灵犀」（微信号 Ntarso）；邮箱与渠道信息见官网 https://www.ntars.cn/ 的「联系」页。' }
          ],
          // 协议条款（设计稿：仿腾讯系应用各项协议，格式和风格详尽；示例统一用「白玖玖」）
          terms: [
            { h: '一、总则', text: '1.1 本应用「玄玖灵犀 NT-Xhex」由星玖工作室 Ntarstudio 开发并提供。你继续访问或使用本应用，即视为你已阅读、理解并同意本协议全部条款；若不同意，请停止使用。' },
            { h: '二、服务性质与内容边界', text: '2.1 本应用仅提供术数文化知识（黄历宜忌、干支节气、八字排盘、建除、五行等）的本地化展示，属「文化参考」，不构成命理、医疗、投资、法律或任何其他专业建议。' },
            { h: '三、知识产权', text: '3.1 本应用代码以 MIT 协议开源，但界面、品牌「玄玖灵犀 NT-Xhex」、版式与设计归 Ntarstudio 所有，第三方不得盗用品牌标识。' },
            { h: '四、个人信息与隐私', text: '4.1 本应用无账号、无登录、无网络上传。你所输入的信息（如示例中的白玖玖生辰）仅保存在你本机本地缓存，用于离线推算，「清除数据」即可全部删除，我们不收集、不上传、不共享。' },
            { h: '五、免责', text: '5.1 内容仅供交流学习，非科学结论。你依本应用结果所做的任何决定，责任自负；对因使用本应用而产生的直接 / 间接损失，Ntarstudio 不承担责任。' },
            { h: '六、协议的变更与适用', text: '6.1 我们可能随版本更新调整本协议条款，重大变更会以版本说明告知。本应用受中华人民共和国法律管辖，相关争议依中国法律解决。' }
          ],
          // 开源声明（设计稿：开源方式与复刻要求 + MIT 协议正文 + 所用开源项目及协议）
          open: [
            { h: '开源方式与复刻要求', text: '本应用全部代码以 MIT 协议开源。你可以自由使用、复制、修改、再分发；唯一要求是「保留本开源声明与 MIT 协议正文」。复刻时请保持「无后端 / 无网络 / 无登录 / 全本地计算」的边界，不得接入网络回传用户输入。' },
            { h: 'MIT 许可协议（正文）', text: 'MIT License\n\nCopyright (c) 2026 星玖工作室 Ntarstudio\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.' },
            { h: '本应用使用到的开源项目', text: '本应用为自研离线实现，仅以下历法口径参考了开源项目（无运行时联网依赖）：lunar-javascript v1.6.x（MIT）——干支 / 节气 / 四柱 / 建除的精确离线算法口径参考。' }
          ]
        },

        // —— 关于页 / 结果页 / 内容页 底部信息条（设计稿：黑30% / 12pt，两行居中；版本引用上面真值）——
        //   字重按 Apple HIG：12pt = Caption 1 → Regular（设计稿画得偏粗，已纠回 400）。
        aboutFoot: [
          '内容仅供参考学习',
          '玄玖灵犀 ' + version + ' · 星玖工作室'
        ],

        // —— 「清除数据」卡点开后，就地在当前页弹起的确认弹窗（设计稿 弹窗：面板 354×184，标题 22pt，双按钮 135×44）——
        clearModal: {
          title: '清除缓存',
          desc: '我们不会上传和记录您的任何信息，此操作将彻底清除本应用所有的本地记录和缓存',
          cancel: '取消',
          confirm: '确认',
          done: '已彻底清除缓存'    // 清除完成后的轻提示（Toast）文案；三端都取这里，不各写一份
        }
      };
    },

    // 清除本地数据（对话结果缓存 / 主题偏好等）
    clearData: function () { if (S && S.clearAll) S.clearAll(); },

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
