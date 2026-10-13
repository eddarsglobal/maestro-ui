import { useEffect, useState } from "react";
import { Check, ChevronRight, Languages, PlugZap, ShieldCheck } from "lucide-react";
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
    setSettings({
      ...settings,
      provider,
      providerUrl: selected.url,
    });
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

        <div className="providerGrid">
          {providers.map((provider) => (
            <button
              key={provider.id}
              type="button"
              disabled={!provider.selection_enabled}
              title={provider.reason || undefined}
              className={
                "providerCard " +
                (settings.provider === provider.id ? "selected" : "")
              }
              onClick={() => selectProvider(provider.id)}
            >
              <span className="providerTop">
                <b>{provider.name}</b>
                {settings.provider === provider.id && provider.selection_enabled ? (
                  <Check size={15} />
                ) : (
                  <ChevronRight size={15} />
                )}
              </span>
              <small>{provider.status !== "online" ? labels.unavailable :
                provider.selection_enabled ? labels.ready : labels.discovered}</small>
              <small>{provider.models.length
                ? `${provider.models.length} ${labels.modelCount}: ${provider.models.slice(0, 3).join(", ")}${provider.models.length > 3 ? "…" : ""}`
                : labels.noModels}</small>
            </button>
          ))}
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
