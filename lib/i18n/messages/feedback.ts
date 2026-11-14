import { DOCUMENT_TYPES, ROLES, type DocumentKey, type RoleKey } from "@/lib/domain";
import type { Lang } from "../config";
import { domainLabels } from "./domain";

// Erreurs des services et confirmations des actions. Le code les écrit en français ;
// ce catalogue, indexé sur ce texte (comme gettext), fournit l'anglais et l'espagnol.
// Un message absent du catalogue s'affiche en français. L'espace admin reste en français.

type Tr = { en: string; es: string };

const EXACT: Record<string, Tr> = {
  // comptes et connexion
  "Adresse e-mail invalide.": { en: "Invalid e-mail address.", es: "Correo electrónico no válido." },
  "E-mail ou mot de passe incorrect.": { en: "Incorrect e-mail or password.", es: "Correo o contraseña incorrectos." },
  "Session expirée : reconnectez-vous.": { en: "Session expired: please log in again.", es: "Sesión caducada: vuelva a iniciar sesión." },
  "Terminez d’abord l’étape précédente.": { en: "Complete the previous step first.", es: "Complete primero el paso anterior." },
  "Compte introuvable.": { en: "Account not found.", es: "Cuenta no encontrada." },
  "Un compte existe déjà avec cet e-mail. Connectez-vous.": { en: "An account already exists with this e-mail. Please log in.", es: "Ya existe una cuenta con este correo. Inicie sesión." },
  "Cette adresse est déjà utilisée par un autre compte.": { en: "This address is already used by another account.", es: "Esta dirección ya la utiliza otra cuenta." },
  "C’est déjà l’adresse de votre compte.": { en: "This is already your account address.", es: "Esta ya es la dirección de su cuenta." },
  "Votre adresse est déjà confirmée.": { en: "Your address is already confirmed.", es: "Su dirección ya está confirmada." },
  "Nouveau lien envoyé. Pensez à vérifier vos courriers indésirables.": { en: "New link sent. Remember to check your spam folder.", es: "Nuevo enlace enviado. Revise también la carpeta de correo no deseado." },
  "Confirmez d’abord votre adresse e-mail : le lien vous a été envoyé à l’inscription (vous pouvez le renvoyer depuis le bandeau en haut de page).": {
    en: "Please confirm your e-mail address first: the link was sent when you signed up (you can resend it from the banner at the top of the page).",
    es: "Confirme primero su correo electrónico: el enlace se le envió al registrarse (puede reenviarlo desde el aviso en la parte superior de la página).",
  },
  "Vous êtes connecté·e avec un autre type de compte. Déconnectez-vous d’abord.": { en: "You are logged in with another kind of account. Log out first.", es: "Ha iniciado sesión con otro tipo de cuenta. Cierre la sesión primero." },
  "Si un compte existe pour cette adresse, un lien de réinitialisation vient d’être envoyé.": { en: "If an account exists for this address, a reset link has just been sent.", es: "Si existe una cuenta con esta dirección, acabamos de enviar un enlace de restablecimiento." },
  "Le mot de passe doit contenir au moins 10 caractères.": { en: "The password must be at least 10 characters long.", es: "La contraseña debe tener al menos 10 caracteres." },
  "Le nouveau mot de passe doit contenir au moins 10 caractères.": { en: "The new password must be at least 10 characters long.", es: "La nueva contraseña debe tener al menos 10 caracteres." },
  "Les deux mots de passe ne correspondent pas.": { en: "The two passwords do not match.", es: "Las dos contraseñas no coinciden." },
  "Les deux nouveaux mots de passe ne correspondent pas.": { en: "The two new passwords do not match.", es: "Las dos contraseñas nuevas no coinciden." },
  "Choisissez un mot de passe différent de l’actuel.": { en: "Choose a password different from the current one.", es: "Elija una contraseña distinta de la actual." },
  "Mise à jour du mot de passe impossible.": { en: "The password could not be updated.", es: "No se ha podido actualizar la contraseña." },
  "Mise à jour de l’adresse impossible.": { en: "The address could not be updated.", es: "No se ha podido actualizar la dirección." },
  "Création du compte impossible.": { en: "The account could not be created.", es: "No se ha podido crear la cuenta." },
  "Un compte existe déjà avec cet e-mail.": { en: "An account already exists with this e-mail.", es: "Ya existe una cuenta con este correo." },
  "Mot de passe actuel incorrect.": { en: "Incorrect current password.", es: "Contraseña actual incorrecta." },
  "Mot de passe incorrect.": { en: "Incorrect password.", es: "Contraseña incorrecta." },
  "Mot de passe modifié. Vos autres appareils ont été déconnectés.": { en: "Password changed. Your other devices have been logged out.", es: "Contraseña modificada. Se ha cerrado la sesión en sus otros dispositivos." },
  "Lien expiré ou déjà utilisé. Faites une nouvelle demande.": { en: "Link expired or already used. Please make a new request.", es: "Enlace caducado o ya utilizado. Haga una nueva solicitud." },
  "Lien expiré ou déjà utilisé. Refaites la demande depuis votre compte.": { en: "Link expired or already used. Request it again from your account.", es: "Enlace caducado o ya utilizado. Vuelva a solicitarlo desde su cuenta." },
  "Lien expiré ou invalide. Demandez un nouveau lien depuis votre espace.": { en: "Link expired or invalid. Request a new one from your dashboard.", es: "Enlace caducado o no válido. Solicite uno nuevo desde su espacio." },
  "Lien expiré ou invalide. Refaites la demande depuis votre compte.": { en: "Link expired or invalid. Request it again from your account.", es: "Enlace caducado o no válido. Vuelva a solicitarlo desde su cuenta." },
  "Recopiez exactement votre adresse e-mail pour confirmer la suppression.": { en: "Type your e-mail address exactly to confirm the deletion.", es: "Escriba exactamente su correo electrónico para confirmar la eliminación." },
  "Merci d’accepter les conditions générales d’utilisation.": { en: "Please accept the terms of use.", es: "Acepte las condiciones generales de uso." },
  "Indiquez votre prénom et votre nom.": { en: "Enter your first and last name.", es: "Indique su nombre y apellidos." },
  "Indiquez votre ville.": { en: "Enter your city.", es: "Indique su ciudad." },
  "Un compte administrateur se supprime par un autre administrateur, pas depuis cette page.": { en: "An administrator account is deleted by another administrator, not from this page.", es: "Una cuenta de administrador la elimina otro administrador, no desde esta página." },
  "Un paiement est en attente : réglez-le avant de supprimer le compte.": { en: "A payment is pending: settle it before deleting the account.", es: "Hay un pago pendiente: abónelo antes de eliminar la cuenta." },
  "Un remboursement est en cours : la suppression sera possible une fois le remboursement reçu.": { en: "A refund is in progress: deletion will be possible once it has been received.", es: "Hay un reembolso en curso: podrá eliminar la cuenta cuando lo haya recibido." },
  "Un virement vous est encore dû : la suppression sera possible après son versement.": { en: "A payout is still due to you: deletion will be possible once it has been paid.", es: "Todavía se le debe una transferencia: podrá eliminar la cuenta cuando se haya abonado." },
  "Suppression de l’identité impossible.": { en: "The identity could not be deleted.", es: "No se ha podido eliminar la identidad." },

  // entreprise
  "SIRET invalide : 14 chiffres, vérifiez la saisie.": { en: "Invalid SIRET: 14 digits, please check.", es: "SIRET no válido: 14 cifras, compruébelo." },
  "Ce SIRET est introuvable dans le répertoire SIRENE : vérifiez la saisie.": { en: "This SIRET is not in the SIRENE register: please check.", es: "Este SIRET no figura en el registro SIRENE: compruébelo." },
  "Ce SIRET est introuvable dans le répertoire SIRENE.": { en: "This SIRET is not in the SIRENE register.", es: "Este SIRET no figura en el registro SIRENE." },
  "Ce SIRET correspond à un établissement fermé dans le répertoire SIRENE.": { en: "This SIRET belongs to an establishment listed as closed in the SIRENE register.", es: "Este SIRET corresponde a un establecimiento cerrado en el registro SIRENE." },
  "Indiquez la raison sociale.": { en: "Enter the company name.", es: "Indique la razón social." },
  "Indiquez l’adresse de facturation complète : numéro, rue, code postal et ville.": { en: "Enter the full billing address: number, street, postcode and city.", es: "Indique la dirección de facturación completa: número, calle, código postal y ciudad." },
  "Numéro de TVA intracommunautaire invalide (ex. FR12 834521907).": { en: "Invalid EU VAT number (e.g. FR12 834521907).", es: "Número de IVA intracomunitario no válido (p. ej. FR12 834521907)." },
  "Numéro de TVA intracommunautaire invalide : FR suivi de 11 caractères.": { en: "Invalid EU VAT number: FR followed by 11 characters.", es: "Número de IVA intracomunitario no válido: FR seguido de 11 caracteres." },
  "Ajoutez au moins un référent.": { en: "Add at least one contact.", es: "Añada al menos un responsable." },
  "Référent inconnu.": { en: "Unknown contact.", es: "Responsable desconocido." },
  "Indiquez le nom et le téléphone du référent sur place.": { en: "Enter the name and phone number of the on-site contact.", es: "Indique el nombre y el teléfono del responsable in situ." },
  "Déposez votre template Excel ou listez au moins deux colonnes.": { en: "Upload your Excel template or list at least two columns.", es: "Suba su plantilla Excel o indique al menos dos columnas." },
  "Indiquez l’e-mail de l’administrateur CRM.": { en: "Enter the CRM administrator’s e-mail.", es: "Indique el correo del administrador del CRM." },
  "Seul HubSpot est connecté pour l’instant.": { en: "Only HubSpot can be connected for now.", es: "Por ahora solo se puede conectar HubSpot." },
  "Format de leads inconnu.": { en: "Unknown lead format.", es: "Formato de leads desconocido." },
  "Société mise à jour.": { en: "Company updated.", es: "Empresa actualizada." },
  "Site, LinkedIn et plaquette mis à jour.": { en: "Website, LinkedIn and brochure updated.", es: "Sitio web, LinkedIn y folleto actualizados." },
  "Référents mis à jour.": { en: "Contacts updated.", es: "Responsables actualizados." },
  "Format des leads mis à jour.": { en: "Lead format updated.", es: "Formato de leads actualizado." },
  "Logo retiré.": { en: "Logo removed.", es: "Logotipo eliminado." },

  // réservation
  "Choisissez un événement.": { en: "Choose an event.", es: "Elija un evento." },
  "Salon introuvable.": { en: "Event not found.", es: "Feria no encontrada." },
  "Réservation introuvable.": { en: "Booking not found.", es: "Reserva no encontrada." },
  "Choisissez au moins un jour.": { en: "Choose at least one day.", es: "Elija al menos un día." },
  "Choisissez au moins un poste.": { en: "Choose at least one role.", es: "Elija al menos un puesto." },
  "Dates invalides (format AAAA-MM-JJ, fin après début).": { en: "Invalid dates (YYYY-MM-DD format, end after start).", es: "Fechas no válidas (formato AAAA-MM-DD, fin posterior al inicio)." },
  "20 personnes maximum par poste.": { en: "20 people maximum per role.", es: "20 personas como máximo por puesto." },
  "Poste inconnu.": { en: "Unknown role.", es: "Puesto desconocido." },
  "Ce poste n’est pas demandé.": { en: "This role is not requested.", es: "Este puesto no se ha solicitado." },
  "Vérifiez les horaires de service.": { en: "Please check the working hours.", es: "Compruebe el horario de servicio." },
  "Le montage doit précéder l’ouverture.": { en: "Set-up must come before opening time.", es: "El montaje debe ser anterior a la apertura." },
  "Ajoutez au moins une personne sur le stand.": { en: "Add at least one person on the booth.", es: "Añada al menos una persona en el stand." },
  "Ce profil n’est plus disponible sur vos dates.": { en: "This profile is no longer available on your dates.", es: "Este perfil ya no está disponible en sus fechas." },
  "Cette réservation est déjà envoyée : elle ne peut plus être modifiée ici.": { en: "This booking has already been sent: it can no longer be changed here.", es: "Esta reserva ya se ha enviado: ya no se puede modificar aquí." },
  "Merci d’accepter les conditions de prestation pour confirmer.": { en: "Please accept the terms of service to confirm.", es: "Acepte las condiciones de servicio para confirmar." },
  "Paiement en ligne non configuré.": { en: "Online payment is not set up.", es: "El pago en línea no está configurado." },
  "Carte déjà saisie.": { en: "Card already entered.", es: "Tarjeta ya registrada." },
  "Carte introuvable.": { en: "Card not found.", es: "Tarjeta no encontrada." },
  "Carte saisie.": { en: "Card saved.", es: "Tarjeta registrada." },
  "Cochez la case pour accepter les frais d’annulation.": { en: "Tick the box to accept the cancellation fees.", es: "Marque la casilla para aceptar los gastos de cancelación." },
  "Cochez la case pour confirmer l’annulation.": { en: "Tick the box to confirm the cancellation.", es: "Marque la casilla para confirmar la cancelación." },
  "Cette réservation ne peut plus être annulée en ligne : contactez-nous.": { en: "This booking can no longer be cancelled online: please contact us.", es: "Esta reserva ya no se puede cancelar en línea: contáctenos." },
  "Réservation annulée.": { en: "Booking cancelled.", es: "Reserva cancelada." },
  "réservation non envoyée": { en: "booking not sent", es: "reserva no enviada" },
  "Aucun moyen de paiement enregistré": { en: "No payment method registered", es: "Ningún medio de pago registrado" },
  "Mandat révoqué": { en: "Mandate revoked", es: "Mandato revocado" },
  "Paiement relancé.": { en: "Payment retried.", es: "Pago reintentado." },
  "Facture introuvable.": { en: "Invoice not found.", es: "Factura no encontrada." },
  "Avoir introuvable.": { en: "Credit note not found.", es: "Factura rectificativa no encontrada." },
  "Indiquez l’adresse de facturation de votre société dans votre profil entreprise.": { en: "Enter your company’s billing address in your company profile.", es: "Indique la dirección de facturación de su empresa en su perfil de empresa." },
  "Choisissez l’événement et les jours.": { en: "Choose the event and the days.", es: "Elija el evento y los días." },
  "Composez l’équipe.": { en: "Build the team.", es: "Forme el equipo." },
  "Indiquez le référent sur place dans le brief.": { en: "Enter the on-site contact in the brief.", es: "Indique el responsable in situ en el briefing." },

  // heures et avis
  "Heures invalides : indiquez par exemple 8 ou 7:30.": { en: "Invalid hours: enter for example 8 or 7:30.", es: "Horas no válidas: indique por ejemplo 8 o 7:30." },
  "Heures invalides : indiquez par exemple 16 ou 15:30.": { en: "Invalid hours: enter for example 16 or 15:30.", es: "Horas no válidas: indique por ejemplo 16 o 15:30." },
  "Heures invalides (14 h maximum par jour).": { en: "Invalid hours (14 h maximum per day).", es: "Horas no válidas (14 h como máximo por día)." },
  "Total d’heures invalide.": { en: "Invalid total hours.", es: "Total de horas no válido." },
  "Les heures se déclarent pendant ou après l’événement.": { en: "Hours are declared during or after the event.", es: "Las horas se declaran durante o después del evento." },
  "Les heures ne sont pas encore à valider.": { en: "The hours are not ready for approval yet.", es: "Las horas todavía no están listas para validar." },
  "Ces heures attendent la réponse du commercial ou l’arbitrage de l’équipe Stand-By.": { en: "These hours are awaiting the freelancer’s answer or a decision by the Stand-By team.", es: "Estas horas esperan la respuesta del comercial o el arbitraje del equipo Stand-By." },
  "Aucun ajustement n’attend votre réponse.": { en: "No adjustment is awaiting your answer.", es: "Ningún ajuste espera su respuesta." },
  "Indiquez ce qui est à corriger.": { en: "Say what needs correcting.", es: "Indique lo que hay que corregir." },
  "Expliquez ce qui ne va pas : horaires réels, pauses, consignes reçues sur place…": { en: "Explain what is wrong: actual hours, breaks, instructions received on site…", es: "Explique qué no es correcto: horario real, pausas, instrucciones recibidas in situ…" },
  "Heures déclarées. L’exposant les valide après l’événement.": { en: "Hours declared. The exhibitor approves them after the event.", es: "Horas declaradas. El expositor las valida después del evento." },
  "Heures validées.": { en: "Hours approved.", es: "Horas validadas." },
  "Ajustement envoyé : le commercial a 48 h pour l’accepter ou le contester.": { en: "Adjustment sent: the freelancer has 48 h to accept or dispute it.", es: "Ajuste enviado: el comercial tiene 48 h para aceptarlo o impugnarlo." },
  "Ajustement accepté : la paie part après la facturation de l’exposant.": { en: "Adjustment accepted: payment is sent once the exhibitor has been invoiced.", es: "Ajuste aceptado: el pago se envía tras la facturación al expositor." },
  "Contestation envoyée : l’équipe Stand-By arbitre et vous tient informé·e.": { en: "Dispute sent: the Stand-By team will decide and keep you informed.", es: "Impugnación enviada: el equipo Stand-By arbitrará y le mantendrá informado/a." },
  "Choisissez une note de 1 à 5.": { en: "Choose a rating from 1 to 5.", es: "Elija una nota de 1 a 5." },
  "Vous avez déjà noté cette personne pour cet événement.": { en: "You have already rated this person for this event.", es: "Ya ha valorado a esta persona para este evento." },
  "Vous pourrez noter l’équipe une fois les heures validées.": { en: "You can rate the team once the hours are approved.", es: "Podrá valorar al equipo cuando se validen las horas." },
  "Merci, votre avis est publié.": { en: "Thank you, your review is published.", es: "Gracias, su valoración se ha publicado." },

  // missions
  "Mission introuvable.": { en: "Assignment not found.", es: "Misión no encontrada." },
  "Cette mission n’attend plus de réponse.": { en: "This assignment is no longer awaiting an answer.", es: "Esta misión ya no espera respuesta." },
  "Mission acceptée. L’exposant est prévenu.": { en: "Assignment accepted. The exhibitor has been notified.", es: "Misión aceptada. Se ha avisado al expositor." },
  "Mission refusée.": { en: "Assignment declined.", es: "Misión rechazada." },
  "Seule une mission acceptée peut faire l’objet d’un désistement.": { en: "Only an accepted assignment can be withdrawn from.", es: "Solo puede renunciar a una misión aceptada." },
  "Cochez la case pour confirmer votre désistement.": { en: "Tick the box to confirm your withdrawal.", es: "Marque la casilla para confirmar su renuncia." },
  "Expliquez en quelques mots la raison de votre désistement.": { en: "Explain in a few words why you are withdrawing.", es: "Explique en pocas palabras el motivo de su renuncia." },
  "L’événement a commencé : appelez l’équipe Stand-By pour signaler votre absence.": { en: "The event has started: call the Stand-By team to report your absence.", es: "El evento ha comenzado: llame al equipo Stand-By para comunicar su ausencia." },
  "Désistement enregistré : un remplaçant a reçu la mission et l’exposant est prévenu.": { en: "Withdrawal recorded: a replacement has received the assignment and the exhibitor has been notified.", es: "Renuncia registrada: un sustituto ha recibido la misión y se ha avisado al expositor." },
  "Désistement enregistré. Aucun remplaçant n’est libre pour l’instant : l’équipe Stand-By prend le relais auprès de l’exposant.": {
    en: "Withdrawal recorded. No replacement is available right now: the Stand-By team is taking over with the exhibitor.",
    es: "Renuncia registrada. No hay ningún sustituto disponible por ahora: el equipo Stand-By se encarga de hablar con el expositor.",
  },

  // profil commercial et documents
  "Choisissez au moins une langue.": { en: "Choose at least one language.", es: "Elija al menos un idioma." },
  "Choisissez au moins une spécialité.": { en: "Choose at least one specialty.", es: "Elija al menos una especialidad." },
  "Acceptez le mandat de facturation : Stand-By émet vos factures à votre place après chaque mission.": {
    en: "Accept the billing mandate: Stand-By issues your invoices on your behalf after each assignment.",
    es: "Acepte el mandato de facturación: Stand-By emite sus facturas en su nombre después de cada misión.",
  },
  "Indiquez la date de délivrance de l’attestation URSSAF.": { en: "Enter the issue date of the URSSAF certificate.", es: "Indique la fecha de expedición del certificado URSSAF." },
  "Indiquez la date de délivrance de l’attestation pour la valider.": { en: "Enter the certificate issue date to approve it.", es: "Indique la fecha de expedición del certificado para validarlo." },
  "La date de délivrance de l’attestation ne peut pas être dans le futur.": { en: "The certificate issue date cannot be in the future.", es: "La fecha de expedición del certificado no puede ser futura." },
  "Cette attestation a plus de 6 mois : téléchargez une attestation de vigilance à jour sur urssaf.fr.": {
    en: "This certificate is more than 6 months old: download an up-to-date “attestation de vigilance” from urssaf.fr.",
    es: "Este certificado tiene más de 6 meses: descargue una «attestation de vigilance» actualizada en urssaf.fr.",
  },
  "Document introuvable.": { en: "Document not found.", es: "Documento no encontrado." },
  "Document reçu : il sera vérifié par l’équipe.": { en: "Document received: the team will check it.", es: "Documento recibido: el equipo lo revisará." },
  "Profil mis à jour.": { en: "Profile updated.", es: "Perfil actualizado." },
  "Postes, langues, tarif et tailles mis à jour.": { en: "Roles, languages, rate and sizes updated.", es: "Puestos, idiomas, tarifa y tallas actualizados." },
  "Informations de facturation enregistrées.": { en: "Billing details saved.", es: "Datos de facturación guardados." },
  "Virements activés (mode simulé : aucun compte Stripe configuré).": { en: "Payouts enabled (simulated mode: no Stripe account configured).", es: "Transferencias activadas (modo simulado: ninguna cuenta de Stripe configurada)." },
  "Établissement fermé selon le répertoire SIRENE": { en: "Establishment closed according to the SIRENE register", es: "Establecimiento cerrado según el registro SIRENE" },

  // fichiers et leads
  "Choisissez un fichier.": { en: "Choose a file.", es: "Elija un archivo." },
  "Choisissez un fichier Excel (.xlsx).": { en: "Choose an Excel file (.xlsx).", es: "Elija un archivo Excel (.xlsx)." },
  "Choisissez un fichier CSV.": { en: "Choose a CSV file.", es: "Elija un archivo CSV." },
  "Fichier trop volumineux (20 Mo maximum).": { en: "File too large (20 MB maximum).", es: "Archivo demasiado grande (20 MB como máximo)." },
  "Fichier illisible : déposez un fichier Excel (.xlsx).": { en: "Unreadable file: upload an Excel file (.xlsx).", es: "Archivo ilegible: suba un archivo Excel (.xlsx)." },
  "Le fichier est vide.": { en: "The file is empty.", es: "El archivo está vacío." },
  "Le fichier ne contient aucune feuille.": { en: "The file contains no sheet.", es: "El archivo no contiene ninguna hoja." },
  "Aucune ligne de lead dans le fichier.": { en: "No lead rows in the file.", es: "El archivo no contiene ninguna fila de leads." },
  "Aucune colonne ne correspond au format de l’entreprise. Vérifiez la première ligne du fichier.": {
    en: "No column matches the company’s format. Check the first row of the file.",
    es: "Ninguna columna coincide con el formato de la empresa. Compruebe la primera fila del archivo.",
  },
  "Ajoutez au moins une photo.": { en: "Add at least one photo.", es: "Añada al menos una foto." },
  "50 photos maximum par envoi.": { en: "50 photos maximum per upload.", es: "50 fotos como máximo por envío." },
  "Déposez d’abord un fichier Excel ou des photos de cartes.": { en: "First upload an Excel file or photos of business cards.", es: "Suba primero un archivo Excel o fotos de tarjetas." },

  // contact
  "Indiquez votre nom et une adresse e-mail valide.": { en: "Enter your name and a valid e-mail address.", es: "Indique su nombre y un correo electrónico válido." },
  "Votre message est trop court.": { en: "Your message is too short.", es: "Su mensaje es demasiado corto." },
  "Message envoyé. Nous vous répondons par e-mail en jours ouvrés.": { en: "Message sent. We reply by e-mail on business days.", es: "Mensaje enviado. Le respondemos por correo en días laborables." },

  "Une erreur est survenue. Réessayez dans un instant ou contactez-nous.": { en: "Something went wrong. Try again in a moment or contact us.", es: "Se ha producido un error. Vuelva a intentarlo en un momento o contáctenos." },
};

const roleByShort = (short: string) => (Object.keys(ROLES) as RoleKey[]).find((k) => ROLES[k].short === short);
const docKeys = (list: string) =>
  list.split(", ").map((label) => (Object.keys(DOCUMENT_TYPES) as DocumentKey[]).find((k) => DOCUMENT_TYPES[k] === label));

// messages avec une partie variable : expression sur le texte français → traduction
const PATTERNS: [RegExp, (m: RegExpMatchArray, lang: "en" | "es") => string][] = [
  [
    /^Les (\d+) places « (.+) » sont prises : retirez d’abord un profil\.$/,
    (m, l) => {
      const k = roleByShort(m[2]);
      const role = k ? domainLabels(l).role(k).short : m[2];
      return l === "en" ? `All ${m[1]} “${role}” places are taken: remove a profile first.` : `Las ${m[1]} plazas de «${role}» están ocupadas: retire primero un perfil.`;
    },
  ],
  [
    /^Sélectionnez (\d+) profil\(s\) « (.+) »\.$/,
    (m, l) => {
      const k = roleByShort(m[2]);
      const role = k ? domainLabels(l).role(k).short : m[2];
      return l === "en" ? `Select ${m[1]} “${role}” profile(s).` : `Seleccione ${m[1]} perfil(es) de «${role}».`;
    },
  ],
  // délais du barème d'annulation (lib/cancellation.ts)
  [/^(\d+) jours ou plus avant l’événement$/, (m, l) => (l === "en" ? `${m[1]} days or more before the event` : `${m[1]} días o más antes del evento`)],
  [/^(\d+) à (\d+) jours avant l’événement$/, (m, l) => (l === "en" ? `${m[1]} to ${m[2]} days before the event` : `de ${m[1]} a ${m[2]} días antes del evento`)],
  [
    /^moins de (\d+) jours avant l’événement ou événement commencé$/,
    (m, l) => (l === "en" ? `less than ${m[1]} days before the event, or event started` : `menos de ${m[1]} días antes del evento, o evento ya iniciado`),
  ],
  [/^Tarif minimum pour ce poste : (.+)\.$/, (m, l) => (l === "en" ? `Minimum rate for this role: ${m[1]}.` : `Tarifa mínima para este puesto: ${m[1]}.`)],
  [
    /^Documents manquants : (.+)\.$/,
    (m, l) => {
      const keys = docKeys(m[1]);
      const names = keys.every(Boolean) ? keys.map((k) => domainLabels(l).document(k!)).join(", ") : m[1];
      return l === "en" ? `Missing documents: ${names}.` : `Documentos que faltan: ${names}.`;
    },
  ],
  [/^Adresse web invalide : (.+)$/, (m, l) => (l === "en" ? `Invalid web address: ${m[1]}` : `Dirección web no válida: ${m[1]}`)],
  [/^Format non accepté\. Formats acceptés : (.+)\.$/, (m, l) => (l === "en" ? `Format not accepted. Accepted formats: ${m[1]}.` : `Formato no admitido. Formatos admitidos: ${m[1]}.`)],
  [
    /^Lien de confirmation envoyé à (.+)\. Votre adresse actuelle reste valable jusqu’à la confirmation\.$/,
    (m, l) =>
      l === "en"
        ? `Confirmation link sent to ${m[1]}. Your current address stays valid until you confirm.`
        : `Enlace de confirmación enviado a ${m[1]}. Su dirección actual sigue siendo válida hasta la confirmación.`,
  ],
  [/^Réservations en cours : (.+)\. Annulez-les ou attendez leur règlement\.$/, (m, l) => (l === "en" ? `Bookings in progress: ${m[1]}. Cancel them or wait until they are settled.` : `Reservas en curso: ${m[1]}. Cancélelas o espere a que se liquiden.`)],
  [/^Missions acceptées en cours : (.+)\.$/, (m, l) => (l === "en" ? `Accepted assignments in progress: ${m[1]}.` : `Misiones aceptadas en curso: ${m[1]}.`)],
  [/^Attestation URSSAF expirée le (.+)$/, (m, l) => (l === "en" ? `URSSAF certificate expired on ${m[1]}` : `Certificado URSSAF caducado el ${m[1]}`)],
  [
    /^(\d+) lignes lues · (\d+)\/(\d+) colonnes reconnues\.$/,
    (m, l) => (l === "en" ? `${m[1]} rows read · ${m[2]}/${m[3]} columns recognised.` : `${m[1]} filas leídas · ${m[2]}/${m[3]} columnas reconocidas.`),
  ],
  [/^(\d+) carte\(s\) lue\(s\) automatiquement\.$/, (m, l) => (l === "en" ? `${m[1]} card(s) read automatically.` : `${m[1]} tarjeta(s) leída(s) automáticamente.`)],
  [
    /^(\d+) photo\(s\) reçue\(s\), (\d+) lue\(s\) automatiquement ; les autres sont saisies par l’équipe sous 24 h\.$/,
    (m, l) =>
      l === "en"
        ? `${m[1]} photo(s) received, ${m[2]} read automatically; the team enters the others within 24 h.`
        : `${m[1]} foto(s) recibida(s), ${m[2]} leída(s) automáticamente; el equipo introduce las demás en 24 h.`,
  ],
  [
    /^(\d+) photo\(s\) reçue\(s\) : elles sont saisies par l’équipe sous 24 h\.$/,
    (m, l) => (l === "en" ? `${m[1]} photo(s) received: the team enters them within 24 h.` : `${m[1]} foto(s) recibida(s): el equipo las introduce en 24 h.`),
  ],
  [
    /^(\d+) lead\(s\) envoyé\(s\) à l’entreprise(?: ; (\d+) carte\(s\) de visite lui parviendront après saisie par l’équipe \(sous 24 h\))?\.$/,
    (m, l) =>
      l === "en"
        ? `${m[1]} lead(s) sent to the company${m[2] ? `; ${m[2]} business card(s) will follow once the team has entered them (within 24 h)` : ""}.`
        : `${m[1]} lead(s) enviado(s) a la empresa${m[2] ? `; ${m[2]} tarjeta(s) de visita le llegarán cuando el equipo las haya introducido (en 24 h)` : ""}.`,
  ],
  [
    /^Trop de tentatives\. Réessayez dans (\d+) minutes?\.$/,
    (m, l) => {
      const n = Number(m[1]);
      return l === "en" ? `Too many attempts. Try again in ${n} minute${n > 1 ? "s" : ""}.` : `Demasiados intentos. Vuelva a intentarlo dentro de ${n} minuto${n > 1 ? "s" : ""}.`;
    },
  ],
];

/** Texte français d'une erreur ou d'une confirmation → langue demandée. */
export function translateFeedback(fr: string, lang: Lang): string {
  if (lang === "fr") return fr;
  const exact = EXACT[fr];
  if (exact) return exact[lang];
  for (const [re, f] of PATTERNS) {
    const m = fr.match(re);
    if (m) return f(m, lang);
  }
  return fr;
}
