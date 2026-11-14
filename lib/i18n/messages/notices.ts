import { fmt } from "@/lib/format";
import type { Lang } from "../config";
import { domainLabels } from "./domain";

// Notifications et e-mails envoyés aux exposants et aux commerciaux, dans la langue de leur compte
// (profiles.locale). Les messages destinés à l'équipe Stand-By restent en français.

type F = ReturnType<typeof fmt>;
type DL = ReturnType<typeof domainLabels>;
type Text = { title: string; body: string };
type Stand = string | null;
type Sched = { event: string; city: string; startsOn: string; endsOn: string; stand: Stand };
const s = (n: number) => (n > 1 ? "s" : "");

const fr = (f: F, dl: DL) => ({
  open: "Ouvrir stand-by",
  footer: "Stand-By · salons professionnels et foires",
  newMission: (p: { event: string | null; role: string; days: number; rateCents: number }): Text => ({
    title: `Nouvelle mission : ${p.event ?? "salon"}`,
    body: `${dl.role(p.role).label} · ${p.days} jour(s) · ${f.hourly(p.rateCents)}. Acceptez ou refusez la mission depuis votre espace.`,
  }),
  bookingConfirmed: (p: { ref: string }): Text => ({ title: `Réservation ${p.ref} confirmée`, body: "Toute l’équipe a accepté. Rendez-vous au briefing J-2." }),
  missionAccepted: (p: { first: string; last: string; ref: string }): Text => ({
    title: `${p.first} a accepté la mission`,
    body: `${p.first} ${p.last} rejoint votre équipe (réf. ${p.ref}).`,
  }),
  missionDeclined: (p: { ref: string; first: string; score: number | null }): Text => ({
    title: `Mission refusée sur ${p.ref}`,
    body:
      p.score !== null
        ? `${p.first} n’est pas disponible. Un remplaçant noté ${p.score} % compatible a reçu la mission.`
        : `${p.first} n’est pas disponible et aucun remplaçant n’est libre pour l’instant : l’équipe Stand-By vous recontacte.`,
  }),
  missionOffered: (p: { role: string; days: number }): Text => ({
    title: "Nouvelle mission proposée",
    body: `${dl.role(p.role).label} · ${p.days} jour(s). Répondez sous 48 h depuis votre espace.`,
  }),
  hoursToValidate: (p: { ref: string }): Text => ({
    title: `Heures à valider (${p.ref})`,
    body: "L’événement est terminé. Vérifiez et validez les heures de votre équipe : la paie part le lundi suivant.",
  }),
  declareHours: (p: { ref: string }): Text => ({ title: "Déclarez vos heures", body: `Mission ${p.ref} terminée : déclarez vos heures.` }),
  withdrew: (p: { ref: string; first: string; last: string; score: number | null; rateCents: number | null }): Text => ({
    title: `${p.first} s’est désisté·e (${p.ref})`,
    body:
      p.score !== null
        ? `${p.first} ${p.last} ne pourra pas être présent·e. Un remplaçant compatible à ${p.score} %${p.rateCents ? ` (${f.hourly(p.rateCents)})` : ""} a reçu la mission : une notification vous attend dès son acceptation.`
        : `${p.first} ${p.last} ne pourra pas être présent·e et aucun profil n’est libre pour l’instant : l’équipe Stand-By cherche une solution et vous recontacte.`,
  }),
  documentToFix: (p: { doc: string; comment: string | null }): Text => ({
    title: "Un document est à corriger",
    body: `${dl.document(p.doc)} : ${p.comment || "document refusé"}. Déposez une nouvelle version depuis votre profil.`,
  }),
  invoiceAvailable: (p: { number: string; ref: string; ttcCents: number }): Text => ({
    title: `Facture ${p.number} disponible`,
    body: `Heures validées pour la réservation ${p.ref}. Montant TTC : ${f.eurosPrecise(p.ttcCents)}.`,
  }),
  rateTeam: (p: { ref: string }): Text => ({
    title: "Notez votre équipe",
    body: `Comment s’est passée la réservation ${p.ref} ? Vos avis aident les prochains exposants et les commerciaux.`,
  }),
  paymentRequired: (p: { ref: string }): Text => ({ title: "Moyen de paiement requis", body: `Enregistrez un mandat SEPA ou une carte pour régler la réservation ${p.ref}.` }),
  payoutScheduled: (p: { amountCents: number; ref: string; cancelled: boolean; monday: string }): Text => ({
    title: p.cancelled ? "Indemnité d’annulation programmée" : "Paie programmée",
    body: `${f.eurosPrecise(p.amountCents)} pour la mission ${p.ref}${p.cancelled ? " (annulée par l’exposant)" : ""}, virement le lundi ${f.longDate(p.monday)}.`,
  }),
  missionCancelled: (p: { ref: string; compensationCents: number | null }): Text => ({
    title: `Mission annulée (${p.ref})`,
    body: p.compensationCents
      ? `L’exposant a annulé cette réservation. Une indemnité de ${f.eurosPrecise(p.compensationCents)} vous sera versée après encaissement.`
      : "L’exposant a annulé cette réservation.",
  }),
  cancellationInvoice: (p: { number: string; ref: string; when: string; ttcCents: number; pct: number }): Text => ({
    title: `Facture d’annulation ${p.number}`,
    body: `Réservation ${p.ref} annulée ${p.when} : frais de ${f.eurosPrecise(p.ttcCents)} TTC (${p.pct} %).`,
  }),
  profileValidated: (): Text => ({
    title: "Votre profil est validé",
    body: "Vos documents sont vérifiés : votre profil est visible des exposants et vous recevrez vos premières missions.",
  }),
  urssafExpired: (p: { validUntil: string }): Text => ({
    title: "Attestation URSSAF expirée : profil suspendu",
    body: `Votre attestation a expiré le ${f.longDate(p.validUntil)}. Vous ne recevez plus de missions tant qu’une attestation à jour n’est pas validée. Téléchargez-la sur urssaf.fr puis déposez-la dans votre profil.`,
  }),
  urssafExpiring: (p: { left: number; validUntil: string }): Text => ({
    title: `Votre attestation URSSAF expire dans ${p.left} jour${s(p.left)}`,
    body: `Elle expire le ${f.longDate(p.validUntil)}. Téléchargez une attestation de vigilance à jour sur urssaf.fr et déposez-la dans votre profil pour continuer à recevoir des missions.`,
  }),
  siretClosed: (): Text => ({
    title: "Votre SIRET apparaît comme fermé",
    body: "Le répertoire SIRENE indique que votre établissement est fermé : vous ne recevez plus de missions. Contactez-nous si c’est une erreur.",
  }),
  creditNote: (p: { number: string; ttcCents: number; invoice: string; reason: string; paid: boolean }): Text => ({
    title: `Avoir ${p.number}`,
    body: `Avoir de ${f.eurosPrecise(p.ttcCents)} TTC sur la facture ${p.invoice} : ${p.reason}. ${
      p.paid ? "Le remboursement part sur votre moyen de paiement (comptez 5 à 10 jours ouvrés pour un prélèvement SEPA)." : "Ce montant est déduit du prélèvement à venir."
    }`,
  }),
  hoursAdjusted: (p: { ref: string; retained: number; declared: number; note: string | null; window: number }): Text => ({
    title: `Heures ajustées (${p.ref})`,
    body: `L’exposant a retenu ${f.hoursLabel(p.retained)} au lieu de ${f.hoursLabel(p.declared)}${p.note ? ` : « ${p.note} »` : ""}. Acceptez ou contestez sous ${p.window} h ; sans réponse, l’ajustement est retenu.`,
  }),
  hoursDisputed: (p: { first: string; ref: string; declared: number; retained: number; motive: string }): Text => ({
    title: `${p.first} conteste l’ajustement de ses heures (${p.ref})`,
    body: `${f.hoursLabel(p.declared)} déclarées, ${f.hoursLabel(p.retained)} retenues. Motif : « ${p.motive} ». L’équipe Stand-By arbitre avec vous deux ; la facture est émise après l’arbitrage.`,
  }),
  leadsReceived: (p: { leads: number; first: string; ref: string; pendingCards: number }): Text => ({
    title: p.leads ? `${p.leads} lead(s) reçus de ${p.first}` : `Cartes de visite reçues de ${p.first}`,
    body: `Réservation ${p.ref} : ${p.leads ? "les leads sont disponibles dans votre espace, au format de votre template." : ""}${
      p.pendingCards ? ` ${p.pendingCards} carte(s) de visite en cours de saisie par l’équipe Stand-By (sous 24 h).` : ""
    }`.trim(),
  }),
  teamIn: (p: Sched & { left: number; accepted: number; waiting: number }): Text => ({
    title: `Votre équipe dans ${p.left} jours`,
    body: `${p.event} · ${p.city} · ${f.dateRange(p.startsOn, p.endsOn)}${p.stand ? ` · stand ${p.stand}` : ""}. ${p.accepted} personne(s) confirmée(s)${
      p.waiting ? `, ${p.waiting} en attente de réponse : nous relançons et proposons un remplaçant si besoin` : ""
    }. Les badges exposants sont demandés à l’organisateur. Pensez à préparer le briefing de J-2.`,
  }),
  missionIn: (p: Sched & { left: number; startTime: string; endTime: string }): Text => ({
    title: `Mission dans ${p.left} jours : ${p.event}`,
    body: `${p.event} · ${p.city} · ${f.dateRange(p.startsOn, p.endsOn)}${p.stand ? ` · stand ${p.stand}` : ""}, ${f.timeLabel(p.startTime)} – ${f.timeLabel(p.endTime)}. Relisez le brief et la plaquette avant le briefing de J-2.`,
  }),
  briefingCompany: (p: { event: string; left: number; referent: string; contacts: string }): Text => ({
    title: `Briefing de votre équipe (${p.event}, ${when.fr(p.left)})`,
    body: `Organisez le briefing visio avec ${p.referent} et l’équipe : ${p.contacts || "aucun commercial confirmé pour l’instant"}.`,
  }),
  briefingFreelancer: (p: { event: string; left: number; referent: string; phone: string | null; startTime: string; endTime: string; stand: Stand }): Text => ({
    title: `Briefing J-2 : ${p.event} (${when.fr(p.left)})`,
    body: `Votre référent sur place : ${p.referent}${p.phone ? `, ${p.phone}` : ""}. Horaires : ${f.timeLabel(p.startTime)} – ${f.timeLabel(p.endTime)}${p.stand ? `, stand ${p.stand}` : ""}. Il vous contacte pour le briefing visio.`,
  }),
  newReview: (p: { rating: number; ref: string }): Text => ({ title: "Nouvel avis reçu", body: `Un exposant vous a attribué ${p.rating}/5 pour la mission ${p.ref}.` }),
  // e-mails de compte
  verifyEmail: (p: { first: string }) => ({
    subject: "Confirmez votre adresse e-mail stand-by",
    text: `Bonjour ${p.first},\n\nConfirmez votre adresse pour pouvoir réserver une équipe ou accepter des missions. Ce lien est valable 48 heures.`,
    link: "Confirmer mon adresse",
  }),
  resetPassword: () => ({
    subject: "Réinitialiser votre mot de passe stand-by",
    text: "Vous avez demandé à réinitialiser votre mot de passe. Ce lien est valable une heure.",
    link: "Choisir un nouveau mot de passe",
  }),
  passwordChanged: (p: { first: string }) => ({
    subject: "Votre mot de passe stand-by a été modifié",
    text: `Bonjour ${p.first},\n\nLe mot de passe de votre compte vient d’être modifié et vos autres appareils ont été déconnectés. Si vous n’êtes pas à l’origine de ce changement, réinitialisez-le immédiatement et contactez-nous.`,
    link: "Réinitialiser mon mot de passe",
  }),
  confirmNewEmail: (p: { first: string; old: string }) => ({
    subject: "Confirmez votre nouvelle adresse stand-by",
    text: `Bonjour ${p.first},\n\nConfirmez cette adresse pour vous connecter à stand-by avec elle, à la place de ${p.old}. Ce lien est valable 24 heures.`,
    link: "Confirmer ma nouvelle adresse",
  }),
  emailChangeRequested: (p: { first: string; to: string }) => ({
    subject: "Changement d’adresse e-mail demandé",
    text: `Bonjour ${p.first},\n\nUn changement d’adresse vers ${p.to} a été demandé depuis votre compte stand-by. Votre adresse actuelle reste valable tant que la nouvelle n’est pas confirmée. Si vous n’êtes pas à l’origine de cette demande, changez votre mot de passe et contactez-nous.`,
  }),
  emailChanged: (p: { first: string; to: string }) => ({
    subject: "Adresse e-mail modifiée",
    text: `Bonjour ${p.first},\n\nVotre compte stand-by utilise désormais l’adresse ${p.to}. Si vous n’êtes pas à l’origine de ce changement, contactez-nous immédiatement.`,
  }),
  hubspotRequest: (p: { company: string }) => ({
    subject: `${p.company} vous demande de connecter HubSpot à stand-by`,
    text: `${p.company} utilise stand-by pour staffer ses salons. Les leads collectés sur le stand peuvent être créés directement dans HubSpot.\n\nL’accès demandé est limité à la création et la lecture de contacts. Ce lien est valable 7 jours.`,
    link: "Connecter HubSpot",
  }),
});
export type Notices = ReturnType<typeof fr>;

const when = {
  fr: (left: number) => (left === 0 ? "aujourd’hui" : left === 1 ? "demain" : `dans ${left} jours`),
  en: (left: number) => (left === 0 ? "today" : left === 1 ? "tomorrow" : `in ${left} days`),
  es: (left: number) => (left === 0 ? "hoy" : left === 1 ? "mañana" : `dentro de ${left} días`),
};

const en = (f: F, dl: DL): Notices => ({
  open: "Open stand-by",
  footer: "Stand-By · trade shows and fairs",
  newMission: (p) => ({
    title: `New assignment: ${p.event ?? "trade show"}`,
    body: `${dl.role(p.role).label} · ${p.days} day(s) · ${f.hourly(p.rateCents)}. Accept or decline the assignment from your dashboard.`,
  }),
  bookingConfirmed: (p) => ({ title: `Booking ${p.ref} confirmed`, body: "The whole team has accepted. See you at the D-2 briefing." }),
  missionAccepted: (p) => ({ title: `${p.first} accepted the assignment`, body: `${p.first} ${p.last} joins your team (ref. ${p.ref}).` }),
  missionDeclined: (p) => ({
    title: `Assignment declined on ${p.ref}`,
    body:
      p.score !== null
        ? `${p.first} is not available. A replacement with a ${p.score}% match has received the assignment.`
        : `${p.first} is not available and no replacement is free right now: the Stand-By team will get back to you.`,
  }),
  missionOffered: (p) => ({ title: "New assignment offered", body: `${dl.role(p.role).label} · ${p.days} day(s). Answer within 48 h from your dashboard.` }),
  hoursToValidate: (p) => ({
    title: `Hours to approve (${p.ref})`,
    body: "The event is over. Check and approve your team’s hours: pay goes out the following Monday.",
  }),
  declareHours: (p) => ({ title: "Declare your hours", body: `Assignment ${p.ref} is over: declare your hours.` }),
  withdrew: (p) => ({
    title: `${p.first} has withdrawn (${p.ref})`,
    body:
      p.score !== null
        ? `${p.first} ${p.last} will not be able to attend. A replacement with a ${p.score}% match${p.rateCents ? ` (${f.hourly(p.rateCents)})` : ""} has received the assignment: you will be notified as soon as they accept.`
        : `${p.first} ${p.last} will not be able to attend and no profile is free right now: the Stand-By team is looking for a solution and will get back to you.`,
  }),
  documentToFix: (p) => ({
    title: "A document needs correcting",
    body: `${dl.document(p.doc)}: ${p.comment || "document rejected"}. Upload a new version from your profile.`,
  }),
  invoiceAvailable: (p) => ({
    title: `Invoice ${p.number} available`,
    body: `Hours approved for booking ${p.ref}. Amount incl. VAT: ${f.eurosPrecise(p.ttcCents)}.`,
  }),
  rateTeam: (p) => ({ title: "Rate your team", body: `How did booking ${p.ref} go? Your reviews help future exhibitors and freelancers.` }),
  paymentRequired: (p) => ({ title: "Payment method required", body: `Register a SEPA mandate or a card to pay for booking ${p.ref}.` }),
  payoutScheduled: (p) => ({
    title: p.cancelled ? "Cancellation compensation scheduled" : "Pay scheduled",
    body: `${f.eurosPrecise(p.amountCents)} for assignment ${p.ref}${p.cancelled ? " (cancelled by the exhibitor)" : ""}, transfer on Monday ${f.longDate(p.monday)}.`,
  }),
  missionCancelled: (p) => ({
    title: `Assignment cancelled (${p.ref})`,
    body: p.compensationCents
      ? `The exhibitor has cancelled this booking. Compensation of ${f.eurosPrecise(p.compensationCents)} will be paid to you once collected.`
      : "The exhibitor has cancelled this booking.",
  }),
  cancellationInvoice: (p) => ({
    title: `Cancellation invoice ${p.number}`,
    body: `Booking ${p.ref} cancelled ${p.when}: fee of ${f.eurosPrecise(p.ttcCents)} incl. VAT (${p.pct}%).`,
  }),
  profileValidated: () => ({
    title: "Your profile is approved",
    body: "Your documents have been checked: your profile is visible to exhibitors and you will receive your first assignments.",
  }),
  urssafExpired: (p) => ({
    title: "URSSAF certificate expired: profile suspended",
    body: `Your certificate expired on ${f.longDate(p.validUntil)}. You will not receive assignments until an up-to-date certificate is approved. Download it from urssaf.fr and upload it to your profile.`,
  }),
  urssafExpiring: (p) => ({
    title: `Your URSSAF certificate expires in ${p.left} day${s(p.left)}`,
    body: `It expires on ${f.longDate(p.validUntil)}. Download an up-to-date “attestation de vigilance” from urssaf.fr and upload it to your profile to keep receiving assignments.`,
  }),
  siretClosed: () => ({
    title: "Your SIRET appears as closed",
    body: "The SIRENE register says your establishment is closed: you no longer receive assignments. Contact us if this is a mistake.",
  }),
  creditNote: (p) => ({
    title: `Credit note ${p.number}`,
    body: `Credit note of ${f.eurosPrecise(p.ttcCents)} incl. VAT on invoice ${p.invoice}: ${p.reason}. ${
      p.paid ? "The refund goes to your payment method (allow 5 to 10 business days for a SEPA debit)." : "This amount is deducted from the next debit."
    }`,
  }),
  hoursAdjusted: (p) => ({
    title: `Hours adjusted (${p.ref})`,
    body: `The exhibitor accepted ${f.hoursLabel(p.retained)} instead of ${f.hoursLabel(p.declared)}${p.note ? `: “${p.note}”` : ""}. Accept or dispute within ${p.window} h; without an answer, the adjustment applies.`,
  }),
  hoursDisputed: (p) => ({
    title: `${p.first} disputes the adjustment of their hours (${p.ref})`,
    body: `${f.hoursLabel(p.declared)} declared, ${f.hoursLabel(p.retained)} accepted. Reason: “${p.motive}”. The Stand-By team will decide with both of you; the invoice is issued after the decision.`,
  }),
  leadsReceived: (p) => ({
    title: p.leads ? `${p.leads} lead(s) received from ${p.first}` : `Business cards received from ${p.first}`,
    body: `Booking ${p.ref}: ${p.leads ? "the leads are available in your dashboard, in your template format." : ""}${
      p.pendingCards ? ` ${p.pendingCards} business card(s) being entered by the Stand-By team (within 24 h).` : ""
    }`.trim(),
  }),
  teamIn: (p) => ({
    title: `Your team in ${p.left} days`,
    body: `${p.event} · ${p.city} · ${f.dateRange(p.startsOn, p.endsOn)}${p.stand ? ` · booth ${p.stand}` : ""}. ${p.accepted} person(s) confirmed${
      p.waiting ? `, ${p.waiting} awaiting an answer: we are following up and will suggest a replacement if needed` : ""
    }. Exhibitor badges are requested from the organiser. Remember to prepare the D-2 briefing.`,
  }),
  missionIn: (p) => ({
    title: `Assignment in ${p.left} days: ${p.event}`,
    body: `${p.event} · ${p.city} · ${f.dateRange(p.startsOn, p.endsOn)}${p.stand ? ` · booth ${p.stand}` : ""}, ${f.timeLabel(p.startTime)} – ${f.timeLabel(p.endTime)}. Read the brief and brochure again before the D-2 briefing.`,
  }),
  briefingCompany: (p) => ({
    title: `Your team’s briefing (${p.event}, ${when.en(p.left)})`,
    body: `Organise the video briefing with ${p.referent} and the team: ${p.contacts || "no freelancer confirmed yet"}.`,
  }),
  briefingFreelancer: (p) => ({
    title: `D-2 briefing: ${p.event} (${when.en(p.left)})`,
    body: `Your on-site contact: ${p.referent}${p.phone ? `, ${p.phone}` : ""}. Hours: ${f.timeLabel(p.startTime)} – ${f.timeLabel(p.endTime)}${p.stand ? `, booth ${p.stand}` : ""}. They will contact you for the video briefing.`,
  }),
  newReview: (p) => ({ title: "New review received", body: `An exhibitor gave you ${p.rating}/5 for assignment ${p.ref}.` }),
  verifyEmail: (p) => ({
    subject: "Confirm your stand-by e-mail address",
    text: `Hello ${p.first},\n\nConfirm your address so you can book a team or accept assignments. This link is valid for 48 hours.`,
    link: "Confirm my address",
  }),
  resetPassword: () => ({
    subject: "Reset your stand-by password",
    text: "You asked to reset your password. This link is valid for one hour.",
    link: "Choose a new password",
  }),
  passwordChanged: (p) => ({
    subject: "Your stand-by password has been changed",
    text: `Hello ${p.first},\n\nYour account password has just been changed and your other devices have been logged out. If you did not make this change, reset it immediately and contact us.`,
    link: "Reset my password",
  }),
  confirmNewEmail: (p) => ({
    subject: "Confirm your new stand-by address",
    text: `Hello ${p.first},\n\nConfirm this address to log in to stand-by with it, instead of ${p.old}. This link is valid for 24 hours.`,
    link: "Confirm my new address",
  }),
  emailChangeRequested: (p) => ({
    subject: "E-mail address change requested",
    text: `Hello ${p.first},\n\nA change of address to ${p.to} was requested from your stand-by account. Your current address remains valid until the new one is confirmed. If you did not make this request, change your password and contact us.`,
  }),
  emailChanged: (p) => ({
    subject: "E-mail address changed",
    text: `Hello ${p.first},\n\nYour stand-by account now uses the address ${p.to}. If you did not make this change, contact us immediately.`,
  }),
  hubspotRequest: (p) => ({
    subject: `${p.company} asks you to connect HubSpot to stand-by`,
    text: `${p.company} uses stand-by to staff its trade show booths. The leads collected on the booth can be created directly in HubSpot.\n\nThe access requested is limited to creating and reading contacts. This link is valid for 7 days.`,
    link: "Connect HubSpot",
  }),
});

const es = (f: F, dl: DL): Notices => ({
  open: "Abrir stand-by",
  footer: "Stand-By · ferias profesionales y salones",
  newMission: (p) => ({
    title: `Nueva misión: ${p.event ?? "feria"}`,
    body: `${dl.role(p.role).label} · ${p.days} día(s) · ${f.hourly(p.rateCents)}. Acepte o rechace la misión desde su espacio.`,
  }),
  bookingConfirmed: (p) => ({ title: `Reserva ${p.ref} confirmada`, body: "Todo el equipo ha aceptado. Nos vemos en el briefing D-2." }),
  missionAccepted: (p) => ({ title: `${p.first} ha aceptado la misión`, body: `${p.first} ${p.last} se une a su equipo (ref. ${p.ref}).` }),
  missionDeclined: (p) => ({
    title: `Misión rechazada en ${p.ref}`,
    body:
      p.score !== null
        ? `${p.first} no está disponible. Un sustituto con un ${p.score} % de compatibilidad ha recibido la misión.`
        : `${p.first} no está disponible y no hay ningún sustituto libre por ahora: el equipo Stand-By se pondrá en contacto con usted.`,
  }),
  missionOffered: (p) => ({ title: "Nueva misión propuesta", body: `${dl.role(p.role).label} · ${p.days} día(s). Responda en 48 h desde su espacio.` }),
  hoursToValidate: (p) => ({
    title: `Horas por validar (${p.ref})`,
    body: "El evento ha terminado. Revise y valide las horas de su equipo: el pago sale el lunes siguiente.",
  }),
  declareHours: (p) => ({ title: "Declare sus horas", body: `Misión ${p.ref} terminada: declare sus horas.` }),
  withdrew: (p) => ({
    title: `${p.first} ha renunciado (${p.ref})`,
    body:
      p.score !== null
        ? `${p.first} ${p.last} no podrá asistir. Un sustituto compatible al ${p.score} %${p.rateCents ? ` (${f.hourly(p.rateCents)})` : ""} ha recibido la misión: le avisaremos en cuanto la acepte.`
        : `${p.first} ${p.last} no podrá asistir y no hay ningún perfil libre por ahora: el equipo Stand-By busca una solución y se pondrá en contacto con usted.`,
  }),
  documentToFix: (p) => ({
    title: "Hay un documento por corregir",
    body: `${dl.document(p.doc)}: ${p.comment || "documento rechazado"}. Suba una nueva versión desde su perfil.`,
  }),
  invoiceAvailable: (p) => ({
    title: `Factura ${p.number} disponible`,
    body: `Horas validadas para la reserva ${p.ref}. Importe con IVA: ${f.eurosPrecise(p.ttcCents)}.`,
  }),
  rateTeam: (p) => ({ title: "Valore a su equipo", body: `¿Qué tal fue la reserva ${p.ref}? Sus valoraciones ayudan a los próximos expositores y comerciales.` }),
  paymentRequired: (p) => ({ title: "Medio de pago necesario", body: `Registre un mandato SEPA o una tarjeta para abonar la reserva ${p.ref}.` }),
  payoutScheduled: (p) => ({
    title: p.cancelled ? "Indemnización por cancelación programada" : "Pago programado",
    body: `${f.eurosPrecise(p.amountCents)} por la misión ${p.ref}${p.cancelled ? " (cancelada por el expositor)" : ""}, transferencia el lunes ${f.longDate(p.monday)}.`,
  }),
  missionCancelled: (p) => ({
    title: `Misión cancelada (${p.ref})`,
    body: p.compensationCents
      ? `El expositor ha cancelado esta reserva. Se le abonará una indemnización de ${f.eurosPrecise(p.compensationCents)} tras el cobro.`
      : "El expositor ha cancelado esta reserva.",
  }),
  cancellationInvoice: (p) => ({
    title: `Factura de cancelación ${p.number}`,
    body: `Reserva ${p.ref} cancelada ${p.when}: gastos de ${f.eurosPrecise(p.ttcCents)} con IVA (${p.pct} %).`,
  }),
  profileValidated: () => ({
    title: "Su perfil está validado",
    body: "Sus documentos están verificados: su perfil es visible para los expositores y recibirá sus primeras misiones.",
  }),
  urssafExpired: (p) => ({
    title: "Certificado URSSAF caducado: perfil suspendido",
    body: `Su certificado caducó el ${f.longDate(p.validUntil)}. No recibirá misiones hasta que se valide un certificado actualizado. Descárguelo en urssaf.fr y súbalo a su perfil.`,
  }),
  urssafExpiring: (p) => ({
    title: `Su certificado URSSAF caduca dentro de ${p.left} día${s(p.left)}`,
    body: `Caduca el ${f.longDate(p.validUntil)}. Descargue una «attestation de vigilance» actualizada en urssaf.fr y súbala a su perfil para seguir recibiendo misiones.`,
  }),
  siretClosed: () => ({
    title: "Su SIRET figura como cerrado",
    body: "El registro SIRENE indica que su establecimiento está cerrado: ya no recibe misiones. Contáctenos si se trata de un error.",
  }),
  creditNote: (p) => ({
    title: `Factura rectificativa ${p.number}`,
    body: `Rectificativa de ${f.eurosPrecise(p.ttcCents)} con IVA sobre la factura ${p.invoice}: ${p.reason}. ${
      p.paid ? "El reembolso se realiza en su medio de pago (cuente de 5 a 10 días laborables para un adeudo SEPA)." : "Este importe se descuenta del próximo cargo."
    }`,
  }),
  hoursAdjusted: (p) => ({
    title: `Horas ajustadas (${p.ref})`,
    body: `El expositor ha reconocido ${f.hoursLabel(p.retained)} en lugar de ${f.hoursLabel(p.declared)}${p.note ? `: «${p.note}»` : ""}. Acepte o impugne en ${p.window} h; sin respuesta, se aplica el ajuste.`,
  }),
  hoursDisputed: (p) => ({
    title: `${p.first} impugna el ajuste de sus horas (${p.ref})`,
    body: `${f.hoursLabel(p.declared)} declaradas, ${f.hoursLabel(p.retained)} reconocidas. Motivo: «${p.motive}». El equipo Stand-By arbitra con ustedes; la factura se emite tras el arbitraje.`,
  }),
  leadsReceived: (p) => ({
    title: p.leads ? `${p.leads} lead(s) recibidos de ${p.first}` : `Tarjetas de visita recibidas de ${p.first}`,
    body: `Reserva ${p.ref}: ${p.leads ? "los leads están disponibles en su espacio, en el formato de su plantilla." : ""}${
      p.pendingCards ? ` ${p.pendingCards} tarjeta(s) de visita en introducción por el equipo Stand-By (en 24 h).` : ""
    }`.trim(),
  }),
  teamIn: (p) => ({
    title: `Su equipo dentro de ${p.left} días`,
    body: `${p.event} · ${p.city} · ${f.dateRange(p.startsOn, p.endsOn)}${p.stand ? ` · stand ${p.stand}` : ""}. ${p.accepted} persona(s) confirmada(s)${
      p.waiting ? `, ${p.waiting} pendiente(s) de respuesta: insistimos y proponemos un sustituto si es necesario` : ""
    }. Las acreditaciones de expositor se solicitan al organizador. Recuerde preparar el briefing D-2.`,
  }),
  missionIn: (p) => ({
    title: `Misión dentro de ${p.left} días: ${p.event}`,
    body: `${p.event} · ${p.city} · ${f.dateRange(p.startsOn, p.endsOn)}${p.stand ? ` · stand ${p.stand}` : ""}, ${f.timeLabel(p.startTime)} – ${f.timeLabel(p.endTime)}. Relea el briefing y el folleto antes del briefing D-2.`,
  }),
  briefingCompany: (p) => ({
    title: `Briefing de su equipo (${p.event}, ${when.es(p.left)})`,
    body: `Organice el briefing por videollamada con ${p.referent} y el equipo: ${p.contacts || "todavía no hay comerciales confirmados"}.`,
  }),
  briefingFreelancer: (p) => ({
    title: `Briefing D-2: ${p.event} (${when.es(p.left)})`,
    body: `Su responsable in situ: ${p.referent}${p.phone ? `, ${p.phone}` : ""}. Horario: ${f.timeLabel(p.startTime)} – ${f.timeLabel(p.endTime)}${p.stand ? `, stand ${p.stand}` : ""}. Se pondrá en contacto con usted para el briefing por videollamada.`,
  }),
  newReview: (p) => ({ title: "Nueva valoración recibida", body: `Un expositor le ha dado ${p.rating}/5 por la misión ${p.ref}.` }),
  verifyEmail: (p) => ({
    subject: "Confirme su correo electrónico de stand-by",
    text: `Hola, ${p.first}:\n\nConfirme su dirección para poder reservar un equipo o aceptar misiones. Este enlace es válido durante 48 horas.`,
    link: "Confirmar mi dirección",
  }),
  resetPassword: () => ({
    subject: "Restablecer su contraseña de stand-by",
    text: "Ha solicitado restablecer su contraseña. Este enlace es válido durante una hora.",
    link: "Elegir una nueva contraseña",
  }),
  passwordChanged: (p) => ({
    subject: "Su contraseña de stand-by ha cambiado",
    text: `Hola, ${p.first}:\n\nLa contraseña de su cuenta acaba de cambiarse y se ha cerrado la sesión en sus otros dispositivos. Si no ha sido usted, restablézcala de inmediato y contáctenos.`,
    link: "Restablecer mi contraseña",
  }),
  confirmNewEmail: (p) => ({
    subject: "Confirme su nueva dirección de stand-by",
    text: `Hola, ${p.first}:\n\nConfirme esta dirección para iniciar sesión en stand-by con ella, en lugar de ${p.old}. Este enlace es válido durante 24 horas.`,
    link: "Confirmar mi nueva dirección",
  }),
  emailChangeRequested: (p) => ({
    subject: "Cambio de correo electrónico solicitado",
    text: `Hola, ${p.first}:\n\nSe ha solicitado desde su cuenta de stand-by un cambio de dirección a ${p.to}. Su dirección actual sigue siendo válida hasta que se confirme la nueva. Si no ha sido usted, cambie su contraseña y contáctenos.`,
  }),
  emailChanged: (p) => ({
    subject: "Correo electrónico modificado",
    text: `Hola, ${p.first}:\n\nSu cuenta de stand-by utiliza ahora la dirección ${p.to}. Si no ha sido usted, contáctenos de inmediato.`,
  }),
  hubspotRequest: (p) => ({
    subject: `${p.company} le pide conectar HubSpot a stand-by`,
    text: `${p.company} utiliza stand-by para dotar de personal sus stands. Los leads recogidos en el stand pueden crearse directamente en HubSpot.\n\nEl acceso solicitado se limita a crear y leer contactos. Este enlace es válido durante 7 días.`,
    link: "Conectar HubSpot",
  }),
});

const BUILD: Record<Lang, (f: F, dl: DL) => Notices> = { fr, en, es };

/** Messages d'avis et d'e-mails dans une langue. */
export function notices(lang: Lang): Notices {
  return BUILD[lang](fmt(lang), domainLabels(lang));
}
