'use client';
import type { Evento, Misura } from './telemetria-schema';
const visti=new Set<string>();
export function nuovoPercorso() { visti.clear(); }
export function misura(evento:Evento, intento:Misura['intento']='nd') {
 if (typeof window==='undefined' || process.env.NEXT_PUBLIC_TELEMETRIA_ENABLED !== 'true') return;
 const key=evento+':'+intento;
 if(visti.has(key)) return;
 visti.add(key);
 const payload:Misura={evento,intento,formato:window.innerWidth<768?'mobile':'desktop'};
 void fetch('/api/eventi',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),credentials:'omit',keepalive:true}).catch(()=>{});
}
