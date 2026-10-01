import { useEffect, useState } from "react";
import { Check, ChevronRight, Languages, PlugZap, ShieldCheck } from "lucide-react";
import { checkGateway } from "../../services/gateway/client";
import {
  RUNTIME_STORAGE_KEY,
  loadLocalRuntimeSettings,
  type GatewayStatus,
  type LocalProvider,
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

  useEffect(() => {
    localStorage.setItem(RUNTIME_STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(
      new CustomEvent("maestro-runtime-settings", {
        detail: settings,
      }),
    );
  }, [settings]);

  useEffect(() => {
    if (status === "offline") {
      setDetail(t(language, "noGateway"));
    }
  }, [language, status]);

  const providers: Array<{
    id: LocalProvider;
    name: string;
    description: string;
    defaultUrl: string;
  }> = [
    {
      id: "ollama",
      name: "Ollama",
      description: t(language, "ollamaDesc"),
      defaultUrl: "http://127.0.0.1:11434",
    },
    {
      id: "lmstudio",
      name: "LM Studio",
      description: t(language, "lmStudioDesc"),
      defaultUrl: "http://127.0.0.1:1234",
    },
    {
      id: "llamacpp",
      name: "llama.cpp",
      description: t(language, "llamaCppDesc"),
      defaultUrl: "http://127.0.0.1:8080",
    },
    {
      id: "custom",
      name: t(language, "customEndpoint"),
      description: t(language, "customDesc"),
      defaultUrl: "http://127.0.0.1:8000",
    },
  ];

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

  const selectProvider = (provider: LocalProvider) => {
    const selected = providers.find((item) => item.id === provider)!;

    setSettings({
      ...settings,
      provider,
      providerUrl: selected.defaultUrl,
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
            {detail}
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
              className={
                "providerCard " +
                (settings.provider === provider.id ? "selected" : "")
              }
              onClick={() => selectProvider(provider.id)}
            >
              <span className="providerTop">
                <b>{provider.name}</b>
                {settings.provider === provider.id ? (
                  <Check size={15} />
                ) : (
                  <ChevronRight size={15} />
                )}
              </span>
              <small>{provider.description}</small>
            </button>
          ))}
        </div>

        <label className="runtimeField">
          <span>{t(language, "providerUrl")}</span>
          <input
            value={settings.providerUrl}
            onChange={(event) =>
              setSettings({
                ...settings,
                providerUrl: event.target.value,
              })
            }
            spellCheck={false}
          />
        </label>

        <div className="localBoundary">
          <ShieldCheck size={15} />
          <span>{t(language, "providerBoundary")}</span>
        </div>
      </div>
    </div>
  );
}
