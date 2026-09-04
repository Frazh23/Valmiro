# Ciclo di sviluppo Valmiro

```
Claude Code  →  logica, integrazione, qualità del codice
v0 by Vercel →  esplorazione visuale e UI
GitHub       →  unica fonte di verità
Vercel       →  preview e deploy
Supabase     →  database e autenticazione (già esistenti)
```

## Rami

| Ramo | A cosa serve |
|---|---|
| `main` | stabile, sempre deployabile |
| `develop` | sviluppo integrato: qui confluisce tutto |
| `design/v0` | esperimenti UI generati o modificati con v0 |

`design/v0` non tocca mai `src/lib/**`, `src/app/api/**`, `db/**`.
Non si fonde in `main`: passa da `develop`, dopo revisione.

## Il giro

1. **Claude** individua la prossima schermata che ha davvero bisogno di lavoro e
   scrive il brief (`docs/v0-brief.md`, blocco fisso + blocco variabile).
2. **v0** esplora e committa su `design/v0`.
3. **Claude** revisiona con la lista qui sotto.
4. **Claude** porta dentro `develop` solo le parti valide, riscritte sui token e
   sui componenti esistenti.
5. `npm run typecheck && npm test && npm run build`.
6. Preview su Vercel, revisione visiva su desktop e mobile.
7. Si ripete **solo** dove c'è una debolezza precisa. Non si rigenera per abitudine.

## Lista di controllo per la revisione

- [ ] Duplica logica che esiste già in `src/lib/**`?
- [ ] Calcola numeri che dovrebbe ricevere dal motore?
- [ ] Introduce dipendenze non necessarie? (Tailwind, shadcn, librerie di icone, motion)
- [ ] Usa valori letterali invece dei token?
- [ ] Rompe Supabase o l'autenticazione? Tocca `sessione.ts` o `supabase.ts`?
- [ ] Hardcoda dati che il backend fornisce già?
- [ ] Il mobile è progettato o solo ristretto?
- [ ] Contrasto, focus visibile, tastiera, `prefers-reduced-motion`?
- [ ] Il codice è leggibile fra sei mesi?
- [ ] È coerente con il linguaggio Valmiro, o è "un altro sito"?

## Nota onesta su v0 e Tailwind

v0 genera nativamente Tailwind + shadcn/ui. Valmiro non li usa: ha un livello di
token in CSS puro. Ci sono due strade e vanno scelte consapevolmente.

**A — v0 come esplorazione (impostazione attuale).** Il brief gli chiede CSS puro
sui token Valmiro. v0 lo sa fare, ma va controcorrente rispetto al suo default:
ci si aspetta di dover riscrivere parte dell'output. In cambio il codebase resta
uno solo, leggero e senza build step aggiuntivo.

**B — adottare Tailwind.** Si configura Tailwind perché i suoi colori e spazi
leggano le stesse variabili di `tokens.css`, così l'output di v0 atterra già
allineato. Costa una migrazione degli stili esistenti e una dipendenza in più.
Ha senso solo se il giro con v0 diventa frequente.

Si parte con A. Si passa a B solo se A si rivela una frizione ricorrente.

## Collegare GitHub, v0 e Vercel

> Procedura completa, con i link e i valori esatti: **`docs/pubblicazione.md`**.

Il repository è già inizializzato in locale con i tre rami. Da fare una volta:

```bash
# 1. crea il repository su GitHub (vuoto, privato)
# 2. collegalo e pubblica i rami
git remote add origin git@github.com:<utente>/valmiro.git
git push -u origin main develop design/v0
```

Poi:

- **v0** → Settings → GitHub → collega il repository, ramo di lavoro `design/v0`.
  Non creare un progetto v0 separato: si lavora sullo stesso codebase.
- **Vercel** → New Project → importa lo stesso repository.
  Production branch `main`, preview automatiche su ogni push.
- **Variabili d'ambiente su Vercel** (Settings → Environment Variables):
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `GEOCODER`, `GEOCODER_UA` (con un contatto vero: Nominatim lo pretende).
  La chiave `service_role` di Supabase **non va messa**.
- **Supabase** → Authentication → URL Configuration: aggiungi il dominio Vercel
  e `https://*.vercel.app` fra i redirect consentiti, altrimenti il login sulle
  preview non torna indietro.
