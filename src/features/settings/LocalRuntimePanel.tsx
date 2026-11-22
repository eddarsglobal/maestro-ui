import { useEffect, useState } from "react";
import { Languages, PlugZap, ShieldCheck } from "lucide-react";
import { checkGateway, listGatewayProviders } from "../../services/gateway/client";
import {
  RUNTIME_STORAGE_KEY,
  loadLocalRuntimeSettings,
  type GatewayStatus,
  type LocalProvider,
  type ProviderInventoryEntry,
  type LocalRuntimeSettings,
} from "../../types/gateway";
import {
  SUPPORTED_LANGUAGES,
  type UiLanguage,
  t,
} from "../../i18n";

const MODEL_SETTINGS_COPY: Record<UiLanguage, {
  engine: string; model: string; missing: string; auto: string;
}> = {
  en: {"engine":"Inference engine","model":"Default model","missing":"Saved model unavailable. Choose an available model.","auto":"AUTO may select any authorized local runtime. Manual choice pins the exact engine and model."},
  fr: {"engine":"Moteur LLM","model":"Modèle par défaut","missing":"Le modèle enregistré est indisponible. Choisissez un modèle disponible.","auto":"AUTO peut choisir parmi tous les moteurs locaux autorisés. Le choix manuel fixe le moteur et le modèle."},
  de: {"engine":"LLM-Laufzeit","model":"Standardmodell","missing":"Gespeichertes Modell nicht verfügbar. Bitte ein verfügbares Modell wählen.","auto":"AUTO kann alle autorisierten lokalen Laufzeiten nutzen. Die manuelle Auswahl legt Laufzeit und Modell fest."},
  ar: {"engine":"محرك الذكاء الاصطناعي","model":"النموذج الافتراضي","missing":"النموذج المحفوظ غير متاح. اختر نموذجًا متاحًا.","auto":"قد يختار الوضع التلقائي من جميع المحركات المحلية المصرح بها. يثبت الاختيار اليدوي المحرك والنموذج."},
  pt: {"engine":"Motor LLM","model":"Modelo predefinido","missing":"O modelo guardado está indisponível. Escolha um modelo disponível.","auto":"AUTO pode escolher entre todos os motores locais autorizados. A seleção manual fixa o motor e o modelo."},
  es: {"engine":"Motor LLM","model":"Modelo predeterminado","missing":"El modelo guardado no está disponible. Elija otro modelo.","auto":"AUTO puede elegir entre todos los motores locales autorizados. La selección manual fija el motor y el modelo."},
  hr: {"engine":"LLM pogon","model":"Zadani model","missing":"Spremljeni model nije dostupan. Odaberite dostupan model.","auto":"AUTO može birati među svim odobrenim lokalnim pogonima. Ručni odabir određuje točan pogon i model."},
  it: {"engine":"Motore LLM","model":"Modello predefinito","missing":"Il modello salvato non è disponibile. Scegli un modello disponibile.","auto":"AUTO può scegliere fra tutti i motori locali autorizzati. La scelta manuale fissa motore e modello."},
};

type Props = {
  language: UiLanguage;
  onLanguageChange: (language: UiLanguage) => void;
};

export default function LocalRuntimePanel({
  language,
  onLanguageChange,
}: Props) {
  const [settings, setSettings] =
    useState<LocalRuntimeSettings>(loadLocalRuntimeSettings);
  const [status, setStatus] = useState<GatewayStatus>("offline");
  const [detail, setDetail] = useState(t(language, "noGateway"));
  const [providers, setProviders] = useState<ProviderInventoryEntry[]>([]);
  const [inventoryError, setInventoryError] = useState(false);

  // Gateway is the source of truth; no hard-coded UI inventory.
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const inventory = await listGatewayProviders(settings.gatewayUrl);
        if (active) {
          setProviders(Array.isArray(inventory.providers) ? inventory.providers : []);
          setInventoryError(false);
        }
      } catch {
        if (active) {
          setProviders([]);
          setInventoryError(true);
        }
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, [settings.gatewayUrl]);

  useEffect(() => {
    localStorage.setItem(RUNTIME_STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(
      new CustomEvent("maestro-runtime-settings", {
        detail: settings,
      }),
    );
  }, [settings]);

  const visibleDetail = status === "offline" ? t(language, "noGateway") : detail;

  const runtimeStrings: Record<UiLanguage, {
    ready: string; discovered: string; unavailable: string;
    noModels: string; refreshing: string; observedUrl: string;
    boundary: string; modelCount: string;
  }> = {
    en: { ready: "Ready for governed missions", discovered: "Detected, mission adapter not connected", unavailable: "Offline", noModels: "No models", refreshing: "Gateway inventory unavailable", observedUrl: "Detected endpoint (read-only)", boundary: "Only explicitly integrated runtimes can execute missions.", modelCount: "models" },
    fr: { ready: "Prêt pour les missions gouvernées", discovered: "Détecté, adaptateur de mission non intégré", unavailable: "Hors ligne", noModels: "Aucun modèle", refreshing: "Inventaire Gateway indisponible", observedUrl: "Endpoint détecté (lecture seule)", boundary: "Seuls les moteurs intégrés explicitement peuvent exécuter des missions.", modelCount: "modèles" },
    de: { ready: "Bereit für geregelte Missionen", discovered: "Erkannt, Missionsadapter nicht verbunden", unavailable: "Offline", noModels: "Keine Modelle", refreshing: "Gateway-Inventar nicht verfügbar", observedUrl: "Erkannter Endpunkt (nur Lesen)", boundary: "Nur explizit integrierte Laufzeiten können Missionen ausführen.", modelCount: "Modelle" },
    ar: { ready: "جاهز للمهام الخاضعة للحوكمة", discovered: "تم اكتشافه لكن محول التنفيذ غير متصل", unavailable: "غير متصل", noModels: "لا توجد نماذج", refreshing: "قائمة البوابة غير متاحة", observedUrl: "نقطة اتصال مكتشفة (قراءة فقط)", boundary: "لا يمكن تنفيذ المهام إلا عبر المحركات المدمجة صراحةً.", modelCount: "نماذج" },
    pt: { ready: "Pronto para missões governadas", discovered: "Detetado, adaptador de missão não integrado", unavailable: "Offline", noModels: "Sem modelos", refreshing: "Inventário Gateway indisponível", observedUrl: "Endpoint detetado (só leitura)", boundary: "Só os motores integrados podem executar missões.", modelCount: "modelos" },
    es: { ready: "Listo para misiones gobernadas", discovered: "Detectado, adaptador de misión no conectado", unavailable: "Sin conexión", noModels: "Sin modelos", refreshing: "Inventario Gateway no disponible", observedUrl: "Endpoint detectado (solo lectura)", boundary: "Solo los motores integrados pueden ejecutar misiones.", modelCount: "modelos" },
    hr: { ready: "Spremno za upravljane zadatke", discovered: "Otkriveno, adapter nije povezan", unavailable: "Izvan mreže", noModels: "Nema modela", refreshing: "Gateway popis nije dostupan", observedUrl: "Otkrivena adresa (samo čitanje)", boundary: "Samo izričito integrirani sustavi mogu izvršavati zadatke.", modelCount: "modela" },
    it: { ready: "Pronto per missioni governate", discovered: "Rilevato, adattatore missioni non collegato", unavailable: "Offline", noModels: "Nessun modello", refreshing: "Inventario Gateway non disponibile", observedUrl: "Endpoint rilevato (sola lettura)", boundary: "Solo i motori integrati possono eseguire missioni.", modelCount: "modelli" },
  };
  const labels = runtimeStrings[language];
  const selectedProvider = providers.find((item) => item.id === settings.provider);
  const modelCopy = MODEL_SETTINGS_COPY[language];
  const availableModels = selectedProvider?.selection_enabled ? selectedProvider.models : [];
  const savedModelAvailable = settings.model === "AUTO" || availableModels.some(
    (name) => `${settings.provider}::${name}` === settings.model,
  );

  const testConnection = async () => {
    setStatus("checking");
    setDetail(t(language, "checkingGateway"));

    try {
      const health = await checkGateway(settings.gatewayUrl);
      setStatus("online");

      const parts = [
        health.version ? `Core v${health.version}` : null,
        health.councils ? `${health.councils} Councils` : null,
        health.mission_protocol || null,
      ].filter(Boolean);

      setDetail(
        parts.length
          ? parts.join(" · ")
          : t(language, "gatewayReachable"),
      );
    } catch {
      setStatus("offline");
      setDetail(t(language, "noGateway"));
    }
  };

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const health = await checkGateway(settings.gatewayUrl);
        if (!active) return;
        setStatus("online");
        const summary = [
          health.version ? `Core v${health.version}` : null,
          health.councils ? `${health.councils} Councils` : null,
          health.mission_protocol || null,
        ].filter(Boolean);
        setDetail(summary.length ? summary.join(" · ") : t(language, "gatewayReachable"));
      } catch {
        if (!active) return;
        setStatus("offline");
        setDetail(t(language, "noGateway"));
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, [settings.gatewayUrl, language]);

  const selectProvider = (provider: LocalProvider) => {
    const selected = providers.find((item) => item.id === provider);
    if (!selected?.selection_enabled) return;
    setSettings((current) => ({
      ...current,
      provider,
      providerUrl: selected.url,
      model: "AUTO",
    }));
  };

  return (
    <div className="runtimeSettings">
      <div className="settingsBlock">
        <div className="settingsTitle">
          <span><Languages size={18} /></span>
          <div>
            <b>{t(language, "interfaceLanguage")}</b>
            <small>{t(language, "languageHelp")}</small>
          </div>
        </div>

        <label className="runtimeField">
          <span>{t(language, "interfaceLanguage")}</span>
          <select
            className="settingsSelect"
            value={language}
            onChange={(event) =>
              onLanguageChange(event.target.value as UiLanguage)
            }
          >
            {SUPPORTED_LANGUAGES.map((item) => (
              <option value={item.code} key={item.code}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="settingsBlock">
        <div className="settingsTitle">
          <span><PlugZap size={18} /></span>
          <div>
            <b>{t(language, "gatewayTitle")}</b>
            <small>{t(language, "gatewaySubtitle")}</small>
          </div>
        </div>

        <label className="runtimeField">
          <span>{t(language, "gatewayUrl")}</span>
          <input
            value={settings.gatewayUrl}
            onChange={(event) =>
              setSettings({
                ...settings,
                gatewayUrl: event.target.value,
              })
            }
            spellCheck={false}
          />
        </label>

        <div className="gatewayTest">
          <button
            onClick={testConnection}
            disabled={status === "checking"}
          >
            {status === "checking"
              ? t(language, "checkingGateway")
              : t(language, "testConnection")}
          </button>

          <span className={`gatewayResult ${status}`}>
            <i />
            {visibleDetail}
          </span>
        </div>
      </div>

      <div className="settingsBlock">
        <div className="settingsTitle">
          <span><ShieldCheck size={18} /></span>
          <div>
            <b>{t(language, "localIntelligence")}</b>
            <small>{t(language, "preferredRuntime")}</small>
          </div>
        </div>

        <label className="runtimeField">
          <span>{modelCopy.engine}</span>
          <select
            className="settingsSelect"
            value={settings.provider}
            onChange={(event) => selectProvider(event.target.value)}
          >
            {!selectedProvider && (
              <option value={settings.provider} disabled>
                {settings.provider} — {labels.unavailable}
              </option>
            )}
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id} disabled={!provider.selection_enabled}>
                {provider.name} — {provider.selection_enabled ? labels.ready : labels.unavailable}
              </option>
            ))}
          </select>
        </label>

        <label className="runtimeField">
          <span>{modelCopy.model}</span>
          <select
            className="settingsSelect"
            value={settings.model}
            disabled={!selectedProvider?.selection_enabled}
            onChange={(event) => setSettings((current) => ({
              ...current,
              model: event.target.value,
            }))}
          >
            <option value="AUTO">{t(language, "autoModel")}</option>
            {settings.model !== "AUTO" && !savedModelAvailable && (
              <option value={settings.model} disabled>{modelCopy.missing}</option>
            )}
            {availableModels.map((name) => (
              <option key={name} value={`${settings.provider}::${name}`}>{name}</option>
            ))}
          </select>
        </label>
        {!savedModelAvailable && (
          <div className="gatewayResult offline" role="status">{modelCopy.missing}</div>
        )}
        <div className="localBoundary">
          <ShieldCheck size={15} />
          <span>{modelCopy.auto}</span>
        </div>
        {inventoryError && (
          <div className="gatewayResult offline">{labels.refreshing}</div>
        )}

        <label className="runtimeField">
          <span>{labels.observedUrl}</span>
          <input
            value={selectedProvider?.url || ""}
            readOnly
            spellCheck={false}
            title={labels.boundary}
          />
        </label>

        <div className="localBoundary">
          <ShieldCheck size={15} />
          <span>{labels.boundary} {t(language, "providerBoundary")}</span>
        </div>
      </div>
    </div>
  );
}
