"use client";
import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import Header from "@/components/sistema/Header";
import Logo from "@/components/sistema/Logo";
import { useSessione } from "@/lib/sessione";
import { supabase } from "@/lib/supabase";
import { eur, num } from "@/lib/formato";
import { FONTE } from "@/lib/data";

/**
 * Il gestionale: i numeri del sito per chi lo tiene.
 *
 * Legge una sola funzione del database (`metriche_gestione`), che risponde soltanto a
 * chi e' nella tabella `amministratori` e restituisce soltanto conteggi e mediane: mai
 * una riga, mai un indirizzo, mai un'email. Per questo la pagina non ha bisogno di
 * nessuna chiave privilegiata: parla con Supabase come l'utente collegato, e se non e'
 * autorizzato e' il database a dire di no.
 *
 * Per chiunque non sia amministratore — compreso chi non e' collegato — questa pagina
 * **non esiste**: risponde 404 come un indirizzo sbagliato. Non un «non hai accesso»,
 * che direbbe comunque che qui c'e' qualcosa. Per entrare: prima /accedi, poi /gestione.
 *
 * Qui c'e' solo cio' che il database sa davvero. I visitatori non li contiamo, e le
 * stime fatte senza account restano nel browser di chi le fa: non arrivano mai qui.
 * Vendite e abbonamenti non ci sono perche' non esistono, non perche' valgono zero.
 */

type Metriche = {
  generato: string;
  account: { totale: number; ultimi30: number; ultimi7: number; agenzie: number; privati: number };
  stime: {
    totale: number; ultimi30: number; ultimi7: number; compro: number; vendo: number;
    conPrezzo: number; conAccount: number; valoreMediano: number | null; mqMediani: number | null;
  };
  zone: { zona: string; n: number }[];
  settimane: { dal: string; n: number }[];
};

/** Un numero grande con la sua etichetta: e' tutto quello che serve a un pannello onesto. */
function Dato({ etichetta, valore, nota }: { etichetta: string; valore: string; nota?: string }) {
  return (
    <div className="v-dato">
      <p className="v-eyebrow">{etichetta}</p>
      <p className="v-dato__n">{valore}</p>
      {nota && <p className="v-micro">{nota}</p>}
    </div>
  );
}

const giorno = (s: string) => new Date(s).toLocaleDateString("it-IT", { day: "numeric", month: "short" });

export default function Gestione() {
  const { utente, pronto, accountAttivo } = useSessione();
  const [m, setM] = useState<Metriche | null>(null);
  const [stato, setStato] = useState<"attendo" | "ok" | "vietato" | "errore">("attendo");

  useEffect(() => {
    if (!pronto || !utente) return;
    const sb = supabase();
    if (!sb) { setStato("errore"); return; }
    sb.rpc("metriche_gestione").then(({ data, error }) => {
      if (error) {
        const vietato = error.code === "42501" || /non autorizzato/i.test(error.message);
        // La pagina risponde 404 in ogni caso: non deve dire a nessuno che esiste. Ma un
        // errore tecnico (funzione non installata, query sbagliata) non e' un rifiuto, e
        // senza una traccia diventa impossibile da distinguere. La lasciamo in console.
        if (!vietato) console.warn(`GESTIONE ${error.code || "?"}: ${error.message}`);
        setStato(vietato ? "vietato" : "errore");
        return;
      }
      setM(data as Metriche); setStato("ok");
    });
  }, [pronto, utente]);

  const testa = (
    <>
      <p className="v-eyebrow">Gestione</p>
      <h1 className="v-h1" style={{ marginTop: "var(--s-3)" }}>I numeri del sito</h1>
    </>
  );

  /* Non amministratore, o non collegato: la pagina non esiste. Stessa risposta per
     tutti, cosi' non si capisce nemmeno che ci sia qualcosa da cercare. */
  if (!accountAttivo || (pronto && !utente) || stato === "vietato" || stato === "errore") notFound();

  /* Finche' la sessione e la risposta del database non ci sono, niente: meglio una
     pagina vuota per un istante che un lampo di gestionale a chi non deve vederlo. */
  if (!pronto || stato === "attendo") return <Pagina>{null}</Pagina>;

  if (!m) return <Pagina>{null}</Pagina>;

  const picco = Math.max(1, ...m.settimane.map((s) => s.n));
  const perAccount = m.stime.conAccount ? m.stime.totale / m.stime.conAccount : 0;
  const senzaIntento = Math.max(0, m.stime.totale - m.stime.compro - m.stime.vendo);

  return (
    <Pagina>
      {testa}
      <p className="v-lead v-measure" style={{ marginTop: "var(--s-4)" }}>
        Quello che il database sa, al {new Date(m.generato).toLocaleString("it-IT", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}.
      </p>

      <h2 className="v-h3" style={{ marginTop: "var(--s-8)" }}>Chi si è registrato</h2>
      <div className="v-dati">
        <Dato etichetta="Account" valore={num(m.account.totale)} nota={`${num(m.account.privati)} privati · ${num(m.account.agenzie)} agenzie`} />
        <Dato etichetta="Ultimi 30 giorni" valore={num(m.account.ultimi30)} />
        <Dato etichetta="Ultimi 7 giorni" valore={num(m.account.ultimi7)} />
      </div>

      <h2 className="v-h3" style={{ marginTop: "var(--s-8)" }}>Stime salvate nell&apos;account</h2>
      <div className="v-dati">
        <Dato etichetta="In tutto" valore={num(m.stime.totale)} nota={`da ${num(m.stime.conAccount)} account${m.stime.conAccount ? ` · ${num(perAccount, 1)} a testa` : ""}`} />
        <Dato etichetta="Ultimi 30 giorni" valore={num(m.stime.ultimi30)} />
        <Dato etichetta="Ultimi 7 giorni" valore={num(m.stime.ultimi7)} />
        <Dato
          etichetta="Chi compra"
          valore={num(m.stime.compro)}
          nota={
            // Le stime salvate prima che il modulo chiedesse l'intento non ce l'hanno:
            // dirlo evita di leggere «0 chi vende» come un fatto sul mercato.
            `${num(m.stime.vendo)} chi vende` +
            (senzaIntento > 0 ? ` · ${num(senzaIntento)} senza intento registrato` : "")
          }
        />
        <Dato etichetta="Con il prezzo dell&apos;annuncio" valore={num(m.stime.conPrezzo)} nota="il confronto vero" />
        <Dato etichetta="Valore mediano" valore={m.stime.valoreMediano ? `${eur(m.stime.valoreMediano)} €` : "—"} nota={m.stime.mqMediani ? `${num(m.stime.mqMediani)} mq mediani` : undefined} />
      </div>

      {m.settimane.length > 0 && (
        <>
          <h2 className="v-h3" style={{ marginTop: "var(--s-8)" }}>Le ultime otto settimane</h2>
          <div className="v-settimane">
            {m.settimane.map((s) => (
              <div className="v-settimana" key={s.dal}>
                <span className="v-settimana__spazio" aria-hidden="true">
                  <span className="v-settimana__barra" style={{ height: `${Math.max(2, Math.round((s.n / picco) * 100))}%` }} />
                </span>
                <span className="v-micro v-settimana__n">{s.n}</span>
                <span className="v-micro v-settimana__data">dal {giorno(s.dal)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {m.zone.length > 0 && (
        <>
          <h2 className="v-h3" style={{ marginTop: "var(--s-8)" }}>Le zone più valutate</h2>
          <div className="v-factors" style={{ marginTop: "var(--s-4)" }}>
            {m.zone.map((z) => (
              <div className="v-factor" key={z.zona}>
                <span className="v-factor__n">Zona {z.zona}</span>
                <span className="v-factor__v">{num(z.n)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="v-h3" style={{ marginTop: "var(--s-8)" }}>Cosa qui non c&apos;è</h2>
      <ul className="v-ipotesi v-measure" style={{ marginTop: "var(--s-3)" }}>
        <li><b>I visitatori non li contiamo.</b> Nessun analytics, nessun cookie di misura: chi arriva e se ne va non lascia traccia. Si può cambiare, e in <code>docs/gestione.md</code> c&apos;è come.</li>
        <li><b>Le stime senza account restano nel browser di chi le fa</b> e non arrivano mai qui: i numeri di sopra sono una parte del traffico, non tutto.</li>
        <li><b>Vendite e abbonamenti non compaiono</b> perché non esistono ancora. Quando esisteranno, questa pagina è il posto dove metterli.</li>
      </ul>
    </Pagina>
  );
}

function Pagina({ children }: { children: React.ReactNode }) {
  return (
    <div className="v-page">
      <Header />
      <main className="v-fill">
        <section className="v-wrap v-section v-section--op v-narrow">{children}</section>
      </main>
      <footer className="v-footer">
        <div className="v-wrap v-footer__in">
          <Logo link={false} size="sm" />
          <p className="v-micro">{FONTE}. Le stime sono indicative e non costituiscono perizia.</p>
        </div>
      </footer>
    </div>
  );
}
