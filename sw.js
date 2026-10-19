/* NT-Xhex 玄玖灵犀 · Service Worker（uni-app H5 构建用，manifest.json → h5.sw.path）
   缓存外壳逻辑单一真源 = modules/UIModule/sw-core.js（与 PWA 独立壳共用一份，改缓存策略只改那里）。
   本壳只传本形态的差异参数：CACHE 命名空间 + CORE 清单（根构建 scope 是 '/'）。
   CACHE 名内嵌版本号（改静态资源后由 tools/sync-version.js 统一更新，见 version.json）。 */
importScripts('modules/UIModule/sw-core.js');
self.__SWCore.run({
  cache: 'nt-xhex-v3.1.37',
  core: ['.', 'index.html', 'manifest.json', 'sw.js'],
  fallback: 'index.html'
});
