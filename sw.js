var CACHE_NAME = 'shift-calendar-v2';
var APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(key){ return key !== CACHE_NAME; })
            .map(function(key){ return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event){
  if(event.request.method !== 'GET') return;

  var isAppShellDoc = event.request.mode === 'navigate' ||
    event.request.url.indexOf('/index.html') !== -1 ||
    event.request.url.indexOf('/manifest.json') !== -1;

  if(isAppShellDoc){
    // 문서/매니페스트는 네트워크 우선: 당겨서 새로고침 등으로 다시 접속하면
    // 배포된 최신 버전을 바로 받아오고, 오프라인일 때만 캐시로 대체.
    event.respondWith(
      fetch(event.request).then(function(response){
        if(response && response.ok){
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
        }
        return response;
      }).catch(function(){ return caches.match(event.request); })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(cached){
      var networkFetch = fetch(event.request).then(function(response){
        if(response && response.ok && event.request.url.indexOf(self.location.origin) === 0){
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
        }
        return response;
      }).catch(function(){ return cached; });

      return cached || networkFetch;
    })
  );
});
