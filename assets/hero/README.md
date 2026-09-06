# Le fotografie della home, originali

Quattro immagini **illustrative generate**, ispirate all'architettura milanese di primo
Novecento: non documentano edifici, indirizzi o immobili reali, e la home lo dichiara nel piede
della pagina. Nel sito sono decorative: `alt` vuoto, nessun annuncio ai lettori di schermo.

| File | Cosa mostra | Nella rotazione |
|---|---|---|
| `01-balconi-liberty.png` | balconi in ferro battuto, pietra scolpita, decori floreali | prima, ed è l'unica che si vede su telefono |
| `02-ingresso-monumentale.png` | portone ad arco con cancello in ferro e mascheroni | seconda |
| `03-finestra-decorata.png` | finestra con mascherone e balconcino in ferro | terza |
| `04-cortile-logge.png` | cortile con logge, colonne e arcate | quarta |

## Risoluzione, e il suo limite

Gli originali sono **1536 × 1024 px**. Non sono immagini 4K e non vengono ingrandite per
sembrarlo: le copie web si fermano a 1536 px di larghezza.

Su desktop la fotografia sta in un riquadro alto circa 750 px e largo il 60% della finestra, e
`object-fit: cover` la ingrandisce per riempirlo. Con l'altezza dell'hero limitata a 700 px
(`min-height: min(88dvh, 700px)` in `sistema.css`) il ritaglio è **solo orizzontale** —
verticalmente si vede l'immagine intera — e su uno schermo Retina l'ingrandimento resta intorno
a **1,45×** invece di 1,9×. È un compromesso, non una soluzione: **a 2× la fotografia è
comunque ingrandita**, e su pietra e ringhiere si vede se si guarda da vicino. Per essere nitide
a 2× in questo impaginato servirebbero originali di circa **2200 × 1470 px**.

Su telefono il riquadro è 3:2 come l'originale: nessun ritaglio, e a 390 px di larghezza per 3×
l'immagine è ancora più grande dello schermo. Lì la nitidezza è piena.

## Le copie per il sito

`public/hero/`, in WebP e AVIF a 768, 1152 e 1536 px — mai più grandi dell'originale — generate
con `scripts/ottimizza-hero.py` (Pillow). Qualità **WebP 82** e **AVIF 66**: alzate rispetto al
set precedente (74 e 52) perché fregi e ferro battuto sono pieni di dettaglio fine e ai valori
di prima si impastavano. Misurato sulla prima fotografia: PSNR 32,4 dB con AVIF q52, 36,8 dB con
q66; l'energia ad alta frequenza — la «grana» dei rilievi — passa da −11% a −5% rispetto
all'originale. La prima immagine pesa 235 KB in AVIF a 1536 px.

`brief-originale.txt` e `leggimi-originali.txt` sono la richiesta e la nota arrivate con le
immagini, tenute per memoria.

Le fotografie precedenti della home stanno in `archivio/`; il set del 6 settembre mattina
(cortile milanese, ferro e vetro, pietra e bronzo) resta nella storia di git, commit `a72f21f`.
