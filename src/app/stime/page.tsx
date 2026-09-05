"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Testata from "@/components/Testata";
import { leggiStime, eliminaStima, leggiStimeAccount, eliminaStimaAccount, migraStimeLocali, type StimaSalvata } from "@/lib/storage";
import { useSessione } from "@/lib/sessione";
import { eur } from "@/lib/formato";


export default function Stime() {
  const { utente, pronto } = useSessione();
  const [stime, setStime] = useState<StimaSalvata[] | null>(null);
  const [daMigrare, setDaMigrare] = useState(0);

  const ricarica = async () => setStime(utente ? await leggiStimeAccount() : leggiStime());

  useEffect(() => {
    if (!pronto) return;
    ricarica();
    setDaMigrare(utente ? leggiStime().length : 0);
  }, [pronto, utente]);

  async function elimina(id: string) {
    if (utente) await eliminaStimaAccount(id); else eliminaStima(id);
    ricarica();
  }

  return (
    <main className="shell">
      <Testata />
      <h1 className="pagina-h">Le mie stime</h1>
      <p className="sub" style={{ marginBottom: 28 }}>
        {utente
          ? "Salvate nel tuo account: le ritrovi da qualsiasi dispositivo, e le vedi solo tu."
          : "Restano su questo browser. Con un account le ritrovi ovunque."}
      </p>

      {daMigrare > 0 && (
        <div className="conferma dubbia" style={{ marginBottom: 18 }}>
          Su questo browser ci sono {daMigrare} stime fatte prima di entrare.
          <small>Portale nell&apos;account così non le perdi cambiando dispositivo.</small>
          <button className="ghost" style={{ padding: "8px 0" }}
            onClick={async () => { await migraStimeLocali(utente!.id); setDaMigrare(0); ricarica(); }}>
            Portale nell&apos;account
          </button>
        </div>
      )}

      {stime === null ? null : stime.length === 0 ? (
        <div className="card vuoto">
          <p>Non hai ancora fatto nessuna stima.</p>
          <Link href="/valuta" className="primary">Valuta una casa</Link>
        </div>
      ) : (
        <div className="lista">
          {stime.map((s) => (
            <div className="riga-stima" key={s.id}>
              <div>
                <b>{s.indirizzo}</b>
                <small>
                  {s.input.intento === "compro" ? "da comprare · " : s.input.intento === "vendo" ? "da vendere · " : ""}
                  zona {s.zona} · {s.descrizioneZona} · {s.input.mq} mq · {new Date(s.creataIl).toLocaleDateString("it-IT")}
                  {s.input.boxSeparato?.incluso ? " · box venduto a parte incluso nel valore" : ""}
                </small>
                {/* la limitazione viaggia con la stima: chi la rilegge fra un mese la trova qui, non solo nella pagina del risultato */}
                {s.stima.simulazione && (
                  <small className="avviso">
                    Simulazione che ipotizza un piano terra: il piano dichiarato è {s.stima.simulazione.pianoDichiarato}, che il modello non quota. Non è una valutazione di quel piano.
                  </small>
                )}
              </div>
              <div className="valore">
                {eur(s.stima.min)}–{eur(s.stima.max)} €
                <small>{eur(s.stima.euroMq)} €/mq · {s.stima.simulazione ? "simulazione, non una valutazione" : `affidabilità ${s.stima.affidabilita.toLowerCase()}`}</small>
              </div>
              <button className="ghost" onClick={() => elimina(s.id)}>Elimina</button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
