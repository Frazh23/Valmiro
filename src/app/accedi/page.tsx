"use client";
import { useState } from "react";
import Link from "next/link";
import Testata from "@/components/Testata";
import { supabase, accountAttivo } from "@/lib/supabase";
import { useSessione, esci } from "@/lib/sessione";

type Tipo = "privato" | "agenzia";

export default function Accedi() {
  const { utente, profilo, pronto } = useSessione();
  const [modo, setModo] = useState<"entra" | "registrati">("entra");
  const [tipo, setTipo] = useState<Tipo>("privato");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [ragione, setRagione] = useState("");
  const [piva, setPiva] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [lavoro, setLavoro] = useState(false);

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
      } else {
        if (tipo === "agenzia" && ragione.trim().length < 2) throw new Error("Manca la ragione sociale");
        const { error } = await sb.auth.signUp({
          email, password,
          options: { data: { tipo, nome, ragione_sociale: tipo === "agenzia" ? ragione : null, partita_iva: tipo === "agenzia" ? piva : null } },
        });
        if (error) throw error;
        setMsg("Ti abbiamo mandato una mail di conferma: aprila e poi torna qui per entrare.");
      }
    } catch (err: any) {
      setMsg(err.message === "Invalid login credentials" ? "Email o password non corretti." : err.message);
    }
    setLavoro(false);
  }

  if (!accountAttivo) return (
    <main className="shell">
      <Testata />
      <h1 className="pagina-h">Area personale</h1>
      <div className="card" style={{ marginTop: 20 }}>
        <p className="sub" style={{ maxWidth: "60ch" }}>
          L&apos;account non è ancora collegato: manca la configurazione del database.
          Finché non c&apos;è, le stime restano salvate in questo browser e funzionano lo stesso —
          semplicemente non le ritrovi da un altro dispositivo.
        </p>
        <p className="hint" style={{ marginTop: 14 }}>
          Per attivarlo servono due chiavi in <code>.env.local</code>:
          <code>NEXT_PUBLIC_SUPABASE_URL</code> e <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
        </p>
        <div className="nav"><Link className="primary" href="/valuta">Fai una stima</Link></div>
      </div>
    </main>
  );

  if (pronto && utente) return (
    <main className="shell">
      <Testata />
      <h1 className="pagina-h">Il tuo account</h1>
      <div className="card" style={{ marginTop: 20 }}>
        <div className="rowline"><span>Email</span><span className="r">{utente.email}</span></div>
        <div className="rowline"><span>Tipo di account</span><span className="r">{profilo?.tipo === "agenzia" ? "Agenzia" : "Privato"}</span></div>
        {profilo?.ragione_sociale && <div className="rowline"><span>Ragione sociale</span><span className="r">{profilo.ragione_sociale}</span></div>}
        <div className="nav">
          <Link className="primary" href="/stime">Le mie stime</Link>
          <button className="ghost" onClick={esci}>Esci</button>
        </div>
      </div>
    </main>
  );

  return (
    <main className="shell">
      <Testata />
      <h1 className="pagina-h">{modo === "entra" ? "Entra" : "Crea un account"}</h1>
      <p className="sub" style={{ marginBottom: 24 }}>
        {modo === "entra"
          ? "Per ritrovare le tue stime da qualsiasi dispositivo."
          : "Le stime restano tue: nessuno le vede, e puoi cancellarle quando vuoi."}
      </p>

      <div className="card" style={{ maxWidth: 560 }}>
        <form className="body" style={{ marginTop: 0 }} onSubmit={invia}>
          {modo === "registrati" && (
            <div className="field">
              <span className="lbl">Chi sei</span>
              <div className="opts two">
                <button type="button" className="opt" aria-pressed={tipo === "privato"} onClick={() => setTipo("privato")}>
                  <span className="t">Privato</span><span className="d">Vendo o compro casa mia</span></button>
                <button type="button" className="opt" aria-pressed={tipo === "agenzia"} onClick={() => setTipo("agenzia")}>
                  <span className="t">Agenzia o professionista</span><span className="d">Valuto immobili per lavoro</span></button>
              </div>
            </div>
          )}

          {modo === "registrati" && tipo === "agenzia" && (
            <div className="row2">
              <label className="field"><span className="lbl">Ragione sociale</span>
                <input value={ragione} onChange={(e) => setRagione(e.target.value)} placeholder="Immobiliare Rossi srl" required /></label>
              <label className="field"><span className="lbl">Partita IVA</span>
                <input value={piva} onChange={(e) => setPiva(e.target.value)} placeholder="facoltativa" /></label>
            </div>
          )}

          {modo === "registrati" && tipo === "privato" && (
            <label className="field"><span className="lbl">Nome</span>
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Come ti chiamiamo" /></label>
          )}

          <label className="field"><span className="lbl">Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>

          <label className="field"><span className="lbl">Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
              autoComplete={modo === "entra" ? "current-password" : "new-password"} />
            {modo === "registrati" && <span className="hint">Almeno 8 caratteri.</span>}</label>

          {msg && <div className="conferma dubbia">{msg}</div>}

          <div className="nav" style={{ marginTop: 8 }}>
            <button className="primary" type="submit" disabled={lavoro}>
              {lavoro ? "…" : modo === "entra" ? "Entra" : "Crea account"}</button>
            <button className="ghost" type="button" onClick={() => { setModo(modo === "entra" ? "registrati" : "entra"); setMsg(null); }}>
              {modo === "entra" ? "Non ho un account" : "Ho già un account"}</button>
          </div>
        </form>
      </div>
    </main>
  );
}
