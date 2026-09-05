import test from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/* Motore e confronto compilati al volo: i test girano sul codice vero, con i dati OMI veri. */
const RADICE = join(dirname(fileURLToPath(import.meta.url)), "..");
const BUILD = join(RADICE, ".calibrazione/build-test");
execSync(`npx tsc src/lib/confronto.ts src/lib/engine.ts --outDir ${BUILD}/confronto --module commonjs --target es2022 --moduleResolution node --resolveJsonModule --esModuleInterop --skipLibCheck`, { cwd: RADICE, stdio: "inherit" });
const req = createRequire(import.meta.url);
const { confronto, giudizio } = req(join(BUILD, "confronto/src/lib/confronto.js"));
const M = req(join(BUILD, "confronto/src/lib/engine.js"));

/* Il caso segnalato: Porro Lambertenghi 25 (zona D10 nei test), 60 mq da ristrutturare, senza ascensore,
   box venduto a parte senza prezzo, prezzo richiesto 300.000 per la sola abitazione. Il piano
   vero e' il seminterrato: qui si usa la simulazione, che e' l'unico modo di avere un numero. */
const CASA = {
  zona: "D10", tipo: "civ", mq: 60, superficie: "commerciale", pertinenzeIncluse: true, stato: "rist",
  piano: "terra", pianoDichiarato: "seminterrato", simulazionePiano: true, ascensore: false, classe: "nd",
  cantina: false, box: "box", boxSeparato: { prezzo: null, incluso: true }, prezzoRichiesto: 300000,
  epoca: null, affaccio: null, metro: null,
};
/* lo stesso caso al piano terra vero, per giudicare senza la sospensione della simulazione */
const CASA_TERRA = { ...CASA, pianoDichiarato: null, simulazionePiano: false };

test("il motore separa il valore del box da quello dell'abitazione, con la stessa incertezza", () => {
  const s = M.stima(CASA_TERRA);
  assert.ok(s.valoreBox > 0);
  assert.equal(s.abitazione.centro + Math.round(s.valoreBox / 1000) * 1000, s.centro, "abitazione + box = totale, a meno dell'arrotondamento al migliaio");
  const senza = M.stima({ ...CASA_TERRA, box: "nessuno", boxSeparato: null });
  assert.equal(senza.centro, s.abitazione.centro, "l'abitazione da sola vale come la stessa casa senza box");
  assert.equal(senza.valoreBox, 0);
  assert.deepEqual(senza.abitazione, { centro: senza.centro, min: senza.min, max: senza.max, pubblica: senza.pubblica });
});

test("box a parte senza prezzo: il confronto e' sulla sola abitazione, il totale non e' disponibile", () => {
  const s = M.stima(CASA_TERRA);
  const c = confronto(CASA_TERRA, s);
  assert.equal(c.principale.nome, "abitazione");
  assert.equal(c.principale.richiesto, 300000);
  assert.equal(c.principale.valore.centro, s.abitazione.centro, "300.000 si confronta con l'abitazione, non con abitazione + box");
  assert.equal(c.box.richiesto, null, "il valore stimato del box non fa da prezzo richiesto");
  assert.equal(c.box.valore.centro, s.valoreBox);
  assert.equal(c.totale, undefined);
  assert.equal(c.totaleNonDisponibile, true);
  assert.match(c.nota, /sola abitazione/);
  const scartoSbagliato = 300000 / s.centro - 1;
  assert.ok(Math.abs(c.principale.scarto - scartoSbagliato) > 0.05, "lo scarto non e' quello contro il totale con il box");
  const g = giudizio(c, s.sigma);
  assert.ok(g, "sull'abitazione il giudizio c'e'");
});

test("box a parte con il prezzo: abitazione, box e totale confrontati ciascuno con il proprio valore", () => {
  const i = { ...CASA_TERRA, boxSeparato: { prezzo: 40000, incluso: true } };
  const s = M.stima(i);
  const c = confronto(i, s);
  assert.equal(c.principale.richiesto, 300000);
  assert.equal(c.box.richiesto, 40000);
  assert.equal(c.totale.richiesto, 340000);
  assert.equal(c.totale.valore.centro, s.centro);
  assert.equal(c.totaleNonDisponibile, false);
});

test("box a parte non incluso: si valuta e si confronta la sola abitazione, e lo si dice", () => {
  const i = { ...CASA_TERRA, box: "nessuno", boxSeparato: { prezzo: null, incluso: false } };
  const s = M.stima(i);
  const c = confronto(i, s);
  assert.equal(c.principale.nome, "totale");
  assert.equal(c.principale.valore.centro, s.centro);
  assert.equal(c.box, undefined);
  assert.match(c.nota, /non è nella valutazione/);
});

test("piano seminterrato senza simulazione: il motore non da' una valutazione, e lo dice", () => {
  assert.throws(() => M.stima({ ...CASA, simulazionePiano: false }), /non è disponibile una valutazione attendibile/);
  assert.throws(() => M.stima({ ...CASA, simulazionePiano: undefined }), /seminterrato/);
});

test("con la simulazione richiesta: stesso numero del piano terra, ma dichiarato come simulazione e senza giudizio sul prezzo", () => {
  const sim = M.stima(CASA);
  const terra = M.stima(CASA_TERRA);
  assert.equal(sim.centro, terra.centro, "la simulazione ipotizza il piano terra: il numero e' quello");
  assert.equal(sim.simulazione.pianoDichiarato, "seminterrato");
  assert.equal(sim.simulazione.pianoIpotizzato, "terra");
  assert.match(sim.simulazione.testo, /non è un tetto/);
  assert.equal(terra.simulazione, undefined);
  assert.ok(sim.dettaglio.some((v) => /ipotesi della simulazione.*seminterrato/.test(v.voce)), "il dettaglio dice che il piano terra e' un'ipotesi");
  const c = confronto(CASA, sim);
  assert.equal(c.giudizioSospeso, true);
  assert.equal(giudizio(c, sim.sigma), null, "nessun «caro» o «conveniente» su una simulazione");
});
