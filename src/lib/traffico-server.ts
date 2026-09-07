import {validaVisita} from './traffico';
type Config={attivo?:string;origine?:string;url?:string;key?:string};
export async function raccogliVisita(req:Request,config:Config,invia:typeof fetch=fetch){
 if(config.attivo!=='true')return new Response(null,{status:204});
 const origine=config.origine;
 if(!origine||req.headers.get('origin')!==origine)return new Response(null,{status:403});
 if(!req.headers.get('content-type')?.startsWith('application/json'))return new Response(null,{status:415});
 const reader=req.body?.getReader();if(!reader)return new Response(null,{status:400});
 let body='',size=0;const decoder=new TextDecoder();
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1024){await reader.cancel();return new Response(null,{status:413});}body+=decoder.decode(value,{stream:true});}body+=decoder.decode();}catch{return new Response(null,{status:400});}
 let v:unknown;try{v=JSON.parse(body);}catch{return new Response(null,{status:400});}
 if(!validaVisita(v))return new Response(null,{status:400});
 const url=config.url,key=config.key;
 if(!url||!key)return new Response(null,{status:503});
 try{const r=await invia(`${url}/rest/v1/rpc/registra_visita`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({p_evento:v.evento,p_visitatore:v.visitatore,p_sessione:v.sessione,p_pagina:v.pagina,p_fonte:v.fonte,p_dispositivo:v.dispositivo}),signal:AbortSignal.timeout(1500)});return new Response(null,{status:r.ok?204:503});}catch{return new Response(null,{status:503});}
}
