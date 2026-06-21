// 喵了个咪 Service Worker — 静态资源缓存
const CACHE_NAME = 'miaolegemi-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/猫咪消消乐.html',
  '/api.js',
];

// 安装：预缓存核心 HTML/JS
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => {
      return Promise.all(
        names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      );
    })
  );
  self.clients.claim();
});

// 请求拦截
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API 请求：走网络，不缓存
  if (url.pathname.startsWith('/api/')) return;

  // HTML 文件：Network First（获取最新版本）
  if (event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // 静态资源：Cache First，fetch 失败时回退网络
  if (event.request.destination === 'image' ||
      event.request.destination === 'audio' ||
      event.request.destination === 'font' ||
      event.request.destination === 'video' ||
      event.request.destination === 'style' ||
      event.request.destination === 'script') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(err => {
          // 网络失败且无缓存：静默失败，让浏览器按无 SW 处理
          console.warn('SW: fetch failed for', url.pathname, err.message);
          return new Response('', { status: 503, statusText: 'Service Unavailable' });
        });
      })
    );
    return;
  }

  // 其他：Network First 兜底
  event.respondWith(
    fetch(event.request).then(response => {
      if (response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => {
      return caches.match(event.request);
    })
  );
});
