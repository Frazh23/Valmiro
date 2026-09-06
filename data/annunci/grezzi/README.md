# Gli export grezzi degli annunci

Qui stanno i file **come sono usciti dalla raccolta**, prima di diventare un lotto nel formato
di `data/annunci/`. Non li legge nessuno script: servono a poter rifare la conversione, a
controllare un campo quando un numero non torna, e a sapere da dove viene un lotto.

| File | Cos'è |
|---|---|
| `milano_200_annunci_claude.csv` | i primi 200 annunci di vendita a Milano raccolti il 5/9/2026 (separatore `;`). È la fonte di `data/annunci/2026-09-05-vendite-fz.csv`, il lotto su cui è tarato il motore |
| `valmiro_200_annunci_classi_energetiche.csv` / `.xlsx` | gli stessi 200, con la classe energetica aggiunta (separatore `,`) |
| `valmiro_milano_200_annunci_100xportale.xlsx` | gli stessi 200, divisi per portale, 100 per foglio |
| `valmiro_100_nuovi_annunci_classi_energetiche.csv` / `.xlsx` | **100 annunci nuovi** (ID globali da 201 in su), raccolti dopo i primi 200: non sono ancora un lotto e **non sono stati usati per la taratura** |

## I 100 nuovi: cosa possono diventare

Sono materiale candidato per il **campione di verifica indipendente** descritto in
`docs/verifica.md`: annunci che il motore non ha mai visto, da confrontare a modello congelato.
Perché lo diventino servono tre cose, in quest'ordine:

1. convertirli nel formato di `data/annunci/` (le colonne sono elencate in `../README.md`),
   con `ruolo: verifica` e la colonna `rif` per la deduplica fra portali;
2. lasciare fermi i parametri (`data/annunci/parametri-congelati.json`, impronta
   `2e277588b1b626a5`): sul campione di verifica non si sceglie nessun coefficiente;
3. `npm run verifica`, che scrive il rapporto in `docs/verifiche/`.

Finché questo non è fatto, il sito continua a dire — ed è vero — «Protocollo predisposto;
validazione indipendente non ancora eseguita».

## Attenzione

Sono prezzi **richiesti** negli annunci, non prezzi di compravendita, e i dati vengono dalle
schede pubbliche dei portali raccolte a mano: non si fa scraping automatico (termini d'uso e
tutela sui generis delle banche dati).
