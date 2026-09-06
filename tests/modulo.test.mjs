import test from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/* Il modulo della casa e il lettore, compilati al volo: i test girano sul codice vero. */
const RADICE = join(dirname(fileURLToPath(import.meta.url)), "..");
const BUILD = join(RADICE, ".calibrazione/build-test");
execSync(`npx tsc src/lib/modulo.ts src/lib/annuncio.ts --outDir ${BUILD}/modulo --module commonjs --target es2022 --moduleResolution node --skipLibCheck`, { cwd: RADICE, stdio: "inherit" });
const req = createRequire(import.meta.url);
const { applicaLettura, INPUT_INIZIALE, differenze } = req(join(BUILD, "modulo/modulo.js"));
const { leggiAnnuncio } = req(join(BUILD, "modulo/annuncio.js"));

const PRIMO = "Appartamento in vendita in Via Luigi Porro Lambertenghi 25, Milano. Prezzo 300.000 euro. Superficie 60 mq. Piano seminterrato, senza ascensore. Non ristrutturato: impianti e finiture da rifare. Classe energetica non disponibile. Senza balcone, senza terrazzo, senza cantina. Box acquistabile separatamente, prezzo su richiesta.";
const SECONDO = "Appartamento in vendita in Via Carlo Farini 81, Milano. Superficie commerciale 55 mq. Prezzo 265.000 euro.";

/** Il modulo dopo il primo annuncio, con il box incluso da chi legge: e' il caso segnalato. */
function primoImmobile() {
  const a = applicaLettura({ ...INPUT_INIZIALE, intento: "compro" }, leggiAnnuncio(PRIMO), "nuovo");
  /* come farebbe la pagina: includere il box e' una scelta di chi legge, e la provenienza lo dice */
  const i = { ...a.input, zona: "D10", box: "box", boxSeparato: { ...a.input.boxSeparato, incluso: true }, provenienza: { ...a.input.provenienza, box: "utente" } };
  assert.equal(i.stato, "rist");
  assert.equal(i.pianoDichiarato, "seminterrato");
  assert.equal(i.ascensore, false);
  assert.equal(i.classe, "nd");
  return i;
}

test("un nuovo immobile non eredita niente dal precedente: piano, stato, box e prezzi accessori ripartono da zero", () => {
  const prima = primoImmobile();
  const a = applicaLettura(prima, leggiAnnuncio(SECONDO), "nuovo");
  const i = a.input;
  assert.equal(i.mq, 55);
  assert.equal(i.prezzoRichiesto, 265000);
  assert.equal(i.intento, "compro", "l'intento e' di chi legge, non della casa: resta");
  assert.equal(i.zona, "", "l'indirizzo si risolve di nuovo dal testo, non si eredita");
  assert.equal(i.stato, INPUT_INIZIALE.stato, "lo stato non e' dichiarato: predefinito, non «da ristrutturare» ereditato");
  assert.equal(i.piano, INPUT_INIZIALE.piano);
  assert.equal(i.pianoDichiarato, null, "il seminterrato del primo annuncio non passa al secondo");
  assert.equal(i.simulazionePiano, false);
  assert.equal(i.ascensore, true);
  assert.equal(i.classe, "nd");
  assert.equal(i.box, "nessuno", "il box incluso a mano sul primo immobile non passa al secondo");
  assert.equal(i.boxSeparato, null);
  assert.equal(i.cantina, false);
  assert.deepEqual(a.avvisi, [], "gli avvisi del primo annuncio non restano appesi");
  assert.deepEqual(a.modifiche, []);
});

test("cio' che il nuovo annuncio non dichiara e' segnato da confermare, campo per campo", () => {
  const a = applicaLettura(primoImmobile(), leggiAnnuncio(SECONDO), "nuovo");
  assert.deepEqual(a.daConfermare.sort(), ["ascensore", "box", "classe", "pertinenze", "piano", "stato"]);
  const b = applicaLettura(INPUT_INIZIALE, leggiAnnuncio(PRIMO), "nuovo");
  assert.deepEqual(b.daConfermare, [], "il primo annuncio dichiara tutto, anche le assenze");
});

test("aggiornare lo stesso immobile cambia solo cio' che il testo dichiara, e lo elenca", () => {
  const prima = primoImmobile();
  const a = applicaLettura(prima, leggiAnnuncio("Ribassato: ora 280.000 euro. Superficie 62 mq."), "aggiorna");
  const i = a.input;
  assert.equal(i.mq, 62);
  assert.equal(i.prezzoRichiesto, 280000);
  assert.equal(i.stato, "rist", "non dichiarato nel nuovo testo: resta");
  assert.equal(i.pianoDichiarato, "seminterrato");
  assert.equal(i.ascensore, false);
  assert.equal(i.box, "box");
  assert.deepEqual(i.boxSeparato, { prezzo: null, incluso: true }, "il box incluso resta incluso");
  assert.equal(i.zona, "D10");
  assert.deepEqual(a.daConfermare, []);
  assert.deepEqual(a.modifiche, ["superficie: 60 mq → 62 mq", "prezzo: 300.000 € → 280.000 €"]);
});

test("aggiornamento senza cambiamenti: il modulo resta com'era e l'elenco e' vuoto", () => {
  const prima = primoImmobile();
  const a = applicaLettura(prima, leggiAnnuncio(PRIMO), "aggiorna");
  assert.deepEqual(a.modifiche, []);
  assert.deepEqual(a.input, prima, "il box incluso da chi legge resta incluso: il testo lo offre ancora a parte");
});

test("due immobili diversi allo stesso indirizzo restano due immobili: l'indirizzo non decide", () => {
  const prima = primoImmobile();
  const stessoCivico = "Trilocale in Via Luigi Porro Lambertenghi 25, Milano, 95 mq, 4° piano con ascensore, ristrutturato, classe B, terrazzo 12 mq. € 640.000.";
  const nuovo = applicaLettura(prima, leggiAnnuncio(stessoCivico), "nuovo").input;
  assert.equal(nuovo.mq, 95);
  assert.equal(nuovo.stato, "otti");
  assert.equal(nuovo.piano, "3-5");
  assert.equal(nuovo.pianoDichiarato, null);
  assert.equal(nuovo.boxSeparato, null, "il box a parte della prima casa non c'e' nella seconda");
  assert.equal(nuovo.box, "nessuno");
  const aggiornato = applicaLettura(prima, leggiAnnuncio(stessoCivico), "aggiorna").input;
  assert.equal(aggiornato.box, "box", "in aggiornamento il box resta: il testo non ne parla");
  assert.ok(differenze(prima, aggiornato).some((m) => m.startsWith("piano: seminterrato → 3-5")));
});

test("cio' che il testo non dice resta al predefinito, ed e' elencato: nessuna conferma da spuntare", () => {
  const a = applicaLettura({ ...INPUT_INIZIALE, intento: "compro" }, leggiAnnuncio(SECONDO), "nuovo");
  assert.equal(a.input.provenienza.stato, "ipotesi");
  assert.equal(a.input.provenienza.mq, "annuncio");
  assert.equal(a.input.versioneProvenienza, 2);
  assert.equal(a.input.simulazioneDati, undefined);
  assert.ok(a.daConfermare.includes("stato"), "lo stato non era nel testo: si dice");
  assert.ok(a.daConfermare.includes("piano"));
  assert.ok(a.daConfermare.includes("ascensore"));
  assert.ok(!a.daConfermare.includes("mq"), "i metri c'erano: non si chiede di controllarli");
  const b = applicaLettura(INPUT_INIZIALE, leggiAnnuncio(PRIMO), "nuovo");
  assert.deepEqual(b.daConfermare, [], "un annuncio completo non lascia niente da controllare");
  /* un nuovo immobile riparte dai predefiniti, qualunque cosa ci fosse prima */
  const c = applicaLettura({ ...b.input, stato: "nuov" }, leggiAnnuncio(SECONDO), "nuovo");
  assert.equal(c.input.stato, INPUT_INIZIALE.stato, "lo stato della casa precedente non passa a questa");
  /* in aggiornamento cambia solo cio' che il testo dichiara */
  const d = applicaLettura(a.input, leggiAnnuncio("Ribassato: ora 250.000 euro, 3° piano con ascensore."), "aggiorna");
  assert.equal(d.input.piano, "3-5");
  assert.equal(d.input.ascensore, true);
  assert.equal(d.input.stato, a.input.stato, "lo stato non era nel testo: resta com'era");
  assert.deepEqual(d.daConfermare, [], "in aggiornamento non si riparte da zero: niente elenco");
});
