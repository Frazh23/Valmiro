import test from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/* Motore e catalogo compilati al volo, come per la calibrazione: i test girano sul codice vero. */
const RADICE = join(dirname(fileURLToPath(import.meta.url)), "..");
const BUILD = join(RADICE, ".calibrazione/build-test");
execSync(`npx tsc src/lib/ristrutturazione.ts --outDir ${BUILD} --module commonjs --target es2022 --moduleResolution node --resolveJsonModule --esModuleInterop --skipLibCheck`, { cwd: RADICE, stdio: "inherit" });
const req = createRequire(import.meta.url);
const R = req(join(BUILD, "src/lib/ristrutturazione.js"));
const M = req(join(BUILD, "src/lib/engine.js"));

const CASA = { zona: "C18", tipo: "civ", mq: 85, superficie: "commerciale", pertinenzeIncluse: true, stato: "rist", piano: "1-2", ascensore: true, classe: "D", cantina: false, box: "nessuno", epoca: null, affaccio: null, metro: null };

test("la stessa casa vale lo stesso per chi compra e per chi vende", () => {
  const a = M.stima({ ...CASA, intento: "compro" }), b = M.stima({ ...CASA, intento: "vendo" });
  assert.equal(a.centro, b.centro);
  assert.equal(a.min, b.min);
  assert.deepEqual(a.dettaglio, b.dettaglio);
});

test("balconi e terrazzi contano insieme al 30% fino a 25 mq e al 10% oltre (DPR 138/98)", () => {
  assert.equal(Math.round(M.pertinenzePonderate(6, 0) * 100) / 100, 1.8);
  assert.equal(Math.round(M.pertinenzePonderate(6, 30) * 100) / 100, 8.6);
  assert.equal(M.pertinenzePonderate(-5, 0), 0, "un valore negativo non toglie metri");
});

test("pertinenze gia' comprese nella commerciale non si contano due volte; con la calpestabile si aggiungono", () => {
  const inclusa = M.superficie({ ...CASA, mqBalconi: 6, mqTerrazzi: 30, cantina: true });
  assert.equal(inclusa.totale, 85);
  const nonInclusa = M.superficie({ ...CASA, pertinenzeIncluse: false, mqBalconi: 6, mqTerrazzi: 30, cantina: true });
  assert.equal(Math.round(nonInclusa.totale * 10) / 10, 85 + 8.6 + 2.5);
  const calp = M.superficie({ ...CASA, superficie: "calpestabile", mqBalconi: 6 });
  assert.equal(Math.round(calp.principale * 10) / 10, 95.2);
  assert.equal(Math.round(calp.totale * 10) / 10, 95.2 + 1.8);
  const s = M.stima({ ...CASA, pertinenzeIncluse: false, mqBalconi: 6, mqTerrazzi: 30 });
  assert.ok(s.dettaglio.some((v) => /Balconi e terrazzi/.test(v.voce) && v.euro > 0), "il dettaglio mostra il contributo");
});

test("il pacchetto Completa porta a «come nuova»; senza un lavoro necessario no", () => {
  const pieno = R.prospettoRistrutturazione(CASA, "completa", true);
  assert.equal(pieno.statoAtteso, "nuov");
  assert.deepEqual(pieno.mancanti, []);
  const senzaIdraulico = R.prospettoRistrutturazione(CASA, "completa", true, { idraulico: { modo: "escluso" } });
  assert.equal(senzaIdraulico.statoAtteso, "rist", "senza impianti la casa resta da ristrutturare");
  assert.ok(senzaIdraulico.mancanti.includes("Impianto idraulico e bagni"));
  assert.ok(senzaIdraulico.costo < pieno.costo);
  assert.equal(senzaIdraulico.valoreDopo, pieno.valorePrima, "spendere meno non da' lo stesso valore");
  const senzaPorte = R.prospettoRistrutturazione(CASA, "completa", true, { porte: { modo: "escluso" } });
  assert.equal(senzaPorte.statoAtteso, "otti");
});

test("infissi gia' fatti: la spesa scende, lo stato atteso resta, e lo si dice", () => {
  const pieno = R.prospettoRistrutturazione(CASA, "completa", true);
  const fatti = R.prospettoRistrutturazione(CASA, "completa", true, { infissi: { modo: "fatto" } });
  assert.equal(fatti.statoAtteso, "nuov");
  assert.ok(fatti.costo < pieno.costo);
  assert.equal(fatti.voci.find((v) => v.id === "infissi").imponibile, 0);
  assert.ok(fatti.giaFatto > 0);
  assert.ok(fatti.nonQuantificato.some((t) => /già fatti/.test(t)));
  assert.ok(fatti.detrazione <= pieno.detrazione);
});

test("un preventivo sostituisce la stima: IVA scorporata se compresa, posa aggiunta se solo materiali", () => {
  const pieno = R.prospettoRistrutturazione(CASA, "completa", true);
  const stimato = pieno.voci.find((v) => v.id === "infissi").stimato;
  const conIva = R.prospettoRistrutturazione(CASA, "completa", true, { infissi: { modo: "preventivo", preventivo: 4400, ivaInclusa: true } });
  assert.equal(Math.round(conIva.voci.find((v) => v.id === "infissi").imponibile), 4000);
  const materiali = R.prospettoRistrutturazione(CASA, "completa", true, { infissi: { modo: "preventivo", preventivo: 3000 } });
  const soloMat = R.prospettoRistrutturazione(CASA, "completa", true, { infissi: { modo: "preventivo", preventivo: 3000, soloMateriali: true } });
  assert.equal(Math.round(soloMat.voci.find((v) => v.id === "infissi").imponibile), Math.round(3000 + stimato * 0.5));
  assert.equal(materiali.valoreDopo, pieno.valoreDopo, "il preventivo cambia la spesa, non il valore");
  assert.ok(materiali.costo < pieno.costo);
});

test("ripristinare il pacchetto riporta al prospetto pieno; al cambio restano solo «fatto» ed «escluso»", () => {
  const pieno = R.prospettoRistrutturazione(CASA, "completa", true);
  const ripristinato = R.prospettoRistrutturazione(CASA, "completa", true, {});
  assert.deepEqual(ripristinato, pieno);
  const tenute = R.scelteAlCambioPacchetto({ infissi: { modo: "fatto" }, porte: { modo: "escluso" }, pavimenti: { modo: "preventivo", preventivo: 5000 } });
  assert.deepEqual(Object.keys(tenute).sort(), ["infissi", "porte"]);
});

test("la detrazione segue la spesa e si divide in dieci rate; il costo si paga tutto subito", () => {
  const p = R.prospettoRistrutturazione(CASA, "completa", true);
  assert.equal(p.rate, 10);
  assert.equal(Math.round(p.rataAnnua * 10), Math.round(p.detrazione));
  assert.equal(Math.round(p.costoNetto), Math.round(p.costo - p.detrazione));
  const altri = R.prospettoRistrutturazione(CASA, "completa", false);
  assert.ok(altri.detrazione < p.detrazione);
});

test("un preventivo vuoto o negativo non e' un lavoro gratis: errore, fuori dal conto e dallo stato atteso", () => {
  const pieno = R.prospettoRistrutturazione(CASA, "completa", true);
  for (const preventivo of [undefined, 0, -2000]) {
    const p = R.prospettoRistrutturazione(CASA, "completa", true, { infissi: { modo: "preventivo", preventivo } });
    const v = p.voci.find((x) => x.id === "infissi");
    assert.ok(v.errore, `preventivo ${preventivo}: serve un errore`);
    assert.equal(v.imponibile, 0);
    assert.ok(p.errori.length === 1 && /Infissi/.test(p.errori[0]));
    assert.equal(p.statoAtteso, "otti", "senza infissi validi la casa non arriva a «come nuova»");
    assert.ok(p.mancanti.includes("Infissi"));
    assert.ok(p.costo < pieno.costo);
  }
  const ok = R.prospettoRistrutturazione(CASA, "completa", true, { infissi: { modo: "preventivo", preventivo: 5000 } });
  assert.deepEqual(ok.errori, []);
  assert.equal(ok.statoAtteso, "nuov");
});

test("classe energetica sconosciuta: nessun aggiustamento, dichiarato nel dettaglio, non una D mascherata", () => {
  const nd = M.stima({ ...CASA, classe: "nd" });
  const d = M.stima({ ...CASA, classe: "D" });
  assert.equal(nd.centro, d.centro, "il coefficiente di D e' 1, quindi il numero coincide");
  assert.ok(nd.dettaglio.some((v) => /non dichiarata/.test(v.voce) && v.nota), "ma il dettaglio lo dice");
  assert.ok(!d.dettaglio.some((v) => /non dichiarata/.test(v.voce)));
});

test("il dettaglio separa la base in stato normale dal contributo dello stato conservativo", () => {
  const otti = M.stima({ ...CASA, stato: "otti" });
  const base = otti.dettaglio[0], stato = otti.dettaglio.find((v) => /Stato conservativo: ottimo/.test(v.voce));
  assert.ok(/stato normale/.test(base.voce));
  assert.ok(stato && stato.euro > 0 && stato.effetto > 0);
  const abit = M.stima({ ...CASA, stato: "abit" });
  assert.ok(!abit.dettaglio.some((v) => /Stato conservativo/.test(v.voce)), "in stato normale la riga non c'e': non aggiunge niente");
  assert.ok(Math.abs(base.euro + stato.euro - otti.baseOmi * CASA.mq) < 1, "base normale piu' stato fanno la base OMI dello stato dichiarato, per i metri principali");
});
