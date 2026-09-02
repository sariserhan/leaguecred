/*
 * LeagueCred service worker.
 *
 * What it deliberately does NOT do is cache pages. Almost every route here is
 * rendered for the visitor looking at it — their locks, their notifications,
 * their handle in the header — and a shared browser profile plus a cached HTML
 * page is how one member's slip ends up on another member's screen. So
 * navigations always go to the network, and the only page in the cache is the
 * signed-out /offline shell that stands in when the network is gone.
 *
 * What it does cache is the part that is identical for everyone: hashed build
 * assets, fonts, crests and icons. That is what makes a second launch feel
 * instant, and it carries no session with it.
 *
 * Bump VERSION to retire every cache this worker owns on the next activation.
 */
const VERSION = "v1";
const SHELL_CACHE = `leaguecred-shell-${VERSION}`;
const ASSET_CACHE = `leaguecred-assets-${VERSION}`;
const OWN_CACHES = [SHELL_CACHE, ASSET_CACHE];

const OFFLINE_URL = "/offline";

/** Crests and og images are plentiful and none of them are load-bearing, so the
 *  asset cache is capped and the oldest entries fall out first. */
const ASSET_CACHE_LIMIT = 160;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // `credentials: "omit"` is the point of fetching this by hand rather than
      // handing the URL to cache.add: the offline page has to be stored as the
      // signed-out version, never with a member's session baked into it.
      const response = await fetch(OFFLINE_URL, { credentials: "omit", cache: "reload" });
      if (response.ok) await cache.put(OFFLINE_URL, response);
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // A navigation would otherwise wait for this worker to boot before its
      // request even starts; preloading runs the two in parallel.
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => name.startsWith("leaguecred-") && !OWN_CACHES.includes(name)).map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

/** The page asks for this once the visitor has accepted the update toast. A new
 *  worker never takes over on its own: swapping the assets under a page that is
 *  already running is how a half-updated screen happens. */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Anything that carries or answers with session state stays on the network:
  // the API, the auth routes, and the RSC payloads a soft navigation fetches.
  if (url.pathname.startsWith("/api/") || url.searchParams.has("_rsc")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkThenOfflinePage(event));
    return;
  }

  // Build output is content-hashed, so a hit is by definition the right file
  // and there is nothing to revalidate.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(event, ASSET_CACHE));
    return;
  }

  if (isSharedAsset(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event, ASSET_CACHE));
  }
});

/** Assets that are the same for every visitor but can change without their URL
 *  changing — hence served from cache and refreshed behind the screen. */
function isSharedAsset(pathname) {
  return (
    pathname.startsWith("/_next/image") ||
    pathname.startsWith("/icons/") ||
    pathname === "/icon" ||
    pathname === "/apple-icon" ||
    /\.(?:avif|webp|png|jpg|jpeg|gif|svg|ico|woff2?)$/.test(pathname)
  );
}

async function networkThenOfflinePage(event) {
  try {
    const preloaded = await event.preloadResponse;
    if (preloaded) return preloaded;
    return await fetch(event.request);
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    const offline = await cache.match(OFFLINE_URL);
    // Without a precached shell there is nothing better to show than the
    // browser's own error page, which is what Response.error() produces.
    return offline ?? Response.error();
  }
}

async function cacheFirst(event, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(event.request);
  if (hit) return hit;

  const response = await fetch(event.request);
  if (response.ok) {
    await cache.put(event.request, response.clone());
    event.waitUntil(trim(cacheName));
  }
  return response;
}

async function staleWhileRevalidate(event, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(event.request);

  const fresh = fetch(event.request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(event.request, response.clone());
        await trim(cacheName);
      }
      return response;
    })
    .catch(() => hit);

  if (hit) {
    event.waitUntil(fresh);
    return hit;
  }
  const response = await fresh;
  return response ?? Response.error();
}

async function trim(cacheName) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  // keys() comes back in insertion order, so the overflow is the oldest.
  await Promise.all(keys.slice(0, keys.length - ASSET_CACHE_LIMIT).map((key) => cache.delete(key)));
}
