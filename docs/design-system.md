# Vaylo — linguaggio visuale

Un solo sistema. Un componente scritto a mano e uno generato da v0 devono essere
indistinguibili.

## Direzione

Pagina prodotto Apple + rivista di architettura + piattaforma di real estate
intelligence. Calmo, editoriale, trattenuto. Il senso di "futuro" nasce da
tipografia, spazio, ritmo e movimento — mai da neon, bordi luminosi, vetro
ovunque, gradienti casuali o 3D gratuito.

Una schermata, un obiettivo. La complessità si rivela mentre si scorre.

## Token — `src/styles/tokens.css`

È l'unica fonte di verità. Se un colore, uno spazio, un raggio o una durata non
esiste lì, prima si aggiunge lì. Nessun valore letterale nei componenti.

- **Superfici** neutre e calde: `--paper`, `--paper-deep`, `--surface`, `--surface-2/3`.
- **Inchiostro** su quattro livelli: `--ink`, `--ink-soft`, `--ink-faint`, `--ink-ghost`.
  La gerarchia si fa con questi, non con quattro dimensioni di carattere.
- **Accento** uno solo, verde profondo `--accent`. Usato con parsimonia: un bottone,
  una barra, un perno. Se compare tre volte in una schermata, ne bastava una.
- **Tipografia**: `--font-display` per i titoli (tracking negativo, peso 600),
  `--font-ui` per il resto, `--font-editorial` (serif) solo per i numerali di sezione
  e una parola in corsivo nella frase di chiusura. Nessun font remoto: la build gira
  senza rete e su Apple lo stack di sistema è già SF Pro / New York.
- **Spazio**: `--section-y` fra le sezioni (72–168px). Il respiro verticale è metà
  del carattere premium: nel dubbio, di più.
- **Movimento**: `--d-*` per le durate, `--e-out` per le uscite morbide.
  `prefers-reduced-motion` annulla le animazioni, non le accorcia.

## Componenti — `src/components/vaylo/`

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
