import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
const root=join(dirname(fileURLToPath(import.meta.url)),'..'),build=join(root,'.calibrazione/test-v2');
execFileSync(join(root,'node_modules/.bin/tsc'),['src/lib/engine.ts','src/lib/modulo.ts','src/lib/annuncio.ts','src/lib/telemetria-schema.ts','--outDir',build,'--module','commonjs','--target','es2022','--moduleResolution','node','--resolveJsonModule','--esModuleInterop','--skipLibCheck'],{cwd:root});
const req=createRequire(import.meta.url), get=f=>req(join(build,'src/lib',f+'.js'));
const {stima}=get('engine'),{applicaLettura,INPUT_INIZIALE}=get('modulo'),{leggiAnnuncio}=get('annuncio'),{modificaUtente}=get('provenienza'),{validaMisura}=get('telemetria-schema');
const partial=()=>({...applicaLettura(INPUT_INIZIALE,leggiAnnuncio('Via Carlo Farini 81, Milano. 55 mq. Prezzo 265.000 euro.'),'nuovo').input,zona:'C15'});
test('v2: nessun blocco, stessi numeri e sigma, ipotesi accanto al risultato',()=>{
 const i=partial(),s=stima(i),old=stima({...i,provenienza:undefined,versioneProvenienza:undefined});
 assert.equal(s.centro,old.centro);assert.equal(s.sigma,old.sigma);assert.equal(s.ipotesi,undefined);
 assert.ok(s.ipotesiUsate.some(x=>x.includes('ascensore')));assert.ok(!s.ipotesiUsate.some(x=>x.startsWith('superficie:')));
 const j=modificaUtente(i,{ascensore:false});assert.equal(j.provenienza.ascensore,'utente');assert.ok(!stima(j).ipotesiUsate.some(x=>x.startsWith('ascensore:')));
});
test('provenienza aggiornamento, nuovo immobile e serializzazione',()=>{
 let i=modificaUtente(partial(),{stato:'otti',mqBalconi:10});
 i=applicaLettura(i,leggiAnnuncio('Prezzo 250.000 euro.'),'aggiorna').input;
 assert.equal(i.provenienza.stato,'utente');assert.equal(i.provenienza.mqBalconi,'utente');
 const saved=JSON.parse(JSON.stringify({input:i,stima:stima(i)}));assert.deepEqual(saved.input.provenienza,i.provenienza);assert.deepEqual(saved.stima.ipotesiUsate,stima(i).ipotesiUsate);
 i=applicaLettura(i,leggiAnnuncio('70 mq, prezzo 400.000 euro'),'nuovo').input;
 assert.equal(i.provenienza.stato,'ipotesi');assert.equal(i.mqBalconi,0);
});
test('legacy senza provenienza non inventa una origine; seminterrato ancora esplicito',()=>{
 const i={...partial(),versioneProvenienza:undefined,provenienza:undefined};assert.equal(stima(i).origineDatiRegistrata,false);
 assert.throws(()=>stima({...partial(),pianoDichiarato:'seminterrato'}));
 assert.ok(stima({...partial(),pianoDichiarato:'seminterrato',simulazionePiano:true}).simulazione);
});
test('telemetria rifiuta dati personali e campi extra, anche con evento valido',()=>{
 const x={evento:'calcolo_ok',intento:'compro',formato:'mobile'};assert.deepEqual(validaMisura(x),x);
 for(const key of ['indirizzo','testoAnnuncio','email','utente','ip','stack','versione'])assert.equal(validaMisura({...x,[key]:'dato'}),null);
 assert.equal(validaMisura({...x,evento:'arbitrario'}),null);assert.equal(validaMisura([]),null);
});
