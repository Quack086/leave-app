const CACHE='leave-app-v9-leave-types-fix';
const LOCAL_ASSETS=['./','./index.html','./manifest.webmanifest'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(LOCAL_ASSETS.map(url => cache.add(url)))
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // 非本站請求（例如政府國定假日 API）不要攔截。
  // 這可避免 iPhone PWA 出現：
  // FetchEvent.respondWith received an error: Returned response is null.
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
        }
        return res;
      }).catch(async () => {
        return (await caches.match('./index.html')) ||
               new Response('目前離線，且尚無可用的離線頁面。', {
                 status: 503,
                 headers: {'Content-Type':'text/plain; charset=utf-8'}
               });
      })
    );
    return;
  }

  event.respondWith(
    fetch(req).then(res => {
      if (res && res.ok && req.method === 'GET') {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(async () => {
      return (await caches.match(req)) ||
             new Response('', {status: 504, statusText: 'Offline'});
    })
  );
});
