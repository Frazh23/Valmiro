import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
export const sha = s => createHash('sha256').update(s).digest('hex');
export function impronta(root) {
  const files = [];
  function walk(dir) { for (const e of readdirSync(dir, {withFileTypes:true})) {
    if (e.name === 'annunci') continue;
    const p = join(dir,e.name); if(e.isDirectory()) walk(p); else files.push(p);
  }}
  walk(join(root,'src/lib')); walk(join(root,'data'));
  files.push(join(root,'scripts/idealista.mjs'),join(root,'scripts/annunci.mjs'),join(root,'scripts/verifica-lib.mjs'),join(root,'scripts/verifica.mjs'));
  const contenuti = Object.fromEntries(files.sort().map(p=>[relative(root,p),sha(readFileSync(p))]));
  return {hash:sha(JSON.stringify(contenuti)), contenuti};
}
export const mediana = a => { if(!a.length) return null; const s=[...a].sort((a,b)=>a-b), m=s.length>>1; return s.length%2?s[m]:(s[m-1]+s[m])/2; };
export function metriche(rows) {
  if(!rows.length) return {n:0};
  const errors=rows.map(r=>(r.stimaRif-r.prezzo)/r.prezzo);
  const logs=rows.map(r=>Math.log(r.prezzo/r.stimaRif));
  const center=mediana(logs);
  return {n:rows.length, scartoPercentuale:mediana(errors), erroreAssolutoMediano:mediana(errors.map(Math.abs)),
    logMediano: center, madLog:mediana(logs.map(x=>Math.abs(x-center))),
    entro10: errors.filter(e=>Math.abs(e)<=.1+1e-12).length/rows.length,
    entro20: errors.filter(e=>Math.abs(e)<=.2+1e-12).length/rows.length,
    copertura:rows.filter(r=>r.prezzo>=r.min && r.prezzo<=r.max).length/rows.length};
}
const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\b(via|viale|piazza|piazzale|corso|largo)\b/g,'').replace(/[^a-z0-9]/g,'');
const delta=(a,b,k)=>Math.abs(Number(a[k])-Number(b[k]))/Math.max(Number(a[k]),Number(b[k]));
export function relazione(a,b) {
  if(a.rif && b.rif && a.fonte===b.fonte && a.rif===b.rif) return 'duplicato';
  if(!a.indirizzo || !b.indirizzo || norm(a.indirizzo)!==norm(b.indirizzo)) return null;
  if(delta(a,b,'mq')<=.03 && delta(a,b,'prezzo_richiesto')<=.02) return 'duplicato';
  if(delta(a,b,'mq')<=.1 || delta(a,b,'prezzo_richiesto')<=.1) return 'dubbio';
  return 'stabile';
}
export function verificaManifest(m, frozen, csvHash) {
  if(m.ruolo!=='verifica' || m.modelloHash!==frozen.hash || m.csvHash!==csvHash) throw new Error('Manifest lotto non coerente con modello/contenuto');
  const collected=Date.parse(m.raccoltaInizio), freeze=Date.parse(frozen.data);
  if(!Number.isFinite(collected) || collected<=freeze) throw new Error('Raccolta non successiva al congelamento');
  if(!m.fonte || !m.metodoRaccolta) throw new Error('Provenienza della raccolta non documentata');
}
