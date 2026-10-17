export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "ar", label: "العربية" },
  { code: "pt", label: "Português" },
  { code: "es", label: "Español" },
  { code: "hr", label: "Hrvatski" },
  { code: "it", label: "Italiano" },
] as const;

export type UiLanguage =
  (typeof SUPPORTED_LANGUAGES)[number]["code"];

export const UI_LANGUAGE_STORAGE_KEY = "maestro-ui-language";

const SUPPORTED = new Set<string>(
  SUPPORTED_LANGUAGES.map((item) => item.code),
);

function languageCode(value: string): string {
  return String(value || "")
    .toLowerCase()
    .split("-")[0]
    .split("_")[0];
}

export function detectUiLanguage(): UiLanguage {
  const intlLocale =
    Intl.DateTimeFormat().resolvedOptions().locale || "";

  const candidates = [
    ...(navigator.languages || []),
    navigator.language || "",
    intlLocale,
  ];

  for (const candidate of candidates) {
    const code = languageCode(candidate);
    if (SUPPORTED.has(code)) {
      return code as UiLanguage;
    }
  }

  return "en";
}

export function loadUiLanguage(): UiLanguage {
  const stored = localStorage.getItem(UI_LANGUAGE_STORAGE_KEY);
  if (stored && SUPPORTED.has(stored)) {
    return stored as UiLanguage;
  }
  // Explicit English default; other supported languages are user choices.
  // Conversation input may still be in any of the eight languages.
  return "en";
}

export function applyDocumentLanguage(language: UiLanguage): void {
  document.documentElement.lang = language;
  document.documentElement.dir =
    language === "ar" ? "rtl" : "ltr";
}

const en: Record<string, string> = {
  stopMission: "Stop current mission",
  sovereignControlPlane: "SOVEREIGN CONTROL PLANE",
  newChat: "New chat",
  search: "Search",
  recents: "RECENTS",
  recent1: "Local model orchestration",
  recent2: "Council architecture",
  recent3: "Governed mission design",
  councils: "Councils",
  help: "Help",
  settings: "Settings",
  localRuntime: "LOCAL RUNTIME",
  online: "ONLINE",
  checking: "CHECKING",
  offline: "OFFLINE",
  localFirst: "Local-first",
  sovereignAI: "SOVEREIGN ARTIFICIAL INTELLIGENCE",
  heroTitle: "What would you like MAESTRO to accomplish?",
  heroText:
    "Models provide intelligence. MAESTRO retains authority, orchestration, evidence and verification.",
  exploreCouncils: "Explore Councils",
  coreSpecification: "Core specification",
  you: "YOU",
  maestro: "MAESTRO",
  gatewayError: "GATEWAY ERROR",
  qualityFailure: "RESPONSE NOT COMPLIANT",
  ayDelivery: "AY {verdict} · DELIVERY",
  governedMission: "Governed mission in progress",
  askMaestro: "Ask MAESTRO...",
  connectGateway: "Connect MAESTRO Local Gateway to continue...",
  autoModel: "AUTO · MAESTRO SELECTS",
  localModels: "{count} local models",
  gatewayNotConnected: "Gateway not connected",
  footerPrivacy:
    "Your intelligence stays on your machine. MAESTRO controls the mission lifecycle.",
  missionDetails: "Mission details",
  mode: "MODE",
  model: "MODEL",
  task: "TASK",
  evidence: "EVIDENCE",
  tx: "TX",
  latency: "LATENCY",
  truthScope: "TRUTH SCOPE",
  committed: "COMMITTED",
  notCommitted: "NOT COMMITTED",
  semanticVerified: "SEMANTIC VERIFIED",
  deliveryOnly: "DELIVERY ONLY",
  governedDomains: "GOVERNED DOMAINS",
  genesisCouncils: "Genesis Councils",
  councilsIntro:
    "Councils define responsibility, authority and expected evidence inside MAESTRO.",
  documentation: "DOCUMENTATION",
  helpResources: "Help & resources",
  gettingStarted: "Getting started",
  installValidate: "Install and validate MAESTRO Core.",
  explore18: "Explore all 18 governed domains.",
  localAI: "Local AI",
  ollamaLocal: "Ollama and local intelligence.",
  issues: "Issues",
  reportImprove: "Report defects and propose improvements.",
  localConfiguration: "LOCAL CONFIGURATION",
  settingsIntro:
    "Configure the local browser-to-MAESTRO boundary. These values stay on this device.",
  appearance: "Appearance",
  localUiTheme: "Local UI theme",
  dark: "Dark",
  light: "Light",
  interfaceLanguage: "Interface language",
  languageHelp:
    "Detected automatically on first use. You can override it here.",
  gatewayTitle: "MAESTRO Local Gateway",
  gatewaySubtitle: "Secure browser-to-Core bridge",
  gatewayUrl: "Gateway URL",
  testConnection: "Test connection",
  checkingGateway: "Checking…",
  noGateway: "No MAESTRO Local Gateway detected",
  gatewayReachable: "Gateway reachable",
  localIntelligence: "Local intelligence",
  preferredRuntime: "Preferred inference runtime",
  providerUrl: "Provider URL",
  providerBoundary:
    "Provider configuration stays local. Official mission execution travels through MAESTRO Gateway and MAESTRO Core.",
  ollamaDesc: "Local model discovery and inference.",
  lmStudioDesc: "Local OpenAI-compatible inference server.",
  llamaCppDesc: "Lightweight local inference endpoint.",
  customEndpoint: "Custom local endpoint",
  customDesc: "OpenAI-compatible endpoint on your machine.",
};

const fr: Record<string, string> = {
  stopMission: "Arrêter la mission",
  ...en,
  sovereignControlPlane: "PLAN DE CONTRÔLE SOUVERAIN",
  newChat: "Nouvelle conversation",
  search: "Rechercher",
  recents: "RÉCENTS",
  recent1: "Orchestration des modèles locaux",
  recent2: "Architecture des Conseils",
  recent3: "Conception de mission gouvernée",
  councils: "Conseils",
  help: "Aide",
  settings: "Paramètres",
  localRuntime: "RUNTIME LOCAL",
  online: "EN LIGNE",
  checking: "VÉRIFICATION",
  offline: "HORS LIGNE",
  localFirst: "Local d'abord",
  heroTitle: "Que souhaitez-vous confier à MAESTRO ?",
  heroText:
    "Les modèles fournissent l'intelligence. MAESTRO conserve l'autorité, l'orchestration, les preuves et la vérification.",
  exploreCouncils: "Explorer les Conseils",
  coreSpecification: "Spécification du Core",
  you: "VOUS",
  gatewayError: "ERREUR GATEWAY",
  qualityFailure: "RÉPONSE NON CONFORME",
  ayDelivery: "AY {verdict} · LIVRAISON",
  governedMission: "Mission gouvernée en cours",
  askMaestro: "Demander à MAESTRO...",
  connectGateway: "Connectez MAESTRO Local Gateway pour continuer...",
  autoModel: "AUTO · MAESTRO SÉLECTIONNE",
  localModels: "{count} modèles locaux",
  gatewayNotConnected: "Gateway non connecté",
  footerPrivacy:
    "Votre intelligence reste sur votre machine. MAESTRO contrôle le cycle de vie de la mission.",
  missionDetails: "Détails de la mission",
  model: "MODÈLE",
  task: "TÂCHE",
  evidence: "PREUVE",
  latency: "LATENCE",
  truthScope: "PORTÉE DE VÉRIFICATION",
  committed: "COMMITÉ",
  notCommitted: "NON COMMITÉ",
  semanticVerified: "SÉMANTIQUE VÉRIFIÉE",
  deliveryOnly: "LIVRAISON UNIQUEMENT",
  governedDomains: "DOMAINES GOUVERNÉS",
  genesisCouncils: "Conseils Genesis",
  councilsIntro:
    "Les Conseils définissent les responsabilités, l'autorité et les preuves attendues dans MAESTRO.",
  helpResources: "Aide & ressources",
  gettingStarted: "Bien démarrer",
  installValidate: "Installer et valider MAESTRO Core.",
  explore18: "Explorer les 18 domaines gouvernés.",
  localAI: "IA locale",
  ollamaLocal: "Ollama et intelligence locale.",
  reportImprove: "Signaler un défaut ou proposer une amélioration.",
  localConfiguration: "CONFIGURATION LOCALE",
  settingsIntro:
    "Configurez la frontière locale entre le navigateur et MAESTRO. Ces valeurs restent sur cet appareil.",
  appearance: "Apparence",
  localUiTheme: "Thème local de l'interface",
  dark: "Sombre",
  light: "Clair",
  interfaceLanguage: "Langue de l'interface",
  languageHelp:
    "Détectée automatiquement au premier lancement. Vous pouvez la modifier ici.",
  gatewaySubtitle: "Pont sécurisé entre le navigateur et le Core",
  gatewayUrl: "URL du Gateway",
  testConnection: "Tester la connexion",
  checkingGateway: "Vérification…",
  noGateway: "Aucun MAESTRO Local Gateway détecté",
  gatewayReachable: "Gateway accessible",
  localIntelligence: "Intelligence locale",
  preferredRuntime: "Runtime d'inférence préféré",
  providerUrl: "URL du provider",
  providerBoundary:
    "La configuration du provider reste locale. Les missions officielles passent par MAESTRO Gateway et MAESTRO Core.",
  ollamaDesc: "Découverte et inférence des modèles locaux.",
  lmStudioDesc: "Serveur d'inférence local compatible OpenAI.",
  llamaCppDesc: "Endpoint local d'inférence léger.",
  customEndpoint: "Endpoint local personnalisé",
  customDesc: "Endpoint compatible OpenAI sur votre machine.",
};

const de: Record<string, string> = {
  stopMission: "Aktuelle Mission stoppen",
  ...en,
  qualityFailure: "ANTWORT NICHT KONFORM",
  newChat: "Neuer Chat",
  search: "Suchen",
  recents: "ZULETZT",
  councils: "Räte",
  help: "Hilfe",
  settings: "Einstellungen",
  localRuntime: "LOKALE RUNTIME",
  checking: "PRÜFUNG",
  heroTitle: "Was soll MAESTRO für Sie erledigen?",
  heroText:
    "Modelle liefern Intelligenz. MAESTRO behält Autorität, Orchestrierung, Evidenz und Verifikation.",
  exploreCouncils: "Räte erkunden",
  coreSpecification: "Core-Spezifikation",
  you: "SIE",
  ayDelivery: "AY {verdict} · AUSLIEFERUNG",
  governedMission: "Governed Mission läuft",
  askMaestro: "MAESTRO fragen...",
  autoModel: "AUTO · MAESTRO WÄHLT",
  localModels: "{count} lokale Modelle",
  missionDetails: "Missionsdetails",
  model: "MODELL",
  task: "AUFGABE",
  evidence: "EVIDENZ",
  latency: "LATENZ",
  truthScope: "VERIFIKATIONSUMFANG",
  deliveryOnly: "NUR AUSLIEFERUNG",
  localConfiguration: "LOKALE KONFIGURATION",
  appearance: "Darstellung",
  localUiTheme: "Lokales UI-Theme",
  dark: "Dunkel",
  light: "Hell",
  interfaceLanguage: "Oberflächensprache",
  languageHelp:
    "Beim ersten Start automatisch erkannt. Hier kann sie geändert werden.",
  gatewaySubtitle: "Sichere Browser-zu-Core-Brücke",
  gatewayUrl: "Gateway-URL",
  testConnection: "Verbindung testen",
  checkingGateway: "Prüfen…",
  noGateway: "Kein MAESTRO Local Gateway erkannt",
  localIntelligence: "Lokale Intelligenz",
  preferredRuntime: "Bevorzugte Inferenz-Runtime",
  providerUrl: "Provider-URL",
};

const ar: Record<string, string> = {
  stopMission: "إيقاف المهمة الحالية",
  ...en,
  qualityFailure: "الرد غير مطابق",
  newChat: "محادثة جديدة",
  search: "بحث",
  recents: "الأخيرة",
  councils: "المجالس",
  help: "المساعدة",
  settings: "الإعدادات",
  localRuntime: "التشغيل المحلي",
  online: "متصل",
  checking: "جارٍ التحقق",
  offline: "غير متصل",
  localFirst: "محلي أولاً",
  heroTitle: "ماذا تريد من MAESTRO أن ينجز؟",
  heroText:
    "النماذج توفر الذكاء، بينما يحتفظ MAESTRO بالسلطة والتنظيم والأدلة والتحقق.",
  exploreCouncils: "استكشاف المجالس",
  coreSpecification: "مواصفات النواة",
  you: "أنت",
  ayDelivery: "AY {verdict} · التسليم",
  governedMission: "المهمة المحكومة قيد التنفيذ",
  askMaestro: "اسأل MAESTRO...",
  autoModel: "تلقائي · MAESTRO يختار",
  localModels: "{count} نموذج محلي",
  missionDetails: "تفاصيل المهمة",
  model: "النموذج",
  task: "المهمة",
  evidence: "الدليل",
  latency: "زمن الاستجابة",
  truthScope: "نطاق التحقق",
  committed: "تم الحفظ",
  notCommitted: "لم يتم الحفظ",
  deliveryOnly: "التسليم فقط",
  localConfiguration: "الإعداد المحلي",
  appearance: "المظهر",
  localUiTheme: "سمة الواجهة المحلية",
  dark: "داكن",
  light: "فاتح",
  interfaceLanguage: "لغة الواجهة",
  languageHelp:
    "يتم اكتشافها تلقائياً عند أول استخدام ويمكن تغييرها هنا.",
  gatewaySubtitle: "جسر آمن بين المتصفح والنواة",
  gatewayUrl: "عنوان البوابة",
  testConnection: "اختبار الاتصال",
  checkingGateway: "جارٍ التحقق…",
  noGateway: "لم يتم اكتشاف MAESTRO Local Gateway",
  localIntelligence: "الذكاء المحلي",
  preferredRuntime: "بيئة الاستدلال المفضلة",
  providerUrl: "عنوان المزوّد",
};

const pt: Record<string, string> = {
  stopMission: "Parar missão atual",
  ...en,
  qualityFailure: "RESPOSTA NÃO CONFORME",
  newChat: "Nova conversa",
  search: "Pesquisar",
  recents: "RECENTES",
  councils: "Conselhos",
  help: "Ajuda",
  settings: "Definições",
  localRuntime: "RUNTIME LOCAL",
  checking: "A VERIFICAR",
  heroTitle: "O que gostaria que o MAESTRO realizasse?",
  heroText:
    "Os modelos fornecem inteligência. O MAESTRO mantém autoridade, orquestração, evidência e verificação.",
  exploreCouncils: "Explorar Conselhos",
  coreSpecification: "Especificação do Core",
  you: "VOCÊ",
  ayDelivery: "AY {verdict} · ENTREGA",
  governedMission: "Missão governada em curso",
  askMaestro: "Perguntar ao MAESTRO...",
  autoModel: "AUTO · MAESTRO SELECIONA",
  localModels: "{count} modelos locais",
  missionDetails: "Detalhes da missão",
  model: "MODELO",
  task: "TAREFA",
  evidence: "EVIDÊNCIA",
  latency: "LATÊNCIA",
  truthScope: "ESCOPO DA VERIFICAÇÃO",
  deliveryOnly: "APENAS ENTREGA",
  localConfiguration: "CONFIGURAÇÃO LOCAL",
  appearance: "Aparência",
  localUiTheme: "Tema local da interface",
  dark: "Escuro",
  light: "Claro",
  interfaceLanguage: "Idioma da interface",
  languageHelp:
    "Detetado automaticamente no primeiro uso. Pode alterá-lo aqui.",
  gatewayUrl: "URL do Gateway",
  testConnection: "Testar ligação",
  checkingGateway: "A verificar…",
  noGateway: "MAESTRO Local Gateway não detetado",
  localIntelligence: "Inteligência local",
  preferredRuntime: "Runtime de inferência preferido",
  providerUrl: "URL do provider",
};

const es: Record<string, string> = {
  stopMission: "Detener misión actual",
  ...en,
  qualityFailure: "RESPUESTA NO CONFORME",
  newChat: "Nuevo chat",
  search: "Buscar",
  recents: "RECIENTES",
  councils: "Consejos",
  help: "Ayuda",
  settings: "Configuración",
  localRuntime: "RUNTIME LOCAL",
  checking: "COMPROBANDO",
  heroTitle: "¿Qué le gustaría que MAESTRO lograra?",
  heroText:
    "Los modelos aportan inteligencia. MAESTRO conserva autoridad, orquestación, evidencia y verificación.",
  exploreCouncils: "Explorar Consejos",
  coreSpecification: "Especificación del Core",
  you: "TÚ",
  ayDelivery: "AY {verdict} · ENTREGA",
  governedMission: "Misión gobernada en curso",
  askMaestro: "Preguntar a MAESTRO...",
  autoModel: "AUTO · MAESTRO SELECCIONA",
  localModels: "{count} modelos locales",
  missionDetails: "Detalles de la misión",
  model: "MODELO",
  task: "TAREA",
  evidence: "EVIDENCIA",
  latency: "LATENCIA",
  truthScope: "ALCANCE DE VERIFICACIÓN",
  deliveryOnly: "SOLO ENTREGA",
  localConfiguration: "CONFIGURACIÓN LOCAL",
  appearance: "Apariencia",
  localUiTheme: "Tema local de la interfaz",
  dark: "Oscuro",
  light: "Claro",
  interfaceLanguage: "Idioma de la interfaz",
  languageHelp:
    "Detectado automáticamente en el primer uso. Puede cambiarlo aquí.",
  gatewayUrl: "URL del Gateway",
  testConnection: "Probar conexión",
  checkingGateway: "Comprobando…",
  noGateway: "No se detectó MAESTRO Local Gateway",
  localIntelligence: "Inteligencia local",
  preferredRuntime: "Runtime de inferencia preferido",
  providerUrl: "URL del provider",
};

const hr: Record<string, string> = {
  stopMission: "Zaustavi trenutni zadatak",
  ...en,
  sovereignControlPlane: "SUVERENA UPRAVLJAČKA RAVNINA",
  newChat: "Novi razgovor",
  search: "Pretraži",
  recents: "NEDAVNO",
  recent1: "Orkestracija lokalnih modela",
  recent2: "Arhitektura vijeća",
  recent3: "Dizajn upravljane misije",
  councils: "Vijeća",
  help: "Pomoć",
  settings: "Postavke",
  localRuntime: "LOKALNI RUNTIME",
  checking: "PROVJERA",
  heroTitle: "Što želite da MAESTRO izvrši?",
  heroText:
    "Modeli pružaju inteligenciju. MAESTRO zadržava autoritet, orkestraciju, dokaze i provjeru.",
  exploreCouncils: "Istraži vijeća",
  coreSpecification: "Specifikacija Corea",
  you: "VI",
  gatewayError: "GREŠKA GATEWAYA",
  qualityFailure: "ODGOVOR NIJE SUKLADAN",
  ayDelivery: "AY {verdict} · ISPORUKA",
  governedMission: "Upravljana misija je u tijeku",
  askMaestro: "Pitaj MAESTRO...",
  connectGateway: "Povežite MAESTRO Local Gateway za nastavak...",
  autoModel: "AUTO · MAESTRO ODABIRE",
  localModels: "{count} lokalnih modela",
  gatewayNotConnected: "Gateway nije povezan",
  footerPrivacy:
    "Vaša inteligencija ostaje na vašem računalu. MAESTRO upravlja životnim ciklusom misije.",
  missionDetails: "Detalji misije",
  model: "MODEL",
  task: "ZADATAK",
  evidence: "DOKAZ",
  latency: "LATENCIJA",
  truthScope: "OPSEG PROVJERE",
  deliveryOnly: "SAMO ISPORUKA",
  localConfiguration: "LOKALNA KONFIGURACIJA",
  appearance: "Izgled",
  localUiTheme: "Lokalna tema sučelja",
  dark: "Tamno",
  light: "Svijetlo",
  interfaceLanguage: "Jezik sučelja",
  languageHelp:
    "Automatski se otkriva pri prvom korištenju. Ovdje ga možete promijeniti.",
  gatewaySubtitle: "Siguran most između preglednika i Corea",
  gatewayUrl: "Gateway URL",
  testConnection: "Testiraj vezu",
  checkingGateway: "Provjera…",
  noGateway: "MAESTRO Local Gateway nije otkriven",
  gatewayReachable: "Gateway je dostupan",
  localIntelligence: "Lokalna inteligencija",
  preferredRuntime: "Preferirani inference runtime",
  providerUrl: "Provider URL",
};

const it: Record<string, string> = {
  stopMission: "Interrompi la missione",
  ...en,
  qualityFailure: "RISPOSTA NON CONFORME",
  newChat: "Nuova chat",
  search: "Cerca",
  recents: "RECENTI",
  councils: "Consigli",
  help: "Aiuto",
  settings: "Impostazioni",
  localRuntime: "RUNTIME LOCALE",
  checking: "VERIFICA",
  heroTitle: "Cosa vorresti far realizzare a MAESTRO?",
  heroText:
    "I modelli forniscono intelligenza. MAESTRO mantiene autorità, orchestrazione, evidenze e verifica.",
  exploreCouncils: "Esplora i Consigli",
  coreSpecification: "Specifica del Core",
  you: "TU",
  ayDelivery: "AY {verdict} · CONSEGNA",
  governedMission: "Missione governata in corso",
  askMaestro: "Chiedi a MAESTRO...",
  autoModel: "AUTO · MAESTRO SELEZIONA",
  localModels: "{count} modelli locali",
  missionDetails: "Dettagli missione",
  model: "MODELLO",
  task: "ATTIVITÀ",
  evidence: "EVIDENZA",
  latency: "LATENZA",
  truthScope: "AMBITO DI VERIFICA",
  deliveryOnly: "SOLO CONSEGNA",
  localConfiguration: "CONFIGURAZIONE LOCALE",
  appearance: "Aspetto",
  localUiTheme: "Tema locale dell'interfaccia",
  dark: "Scuro",
  light: "Chiaro",
  interfaceLanguage: "Lingua dell'interfaccia",
  languageHelp:
    "Rilevata automaticamente al primo utilizzo. Puoi modificarla qui.",
  gatewayUrl: "URL del Gateway",
  testConnection: "Testa connessione",
  checkingGateway: "Verifica…",
  noGateway: "MAESTRO Local Gateway non rilevato",
  localIntelligence: "Intelligenza locale",
  preferredRuntime: "Runtime di inferenza preferito",
  providerUrl: "URL del provider",
};

const TABLE: Record<UiLanguage, Record<string, string>> = {
  en,
  fr,
  de,
  ar,
  pt,
  es,
  hr,
  it,
};

export function t(
  language: UiLanguage,
  key: string,
  vars?: Record<string, string | number>,
): string {
  let value = TABLE[language]?.[key] ?? en[key] ?? key;

  if (vars) {
    for (const [name, replacement] of Object.entries(vars)) {
      value = value.replaceAll(
        `{${name}}`,
        String(replacement),
      );
    }
  }

  return value;
}
