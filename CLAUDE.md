# CLAUDE.md – instruktioner för AI-assistenter

Läs även `PROJECT.md` (bakgrund, API-detaljer, kända begränsningar) och `SETUP.md` (publicering på GitHub Pages).

## Vad är detta
Enfils-väderapp (`index.html`, vanilla JS, inga beroenden, inget bygge) på svenska för att jämföra
SMHI, MET Norway (Yr) och DMI och planera aktiviteter (golf m.m.) i Skåne. Standardplats: Ljungbyhed GK.

## Regler
- **Håll det enkelt:** en HTML-fil, kommenterad kod, inga ramverk, inga byggsteg.
- Språk i UI och kommentarer: svenska.
- Alla källor normaliseras till samma råformat (se `SOURCES` i koden) och sedan till timrader (`buildHourly`).
  Ny källa = ny post i `SOURCES` som returnerar `{entries, precip}`.
- Källfel får aldrig krascha appen: `loadSource` returnerar status `ok | stale | error`.
- Inga nycklar används (DMI kräver sedan dec 2025 ingen nyckel). Lägg **aldrig** in nycklar eller privata e-postadresser i
  repot – det ligger publikt på GitHub Pages. Kräver en källa nyckel i framtiden: lägg en proxy (t.ex. Cloudflare Worker) emellan.
- localStorage-nycklar har prefixet `sv1:` (inställningar: `sv1:settings`, cache: `sv1:cache:*`).
  Ändrar du format på sparad data – byt prefix (t.ex. `sv2:`) eller migrera.

## Testa
- Syntaxkoll: extrahera `<script>` och kör `node --check`.
- Logiken (`buildHourly`, `judge`, `consensus`, `agreement`, `bestWindow`, `parseDmi`) är exponerad som `window.SV` för
  konsoltester. Inga `file://`-problem för SMHI/MET/Open-Meteo (de skickar CORS-headers). Alla tre källor är verifierade med riktiga anrop 2026-11-19.
- Riktiga anrop går att prova från valfri https-sida i webbläsarkonsolen (CORS tillåter det).

## Fallgropar (verifierade 2026-11-19)
- SMHI:s gamla `pmp3g` är nedlagt – använd `snow1g/version/1`. Tidsnyckel heter `time` (= intervallets slut).
- MET: `compact` saknar byvind – appen använder `complete`. Sätt **ingen** egen User-Agent-header i webbläsaren: Firefox m.fl. skickar då en CORS-preflight som MET inte godkänner ("NetworkError"). Utan header funkar anropet överallt (MET identifierar webbappar via Origin).
- DMI: ingen nyckel krävs (sedan 2 dec 2025). EDR-API ~1 anrop/10 s, kan svara 429; `wind-speed-10m` kräver `crs=crs84`.
  `total-precipitation` är ackumulerad sedan modellkörningens start men kan hoppa ned någon hundradel – differensen klipps vid 0.


## Design (scorekort)

Sidan är formgiven som ett golf-scorekort: veckan är ett kort med en rad per dag och en ruta per timme (grön/gul/röd, röd har snedstreck för färgblinda). Orange triangel = källorna oense om regn. Tjock understrykning = bästa fönstret. Läget "Ingen" visar regnintensitet i blått. Hero-texten svarar i klartext på när det passar bäst. Färger och typsnitt finns som CSS-variabler överst i `index.html`. Inga externa typsnitt eller bibliotek.


## Snö (nederbördstyp)

Varje källa levererar nu en snöandel (0–1) per nederbördsperiod: `precip: [{s,e,mm,snow}]`, `snow = null` om okänt.
- SMHI: `precipitation_frozen_part` (fraktion, -9 = saknas), annars `predominant_precipitation_type_at_surface` (5/6 snö, 7 blandat).
- Yr: `symbol_code` i `next_1_hours`/`next_6_hours` (innehåller `snow` eller `sleet`).
- DMI: ökning av `time-integral-of-total-solid-precipitation-flux` delat med ökning av `total-precipitation` (DMI:s `precipitation-type` var tom vid test).
En källa räknas som snö vid minst 0,1 mm och snöandel >= 0,5. En timme får ❄ när minst hälften av källorna med nederbörd säger snö. Cache-nyckeln är `sv2:cache:` så gammal cache utan snödata ignoreras.
Läget "Vintergolf" (min 3 °C, max 0,2 mm, max 8 m/s) har lagts till bland standardlägena.
Obs: snölogiken är enhetstestad med syntetisk data, inte mot verkligt snöfall (det snöade inte vid testet).


## Vyer
Se PROJECT.md ("Två vyer"). `render()` väljer `renderPlan()`/`renderWeather()`; byte av vy får aldrig anropa `load()`. Vyn sparas som `view` i `sv1:settings`. Ändra inte `judge/consensus/agreement/bestWindow` utan att ändra poängmodellen i PROJECT.md.


## Väderbilder
Väder-vyns bilder styrs av EN klassificering, `classify()`/`describe()` (se PROJECT.md "Väderbilder"). Text, sammanfattningsscen (`wxScene`), timikon och veckoikon (`wIcon`) ska alltid använda samma `describe`-resultat. Regn/snö kommer från nederbördsdata, aldrig temperatur. Animationer: bara transform/opacity, måste respektera `prefers-reduced-motion`. Rör inte Planera.
