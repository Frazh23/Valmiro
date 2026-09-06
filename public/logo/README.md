# Il marchio di Valmiro

Proposta «03 · Finestra»: una finestra ad arco con il montante centrale, in verde profondo,
accanto alla scritta «Valmiro» in Fraunces. Ricostruito in SVG da zero (nessun ritaglio della
tavola di presentazione); tutto è vettoriale e scala senza perdita.

| File | Uso |
|---|---|
| `valmiro-logo.svg` | logo orizzontale, simbolo verde e scritta quasi nera: intestazione, footer, documenti su fondo chiaro |
| `valmiro-logo-mono.svg` | tutto quasi nero: stampa in un colore, fax, timbri |
| `valmiro-logo-inverso.svg` | tutto panna: su fondo verde `#1F6F5C` o scuro |
| `valmiro-simbolo.svg`, `-mono`, `-inverso` | il simbolo da solo, stesse tre versioni |
| `valmiro-icona.svg`, `valmiro-icona-512.png` | il simbolo panna su riquadro verde arrotondato: icona per app e social |
| `../../src/app/icon.svg`, `icon.png`, `favicon.ico`, `apple-icon.png` | favicon e icona iOS; Next.js le serve da solo |

## Colori

Verde `#1F6F5C` (`--accent`), inchiostro `#14120F` (`--ink`), panna `#F3EFE6` (`--paper`):
sono i token del sito (`src/styles/tokens.css`).

## Costruzione

Il simbolo vive in un riquadro 100×120: arco di raggio 43 centrato in (50, 50), lati fino a
y = 113, base chiusa, tratto 14 con giunzioni arrotondate; il montante parte 6 unità sotto
l'intradosso e arriva alla base. La scritta è il contorno dei glifi di **Fraunces** (asse ottico
144, peso 500, SOFT 0, WONK 0), con la crenatura della font; altezza della V = 88 unità,
linea di base a y = 116, a 26 unità dal simbolo.

Per le dimensioni piccole (favicon 16–48 px) il simbolo è più grande nel riquadro, il tratto
sale a 20 e il montante tocca l'arco: a 16 px lo stacco diventava un pixel sporco. È l'unica
semplificazione; sopra i 48 px si usa la versione intera.

## Licenza del carattere

Fraunces è di Undercase Type, rilasciato con la **SIL Open Font License 1.1** (copia in
`node_modules/@fontsource-variable/fraunces/LICENSE`). La OFL permette di usare il carattere
e i contorni dei suoi glifi in loghi e documenti, anche commerciali; l'unico vincolo è non
vendere il font da solo né rinominarlo. Il logo può quindi essere registrato come marchio senza
problemi di licenza sul carattere.

Nel sito la scritta dell'intestazione è testo HTML in Fraunces (stesse impostazioni degli
assi), non il file SVG: si legge, si seleziona, si ingrandisce con il resto della pagina.
