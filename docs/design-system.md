# Valmiro — linguaggio visuale

Un solo sistema. Un componente scritto a mano e uno generato da v0 devono essere
indistinguibili.

## Direzione

Pagina prodotto Apple + rivista di architettura + piattaforma di real estate
intelligence. Calmo, editoriale, trattenuto. Il senso di "futuro" nasce da
tipografia, spazio, ritmo e movimento — mai da neon, bordi luminosi, vetro
ovunque, gradienti casuali o 3D gratuito.

Una schermata, un obiettivo. La complessità si rivela mentre si scorre.

## Il tema è chiaro, e basta

Valmiro non segue la preferenza di sistema: la carta chiara è l'identità, non
un'alternativa. `color-scheme: light` è dichiarato nei token, così anche i
controlli nativi del browser restano chiari.

Conseguenza operativa: **niente `prefers-color-scheme` nei componenti.** Se un
componente disegna da sé — un canvas, un SVG generato — i colori si leggono dai
token con `getComputedStyle`, non si scelgono con un booleano chiaro/scuro.
`Mappa.tsx` è l'esempio.

## Il marchio

La finestra ad arco con il montante centrale, in verde `--accent`, e la scritta «Valmiro» in
Fraunces al taglio display (`opsz 144`, `SOFT 0`, `WONK 0`, peso 500): la scritta del marchio
non ha la voce dei titoli, perché deve restare uguale al file vettoriale in `public/logo/`.
Nel sito il marchio è il componente `Logo` (`src/components/sistema/Logo.tsx`): simbolo SVG
inline che eredita il colore, scritta come testo. Nell'intestazione è un link alla home con
nome accessibile; nel footer è un'immagine. Le versioni per stampa e social, la costruzione e
la licenza del carattere sono in `public/logo/README.md`. Favicon e icona iOS stanno in
`src/app/` (`icon.svg`, `icon.png`, `favicon.ico`, `apple-icon.png`); sotto i 48 px il
tratto è più spesso e il montante tocca l'arco, unica semplificazione.

## Token — `src/styles/tokens.css`

È l'unica fonte di verità. Se un colore, uno spazio, un raggio o una durata non
esiste lì, prima si aggiunge lì. Nessun valore letterale nei componenti.

- **Superfici** neutre e calde: `--paper`, `--paper-deep`, `--surface`, `--surface-2/3`.
- **Inchiostro** su quattro livelli: `--ink`, `--ink-soft`, `--ink-faint`, `--ink-ghost`.
  La gerarchia si fa con questi, non con quattro dimensioni di carattere.
- **Accento** uno solo, verde profondo `--accent`. Usato con parsimonia: un bottone,
  una barra, un perno. Se compare tre volte in una schermata, ne bastava una.
- **Tipografia**: due voci. **Fraunces** (`--font-editorial`, con la voce
  `--voce-editorial`: SOFT 60, WONK 1) è la voce dei titoli — `v-display`, `v-h1`,
  `v-h2`, `v-statement` — a peso 500, tracking
  `--track-serif`. Il sans di sistema (`--font-display`, `--font-ui`) è tutto il
  resto, e **sempre i numeri**: una cifra si legge tabulare, non si ammira in
  serif. Fraunces viaggia con il repo (`@fontsource-variable/fraunces`, OFL,
  importato in `layout.tsx`): nessun font remoto, la build gira senza rete e
  nessuna richiesta parte verso Google quando un utente apre la pagina.
  Un componente v0 che introduce un altro carattere è da rifiutare.
- **Spazio**: `--section-y` fra le sezioni (72–168px). Il respiro verticale è metà
  del carattere premium: nel dubbio, di più.
- **Movimento**: `--d-*` per le durate, `--e-out` per le uscite morbide.
  `prefers-reduced-motion` annulla le animazioni, non le accorcia.

## Componenti — `src/components/sistema/`

| Componente | Cosa fa |
|---|---|
| `Header` | header sticky, si posa su vetro allo scroll |
| `AddressSearch` | campo indirizzo: dizionario locale mentre si scrive, geocoder alla conferma |
| `HomeSearch` | porta la scelta nel flusso via URL |
| `HeroFoto` | le fotografie della home: quattro in rotazione automatica su schermo largo, il solo cortile su telefono; nessun comando, si ferma da sola quando la scheda e' nascosta, la sezione e' fuori vista o si compila il modulo |
| `Logo` | il marchio: simbolo inline + scritta; link alla home nell'header |
| `ZoneList` | le 42 zone con ricerca per nome o codice |
| `ValuationReveal` | transizione a fasi legate al lavoro reale |
| `NumeroAnimato` | conteggio con easing, riparte dal valore precedente |
| `MarketRange` | posizione dentro la forbice OMI della zona |
| `FactorExplanation` | le voci di `stima.dettaglio`, in colonna |
| `RenovationSelector` | scenari di ristrutturazione, cifre dal motore |
| `Reveal` | comparsa allo scroll, disattivabile |

## Regole di composizione

- Meno schede. Una sezione con molto bianco batte quattro card.
- Un numero grande vale più di sei metriche piccole.
- I grafici sono barre di posizionamento e linee morbide, non dashboard finanziarie.
  Chi guarda deve capire in tre secondi.
- Nel modulo di valutazione non esistono sezioni a scomparsa: tutto quello che
  si chiede serve alla stima, quindi si mostra di seguito. «Altri dettagli» e'
  stato tolto per questo. Un `<details>` resta accettabile solo per una via
  alternativa (incollare un annuncio, la mappa quando l'indirizzo non si trova), mai per un dato.
- Il percorso comincia dall'intento (comprare o vendere) e lo tiene in vista con un
  interruttore che cambia le parole, mai i dati. Il valore stimato, il prezzo richiesto,
  il prezzo di pubblicazione possibile e l'intervallo per un'offerta sono quattro cose
  diverse e non si mischiano in una frase.
- Nel risultato l'ordine e' quello delle decisioni: valore e confronto, spiegazione,
  ristrutturazione, affitto, quartiere, fonti. Vicino al valore resta solo un riferimento
  sintetico alla zona OMI.
- Prima il riepilogo, poi il dettaglio per chi lo cerca («Personalizza gli interventi»):
  il percorso iniziale resta breve.
- Il mobile si progetta a parte: verticale, tocco ampio, tipografia grande,
  pochissimi grafici. Mai una dashboard compressa.

## Accessibilità — minimo accettabile

Contrasto AA sul testo, `:focus-visible` sempre visibile, navigazione da tastiera nei
suggerimenti e negli scenari, `aria-pressed` sulle scelte, `aria-live` sui valori che
cambiano, `prefers-reduced-motion` rispettato davvero.
