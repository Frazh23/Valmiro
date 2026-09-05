# Annunci per la calibrazione

Un annuncio per riga, separatore `;`. Servono **almeno 20 righe** perché lo script
accetti di girare, 40-50 perché il risultato valga qualcosa. Meglio pochi annunci
letti bene che tanti copiati di fretta: ogni colonna sbagliata sposta la taratura.

**Da dove prenderli.** A mano, leggendo l'annuncio (un minuto l'uno), oppure con
l'API ufficiale di Idealista tramite `npm run idealista`. Mai con scraping dei
portali: lo vietano i loro termini d'uso e le banche dati sono protette.

**Cosa cercare.** Annunci di Milano città, appartamenti (non ville, non negozi),
distribuiti su zone diverse — centro, semicentro, periferia — e su stati diversi:
almeno un terzo "da ristrutturare" o "abitabile" e un terzo "ristrutturato" o "nuovo",
altrimenti `compressioneStato` non si può tarare. Evitare aste, nuda proprietà,
frazionamenti e annunci senza metratura.

| Colonna | Valori | Note |
|---|---|---|
| `id` | testo libero | univoco, es. `imm-001` |
| `fonte` | `immobiliare`, `idealista`, `casa`, `agenzia`, `altro` | |
| `data` | `AAAA-MM-GG` | quando l'hai letto |
| `indirizzo` | `Via Savona 35` | via e civico come nell'annuncio; se manca il civico, solo la via |
| `zona` | `C18` | facoltativa: se vuota la ricava lo script dall'indirizzo |
| `tipo` | `civ` (civile), `sig` (signorile), `eco` (economico) | in dubbio, `civ` |
| `mq` | numero | superficie **commerciale** dell'annuncio |
| `stato` | `rist` (da ristrutturare), `abit` (abitabile/buono), `otti` (ristrutturato/ottimo), `nuov` (nuovo) | |
| `piano` | `terra`, `rialzato`, `1-2`, `3-5`, `6+`, `ultimo` | |
| `ascensore` | `si` / `no` | |
| `classe` | `A`…`G` | se l'annuncio dice A1-A4, scrivi `A` |
| `balconi` | numero | 0 se nessuno |
| `cantina` | `si` / `no` | |
| `box` | `nessuno`, `posto`, `box` | solo se **compreso nel prezzo** |
| `epoca` | `ante1945`, `1946-1980`, `1981-2005`, `post2005` o vuoto | |
| `affaccio` | `interno`, `misto`, `strada` o vuoto | |
| `metro` | `vicina` (<400 m), `media`, `lontana` (>1 km) o vuoto | |
| `prezzo_richiesto` | numero, euro | il prezzo dell'annuncio |
| `prezzo_venduto` | numero o vuoto | solo se lo sai davvero (rogito, agente) |
| `note` | testo | tutto quello che non entra nelle colonne |

Il confronto avviene tra `prezzo_richiesto` e il **prezzo di pubblicazione** che
il motore suggerirebbe (`pubblica`), non con il valore centrale: un annuncio è un
prezzo chiesto, non un prezzo fatto. Se c'è `prezzo_venduto`, si confronta con il
valore centrale.

## I dataset presenti

| File | Origine | Stato |
|---|---|---|
| `dataset-fz-2026-09-05.csv` | 130 vendite raccolte da Francesco il 5/9/2026 facendo cercare gli annunci a un'IA con navigazione (GPT), poi convertite in questo formato. Affitti e duplicati esclusi, zona OMI risolta dall'indirizzo. | **Reale ma non verificato**: civici confermati dall'anagrafe (83/83), ma classe energetica assente (tutti "D"), metri non confermati, ~6 righe con errori evidenti di trascrizione (es. 30 m² a 670.000 €). Sbilanciato sul centro. Prima passata: livello +3,2%, premio dello stato troppo forte (compressione suggerita 0,45–0,50). Da promuovere solo dopo una verifica a campione. |
