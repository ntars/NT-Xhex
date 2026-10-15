/**
 * modules/SettingsModule/settings.js —— 关于面板数据（品牌 / 简介 / 版本 / 备案 / 版权 / 更新日志）【单一真源】
 * 三端关于面板与页脚都从这里取（about()），不另写一份。
 * 3.0.2 起按《玄玖灵犀 NT-Xhex.sketch》设计稿重构「关于」体系为两级：
 *   关于页(4 卡) ─┬─ 参考文献 / 功能介绍   → 内容详情页（back 回「关于」）
 *                 ├─ 关于我们            → 「关于我们」页(3 卡) ─┬─ 星玖工作室 / 协议条款 / 开源声明 → 内容详情页（back 回「关于我们」）
 *                 └─ 清除数据(红)        → 就地弹「清除缓存」确认弹窗（不跳页）
 * 依赖：StorageModule/storage.js（清缓存用）
 * 加载：UMD —— 小程序被 require（storage 相对路径注入）；浏览器挂到全局 NT.settings。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require);
  else { root.NT = root.NT || {}; root.NT.settings = factory(null); }
})(typeof self !== 'undefined' ? self : this, function (require) {
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

  return {
    // 关于我们：版权/简介/版本/备案（统一品牌信息，单一真源）
    about: function () {
      var version = 'v3.0.2'; // 唯一版本真值；下方 aboutFoot / version 字段都引用它，禁止写死第二份
      return {
        name: '玄玖灵犀', en: 'NT-Xhex', version: version,
        copyright: '© 星玖工作室 Ntarstudio',
        desc: '算法演乾坤，一问知天命，以数据重现千年术数。',
        slogan: '演乾坤 · 知天命',
        icp: '蜀ICP备2026027050号',
        footerCopy: '©2024-2026 Ntarstudio. All Rights Reserved.',

        // —— 开屏页（设计稿 开屏：品牌 Logo + 玄玖灵犀 28pt + 演乾坤·知天命 12pt 黑30% + 备案）——
        splash: { title: '玄玖灵犀', sub: '演乾坤 · 知天命' },

        // —— 起始页（首页输入态；设计稿 起始页）——
        placeholder: '滚动搜索建议...',
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
            { h: '彭祖百忌', text: '参考传统「彭祖百忌」日课口诀（干日 + 支日各 60 条）作为宜忌细化依据。' },
            { h: '算法示例（白玖玖）', text: '例：白玖玖（女，2005 年 6 月 9 日子时）—— 排得「乙酉 / 壬午 / 甲子 / 甲子」，日主甲木生午月，得令得势，建除为「建」日，宜会亲友、忌动土。' }
          ],
          // 功能介绍（设计稿：含怎样使用、示例、更新日志）
          intro: [
            { h: '怎么用', text: '在首页搜索框输入一句信息或问题（可带姓名、生辰、问题），点击放大镜「发送」，即可在结果页看到「标题 + 术语 + 详情 + 白话 + 参考」的结构化答案；点「再问一个」回到首页。' },
            { h: '能问什么', text: '黄历宜忌、择吉日、八字排盘、干支节气、建除、彭祖百忌、值神、五行、十二时辰、特殊节日等——全部本地离线算出。' },
            { h: '示例（白玖玖）', text: '输入「2005年6月9日子时 今天宜忌」→ 返回白玖玖当日建除值日、宜忌清单、日主旺衰与一句白话解读。' },
            { h: '更新日志', text: 'v3.0.2：按设计稿重构「关于」体系为两级（关于页 4 卡 + 关于我们页 3 卡），新增协议条款 / 开源声明 / 星玖工作室 3 个内容详情页。\nv3.0.1：统一三端视觉 token，清除未调用模块。\nv3.0.0：单轮问答三视图（首页 / 结果 / 关于）。' }
          ],
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

        // —— 关于页 / 结果页 / 内容页 底部信息条（设计稿：黑30% / 12pt·600，两行居中；版本引用上面真值）——
        aboutFoot: [
          '内容仅供参考学习',
          '玄玖灵犀 ' + version + ' · 星玖工作室'
        ],

        // —— 「清除数据」卡点开后，就地在当前页弹起的确认弹窗（设计稿 弹窗：面板 354×184，标题 22pt，双按钮 135×44）——
        clearModal: {
          title: '清除缓存',
          desc: '我们不会上传和记录您的任何信息，此操作将彻底清除本应用所有的本地记录和缓存',
          cancel: '取消',
          confirm: '确认'
        }
      };
    },

    // 清除本地数据（对话结果缓存 / 主题偏好等）
    clearData: function () { if (S && S.clearAll) S.clearAll(); }
  };
});
