/**
 * 玄玖灵犀 NT-Xhex · 微信小程序入口
 * 纯本地、无后端、无网络、无登录、无权限申请。
 * 版本号/版权统一取自 SettingsModule（单一真源），不在此处硬编码。
 */
var Settings = require('./utils/modules/SettingsModule/settings.js')

App({
  globalData: {},
  onLaunch() {
    var a = Settings.about()
    console.log('[NT-Xhex] 玄玖灵犀 ' + a.version + ' · ' + a.copyright)
  }
})
