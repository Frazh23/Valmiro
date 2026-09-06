import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { RADICE, ARCHIVIO, leggiFile, ruoloLotto, conversioneRiga } from './annunci.mjs';
import { impronta, metriche, relazione, verificaManifest, sha } from './verifica-lib.mjs';

const folder=join(ARCHIVIO,'congelamenti');
const current=impronta(RADICE);
if(process.argv.includes('--congela')) {
  const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:RADICE}).toString().trim();
  if(execFileSync('git',['status','--porcelain','--untracked-files=all'],{cwd:RADICE}).toString().trim()) throw new Error('Congelamento richiede un commit e un albero pulito');
  mkdirSync(folder,{recursive:true});
  const out=join(folder,`${current.hash}.json`);
  writeFileSync(out,JSON.stringify({versione:2,data:new Date().toISOString(),commit,...current},null,2)+'\n',{flag:'wx'});
  console.log(`Congelamento nuovo: ${out}. Conserva in git prima di raccogliere il campione. Il precedente resta intatto.`);
  process.exit(0);
}
const frozenPath=join(folder,`${current.hash}.json`);
if(!existsSync(frozenPath)) throw new Error('Nessun congelamento completo per il codice/dati attuali. Il vecchio parametri-congelati.json è storico e non sufficiente.');
const frozen=JSON.parse(readFileSync(frozenPath,'utf8'));
if(frozen.hash!==current.hash) throw new Error('Modello diverso dal congelamento');
const files=readdirSync(ARCHIVIO).filter(f=>f.endsWith('.csv')).sort();
const train=files.filter(f=>ruoloLotto(join(ARCHIVIO,f))==='taratura').flatMap(f=>leggiFile(join(ARCHIVIO,f)));
const validFiles=files.filter(f=>ruoloLotto(join(ARCHIVIO,f))==='verifica');
if(!validFiles.length) throw new Error('Validazione indipendente non ancora eseguita: nessun lotto.');
const revisioni = [];
const raw=validFiles.flatMap(f=>{
 const p=join(ARCHIVIO,f), m=JSON.parse(readFileSync(p.replace(/\.csv$/,'.meta.json'),'utf8'));
 verificaManifest(m,frozen,sha(readFileSync(p)));
 revisioni.push(...(m.revisioni || []));
 return leggiFile(p);
});
const build=join(RADICE,'.calibrazione/build');
execFileSync(join(RADICE,'node_modules/.bin/tsc'),['src/lib/engine.ts','src/lib/indirizzario.ts','--outDir',build,'--module','commonjs','--target','es2022','--moduleResolution','node','--resolveJsonModule','--esModuleInterop','--skipLibCheck'],{cwd:RADICE,stdio:'inherit'});
const req=createRequire(import.meta.url), engine=req(join(build,'src/lib/engine.js')), indir=req(join(build,'src/lib/indirizzario.js'));
const excluded=[], doubts=[], accepted=[], measured=[], missing=[];
for(const row of raw) {
 const duplicate=[...train,...accepted].find(x=>relazione(row,x)==='duplicato');
 if(duplicate) {excluded.push({...row,motivo:'duplicato',con:duplicate.id});continue;}
 const doubt=[...train,...accepted].find(x=>relazione(row,x)==='dubbio');
 if(doubt) {
  const review=revisioni.find(v=>v.lotto===row.lotto && v.id===row.id && v.conLotto===doubt.lotto && v.conId===doubt.id);
  if(review && ['distinti','escludi'].includes(review.esito) && review.motivo && review.fonte && review.revisore && Number.isFinite(Date.parse(review.data))) {
    if(review.esito==='escludi') {excluded.push({...row,motivo:'revisione: '+review.motivo,con:doubt.id});continue;}
  } else doubts.push({...row,con:doubt.id,conLotto:doubt.lotto});
 }
 accepted.push(row);
}
// Nessuna misura finché i dubbi non sono risolti, evitando di scegliere esclusioni guardando gli errori.
if(doubts.length) {
 console.table(doubts.map(r=>({id:r.id,lotto:r.lotto,con:r.con})));
 throw new Error('Possibili duplicati: revisione necessaria prima della misura. Conservare motivi e fonti delle esclusioni in un nuovo manifest.');
}
for(const row of accepted) {
 const fail=motivo=>excluded.push({...row,motivo});
 if(!Number.isFinite(Number(row.prezzo_richiesto)) || Number(row.prezzo_richiesto)<=0) {fail('prezzo richiesto non valido');continue;}
 if(row.prezzo_venduto && (!Number.isFinite(Number(row.prezzo_venduto)) || Number(row.prezzo_venduto)<=0)) {fail('prezzo venduto non valido');continue;}
 let zona=row.zona;
 if(!zona) {const res=indir.risolvi(row.indirizzo||'');zona=res.esito==='civico'?res.zona:res.esito==='via'?res.via.zona:null;}
 if(!zona) {fail('zona non risolta');continue;}
 const c=conversioneRiga(row,zona);
 if(c.errori.length) {fail(c.errori.join('; '));continue;}
 if(c.mancanti.length) missing.push({id:row.id,campi:c.mancanti});
 try {
  const s=engine.stima(c.input);
  if (![s.centro,s.pubblica,s.min,s.max].every(x=>Number.isFinite(x)&&x>0)) {fail("risultato non finito o non positivo");continue;}
  const sold=!!row.prezzo_venduto;
  // Intervallo del prezzo di pubblicazione: stessa convenzione moltiplicativa, non intervallo validato a priori.
  const factor=sold?1:1+engine.COEFF.margineTrattativa;
  measured.push({...row,zona,variabile:sold?'venduti':'richiesti',prezzo:Number(sold?row.prezzo_venduto:row.prezzo_richiesto),stimaRif:sold?s.centro:s.pubblica,min:s.min*factor,max:s.max*factor});
 } catch {fail('immobile non rappresentabile dal motore');}
}
const groups={};
for(const variable of ['richiesti','venduti']) {
 const rows=measured.filter(r=>r.variabile===variable);
 groups[variable]={totale:metriche(rows),fasce:{},stati:{},tipi:{}};
 for(const [key,fn] of [['fasce',r=>r.zona[0]],['stati',r=>r.stato||'non dichiarato'],['tipi',r=>r.tipo||'non dichiarato']])
  for(const value of new Set(rows.map(fn))) groups[variable][key][value]=metriche(rows.filter(r=>fn(r)===value));
}
const report={data:new Date().toISOString(),modello:frozen.hash,lotti:validFiles,grezzi:raw.length,misurati:measured.length,esclusi:excluded,ipotesi:missing,gruppi:groups,revisioni};
const out=join(RADICE,'docs/verifiche');mkdirSync(out,{recursive:true});
const name=report.data.replace(/[:.]/g,'-');
writeFileSync(join(out,`${name}.json`),JSON.stringify(report,null,2),{flag:'wx'});
const fmt=v=>v===undefined?'—':`${(v*100).toFixed(1)}%`;
let md=`# Verifica del ${report.data}\n\nModello: ${frozen.hash}; congelato ${frozen.data}; commit ${frozen.commit}.\nLotti: ${validFiles.join(', ')}. Grezzi ${raw.length}; misurati ${measured.length}; esclusi ${excluded.length}.\n\nI prezzi richiesti misurano le richieste dei venditori, non i prezzi delle compravendite. I gruppi con meno di 40 osservazioni sono indicativi.\n`;
for(const [variable,g] of Object.entries(groups)) {
 const ready=g.totale.n>=100 && ['B','C','D','E'].every(f=>(g.fasce[f]?.n||0)>=15);
 md+=`\n## ${variable}\nCopertura minima per pubblicazione: ${ready?'raggiunta':'NON raggiunta'}.\n\n| Gruppo | n | Scarto % | Errore assoluto mediano | log mediano | MAD log | ±10% | ±20% | Copertura |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|\n`;
 for(const [label,m] of [['Totale',g.totale],...Object.entries(g.fasce),...Object.entries(g.stati),...Object.entries(g.tipi)]) md+=`| ${label} | ${m.n} | ${fmt(m.scartoPercentuale)} | ${fmt(m.erroreAssolutoMediano)} | ${m.logMediano?.toFixed(4)??'—'} | ${m.madLog?.toFixed(4)??'—'} | ${fmt(m.entro10)} | ${fmt(m.entro20)} | ${fmt(m.copertura)} |\n`;
}
md+='\nScarto % = (stima − prezzo) / prezzo. Log = ln(prezzo / stima), in unità logaritmiche. Gli intervalli richiesti applicano il 6% convenzionale anche agli estremi; i venduti usano gli estremi del valore. Nessuna garanzia di copertura.\n\n## Esclusioni\n'+excluded.map(r=>`- ${r.lotto}/${r.id}: ${r.motivo}${r.con?' — '+r.con:''}`).join('\n')+'\n\n## Dati mancanti\n'+missing.map(r=>`- ${r.id}: ${r.campi.join('; ')}`).join('\n');
writeFileSync(join(out,`${name}.md`),md,{flag:'wx'});
console.log(md);
if(!measured.length) process.exitCode=1;
