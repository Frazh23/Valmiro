import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/sistema/Header";
import { FONTE } from "@/lib/data";

export const metadata: Metadata = {
  title: "Privacy · Valmiro",
  description: "Quali dati usa Valmiro, perché, e per quanto tempo. Scritto per essere letto.",
};

/**
 * Informativa privacy. Scritta in italiano corrente, non in legalese: chi
 * legge deve capire cosa succede ai suoi dati senza un avvocato. Quando cambia
 * qualcosa nel prodotto che tocca i dati, cambia anche questa pagina.
 */
export default function Privacy() {
  return (
    <div className="v-page">
      <Header />
      <main className="v-fill">
        <article className="v-wrap v-section v-narrow v-prose">
          <p className="v-eyebrow">Privacy</p>
          <h1 className="v-h1" style={{ marginTop: "var(--s-3)" }}>Cosa facciamo con i tuoi dati</h1>
          <p className="v-lead" style={{ marginTop: "var(--s-5)" }}>
            Poco, e te lo diciamo per intero. Valmiro esiste per dirti quanto vale una casa a Milano,
            non per raccogliere informazioni su di te.
          </p>

          <h2>Se usi il sito senza account</h2>
          <p>
            L&apos;indirizzo che scrivi e le caratteristiche della casa servono a calcolare la stima e
            restano nel tuo browser. Non li salviamo sui nostri server e non li associamo a te. Le
            stime che decidi di conservare stanno nella memoria locale del tuo browser: se la
            svuoti, spariscono.
          </p>
          <p>
            Quando un indirizzo non è nell&apos;anagrafe del Comune di Milano, lo chiediamo a
            OpenStreetMap (Nominatim) per trovarne le coordinate. In quel caso l&apos;indirizzo — solo
            l&apos;indirizzo, niente che ti identifichi — arriva ai loro server.
          </p>

          <h2>Se crei un account</h2>
          <p>
            Ci servono la tua email e, se vuoi, il nome. Se entri con Google, riceviamo da Google
            email e nome: nient&apos;altro, e non accediamo a nulla del tuo account Google. Se sei
            un&apos;agenzia puoi indicare ragione sociale e partita IVA: servono solo a distinguere
            un profilo professionale da uno privato.
          </p>
          <p>
            Le stime che salvi con l&apos;account — indirizzo, caratteristiche e risultato — restano
            tue: le vedi solo tu, e puoi cancellarle una per una quando vuoi. Le usiamo, in forma
            anonima e aggregata, per capire dove il modello sbaglia e migliorarlo.
          </p>
          <p>
            L&apos;email serve a farti entrare, a confermare l&apos;iscrizione e a mandarti il link
            se dimentichi la password. Non ti scriviamo per altro e non la cediamo a nessuno.
          </p>

          <h2>Dove stanno i dati e chi ci aiuta</h2>
          <p>
            Il sito gira su <b>Vercel</b>, il database e l&apos;accesso su <b>Supabase</b>, le email
            partono da <b>Resend</b> (server in Irlanda). Sono fornitori tecnici: trattano i dati solo
            per far funzionare Valmiro, secondo i loro accordi di trattamento conformi al GDPR. Non
            usiamo strumenti di analisi del traffico né pubblicità.
          </p>

          <h2>Per quanto tempo</h2>
          <p>
            Finché hai l&apos;account. Se lo cancelli, cancelliamo email, profilo e stime salvate. Per
            farlo scrivi a <a href="mailto:privacy@valmiro.it">privacy@valmiro.it</a>.
          </p>

          <h2>I tuoi diritti</h2>
          <p>
            Puoi chiederci quali dati abbiamo su di te, correggerli, farli cancellare o riceverli in
            un formato leggibile. Basta un&apos;email a{" "}
            <a href="mailto:privacy@valmiro.it">privacy@valmiro.it</a>. Se pensi che non li trattiamo
            come dovremmo, puoi rivolgerti al Garante per la protezione dei dati personali.
          </p>

          <h2>Da dove vengono i prezzi</h2>
          <p>
            {FONTE}. I numeri civici e le coordinate vengono dal Comune di Milano (dataset DS634,
            CC BY 4.0). Le stime sono indicative e non costituiscono perizia.
          </p>

          <p className="v-small" style={{ marginTop: "var(--s-8)", color: "var(--ink-faint)" }}>
            Titolare del trattamento: Francesco Zambelli, <a href="mailto:privacy@valmiro.it">privacy@valmiro.it</a>.
            Ultimo aggiornamento: 4 settembre 2026. <Link href="/">Torna alla home</Link>.
          </p>
        </article>
      </main>
    </div>
  );
}
