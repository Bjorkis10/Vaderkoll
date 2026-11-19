# Väderkoll

Enkel väderapp på svenska som jämför prognoser från **SMHI**, **MET Norway (Yr)** och **DMI** timme för timme, och hjälper dig att planera aktiviteter i Skåne. Standardplats är Ljungbyhed GK, och du kan byta plats och spara favoriter.

**Öppna appen:** https://bjorkis10.github.io/Vaderkoll/

## Två vyer

- **Planera** visar veckan som ett scorekort med en ruta per timme. Grönt passar, gult är gränsfall som oftast går bra och rött passar inte. Välj aktivitet (Golf, Vintergolf, Promenad/löpning, Cykling, Grillning/utomhus eller egna lägen) och ändra gränsvärdena själv. Appen markerar var källorna är oense om nederbörd, visar snö (❄) och pekar ut dagens bästa sammanhängande fönster.
- **Väder** är en allmän prognos med stor temperatur, timremsa, veckoöversikt och kort för nederbörd, vind, molnighet, känns som, sol och källornas enighet. Den färgas aldrig efter aktivitet. Under "Jämför väderkällor" ser du varje källas siffror sida vid sida.

## Bra att veta

- Allt är **prognoser**, inte mätningar. Poängen i Planera är en tumregel, inte en garanti, och appen vet inget om banans tillgänglighet eller skick.
- Efter 2–3 dygn är SMHI och Yr grövre (3–6 timmars steg) och timvärdena är då interpolerade (kursiv text). DMI räcker bara ca 60 timmar.
- Prognoserna cachas i webbläsaren i 30 minuter. Tryck ↻ för att hämta på nytt. Om en källa är nere visas äldre data med en varning.
- Inställningar (plats, favoriter, aktivitet, gränsvärden, tider och vald vy) sparas bara i din egen webbläsare.

## Så är den byggd

En enda fil, `index.html`, med vanlig HTML, CSS och JavaScript. Inga ramverk, inget bygge, inga nycklar och ingen server. Webbläsaren anropar källorna direkt.

Mer finns i [`PROJECT.md`](PROJECT.md) (datakällor, poängmodell, begränsningar), [`CLAUDE.md`](CLAUDE.md) (instruktioner för AI-assistenter) och [`SETUP.md`](SETUP.md) (publicering på GitHub Pages).

## Datakällor och villkor

- [SMHI](https://opendata.smhi.se/) öppna data (punktprognos `snow1g`)
- [MET Norway](https://api.met.no/) locationforecast
- [DMI](https://www.dmi.dk/friedata/) Frie data (HARMONIE DINI)
- [Open-Meteo](https://open-meteo.com/) geokodning, endast för platssökning

Appen är avsedd för icke-kommersiellt bruk. Följ respektive källas villkor och lägg inga nycklar eller privata uppgifter i repot.
