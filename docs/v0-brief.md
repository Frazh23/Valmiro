# Brief per v0

Da incollare **sempre** in testa a ogni prompt v0, prima della richiesta specifica.
Serve a far uscire iterazioni coerenti fra loro e con il codice esistente.

---

## Blocco fisso (copia integralmente)

```
Stai lavorando su VAYLO: una piattaforma di real estate intelligence per Milano.
Un privato inserisce l'indirizzo di casa sua e riceve una valutazione costruita
sulle quotazioni ufficiali dell'Agenzia delle Entrate.

DIREZIONE VISUALE
Pagina prodotto Apple + rivista di architettura di fascia alta. Minimal,
editoriale, calmo, costoso perché trattenuto. Palette neutra e calda.
Il senso di futuro nasce da tipografia, spazio, ritmo, transizioni.
NON da neon, bordi luminosi, glassmorphism ovunque, cyberpunk, 3D gratuito,
gradienti casuali.

REGOLE DI COMPOSIZIONE
- Una schermata, un obiettivo principale evidente.
- Molto spazio bianco. Poche card. Tipografia grande. Immagini grandi.
- Mai più di tre metriche insieme. Il resto emerge scorrendo.
- Niente dashboard SaaS generiche.
- Mobile progettato a parte, verticale, tocco ampio, non una compressione del desktop.

VINCOLI TECNICI — sono vincoli, non preferenze
- Next.js 15 App Router, React 19, TypeScript.
- NIENTE Tailwind, NIENTE shadcn/ui, NIENTE nuove dipendenze.
  Si scrive CSS normale che usa le variabili già definite.
- Usa SOLO le variabili CSS di Vaylo (elenco sotto). Nessun valore letterale
  di colore, spaziatura, raggio o durata.
- Nomi delle classi con prefisso v-.
- Rispetta prefers-reduced-motion.
- NON inventare logica di business: nessun calcolo di prezzi, costi, percentuali
  o detrazioni dentro i componenti. I numeri arrivano come props.
- Usa dati finti evidenti come segnaposto e dichiarali; non hardcodare valori
  che sembrino reali.

VARIABILI DISPONIBILI
[incolla qui il contenuto di src/styles/tokens.css]

COMPONENTI ESISTENTI DA RIUSARE, NON RIFARE
Header, AddressSearch, PropertyVisual, ValuationReveal, NumeroAnimato,
MarketRange, FactorExplanation, RenovationSelector, BeforeAfter, Reveal.
```

---

## Blocco variabile — il brief della singola schermata

Sotto il blocco fisso, una sola schermata per volta:

```
SCHERMATA: <nome>
OBIETTIVO UNICO: <la sola cosa che l'utente deve poter fare o capire>
CONTENUTO REALE DISPONIBILE: <quali props arrivano, con i tipi>
GERARCHIA: <cosa domina, cosa viene dopo, cosa si rivela scorrendo>
STATI: <vuoto, in caricamento, errore, mobile>
DEBOLEZZA DA RISOLVERE: <perché stiamo rigenerando; se non c'è, non si rigenera>
```

L'ultima riga è la più importante. Se non sai scrivere quale debolezza visuale
specifica stai risolvendo, quella schermata non va rigenerata.

## Cosa NON chiedere a v0

- Toccare `src/lib/**`, `src/app/api/**`, o lo schema del database.
- Introdurre una libreria per fare quello che il CSS già fa.
- Progettare un flusso nuovo: i flussi si decidono prima, nel brief.
