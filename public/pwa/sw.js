/* NT-Xhex 玄玖灵犀 · Service Worker（浏览器 PWA 独立壳，scope = public/pwa/）
   缓存外壳逻辑单一真源 = modules/UIModule/sw-core.js（与 uni-app H5 的根 sw.js 共用一份）。
   本壳只传本形态差异参数：CACHE 命名空间 `nt-xhex-pwa-v<ver>` + CORE/fallback 均带 ./ 前缀
   （PWA 独立壳的 scope 是 public/pwa/，与根 H5 的 '/' 不同，故 CORE 路径形态各异，保留在各自壳里）。
   CACHE 内嵌版本号（改静态资源后由 tools/sync-version.js 统一更新，见 version.json）。 */
importScripts('../../modules/UIModule/sw-core.js');
self.__SWCore.run({
  cache: 'nt-xhex-pwa-v3.1.20',
  core: ['./', './index.html', './manifest.json'],
  fallback: './index.html'
});
