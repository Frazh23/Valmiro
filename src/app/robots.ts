import type { MetadataRoute } from "next";

/**
 * `/gestione` e `/stime` restano fuori dai motori di ricerca.
 *
 * Per il gestionale non e' questa la difesa — quella e' il 404 che la pagina
 * restituisce a chiunque non sia amministratore — ma un indirizzo che non
 * compare da nessuna parte e' un indirizzo che nessuno prova. `/stime` sta
 * fuori perche' e' la pagina di qualcuno, non del sito.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/gestione", "/stime"] },
    sitemap: "https://valmiro.it/sitemap.xml",
  };
}
