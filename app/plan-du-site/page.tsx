import Link from "next/link";

export const metadata = { title: "Plan du site" };

const SECTIONS: [string, [string, string][]][] = [
  ["Accueil", [["Page d’accueil", "/"]]],
  [
    "Réserver une équipe",
    [
      ["1 · Choisir l’événement", "/reserver"],
      ["2 · Composer l’équipe", "/reserver"],
      ["3 · Rédiger le brief", "/reserver"],
      ["4 · Choisir les profils", "/reserver"],
      ["5 · Récapitulatif et devis", "/reserver"],
    ],
  ],
  [
    "Espaces personnels",
    [
      ["Espace entreprise", "/entreprise"],
      ["Espace commercial · Leads", "/commercial"],
      ["Mes comptes", "/comptes"],
      ["Notifications", "/notifications"],
    ],
  ],
  [
    "Créer un compte",
    [
      ["Inscription entreprise", "/inscription/entreprise"],
      ["Inscription commercial·e", "/inscription/commercial"],
      ["Connexion", "/connexion"],
    ],
  ],
  [
    "Aide",
    [
      ["Centre d’aide", "/aide"],
      ["Nous contacter", "/contact"],
      ["Plan du site", "/plan-du-site"],
      ["Déclaration d’accessibilité", "/accessibilite"],
    ],
  ],
  [
    "Informations légales",
    [
      ["Mentions légales", "/mentions-legales"],
      ["Conditions générales d’utilisation", "/cgu"],
      ["Conditions générales de vente", "/cgv"],
      ["Mandat de facturation (commerciaux)", "/mandat-facturation"],
      ["Politique de confidentialité", "/confidentialite"],
      ["Gestion des cookies", "/cookies"],
    ],
  ],
];

export default function Page() {
  return (
    <>
      <div className="head">
        <div>
          <span className="lab">Aide</span>
          <h1>Plan du site</h1>
          <p>Toutes les pages de standby, par rubrique.</p>
        </div>
      </div>
      <div className="grid3" style={{ gap: 22, alignItems: "start" }}>
        {SECTIONS.map(([title, links]) => (
          <section key={title} className="clay panel">
            <h2>{title}</h2>
            <ul style={{ padding: 0, margin: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href}>{label}</Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
