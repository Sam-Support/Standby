import type { DocSection } from "@/components/doc-page";

// Traduction anglaise de legal.ts, à titre informatif : seule la version française fait foi.
// Les passages entre crochets restent à compléter par l'éditeur (avec son avocat).

export const MENTIONS: DocSection[] = [
  {
    title: "Publisher",
    body: [
      "The stand-by website is published by [company name], [legal form] with a share capital of €[amount], registered with the [city] Trade and Companies Register under number [number].",
      ["Registered office: [full address]", "SIRET: [14 digits]", "EU VAT number: [number]", "Contact: [e-mail address] · [phone]"],
    ],
  },
  { title: "Publication director", body: ["[Name and position], as the publisher’s legal representative."] },
  { title: "Host", body: ["The website is hosted by Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, USA (vercel.com), running in the European Union (Frankfurt). Data is stored by Supabase, European Union region (Frankfurt)."] },
  {
    title: "Intellectual property",
    body: [
      "All elements of the website (structure, texts, graphics, interface, stand-by logo) are protected by intellectual property law. Any full or partial reproduction, representation or adaptation without the publisher’s prior written consent is prohibited.",
    ],
  },
  {
    title: "Organisers’ trademarks and visuals",
    body: [
      "The names, logos and visuals of the trade shows and fairs displayed on the website belong to their respective owners. They are shown for information only, to identify the events, and do not imply any partnership or sponsorship unless stated otherwise.",
    ],
  },
  {
    title: "Personal data and cookies",
    body: ["The processing of personal data is described in the {privacy policy|/confidentialite}. The use of trackers is described in the {cookie policy|/cookies}."],
  },
  { title: "Governing law", body: ["This legal notice is governed by French law. Failing an amicable settlement, the courts with jurisdiction over the publisher’s registered office shall have jurisdiction."] },
];

export const MANDAT_FACTURATION: DocSection[] = [
  {
    title: "Parties and purpose",
    body: [
      "This mandate is entered into between the independent sales rep, host, event host or interpreter registered on stand-by (the “principal”) and [publisher’s company name], publisher of stand-by (the “agent”).",
      "The principal instructs the agent to draw up and issue, in the principal’s name and on the principal’s behalf, the invoices for assignments carried out through the platform and for the cancellation compensation paid to the principal. The agent is the recipient and payer of these invoices.",
    ],
  },
  {
    title: "Issuing invoices",
    body: [
      [
        "An invoice is issued for each payout, once the hours have been approved and the exhibiting company’s payment (or, for compensation, the cancellation fees) has been received.",
        "It bears the mention “Autofacturation” (self-billing), a continuous numbering specific to the principal, the principal’s name, address and SIRET as recorded in their profile on the date of issue, details of the service (event, dates, approved hours, hourly rate), the amount excluding tax and the declared VAT regime.",
        "Principal under the VAT exemption scheme: the invoice bears the mention “TVA non applicable, art. 293 B du CGI”. VAT-registered principal: VAT at the applicable rate is added to the amount excluding tax and paid to the principal.",
      ],
    ],
  },
  {
    title: "Availability and disputes",
    body: [
      "Each invoice is made available to the principal in their dashboard (“Invoices and statements” section) as soon as it is issued, together with a monthly statement and an annual summary. The principal may dispute it within [15] days through the {Contact|/contact} page; otherwise it is deemed accepted. An invoice that is rightly disputed is cancelled by a corrective invoice.",
    ],
  },
  {
    title: "Principal’s obligations",
    body: [
      [
        "Keep their address, SIRET and VAT regime up to date: the profile information on the date of issue is authoritative.",
        "Declare the corresponding turnover and, where applicable, pay over the VAT invoiced: the principal remains solely responsible for their tax and social security obligations.",
        "Not issue invoices themselves for services covered by this mandate.",
      ],
    ],
  },
  {
    title: "Term and termination",
    body: [
      "The mandate takes effect upon acceptance and is concluded for an indefinite period. The principal may terminate it at any time through the {Contact|/contact} page: termination takes effect once current assignments have been settled, and the principal no longer receives new assignments. Any new version of the mandate is subject to the principal’s acceptance. [Text to be approved by the chartered accountant and the lawyer.]",
    ],
  },
];

export const CGU: DocSection[] = [
  {
    title: "Purpose",
    body: [
      "These terms govern the use of the stand-by platform, which connects exhibiting companies with independent sales reps, hosts, event hosts and interpreters to staff booths at trade shows and fairs.",
    ],
  },
  {
    title: "Access to the service",
    body: [
      "The website can be accessed free of charge. An account is required to book a team or apply for an assignment. Connection costs are borne by the user. The publisher may suspend access for maintenance without incurring liability.",
    ],
  },
  {
    title: "User accounts",
    body: [
      "There are two kinds of account:",
      [
        "**Company account**: company name, SIRET, website, LinkedIn page, sales brochure, contacts and lead delivery format.",
        "**Freelancer account**: identity, roles, specialties, languages, outfit sizes, self-employed status and supporting documents.",
      ],
      "Users guarantee that the information they provide is accurate and keep it up to date. Login details are personal and confidential.",
    ],
  },
  {
    title: "Users’ commitments",
    body: [
      [
        "Respect the dates, hours and briefs agreed for each assignment; if unable to attend, withdraw from the assignment as early as possible, and no later than the day before the first day (a withdrawal counts as a refusal in the acceptance rate).",
        "Not bypass the platform to invoice or pay for an assignment found through stand-by. Freelancers’ invoices are drawn up by stand-by under the {billing mandate|/mandat-facturation} accepted at sign-up.",
        "Not publish any unlawful or misleading content, or content that infringes the rights of third parties.",
      ],
    ],
  },
  {
    title: "Uploading files and leads",
    body: [
      "Freelancers upload their leads (Excel files, photos of business cards) on behalf of the exhibiting company. They guarantee that these only include contacts collected during the assignment. Files are checked against the columns of the company’s format and then delivered to the company. See the {privacy policy|/confidentialite}.",
    ],
  },
  {
    title: "Liability",
    body: [
      "stand-by acts as a technical intermediary and takes reasonable steps to ensure the quality of profiles. It cannot be held liable for indirect damage or for a user’s failure to meet their own obligations.",
    ],
  },
  { title: "Changes to the terms", body: ["These terms may be amended. Users are informed of any substantial change before it takes effect."] },
  {
    title: "Governing law",
    body: ["These terms are governed by French law. Any dispute falls within the jurisdiction of the courts of the publisher’s registered office, subject to applicable mandatory rules."],
  },
];

export const cgv = (feePct: string, cancellation: string[]): DocSection[] => [
  {
    title: "Scope",
    body: [
      "These terms apply to any booking of a booth team made by an exhibiting company on the stand-by platform. Confirming a booking constitutes unreserved acceptance of the terms in force on that date.",
    ],
  },
  {
    title: "Booking a team",
    body: [
      "The booking specifies the event, the days (including set-up), the hours, the roles, the languages, the outfit, the on-site contact and the lead delivery format. Each selected freelancer receives an assignment and accepts it; the booking is confirmed once all assignments have been accepted. Otherwise, stand-by proposes a replacement as soon as possible.",
    ],
  },
  {
    title: "Prices",
    body: [
      `The price is calculated from each profile’s hourly rate, the number of hours invoiced per day and the number of days, plus a service fee of ${feePct} excluding tax. Prices are expressed in euros excluding tax; VAT at the applicable rate is added. A detailed quote is presented before any confirmation.`,
    ],
  },
  {
    title: "Invoicing and payment",
    body: [
      "A single invoice per event is issued once the hours have been approved and is made available in the company dashboard. Payment is debited from the payment method registered at booking (SEPA mandate or card) and is due within [period] days. Any late payment gives rise to penalties at the rate of [rate] and to the fixed recovery fee of €40 provided for in article D. 441-5 of the French Commercial Code.",
      "Any correction to an issued invoice (error, goodwill gesture, accepted complaint) is made by a credit note, available in the company dashboard: it is refunded to the payment method used if the invoice has been paid, or deducted from the next debit.",
    ],
  },
  {
    title: "Withdrawal of a freelancer",
    body: [
      "If a freelancer who has accepted an assignment withdraws before the event, Stand-By immediately offers the assignment to a compatible profile, preferably at the same or a lower hourly rate, and informs the company. If no replacement is available, the Stand-By team looks for a solution; only the hours actually worked are invoiced.",
    ],
  },
  {
    title: "Approval of hours",
    body: [
      "After the event, the company approves or adjusts the hours worked by each freelancer. Without an answer within three days, the declared hours are deemed approved.",
      "When the company accepts fewer hours than declared, the freelancer has 48 hours to accept the adjustment or dispute it; without an answer, the adjustment applies. In the event of a dispute, the Stand-By team decides on the basis of both parties’ evidence and its decision sets the hours invoiced.",
      "Approved hours are the basis for invoicing and pay, which is paid every Monday for the week worked.",
    ],
  },
  {
    title: "Changes and cancellation",
    body: [
      "Any change or cancellation is made from the company dashboard. Cancellation fees depend on the time between the cancellation and the first booked day (including set-up):",
      cancellation,
      "The percentage applies to the planned pay of the freelancers who had accepted their assignment on the cancellation date, plus the service fee and VAT; these freelancers receive the same proportion of their pay as compensation. The applicable scale is the one in force when the booking was confirmed. The exact amount is shown before any cancellation. [Scale to be legally validated.]",
    ],
  },
  { title: "Complaints", body: ["Any complaint about a service must be sent through the {Contact|/contact} page within [period] days of the end of the event."] },
  { title: "Governing law", body: ["These terms are governed by French law. In the event of a dispute, and failing an amicable agreement, the courts with jurisdiction over the publisher’s registered office shall have jurisdiction."] },
];

export const CONFIDENTIALITE: DocSection[] = [
  {
    title: "Data controller",
    body: ["[Company name], [address], is the controller of the data collected on the stand-by platform. Data protection officer: [name or dedicated e-mail address]."],
  },
  {
    title: "Data collected",
    body: [
      [
        "**Companies**: company name, SIRET, industry, website, LinkedIn page, brochure, contacts’ business details, lead delivery format.",
        "**Freelancers**: identity, city, roles, specialties, languages, rate, outfit sizes, self-employed status, ID document, URSSAF certificate, bank details.",
        "**Use of the website**: login data and trackers, according to your choices (see the {cookie policy|/cookies}).",
      ],
    ],
  },
  {
    title: "Purposes and legal bases",
    body: [
      [
        "Management of accounts, bookings, assignments, invoicing and pay: performance of the contract.",
        "Profile checks, fraud prevention, accounting and social security obligations: legal obligation and legitimate interest.",
        "Audience measurement and service improvement: consent.",
      ],
    ],
  },
  {
    title: "Leads and business cards",
    body: [
      "Contacts collected by freelancers on a booth are the exhibiting company’s data. stand-by processes them on the company’s behalf, as a processor: format check, entry of business cards (automatic reading then human check), delivery in the company’s template or CRM. The company remains responsible for informing the people concerned.",
    ],
  },
  {
    title: "Recipients",
    body: [
      "Data is accessible to authorised stand-by staff, to exhibiting companies and freelancers for the assignments concerned only, and to our technical (hosting, database, e-mail, card reading), payment and payroll providers within the limits of their tasks. It is never sold.",
    ],
  },
  {
    title: "Retention periods",
    body: [
      "Accounts: for the duration of the contractual relationship and then [period], or until deleted by the user. Accounting records: 10 years, linked to an anonymised account in the event of deletion. Leads: deleted automatically after the period set by stand-by ([period, 365 days by default]). Trackers: 13 months maximum.",
    ],
  },
  {
    title: "Your rights",
    body: [
      "You have the rights of access, rectification, erasure, objection, restriction and portability, as well as the right to give instructions regarding your data after your death. From the {My personal data|/compte} page, you can download your data and delete your account yourself. For any other request: [e-mail address]. You may lodge a complaint with the CNIL (cnil.fr).",
    ],
  },
  {
    title: "Security",
    body: ["Exchanges are encrypted, access is restricted by profile and sensitive documents are stored separately. Security incidents are notified in accordance with the regulations."],
  },
];

export const ACCESSIBILITE: DocSection[] = [
  {
    title: "Compliance status",
    body: ["The stand-by website is **partially compliant** with the French accessibility standard (RGAA), version 4.1. Compliance rate: [xx %, after audit]."],
  },
  { title: "Non-accessible content", body: ["The non-compliances and exemptions identified during the audit will be listed here: [to be completed after audit]."] },
  {
    title: "Preparation of this statement",
    body: [
      "This statement was drawn up on [date] on the basis of an audit carried out by [organisation or self-assessment] on a representative sample of pages: home page, booking journey, company and freelancer dashboards, sign-ups, legal pages.",
      "Technologies used: HTML, CSS, JavaScript. Test environment: [browsers and screen readers].",
    ],
  },
  {
    title: "Feedback and contact",
    body: ["If you cannot access some content or a service, you can contact us through the {Contact|/contact} page or at [e-mail address] to be directed to an accessible alternative or to obtain the content in another form."],
  },
  {
    title: "Remedies",
    body: [
      "If you notice an accessibility issue that prevents you from accessing content or a feature of the website, you have reported it to us and you have not received a satisfactory answer, you can write to the Défenseur des droits (online form on defenseurdesdroits.fr, or free post: Défenseur des droits, Libre réponse 71120, 75342 Paris CEDEX 07).",
    ],
  },
];

export const FAQ: { theme: string; items: [string, string][] }[] = [
  {
    theme: "General",
    items: [
      ["What is stand-by?", "A platform that lets companies book a team for their booth at a trade show or fair, and lets sales reps, hosts, event hosts and interpreters find assignments."],
      ["Which events are covered?", "Trade shows and fairs in France, with their set-up, opening and dismantling dates."],
    ],
  },
  {
    theme: "Exhibiting companies",
    items: [
      ["How do I book a team?", "Choose the event, the days and the roles, write your brief, select the profiles and approve the quote. Each freelancer receives their assignment and accepts it."],
      ["How is the price calculated?", "Profile hourly rate × hours invoiced per day × number of days, plus the service fee. The quote excluding tax is shown before any confirmation."],
      ["Can I change or cancel a booking?", "Yes, from your {company dashboard|/entreprise}. The conditions depend on the notice period, see the {terms of sale|/cgv}."],
    ],
  },
  {
    theme: "Sales reps, hosts and event hosts",
    items: [
      ["How do I apply for an assignment?", "Create your account, fill in your roles, specialties and languages, then accept the assignments that suit you. The hourly rate is shown before you apply."],
      ["Which documents do I need to provide?", "An ID document, your self-employed status certificate (URSSAF) and your bank details, so that we can check your profile and pay you."],
    ],
  },
  {
    theme: "Leads and business cards",
    items: [["How do I send my leads?", "Upload your Excel file or take photos of business cards from the {freelancer dashboard|/commercial}. The company’s format is checked before sending."]],
  },
  {
    theme: "Pay and invoicing",
    items: [
      ["When do I get paid?", "Every Monday, for the approved hours of the week worked."],
      ["Where can I find my invoice?", "A single invoice per event is available in the company dashboard once the hours have been approved."],
    ],
  },
];
