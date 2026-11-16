// Service worker do Extrator de PDF PRO (JLS SOFT)
// Sobe a versão abaixo sempre que publicar uma atualização, para o app instalado pegar a novidade.
const VERSAO = 'extrator-pdf-pro-v1';
const CACHE_APP = VERSAO + '-app';
const CACHE_LIBS = VERSAO + '-libs';

const ARQUIVOS_APP = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon-64.png',
  './logo-header.png'
];

// Bibliotecas externas (pdf.js, SheetJS, fontes): guardadas no primeiro acesso com internet
const HOSTS_LIBS = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event)=>{
  event.waitUntil(
    caches.open(CACHE_APP).then(c => c.addAll(ARQUIVOS_APP)).then(()=> self.skipWaiting())
  );
});

self.addEventListener('activate', (event)=>{
  event.waitUntil(
    caches.keys()
      .then(chaves => Promise.all(chaves.filter(k => !k.startsWith(VERSAO)).map(k => caches.delete(k))))
      .then(()=> self.clients.claim())
  );
});

self.addEventListener('fetch', (event)=>{
  const req = event.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);

  // bibliotecas externas: usa o cache e atualiza em segundo plano
  if(HOSTS_LIBS.includes(url.hostname)){
    event.respondWith(
      caches.open(CACHE_LIBS).then(async cache => {
        const guardado = await cache.match(req);
        const rede = fetch(req).then(resp => {
          if(resp && (resp.ok || resp.type === 'opaque')) cache.put(req, resp.clone());
          return resp;
        }).catch(()=> guardado);
        return guardado || rede;
      })
    );
    return;
  }

  // arquivos do próprio app
  if(url.origin === self.location.origin){
    // páginas: tenta a rede (pega versão nova) e cai no cache se estiver offline
    if(req.mode === 'navigate'){
      event.respondWith(
        fetch(req).then(resp => {
          const copia = resp.clone();
          caches.open(CACHE_APP).then(c => c.put('./index.html', copia));
          return resp;
        }).catch(()=> caches.match('./index.html'))
      );
      return;
    }
    // demais arquivos: cache primeiro
    event.respondWith(
      caches.match(req).then(achou => achou || fetch(req).then(resp => {
        if(resp && resp.ok){
          const copia = resp.clone();
          caches.open(CACHE_APP).then(c => c.put(req, copia));
        }
        return resp;
      }))
    );
  }
});
