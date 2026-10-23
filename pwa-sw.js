/* NT-Xhex 玄玖灵犀 · Service Worker（浏览器 PWA 独立壳，scope = 仓库根 /）
   缓存外壳逻辑单一真源 = modules/UIModule/sw-core.js（与 uni-app H5 的根 sw.js 共用一份）。
   本壳只传本形态差异参数：CACHE 命名空间 `nt-xhex-pwa-v<ver>` + CORE/fallback 均带 ./ 前缀。
   位置说明（v3.2.2）：原在 public/pwa/sw.js，PWA 上移仓库根后与 uni-app H5 的 sw.js
   同名冲突，故改名 pwa-sw.js —— 由 app.js 经 env.js 的 registerServiceWorker('pwa-sw.js')
   注册；根 sw.js 仍是 uni-app H5 构建用（manifest.json → h5.sw.path），两者互不占用。
   CACHE 内嵌版本号（改静态资源后由 tools/sync-version.js 统一更新，见 version.json）。 */
importScripts('./modules/UIModule/sw-core.js');
self.__SWCore.run({
  cache: 'nt-xhex-pwa-v3.3.0',
  core: ['./', './index.html', './pwa-manifest.json'],
  fallback: './index.html'
});
