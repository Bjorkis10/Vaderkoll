/* =====================================================================
   Cloudflare Worker – proxy för Skåne-väder.
   Håller DMI-nyckeln och din e-post hemliga (som "secrets" i Cloudflare, inte i koden).

   Rutter (GET):  /met?lat=..&lon=..   -> MET Norway locationforecast/complete (med User-Agent)
                  /dmi?lat=..&lon=..   -> DMI HARMONIE DINI (med API-nyckel)

   Miljövariabler (sätts i Cloudflare, se SETUP.md):
     DMI_API_KEY      (Secret)  din DMI-nyckel
     MET_CONTACT      (Secret)  din e-post/webbadress, läggs i User-Agent till MET
     ALLOWED_ORIGINS  (Text)    kommaseparerat, t.ex. https://dittnamn.github.io
   ===================================================================== */
const CACHE_SECONDS = 1800; // 30 min – skonar DMI:s gräns (~1 anrop/10 s) och följer METs krav på cache

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };
    const json = (obj, status) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors } });

    // Bara din egen sida får använda proxyn (webbläsare skickar alltid Origin vid anrop från en sida)
    if (!origin || !allowed.includes(origin)) return json({ error: 'Forbidden' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

    const url = new URL(request.url);
    const lat = parseFloat(url.searchParams.get('lat')), lon = parseFloat(url.searchParams.get('lon'));
    // Begränsa till Norden så proxyn inte kan användas som allmän väder-API
    if (!(lat >= 54 && lat <= 72 && lon >= 3 && lon <= 33)) return json({ error: 'Bad coordinates' }, 400);
    const la = lat.toFixed(3), lo = lon.toFixed(3);   // avrundat => bättre cache-träffar

    let upstream;
    if (url.pathname === '/met') {
      upstream = () => fetch(`https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${la}&lon=${lo}`, {
        headers: { 'User-Agent': `SkaneVader/1.0 ${env.MET_CONTACT || ''}`.trim() },
      });
    } else if (url.pathname === '/dmi') {
      if (!env.DMI_API_KEY) return json({ error: 'DMI_API_KEY saknas i Worker' }, 500);
      const params = 'temperature-2m,wind-speed-10m,gust-wind-speed-10m,total-precipitation,fraction-of-cloud-cover';
      upstream = () => fetch(`https://opendataapi.dmi.dk/v1/forecastedr/collections/harmonie_dini_sf/position?coords=POINT(${lo}%20${la})&crs=crs84&parameter-name=${params}&f=GeoJSON`, {
        headers: { 'X-Gravitee-Api-Key': env.DMI_API_KEY },   // nyckeln i header, inte i URL
      });
    } else return json({ error: 'Not found' }, 404);

    // Cache per rutt + plats (delas av alla användare)
    const cache = caches.default;
    const key = new Request(`https://cache.internal${url.pathname}?lat=${la}&lon=${lo}`);
    let res = await cache.match(key);
    if (!res) {
      let up;
      try { up = await upstream(); } catch (e) { return json({ error: 'Upstream failed' }, 502); }
      if (!up.ok) return json({ error: 'Upstream HTTP ' + up.status }, up.status === 429 ? 429 : 502);   // fel cachas aldrig
      res = new Response(up.body, { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${CACHE_SECONDS}` } });
      ctx.waitUntil(cache.put(key, res.clone()));
    }
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
    return out;
  },
};
