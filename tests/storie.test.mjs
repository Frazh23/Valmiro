import test from "node:test";
import assert from "node:assert/strict";
import { storie, riassunto, giorniFra, mediana } from "../scripts/storie-lib.mjs";

/* Tre annunci finti, con la vita che ci interessa distinguere:
   - A: visto tre volte, ribassato una volta, poi sparito
   - B: visto due volte allo stesso prezzo, poi sparito
   - C: visto una volta sola nell'ultima raccolta: ancora vivo, non conta */
const RACCOLTE = ["2026-09-01", "2026-09-15", "2026-10-01"];
const LETTURE = [
  { rif: "A", fonte: "idealista", data: "2026-09-01", prezzo: 500000, zona: "C12", stato: "abit", mq: 80 },
  { rif: "A", fonte: "idealista", data: "2026-09-15", prezzo: 500000, zona: "C12", stato: "abit", mq: 80 },
  { rif: "B", fonte: "idealista", data: "2026-09-01", prezzo: 300000, zona: "D21", stato: "rist", mq: 60 },
  { rif: "B", fonte: "idealista", data: "2026-09-15", prezzo: 300000, zona: "D21", stato: "rist", mq: 60 },
  { rif: "C", fonte: "idealista", data: "2026-10-01", prezzo: 700000, zona: "B15", stato: "otti", mq: 90 },
];
/* il ribasso di A arriva alla seconda rilettura */
LETTURE[1].prezzo = 460000;

test("la storia di un annuncio tiene prima lettura, ultima e ribasso", () => {
  const S = storie(LETTURE, RACCOLTE);
  const A = S.find((s) => s.rif === "A");
  assert.equal(A.letture, 2);
  assert.equal(A.primoPrezzo, 500000);
  assert.equal(A.ultimoPrezzo, 460000);
  assert.equal(A.cali.length, 1);
  assert.ok(Math.abs(A.ribasso - (-0.08)) < 1e-9);
  assert.equal(A.giorniVisto, 14);
});

test("sparito vuol dire che c'e' stata una raccolta dopo l'ultima volta che l'abbiamo visto", () => {
  const S = storie(LETTURE, RACCOLTE);
  assert.equal(S.find((s) => s.rif === "A").sparito, true);
  assert.equal(S.find((s) => s.rif === "B").sparito, true);
  /* C e' stato visto nell'ultima raccolta: la sua storia non e' finita */
  assert.equal(S.find((s) => s.rif === "C").sparito, false);
  assert.equal(S.find((s) => s.rif === "C").viva, true);
});

test("le statistiche guardano solo le storie finite", () => {
  const R = riassunto(storie(LETTURE, RACCOLTE));
  assert.equal(R.length, 1);
  assert.equal(R[0].n, 2, "C, ancora in vendita, non deve entrare");
  assert.equal(R[0].quotaConRibasso, 0.5);
  assert.ok(Math.abs(R[0].ribassoMediano - (-0.04)) < 1e-9);
});

test("un annuncio senza codice o senza prezzo non entra", () => {
  const S = storie([...LETTURE, { rif: "", data: "2026-09-01", prezzo: 1 }, { rif: "D", data: "2026-09-01", prezzo: 0 }], RACCOLTE);
  assert.equal(S.length, 3);
});

test("stesso codice su fonti diverse sono due case diverse", () => {
  const S = storie([
    { rif: "1", fonte: "idealista", data: "2026-09-01", prezzo: 100000, zona: "C12" },
    { rif: "1", fonte: "casa", data: "2026-09-01", prezzo: 200000, zona: "C12" },
  ], RACCOLTE);
  assert.equal(S.length, 2);
});

test("giorniFra e mediana", () => {
  assert.equal(giorniFra("2026-09-01", "2026-10-01"), 30);
  assert.equal(mediana([]), null);
  assert.equal(mediana([3, 1, 2]), 2);
  assert.equal(mediana([4, 1, 2, 3]), 2.5);
});
