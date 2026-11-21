# SETUP.md – publicera på GitHub Pages

Appen behöver **inga nycklar och ingen backend**. SMHI, MET Norway, DMI och Open-Meteo (platssökning) anropas direkt från webbläsaren
(alla tillåter CORS). Sedan 2 dec 2025 kräver DMI inte längre API-nyckel. Det finns alltså inga hemligheter att dölja.

1. Skapa ett repo på GitHub och lägg in `index.html`, `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (gärna även `CLAUDE.md`, `PROJECT.md`, `SETUP.md`). Alla i roten.
2. Repo → **Settings → Pages** → Source: *Deploy from a branch*, branch `main`, mapp `/ (root)`.
3. Sidan hamnar på `https://DITTANVANDARNAMN.github.io/REPONAMN/`. Skicka länken till din pappa – inget mer behövs.
4. Inget mer behövs. Lägg inte in privata uppgifter i koden – repot är publikt.

## Villkor att hålla sig till
- **MET Norway:** webbläsare kan inte sätta egen User-Agent; MET identifierar webbappar via Origin, så kör från en riktig sidadress (GitHub Pages). Cacha svar (appen cachar 30 min), inga täta anrop.
- **DMI:** fair use – de kan begränsa trafik vid missbruk. EDR-API:et var strypt till ca 1 anrop/10 s (appen väntar in) och svarar ibland `429 Server is busy`; då visas senaste cachade data.
- **SMHI:** öppna data, ange källa.
- Appen är avsedd för icke-kommersiellt bruk.

## Om DMI eller något annat börjar kräva nyckel/proxy igen
Lägg en liten proxy (t.ex. Cloudflare Worker) mellan appen och källan som håller hemligheten, och peka bara om URL:en i `SOURCES` i `index.html`.
Lägg aldrig nycklar i repot.

## Installera som app (PWA)
- **iPhone (Safari):** öppna sidan → Dela-knappen → *Lägg till på hemskärmen*.
- **Android (Chrome):** meny ⋮ → *Installera app* (eller *Lägg till på startskärmen*).
- **Dator (Chrome/Edge):** installera-ikonen i adressfältet.
Appen uppdaterar sig själv: nästa gång den öppnas med nät hämtas senaste `index.html`.
