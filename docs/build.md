# Registro delle build

Dove si compila, cosa si registra, e le build fatte.

## Come si compila

`npm run build` (Next.js, produzione) ha bisogno del repository, di `node_modules` completi e
del binario SWC per la piattaforma. Tre ambienti lo hanno:

| Ambiente | Chi lo lancia | Registro |
|---|---|---|
| **GitHub Actions** (`.github/workflows/build.yml`, installato dal sito il 5/9/2026; copia in `docs/github-actions-build.yml`) | ogni push su `main` e ogni pull request: `npm ci`, `npm run typecheck`, `npm test`, `npm run build` su Ubuntu, Node 22 | scheda *Actions* del repository: commit, esito, log completo. Attivo dal commit `52454df` |
| **Vercel** | ogni push su `main`: la build di produzione che va online | pannello Vercel → Deployments: commit, esito, log |
| **Il Mac di Francesco** | `npm run build` nel Terminale, nella cartella del progetto | questa tabella, a mano |

L'ambiente di sviluppo remoto (la VM del bridge, Linux arm64 con `node_modules` di macOS) e il
sandbox cloud (senza registro npm) **non possono** compilare: lì girano solo `tsc --noEmit` e
`npm test`. Per questo la build passa da GitHub Actions e Vercel, che sono anche i due posti
dove l'esito resta scritto.

## Cosa registrare per ogni build

Commit (hash corto), ambiente, esito (ok / fallita), errori se ci sono, e — dopo il deploy —
i casi essenziali ripetuti sul dominio pubblico (`docs/verifica-browser.md` elenca quali).

## Build

| Data | Commit | Ambiente | typecheck | test | build | Note |
|---|---|---|---|---|---|---|
| 2026-09-05 | `701eb9c` | VM bridge (tsc + test) | ok | 57/57 | non eseguibile | Vercel ha compilato e pubblicato il commit: i casi 1–3 sono stati riprodotti da Francesco sul sito pubblico |
| 2026-09-05 | `78ef3be` | VM bridge (tsc + test) | ok | 62/62 | non eseguibile qui | pushato come `c58bcf8`; Vercel ha compilato e pubblicato: i casi 1–4 di `docs/verifica-browser.md` ripetuti su valmiro.it il 5/9/2026, tutti superati |
| 2026-09-05 | `52454df` | GitHub Actions, build #1 (ubuntu, Node 22) | ok | ok | **ok** | prima build riproducibile con `npm ci`: typecheck, test e `next build` in 56 s |
| 2026-09-06 | `d7203de` | GitHub Actions, build #3 | ok | ok | **ok** | pushato da Francesco (pull --rebase); su valmiro.it verificato che dopo una simulazione la stima confermata viene salvata come secondo record |
| 2026-09-06 | `e9ee998` (con `1e0a1f8`) | GitHub Actions, build #5 | ok | ok | **ok** | 45 s. Marchio, revisione UX e pagina `/metodo`. Su valmiro.it verificati: nuovo logo in intestazione e footer, `/icon.png` 32×32 e `/apple-icon.png` 180×180 serviti, «Incolla il testo dell'annuncio» dopo «Voglio comprare», «Valuta ora» a campo vuoto, importazione incompleta con le tre conferme, risultato nel nuovo ordine con indice e «Il prezzo richiesto rientra nell'intervallo stimato», `/metodo`, `/stime` con «Apri stima» e la nota della data, ricerca dei quartieri per codice OMI |
| 2026-09-06 | `fae8882` (con `a72f21f`) | GitHub Actions, build #7 | ok | ok | **ok** | 51 s. Quattro fotografie sulla home, conferme campo per campo tolte, riordino dei file. Su valmiro.it: rotazione desktop verificata (cortile → balconi), su telefono solo il cortile e nessuna richiesta per gli altri tre file, modulo senza bottoni di conferma |
| 2026-09-06 | `349a403` | GitHub Actions, build #8 | ok | ok | **ok** | 55 s. Via pausa e indicatori: le fotografie vanno da sole |
| 2026-09-06 | `64b3aba` | GitHub Actions, build #9 | ok | ok | **ok** | 51 s. Anteprima sfocata da 144 byte sotto le fotografie: sul pubblicato c'era mezzo secondo di carta prima della prima immagine |
| 2026-09-06 | `0c4a06d` (con `4897868`) | GitHub Actions, build #10 | ok | ok | **ok** | 53 s. «Inserisci via e numero civico» al posto di «Via Savona 35»; classe energetica ripetuta due volte nel riepilogo. Su valmiro.it: riepilogo corretto, «Valuta» dà il risultato subito con i predefiniti (290.000 € per Farini 81) |
| 2026-09-07 | `9668893` (con `c61c150`) | GitHub Actions, build #17 | ok | 72/72 | **ok** | 56 s. Correzioni Codex riviste e integrate: campioni separati, congelamento v2, ipotesi accanto al numero, contatori spenti. Su valmiro.it verificati: home con sottotitolo nuovo e motto approvato, `/metodo` con i numeri rimisurati (+1,9% / 13,7% / 35%), risultato Farini 81 = 290.000 € con la riga «Il calcolo presume», `/termini` 404, nessuna richiesta a `/api/eventi` |
