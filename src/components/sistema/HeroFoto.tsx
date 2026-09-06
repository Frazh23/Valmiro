"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Le fotografie della home.
 *
 * Sono immagini illustrative generate, non fotografie di indirizzi verificati:
 * per questo sono decorative (alt vuoto, nessun annuncio ai lettori di schermo) e
 * non portano nessuna informazione sulla valutazione.
 *
 * Su schermo largo scorrono: balconi Liberty, ingresso monumentale, finestra
 * decorata, cortile con logge. Otto secondi ciascuna, un secondo di dissolvenza, nessuno
 * zoom e nessuno spostamento: titolo, campo indirizzo e marchio non si muovono,
 * perche' le foto vivono in un livello sotto e cambiano solo di opacita'.
 *
 * Nessun comando in vista: le foto vanno da sole. La rotazione si ferma quando la
 * scheda non e' visibile, quando la sezione esce dallo schermo e quando qualcuno
 * sta scrivendo nel modulo — cosi' non si muove niente mentre si guarda altro o si
 * compila. Con «riduci le animazioni» resta una sola immagine, ferma. Su telefono
 * resta la prima, e gli altri file non partono nemmeno: il DOM iniziale ne
 * contiene una sola.
 */

export type Foto = { slug: string; nome: string; pos: string };

/* Il punto focale di ogni fotografia e' scelto a mano: nel riquadro alto del
   desktop il ritaglio e' orizzontale, e la sfumatura mangia la parte sinistra.
   Le percentuali portano il soggetto — balcone, arco, bifora, loggiato — dentro
   la zona che resta piena. Su telefono il riquadro e' 3:2 come l'originale:
   nessun ritaglio, e il punto focale non serve. */
export const FOTO: Foto[] = [
  { slug: "balconi", nome: "Balconi Liberty in ferro battuto e pietra scolpita", pos: "85% 50%" },
  { slug: "ingresso", nome: "Ingresso monumentale ad arco, con cancello in ferro", pos: "28% 50%" },
  { slug: "finestra", nome: "Finestra decorata con mascherone e balconcino", pos: "15% 50%" },
  { slug: "cortile", nome: "Cortile con logge e colonne", pos: "22% 50%" },
];

const DURATA = 8000; /* quanto resta ferma un'immagine */
const LARGHEZZE = [768, 1152, 1536];
const SIZES = "(max-width: 900px) 100vw, 60vw";

const srcset = (slug: string, ext: string) =>
  LARGHEZZE.map((w) => `/hero/${slug}-${w}.${ext} ${w}w`).join(", ");

function Scatto({ foto, attiva, prima, onErrore }: {
  foto: Foto; attiva: boolean; prima: boolean; onErrore: () => void;
}) {
  return (
    <div className={`v-hero__scatto${attiva ? " on" : ""}`} style={{ ["--pos" as string]: foto.pos }}>
      <picture>
        <source type="image/avif" srcSet={srcset(foto.slug, "avif")} sizes={SIZES} />
        <source type="image/webp" srcSet={srcset(foto.slug, "webp")} sizes={SIZES} />
        <img
          src={`/hero/${foto.slug}-1152.webp`}
          width={1536} height={1024}
          alt="" aria-hidden="true"
          loading={prima ? "eager" : "lazy"}
          fetchPriority={prima ? "high" : "low"}
          decoding="async"
          onError={onErrore}
        />
      </picture>
    </div>
  );
}

export default function HeroFoto() {
  const [attiva, setAttiva] = useState(0);
  const [rotta, setRotta] = useState<number[]>([]);
  /* le altre foto entrano nel DOM solo dopo la prima: il primo schermo non le aspetta */
  const [tante, setTante] = useState(false);
  const [fermo, setFermo] = useState(false); /* pausa automatica: scheda, vista, modulo */
  const box = useRef<HTMLDivElement>(null);

  /* Schermo largo e animazioni: la decisione sta qui, non nel CSS, perche' decide
     anche quali file scaricare. Fuori dal browser (render sul server) e' «no»: la
     home parte con il solo cortile. */
  useEffect(() => {
    const largo = matchMedia("(min-width: 901px)");
    const calmo = matchMedia("(prefers-reduced-motion: reduce)");
    const guarda = () => setTante(largo.matches && !calmo.matches);
    guarda();
    largo.addEventListener("change", guarda);
    calmo.addEventListener("change", guarda);
    return () => { largo.removeEventListener("change", guarda); calmo.removeEventListener("change", guarda); };
  }, []);

  /* Pause automatiche. La scheda nascosta e la sezione fuori vista non hanno
     bisogno di animazioni; chi sta compilando il modulo nemmeno. */
  useEffect(() => {
    if (!tante) return;
    let visibile = true, dentro = true, scrive = false;
    const aggiorna = () => setFermo(!visibile || !dentro || scrive);

    const scheda = () => { visibile = !document.hidden; aggiorna(); };
    const osserva = new IntersectionObserver(([e]) => { dentro = e.isIntersecting; aggiorna(); }, { threshold: 0.15 });
    if (box.current) osserva.observe(box.current);
    const dentroModulo = (n: EventTarget | null) => !!(n instanceof Element && n.closest(".v-hero__in"));
    const entra = (e: FocusEvent) => { scrive = dentroModulo(e.target); aggiorna(); };
    const esce = (e: FocusEvent) => { if (!dentroModulo(e.relatedTarget)) { scrive = false; aggiorna(); } };

    document.addEventListener("visibilitychange", scheda);
    document.addEventListener("focusin", entra);
    document.addEventListener("focusout", esce);
    return () => {
      osserva.disconnect();
      document.removeEventListener("visibilitychange", scheda);
      document.removeEventListener("focusin", entra);
      document.removeEventListener("focusout", esce);
    };
  }, [tante]);

  /* Una foto che non carica esce dal giro; se era quella in vista si torna alla precedente. */
  const precedente = useRef(0);
  const guasta = useCallback((n: number) => {
    setRotta((v) => (v.includes(n) ? v : [...v, n]));
    setAttiva((a) => (a === n ? precedente.current : a));
  }, []);
  const buone = FOTO.map((_, n) => n).filter((n) => !rotta.includes(n));

  useEffect(() => { if (!rotta.includes(attiva)) precedente.current = attiva; }, [attiva, rotta]);

  useEffect(() => {
    if (!tante || fermo || buone.length < 2) return;
    const t = setTimeout(() => {
      setAttiva((n) => {
        const i = buone.indexOf(n);
        return buone[(i + 1) % buone.length] ?? n;
      });
    }, DURATA);
    return () => clearTimeout(t);
  }, [tante, fermo, attiva, buone.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  /* su telefono, o con le animazioni ridotte, c'e' solo la prima: l'indice torna a zero,
     altrimenti dopo un ridimensionamento resterebbe acceso uno scatto che non e' piu' nel DOM */
  const indice = tante ? attiva : 0;
  const mostra = tante ? FOTO : FOTO.slice(0, 1);

  return (
    <div className="v-hero__foto" ref={box} aria-hidden="true">
      {mostra.map((f, n) => (
        <Scatto key={f.slug} foto={f} prima={n === 0} attiva={n === indice} onErrore={() => guasta(n)} />
      ))}
    </div>
  );
}
