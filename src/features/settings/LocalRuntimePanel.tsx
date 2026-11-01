import { useEffect, useState } from "react";
import { Languages, PlugZap, ShieldCheck } from "lucide-react";
import { checkGateway } from "../../services/gateway/client";
import {
  RUNTIME_STORAGE_KEY,
  loadLocalRuntimeSettings,
  type GatewayStatus,
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

  const visibleDetail = status === "offline" ? t(language, "noGateway") : detail;

  const testConnection = async () => {
    setStatus("checking");
    setDetail(t(language, "checkingGateway"));

    try {
      const health = await checkGateway(settings.gatewayUrl);
      setStatus("online");

      const parts = [
        health.version ? `Core v${health.version}` : null,
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
            <small>{t(language, "gatewayReachable")}</small>
          </div>
        </div>
        <div className={`gatewayResult ${status}`}>
          <i />
          {visibleDetail}
        </div>
      </div>
    </div>
  );
}
