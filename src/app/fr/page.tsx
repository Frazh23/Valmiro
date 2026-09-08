import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/sistema/Header";
import Logo from "@/components/sistema/Logo";
import { SEMESTRE, FONTE } from "@/lib/data";

export const metadata: Metadata = {
  title: "Valmiro en français · la valeur d'un logement à Milan",
  description:
    "Valmiro estime la valeur d'un logement à Milan à partir des chiffres officiels OMI de l'administration fiscale italienne. Ce que l'estimation est, ce qu'elle n'est pas, et le vocabulaire du formulaire italien.",
  alternates: { languages: { en: "https://valmiro.it/en", fr: "https://valmiro.it/fr" } },
};

/**
 * Pagina in francese. Stessa sostanza della pagina inglese, scritta in francese,
 * non convertita: le frasi che pesano — «ce n'est pas une expertise» — hanno un
 * senso tecnico diverso in Francia e in Italia, e vanno dette per bene.
 */
export default function Francais() {
  return (
    <div className="v-page" lang="fr">
      <Header />
      <main className="v-fill">
        <article className="v-wrap v-section v-section--op v-prose v-narrow">
          <p className="v-eyebrow">En français</p>
          <h1 className="v-h1" style={{ marginTop: "var(--s-3)" }}>Combien vaut cet appartement&nbsp;?</h1>
          <p className="v-lead" style={{ marginTop: "var(--s-5)" }}>
            Valmiro estime la valeur d&apos;un logement à Milan à partir des prix officiels que l&apos;administration
            fiscale italienne publie pour chaque quartier. Le calcul est affiché ligne par ligne&nbsp;: vous pouvez
            donc être en désaccord avec lui.
          </p>

          <h2>D&apos;où viennent les chiffres</h2>
          <p>
            L&apos;Italie possède ce que beaucoup de pays n&apos;ont pas&nbsp;: un registre public et officiel des prix.
            Deux fois par an, l&apos;<b>Agenzia delle Entrate</b> (l&apos;administration fiscale) publie, par son
            observatoire du marché immobilier (<i>Osservatorio del Mercato Immobiliare</i>, OMI), une fourchette
            d&apos;euros par mètre carré pour chacune des 42 zones homogènes de Milan, par type de bien et pour deux
            états d&apos;entretien. Valmiro part de ces chiffres — actuellement le {SEMESTRE.replace("2° semestre", "second semestre")} —
            et applique des coefficients déclarés&nbsp;: étage, ascenseur, état, balcons, et ainsi de suite. Les
            contours des zones et le répertoire des numéros de rue viennent de la Ville de Milan.
          </p>
          <p>
            Rien n&apos;est aspiré des portails d&apos;annonces, et aucun prix n&apos;est inventé. Si un élément déplace
            le résultat, la page vous dit de combien.
          </p>

          <h2>Ce que l&apos;estimation n&apos;est pas</h2>
          <p>
            Il s&apos;agit d&apos;une <b>estimation automatique indicative</b>. Ce n&apos;est ni une expertise, ni une
            évaluation ayant une valeur juridique&nbsp;: en Italie ce document s&apos;appelle une <i>perizia</i>, et il
            est signé par un professionnel qui s&apos;est déplacé. Valmiro n&apos;a jamais vu l&apos;appartement. Il ne
            connaît ni la vue, ni l&apos;état de l&apos;immeuble, ni le voisinage, ni les travaux votés au printemps
            dernier, ni si les fenêtres donnent sur une cour ou sur la ligne du tram.
          </p>
          <p>
            Le résultat est une valeur centrale entourée d&apos;une fourchette, et c&apos;est la fourchette qui est
            honnête&nbsp;: elle exprime l&apos;incertitude du modèle, pas une marge de négociation. Deux appartements
            identiques sur le papier peuvent valoir quinze pour cent d&apos;écart dans la réalité.
          </p>

          <h2>Comment lire le résultat</h2>
          <p>
            Vous obtenez une valeur et une fourchette, un degré de fiabilité, puis les raisons&nbsp;: la cotation de
            zone utilisée, ce que chaque caractéristique ajoute ou retranche, le coût d&apos;une rénovation poste par
            poste, le rendement locatif, et l&apos;évolution du quartier depuis 2014. Tout ce que le modèle a supposé
            au lieu de le savoir est écrit noir sur blanc, à côté du chiffre.
          </p>

          <h2>Le formulaire est en italien — voici le vocabulaire</h2>
          <p>
            L&apos;outil reste en italien, et c&apos;est volontaire&nbsp;: les formulations ont été écrites avec soin,
            et une traduction automatique d&apos;une mention légale vaut moins que rien. Votre navigateur peut traduire
            les pages pour la lecture. Là où cela compte — confidentialité, conditions, la mention à côté de chaque
            résultat — c&apos;est le texte italien qui fait foi.
          </p>
          <p>Voici les champs que vous rencontrerez&nbsp;:</p>
          <dl className="v-glossario">
            <div><dt>Voglio comprare / Voglio vendere</dt><dd>Je veux acheter / je veux vendre. Cela change les questions et les outils, jamais la valeur.</dd></div>
            <div><dt>Superficie</dt><dd>Surface. <b>Commerciale</b> est la convention italienne des annonces et des actes&nbsp;: elle comprend les murs et, à taux réduit, balcons et cave. <b>Calpestabile</b> est la surface au sol utile.</dd></div>
            <div><dt>Balconi · Terrazzi · Cantina o soffitta</dt><dd>Balcons · terrasses · cave ou grenier. Demandez-vous s&apos;ils sont déjà compris dans les mètres carrés saisis.</dd></div>
            <div><dt>In che stato è</dt><dd>État&nbsp;: <i>da ristrutturare</i> (à rénover), <i>abitabile</i> (habitable), <i>ottimo stato</i> (très bon état), <i>nuova</i> (neuf).</dd></div>
            <div><dt>Piano</dt><dd>Étage. <i>Piano terra</i> est le rez-de-chaussée&nbsp;; <i>seminterrato</i> est un sous-sol, pour lequel le modèle ne donne qu&apos;une simulation explicite, pas une évaluation.</dd></div>
            <div><dt>Ascensore</dt><dd>Ascenseur. À partir du troisième étage, il pèse beaucoup.</dd></div>
            <div><dt>Classe energetica</dt><dd>Classe énergétique, de A à G. «&nbsp;Non la conosco&nbsp;» signifie que vous ne la connaissez pas.</dd></div>
            <div><dt>Categoria catastale</dt><dd>Catégorie cadastrale, de A/1 à A/11&nbsp;: elle indique au modèle si le bien est <i>civile</i> (ordinaire), <i>signorile</i> (haut de gamme) ou <i>economica</i>.</dd></div>
            <div><dt>Luminosità</dt><dd>La luminosité du logement.</dd></div>
            <div><dt>Box o posto auto</dt><dd>Garage ou place de stationnement, et s&apos;il est vendu séparément.</dd></div>
            <div><dt>Prezzo richiesto</dt><dd>Le prix demandé, si vous avez une annonce sous les yeux. Donnez-le et Valmiro vous dira ce qu&apos;il en pense.</dd></div>
          </dl>

          <p style={{ marginTop: "var(--s-8)" }}>
            <Link className="v-btn v-btn--accent" href="/valuta">Estimer un logement</Link>
            {" "}
            <Link className="v-btn v-btn--bare" href="/en">In English</Link>
          </p>
          <p className="v-small">
            Une question, une erreur à signaler&nbsp;: <a href="mailto:informazioni@valmiro.it">informazioni@valmiro.it</a>.
            Notre <Link href="/privacy">politique de confidentialité</Link> est en italien.
          </p>
        </article>
      </main>
      <footer className="v-footer">
        <div className="v-wrap v-footer__in">
          <Logo link={false} size="sm" />
          <p className="v-micro">
            {FONTE}. Les estimations sont indicatives et ne constituent pas une expertise.
            {" "}<Link href="/privacy">Privacy</Link>
            {" · "}<a href="mailto:informazioni@valmiro.it">informazioni@valmiro.it</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
