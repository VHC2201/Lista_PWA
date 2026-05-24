/**
 * sw.js — Service Worker da Todo PWA
 * Estratégia: Cache First para assets estáticos, Network First para navegação.
 * Demonstra: install, activate, fetch lifecycle + limpeza de caches antigos.
 */

'use strict';

const CACHE_VERSION = 'v3';
const CACHE_STATIC  = `todo-pwa-static-${CACHE_VERSION}`;
const CACHE_DYNAMIC = `todo-pwa-dynamic-${CACHE_VERSION}`;

/** Recursos do app shell que devem ser pré-cacheados no install */
const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg'
];

/** Lista de todos os caches que este SW gerencia (para limpeza) */
const KNOWN_CACHES = [CACHE_STATIC, CACHE_DYNAMIC];

/* ──────────────────────────────────────────────────────────── */
/*  INSTALL — pré-cacheia o app shell                          */
/* ──────────────────────────────────────────────────────────── */
self.addEventListener('install', event => {
  console.log(`[SW ${CACHE_VERSION}] Install`);

  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => {
        console.log(`[SW] Cacheando ${STATIC_ASSETS.length} assets estáticos`);
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Ativa imediatamente sem esperar fechar abas antigas
        return self.skipWaiting();
      })
      .catch(err => console.error('[SW] Falha no install:', err))
  );
});

/* ──────────────────────────────────────────────────────────── */
/*  ACTIVATE — remove caches de versões anteriores             */
/* ──────────────────────────────────────────────────────────── */
self.addEventListener('activate', event => {
  console.log(`[SW ${CACHE_VERSION}] Activate`);

  event.waitUntil(
    caches.keys()
      .then(allCaches => {
        const deletions = allCaches
          .filter(name => !KNOWN_CACHES.includes(name))
          .map(name => {
            console.log('[SW] Removendo cache obsoleto:', name);
            return caches.delete(name);
          });
        return Promise.all(deletions);
      })
      .then(() => self.clients.claim()) // Assume controle das abas abertas
      .catch(err => console.error('[SW] Falha no activate:', err))
  );
});

/* ──────────────────────────────────────────────────────────── */
/*  FETCH — intercepta requisições                             */
/* ──────────────────────────────────────────────────────────── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições não-HTTP (chrome-extension://, etc.)
  if (!url.protocol.startsWith('http')) return;

  // Ignora requisições de outros origens (ex: Google Fonts CDN na primeira carga)
  // — deixa o browser lidar normalmente
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(request).catch(() => new Response('', { status: 408 }))
    );
    return;
  }

  // Navegação de página → Network First com fallback para cache
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  // Assets estáticos → Cache First
  event.respondWith(cacheFirstWithDynamicFallback(request));
});

/* ──────────────────────────────────────────────────────────── */
/*  Estratégias de cache                                        */
/* ──────────────────────────────────────────────────────────── */

/**
 * Network First: tenta a rede; se falhar, serve do cache.
 * Ideal para HTML de navegação para garantir conteúdo fresco quando online.
 */
async function networkFirstWithFallback(request) {
  try {
    const networkResponse = await fetch(request);
    // Salva no cache estático se OK
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_STATIC);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    // Offline — serve do cache
    const cached = await caches.match(request);
    if (cached) return cached;
    // Fallback final: index.html
    return caches.match('./index.html');
  }
}

/**
 * Cache First: serve do cache se disponível; caso contrário busca na rede
 * e armazena dinamicamente para uso offline futuro.
 */
async function cacheFirstWithDynamicFallback(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_DYNAMIC);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    // Não há nada em cache e sem rede — retorna 503
    return new Response(
      JSON.stringify({ error: 'Offline e sem cache para este recurso.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/* ──────────────────────────────────────────────────────────── */
/*  MESSAGE — comunicação com o cliente                         */
/* ──────────────────────────────────────────────────────────── */
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
