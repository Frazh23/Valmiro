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
