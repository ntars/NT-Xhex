/**
 * modules/UIModule/safe-area.js —— 安全区计算【单一真源】（平台无关，纯 JS）
 *
 * 作用：自定义导航栏（navigationStyle: custom）下，页面从屏幕最顶部起绘，
 *       必须自行避开三块系统区域，否则内容被遮挡、按钮点不到：
 *         ① 顶部状态栏 / 通知栏
 *         ② 右上微信胶囊按钮（「关于」须置于其下方，不可同行）
 *         ③ 底部 iPhone 手势条 / Android 虚拟按键
 *
 * 三端共用同一份计算逻辑，避免每个壳各写一遍而「改一处漏一处」：
 *   · 微信小程序：wx.getWindowInfo() + wx.getMenuButtonBoundingClientRect()
 *   · uni-app 小程序端：uni.getWindowInfo() + uni.getMenuButtonBoundingClientRect()
 *   · H5 / PWA：不在此处算，由 CSS 的 env(safe-area-inset-*) 兜底（本模块返回 0）
 *
 * 返回：{ top, aboutTop, right, bottom }
 *   top      胶囊按钮顶部高度（结果页/关于页头部 padding-top）
 *   aboutTop  「关于」入口的顶部偏移（= 胶囊底部 + 间距，使其位于胶囊下方）
 *   right    右侧避让宽度（与胶囊右缘对齐）
 *   bottom   底部手势条/虚拟按键高度
 *
 * 加载：UMD —— 小程序被 require；浏览器挂到全局 NT.safeArea。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.NT = root.NT || {}; root.NT.safeArea = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {

  /**
   * 计算安全区
   * @returns {{top:number, aboutTop:number, right:number, bottom:number}}
   */
  function calc() {
    // H5 / PWA：CSS env(safe-area-inset-*) 已处理，这里不需要行内避让
    if (typeof window !== 'undefined' && !(typeof wx !== 'undefined' && wx) && !(typeof uni === 'object' && uni)) {
      return { top: 0, aboutTop: 0, right: 0, bottom: 0 };
    }
    // 微信小程序 / uni-app 小程序端：统一走新 API getWindowInfo
    var api = (typeof wx !== 'undefined' && wx && wx.getWindowInfo) ? wx
            : (typeof uni === 'object' && uni && uni.getWindowInfo) ? uni
            : null;
    if (!api) return { top: 0, aboutTop: 0, right: 0, bottom: 0 };

    // 全防御：任何字段缺失/老基础库不支持 → 降级，绝不 throw
    // 注意：wx.getWindowInfo() 的安全区字段是 safeArea（{top,right,bottom,left}），并非 safeAreaInsets；
    //       底部手势条高度 = screenHeight - safeArea.bottom
    var info = (api.getWindowInfo && api.getWindowInfo()) || {};
    var safe = info.safeArea || null;
    var rect = (api.getMenuButtonBoundingClientRect && api.getMenuButtonBoundingClientRect()) || null;
    var statusBar = info.statusBarHeight || 0;
    var width = info.windowWidth || info.screenWidth || 375;
    var bottomInset = (safe && info.screenHeight) ? Math.max(0, info.screenHeight - safe.bottom) : 0;
    return {
      top: rect ? rect.top : statusBar,
      aboutTop: rect ? rect.bottom + 8 : statusBar + 44,
      right: rect ? (width - rect.right + 16) : 0,
      bottom: bottomInset
    };
  }

  /**
   * 各视图安全区默认值（calc() 未就绪 / H5·PWA 端使用）
   * H5/PWA 由 CSS env(safe-area-inset-*) 兜底，这里给 0 即可
   */
  var DEFAULTS = { top: 0, aboutTop: 0, right: 0, bottom: 0 };

  return { calc: calc, DEFAULTS: DEFAULTS };
});
