import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
execFileSync(process.execPath,['node_modules/typescript/bin/tsc','src/lib/traffico.ts','src/lib/traffico-server.ts','--outDir','.calibrazione/test-traffico','--module','commonjs','--target','es2022','--skipLibCheck']);
const {validaVisita,identitaVisita,DURATA_VISITATORE,DURATA_SESSIONE,provenienza,giornoRoma,spostaData}=createRequire(import.meta.url)('../.calibrazione/test-traffico/traffico.js');
const id='11111111-1111-4111-8111-111111111111',altro='22222222-2222-4222-8222-222222222222';
test('visite: contratto chiuso, consenso e nessun URL privato',()=>{
 const v={evento:id,visitatore:id,sessione:id,pagina:'/',fonte:'diretto',dispositivo:'telefono',consenso:true};
 assert.ok(validaVisita(v));
 for(const pagina of ['/gestione','/account','/valuta?indirizzo=casa','/api/estimate','toString'])assert.equal(validaVisita({...v,pagina}),false);
 assert.equal(validaVisita({...v,consenso:false}),false);assert.equal(validaVisita({...v,email:'privata'}),false);assert.equal(validaVisita({...v,visitatore:'email'}),false);
});
test('visite: ritorni, inattività, scadenza assoluta e memoria corrotta',()=>{
 const ora=1000000000;const a=identitaVisita(null,ora,'google',()=>id);
 const b=identitaVisita(a,ora+1000,'social',()=>altro);assert.equal(b.visitatore,id);assert.equal(b.sessione,id);assert.equal(b.fonte,'google');assert.equal(b.scade,a.scade);
 const c=identitaVisita(b,b.ultimo+DURATA_SESSIONE,'social',()=>altro);assert.equal(c.sessione,altro);assert.equal(c.visitatore,id);assert.equal(c.fonte,'social');
 const d=identitaVisita(c,ora+DURATA_VISITATORE,'diretto',()=>altro);assert.equal(d.visitatore,altro);
 assert.equal(identitaVisita({},ora,'diretto',()=>id).visitatore,id);
});
test('visite: fonti ridotte a categorie e confini di data italiani',()=>{
 assert.equal(provenienza('https://www.google.it/search?q=privato'),'google');assert.equal(provenienza('https://google.it.evil.test/'),'altro');assert.equal(provenienza('https://www.valmiro.it/account'),'diretto');assert.equal(provenienza(''),'diretto');
 assert.equal(giornoRoma(new Date('2026-09-07T22:30:00Z')),'2026-09-08');assert.equal(giornoRoma(new Date('2026-01-07T22:30:00Z')),'2026-01-07');assert.equal(spostaData('2026-03-30',-1),'2026-03-29');
});

const {raccogliVisita}=createRequire(import.meta.url)('../.calibrazione/test-traffico/traffico-server.js');
test('endpoint: blocco senza consenso, origini, limiti e guasti indipendenti',async()=>{
 const cfg={attivo:'true',origine:'https://valmiro.it',url:'https://db.invalid',key:'solo-server'};
 const payload={evento:id,visitatore:id,sessione:id,pagina:'/',fonte:'diretto',dispositivo:'telefono',consenso:true};
 const req=(v=payload,origin=cfg.origine)=>new Request('https://valmiro.it/api/visite',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(v)});
 let calls=0;const invia=async(url,options)=>{calls++;assert.ok(url.endsWith('/rpc/registra_visita'));assert.equal(options.headers.Authorization,'Bearer solo-server');return new Response(null,{status:204});};
 assert.equal((await raccogliVisita(req(),{...cfg,attivo:'false'},invia)).status,204);
 assert.equal((await raccogliVisita(req(payload,'https://altro.it'),cfg,invia)).status,403);
 assert.equal((await raccogliVisita(req({...payload,consenso:false}),cfg,invia)).status,400);
 assert.equal((await raccogliVisita(req({...payload,extra:'x'.repeat(2000)}),cfg,invia)).status,413);
 assert.equal(calls,0);assert.equal((await raccogliVisita(req(),cfg,invia)).status,204);assert.equal(calls,1);
 const res=await raccogliVisita(req(),cfg,async()=>{throw new Error('segreto');});assert.equal(res.status,503);assert.equal(await res.text(),'');
});
