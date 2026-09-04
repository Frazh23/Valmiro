# Pubblicare Valmiro: GitHub → v0 → Vercel

Da fare una volta sola. I comandi vanno lanciati nel Terminale, dentro
`~/Documents/valore-casa`, con il dev server **fermo** (`Ctrl+C`).

---

## 1. Creare il repository su GitHub

Vai su **https://github.com/new** e compila così:

| Campo | Valore |
|---|---|
| Repository name | `Valmiro` |
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

Impostata a livello di repository (`.git/config`), non globale: vale per Valmiro
e non tocca eventuali altri progetti sulla macchina.

```
user.name  = Francesco Zambelli
user.email = francesco23.zambelli@gmail.com
```

## 3. Creare il token che autorizza il push

GitHub non accetta più la password dell'account per il push. Serve un token.

Vai su **https://github.com/settings/personal-access-tokens/new** e imposta:

- **Token name**: `valmiro-macbook`
- **Expiration**: 90 giorni (o quello che preferisci)
- **Repository access**: *Only select repositories* → scegli `Valmiro`
- **Permissions** → *Repository permissions* → **Contents: Read and write**
  (basta questa; lascia tutto il resto su "No access")

Premi *Generate token* e **copia subito la stringa** che inizia per `github_pat_`:
GitHub non te la rimostrerà più. Trattala come una password.

## 4. Pubblicare

Il remote e' gia' collegato (`origin` → `https://github.com/Frazh23/Valmiro.git`).
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
2. Usa **Import from GitHub** (non "crea nuovo progetto") e scegli `Valmiro`.
3. Come **base branch** seleziona **`design/v0`**.

Da lì v0 crea da solo un ramo di lavoro per ogni modifica e apre una pull
request verso `design/v0`. Non tocca `main` né `develop`.

Prima di ogni prompt incolla il blocco fisso di `docs/v0-brief.md`: è quello che
tiene le iterazioni coerenti e gli impedisce di introdurre Tailwind, shadcn o
logica di business inventata.

Documentazione: **https://v0.app/docs/github**

## 7. Vercel — fatto

Progetto: **`valmiro`** nel team `Valmiro` (piano Hobby).
Dominio di produzione: **https://valmiro-one.vercel.app**

Nota: `valmiro.vercel.app` era gia' occupato da un altro prodotto (un servizio di
valet parking, nessun rapporto con noi), per questo Vercel ha assegnato
`valmiro-one`. Vale la pena verificare il marchio prima di legarsi al nome.

**Attenzione al primo deploy.** Vercel costruisce quando riceve un push. Se il
repository viene collegato *dopo* aver gia' pushato, non c'e' nessun evento da
intercettare: il progetto resta con "No Deployment" e il dominio risponde 404.
Si sblocca con il primo commit successivo al collegamento.

### Come era stato configurato

1. Vai su **https://vercel.com/new** e importa `Valmiro`.
2. Framework: Next.js (lo riconosce da solo). Non cambiare i comandi di build.
3. **Production Branch**: `main` (Settings → Git).
4. **Environment Variables** (Settings → Environment Variables), per tutti gli ambienti:

| Nome | Valore |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://pzfqrcihhmlgdizwyzog.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | la chiave publishable (quella già in `.env.local`) |
| `GEOCODER` | `nominatim` |
| `GEOCODER_UA` | `valmiro/0.1 (contatto: francesco23.zambelli@gmail.com)` |

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
https://valmiro-one.vercel.app/**
https://valmiro-*-frazh23s-projects.vercel.app/**
```

La prima riga e' la produzione, la seconda copre le preview: il pattern esatto
lo confermi dall'URL della prima preview che Vercel genera, perche' il suffisso
del team cambia da account ad account.

In *Site URL* metti `https://valmiro-one.vercel.app`.

## 9. Ultima cosa, prima di aprire il sito a qualcuno

`GEOCODER_UA` deve contenere un contatto vero: la politica d'uso di Nominatim
lo pretende e senza si viene bloccati. È già impostato al punto 7, ma va tenuto
allineato anche in `.env.local`.

---

## 10. Email di autenticazione — blocco noto prima del lancio

Il servizio email integrato di Supabase e' limitato a **2 messaggi all'ora** ed e'
dichiarato dalla documentazione stessa come **non adatto alla produzione**: nessuna
garanzia di consegna, nessun SLA. Serve per esplorare e provare, niente di piu'.

Sintomo: alla seconda registrazione ravvicinata compare `email rate limit exceeded`.
Non e' un difetto dell'applicazione.

**Durante lo sviluppo**, per non restare bloccati: Authentication → Sign In / Providers
→ Email → disattivare *Confirm email*. La registrazione entra subito, senza mail.
E' accettabile finche' il sito e' su un indirizzo che non conosce nessuno.

**Prima di aprire il sito a qualcuno, entrambe le cose:**

1. **Riattivare *Confirm email*.** Senza conferma chiunque puo' registrarsi con
   l'indirizzo di un altro, e siccome le stime contengono indirizzi di case —
   dato personale — non e' un dettaglio.
2. **Configurare un SMTP proprio** (Resend, Postmark, Brevo, Amazon SES) in
   Authentication → SMTP Settings, con un mittente su un dominio nostro. Dopo la
   configurazione Supabase parte da un limite prudenziale di 30 messaggi all'ora,
   alzabile dalla pagina Rate Limits.

La procedura completa, con Resend e Google, e' in `docs/accesso-e-email.md`.

Finche' l'SMTP e' quello predefinito, il sito non puo' reggere nemmeno una decina
di registrazioni al giorno.

---

## 11. Il prodotto si chiama Valmiro (4 set 2026)

Due cambi di nome nello stesso giorno. Vale la pena scrivere perche', perche' la
lezione si ripete.

### Perche' non Vaylo

TMview ha mostrato due marchi dell'Unione Europea **registrati**:

- **Vaylo** — EUTM 019184639, Resemolnet AB, classi 35, 36, 38, 39, **42**, 43
- **VAYLO** — EUTM 019313573, Stablezact Fintech Ltd, classi 9, **36**, **42**

La classe 36 copre affari immobiliari e servizi finanziari, la 42 il software:
esattamente questo prodotto. Un marchio EUIPO vale anche in Italia, quindi
comprare `vaylo.it` non avrebbe risolto nulla — un dominio non conferisce diritti
sul nome. Anche le varianti erano prese: **Kaylo** e' un marchio UE registrato in
classe 42 e **KAYLOO** in classe 36 (Ayvens). I nomi inventati di cinque lettere
sono la categoria piu' affollata del registro: quel filone era esaurito.

### Perche' non Stimami

Marchi puliti su TMview (i soli risultati erano *Stimamizol*, farmaco di Johnson
& Johnson in classe 5, e *Stimamiglio*, un cognome), ma **`stimami.it` e
`stimami.com` sono gia' registrati**.

### L'errore di metodo, e come e' stato corretto

La disponibilita' dei domini era stata pre-verificata cercando i record **A**.
Un dominio registrato ma parcheggiato, senza sito attivo, non ha record A: cosi'
`stimami.it` risultava libero e non lo era. Il controllo ora interroga i server
DNS chiedendo i record **NS** e distingue NXDOMAIN — il dominio non esiste nel
registro — da qualsiasi altra risposta, che significa registrato. Resta un
pre-screening: la conferma vera la da' il registrar.

### Valmiro

TMview pulito per EU, IT e GB nelle classi 36 e 42 — l'unico risultato e'
*Imobiliaria Valmirocipriani*, agenzia brasiliana intestata al proprio titolare,
altro territorio e marchio composto da un nome di persona. **`valmiro.it` libero**,
verificato con il metodo corretto.

Nota onesta: Valmiro non significa niente, quindi va costruito. In cambio, proprio
per questo, e' molto piu' difendibile di un nome che descrive il servizio.

### Cosa NON e' stato rinominato, e perche'

- Il prefisso `v-` delle classi CSS: e' solo uno spazio di nomi.
- `src/components/sistema/` e `src/styles/sistema.css` hanno gia' un nome neutro
  rispetto al marchio, apposta perche' un nuovo rename non tocchi la struttura.
  Questa scelta si e' ripagata nel giro di un'ora.
- La chiave di localStorage: `valmiro.stime` e' la nuova, e `stimami.stime` e
  `vaylo.stime` e `valorecasa.stime` restano nella catena delle dismesse. Chi ha
  stime salvate nel browser non le perde, da qualunque nome arrivi.
