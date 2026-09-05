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
