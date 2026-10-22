/**
 * NT-Xhex · 运行环境检测与形态切换模块（EnvModule/env.js）
 * 职责：
 *  - detectPlatform(): 运行时判断平台（wx→mp-weixin，window→h5，其余→native）
 *  - PWA：注册 Service Worker、beforeinstallprompt 安装引导
 * 说明：含 DOM/全局访问，均有守卫，小程序端引入安全（分支不命中）。
 *       品牌/版本/备案等文案不在本模块（单一真源 = SettingsModule/settings.js 的 about()），
 *       视觉色阶统一在 UIModule/theme.css。
 * 加载：UMD —— 小程序被 require；浏览器挂到全局 NT.env。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.NT = root.NT || {}; root.NT.env = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {

  class Env {
    constructor() {
      this.deferredPrompt = null;
    }
    detectPlatform() {
      if (typeof wx !== 'undefined' && wx && wx.getWindowInfo) return 'mp-weixin';
      if (typeof window !== 'undefined' && window.navigator) {
        var ua = window.navigator.userAgent || '';
        if (/MicroMessenger/i.test(ua)) return 'mp-weixin-webview';
        return 'h5';
      }
      return 'native';
    }
    // 仅在 H5 有效
    initInstallPrompt() {
      if (this.detectPlatform() !== 'h5' || typeof window === 'undefined' || !window.addEventListener) return;
      var self = this;
      window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        self.deferredPrompt = e;
        self.dispatch('installavailable');
      });
      window.addEventListener('appinstalled', function () {
        self.deferredPrompt = null;
        self.dispatch('installed');
      });
    }
    canInstall() { return !!this.deferredPrompt; }
    promptInstall() {
      if (!this.deferredPrompt) return Promise.resolve(false);
      this.deferredPrompt.prompt();
      var p = this.deferredPrompt.userChoice;
      this.deferredPrompt = null;
      return p ? p.then(function (c) { return c.outcome === 'accepted'; }) : Promise.resolve(false);
    }
    dispatch(type) {
      if (typeof window === 'undefined' || !window.dispatchEvent) return;
      try { window.dispatchEvent(new CustomEvent('nt:' + type)); } catch (e) { /* noop */ }
    }
    registerServiceWorker(swPath) {
      if (this.detectPlatform() !== 'h5' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return Promise.resolve(null);
      try {
        // swPath 由各 H5 壳传入：uni-app H5 用默认 'sw.js'（根目录，manifest.json → h5.sw.path）；
        // PWA 壳传 'pwa-sw.js'（v3.2.2 起 PWA 上移仓库根，与 uni-app 的 sw.js 同名避让）。
        return navigator.serviceWorker.register(swPath || 'sw.js').then(function (reg) { return reg; }).catch(function () { return null; });
      } catch (e) { return Promise.resolve(null); }
    }
  }

  // 暴露：默认实例（detectPlatform / PWA 安装引导 / Service Worker 注册）
  return new Env();
});
