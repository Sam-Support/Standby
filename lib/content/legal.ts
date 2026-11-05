import type { DocSection } from "@/components/doc-page";

// Textes repris du design. Les passages entre crochets restent à compléter par l'éditeur (avec son avocat).

export const MENTIONS: DocSection[] = [
  {
    title: "Éditeur du site",
    body: [
      "Le site standby est édité par [raison sociale], [forme juridique] au capital de [montant] €, immatriculée au RCS de [ville] sous le numéro [numéro].",
      ["Siège social : [adresse complète]", "SIRET : [14 chiffres]", "TVA intracommunautaire : [numéro]", "Contact : [adresse e-mail] · [téléphone]"],
    ],
  },
  { title: "Directeur de la publication", body: ["[Nom et fonction], en qualité de représentant légal de l’éditeur."] },
  { title: "Hébergeur", body: ["Le site est hébergé par [nom de l’hébergeur du VPS], [adresse], [téléphone ou site web]. Les données sont stockées par Supabase, région Union européenne."] },
  {
    title: "Propriété intellectuelle",
    body: [
      "L’ensemble des éléments du site (structure, textes, graphismes, interface, logo standby) est protégé par le droit de la propriété intellectuelle. Toute reproduction, représentation ou adaptation, totale ou partielle, sans autorisation écrite préalable de l’éditeur est interdite.",
    ],
  },
  {
    title: "Marques et visuels des organisateurs",
    body: [
      "Les noms, logos et visuels des salons et foires affichés sur le site appartiennent à leurs titulaires respectifs. Ils sont présentés à titre purement informatif pour identifier les événements et n’impliquent aucun partenariat ni parrainage sauf mention contraire.",
    ],
  },
  {
    title: "Données personnelles et cookies",
    body: ["Le traitement des données personnelles est détaillé dans la {politique de confidentialité|/confidentialite}. L’usage des traceurs est décrit dans la {politique de cookies|/cookies}."],
  },
  { title: "Droit applicable", body: ["Les présentes mentions sont soumises au droit français. À défaut de résolution amiable, les tribunaux compétents sont ceux du ressort du siège de l’éditeur."] },
];

// Mandat d'autofacturation (art. 289 I-2 du CGI, BOI-TVA-DECLA-30-20-10-20). Version : BILLING_MANDATE_VERSION.
export const MANDAT_FACTURATION: DocSection[] = [
  {
    title: "Parties et objet",
    body: [
      "Le présent mandat est conclu entre le commercial, hôte·sse, animateur·rice ou interprète indépendant inscrit sur standby (le « mandant ») et [raison sociale de l’éditeur], éditeur de standby (le « mandataire »).",
      "Le mandant charge le mandataire d’établir et d’émettre, en son nom et pour son compte, les factures correspondant aux missions réalisées via la plateforme et aux indemnités d’annulation qui lui sont versées. Le mandataire en est le destinataire et le payeur.",
    ],
  },
  {
    title: "Émission des factures",
    body: [
      [
        "Une facture est émise pour chaque virement, après validation des heures et encaissement du paiement de l’entreprise exposante (ou, pour une indemnité, des frais d’annulation).",
        "Elle porte la mention « Autofacturation », une numérotation continue propre au mandant, ses nom, adresse et SIRET tels qu’enregistrés dans son profil à la date d’émission, le détail de la prestation (événement, dates, heures validées, taux horaire), le montant hors taxes et le régime de TVA déclaré.",
        "Mandant en franchise en base : la facture porte la mention « TVA non applicable, art. 293 B du CGI ». Mandant assujetti : la TVA au taux en vigueur s’ajoute au montant hors taxes et lui est versée.",
      ],
    ],
  },
  {
    title: "Mise à disposition et contestation",
    body: [
      "Chaque facture est mise à disposition du mandant dans son espace (rubrique « Factures et relevés ») dès son émission, avec un relevé mensuel et un récapitulatif annuel. Le mandant peut la contester dans un délai de [15] jours via la page {Contact|/contact} ; à défaut, elle est réputée acceptée. Une facture contestée à raison est annulée par une facture rectificative.",
    ],
  },
  {
    title: "Obligations du mandant",
    body: [
      [
        "Tenir à jour son adresse, son SIRET et son régime de TVA : les informations du profil font foi à la date d’émission.",
        "Déclarer le chiffre d’affaires correspondant et, le cas échéant, reverser la TVA facturée : le mandant reste seul responsable de ses obligations fiscales et sociales.",
        "Ne pas émettre lui-même de facture pour les prestations couvertes par le présent mandat.",
      ],
    ],
  },
  {
    title: "Durée et résiliation",
    body: [
      "Le mandat prend effet à son acceptation et vaut pour une durée indéterminée. Le mandant peut le résilier à tout moment par la page {Contact|/contact} : la résiliation prend effet après le règlement des missions en cours, et le mandant ne reçoit plus de nouvelles missions. Toute nouvelle version du mandat est soumise à son acceptation. [Texte à faire valider par l’expert-comptable et l’avocat.]",
    ],
  },
];

export const CGU: DocSection[] = [
  {
    title: "Objet",
    body: [
      "Les présentes conditions encadrent l’utilisation de la plateforme standby, qui met en relation des entreprises exposantes et des commerciaux, hôtes·ses, animateurs et interprètes indépendants pour la tenue de stands sur des salons professionnels et des foires.",
    ],
  },
  {
    title: "Accès au service",
    body: [
      "Le site est accessible gratuitement. La création d’un compte est nécessaire pour réserver une équipe ou postuler à une mission. Les frais de connexion restent à la charge de l’utilisateur. L’éditeur peut suspendre l’accès pour maintenance, sans que sa responsabilité soit engagée.",
    ],
  },
  {
    title: "Comptes utilisateurs",
    body: [
      "Deux types de comptes existent :",
      [
        "**Compte entreprise** : raison sociale, SIRET, site web, page LinkedIn, plaquette commerciale, référents et format de remontée des leads.",
        "**Compte commercial·e** : identité, postes, spécialités, langues, tailles de tenue, statut d’indépendant et documents justificatifs.",
      ],
      "L’utilisateur garantit l’exactitude des informations fournies et les tient à jour. Les identifiants sont personnels et confidentiels.",
    ],
  },
  {
    title: "Engagements des utilisateurs",
    body: [
      [
        "Respecter les dates, horaires et briefs convenus pour chaque mission ; en cas d’empêchement, se désister depuis la mission au plus tôt, au plus tard la veille du premier jour (un désistement compte comme un refus dans le taux d’acceptation).",
        "Ne pas contourner la plateforme pour la facturation ou le paiement d’une mission trouvée via standby. Les factures des commerciaux sont établies par standby en vertu du {mandat de facturation|/mandat-facturation} accepté à l’inscription.",
        "Ne publier aucun contenu illicite, trompeur ou portant atteinte aux droits de tiers.",
      ],
    ],
  },
  {
    title: "Dépôt de fichiers et de leads",
    body: [
      "Les commerciaux déposent leurs leads (fichiers Excel, photos de cartes de visite) pour le compte de l’entreprise exposante. Ils garantissent n’y inclure que des contacts recueillis dans le cadre de la mission. Les fichiers sont contrôlés sur les colonnes du format de l’entreprise puis restitués à celle-ci. Voir la {politique de confidentialité|/confidentialite}.",
    ],
  },
  {
    title: "Responsabilité",
    body: [
      "standby agit comme intermédiaire technique et met en œuvre les moyens raisonnables pour assurer la qualité des profils. Sa responsabilité ne peut être engagée pour les dommages indirects ni pour les manquements d’un utilisateur à ses propres obligations.",
    ],
  },
  { title: "Évolution des conditions", body: ["Les conditions peuvent être modifiées. Les utilisateurs sont informés de toute modification substantielle avant son entrée en vigueur."] },
  {
    title: "Droit applicable",
    body: ["Les présentes conditions sont soumises au droit français. Tout litige relève des tribunaux compétents du ressort du siège de l’éditeur, sous réserve des règles impératives applicables."],
  },
];

export const cgv = (feePct: string, cancellation: string[]): DocSection[] => [
  {
    title: "Champ d’application",
    body: [
      "Les présentes conditions s’appliquent à toute réservation d’une équipe de stand effectuée par une entreprise exposante sur la plateforme standby. La confirmation d’une réservation vaut acceptation sans réserve des conditions en vigueur à cette date.",
    ],
  },
  {
    title: "Réservation d’une équipe",
    body: [
      "La réservation précise l’événement, les jours (montage compris), les horaires, les postes, les langues, la tenue, le référent sur place et le format de remontée des leads. Chaque commercial sélectionné reçoit une mission et l’accepte ; la réservation est confirmée lorsque toutes les missions sont acceptées. À défaut, standby propose un remplaçant dans les meilleurs délais.",
    ],
  },
  {
    title: "Prix",
    body: [
      `Le prix est calculé à partir du taux horaire de chaque profil, du nombre d’heures facturées par jour et du nombre de jours, auquel s’ajoutent les frais de service de ${feePct} hors taxes. Les prix sont exprimés en euros hors taxes ; la TVA au taux en vigueur s’ajoute. Un devis détaillé est présenté avant toute confirmation.`,
    ],
  },
  {
    title: "Facturation et paiement",
    body: [
      "Une facture unique par événement est émise après validation des heures et mise à disposition dans l’espace entreprise. Le règlement est prélevé sur le moyen de paiement enregistré à la réservation (mandat SEPA ou carte) et exigible sous [délai] jours. Tout retard donne lieu à des pénalités au taux de [taux] ainsi qu’à l’indemnité forfaitaire de recouvrement de 40 € prévue à l’article D. 441-5 du Code de commerce.",
      "Toute correction d’une facture émise (erreur, geste commercial, réclamation acceptée) fait l’objet d’un avoir, mis à disposition dans l’espace entreprise : il est remboursé sur le moyen de paiement utilisé si la facture est réglée, ou déduit du prélèvement à venir.",
    ],
  },
  {
    title: "Désistement d’un commercial",
    body: [
      "Si un commercial ayant accepté sa mission se désiste avant l’événement, Standby propose aussitôt la mission à un profil compatible, en priorité au même tarif horaire ou à un tarif inférieur, et en informe l’entreprise. À défaut de remplaçant disponible, l’équipe Standby recherche une solution ; seules les heures effectivement réalisées sont facturées.",
    ],
  },
  {
    title: "Validation des heures",
    body: [
      "À l’issue de l’événement, l’entreprise valide ou ajuste les heures effectuées par chaque commercial. Sans réponse sous trois jours, les heures déclarées sont réputées validées.",
      "Lorsque l’entreprise retient moins d’heures que déclaré, le commercial dispose de 48 heures pour accepter l’ajustement ou le contester ; sans réponse, l’ajustement est retenu. En cas de contestation, l’équipe Standby arbitre au vu des éléments des deux parties et sa décision fixe les heures facturées.",
      "Les heures validées servent de base à la facturation et à la paie, versée chaque lundi pour la semaine travaillée.",
    ],
  },
  {
    title: "Modification et annulation",
    body: [
      "Toute modification ou annulation s’effectue depuis l’espace entreprise. Les frais d’annulation dépendent du délai entre l’annulation et le premier jour réservé (montage compris) :",
      cancellation,
      "Le pourcentage s’applique à la rémunération prévue des commerciaux ayant accepté leur mission à la date d’annulation, majorée des frais de service et de la TVA ; ces commerciaux reçoivent la même proportion de leur rémunération à titre d’indemnité. Le barème applicable est celui en vigueur à la confirmation de la réservation. Le montant exact est affiché avant toute annulation. [Barème à valider juridiquement.]",
    ],
  },
  { title: "Réclamations", body: ["Toute réclamation relative à une prestation doit être adressée via la page {Contact|/contact} dans un délai de [délai] jours suivant la fin de l’événement."] },
  { title: "Droit applicable", body: ["Les présentes conditions sont soumises au droit français. En cas de litige, et à défaut d’accord amiable, les tribunaux compétents sont ceux du ressort du siège de l’éditeur."] },
];

export const CONFIDENTIALITE: DocSection[] = [
  {
    title: "Responsable du traitement",
    body: ["[Raison sociale], [adresse], est responsable du traitement des données collectées sur la plateforme standby. Délégué à la protection des données : [nom ou adresse e-mail dédiée]."],
  },
  {
    title: "Données collectées",
    body: [
      [
        "**Entreprises** : raison sociale, SIRET, secteur, site web, page LinkedIn, plaquette, coordonnées professionnelles des référents, format de remontée des leads.",
        "**Commerciaux** : identité, ville, postes, spécialités, langues, tarif, tailles de tenue, statut d’indépendant, pièce d’identité, attestation URSSAF, RIB.",
        "**Utilisation du site** : données de connexion et traceurs, selon vos choix (voir la {politique de cookies|/cookies}).",
      ],
    ],
  },
  {
    title: "Finalités et bases légales",
    body: [
      [
        "Gestion des comptes, réservations, missions, facturation et paie : exécution du contrat.",
        "Vérification des profils, prévention de la fraude, obligations comptables et sociales : obligation légale et intérêt légitime.",
        "Mesure d’audience et amélioration du service : consentement.",
      ],
    ],
  },
  {
    title: "Leads et cartes de visite",
    body: [
      "Les contacts recueillis par les commerciaux sur un stand sont des données de l’entreprise exposante. standby les traite pour son compte, en tant que sous-traitant : contrôle du format, saisie des cartes de visite (lecture automatique puis vérification humaine), restitution dans le template ou le CRM de l’entreprise. L’entreprise reste responsable de l’information des personnes concernées.",
    ],
  },
  {
    title: "Destinataires",
    body: [
      "Les données sont accessibles aux équipes habilitées de standby, aux entreprises exposantes et aux commerciaux pour les seules missions concernées, et à nos prestataires techniques (hébergement, base de données, e-mails, lecture des cartes), de paiement et de paie dans la limite de leurs missions. Elles ne sont jamais vendues.",
    ],
  },
  {
    title: "Durées de conservation",
    body: [
      "Comptes : pendant la relation contractuelle puis [durée], ou jusqu’à leur suppression par l’utilisateur. Pièces comptables : 10 ans, rattachées à un compte anonymisé en cas de suppression. Leads : supprimés automatiquement après la durée fixée par standby ([durée, 365 jours par défaut]). Traceurs : 13 mois maximum.",
    ],
  },
  {
    title: "Vos droits",
    body: [
      "Vous disposez des droits d’accès, de rectification, d’effacement, d’opposition, de limitation et de portabilité, ainsi que du droit de définir des directives post-mortem. Depuis la page {Mes données personnelles|/compte}, vous téléchargez vos données et supprimez votre compte vous-même. Pour toute autre demande : [adresse e-mail]. Vous pouvez introduire une réclamation auprès de la CNIL (cnil.fr).",
    ],
  },
  {
    title: "Sécurité",
    body: ["Les échanges sont chiffrés, les accès sont limités par profil et les documents sensibles sont stockés séparément. Les incidents de sécurité sont notifiés conformément à la réglementation."],
  },
];

export const ACCESSIBILITE: DocSection[] = [
  {
    title: "État de conformité",
    body: ["Le site standby est **partiellement conforme** avec le référentiel général d’amélioration de l’accessibilité (RGAA), version 4.1. Taux de conformité : [xx %, après audit]."],
  },
  { title: "Contenus non accessibles", body: ["Les non-conformités et dérogations identifiées lors de l’audit seront listées ici : [à compléter après audit]."] },
  {
    title: "Établissement de cette déclaration",
    body: [
      "Cette déclaration a été établie le [date] sur la base d’un audit réalisé par [organisme ou auto-évaluation] portant sur un échantillon de pages représentatif : accueil, parcours de réservation, espaces entreprise et commercial, inscriptions, pages légales.",
      "Technologies utilisées : HTML, CSS, JavaScript. Environnement de test : [navigateurs et lecteurs d’écran].",
    ],
  },
  {
    title: "Retour d’information et contact",
    body: ["Si vous ne parvenez pas à accéder à un contenu ou à un service, vous pouvez nous contacter via la page {Contact|/contact} ou à l’adresse [adresse e-mail] pour être orienté vers une alternative accessible ou obtenir le contenu sous une autre forme."],
  },
  {
    title: "Voies de recours",
    body: [
      "Si vous constatez un défaut d’accessibilité vous empêchant d’accéder à un contenu ou à une fonctionnalité du site, que vous nous l’avez signalé et que vous n’avez pas obtenu de réponse satisfaisante, vous pouvez écrire au Défenseur des droits (formulaire en ligne sur defenseurdesdroits.fr, ou courrier gratuit sans affranchissement : Défenseur des droits, Libre réponse 71120, 75342 Paris CEDEX 07).",
    ],
  },
];

export const FAQ: { theme: string; items: [string, string][] }[] = [
  {
    theme: "Général",
    items: [
      ["Qu’est-ce que standby ?", "Une plateforme qui permet aux entreprises de réserver une équipe pour leur stand sur un salon ou une foire, et aux commerciaux, hôtes·ses, animateurs et interprètes de trouver des missions."],
      ["Quels événements sont couverts ?", "Les salons professionnels et les foires en France, avec leurs dates de montage, d’ouverture et de démontage."],
    ],
  },
  {
    theme: "Entreprises exposantes",
    items: [
      ["Comment réserver une équipe ?", "Choisissez l’événement, les jours et les postes, rédigez votre brief, sélectionnez les profils puis validez le devis. Chaque commercial reçoit sa mission et l’accepte."],
      ["Comment est calculé le prix ?", "Taux horaire du profil × heures facturées par jour × nombre de jours, plus les frais de service. Le devis hors taxes est affiché avant toute confirmation."],
      ["Puis-je modifier ou annuler une réservation ?", "Oui, depuis votre {espace entreprise|/entreprise}. Les conditions dépendent du délai de prévenance, voir les {conditions générales de vente|/cgv}."],
    ],
  },
  {
    theme: "Commerciaux, hôtes·ses et animateurs",
    items: [
      ["Comment postuler à une mission ?", "Créez votre compte, renseignez vos postes, spécialités et langues, puis acceptez les missions qui vous correspondent. Le tarif horaire est affiché avant de postuler."],
      ["Quels documents dois-je fournir ?", "Une pièce d’identité, votre attestation de statut d’indépendant (URSSAF) et un RIB, pour vérifier votre profil et vous payer."],
    ],
  },
  {
    theme: "Leads et cartes de visite",
    items: [["Comment remonter mes leads ?", "Déposez votre fichier Excel ou prenez en photo les cartes de visite depuis l’{espace commercial|/commercial}. Le format de l’entreprise est contrôlé avant l’envoi."]],
  },
  {
    theme: "Paie et facturation",
    items: [
      ["Quand suis-je payé·e ?", "Chaque lundi, pour les heures validées de la semaine travaillée."],
      ["Où trouver ma facture ?", "Une facture unique par événement est disponible dans l’espace entreprise après validation des heures."],
    ],
  },
];
