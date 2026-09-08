'use client';
import {useEffect,useRef,useState} from 'react';
import {supabase} from '@/lib/supabase';
import {giornoRoma,spostaData,PAGINE} from '@/lib/traffico';
type Rapporto={attivo:boolean;iniziato:string|null;generato:string;visitatori:number;sessioni:number;pagineViste:number;giorni:{giorno:string;visite:number;pagine:number}[];pagine:{pagina:string;n:number}[];fonti:{fonte:string;n:number}[];dispositivi:{dispositivo:string;n:number}[]};
const n=(x:number)=>x.toLocaleString('it-IT');
const fonti:Record<string,string>={diretto:'Diretto / non disponibile',google:'Google',bing:'Bing',social:'Social',altro:'Altri siti'};
export default function StatisticheTraffico({utente,abilitato}:{utente:string;abilitato:boolean}){
 const oggi=giornoRoma(),[dal,setDal]=useState(spostaData(oggi,-6)),[al,setAl]=useState(oggi),[range,setRange]=useState({dal:spostaData(oggi,-6),al:oggi}),[refresh,setRefresh]=useState(0);
 const [dati,setDati]=useState<Rapporto|null>(null),[errore,setErrore]=useState('');
 const periodo=useRef('');
 useEffect(()=>{let vivo=true;
  // I numeri di prima si cancellano solo quando cambia il periodo o l'utente: un
  // semplice ricontrollo non deve far lampeggiare la sezione ogni minuto.
  const chiave=`${utente}|${range.dal}|${range.al}`;
  if(periodo.current!==chiave){periodo.current=chiave;setDati(null);}
  setErrore('');const sb=supabase();
  if(!sb){setErrore('Statistiche non disponibili.');return;}
  void sb.rpc('metriche_traffico',{p_dal:range.dal,p_al:range.al}).then(({data,error})=>{if(!vivo)return;if(error){setErrore(error.code==='42501'?'Accesso non autorizzato.':error.code==='22023'?'Scegli un periodo valido negli ultimi 90 giorni.':'Statistiche non disponibili. Riprova tra poco.');}else setDati(data as Rapporto);});
  const {data:sub}=sb.auth.onAuthStateChange((evento)=>{if(evento!=='INITIAL_SESSION'){setDati(null);setRefresh(x=>x+1);}});
  return()=>{vivo=false;sub.subscription.unsubscribe();};
 },[utente,range,refresh]);
 // Revalidate access on focus and periodically, including privileges revoked remotely.
 useEffect(()=>{const ricontrolla=()=>setRefresh(x=>x+1);window.addEventListener('focus',ricontrolla);const timer=setInterval(ricontrolla,60000);return()=>{clearInterval(timer);window.removeEventListener('focus',ricontrolla);};},[]);
 function preset(g:number){const start=spostaData(oggi,1-g);setDal(start);setAl(oggi);setRange({dal:start,al:oggi});}
 const picco=Math.max(1,...(dati?.giorni.map(g=>g.visite)||[]));
 return <section className="v-traffico" aria-labelledby="titolo-traffico"><h2 id="titolo-traffico" className="v-h3">Visite al sito</h2><p className="v-small">Statistiche dei visitatori che hanno acconsentito</p>
 <form className="v-traffico-filtri" onSubmit={e=>{e.preventDefault();setRange({dal,al});}}><div>{[1,7,30].map(g=><button key={g} type="button" aria-pressed={range.dal===spostaData(oggi,1-g)&&range.al===oggi} onClick={()=>preset(g)}>{g===1?'Oggi':`${g} giorni`}</button>)}</div><label>Dal<input type="date" value={dal} min={spostaData(oggi,-89)} max={al} required onChange={e=>setDal(e.target.value)}/></label><label>Al<input type="date" value={al} min={dal} max={oggi} required onChange={e=>setAl(e.target.value)}/></label><button>Applica</button><button type="button" onClick={()=>setRefresh(x=>x+1)}>Aggiorna</button></form>
 {errore?<p role="alert">{errore}</p>:!dati?<p role="status">Caricamento statistiche…</p>:<>
 {(!abilitato||!dati.attivo)&&<p className="v-small">Raccolta disattivata. I dati eventualmente presenti sono storici.</p>}
 {!dati.iniziato?<p>La raccolta non è ancora iniziata. Nessuno storico delle visite è stato ricostruito.</p>:<><p className="v-micro">Raccolta avviata il {new Date(dati.iniziato).toLocaleString('it-IT',{timeZone:'Europe/Rome'})}. Orari italiani; oggi è parziale.</p>
 <div className="v-dati">{[['Visitatori stimati',dati.visitatori],['Visite / sessioni',dati.sessioni],['Pagine viste',dati.pagineViste]].map(([nome,valore])=><div className="v-dato" key={nome}><p className="v-eyebrow">{nome}</p><p className="v-dato__n">{n(valore as number)}</p></div>)}</div>
 {dati.pagineViste===0?<p>Nessuna visita rilevata nel periodo selezionato.</p>:<><h3 className="v-h3">Visite giorno per giorno</h3><div className={`v-traffico-grafico${dati.giorni.length>10?' v-traffico-grafico--fitto':''}`} role="img" aria-label={dati.giorni.map(g=>`${g.giorno}: ${g.visite} visite`).join('; ')}>{dati.giorni.map((g,i)=><div key={g.giorno} title={`${g.giorno}: ${g.visite} visite, ${g.pagine} pagine`}><span style={{height:`${g.visite/picco*100}%`}}/>{/* Su schermo stretto, con trenta giorni, i numeri sotto le barre si toccano
             e diventano una fila illeggibile: se ne tengono uno ogni cinque, piu' l'ultimo. */}
 <small data-chiave={i%5===0||i===dati.giorni.length-1?'':undefined}>{g.giorno.slice(8)}</small></div>)}</div>
 <div className="v-traffico-tabelle"><Tabella titolo="Pagine più viste" unita="Pagine viste" righe={dati.pagine.map(x=>[PAGINE[x.pagina]||x.pagina,x.n])}/><Tabella titolo="Provenienza" unita="Sessioni" righe={dati.fonti.map(x=>[fonti[x.fonte]||x.fonte,x.n])}/><Tabella titolo="Dispositivi" unita="Sessioni" righe={dati.dispositivi.map(x=>[x.dispositivo,x.n])}/></div></>}
 <p className="v-micro">I visitatori sono browser distinti nel periodo, non persone identificate. La stessa persona su dispositivi diversi può essere contata più volte. Rifiuti, blocchi e bot possono alterare i conteggi. Una nuova sessione inizia dopo 30 minuti di inattività; la somma delle sessioni giornaliere può differire dal totale se attraversano la mezzanotte.</p></>}
 </>}
 </section>;
}
function Tabella({titolo,unita,righe}:{titolo:string;unita:string;righe:[string,number][]}){return <table><caption>{titolo}</caption><thead><tr><th>Voce</th><th>{unita}</th></tr></thead><tbody>{righe.map(([nome,valore])=><tr key={nome}><th scope="row">{nome}</th><td>{n(valore)}</td></tr>)}</tbody></table>;}
