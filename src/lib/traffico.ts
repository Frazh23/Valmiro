export const GIORNI = 90;
export const DURATA_VISITATORE = GIORNI * 86400000;
export const DURATA_SESSIONE = 30 * 60000;
export const PAGINE: Record<string, string> = {'/':'Home','/valuta':'Valutazione','/quartieri':'Quartieri','/metodo':'Metodo','/privacy':'Privacy','/termini':'Termini','/en':'English','/fr':'Français'};
export const FONTI = ['diretto','google','bing','social','altro'] as const;
export type Fonte = typeof FONTI[number];
export type Dispositivo = 'telefono' | 'tablet' | 'computer';
export type Visita = {evento:string; visitatore:string; sessione:string; pagina:string; fonte:Fonte; dispositivo:Dispositivo; consenso:true};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validaVisita(v:unknown): v is Visita {
 if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
 const x=v as Record<string,unknown>;
 return Object.keys(x).sort().join(',') === 'consenso,dispositivo,evento,fonte,pagina,sessione,visitatore' && x.consenso===true &&
 ['evento','visitatore','sessione'].every(k=>typeof x[k]==='string' && uuid.test(x[k] as string)) &&
 typeof x.pagina==='string' && Object.hasOwn(PAGINE,x.pagina) && FONTI.includes(x.fonte as Fonte) && ['telefono','tablet','computer'].includes(x.dispositivo as string);
}
export function provenienza(ref:string):Fonte {
 try { const h=new URL(ref).hostname.toLowerCase();
  if (/(^|\.)google\.(com|it|fr|de|es|co\.uk|ch|at|be|nl|pt)$/.test(h)) return 'google';
  if (h==='bing.com'||h.endsWith('.bing.com')) return 'bing';
  if (['facebook.com','instagram.com','t.co','x.com','linkedin.com','tiktok.com'].some(d=>h===d||h.endsWith('.'+d))) return 'social';
  if (h==='valmiro.it'||h==='www.valmiro.it') return 'diretto';
  return 'altro';
 } catch {return 'diretto';}
}
export function giornoRoma(d=new Date()):string {return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);}
export function spostaData(s:string,n:number):string {const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export type Identita = {visitatore:string; scade:number; sessione:string; ultimo:number; fonte:Fonte};
export function identitaVisita(prima:Identita|null,ora:number,fonte:Fonte,nuovo:()=>string):Identita {
 if (!prima || !uuid.test(prima.visitatore) || !uuid.test(prima.sessione) || !Number.isFinite(prima.scade) || prima.scade<=ora || prima.scade>ora+DURATA_VISITATORE || !Number.isFinite(prima.ultimo) || prima.ultimo>ora || !FONTI.includes(prima.fonte))
  return {visitatore:nuovo(),scade:ora+DURATA_VISITATORE,sessione:nuovo(),ultimo:ora,fonte};
 return {...prima,sessione:ora-prima.ultimo>=DURATA_SESSIONE?nuovo():prima.sessione,fonte:ora-prima.ultimo>=DURATA_SESSIONE?fonte:prima.fonte,ultimo:ora};
}
