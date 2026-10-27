import Link from "next/link";
import { Toc } from "@/components/doc-page";
import { CookieChoices } from "./choices";

export const metadata = { title: "Gestion des cookies" };

export default function Page() {
  return (
    <>
      <div className="head">
        <div>
          <span className="lab">Informations légales</span>
          <h1>Gestion des cookies</h1>
          <p>Vous choisissez les traceurs que nous pouvons utiliser. Refuser est aussi simple qu’accepter, et votre choix est conservé 6 mois.</p>
        </div>
      </div>
      <div className="doc">
        <Toc titles={["Vos choix", "Qu’est-ce qu’un cookie ?", "Liste des traceurs", "Modifier votre choix"]} />
        <div style={{ flex: "999 1 620px", minWidth: 0, display: "flex", flexDirection: "column", gap: 22 }}>
          <section className="clay prose">
            <h2 id="s1">1. Vos choix</h2>
            <CookieChoices />
          </section>
          <section className="clay prose">
            <h2 id="s2">2. Qu’est-ce qu’un cookie ?</h2>
            <p>
              Un cookie est un petit fichier enregistré sur votre appareil lors de la visite d’un site. Il permet de reconnaître votre navigateur, de
              mémoriser une préférence ou de mesurer l’usage du site. Seuls les cookies nécessaires au fonctionnement du service sont déposés sans
              votre accord.
            </p>
            <h2 id="s3">3. Liste des traceurs</h2>
            <div className="tblwrap">
              <table className="tbl" style={{ fontSize: 14 }}>
                <thead>
                  <tr>
                    <th scope="col">Nom</th>
                    <th scope="col">Finalité</th>
                    <th scope="col">Durée</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>standby_session</td>
                    <td className="wrap">Session et sécurité (connexion)</td>
                    <td>30 jours</td>
                  </tr>
                  <tr>
                    <td>standby_consent</td>
                    <td className="wrap">Mémorisation du choix de cookies</td>
                    <td>6 mois</td>
                  </tr>
                  <tr>
                    <td><span className="todo">[outil d’audience]</span></td>
                    <td className="wrap">Mesure d’audience, uniquement après accord</td>
                    <td>13 mois</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <h2 id="s4">4. Modifier votre choix</h2>
            <p>
              Vous pouvez revenir sur votre choix à tout moment depuis le lien « Cookies » en bas de chaque page, ou en paramétrant votre navigateur. Pour
              en savoir plus sur vos données, consultez la <Link href="/confidentialite">politique de confidentialité</Link>.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
