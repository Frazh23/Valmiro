import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { caricaAnnunci, mercatoLotto } from "../scripts/annunci.mjs";

/* Un lotto di canoni mensili dentro la taratura delle vendite non si vede: non
   rompe niente, non stampa errori, sposta solo i coefficienti. Questi test
   stanno qui perche' quel giorno non arrivi mai. */

const RIGA = "id;fonte;data;indirizzo;zona;tipo;mq;stato;piano;ascensore;classe;balconi;cantina;box;epoca;affaccio;metro;prezzo_richiesto;prezzo_venduto;note";
const csv = (prezzo) => `${RIGA}\nx-1;prova;2026-09-08;Via Prova 1;C12;civ;60;abit;1-2;si;nd;;;nessuno;;;;${prezzo};;`;

function conCartella(fn) {
  const dir = mkdtempSync(join(tmpdir(), "valmiro-"));
  try { return fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}

test("il mercato si legge dal nome del file", () => {
  assert.equal(mercatoLotto("data/annunci/2026-09-05-vendite-fz.csv"), "vendita");
  assert.equal(mercatoLotto("data/annunci/2026-09-08-affitti-idealista.csv"), "affitto");
  assert.equal(mercatoLotto("data/annunci/2026-09-08-AFFITTI.csv"), "affitto");
});

test("un lotto di affitti non entra nella taratura delle vendite", () => {
  conCartella((dir) => {
    writeFileSync(join(dir, "2026-09-08-vendite.csv"), csv(300000));
    writeFileSync(join(dir, "2026-09-08-affitti.csv"), csv(1200));
    const vendite = caricaAnnunci(dir);
    assert.equal(vendite.lotti.length, 1);
    assert.match(vendite.lotti[0], /vendite/);
    const affitti = caricaAnnunci(dir, { mercato: "affitto" });
    assert.equal(affitti.lotti.length, 1);
    assert.match(affitti.lotti[0], /affitti/);
  });
});

test("passare un lotto di affitti a mano a un comando di vendite e' un errore, non una svista", () => {
  conCartella((dir) => {
    const f = join(dir, "2026-09-08-affitti.csv");
    writeFileSync(f, csv(1200));
    assert.throws(() => caricaAnnunci(f), /affitto/);
  });
});

test("il manifest non puo' smentire il nome del file", () => {
  conCartella((dir) => {
    const f = join(dir, "2026-09-08-affitti.csv");
    writeFileSync(f, csv(1200));
    writeFileSync(f.replace(/\.csv$/, ".meta.json"), JSON.stringify({ ruolo: "taratura", mercato: "vendita" }));
    assert.throws(() => mercatoLotto(f), /dice affitti/);
  });
});
