"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Header from "@/components/sistema/Header";
import { supabase, accountAttivo } from "@/lib/supabase";
import { useSessione, esci } from "@/lib/sessione";

type Tipo = "privato" | "agenzia";
type Modo = "entra" | "registrati" | "recupera" | "nuova";

/**
 * Accesso. Google prima dell'email, perche' e' la strada senza password e senza
 * mail di conferma. Il resto — registrazione, recupero, nuova password — sono
 * modi della stessa pagina: Supabase rimanda sempre qui, e la pagina capisce da
 * sola in che punto del percorso si trova.
 */
export default function Accedi() {
  return (
    <Suspense fallback={<div className="v-page"><Header /></div>}>
      <Pagina />
    </Suspense>
  );
}

/** Le frasi di Supabase arrivano in inglese: quelle frequenti le traduciamo, il resto passa com'e'. */
function traduci(m: string) {
  if (/invalid login credentials/i.test(m)) return "Email o password non corretti.";
  if (/email not confirmed/i.test(m)) return "Devi ancora confermare l'email: cerca il messaggio di Valmiro nella posta, anche nello spam.";
  if (/already registered/i.test(m)) return "Esiste già un account con questa email. Entra, o usa \"Password dimenticata\".";
  if (/password should be at least/i.test(m)) return "La password deve avere almeno 8 caratteri.";
  if (/rate limit|too many requests/i.test(m)) return "Troppi tentativi in poco tempo. Aspetta qualche minuto e riprova.";
  if (/same.*password|different from the old/i.test(m)) return "La nuova password deve essere diversa da quella vecchia.";
  return m;
}

function Pagina() {
  const { utente, profilo, pronto } = useSessione();
  const params = useSearchParams();
  const [modo, setModo] = useState<Modo>("entra");
  const [tipo, setTipo] = useState<Tipo>("privato");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [ragione, setRagione] = useState("");
  const [piva, setPiva] = useState("");
  const [msg, setMsg] = useState<{ testo: string; tono: "ok" | "ko" } | null>(null);
  const [lavoro, setLavoro] = useState(false);

  /* Da dove arriva chi apre questa pagina:
     - dal link di conferma dell'email: glielo diciamo e lo facciamo entrare;
     - dal link "password dimenticata": Supabase apre una sessione di recupero e
       lo segnala con un evento; a quel punto la pagina chiede la password nuova. */
  useEffect(() => {
    if (params.get("confermata")) setMsg({ testo: "Email confermata. Ora puoi entrare.", tono: "ok" });
    const sb = supabase();
    if (!sb) return;
    const { data: sub } = sb.auth.onAuthStateChange((evento) => {
      if (evento === "PASSWORD_RECOVERY") { setModo("nuova"); setMsg(null); }
    });
    return () => sub.subscription.unsubscribe();
  }, [params]);

  const errore = (e: any) => setMsg({ testo: traduci(e?.message || "Qualcosa non ha funzionato. Riprova."), tono: "ko" });

  async function conGoogle() {
    const sb = supabase();
    if (!sb) return;
    setLavoro(true); setMsg(null);
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/stime` },
    });
    if (error) { errore(error); setLavoro(false); }
    // se non c'e' errore il browser sta gia' andando su Google
  }

  async function invia(e: React.FormEvent) {
    e.preventDefault();
    const sb = supabase();
    if (!sb) return;
    setLavoro(true); setMsg(null);
    try {
      if (modo === "entra") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        location.href = "/stime";
      } else if (modo === "registrati") {
        if (tipo === "agenzia" && ragione.trim().length < 2) throw new Error("Manca la ragione sociale.");
        const { error } = await sb.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${location.origin}/accedi?confermata=1`,
            data: { tipo, nome, ragione_sociale: tipo === "agenzia" ? ragione : null, partita_iva: tipo === "agenzia" ? piva : null },
          },
        });
        if (error) throw error;
        setMsg({ testo: `Ti abbiamo scritto a ${email}: apri il messaggio e conferma. Poi torna qui per entrare.`, tono: "ok" });
      } else if (modo === "recupera") {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/accedi` });
        if (error) throw error;
        setMsg({ testo: `Se ${email} è registrata, riceverai un link per scegliere una password nuova.`, tono: "ok" });
      } else if (modo === "nuova") {
        const { error } = await sb.auth.updateUser({ password });
        if (error) throw error;
        setMsg({ testo: "Password aggiornata.", tono: "ok" });
        setTimeout(() => { location.href = "/stime"; }, 900);
      }
    } catch (err) { errore(err); }
    setLavoro(false);
  }

  const cambia = (m: Modo) => { setModo(m); setMsg(null); };

  if (!accountAttivo) return (
    <div className="v-page"><Header />
      <main className="v-fill"><section className="v-wrap v-section v-narrow">
        <p className="v-eyebrow">Area personale</p>
        <h1 className="v-h1" style={{ marginTop: "var(--s-3)" }}>Non ancora collegata</h1>
        <p className="v-lead" style={{ marginTop: "var(--s-5)" }}>
          Manca la configurazione del database. Le stime restano salvate in questo browser e
          funzionano lo stesso: semplicemente non le ritrovi da un altro dispositivo.
        </p>
      </section></main>
    </div>
  );

  if (pronto && utente && modo !== "nuova") return (
    <div className="v-page"><Header />
      <main className="v-fill"><section className="v-wrap v-section v-narrow">
        <p className="v-eyebrow">Il tuo account</p>
        <h1 className="v-h1" style={{ marginTop: "var(--s-3)" }}>{profilo?.nome || utente.email}</h1>
        <dl className="v-facts" style={{ marginTop: "var(--s-6)" }}>
          <div className="v-fact"><dt>Email</dt><dd style={{ fontSize: "var(--t-body-lg)" }}>{utente.email}</dd></div>
          <div className="v-fact"><dt>Tipo di account</dt><dd>{profilo?.tipo === "agenzia" ? "Agenzia" : "Privato"}</dd></div>
          {profilo?.ragione_sociale && <div className="v-fact"><dt>Ragione sociale</dt><dd>{profilo.ragione_sociale}</dd></div>}
        </dl>
        <div className="v-actions">
          <Link className="v-btn v-btn--accent" href="/stime">Le mie stime</Link>
          <button className="v-btn v-btn--bare" onClick={() => cambia("nuova")}>Cambia password</button>
          <span className="v-spacer" />
          <button className="v-btn v-btn--quiet" onClick={esci}>Esci</button>
        </div>
      </section></main>
    </div>
  );

  const titolo = { entra: "Entra", registrati: "Crea un account", recupera: "Password dimenticata", nuova: "Scegli una password nuova" }[modo];
  const sotto = {
    entra: "Per ritrovare le tue stime da qualsiasi dispositivo.",
    registrati: "Le stime restano tue: nessuno le vede, e puoi cancellarle quando vuoi.",
    recupera: "Ti mandiamo un link: aprilo e scegli una password nuova.",
    nuova: "Almeno 8 caratteri. Da adesso vale questa.",
  }[modo];

  return (
    <div className="v-page"><Header />
      <main className="v-fill"><section className="v-wrap v-section v-narrow">
        <p className="v-eyebrow">Area personale</p>
        <h1 className="v-h1" style={{ marginTop: "var(--s-3)" }}>{titolo}</h1>
        <p className="v-lead" style={{ marginTop: "var(--s-4)" }}>{sotto}</p>

        {(modo === "entra" || modo === "registrati") && (
          <div className="v-auth__social" style={{ maxWidth: 560 }}>
            <button className="v-btn v-btn--quiet v-btn--lg v-auth__google" onClick={conGoogle} disabled={lavoro}>
              Continua con Google
            </button>
            <p className="v-auth__or"><span>oppure con l&apos;email</span></p>
          </div>
        )}

        <form className="v-fields" onSubmit={invia} style={{ maxWidth: 560, marginTop: modo === "entra" || modo === "registrati" ? 0 : "var(--s-7)" }}>
          {modo === "registrati" && (
            <div className="v-field">
              <span className="v-field__lbl">Chi sei</span>
              <div className="v-choices">
                <button type="button" className="v-choice" aria-pressed={tipo === "privato"} onClick={() => setTipo("privato")}>
                  <b>Privato</b><small>Vendo o compro casa mia</small></button>
                <button type="button" className="v-choice" aria-pressed={tipo === "agenzia"} onClick={() => setTipo("agenzia")}>
                  <b>Agenzia o professionista</b><small>Valuto immobili per lavoro</small></button>
              </div>
            </div>
          )}

          {modo === "registrati" && tipo === "agenzia" && (
            <div className="v-row2">
              <label className="v-field"><span className="v-field__lbl">Ragione sociale</span>
                <input className="v-input" value={ragione} onChange={(e) => setRagione(e.target.value)} placeholder="Immobiliare Rossi srl" required /></label>
              <label className="v-field"><span className="v-field__lbl">Partita IVA</span>
                <input className="v-input" value={piva} onChange={(e) => setPiva(e.target.value)} placeholder="facoltativa" /></label>
            </div>
          )}

          {modo === "registrati" && tipo === "privato" && (
            <label className="v-field"><span className="v-field__lbl">Nome</span>
              <input className="v-input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Come ti chiamiamo" autoComplete="given-name" /></label>
          )}

          {modo !== "nuova" && (
            <label className="v-field"><span className="v-field__lbl">Email</span>
              <input className="v-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" inputMode="email" /></label>
          )}

          {modo !== "recupera" && (
            <label className="v-field">
              <span className="v-field__lbl">{modo === "nuova" ? "Nuova password" : "Password"}</span>
              <input className="v-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                autoComplete={modo === "entra" ? "current-password" : "new-password"} />
              {modo === "registrati" && <span className="v-field__hint">Almeno 8 caratteri.</span>}
            </label>
          )}

          {msg && <p className={`v-auth__msg v-auth__msg--${msg.tono}`} role="status">{msg.testo}</p>}

          <div className="v-actions" style={{ marginTop: "var(--s-2)" }}>
            <button className="v-btn v-btn--accent" type="submit" disabled={lavoro}>
              {lavoro ? "…" : { entra: "Entra", registrati: "Crea account", recupera: "Mandami il link", nuova: "Salva la password" }[modo]}
            </button>
            {modo === "entra" && <>
              <button className="v-btn v-btn--bare" type="button" onClick={() => cambia("registrati")}>Non ho un account</button>
              <span className="v-spacer" />
              <button className="v-btn v-btn--bare" type="button" onClick={() => cambia("recupera")}>Password dimenticata</button>
            </>}
            {modo === "registrati" && <button className="v-btn v-btn--bare" type="button" onClick={() => cambia("entra")}>Ho già un account</button>}
            {modo === "recupera" && <button className="v-btn v-btn--bare" type="button" onClick={() => cambia("entra")}>Torna a Entra</button>}
          </div>
        </form>

        {modo === "registrati" && (
          <p className="v-small" style={{ marginTop: "var(--s-7)", color: "var(--ink-faint)" }}>
            Creando l&apos;account accetti che l&apos;email serva solo a farti entrare e a ritrovare le tue stime.
            Non la cediamo a nessuno.
          </p>
        )}
      </section></main>
    </div>
  );
}
