import test from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/* Il lettore e' TypeScript: lo si compila al volo nella cartella ignorata da
   git, come fa la calibrazione, cosi' il test gira sul codice vero. */
const RADICE = join(dirname(fileURLToPath(import.meta.url)), "..");
const BUILD = join(RADICE, ".calibrazione/build-test");
execSync(`npx tsc src/lib/annuncio.ts --outDir ${BUILD} --module commonjs --target es2022 --moduleResolution node --skipLibCheck`, { cwd: RADICE, stdio: "inherit" });
const { leggiAnnuncio } = createRequire(import.meta.url)(join(BUILD, "annuncio.js"));

test("un annuncio tipico da portale", () => {
  const r = leggiAnnuncio(`Trilocale via Savona 35, Milano
  € 450.000 · 85 m² · 3 locali · 2° piano con ascensore
  Stato: buono / abitabile · Classe energetica: D · Balcone · Cantina
  Spese condominiali € 1.800/anno. Riscaldamento centralizzato.`);
  assert.equal(r.indirizzo, "via Savona 35");
  assert.equal(r.mq, 85);
  assert.equal(r.piano, "1-2");
  assert.equal(r.ascensore, true);
  assert.equal(r.stato, "abit");
  assert.equal(r.classe, "D");
  assert.equal(r.balconi, 1);
  assert.equal(r.mqBalconi, undefined, "un balcone senza metri non ha metri");
  assert.equal(r.cantina, true);
  assert.equal(r.prezzo, 450000);
});

test("balcone e terrazzo con i metri dichiarati, e la casa non e' il terrazzo", () => {
  const r = leggiAnnuncio("Quadrilocale di 110 mq con terrazzo di 30 mq e due balconi (8 m² totali), via Vigevano 8. € 890.000");
  assert.equal(r.mq, 110);
  assert.equal(r.mqTerrazzi, 30);
  assert.equal(r.balconi, 2);
  assert.equal(r.mqBalconi, 8);
  assert.equal(r.terrazzo, true);
});

test("il terrazzo grande non viene preso per la superficie della casa", () => {
  const r = leggiAnnuncio("Attico 60 mq, terrazzo 70 mq, ultimo piano, € 520.000");
  assert.equal(r.mq, 60);
  assert.equal(r.mqTerrazzi, 70);
});

test("attico ristrutturato, prezzo scritto senza punti, classe A4", () => {
  const r = leggiAnnuncio("Attico finemente ristrutturato in Corso di Porta Romana, 120 mq, terrazzo 30 mq, classe A4, box doppio. Prezzo 1250000 euro.");
  assert.equal(r.indirizzo, "Corso di Porta Romana");
  assert.equal(r.mq, 120);
  assert.equal(r.mqTerrazzi, 30);
  assert.equal(r.piano, "ultimo");
  assert.equal(r.stato, "otti");
  assert.equal(r.classe, "A");
  assert.equal(r.box, "box");
  assert.equal(r.prezzo, 1250000);
});

test("da ristrutturare, senza ascensore, piano alto", () => {
  const r = leggiAnnuncio("Bilocale da ristrutturare al 4° piano senza ascensore, 48 mq, piazzale Lagosta 6. Richiesta 260.000 €. APE: G.");
  assert.equal(r.indirizzo, "piazzale Lagosta 6");
  assert.equal(r.piano, "3-5");
  assert.equal(r.ascensore, false);
  assert.equal(r.stato, "rist");
  assert.equal(r.classe, "G");
  assert.equal(r.prezzo, 260000);
});

test("quando non capisce, non inventa", () => {
  const r = leggiAnnuncio("Bellissimo appartamento luminoso, contattaci per informazioni.");
  assert.equal(r.mq, undefined);
  assert.equal(r.prezzo, undefined);
  assert.equal(r.indirizzo, undefined);
  assert.deepEqual(r.trovati, []);
});

test("negazioni: «senza» e «non» sono assenze dichiarate, non presenze; seminterrato e classe n.d. si dicono", () => {
  const r = leggiAnnuncio("Appartamento in vendita in Via Luigi Porro Lambertenghi 25, Milano. Prezzo 300.000 euro. Superficie 60 mq. Piano seminterrato, senza ascensore. Non ristrutturato: impianti e finiture da rifare. Classe energetica non disponibile. Senza balcone, senza terrazzo, senza cantina e senza box.");
  assert.equal(r.indirizzo, "Via Luigi Porro Lambertenghi 25");
  assert.equal(r.mq, 60);
  assert.equal(r.prezzo, 300000);
  assert.equal(r.stato, "rist", "«non ristrutturato» non e' «ristrutturato»");
  assert.equal(r.ascensore, false);
  assert.equal(r.piano, undefined);
  assert.equal(r.pianoNonSupportato, "seminterrato");
  assert.ok(r.avvisi.some((a) => /seminterrato/.test(a)));
  assert.equal(r.classe, "nd");
  assert.deepEqual(r.presenze, { balcone: "no", terrazzo: "no", cantina: "no", box: "no" });
  assert.equal(r.balconi, undefined);
  assert.equal(r.terrazzo, undefined);
  assert.equal(r.cantina, false);
  assert.equal(r.box, "nessuno");
});

test("il silenzio non e' un'assenza: senza parole, la presenza resta sconosciuta", () => {
  const r = leggiAnnuncio("Bilocale via Savona 35, 50 mq, 2° piano, buono stato, € 320.000.");
  assert.deepEqual(r.presenze, { balcone: "?", terrazzo: "?", cantina: "?", box: "?" });
  assert.equal(r.cantina, undefined);
  assert.equal(r.box, undefined);
});

test("«non ristrutturato, con balcone» tiene il balcone", () => {
  const r = leggiAnnuncio("Trilocale non ristrutturato, con balcone e cantina, via Savona 35, 80 mq, € 400.000");
  assert.equal(r.stato, "rist");
  assert.equal(r.presenze.balcone, "si");
  assert.equal(r.presenze.cantina, "si");
});

test("box acquistabile a parte: fuori dal prezzo dell'abitazione, con il suo prezzo", () => {
  const r = leggiAnnuncio("Appartamento in vendita in Via Luigi Porro Lambertenghi 25, Milano. Prezzo € 820.000. Superficie commerciale 122 m². Da ristrutturare. Classe energetica G. Box auto acquistabile separatamente a € 75.000.");
  assert.equal(r.prezzo, 820000, "il prezzo della casa resta quello della casa");
  assert.equal(r.mq, 122);
  assert.equal(r.classe, "G");
  assert.equal(r.stato, "rist");
  assert.equal(r.box, "nessuno");
  assert.equal(r.presenze.box, "separato");
  assert.deepEqual(r.boxSeparato, { prezzo: 75000 });
  const c = leggiAnnuncio("Trilocale via Savona 35, 85 mq, box auto compreso nel prezzo, € 500.000");
  assert.equal(c.box, "box");
  assert.equal(c.presenze.box, "si");
});
