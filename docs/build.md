# Registro delle build

Dove si compila, cosa si registra, e le build fatte.

## Come si compila

`npm run build` (Next.js, produzione) ha bisogno del repository, di `node_modules` completi e
del binario SWC per la piattaforma. Tre ambienti lo hanno:

| Ambiente | Chi lo lancia | Registro |
|---|---|---|
| **GitHub Actions** (`docs/github-actions-build.yml`, da installare in `.github/workflows/build.yml`) | ogni push su `main` e ogni pull request: `npm ci`, `npm run typecheck`, `npm test`, `npm run build` su Ubuntu, Node 22 | scheda *Actions* del repository: commit, esito, log completo. **Non ancora attivo**: il token usato per il push non ha lo scope `workflow`; si installa dal sito di GitHub o dopo aver esteso il token |
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
| 2026-09-05 | `78ef3be` | VM bridge (tsc + test) | ok | 62/62 | non eseguibile qui | build affidata a GitHub Actions e Vercel al push; esito da annotare qui dopo il deploy |
