import { validaMisura } from '@/lib/telemetria-schema';
export const runtime='nodejs';
let finestra=0, ricevuti=0;
export async function POST(req:Request) {
 if(process.env.TELEMETRIA_ENABLED!=='true') return new Response(null,{status:204});
 const origin=process.env.APP_ORIGIN;
 if(!origin || req.headers.get('origin')!==origin) return new Response(null,{status:403});
 const now=Math.floor(Date.now()/60000);
 if(now!==finestra){finestra=now;ricevuti=0;}
 if(++ricevuti>120) return new Response(null,{status:429});
 if(!req.headers.get('content-type')?.startsWith('application/json')) return new Response(null,{status:415});
 // Limite anche per richieste chunked, senza affidarsi a Content-Length.
 const reader=req.body?.getReader(); if(!reader) return new Response(null,{status:400});
 let body='',size=0; const decoder=new TextDecoder();
 try { while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>256){await reader.cancel();return new Response(null,{status:413});}body+=decoder.decode(value,{stream:true});}body+=decoder.decode(); } catch {return new Response(null,{status:400});}
 let payload;try{payload=validaMisura(JSON.parse(body));}catch{return new Response(null,{status:400});}
 if(!payload) return new Response(null,{status:400});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key) return new Response(null,{status:204});
 const componente=payload.evento.startsWith('salvataggio')?'storage':payload.evento.startsWith('calcolo')?'estimate':payload.evento==='errore_ui'?'ui':'percorso';
 const versione=(process.env.VERCEL_GIT_COMMIT_SHA||process.env.APP_VERSION||'locale').replace(/[^a-zA-Z0-9.-]/g,'').slice(0,40);
 try {
 const response=await fetch(`${url}/rest/v1/rpc/registra_evento`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({p_evento:payload.evento,p_intento:payload.intento,p_formato:payload.formato,p_componente:componente,p_versione:versione}),signal:AbortSignal.timeout(1500)});
 if(!response.ok) console.warn('TELEMETRIA_NON_DISPONIBILE');
 }catch{console.warn('TELEMETRIA_NON_DISPONIBILE');}
 return new Response(null,{status:204});
}
