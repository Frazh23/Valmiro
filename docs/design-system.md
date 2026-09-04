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

## Token — `src/styles/tokens.css`

È l'unica fonte di verità. Se un colore, uno spazio, un raggio o una durata non
esiste lì, prima si aggiunge lì. Nessun valore letterale nei componenti.

- **Superfici** neutre e calde: `--paper`, `--paper-deep`, `--surface`, `--surface-2/3`.
- **Inchiostro** su quattro livelli: `--ink`, `--ink-soft`, `--ink-faint`, `--ink-ghost`.
  La gerarchia si fa con questi, non con quattro dimensioni di carattere.
- **Accento** uno solo, verde profondo `--accent`. Usato con parsimonia: un bottone,
  una barra, un perno. Se compare tre volte in una schermata, ne bastava una.
- **Tipografia**: due voci. **Fraunces** (`--font-editorial`, con la voce
  `--voce-editorial`: SOFT 60, WONK 1) è il marchio e i titoli — `v-brand`,
  `v-display`, `v-h1`, `v-h2`, `v-statement` — a peso 500, tracking
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
| `PropertyVisual` | composizione architettonica disegnata; `src` per passare a foto vere |
| `ValuationReveal` | transizione a fasi legate al lavoro reale |
| `NumeroAnimato` | conteggio con easing, riparte dal valore precedente |
| `MarketRange` | posizione dentro la forbice OMI della zona |
| `FactorExplanation` | le voci di `stima.dettaglio`, in colonna |
| `RenovationSelector` | scenari di ristrutturazione, cifre dal motore |
| `BeforeAfter` | confronto trascinabile, pronto per le immagini vere |
| `Reveal` | comparsa allo scroll, disattivabile |

## Regole di composizione

- Meno schede. Una sezione con molto bianco batte quattro card.
- Un numero grande vale più di sei metriche piccole.
- I grafici sono barre di posizionamento e linee morbide, non dashboard finanziarie.
  Chi guarda deve capire in tre secondi.
- Il mobile si progetta a parte: verticale, tocco ampio, tipografia grande,
  pochissimi grafici. Mai una dashboard compressa.

## Accessibilità — minimo accettabile

Contrasto AA sul testo, `:focus-visible` sempre visibile, navigazione da tastiera nei
suggerimenti e negli scenari, `aria-pressed` sulle scelte, `aria-live` sui valori che
cambiano, `prefers-reduced-motion` rispettato davvero.
