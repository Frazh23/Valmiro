'use client';
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {PAGINE,provenienza,identitaVisita,type Identita} from '@/lib/traffico';
const SCELTA='valmiro-statistiche-consenso-v1', IDENTITA='valmiro-statistiche-v1';
type Scelta='si'|'no'|null;
export default function ConsensoStatistiche({attivo}:{attivo:boolean}) {
 const path=usePathname(); const [scelta,setScelta]=useState<Scelta>(null),[pronto,setPronto]=useState(false),[aperto,setAperto]=useState(false);
 useEffect(()=>{try{const x=JSON.parse(localStorage.getItem(SCELTA)||'null');setScelta(x&&x.scade>Date.now()&&['si','no'].includes(x.valore)?x.valore:null);}catch{}setPronto(true);},[]);
 useEffect(()=>{
  if(!attivo||!pronto||scelta!=='si'||!Object.hasOwn(PAGINE,path))return;
  const controller=new AbortController(); let precedente='';
  const invia=()=>{
   if(document.visibilityState==='hidden')return;
   try{
    const c=JSON.parse(localStorage.getItem(SCELTA)||'null');
    if(c?.valore!=='si'||c.scade<=Date.now()){localStorage.removeItem(IDENTITA);setScelta(null);return;}
    let prima:Identita|null=null;try{prima=JSON.parse(localStorage.getItem(IDENTITA)||'null');}catch{}
    const ora=Date.now(),id=identitaVisita(prima,ora,provenienza(document.referrer),()=>crypto.randomUUID());
    localStorage.setItem(IDENTITA,JSON.stringify(id));
    if(precedente===id.sessione)return;precedente=id.sessione;
    void fetch('/api/visite',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({evento:crypto.randomUUID(),visitatore:id.visitatore,sessione:id.sessione,pagina:path,fonte:id.fonte,dispositivo:window.innerWidth<768?'telefono':window.innerWidth<1024?'tablet':'computer',consenso:true})}).catch(()=>{});
   }catch{/* Memoria bloccata: nessun identificatore, nessuna raccolta. */}
  };
  invia();window.addEventListener('pointerdown',invia,{passive:true});window.addEventListener('keydown',invia);document.addEventListener('visibilitychange',invia);
  return()=>{controller.abort();window.removeEventListener('pointerdown',invia);window.removeEventListener('keydown',invia);document.removeEventListener('visibilitychange',invia);};
 },[attivo,pronto,scelta,path]);
 useEffect(()=>{const cambio=(e:StorageEvent)=>{if(e.key===SCELTA){try{const c=JSON.parse(e.newValue||'null');setScelta(c?.scade>Date.now()?c.valore:null);}catch{setScelta(null);}}};window.addEventListener('storage',cambio);return()=>window.removeEventListener('storage',cambio);},[]);
 function scegli(valore:'si'|'no') {try{localStorage.setItem(SCELTA,JSON.stringify({valore,scade:Date.now()+180*86400000}));if(valore==='no')localStorage.removeItem(IDENTITA);}catch{}setScelta(valore);setAperto(false);}
 if(!attivo||!pronto)return null;
 return <><div className="v-preferenze"><button type="button" onClick={()=>setAperto(true)}>Preferenze privacy</button></div>
 {(aperto||(scelta===null&&Object.hasOwn(PAGINE,path)))&&<section className="v-consenso" aria-label="Preferenze statistiche"><h2 className="v-h3">Ci aiuti a migliorare Valmiro?</h2><p>Con il tuo consenso misuriamo visite e pagine viste, anche senza account. Usiamo identificatori casuali per riconoscere il browser, senza collegarli alle tue stime. Puoi rifiutare e continuare normalmente.</p><p><Link href="/privacy">Come trattiamo questi dati</Link></p><div><button type="button" onClick={()=>scegli('si')}>Accetta statistiche</button><button type="button" onClick={()=>scegli('no')}>{scelta==='si'?'Revoca consenso':'Rifiuta statistiche'}</button>{scelta!==null&&<button type="button" onClick={()=>setAperto(false)}>Chiudi</button>}</div></section>}</>;
}
