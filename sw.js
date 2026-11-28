// Online-only PWA: do not cache HTML, API responses, or member data.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
 if(event.request.mode !== 'navigate' || new URL(event.request.url).origin !== self.location.origin) return;
 event.respondWith(fetch(event.request, {cache:"no-store"}).catch(() => new Response('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>オフライン</title><h1>ネット接続が必要です</h1><p>接続を確認して再読み込みしてください。</p><button onclick="location.reload()">再読み込み</button></html>', {headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'},status:503})));
});
