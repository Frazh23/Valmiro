import type { MetadataRoute } from "next";
import { ZONE } from "@/lib/data";

/**
 * La mappa del sito per i motori di ricerca.
 *
 * Ci sono solo le pagine pubbliche: `/gestione` e `/stime` non entrano perche'
 * non sono di nessuno tranne di chi le apre, e `/termini` entra soltanto quando
 * esiste davvero (finche' il gestore non e' configurato risponde 404, e mettere
 * un 404 in sitemap e' un modo per farsi ignorare).
 */
const BASE = "https://valmiro.it";

export default function sitemap(): MetadataRoute.Sitemap {
  const oggi = new Date();
  const fisse = ["", "/valuta", "/quartieri", "/metodo", "/privacy", "/en", "/fr"];
  const zone = Object.keys(ZONE).map((z) => `/quartieri/${z.toLowerCase()}`);
  return [...fisse, ...zone].map((p) => ({
    url: `${BASE}${p}`,
    lastModified: oggi,
    changeFrequency: p === "" || p === "/valuta" ? "weekly" : "monthly",
    priority: p === "" ? 1 : p === "/valuta" ? 0.9 : p.startsWith("/quartieri/") ? 0.7 : 0.5,
  }));
}
