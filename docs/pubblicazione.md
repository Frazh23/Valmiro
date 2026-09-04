# Pubblicare Vaylo: GitHub → v0 → Vercel

Da fare una volta sola. I comandi vanno lanciati nel Terminale, dentro
`~/Documents/valore-casa`, con il dev server **fermo** (`Ctrl+C`).

---

## 1. Creare il repository su GitHub

Vai su **https://github.com/new** e compila così:

| Campo | Valore |
|---|---|
| Repository name | `Vaylo` |
| Description | Stima immobiliare a Milano su quotazioni OMI ufficiali |
| Visibility | **Private** |
| Add a README file | **NO, lascialo spento** |
| Add .gitignore | **None** |
| Choose a license | **None** |

Le tre caselle in fondo vanno lasciate vuote: il progetto ha già la sua storia
e il suo `.gitignore`. Se GitHub crea un README, il primo push viene rifiutato.

Al termine GitHub mostra una pagina "Quick setup" con l'indirizzo del repository.
Non seguire quelle istruzioni: usa quelle qui sotto.

## 2. Identita' di git — gia' fatto

Impostata a livello di repository (`.git/config`), non globale: vale per Vaylo
e non tocca eventuali altri progetti sulla macchina.

```
user.name  = Francesco Zambelli
user.email = francesco23.zambelli@gmail.com
```

## 3. Creare il token che autorizza il push

GitHub non accetta più la password dell'account per il push. Serve un token.

Vai su **https://github.com/settings/personal-access-tokens/new** e imposta:

- **Token name**: `vaylo-macbook`
- **Expiration**: 90 giorni (o quello che preferisci)
- **Repository access**: *Only select repositories* → scegli `Vaylo`
- **Permissions** → *Repository permissions* → **Contents: Read and write**
  (basta questa; lascia tutto il resto su "No access")

Premi *Generate token* e **copia subito la stringa** che inizia per `github_pat_`:
GitHub non te la rimostrerà più. Trattala come una password.

## 4. Pubblicare

Il remote e' gia' collegato (`origin` → `https://github.com/Frazh23/Vaylo.git`).
Resta un comando solo:

```bash
git push -u origin main develop design/v0
```

Alla richiesta di credenziali:

- **Username**: il tuo nome utente GitHub
- **Password**: **incolla il token**, non la password dell'account

macOS lo salva nel Portachiavi: te lo chiede una volta sola.

Verifica che sia andato tutto:

```bash
git remote -v
git branch -vv
```

Devono comparire i tre rami con il loro corrispondente `origin/...`.

## 5. Controllo di sicurezza dopo il primo push

Apri il repository su GitHub e **verifica che `.env.local` non ci sia**.
Contiene le chiavi Supabase e non deve mai essere pubblicato — `.gitignore` lo
esclude, ma la verifica costa dieci secondi e un segreto pubblicato per sbaglio
va considerato compromesso, non basta cancellarlo.

Deve esserci invece `.env.example`, senza valori veri.

## 6. Collegare v0

v0 lavora sullo stesso repository, non su una copia.

1. Vai su **https://v0.app** e accedi con lo stesso account Vercel.
2. Usa **Import from GitHub** (non "crea nuovo progetto") e scegli `Vaylo`.
3. Come **base branch** seleziona **`design/v0`**.

Da lì v0 crea da solo un ramo di lavoro per ogni modifica e apre una pull
request verso `design/v0`. Non tocca `main` né `develop`.

Prima di ogni prompt incolla il blocco fisso di `docs/v0-brief.md`: è quello che
tiene le iterazioni coerenti e gli impedisce di introdurre Tailwind, shadcn o
logica di business inventata.

Documentazione: **https://v0.app/docs/github**

## 7. Vercel — fatto

Progetto: **`vaylo`** nel team `Vaylo` (piano Hobby).
Dominio di produzione: **https://vaylo-one.vercel.app**

Nota: `vaylo.vercel.app` era gia' occupato da un altro prodotto (un servizio di
valet parking, nessun rapporto con noi), per questo Vercel ha assegnato
`vaylo-one`. Vale la pena verificare il marchio prima di legarsi al nome.

**Attenzione al primo deploy.** Vercel costruisce quando riceve un push. Se il
repository viene collegato *dopo* aver gia' pushato, non c'e' nessun evento da
intercettare: il progetto resta con "No Deployment" e il dominio risponde 404.
Si sblocca con il primo commit successivo al collegamento.

### Come era stato configurato

1. Vai su **https://vercel.com/new** e importa `Vaylo`.
2. Framework: Next.js (lo riconosce da solo). Non cambiare i comandi di build.
3. **Production Branch**: `main` (Settings → Git).
4. **Environment Variables** (Settings → Environment Variables), per tutti gli ambienti:

| Nome | Valore |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://pzfqrcihhmlgdizwyzog.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | la chiave publishable (quella già in `.env.local`) |
| `GEOCODER` | `nominatim` |
| `GEOCODER_UA` | `vaylo/0.1 (contatto: francesco23.zambelli@gmail.com)` |

**La chiave `service_role` di Supabase non va messa.** È una chiave che scavalca
le regole RLS: nel browser sarebbe un accesso libero al database di chiunque.

Da qui ogni push su un ramo genera una preview, e `main` va in produzione.

## 8. Far tornare il login dalle preview

Supabase rimanda l'utente al sito solo verso indirizzi che conosce. Senza questo
passaggio il login funziona in locale e si rompe su Vercel.

Vai su
**https://supabase.com/dashboard/project/pzfqrcihhmlgdizwyzog/auth/url-configuration**
e aggiungi in *Redirect URLs*:

```
https://vaylo-one.vercel.app/**
https://vaylo-*-frazh23s-projects.vercel.app/**
```

La prima riga e' la produzione, la seconda copre le preview: il pattern esatto
lo confermi dall'URL della prima preview che Vercel genera, perche' il suffisso
del team cambia da account ad account.

In *Site URL* metti `https://vaylo-one.vercel.app`.

## 9. Ultima cosa, prima di aprire il sito a qualcuno

`GEOCODER_UA` deve contenere un contatto vero: la politica d'uso di Nominatim
lo pretende e senza si viene bloccati. È già impostato al punto 7, ma va tenuto
allineato anche in `.env.local`.
