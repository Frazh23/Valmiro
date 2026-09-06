import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/sistema/Header';
export const dynamic='force-dynamic';
export const metadata={title:'Termini del servizio · Valmiro'};
export default function Termini() {
 const nome=process.env.GESTORE_NOME,indirizzo=process.env.GESTORE_INDIRIZZO,email=process.env.GESTORE_EMAIL;
 if(process.env.TERMINI_PUBBLICATI!=='true'||!nome||!indirizzo||!email) notFound();
 return <><Header/><main className="v-wrap" style={{paddingTop:100,paddingBottom:60,maxWidth:780}}>
 <h1>Termini del servizio</h1><p>Ultimo aggiornamento: 7 settembre 2026.</p>
 <h2>Chi gestisce Valmiro</h2><p>{nome}, {indirizzo}. Contatti: <a href={`mailto:${email}`}>{email}</a>.
 {process.env.GESTORE_PIVA && <> Partita IVA: {process.env.GESTORE_PIVA}.</>}</p>
 <h2>Il servizio</h2><p>Valmiro offre gratuitamente stime immobiliari indicative a Milano e scenari di ristrutturazione e locazione. È rivolto a privati e professionisti. La stima automatica non è una perizia e non garantisce un prezzo di vendita, un canone o un costo dei lavori.</p>
 <h2>Dati, ipotesi e risultati</h2><p>Il risultato dipende dai dati inseriti e dalle ipotesi mostrate. Quotazioni OMI e prezzi richiesti negli annunci non equivalgono ai prezzi effettivi di compravendita. Il prezzo di pubblicazione applica una convenzione del modello, non una distanza misurata fra richiesto e venduto. La validazione indipendente non è ancora stata eseguita. Prima di prendere impegni economici verifica caratteristiche, documenti e preventivi con professionisti competenti.</p>
 <h2>Account e uso corretto</h2><p>Conserva le credenziali e inserisci solo informazioni che puoi legittimamente utilizzare. Non tentare di accedere ai dati di altri utenti o compromettere il servizio. Le stime locali dipendono dalla memoria del browser; quelle dell’account possono essere eliminate o richieste al gestore.</p>
 <h2>Disponibilità e responsabilità</h2><p>Il servizio può essere aggiornato o temporaneamente non disponibile. Le limitazioni descritte non escludono responsabilità inderogabili né i diritti riconosciuti dalla legge, inclusi quelli dei consumatori.</p>
 <h2>Contenuti e fonti</h2><p>Le attribuzioni e le condizioni delle fonti sono indicate nel <Link href="/metodo">metodo</Link>. Le immagini illustrative generate non documentano specifici immobili in vendita. I dati ufficiali non certificano il risultato del modello.</p>
 <h2>Privacy e modifiche</h2><p>Consulta l’<Link href="/privacy">informativa privacy</Link> per i trattamenti effettivi. Eventuali modifiche sostanziali dei termini saranno indicate in questa pagina con la data di aggiornamento. Per richieste o reclami contatta il gestore.</p>
 </main></>;
}
