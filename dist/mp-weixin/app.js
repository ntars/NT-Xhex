/**
 * 玄玖灵犀 NT-Xhex · 微信小程序入口
 * 纯本地、无后端、无网络、无登录、无权限申请。
 * 版本号/版权统一取自 SettingsModule（单一真源），不在此处硬编码。
 */
var Settings = require('./utils/modules/SettingsModule/settings.js')
var Theme = require('./utils/modules/UIModule/theme.js')

/**
 * 启动即把「窗口底色」设成当前主题色（app.json 里写死的是浅色默认值）。
 *
 * 为什么要在 App.onLaunch 就做：窗口底色是**页面容器背后那一层**，不跟 CSS 变量走
 * （theme.wxss 的 page{background:var(--nt-bg)} 只染页面节点本身）。不设的话深色模式下
 * 上下滑动越界 / 下拉回弹会从边缘闪出一条白底 —— 用户实测反馈的「深色下出现白色底」。
 * 各端等价手段：PWA / uni-H5 在 documentElement 上挂 .nt-dark + overscroll-behavior。
 * onLaunch 时页面可能还没就绪，取不到就忽略；页面侧的 index.js onLoad 会再设一次兜底。
 */
function syncWindowBg() {
  if (typeof wx === 'undefined' || typeof wx.setBackgroundColor !== 'function') return
  var dark = false
  try { dark = Theme && typeof Theme.current === 'function' && Theme.current() === 'dark' } catch (e) { /* 取不到按浅色 */ }
  var c = dark ? '#000000' : '#ffffff'
  try { wx.setBackgroundColor({ backgroundColor: c, backgroundColorTop: c, backgroundColorBottom: c }) } catch (e) { /* 页面未就绪，忽略 */ }
}

App({
  globalData: {},
  onLaunch() {
    syncWindowBg()
    var a = Settings.about()
    console.log('[NT-Xhex] 玄玖灵犀 ' + a.version + ' · ' + a.copyright)
  },
  onShow() {
    syncWindowBg()   // 从后台回前台时再对一次（用户可能在系统里切了深/浅色）
  }
})
