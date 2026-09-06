import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,mkdirSync,rmSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {caricaAnnunci,conversioneRiga,parseCsv} from '../scripts/annunci.mjs';
import {metriche,relazione,impronta,verificaManifest} from '../scripts/verifica-lib.mjs';
test('la taratura non legge verifica, nemmeno come file esplicito o manifest rinominato',()=>{
 const dir=mkdtempSync(join(tmpdir(),'valmiro-test-'));
 try {
  const text='id;indirizzo;mq;prezzo_richiesto\n1;Via A 1;50;200000\n';
  writeFileSync(join(dir,'base.csv'),text);writeFileSync(join(dir,'nuovo-verifica.csv'),text.replace('1;Via','2;Via'));
  writeFileSync(join(dir,'rinominato.csv'),text);writeFileSync(join(dir,'rinominato.meta.json'),JSON.stringify({ruolo:'verifica'}));
  assert.equal(caricaAnnunci(dir).annunci.length,1);
  assert.throws(()=>caricaAnnunci(join(dir,'nuovo-verifica.csv')),/non ammesso/);
  assert.throws(()=>caricaAnnunci(join(dir,'rinominato.csv')),/non ammesso/);
 } finally {rmSync(dir,{recursive:true});}
});
test('percentuali ordinarie, log distinti, soglie simmetriche e campione vuoto',()=>{
 const rows=[{prezzo:100,stimaRif:90,min:85,max:100},{prezzo:100,stimaRif:110,min:105,max:120}];
 const m=metriche(rows);assert.equal(m.entro10,1);assert.equal(m.erroreAssolutoMediano,.1);assert.equal(m.scartoPercentuale,0);assert.equal(m.copertura,.5);
 assert.ok(m.logMediano>0);assert.deepEqual(metriche([]),{n:0});
 assert.equal(metriche([{prezzo:100,stimaRif:80,min:0,max:200}]).entro20,1);
});
test('deduplica per portale, somiglianza e dubbio',()=>{
 const a={fonte:'idealista',rif:'42',indirizzo:'Via Roma 1',mq:100,prezzo_richiesto:500000};
 assert.equal(relazione(a,{...a,prezzo_richiesto:400000}),'duplicato');
 assert.equal(relazione(a,{...a,fonte:'altro',rif:'99',mq:102}),'duplicato');
 assert.equal(relazione(a,{...a,rif:'99',prezzo_richiesto:450000}),'dubbio');
 assert.equal(relazione(a,{...a,rif:'99',mq:200,prezzo_richiesto:900000}),'stabile');
});
test('congelamento cambia per codice, conversione e dati, non solo coefficienti',()=>{
 const dir=mkdtempSync(join(tmpdir(),'valmiro-freeze-'));
 try {
  for(const path of ['src/lib','data','scripts'])mkdirSync(join(dir,path),{recursive:true});
  for(const f of ['annunci','verifica','verifica-lib','idealista'])writeFileSync(join(dir,`scripts/${f}.mjs`),'a');
  writeFileSync(join(dir,'src/lib/engine.ts'),'a');writeFileSync(join(dir,'data/omi.json'),'{}');
  let prev=impronta(dir).hash;
  for(const f of ['src/lib/engine.ts','data/omi.json','scripts/annunci.mjs']) {writeFileSync(join(dir,f),'changed');const next=impronta(dir).hash;assert.notEqual(next,prev);prev=next;}
 } finally {rmSync(dir,{recursive:true});}
});
test('manifest impedisce retrodatazione o sostituzione campione',()=>{
 const f={hash:'a',data:'2026-09-07T10:00:00Z'},m={ruolo:'verifica',modelloHash:'a',csvHash:'b',raccoltaInizio:'2026-09-08',fonte:'API',metodoRaccolta:'API autorizzata'};
 assert.doesNotThrow(()=>verificaManifest(m,f,'b'));
 assert.throws(()=>verificaManifest({...m,raccoltaInizio:'2026-09-06'},f,'b'));
 assert.throws(()=>verificaManifest(m,f,'c'));
});
test('conversione: classe nd, nessun metro inventato, box documentato, piani non rappresentabili',()=>{
 const row={mq:'80',balconi:'2',box:'box'};
 const c=conversioneRiga(row,'D10');assert.equal(c.input.classe,'nd');assert.equal(c.input.mqBalconi,0);assert.equal(c.input.box,'nessuno');assert.ok(c.mancanti.length);
 assert.equal(conversioneRiga({...row,box_incluso:'si'},'D10').input.box,'box');
 assert.ok(conversioneRiga({...row,piano:'seminterrato'},'D10').errori.length);
 assert.ok(conversioneRiga({...row,mq_balconi:'-1'},'D10').errori.length);
 assert.deepEqual(parseCsv('id;note\n1;"a;b\nc"'),[{id:'1',note:'a;b\nc'}]);
});
