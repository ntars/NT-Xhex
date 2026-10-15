/* NT-Xhex 玄玖灵犀 · Service Worker（H5/PWA 形态）
   离线可用 + 缓存外壳。策略：网络优先，失败回退缓存，保证纯本地运行。 */
const CACHE = 'nt-xhex-v3.0';
const CORE = ['.', 'index.html', 'manifest.json', 'sw.js'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  // 仅处理同站 GET 请求
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(function (res) {
        const copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      })
      .catch(function () {
        return caches.match(e.request).then(function (hit) { return hit || caches.match('index.html'); });
      })
  );
});
