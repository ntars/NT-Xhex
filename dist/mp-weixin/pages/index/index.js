/**
 * 玄玖灵犀 NT-Xhex · 单页三视图：首页（输入）→ 结果页（展示分析）→ 关于页 → 二级页
 * 复用共享纯 JS 引擎（modules/），视图层小程序原生。
 * 问答流转走共享 conversation.js（单轮，不显示历史）；结果排版走共享 result-format.js。
 * 转场（双层视差）走共享 transition.js（单一真源）：底层=旧页(prevView)、顶层=当前页(view)，
 *   切页瞬间旧页仍满屏（视觉连续不闪），新页右滑入、旧页左移压暗；330ms 后底层=顶层静止。
 */
var Conversation = require('../../utils/modules/HomeModule/conversation.js')
var ResultFormat = require('../../utils/modules/HomeModule/result-format.js')
var Analyzer = require('../../utils/modules/AnalyzerModule/analyzer.js')
var Storage = require('../../utils/modules/StorageModule/storage.js')
var Settings = require('../../utils/modules/SettingsModule/settings.js')
var SafeArea = require('../../utils/modules/UIModule/safe-area.js')
var Theme = require('../../utils/modules/UIModule/theme.js')
var Transition = require('../../utils/modules/UIModule/transition.js')

var EMPTY_RESULT = { title: '', lead: '', blocks: [], question: '' }

Page({
  data: {
    view: 'home',        // 顶层（当前页）
    prevView: 'home',    // 底层（转场中的旧页；静止态=当前页）
    navAnim: '',          // '' | 'stage-fwd' | 'stage-back'（驱动 theme.css 双层 keyframe）
    input: '',
    result: EMPTY_RESULT,
    about: {},
    nav: SafeArea.DEFAULTS,
    isDark: false,
    themeLogo: '/static/icons/logo.png',
    detail: { title: '', items: [] },
    detailBack: 'about',
    clearOpen: false,
    toastOpen: false,
    toastText: ''
  },

  onLoad: function () {
    this.conv = Conversation.createConversation({ analyzer: Analyzer, storage: Storage })
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
    // 恢复上次这一问（刷新/重进不丢）——直接落位，不播转场（底层=顶层=目标页）
    var last = this.conv.restore()
    if (last) {
      this.setData({ view: 'result', prevView: 'result', result: this.shape(last.question, last.answer) })
    }
  },

  shape: function (question, answer) {
    var f = ResultFormat.format(answer)
    f.question = question
    return f
  },

  // 切视图（双层视差转场由 transition.js 驱动；布局不动；模块缺失时降级为无动画直切，绝不影响运行）
  // 切页瞬间：底层=旧页(view)、顶层=新页(to) + 方向类 → 旧页满屏不闪，新页右滑入。
  // 330ms 后：清方向类 + 底层同步为新页（静止态顶层盖底层，无视觉跳变）。
  go: function (to, prep) {
    var from = this.data.view
    if (from === to) return
    var anim = ''
    if (Transition && typeof Transition.dirClass === 'function') anim = Transition.dirClass(from, to)
    var patch = { view: to, prevView: from, navAnim: anim }
    if (prep) { for (var k in prep) patch[k] = prep[k] }
    var self = this
    this.setData(patch)
    clearTimeout(this._navTimer)
    this._navTimer = setTimeout(function () {
      self.setData({ navAnim: '', prevView: to })   // 静止：底层=顶层=当前页
    }, 330)
  },

  onInput: function (e) { this.setData({ input: e.detail.value }) },

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
      this.showToast()
      return
    }
    var r = this.conv.ask(text)
    if (!r.ok) return
    this.go('result', { input: '', result: this.shape(r.question, r.answer) })
  },

  // 返回输入页（清空当前结果）
  gotoHome: function () {
    this.conv.clear()
    this.go('home', { input: '', result: EMPTY_RESULT })
  },

  gotoAbout: function () { this.go('about') },

  // 关于页点设置项：clear（红）→ 就地弹窗；us → 关于我们页；refs/intro → 内容详情页
  onRow: function (e) {
    var id = e.currentTarget.dataset.id
    var rows = this.data.about.aboutRows || []
    for (var i = 0; i < rows.length; i++) { if (rows[i].id === id && rows[i].danger) { this.setData({ clearOpen: true }); return } }
    if (id === 'us') { this.go('us'); return }
    this.openDetail(id)
  },

  // 关于我们页点 3 张卡 → 各自内容详情页
  onUsRow: function (e) { this.openDetail(e.currentTarget.dataset.id) },

  // 打开内容详情页：标题/正文/返回目标全取 settings.js 单一真源
  openDetail: function (id) {
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

  closeClear: function () { this.setData({ clearOpen: false }) },
  noop: function () {},
  doClear: function () {
    Settings.clearData()
    this.conv.clear()
    // 清缓存会重置主题偏好（回落跟随系统）→ 重读主题，同步 .nt-dark 反色态与品牌 logo，
    // 否则清完后主题看着没变（「清除缓存达不到效果」根因修复）
    var th = (Theme && typeof Theme.current === 'function') ? Theme.current() : 'light'
    this.setData({
      clearOpen: false,
      input: '',
      result: EMPTY_RESULT,
      isDark: th === 'dark',
      themeLogo: (Theme && Theme.logoFor) ? Theme.logoFor(th) : '/static/icons/logo.png',
      toastText: '已恢复出厂设置'
    })
    this.go('home')
    this.showToast()
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
  }
})
