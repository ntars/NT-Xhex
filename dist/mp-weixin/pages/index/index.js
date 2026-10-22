/**
 * 玄玖灵犀 NT-Xhex · 单页三视图：首页（输入）→ 结果页（展示分析）→ 关于页 → 二级页
 * 复用共享纯 JS 引擎（modules/），视图层小程序原生。
 * 问答流转走共享 conversation.js（单轮，不显示历史）；结果排版走共享 result-format.js。
 * 转场（双层视差）走共享 transition.js（单一真源）：底层 layerBack / 顶层 layerFront 各渲染一页，
 *   切页瞬间旧页仍满屏（视觉连续不闪），新页右滑入、旧页左移压暗；330ms 后底层=顶层静止。
 */
var Conversation = require('../../utils/modules/HomeModule/conversation.js')
var ResultFormat = require('../../utils/modules/HomeModule/result-format.js')
var Cores = require('../../utils/modules/HomeModule/cores-loader.js')
var Storage = require('../../utils/modules/StorageModule/storage.js')
var Settings = require('../../utils/modules/SettingsModule/settings.js')
var SafeArea = require('../../utils/modules/UIModule/safe-area.js')
var Theme = require('../../utils/modules/UIModule/theme.js')
var Transition = require('../../utils/modules/UIModule/transition.js')
// v3.1.38：算法与导出模块都在分包 occupy-cores 里 —— 首次用到时才经 Cores.load 取（见 send / exportImage），
//   本页启动阶段保持 null。主包**不能**静态 require 分包文件（微信判「主包引用分包」非法，启动即崩）。
var Analyzer = null
var ExportImage = null

var EMPTY_RESULT = { title: '', lead: '', blocks: [], question: '' }

Page({
  data: {
    view: 'home',        // 逻辑当前页（静止态 = 显示页）
    // 转场两层分别渲染哪一页（静止态两层都是当前页；只有转场那 330ms 不同）
    //   顶层 layerFront 永远盖在最上面，底层 layerBack 被它盖住（两层都不透明，静止态底层完全不可见）
    layerFront: 'home',
    layerBack: 'home',
    navAnim: '',          // '' | 'stage-fwd' | 'stage-back'（驱动 theme.css 双层 keyframe）
    // 内容错落入场开关：只在冷启动首屏为 true（挂 .nt-cascade），首次切页即置 false。
    //   切页已有整层滑入承担位移，若内容再各自上浮一次，两层动效叠加会看成"重影"。只降不清（一次性），
    //   因为「切页加抑制类、结束再摘」的写法在摘掉那一刻会让 animation-name 由 none 变回 nt-rise，凭空重启一次。
    boot: true,
    input: '',
    // 是否已聚焦：聚焦即隐去搜索框里的滚动词条（见 index.wxml 注释）。
    //   技术原因：微信官方文档写明「input 仅在 focus 时表现为原生组件」——聚焦态它的层级
    //   高于 WebView 里的一切元素（z-index 无效），词条会被直接盖住；干脆主动让位。
    focused: false,
    result: EMPTY_RESULT,
    about: {},
    nav: SafeArea.DEFAULTS,
    isDark: false,
    themeLogo: '/static/icons/logo.png',
    detail: { title: '', items: [] },
    detailBack: 'about',
    clearOpen: false,
    clearClosing: false,   // 退场动画门控：true 时给 .nt-mask 挂 .nt-mask-out 播 nt-fall
    splashShow: true,      // 开屏 overlay 是否挂载（冷启动 true，退场后卸载）
    splashOut: false,      // 开屏退场门控：true 时挂 .nt-splash-out（品牌组缩放到起始页比例 + 背景/副标淡出）
    toastOpen: false,
    toastText: ''
  },

  onLoad: function () {
    // 会话器**延迟创建**（v3.1.38）：analyzer 在分包里，首次提问时才经 Cores.load('analyzer') 取到，
    //   取到后再建会话器、重走一次 send()。故这里先置空（调用处都有 conv 判空保护）。
    this.conv = null
    // 主题：Theme.current 若缺失/异常 → 降级浅色，绝不崩页面（与 safe-area 同原则）
    var th = (Theme && typeof Theme.current === 'function') ? Theme.current() : 'light'
    // 安全区：SafeArea.calc 若缺失 → 降级 0（H5/无 wx API 端 safe-area.js 本就返回 0），不崩页面
    var nav = (SafeArea && typeof SafeArea.calc === 'function') ? SafeArea.calc() : { top: 0, aboutTop: 0, right: 0, bottom: 0 }
    this.setData({
      nav: nav,
      about: Settings.about(),
      isDark: th === 'dark',
      themeLogo: (Theme && Theme.logoFor) ? Theme.logoFor(th) : '/static/icons/logo.png'
    })
    this.syncWindowBg(th === 'dark')
    this.runSplash()
    // 恢复上次这一问（刷新/重进不丢）——直接落位，不播转场（两层都置为目标页）
    // ⚠ v3.1.41：会话器现在是「延迟创建」（analyzer 在分包里，首次提问才取），
    //   onLoad 时 this.conv 还是 null —— 必须先判空，否则启动即抛
    //   「Cannot read property 'restore' of null」（真机实测，v3.1.40 刚崩过）。
    var last = this.conv ? this.conv.restore() : null
    if (last) {
      this.setData({
        view: 'result', layerFront: 'result', layerBack: 'result',
        result: this.shape(last.question, last.answer, last.hits)
      })
    }
  },

  /**
   * 同步「窗口底色」为当前主题色。
   *
   * 为什么必须做：app.json 的 window.backgroundColor 是**页面容器背后那一层**的底色，
   * 它不跟 CSS 变量走（theme.wxss 的 page{background:var(--nt-bg)} 只染页面节点本身）。
   * 深色模式下它仍是 app.json 里写死的 #ffffff，于是上下滑动越界 / 回弹时就会从页面边缘
   * 闪出一条白底 —— 这就是「深色模式上下滑动出现白色底」的根因。改为运行时按主题写入。
   */
  syncWindowBg: function (isDark) {
    if (typeof wx === 'undefined' || typeof wx.setBackgroundColor !== 'function') return
    var c = isDark ? '#000000' : '#ffffff'
    // backgroundColorTop/Bottom 是 iOS 下拉回弹时露出的上/下底色；基础库不支持时忽略即可
    wx.setBackgroundColor({ backgroundColor: c, backgroundColorTop: c, backgroundColorBottom: c })
  },

  shape: function (question, answer, hits) {
    // hits > 1（一次提问命中多个功能块）时按【标题】切小节，结果页多算法并列展示
    var f = ResultFormat.format(answer, (hits || 1) > 1)
    f.question = question
    return f
  },

  // 切视图（双层视差转场由 transition.js 判方向、theme.css 出 keyframe；布局不动；模块缺失时降级为无动画直切）
  // 分层规则（关键，写反了返回时新页会往右跑）：
  //   顶层 layerFront = 盖在最上面、负责「滑出/滑入」的那一页
  //   底层 layerBack  = 被顶层盖住、负责「视差位移」的那一页
  //     前进：front = 新页（自右滑入 100%→0），back = 旧页（左移压暗 0→-33%）
  //     返回：front = 旧页（右滑出 0→100%），back = 新页（自左滑回 -33%→0）
  // 330ms（动画时长，与 theme.css --d-page 320ms 对齐 + 10ms 余量）后开始收尾，收尾再花一帧（+20ms）：
  //   合计约 350ms 两层都变成目标页 → 静止态顶层盖底层，无视觉跳变，且可正常响应点击。
  //   收尾必须分两帧，理由见下方注释（这是「返回时闪烁一下」的根治点）。
  // boot 同时置 false：首屏的内容错落入场到此为止，之后切页只播整层滑入（两种动效不叠加）。
  go: function (to, prep) {
    var from = this.data.view
    if (from === to) return
    var back = !!(Transition && typeof Transition.isBack === 'function' && Transition.isBack(from, to))
    var anim = (Transition && typeof Transition.dirClass === 'function') ? Transition.dirClass(from, to) : ''
    var patch = {
      view: to,
      navAnim: anim,
      boot: false,
      // 切页时把「已聚焦」清掉：聚焦态只对「当前正在用的那个输入框」有效。
      //   不清的话，用户点一下搜索框（focused=true）再点「关于」→ 返回首页时新渲染出来的
      //   <input> 其实没聚焦，但 data 里还是 true → 滚动词条永远不回来了。
      focused: false,
      layerFront: back ? from : to,
      layerBack: back ? to : from
    }
    if (prep) { for (var k in prep) patch[k] = prep[k] }
    var self = this
    this.setData(patch)
    clearTimeout(this._navTimer)
    clearTimeout(this._settleTimer)
    this._navTimer = setTimeout(function () {
      // 收尾分两步（关键：拆开"内容重建"与"位移归位"，否则返回时会闪一下）
      //   ① 先把「静止后该显示的那一页」写进顶层。此刻方向类还在，顶层正停在动画终点：
      //        · 前进：顶层本就 = 新页 → 这一步无变化；
      //        · 返回：顶层停在 translateX(100%)（被 .nt-stage 的 overflow-x 裁在屏外）→
      //          内容在"看不见的地方"重建，用户看不到任何中间态。
      //      而这一步期间画面显示的是底层（已是新页、位移已归位、压暗已褪去），内容完全正确。
      //   ② 下一帧再撤方向类（位移归位）并对齐底层。
      //      · 若把①②并成一帧（旧写法）：返回时顶层会在同一帧里既被清空重建、又瞬间归位，
      //        而顶层是不透明面（z-index 3 压在底层的正确画面上），于是闪出一次纯底色 ——
      //        就是用户反馈的「返回某个页面会闪烁一下」。
      //      · 底层对齐同理放在②：它被顶层完全盖住，重建不可见。
      self.setData({ layerFront: to })
      self._settleTimer = setTimeout(function () {
        if (self.data.view !== to) return   // 已被新一轮转场接管（go() 会清掉本定时器，双保险）
        self.setData({ navAnim: '', layerBack: to })   // 静止：两层都是当前页
      }, 20)
    }, 330)
  },

  onInput: function (e) {
    var v = e.detail.value
    this.setData({ input: v })
    // v3.1.45（性能）：用户**一开口打字**就在后台把引擎分包拉下来 —— 等他点「发送」时多半已就绪，
    //   首次提问不再干等约 3 秒（真机曾 `setTimeout handler took 2991ms`）。
    //   · 这仍是「**用到才加载**」：用户确实要用（已经在输入了），不是「进首页就预下载」
    //     （主人否掉的 preloadRule 已从 app.json 移除，本优化不动 app.json、不占启动时间）。
    //   · **静默**进行：不弹 loading、失败不提示 —— 真有失败，提问时那次加载会兜底并提示。
    //   · Cores.load 内部有缓存，所以预热过之后再提问是**秒回**。
    if (!this._warmed && String(v).length >= 1) {
      this._warmed = true
      if (Cores && typeof Cores.load === 'function') Cores.load('analyzer')
    }
  },
  // 聚焦/失焦只影响「要不要显示滚动词条」，不碰输入内容
  onFocus: function () { this.setData({ focused: true }) },
  onBlur: function () { this.setData({ focused: false }) },

  send: function () {
    var text = this.data.input
    // 主题切换「只在搜索框内实现」：命中切换指令（单一真源 theme.js）→ 切主题并提示，不进入结果页
    if (Theme && Theme.isToggleCommand && Theme.isToggleCommand(text)) {
      var next = Theme.toggle()
      this.setData({
        isDark: next === 'dark',
        themeLogo: Theme.logoFor ? Theme.logoFor(next) : (next === 'dark' ? '/static/icons/logo-white.png' : '/static/icons/logo.png'),
        input: '',
        toastText: '已切换为' + (next === 'dark' ? '深色' : '浅色') + '主题'
      })
      this.syncWindowBg(next === 'dark')   // 窗口底色跟着主题走（否则深色下越界会闪白条）
      this.showToast()
      return
    }
    // v3.1.38：算法在分包里 —— 首次提问先把 analyzer 取回来（约 1 秒，之后秒回），
    //   取到后建会话器并**重走一次 send()**（这次 Analyzer 已就位，下面保持原有同步链路一行不变）。
    if (!Analyzer) {
      var self = this
      wx.showLoading({ title: '正在加载引擎', mask: true })
      Cores.load('analyzer').then(function (A) {
        wx.hideLoading()
        if (!A) { self.setData({ toastText: '引擎未就绪，请稍后重试' }); self.showToast(); return }
        Analyzer = A
        self.conv = Conversation.createConversation({ analyzer: Analyzer, storage: Storage })
        self.send()
      })
      return
    }
    // ⚠ v3.1.41：Analyzer 就绪 ⟹ conv 必已建（上面同一分支里创建）；此处仍兜一层判空，
    //   万一将来调整了创建时机，也不会变成「undefined 上调 ask」的崩溃。
    if (!this.conv) {
      this.setData({ toastText: '会话未就绪，请重新提问' }); this.showToast(); return
    }
    var r = this.conv.ask(text)
    if (!r.ok) return
    this.go('result', { input: '', result: this.shape(r.question, r.answer, r.hits) })
  },

  // 返回输入页（清空当前结果）
  gotoHome: function () {
    if (this.conv) this.conv.clear()   // 会话器可能尚未创建（首次提问前就返回）
    this.go('home', { input: '', result: EMPTY_RESULT })
  },

  /**
   * 结果页「导出图片」：把当前结果渲染成一张 PNG，**预览给用户，不主动写相册**。
   *
   * ⚠️ 隐私红线（用户初衷「无权限申请」）：这里**绝不调 wx.saveImageToPhotosAlbum** ——
   *    它是触发微信 writePhotosAlbum（相册写入，后台显示为 "AlbumWriteOnly" 隐私接口）的唯一来源。
   *    改为「渲染成图 → wx.previewImage 预览」，用户在预览里长按走**系统自带菜单**自行保存，
   *    小程序侧不申请、不记录、不触发任何隐私授权 —— 与「无登录、无权限申请」的初衷一致。
   *
   * 版式与绘制**完全走 ExportModule/export-image.js**（与网页端同一份代码，壳里不重画）：
   *   optsFrom(about) 装配 meta → build() 出排版计划 → 离屏 <canvas type="2d"> 定尺寸 →
   *   paint() 落笔 → canvasToTempFilePath 出临时 PNG → previewImage 预览。
   */
  exportImage: function () {
    var self = this
    var r = this.data.result
    // 多算法并列时 blocks 在 sections 里，导出判定要一并看
    var has = r && (r.question || (r.blocks && r.blocks.length) || (r.sections && r.sections.length))
    if (!has) { this.setData({ toastText: '暂无可导出的内容' }); this.showToast(); return }
    // v3.1.38：导出模块在分包里 —— 首次导出先取回来，再**重走一次本函数**（这次 ExportImage 已就位）
    if (!ExportImage) {
      Cores.load('export').then(function (E) {
        if (!E) { self.setData({ toastText: '导出模块未就绪，请重试' }); self.showToast(); return }
        ExportImage = E
        self.exportImage()
      })
      return
    }
    var a = this.data.about || {}
    wx.showLoading({ title: '正在生成', mask: true })

    wx.createSelectorQuery().in(this).select('#exportCanvas').fields({ node: true, size: true }).exec(function (res) {
      var node = res && res[0] && res[0].node
      if (!node) { self._exportFail('导出失败，请重试'); return }
      var canvas = node
      var ctx = canvas.getContext('2d')
      // 导出 2 倍图，保证在视网膜屏上看文字不糊
      var dpr = 2
      try {
        var info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
        dpr = Math.min(info.pixelRatio || 2, 3)
      } catch (e) { /* 取不到就按 2 倍 */ }

      // ① 先量字排版（measureText 只量不画，不受画布尺寸影响；meta 走 optsFrom 单一装配）
      var plan = ExportImage.build(r, ExportImage.optsFrom(a), ctx)

      // ② 按计划给画布定尺寸并落笔
      canvas.width = Math.round(plan.width * dpr)
      canvas.height = Math.round(plan.height * dpr)
      ctx.scale(dpr, dpr)
      ExportImage.paint(ctx, plan)

      // ③ 出临时 PNG → 预览（不写相册、不申请任何权限；用户长按走系统菜单自存）
      wx.canvasToTempFilePath({
        canvas: canvas,
        x: 0, y: 0,
        width: plan.width, height: plan.height,
        destWidth: plan.width * dpr, destHeight: plan.height * dpr,
        fileType: 'png',
        success: function (out) {
          wx.hideLoading()
          wx.previewImage({
            urls: [out.tempFilePath],
            current: out.tempFilePath
          })
          self._exportDone('长按图片可保存到相册')
        },
        fail: function () { self._exportFail('导出失败，请重试') }
      })
    })
  },

  // 导出收尾（成功/失败共用，避免两处重复写 hideLoading）
  _exportDone: function (text) {
    wx.hideLoading()
    this.setData({ toastText: text })
    this.showToast()
  },
  _exportFail: function (text) {
    wx.hideLoading()
    this.setData({ toastText: text })
    this.showToast()
  },

  gotoAbout: function () { this.go('about') },

  // 关于页点设置项：路由判定走 Settings.rowAction（单一真源，与 PWA/uni 同一份）
  onRow: function (e) {
    var id = e.currentTarget.dataset.id
    var rows = this.data.about.aboutRows || []
    var row = null
    for (var i = 0; i < rows.length; i++) { if (rows[i].id === id) { row = rows[i]; break } }
    var act = Settings.rowAction(row)
    if (act === 'clear') { this.setData({ clearOpen: true }); return }
    if (act === 'us') { this.go('us'); return }
    this.openDetail(id)
  },

  // 关于我们页点 3 张卡 → 各自内容详情页
  onUsRow: function (e) { this.openDetail(e.currentTarget.dataset.id) },

  // 打开内容详情页：标题/正文/返回目标全取 settings.js 单一真源
  openDetail: function (id) {
    // v3.1.45（性能修复）：**「功能介绍」不再加载分包**。
    //   原先这里走 Cores.load('registry') —— 而 registry 顶层 require 了 37 个内核（约 2MB，全在分包里），
    //   只为渲染一个"功能列表"就要把整个分包加载并执行完：真机日志
    //   `[Violation] 'setTimeout' handler took 2991ms`，卡近 3 秒。
    //   现清单已由 sync-mp **快照进主包**（HomeModule/catalog.js，约 9KB），
    //   settings.about() 在启动时就已含完整 intro —— 所以本页**同步立即打开**，不碰分包。
    //   （快照与 registry 同源：构建期从 registry.catalog() 提取，数据一致。）
    var a = this.data.about
    var items = (a.aboutNotes && a.aboutNotes[id]) || []
    var target = (a.backTarget && a.backTarget[id]) || 'about'
    this.go('detail', {
      detail: { title: a.resTitle[id], items: items },
      detailBack: target
    })
  },

  // 内容详情页「‹」：回上一级（about 关于 / us 关于我们）
  gotoDetailBack: function () { this.go(this.data.detailBack || 'about') },

  noop: function () {},
  // 开屏页：停留 → 挂 .nt-splash-out 播退场（theme.css --d-splash）→ 摘 overlay。
  // 淡出手法同弹窗：先播后摘（直接 setData({splashShow:false}) 会摘掉节点、动画来不及播）。
  // 停留/退场时长走 transition.js 的 TIMING（单一真源，三端共用，镜像 theme.css 令牌）。
  runSplash: function () {
    var self = this
    var hold = (Transition && Transition.TIMING) ? Transition.TIMING.SPLASH_HOLD : 1200
    var fade = (Transition && Transition.TIMING) ? Transition.TIMING.SPLASH_FADE : 400
    this._splashTimer = setTimeout(function () {
      self.setData({ splashOut: true })             // 品牌组缩放到起始页比例并淡出
      self._splashUnload = setTimeout(function () {
        self.setData({ splashShow: false, splashOut: false })   // 退场结束再卸载
      }, fade)
    }, hold)
  },
  // 退场时长走 transition.js 的 TIMING.MODAL_OUT（单一真源，镜像 theme.css --d-modal-out）。
  // 统一的「播退场 → 再卸载」收尾：cancel / 点遮罩 都走这里；doClear（确认）也复用，
  // 把切页/清输入/落主题推迟到退场播完之后，避免遮罩还在淡出时页面已经跳走造成重影。
  closeModal: function (then) {
    if (this._modalClosing) return
    this._modalClosing = true
    this.setData({ clearClosing: true })   // 挂 .nt-mask-out，播 nt-fall（淡出 + 下沉）
    var self = this
    var outMs = (Transition && Transition.TIMING) ? Transition.TIMING.MODAL_OUT : 200
    clearTimeout(this._modalOutTimer)
    this._modalOutTimer = setTimeout(function () {
      self.setData({ clearOpen: false, clearClosing: false })   // 卸载节点
      self._modalClosing = false
      if (then) then()
    }, outMs)
  },
  // 清缓存会重置主题偏好（回落跟随系统）→ 重读主题，同步 .nt-dark 反色态与品牌 logo，
  // 否则清完后主题看着没变（「清除缓存达不到效果」根因修复）
  doClear: function () {
    Settings.clearData()
    // ⚠ v3.1.41：会话器是「延迟创建」的（analyzer 在分包里），用户可能在首次提问前就来清缓存
    //   → this.conv 还是 null，直接 .clear() 会抛（真机实测崩过）。先判空。
    if (this.conv) this.conv.clear()
    var th = (Theme && typeof Theme.current === 'function') ? Theme.current() : 'light'
    var self = this
    this.closeModal(function () {
      self.setData({
        input: '',
        result: EMPTY_RESULT,
        isDark: th === 'dark',
        themeLogo: (Theme && Theme.logoFor) ? Theme.logoFor(th) : '/static/icons/logo.png',
        toastText: (self.data.about.clearModal && self.data.about.clearModal.done) || '已彻底清除缓存'
      })
      self.syncWindowBg(th === 'dark')
      self.go('home')
      self.showToast()
    })
  },

  showToast: function () {
    var self = this
    this.setData({ toastOpen: true })
    clearTimeout(this._toastTimer)
    this._toastTimer = setTimeout(function () { self.setData({ toastOpen: false }) }, 2000)
  },

  onUnload: function () {
    clearTimeout(this._toastTimer)
    clearTimeout(this._navTimer)
    clearTimeout(this._settleTimer)
    clearTimeout(this._splashTimer)
    clearTimeout(this._splashUnload)
    clearTimeout(this._modalOutTimer)
  }
})
