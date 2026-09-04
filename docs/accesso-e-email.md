# Accesso e email: la configurazione

Cosa serve perché registrazione, conferma email, recupero password e "Continua
con Google" funzionino in produzione. Il codice è già pronto (`src/app/accedi`);
questa è la parte che vive nei pannelli esterni, e va fatta una volta.

Regola che non cambia: **le chiavi non passano mai per la chat né per i file**.
Si copiano dal pannello che le genera e si incollano nel pannello che le chiede.

## 1. Resend — il servizio che spedisce le email

1. Account su https://resend.com (gratis: 3.000 email/mese, 100 al giorno).
2. *Domains* → *Add domain* → `valmiro.it`, regione **EU (Ireland)** — i dati
   restano in Europa.
3. Resend mostra tre record DNS da creare presso il registrar di valmiro.it
   (IONOS): un **MX** e un **TXT** su `send.valmiro.it`, un **TXT** su
   `resend._domainkey.valmiro.it`. Si copiano tali e quali. Facoltativo ma
   consigliato: un TXT su `_dmarc.valmiro.it` con `v=DMARC1; p=none;`.
4. Tornati su Resend → *Verify*. Può volerci da qualche minuto a un'ora.
   (Il router di casa che tiene in cache il DNS non c'entra: la verifica la fa
   Resend dai suoi server.)
5. *API Keys* → *Create API key*, nome `supabase`, permesso *Sending access*,
   dominio `valmiro.it`. La chiave si vede una volta sola: si copia subito
   nel passo 2.3 e non si salva altrove.

## 2. Supabase — SMTP, conferma email, limiti

1. Dashboard → *Project Settings* → *Authentication* → **SMTP Settings** →
   *Enable Custom SMTP*.
2. Sender email `noreply@valmiro.it`, sender name `Valmiro`.
3. Host `smtp.resend.com`, porta `465`, username `resend`, password = la
   chiave API di Resend. *Save*.
4. *Authentication* → *Providers* → *Email* → **Confirm email: ON**. Era
   stato spento per via del limite di 2 email/ora dell'SMTP integrato; con
   Resend il motivo non c'è più.
5. *Authentication* → *Rate Limits* → email inviate: da 30 a **100 all'ora**
   (Resend ne consente 100 al giorno sul piano gratuito: quando il traffico
   cresce, si passa al piano da 20 $/mese e si alza ancora).
6. *Authentication* → *Email Templates*: incollare i tre modelli italiani di
   `docs/email/` (conferma, recupero, cambio email), con gli oggetti indicati
   nel commento in testa a ciascuno.
7. *Authentication* → *URL Configuration*: Site URL `https://valmiro.it`;
   Redirect URLs devono contenere `https://valmiro.it/**` e
   `http://localhost:3000/**`. Mai `https://*.vercel.app/**`.

## 3. Google — "Continua con Google"

1. https://console.cloud.google.com → un progetto `Valmiro` (nuovo o esistente).
2. *APIs & Services* → *OAuth consent screen*: tipo **External**, nome app
   `Valmiro`, email di supporto, dominio autorizzato `valmiro.it`, link alla
   home e alla privacy. Ambiti: solo `email`, `profile`, `openid` (quelli non
   sensibili: non serve la verifica di Google).
3. Finché l'app è in *Testing* entrano solo gli utenti di prova elencati
   (fino a 100). Prima del lancio: *Publish app*. Per gli ambiti di base non
   c'è revisione.
4. *Credentials* → *Create credentials* → *OAuth client ID* → **Web application**.
   - Authorized JavaScript origins: `https://valmiro.it`
   - Authorized redirect URIs: `https://pzfqrcihhmlgdizwyzog.supabase.co/auth/v1/callback`
5. Google mostra *Client ID* e *Client secret*. Si portano in Supabase →
   *Authentication* → *Providers* → **Google** → *Enable*, incollare entrambi,
   *Save*.

Sulla schermata di consenso Google gli utenti vedono il dominio di Supabase
(`pzfqrcihhmlgdizwyzog.supabase.co`), non valmiro.it. Per mostrare il nostro
serve il *custom domain* di Supabase, un'aggiunta a pagamento: si valuta più
avanti, non blocca nulla.

## 4. Database — il profilo di chi entra da Google

Eseguire `db/004_profilo_da_google.sql` nel SQL editor di Supabase. Senza,
chi entra con Google ha un profilo senza nome.

## 5. Prova finale

- Registrazione con un'email vera → arriva la mail di Valmiro (mittente
  `noreply@valmiro.it`, non più `noreply@mail.app.supabase.io`) → il link porta
  su `valmiro.it/accedi?confermata=1`.
- "Password dimenticata" → mail → il link apre `/accedi` in modalità nuova
  password.
- "Continua con Google" → consenso → atterraggio su `/stime`, profilo con il
  nome preso da Google.

## Apple, più avanti

Sign in with Apple richiede l'Apple Developer Program (99 $/anno), un
Services ID e una chiave. Sul web non è obbligatorio. Quando servirà: Supabase →
Providers → Apple, e in `accedi/page.tsx` un secondo bottone accanto a Google
che chiama `signInWithOAuth({ provider: "apple" })`. Nient'altro cambia.
