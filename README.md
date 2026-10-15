# 玄玖灵犀 NT-Xhex v3.0.1

> 算法演乾坤，一问知天命，以数据重现千年术数。（演乾坤·知天命）
> 无后端 / 无网络 / 无登录 · 一套代码自动切换多形态
> © 星玖工作室 Ntarstudio · 备案 蜀ICP备2026027050号

---

## 一、这是什么

输入一句文字（如「今日宜忌」「白玖玖，女，2005年6月9日子时排盘」），本地引擎即时返回加工好的玄学分析。所有数据内置 JS，所有计算在用户设备本地同步完成。

**v3.0 说明**：从零重写，旧版已备份；**禁止在旧代码上修改**。历法为**精确离线算法**（`modules/AnalyzerModule/lunar.js`：NOAA 太阳黄经节气、节气定四柱、五虎遁/五鼠遁、建除十二神、得令得地得势），纯 JS 零网络，对照 2026 真实节气全部吻合。

### 界面结构（三视图，无底部导航栏，无聊天区）

| 视图 | 内容 |
|---|---|
| **首页（输入）** | 居中 Logo +「玄玖灵犀」+ 搜索胶囊（内含 1.5pt 放大镜作发送键）+ 免责声明；右上「关于」+ 黑白主题切换 |
| **结果页** | 提问回显卡 + 分析结果卡（标题 / 导语 / 分节段落，左侧 2px 黑竖线标记）；左上「返回」、底部「再问一个」 |
| **关于页** | 品牌主卡 + 介绍 + 菜单（更新日志 / 清除缓存）+ 信息；左上「返回」 |

- **单轮问答**：每次提问只产出当前这一条结果，**不累积历史、不做对话气泡**；刷新可恢复本轮，返回即清空
- **清除缓存**：关于页 → 确认模态框 → 整页回到首页空态 + Toast「已恢复出厂设置」
- **结果排版**：由 `modules/HomeModule/result-format.js` 把引擎文本结构化（标题 / 导语 / 分节），三端共用同一份规则
- **黑白双主题**：顶栏「关于」旁月牙钮一键反色（白底黑字 ↔ 黑底白字），跟随系统、手动切换持久化；宜忌/五行等语义色不随主题翻转。深色自动换白色 Logo。

## 二、视觉规范（单一真源，三端一致）

**设计风格**：黑白极简冷淡风（Normcore）+ 轻微新拟质（Neumorphism-lite）。基准 4× 设计稿（iPhone 16 Pro / MacBook / iPad mini 自动对齐，1pt 逻辑值 = 4× 画布 ÷ 4）。

- 纯白底 `#FFFFFF` + 纯黑字；任何状态变化只用「明度 + 透明度 + 位移」表达，绝不颜色报警
- 大圆角卡片（20px）+ 极弱单层柔和阴影 + 发丝线框（1px `#ECECEC`）+ 内凹输入槽
- 搜索胶囊（高 48pt、1.5pt 描边、内文字 17pt、占位「输入信息以开始推算...」占位色 iOS 灰 `#8E8E93`）右端圆形内含 1.5pt 放大镜
- 线性图标（内联 SVG，stroke 1.5px，无外部依赖、无网络）
- 首页节奏：关于 17pt → Logo 高 72pt → 玄玖灵犀 22pt（Semibold）→ 搜索胶囊 → 免责声明 12pt，元素间距统一 16pt；页脚 ICP+版权 12pt 纯黑 30%
- 小程序重心偏下（避让右上角胶囊），App 居中偏上，二者布局参数一致

**动效系统**（全局统一「由下向上淡入」，少、快、统一；无弹簧/弹跳/抖动）

- 唯一入场 keyframe `nt-rise`（`translateY(16px)→0` + 透明度 0→1），统一缓动 `--ease-standard`
- 时长分档：按下 120ms / 局部刷新 240ms / 模态 280ms / 页面 320ms
- 三视图（`.nt-page-in`）、局部刷新（`.nt-fade-up`）、模态（`.nt-mask`）、Toast（`.nt-toast`）全部共用 `nt-rise`，视觉零差异
- 骨架屏灰阶呼吸 800ms 循环；`prefers-reduced-motion` 下降为 0ms

**响应式断点**：手机 `<768px` 全宽 · 平板 `768–1024px` 居中容器 640px · 电脑 `≥1024px` 居中容器 720px

**唯一真源**：`modules/UIModule/theme.css`（视觉 token + 通用组件 + 深色反色块）+ `modules/UIModule/theme.js`（黑白主题逻辑）。三端引用同一份，**壳内绝不复制样式**：

| 平台 | 引用方式 |
|---|---|
| 浏览器 PWA | `public/pwa/index.html` 里 `<link href="../../modules/UIModule/theme.css">` |
| uni-app | 各 `.vue` 视图 `import '@/modules/UIModule/theme.css'` |
| 微信小程序 | `tools/sync-mp.js` 生成 `dist/mp-weixin/theme.wxss`，`app.wxss` 里 `@import "theme.wxss"` |

> ⚠️ 改视觉规范**只改 `theme.css` / `theme.js` 一处**，再跑 `node tools/sync-mp.js` 同步小程序。三端自动一致。
> ⚠️ `theme.css` 刻意规避微信小程序不支持的写法：无 `::before/::after` 伪元素（一律真实元素）、`:hover`/`prefers-reduced-motion` 块 WXSS 忽略（无害）、图标反色用 `filter: invert(1)`、无外部字体、纯 px 无 rpx。
> 完整设计规范见 `玄玖灵犀_NT-Xhex_UI交互设计规范.md`。

## 三、硬性限制（已遵守）

- 无服务器、无后端、无远程 API、无网络请求
- 无登录、无权限申请、无消息推送、无订阅通知
- 不调用任何大模型 API；计算全在设备本地同步完成；数据内置 JS
- 话题限定：黄历宜忌、择日、八字排盘、命理分析、姓名学、五行补缺、干支节气、农历生肖、风水玄学；越界统一回「抱歉，NT-Xhex 知识库仅限玄学与传统文化领域。」

## 四、核心架构（模块化）

一个项目包体、一个代码库。引擎/数据/存储/设置/会话/主题均为**唯一真源**（`modules/`），各形态「只加载自己用到的模块，忽略其余目录」，选择清单统一在 `tools/platform-modules.json`。

- 主形态：微信小程序；浏览器 → PWA 网页（可安装为 APP）；uni-app → Android/iOS/鸿蒙
- 运行时 `modules/EnvModule/env.js` 检测环境切换形态，用户无感知
- 品牌/版本/备案/版权文案单一真源 = `modules/SettingsModule/settings.js` 的 `about()`（三端关于面板与页脚都从这里取）

### 目录结构

```
NT-Xhex/
├─ main.js / App.vue / pages.json / manifest.json / h5/   # uni-app Vue3 骨架
├─ sw.js                                                    # Service Worker（uni H5 构建用）
├─ pages/index/index.vue                                    # 单页壳：组装 首页/结果/关于 三视图
├─ public/pwa/                                              # 浏览器 PWA 独立壳（无需构建）
│  ├─ index.html   # 按依赖顺序 <script> 引入 modules/（挂全局 NT.*）
│  ├─ app.js       # PWA 薄壳：装配会话 + 视图切换 + 主题/页脚装配
│  ├─ manifest.json / sw.js
├─ static/icons/                                            # logo.png(黑) + logo-white.png(白) + icon-192/512/512-maskable
│                          （由 tools/gen-logo.py 从 玄玖灵犀Logo.svg 栅格化，纯黑 N+T 透明底）
├─ tools/
│  ├─ platform-modules.json  # 各平台「加载哪些模块/静态资源」单一事实源
│  ├─ sync-mp.js             # 生成 dist/mp-weixin（引擎 + theme.wxss + 静态资源），--check 校验
│  ├─ intent.test.js         # 意图解析回归（示例统一用白玖玖）
│  └─ gen-logo.py            # Logo / App 图标生成器（Pillow）
├─ dist/mp-weixin/          # 原生微信小程序（IDE「导入项目」直接选这里）
└─ modules/                 # 业务模块（唯一真源）
   ├─ AnalyzerModule/        # 本地分析引擎（纯函数，平台无关）
   │  ├─ db.js              # 本地知识库（干支/时辰/五行生克/建除宜忌/地支六冲/姓名/五格，大白话注释）
   │  ├─ lunar.js          # 精确历法内核（节气/四柱/建除/旺衰）
   │  ├─ ganzhi.js         # 干支/节气/生肖 换算（委托 lunar）
   │  ├─ name-study.js     # 姓名学（拆字/音韵/五格/补缺）
   │  ├─ bazi.js           # 八字排盘/命理（四柱/日主强弱/喜用/简批）
   │  ├─ ganzhi-analysis.js # 黄历宜忌/择日/干支节气 分析
   │  ├─ intent.js         # 输入解析与意图识别（预处理/实体提取/决策树/三级消歧义/校验）
   │  └─ analyzer.js        # 主入口：意图识别 + 话题守卫 + 调度子模块（对外仅 analyze）
   ├─ HomeModule/
   │  ├─ index.vue          # 首页（Vue 壳）
   │  ├─ result.vue         # 结果页（Vue 壳）
   │  ├─ conversation.js    # 共享单轮问答行为（引擎+存储装配，三壳共用）
   │  └─ result-format.js   # 共享结果排版（引擎文本 → 结构化段落）
   ├─ SettingsModule/
   │  ├─ settings.js        # 关于数据 about()（版权/简介/版本/备案/更新日志，单一真源）
   │  └─ settings.vue       # 关于页（Vue 壳）
   ├─ StorageModule/storage.js  # 本地存储（settings + 单轮结果；wx/localStorage/内存三级降级）
   ├─ EnvModule/env.js      # 环境检测 + PWA 安装引导 + Service Worker 注册
   └─ UIModule/
      ├─ theme.css          # 视觉规范单一真源（token + 组件 + 深色反色块 + 全局动效）
      ├─ theme.js          # 黑白双主题逻辑（读偏好/跟随系统/切换持久化）
      └─ safe-area.js      # 全方向安全区计算（状态栏/胶囊/手势条，三壳共用）
```

## 五、各形态运行与部署

### 1. 微信小程序（主形态）
**方式 A（无需构建，直接打开）**：`dist/mp-weixin/` 是一份完整原生小程序。用「微信开发者工具」直接「导入项目」选择 `dist/mp-weixin/` 即可预览/编译/上传。
> ⚠️ 必须选 `dist/mp-weixin/`（含 `app.json`），**不能选仓库根目录**（根目录无 `app.json`，会报「no found app.json」）。
> 引擎文件 + 静态资源是**单一真源 `modules/` 的生成产物**（普通文件，非软链——微信打包器不跟随指向项目外的软链）。改了 `modules/` 或 `static/` 后同步：`node tools/sync-mp.js`（校验：`node tools/sync-mp.js --check`）。

**方式 B（uni-app 构建）**：`npm install && npx uni build mp-weixin`

### 2. 浏览器 PWA（无需构建，直接运行）
从**项目根目录**起静态服务（`public/pwa/` 内相对路径 `../../modules/…` 才能解析）：
```bash
python3 -m http.server 8080     # 在项目根目录执行
# 访问 http://localhost:8080/public/pwa/index.html
```
自动注册 Service Worker（离线可用）；检测 `beforeinstallprompt` 显示安装引导。

### 3. 多端原生（Android / iOS / 鸿蒙）
`npx uni build app`（微信多端框架编译输出）。业务逻辑复用 `modules/`，无需改代码。

## 六、统一品牌信息（所有形态显示）

应用名 **玄玖灵犀** · 英文名 **NT-Xhex** · 版权 **© 星玖工作室 Ntarstudio** · 备案 **蜀ICP备2026027050号**
介绍：完整版「算法演乾坤，一问知天命，以数据重现千年术数。」简写版「演乾坤·知天命」
显示位置：页面 Logo/标题、关于面板（`settings.js` 的 `about()` 单一真源）、页脚版权行、PWA/原生标题。

## 七、历法算法说明

`modules/AnalyzerModule/lunar.js` 为精确离线历法（纯 JS、零网络、零依赖）：

- **廿四节气**：NOAA 太阳黄经 + 逐日跨黄经扫描（东八区），对照 2026 真实节气全部吻合
- **四柱**：年柱立春换年、月柱=节气定月建+五虎遁、日柱=甲子纪日、时柱=五鼠遁
- **建除十二神**：节气月建 + 日支推值日
- **日主旺衰**：得令/得地/得势计分

`db.js` 存干支/时辰/五行生克/建除宜忌/地支六冲/姓名拆字五行/五格数理等规则数据（大白话注释）；`ganzhi.js` 委托 `lunar.js`，三壳自动受益。

## 八、本地校验

引擎为纯 JS，Node 直接可校验（无平台依赖）：
```bash
node -e "console.log(require('./modules/AnalyzerModule/analyzer.js').analyze('今日宜忌'))"
node -e "console.log(require('./modules/AnalyzerModule/analyzer.js').analyze('白玖玖，女，2005年6月9日子时排盘'))"
node tools/intent.test.js          # 意图解析回归（30 用例）
node tools/sync-mp.js --check      # dist 与 modules 一致性
```

## 九、更新日志

- **v3.0.1**：单轮问答三视图（结果独立成页可返回、不显示历史）；精确离线历法；意图识别与输入解析模块（`intent.js`）；全方向安全区（状态栏/胶囊/手势条）；黑白双主题（全局反色、宜忌/五行不翻）；按 4× 设计稿定稿重排首页（纯白底、搜索胶囊+放大镜、16pt 间距节奏）；全局动效统一「由下向上淡入」；Logo 换 N+T 词标（透明底黑/白双版本）；清理死代码与无引用资源；代码质量（JS 压缩 + 组件按需注入）。
- **v3.0.0**：本地分析引擎；精确离线历法；多形态自动切换。
