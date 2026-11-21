/* Service worker för Väderkoll (PWA).
   - Gör att appen kan installeras och öppnas utan nät.
   - Bara appens egna filer cachas här. Prognoserna (SMHI/Yr/DMI/Open-Meteo) rörs inte:
     de är andra domäner och cachas redan av appen själv i localStorage (sv2:cache:*).
   - Nätet först: finns nät får man alltid senaste index.html (inga "fastnade" gamla versioner).
     Utan nät, eller om nätet inte svarar inom några sekunder, används den sparade kopian.
   Byt VERSION när listan med filer ändras. */
const VERSION = 'vk-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
const TIMEOUT_MS = 4000;   // dålig mobiltäckning: vänta högst så här länge innan cachen används

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {   // städa bort gamla versioner
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;   // API-anrop går direkt till nätet
  // Nätanropet startas direkt; svaret sparas i cachen även om cachen hann svara först (waitUntil håller SW vid liv)
  let saved; e.waitUntil(new Promise((r) => { saved = r; }));
  const net = fetch(req).then((res) => {
    saved(res.ok ? caches.open(VERSION).then((c) => c.put(req, res.clone())).catch(() => {}) : null);
    return res;
  }, (err) => { saved(); throw err; });
  e.respondWith(networkFirst(req, net));
});

async function networkFirst(req, net) {
  const timeout = new Promise((resolve) => setTimeout(resolve, TIMEOUT_MS));
  try {
    const res = await Promise.race([net, timeout]);
    if (res) return res;
  } catch (err) { /* inget nät – faller tillbaka på cachen */ }
  const cache = await caches.open(VERSION);
  const hit = await cache.match(req, { ignoreSearch: true })
    || (req.mode === 'navigate' ? await cache.match('./index.html') : null);
  return hit || net;   // ingen kopia: vänta in nätet (eller dess fel)
}
