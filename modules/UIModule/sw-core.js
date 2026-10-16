/**
 * modules/UIModule/sw-core.js —— 两个 Service Worker 共享的「缓存外壳」逻辑【单一真源】
 *
 * 背景：仓库有两份 SW 各服务一个部署形态，install/activate/fetch 三段逻辑近乎逐字相同，
 *       改一处易漏另一处（v3.1.0 统一收敛，用户要求「能统一调用的就统一调用」）：
 *   · 根 `sw.js`            —— uni-app H5 构建（manifest.json → h5.sw.path），CACHE 名 `nt-xhex-v<ver>`
 *   · `public/pwa/sw.js`    —— 浏览器 PWA 独立壳（env.js 相对注册），CACHE 名 `nt-xhex-pwa-v<ver>`
 *
 * 收敛手法：SW 不能 import ES module，用 `importScripts` 引本文件，共享全部缓存逻辑；
 *   两个薄壳**只传差异参数**（CACHE 命名空间 + CORE 清单 + 兜底页），逻辑此处一份：
 *     importScripts('.../sw-core.js');
 *     self.__SWCore.run({ cache: 'nt-xhex-v3.1.0', core: ['.', 'index.html', 'manifest.json', 'sw.js'], fallback: 'index.html' });
 *
 * 保留各自 CACHE 命名空间（不能统一）：uni H5 与 PWA 各自清缓存，共享一个 CACHE 会互删。
 * 缓存策略（两份一致，唯一真源在此）：网络优先 → 失败回退缓存 → 兜底首页；激活时清旧缓存。
 */
(function (root) {
  function run(cfg) {
    cfg = cfg || {};
    var CACHE = cfg.cache;
    var CORE = cfg.core || ['.', 'index.html'];
    var FALLBACK = cfg.fallback || 'index.html';
    if (!CACHE) { throw new Error('sw-core: cache 名必填'); }

    // install：预装 CORE + 立即接管（skipWaiting）
    root.addEventListener('install', function (e) {
      e.waitUntil(
        caches.open(CACHE)
          .then(function (c) { return c.addAll(CORE); })
          .then(function () { return root.skipWaiting && root.skipWaiting(); })
      );
    });

    // activate：清掉本命名空间之外的旧缓存 + 接管全部客户端
    root.addEventListener('activate', function (e) {
      e.waitUntil(
        caches.keys().then(function (keys) {
          return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
        }).then(function () { return root.clients && root.clients.claim ? root.clients.claim() : Promise.resolve(); })
      );
    });

    // fetch：仅处理同站 GET；网络优先，失败回退缓存，再兜底首页（离线可用）
    root.addEventListener('fetch', function (e) {
      if (e.request.method !== 'GET') return;
      e.respondWith(
        fetch(e.request)
          .then(function (res) {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
            return res;
          })
          .catch(function () {
            return caches.match(e.request).then(function (hit) { return hit || caches.match(FALLBACK); });
          })
      );
    });
  }

  root.__SWCore = { run: run };
})(typeof self !== 'undefined' ? self : this);
