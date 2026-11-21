# PROJECT.md – Väderkoll

## Mål
Mobilvänlig enfils-app (`index.html`) som visar SMHI, Yr (MET Norway) och DMI sida vid sida, timme för timme,
markerar var källorna är överens/oense och ger grön/gul/röd poäng för aktiviteter (Golf, Promenad/löpning,
Cykling, Grillning, egna lägen). Standardplats: **Ljungbyhed GK** (ungefärlig position 56.078, 13.230 – justera vid behov).

## Funktioner
- Platssökning (Open-Meteo geocoding, bara Sverige), koordinater (`56.08, 13.23`), webbläsarens platstjänst (`📍 Min plats`) och sparade favoriter.
- Tre källor sida vid sida: temp, nederbörd (mm/h), vind + byvind (m/s) + vindriktning (N..NV), molnighet (%).
- Enighet: orange ram + etikett när källorna är oense om nederbörd (`regn 1/3`, `snö 2/3`, `snöbl. 2/3`), temp (≥3 °C spridning), vind (≥3 m/s) eller moln (≥50 %).
- Aktivitetslägen med justerbara gränsvärden (temp min/max, regn, vind, byvind, moln, gul marginal %); egna lägen kan skapas/tas bort.
  Läge "Ingen" = rå prognos.
- Tidsfilter (standard 07–19) och "bästa fönster" per dag (längsta gröna, annars gröna/gula, minst N timmar).
- Förklaring av nekade timmar (`kallt`, `nederbörd`, `snö`, `vind`, `byvind`, `moln`) både i tabellens *Samlat*-kolumn, som tooltip på scorekortets timrutor och som sammanfattning med snabbförslag (t.ex. *Prova Vintergolf →* eller kortare fönster) när inget fönster hittas.
- Inline-SVG dagsgraf (`dayChartHtml`) som visar källornas temperaturkurvor (SMHI heldragen, Yr streckad, DMI prickad), spridningsband, aktivitetsgräns och nederbördsstaplar.
- Cache 30 min i localStorage; vid fel visas gammal cache (status `stale`). Källa som är nere kraschar inte appen.
- Allt sparas i localStorage: plats, favoriter, läge, gränser, tidsfilter.

## Konfiguration (överst i scriptet, `CONFIG`)
| Variabel | Beskrivning |
|---|---|
| `CACHE_MIN` | Cachetid i minuter (30). |
| `DAYS` | Antal dagar i vyn (7). |
| `DEFAULT_LOC` | Startplats. |

## Arkitektur
En statisk `index.html` (GitHub Pages) som anropar SMHI, MET Norway, DMI och Open-Meteo direkt från webbläsaren. Ingen backend, inga hemligheter. Se `SETUP.md`.

## Datakällor (verifierade med riktiga anrop 2026-11-19)
| Källa | Endpoint | Nyckel | Täckning | Anmärkning |
|---|---|---|---|---|
| SMHI | `https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1/geotype/point/lon/{lon}/lat/{lat}/data.json` | nej | ~10 dygn (1 h första ~2 d, sedan 3/6/12 h) | Ersätter pmp3g (nedlagt 31 mars 2026). `time` = intervallets slut; moln i oktas (×12,5 → %); nederbörd = `precipitation_amount_mean` (mm över intervallet). |
| MET/Yr | `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat={lat}&lon={lon}` | nej | ~10 dygn (1 h första ~2,5 d, sedan 6 h) | `complete` ger byvind (`wind_speed_of_gust`, saknas i 6 h-delen). Nederbörd från `next_1_hours` resp. `next_6_hours`. CORS fungerar utan egen header. Skicka **inte** User-Agent från webbläsaren (Firefox ger då CORS-fel "NetworkError"). |
| DMI | `https://opendataapi.dmi.dk/v1/forecastedr/collections/harmonie_dini_sf/position?coords=POINT(lon lat)&crs=crs84&parameter-name=temperature-2m,wind-speed-10m,gust-wind-speed-10m,total-precipitation,fraction-of-cloud-cover&f=GeoJSON` | nej (krävdes tidigare; slopat 2 dec 2025) | 60 h (HARMONIE DINI, ~2 km) | Verifierat live: 61 timsteg (~60 h), `step` = giltighetstid, temp i Kelvin, moln som andel 0–1, `total-precipitation` ackumulerad (differens; små nedhopp = brus). Strypt till ~1 anrop/10 s (appen väntar in), 429 vid hög belastning. CORS fungerar. |
| Geokodning | `https://geocoding-api.open-meteo.com/v1/search?name=..&countryCode=SE&language=sv` | nej | – | Endast platssökning. |

Villkor: SMHI öppna data (ange källa), MET Norway Terms of Service (webbappar identifieras via Origin; respektera
`Expires`/cache, inga täta anrop – appens 30 min cache följer detta), DMI Frie data (fair use, ange källa).
Använd bara för icke-kommersiellt bruk som specat.

## Gemensamt dataformat
Råformat per källa: `{ entries:[{t,temp,wind,gust,cloud}], precip:[{s,e,mm}] }` (tider i ms UTC; temp °C; vind m/s; moln %).
`buildHourly(raw)` gör en `Map(timmestart -> {temp,wind,gust,cloud,precip,coarse})`. Grövre steg interpoleras linjärt,
nederbörd fördelas jämnt över intervallet, `coarse:true` visas kursivt i UI.

## Poängmodell
- Per källa och timme: `judge(limits, hour)` → 0 grön / 1 gul / 2 röd. Gul = överträdelse inom marginalen
  (`max(|gräns|·tol%, golv)`; golv: temp 2 °C, regn 0,2 mm, vind 1,5 m/s, byvind 2 m/s, moln 10 %), röd = mer.
- Samlat: snitt över källorna (<0,5 grön, <1,25 gul, annars röd).
- Dag: andel gröna (gul = ½) i tidsfönstret: ≥80 % grön, ≥50 % gul, annars röd.

## Kända begränsningar / att göra
- DMI-parametrarna och svarsformatet är verifierade live, men appen har inte körts i en riktig webbläsare med UI över längre tid (logiken är testad i Node med mockad och riktig data).
- DMI räcker bara 60 h – dagar därefter visas bara SMHI + Yr (samlad poäng baseras på de källor som finns).
- Standardpositionen för Ljungbyhed GK är approximativ; prognoserna är rutnät på ~2–3 km så skillnaden är liten.
- SMHI:s nederbörd: `precipitation_amount_mean` kan vara 0 trots att min/max >0 (ensemble-spridning) – alternativ är
  `_median`, `_max` eller `_mean_deterministic`; byt i `SOURCES.smhi` vid behov.
- Efter ~2–3 dygn är SMHI/Yr grövre (3–6 h) – timvärdena är då interpolerade, inte verkliga timprognoser.
- Prognoser jämförs inte mot observationer; poängen är en tumregel, inte en garanti.
- Tidszon är fast Europe/Stockholm; sommartid hanteras av `Intl`.
- Stickprov mot källornas egna webbsidor (yr.no, smhi.se) gjordes inte visuellt – jämförelsen gjordes mot källornas rå-API-svar.
- Ingen uppdatering medan appen är dold. När den visas igen hämtas källor vars cache gått ut (se PWA nedan); annars tryck ↻.
- Idéer: byvind-tröskel i golfläget, UV.
- Väder-vyn är testad i Node (mockade källor) och i Chrome via Playwright med mockade svar och fast klocka, inte mot live-API i en riktig användarwebbläsare. Skärmläsare/tangentbord är kodat (aria-pressed, tablist, fokusåterställning) men inte provat med skärmläsare.


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


## Två vyer: Planera och Väder

Appen har en vyväxlare (`Planera | Väder`) under platsraden. Det är **samma sida och samma data**: båda vyerna läser `state.src` / `buildDays()`,
och att byta vy anropar bara `render()`, aldrig `load()` (inga nya prognosanrop). Vald vy sparas i `sv1:settings` som `view` (`"plan"` | `"weather"`,
standard `plan` för befintliga användare). Plats, favoriter, vald dag, aktivitet, egna lägen, gränsvärden, tidsfilter och cache delas av båda vyerna.
`state.selDay` är delad; `state.selHour` (vald timme) och `state.cmpOpen` (utfälld källjämförelse) gäller bara Väder och sparas inte.

- **Planera** = scorekortet (oförändrad poängsättning: `judge`, `consensus`, `agreement`, `bestWindow`). Gult betyder gränsfall som oftast är användbart, inte olämpligt.
  Gul har prickmönster, röd snedstreck, så färgen är aldrig ensam bärare. Heron (bästa tiden över hela perioden) och dagens understrukna bästa fönster är två skilda saker.
- **Väder** = allmän prognos, färgas aldrig efter aktivitetens gränsvärden: stor temperatur med stämningsbakgrund (klart/moln/regn/snö/natt),
  scrollbar timremsa (hela dygnet, ignorerar Planeras tidsfilter), veckolista med gemensam temperaturskala, kort (nederbörd, vind, molnighet, känns som, sol, källor)
  och utfällbar "Jämför väderkällor" (samma `detailTable()` som Planera, men utan aktivitetsfärger).

**Texter och kontroller (förenklade 2026-11-19):** korten i Väder har korta rader; förklaringar ligger i den utfällbara "Om prognosen" (`state.aboutOpen`, sparas inte) och källjämförelsen i "Jämför väderkällor". Under temperaturen står t.ex. "Sammanvägd prognos · 3 källor", och för idag "Resten av dagen: högst …, lägst …". I Planera ligger tidsfilter, minsta fönster och gränsvärden bakom "Tider och gränsvärden" (`state.editOpen`) med sammanfattningen "07–19 · minst 3 h" bredvid. Röd rutfärg är mjukare men har kvar snedstrecken.

### Hur Väder räknar (se kommentaren ovanför `combine()` i koden)
- Samlad timme = medelvärde över de källor som har ett värde just den timmen. Saknad källa lämnas utanför (aldrig 0). Gäller temp, nederbörd, vind, byvind, moln.
- Dagens högsta/lägsta, nederbördssumma och högsta vind = `dayAvg()` (medel av källornas egna dagsvärden), här över hela dygnet. För idag gäller värdena återstående timmar.
- Väderbeskrivning/symbol är **härledd** (ingen källa anger den): nederbörd >= 0,1 mm/h ger regn/snö (lätt < 0,5, < 2, kraftigt >= 2 mm/h; snö vid snöandel >= 50 %, blandat 20–50 %), annars molntäcke (<20 % klart, <45 mest klart, <70 halvklart, <90 mestadels molnigt, annars mulet). Dagens symbol: regn/snö om dygnssumman >= 0,5 mm, annars molntäcke 06–18.
- Sol upp/ned är **beräknad** med astronomisk formel (`sunTimes`, ca ±2 min, kontrollerad mot Stockholm 21 dec) och styr dag/natt-symboler och bakgrund. Inte hämtad.
- Känns som = vindkyla (kanadensiska formeln), bara vid <= 10 °C och >= 1,3 m/s medelvind. Annars visas "–" med förklaring.
- Kursiv temperatur i timremsan = alla bidragande källor är interpolerade från grövre tidssteg.
- Allt är prognoser. Appen visar inga observationer och hävdar inget om banans tillgänglighet eller skick.

### Medvetet utelämnat (finns inte i det normaliserade datat)
Luftfuktighet, UV och sikt. De skulle kräva ändringar i alla tre adaptrar (`SOURCES`) och DMI-parametrar. Lägg till i `entries` först, sedan i kort.

## Väderbilder i Väder-vyn (visuell tillståndslogik)
Inline-SVG (inga bilder, ikonbibliotek eller emoji). Rör aldrig Planera (poäng, lägen, tröskelvärden, bästa fönster).

**EN klassificering:** `classify(c)` (+ `describe(c, night)`) tar `{precip, snow, cloud}` från `combine()` och ger
`{key, cover, lvl, label, night}`. Samma objekt styr text, sammanfattningsbild, timikon och veckoikon, så bild och text kan inte säga emot varandra.
- Nederbörd ≥ 0,1 mm/h: styrka `lvl` 1/2/3 vid <0,5 / <2 / ≥2 mm. Snöandel ≥ 0,5 → `snow`; 0,2–0,5 → `sleet` (Snöblandat regn); annars `rain`.
  Okänd typ (`snow == null`): ritas som regn men texten är "Nederbörd". Temperatur används aldrig för regn/snö.
- Torrt: molnighet <20 klart, <45 `few` (Mest klart), <70 `half` (Halvklart), <90 `mostly` (Mestadels molnigt), annars `overcast` (Mulet).
- Saknas både nederbörd och moln → `unknown`: neutral streckad molnikon, neutral bakgrund, ingen text (aldrig solsken).
- Natt: `isNight(t)` använder `sunTimes` för den valda dagen och platsen; midnattssol/polarnatt hanteras, saknade soltider → dag. Valt datum/timme styr, inte datorns klocka.
- Veckoikon: `daySymbol` = nederbörd om dygnets nederbörd ≥ 0,5 mm (snöandel = medel av kända), annars medelmolnighet 06–18. Alltid dagikon.
- Bakgrundston: `toneOf` → clear/cloud/rain/snow/night/neutral (CSS `.sum[data-tone]`).

**Ritning:** `wIcon(st, px)` (48×48, små ikoner) och `wxScene(st)` (400×240, sammanfattningen) delar byggstenar `cloudG`/`moonG`. Scenen får egna gradient-id (`wx1s`, `wx1m`, …) via räknaren `wxUid`.
**Layout:** `.sum` har texten till vänster och scenen (`.art`, `aria-hidden`, `pointer-events:none`, maskad mot texten) absolut till höger i en kolumn `--aw`; kortets höjd ändras inte (dator ≈243 px mot 250 tidigare, mobil ≈177 mot 193). På mobil ligger scenen mellan datumraden och högst/lägst-raden.
**Animation:** bara `transform`/`opacity` på få element (molndrift, solglöd, droppar, flingor, stjärnor). `prefers-reduced-motion` stänger av alla (full statisk bild); `#viewWeather[hidden]` pausar.
**Verifierat (Playwright mot lokala mockade fixturer, inget kvar i appen):** alla lägen dag/natt på dator och mobil, 320 px utan sidledsscroll, reduced-motion, unika id, inga extra nätanrop vid byte av dag/timme, saknad data, Planera byte-identisk mot förra versionen.
**Begränsningar:** inte testat med skärmläsare eller på riktiga enheter; molnformerna är stiliserade; snö/regn visas som statiska positioner med lätt rörelse, inte en simulering.


### Vindriktning och geolokalisering (tillagt 2026-11-19)
- Vindriktning (`dir`, grader varifrån vinden blåser): SMHI `wind_from_direction`, Yr `wind_from_direction`, DMI `wind-dir-10m`. Obs: DMI-parametern är **inte verifierad mot riktiga data**; saknas den visas ingen riktning från DMI. Interpoleras cirkulärt (`lerpDeg`) och medelvärdesbildas som vektorer (`meanDeg`).
- `📍 Min plats` i platspanelen använder webbläsarens `navigator.geolocation` (inget lagras utöver vald plats, ingen nyckel). Nekas åtkomst visas ett förklarande meddelande.
- Testat i Node/Chrome med mockad data; geolokalisering bara i nekat-läget.


### DMI och 429 (2026-11-19)
DMI:s öppna API svarar intermittent 429 "Server is busy" (mätt: ~1 av 4 anrop, även med en parameter och >5 s mellanrum). Åtgärder: 90 min cache (`cacheMin`), ↻ hämtar inte om DMI inom 10 min (`minForceMin`), 3 försök med växande paus, bakgrundsförsök varje minut (`retrySoon`, max 5), annars visas senaste data med texten "servern är upptagen (429), försöker igen". Vindriktning begärs inte från DMI.


## PWA (installerbar app, tillagt 2026-11-21)
Appen går att lägga på hemskärmen ("Lägg till på hemskärmen" i Safari, "Installera app" i Chrome/Edge) och öppnas då i eget fönster.
- Filer bredvid `index.html`: `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png` (även maskable), `apple-touch-icon.png` (180 px, iOS).
  Ikonen (flagga på green med sol) är ritad med ett litet PIL-skript och ligger som färdiga PNG:er.
- `sw.js` cachar **bara appens egna filer**, nätet först (max 4 s väntan, sedan cache). Prognos-API:erna (andra domäner) passerar orörda;
  deras data cachas som förut i localStorage. Utan nät visas alltså appen + senast hämtade prognos (status `stale`).
- Ändras listan med filer i `sw.js`: byt `VERSION` (t.ex. `vk-v2`). Ändringar i `index.html` kräver ingen versionsbump – nätet först ger alltid senaste.
- `wake()` i slutet av scriptet: när appen visas igen (`visibilitychange`) eller nätet kommer tillbaka (`online`) hämtas bara källor
  vars cache gått ut, högst en gång per minut. Annars bara omritning (så "idag" och nu-markeringen stämmer).
- SW registreras bara över https/localhost; `file://` fungerar som tidigare utan SW.
- Testat: Chrome (inbyggd webbläsare) via `python -m http.server` – SW aktiv, alla filer i cache, sidan laddas med servern nere, inga konsolfel.
  Inte testat: installation på riktig iPhone/Android.
