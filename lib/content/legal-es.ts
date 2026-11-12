import type { DocSection } from "@/components/doc-page";

// Traduction espagnole de legal.ts, à titre informatif : seule la version française fait foi.
// Les passages entre crochets restent à compléter par l'éditeur (avec son avocat).

export const MENTIONS: DocSection[] = [
  {
    title: "Editor del sitio",
    body: [
      "El sitio standby lo edita [razón social], [forma jurídica] con un capital social de [importe] €, inscrita en el Registro Mercantil (RCS) de [ciudad] con el número [número].",
      ["Domicilio social: [dirección completa]", "SIRET: [14 cifras]", "IVA intracomunitario: [número]", "Contacto: [correo electrónico] · [teléfono]"],
    ],
  },
  { title: "Director de la publicación", body: ["[Nombre y cargo], en calidad de representante legal del editor."] },
  { title: "Alojamiento", body: ["El sitio está alojado por Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, Estados Unidos (vercel.com), con ejecución en la Unión Europea (Fráncfort). Los datos los almacena Supabase, región Unión Europea (Fráncfort)."] },
  {
    title: "Propiedad intelectual",
    body: [
      "Todos los elementos del sitio (estructura, textos, gráficos, interfaz, logotipo de standby) están protegidos por el derecho de propiedad intelectual. Queda prohibida cualquier reproducción, representación o adaptación, total o parcial, sin la autorización previa por escrito del editor.",
    ],
  },
  {
    title: "Marcas y elementos visuales de los organizadores",
    body: [
      "Los nombres, logotipos y elementos visuales de las ferias y salones que aparecen en el sitio pertenecen a sus respectivos titulares. Se muestran con fines meramente informativos para identificar los eventos y no implican ninguna asociación ni patrocinio, salvo que se indique lo contrario.",
    ],
  },
  {
    title: "Datos personales y cookies",
    body: ["El tratamiento de los datos personales se detalla en la {política de privacidad|/confidentialite}. El uso de rastreadores se describe en la {política de cookies|/cookies}."],
  },
  { title: "Legislación aplicable", body: ["El presente aviso legal se rige por el derecho francés. A falta de solución amistosa, serán competentes los tribunales del domicilio social del editor."] },
];

export const MANDAT_FACTURATION: DocSection[] = [
  {
    title: "Partes y objeto",
    body: [
      "El presente mandato se celebra entre el comercial, azafato/a, animador/a o intérprete autónomo registrado en standby (el «mandante») y [razón social del editor], editor de standby (el «mandatario»).",
      "El mandante encarga al mandatario la elaboración y emisión, en su nombre y por su cuenta, de las facturas correspondientes a las misiones realizadas a través de la plataforma y a las indemnizaciones por cancelación que se le abonen. El mandatario es su destinatario y pagador.",
    ],
  },
  {
    title: "Emisión de las facturas",
    body: [
      [
        "Se emite una factura por cada transferencia, una vez validadas las horas y cobrado el pago de la empresa expositora (o, en el caso de una indemnización, los gastos de cancelación).",
        "La factura lleva la mención «Autofacturation», una numeración correlativa propia del mandante, su nombre, dirección y SIRET tal como constan en su perfil en la fecha de emisión, el detalle del servicio (evento, fechas, horas validadas, tarifa por hora), el importe sin impuestos y el régimen de IVA declarado.",
        "Mandante acogido a la franquicia de IVA: la factura lleva la mención «TVA non applicable, art. 293 B du CGI». Mandante sujeto a IVA: el IVA al tipo vigente se añade al importe sin impuestos y se le abona.",
      ],
    ],
  },
  {
    title: "Puesta a disposición e impugnación",
    body: [
      "Cada factura se pone a disposición del mandante en su espacio (sección «Facturas y extractos») desde su emisión, junto con un extracto mensual y un resumen anual. El mandante puede impugnarla en un plazo de [15] días a través de la página de {Contacto|/contact}; de lo contrario, se considera aceptada. Una factura impugnada con razón se anula mediante una factura rectificativa.",
    ],
  },
  {
    title: "Obligaciones del mandante",
    body: [
      [
        "Mantener actualizados su dirección, su SIRET y su régimen de IVA: los datos del perfil en la fecha de emisión son los que prevalecen.",
        "Declarar el volumen de negocio correspondiente y, en su caso, ingresar el IVA facturado: el mandante sigue siendo el único responsable de sus obligaciones fiscales y sociales.",
        "No emitir él mismo facturas por los servicios cubiertos por el presente mandato.",
      ],
    ],
  },
  {
    title: "Duración y resolución",
    body: [
      "El mandato surte efecto en el momento de su aceptación y se celebra por tiempo indefinido. El mandante puede resolverlo en cualquier momento a través de la página de {Contacto|/contact}: la resolución surte efecto tras la liquidación de las misiones en curso, y el mandante deja de recibir nuevas misiones. Toda nueva versión del mandato se somete a su aceptación. [Texto pendiente de validación por el contable y el abogado.]",
    ],
  },
];

export const CGU: DocSection[] = [
  {
    title: "Objeto",
    body: [
      "Las presentes condiciones regulan el uso de la plataforma standby, que pone en contacto a empresas expositoras con comerciales, azafatos/as, animadores e intérpretes autónomos para atender stands en ferias profesionales y salones.",
    ],
  },
  {
    title: "Acceso al servicio",
    body: [
      "El acceso al sitio es gratuito. Es necesario crear una cuenta para reservar un equipo o postularse a una misión. Los gastos de conexión corren a cargo del usuario. El editor puede suspender el acceso por mantenimiento sin que ello genere responsabilidad alguna.",
    ],
  },
  {
    title: "Cuentas de usuario",
    body: [
      "Existen dos tipos de cuenta:",
      [
        "**Cuenta de empresa**: razón social, SIRET, sitio web, página de LinkedIn, folleto comercial, responsables y formato de entrega de los leads.",
        "**Cuenta de comercial**: identidad, puestos, especialidades, idiomas, tallas de uniforme, estatus de autónomo y documentos justificativos.",
      ],
      "El usuario garantiza la exactitud de la información facilitada y la mantiene actualizada. Las credenciales de acceso son personales y confidenciales.",
    ],
  },
  {
    title: "Compromisos de los usuarios",
    body: [
      [
        "Respetar las fechas, horarios y briefings acordados para cada misión; en caso de imprevisto, renunciar a la misión lo antes posible y, a más tardar, la víspera del primer día (una renuncia cuenta como un rechazo en la tasa de aceptación).",
        "No eludir la plataforma para facturar o pagar una misión encontrada a través de standby. Las facturas de los comerciales las emite standby en virtud del {mandato de facturación|/mandat-facturation} aceptado en el registro.",
        "No publicar ningún contenido ilícito, engañoso o que vulnere derechos de terceros.",
      ],
    ],
  },
  {
    title: "Envío de archivos y leads",
    body: [
      "Los comerciales envían sus leads (archivos Excel, fotos de tarjetas de visita) por cuenta de la empresa expositora. Garantizan que solo incluyen contactos recogidos en el marco de la misión. Los archivos se comprueban con las columnas del formato de la empresa y después se entregan a esta. Véase la {política de privacidad|/confidentialite}.",
    ],
  },
  {
    title: "Responsabilidad",
    body: [
      "standby actúa como intermediario técnico y aplica los medios razonables para garantizar la calidad de los perfiles. No se le puede exigir responsabilidad por daños indirectos ni por el incumplimiento por parte de un usuario de sus propias obligaciones.",
    ],
  },
  { title: "Modificación de las condiciones", body: ["Las condiciones pueden modificarse. Los usuarios son informados de cualquier modificación sustancial antes de su entrada en vigor."] },
  {
    title: "Legislación aplicable",
    body: ["Las presentes condiciones se rigen por el derecho francés. Cualquier litigio será competencia de los tribunales del domicilio social del editor, sin perjuicio de las normas imperativas aplicables."],
  },
];

export const cgv = (feePct: string, cancellation: string[]): DocSection[] => [
  {
    title: "Ámbito de aplicación",
    body: [
      "Las presentes condiciones se aplican a toda reserva de un equipo de stand realizada por una empresa expositora en la plataforma standby. La confirmación de una reserva implica la aceptación sin reservas de las condiciones vigentes en esa fecha.",
    ],
  },
  {
    title: "Reserva de un equipo",
    body: [
      "La reserva indica el evento, los días (montaje incluido), los horarios, los puestos, los idiomas, el uniforme, el responsable in situ y el formato de entrega de los leads. Cada comercial seleccionado recibe una misión y la acepta; la reserva queda confirmada cuando se han aceptado todas las misiones. En caso contrario, standby propone un sustituto lo antes posible.",
    ],
  },
  {
    title: "Precio",
    body: [
      `El precio se calcula a partir de la tarifa por hora de cada perfil, del número de horas facturadas por día y del número de días, a lo que se suman unos gastos de servicio del ${feePct} sin impuestos. Los precios se expresan en euros sin impuestos; se añade el IVA al tipo vigente. Antes de cualquier confirmación se presenta un presupuesto detallado.`,
    ],
  },
  {
    title: "Facturación y pago",
    body: [
      "Se emite una única factura por evento tras la validación de las horas, que se pone a disposición en el espacio de empresa. El importe se carga en el medio de pago registrado en la reserva (mandato SEPA o tarjeta) y es exigible en un plazo de [plazo] días. Todo retraso da lugar a penalizaciones al tipo de [tipo] y a la indemnización fija por gastos de cobro de 40 € prevista en el artículo D. 441-5 del Código de Comercio francés.",
      "Cualquier corrección de una factura emitida (error, gesto comercial, reclamación aceptada) se realiza mediante una factura rectificativa, disponible en el espacio de empresa: se reembolsa en el medio de pago utilizado si la factura ya se ha abonado, o se descuenta del próximo cargo.",
    ],
  },
  {
    title: "Renuncia de un comercial",
    body: [
      "Si un comercial que ha aceptado su misión renuncia antes del evento, Standby propone de inmediato la misión a un perfil compatible, preferentemente con la misma tarifa por hora o una inferior, e informa a la empresa. Si no hay ningún sustituto disponible, el equipo Standby busca una solución; solo se facturan las horas realmente trabajadas.",
    ],
  },
  {
    title: "Validación de las horas",
    body: [
      "Al finalizar el evento, la empresa valida o ajusta las horas trabajadas por cada comercial. Sin respuesta en un plazo de tres días, las horas declaradas se consideran validadas.",
      "Cuando la empresa reconoce menos horas de las declaradas, el comercial dispone de 48 horas para aceptar el ajuste o impugnarlo; sin respuesta, se aplica el ajuste. En caso de impugnación, el equipo Standby arbitra a la vista de los elementos aportados por ambas partes y su decisión fija las horas facturadas.",
      "Las horas validadas sirven de base para la facturación y el pago, que se abona cada lunes por la semana trabajada.",
    ],
  },
  {
    title: "Modificación y cancelación",
    body: [
      "Cualquier modificación o cancelación se realiza desde el espacio de empresa. Los gastos de cancelación dependen del plazo entre la cancelación y el primer día reservado (montaje incluido):",
      cancellation,
      "El porcentaje se aplica a la remuneración prevista de los comerciales que hubieran aceptado su misión en la fecha de cancelación, incrementada con los gastos de servicio y el IVA; estos comerciales reciben la misma proporción de su remuneración en concepto de indemnización. El baremo aplicable es el vigente en la fecha de confirmación de la reserva. El importe exacto se muestra antes de cualquier cancelación. [Baremo pendiente de validación jurídica.]",
    ],
  },
  { title: "Reclamaciones", body: ["Cualquier reclamación relativa a un servicio debe enviarse a través de la página de {Contacto|/contact} en un plazo de [plazo] días tras el final del evento."] },
  { title: "Legislación aplicable", body: ["Las presentes condiciones se rigen por el derecho francés. En caso de litigio, y a falta de acuerdo amistoso, serán competentes los tribunales del domicilio social del editor."] },
];

export const CONFIDENTIALITE: DocSection[] = [
  {
    title: "Responsable del tratamiento",
    body: ["[Razón social], [dirección], es responsable del tratamiento de los datos recogidos en la plataforma standby. Delegado de protección de datos: [nombre o correo electrónico específico]."],
  },
  {
    title: "Datos recogidos",
    body: [
      [
        "**Empresas**: razón social, SIRET, sector, sitio web, página de LinkedIn, folleto, datos profesionales de los responsables, formato de entrega de los leads.",
        "**Comerciales**: identidad, ciudad, puestos, especialidades, idiomas, tarifa, tallas de uniforme, estatus de autónomo, documento de identidad, certificado URSSAF, datos bancarios.",
        "**Uso del sitio**: datos de conexión y rastreadores, según sus elecciones (véase la {política de cookies|/cookies}).",
      ],
    ],
  },
  {
    title: "Finalidades y bases jurídicas",
    body: [
      [
        "Gestión de cuentas, reservas, misiones, facturación y pagos: ejecución del contrato.",
        "Verificación de perfiles, prevención del fraude, obligaciones contables y sociales: obligación legal e interés legítimo.",
        "Medición de audiencia y mejora del servicio: consentimiento.",
      ],
    ],
  },
  {
    title: "Leads y tarjetas de visita",
    body: [
      "Los contactos recogidos por los comerciales en un stand son datos de la empresa expositora. standby los trata por cuenta de esta, como encargado del tratamiento: control del formato, introducción de las tarjetas de visita (lectura automática y después verificación humana), entrega en la plantilla o el CRM de la empresa. La empresa sigue siendo responsable de informar a las personas afectadas.",
    ],
  },
  {
    title: "Destinatarios",
    body: [
      "Los datos son accesibles para el personal autorizado de standby, para las empresas expositoras y los comerciales únicamente en relación con las misiones correspondientes, y para nuestros proveedores técnicos (alojamiento, base de datos, correo electrónico, lectura de tarjetas), de pago y de nóminas dentro de los límites de sus funciones. Nunca se venden.",
    ],
  },
  {
    title: "Plazos de conservación",
    body: [
      "Cuentas: durante la relación contractual y después [plazo], o hasta que el usuario las elimine. Documentos contables: 10 años, vinculados a una cuenta anonimizada en caso de eliminación. Leads: se eliminan automáticamente tras el plazo fijado por standby ([plazo, 365 días por defecto]). Rastreadores: 13 meses como máximo.",
    ],
  },
  {
    title: "Sus derechos",
    body: [
      "Usted dispone de los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad, así como del derecho a establecer directrices sobre sus datos tras su fallecimiento. Desde la página {Mis datos personales|/compte}, puede descargar sus datos y eliminar usted mismo su cuenta. Para cualquier otra solicitud: [correo electrónico]. Puede presentar una reclamación ante la CNIL (cnil.fr).",
    ],
  },
  {
    title: "Seguridad",
    body: ["Las comunicaciones están cifradas, los accesos están limitados por perfil y los documentos sensibles se almacenan por separado. Los incidentes de seguridad se notifican conforme a la normativa."],
  },
];

export const ACCESSIBILITE: DocSection[] = [
  {
    title: "Estado de conformidad",
    body: ["El sitio standby es **parcialmente conforme** con el referencial francés de accesibilidad (RGAA), versión 4.1. Tasa de conformidad: [xx %, tras la auditoría]."],
  },
  { title: "Contenidos no accesibles", body: ["Las no conformidades y exenciones detectadas durante la auditoría se enumerarán aquí: [pendiente tras la auditoría]."] },
  {
    title: "Elaboración de esta declaración",
    body: [
      "Esta declaración se elaboró el [fecha] a partir de una auditoría realizada por [organismo o autoevaluación] sobre una muestra representativa de páginas: inicio, proceso de reserva, espacios de empresa y de comercial, registros, páginas legales.",
      "Tecnologías utilizadas: HTML, CSS, JavaScript. Entorno de pruebas: [navegadores y lectores de pantalla].",
    ],
  },
  {
    title: "Comentarios y contacto",
    body: ["Si no puede acceder a un contenido o a un servicio, puede ponerse en contacto con nosotros a través de la página de {Contacto|/contact} o en [correo electrónico] para que le indiquemos una alternativa accesible o le facilitemos el contenido en otro formato."],
  },
  {
    title: "Vías de recurso",
    body: [
      "Si detecta un defecto de accesibilidad que le impide acceder a un contenido o a una funcionalidad del sitio, nos lo ha comunicado y no ha obtenido una respuesta satisfactoria, puede dirigirse al Défenseur des droits (formulario en línea en defenseurdesdroits.fr, o correo postal gratuito: Défenseur des droits, Libre réponse 71120, 75342 Paris CEDEX 07).",
    ],
  },
];

export const FAQ: { theme: string; items: [string, string][] }[] = [
  {
    theme: "General",
    items: [
      ["¿Qué es standby?", "Una plataforma que permite a las empresas reservar un equipo para su stand en una feria o un salón, y a los comerciales, azafatos/as, animadores e intérpretes encontrar misiones."],
      ["¿Qué eventos se incluyen?", "Las ferias profesionales y los salones en Francia, con sus fechas de montaje, apertura y desmontaje."],
    ],
  },
  {
    theme: "Empresas expositoras",
    items: [
      ["¿Cómo reservo un equipo?", "Elija el evento, los días y los puestos, redacte su briefing, seleccione los perfiles y valide el presupuesto. Cada comercial recibe su misión y la acepta."],
      ["¿Cómo se calcula el precio?", "Tarifa por hora del perfil × horas facturadas por día × número de días, más los gastos de servicio. El presupuesto sin impuestos se muestra antes de cualquier confirmación."],
      ["¿Puedo modificar o cancelar una reserva?", "Sí, desde su {espacio de empresa|/entreprise}. Las condiciones dependen del plazo de preaviso; véanse las {condiciones generales de venta|/cgv}."],
    ],
  },
  {
    theme: "Comerciales, azafatos/as y animadores",
    items: [
      ["¿Cómo me postulo a una misión?", "Cree su cuenta, indique sus puestos, especialidades e idiomas y acepte las misiones que le convengan. La tarifa por hora se muestra antes de postularse."],
      ["¿Qué documentos debo aportar?", "Un documento de identidad, su certificado de estatus de autónomo (URSSAF) y sus datos bancarios, para verificar su perfil y pagarle."],
    ],
  },
  {
    theme: "Leads y tarjetas de visita",
    items: [["¿Cómo envío mis leads?", "Suba su archivo Excel o fotografíe las tarjetas de visita desde el {espacio de comercial|/commercial}. El formato de la empresa se comprueba antes del envío."]],
  },
  {
    theme: "Pagos y facturación",
    items: [
      ["¿Cuándo cobro?", "Cada lunes, por las horas validadas de la semana trabajada."],
      ["¿Dónde encuentro mi factura?", "Hay una única factura por evento disponible en el espacio de empresa tras la validación de las horas."],
    ],
  },
];
