import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="clay foot">
      <div className="cols">
        <div className="brand">
          <Link className="logo disp" href="/">
            <i className="clay s" aria-hidden="true"></i>standby
          </Link>
          <p>
            La plateforme qui met en relation les entreprises exposantes et des commerciaux, hôtes·ses, animateurs et interprètes pour tenir leurs
            stands sur les salons professionnels et les foires en France.
          </p>
        </div>
        <div>
          <h2>Plateforme</h2>
          <ul>
            <li><Link href="/">Accueil</Link></li>
            <li><Link href="/reserver">Réserver une équipe</Link></li>
            <li><Link href="/entreprise">Espace entreprise</Link></li>
            <li><Link href="/commercial">Espace commercial</Link></li>
            <li><Link href="/comptes">Créer un compte</Link></li>
          </ul>
        </div>
        <div>
          <h2>Ressources</h2>
          <ul>
            <li><Link href="/aide">Centre d’aide</Link></li>
            <li><Link href="/contact">Nous contacter</Link></li>
            <li><Link href="/plan-du-site">Plan du site</Link></li>
            <li><Link href="/accessibilite">Accessibilité</Link></li>
            <li><Link href="/compte">Mon compte et mes données</Link></li>
          </ul>
        </div>
        <div>
          <h2>Légal</h2>
          <ul>
            <li><Link href="/mentions-legales">Mentions légales</Link></li>
            <li><Link href="/cgu">Conditions générales d’utilisation</Link></li>
            <li><Link href="/cgv">Conditions générales de vente</Link></li>
            <li><Link href="/confidentialite">Politique de confidentialité</Link></li>
            <li><Link href="/cookies">Gestion des cookies</Link></li>
          </ul>
        </div>
      </div>
      <div className="bar">
        <span>© {new Date().getFullYear()} Standby. Tous droits réservés.</span>
        <nav aria-label="Liens légaux">
          <Link href="/mentions-legales">Mentions légales</Link>
          <Link href="/confidentialite">Confidentialité</Link>
          <Link href="/cookies">Cookies</Link>
          <Link href="/accessibilite">Accessibilité : partiellement conforme</Link>
        </nav>
      </div>
    </footer>
  );
}
