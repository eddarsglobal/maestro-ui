import { useCallback, useEffect, useRef, useState } from "react";
import {
  Archive, ArrowUp, BookOpen, Bot, CheckCircle2, ChevronDown,
  ExternalLink, FileText, FolderOpen, GitBranch, HelpCircle, Menu,
  MessageSquarePlus, MoreHorizontal, Moon, Pencil, Pin, Search, Copy,
  Settings, Share2, ShieldCheck, Sun, Trash2, X,
} from "lucide-react";
import "./styles/maestro.css";
import LocalRuntimePanel from "./features/settings/LocalRuntimePanel";
import {
  applyChangeProposal, approveChangeProposal, checkGateway, chooseWorkspace, deleteConversation,
  getConversation, listChangeProposals, listConversations,
  listWorkspaces, openGatewaySession, rejectChangeProposal, runGatewayMission,
  updateConversation,
} from "./services/gateway/client";
import {
  loadLocalRuntimeSettings,
  type ChangeProposal, type ConversationRecord, type ConversationSummary,
  type GatewayHealth, type GatewayStatus, type LocalRuntimeSettings,
  type MissionResponse, type WorkspaceRecord,
} from "./types/gateway";
import {
  UI_LANGUAGE_STORAGE_KEY, applyDocumentLanguage, loadUiLanguage, t,
  type UiLanguage,
} from "./i18n";
import { tc } from "./i18n-conversations";
import { tw } from "./i18n-workspace";
import { tch } from "./i18n-changes";
import { isQualityContractFailureMessage } from "./services/gateway/qualityContractFailure";

const CORE = "https://github.com/eddarsglobal/maestro";


type View = "chat" | "help" | "settings";

type ChatItem =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "maestro"; text: string; mission: MissionResponse; elapsedSeconds?: number }
  | { id: string; role: "error"; kind: "quality_contract" | "gateway"; text: string };

function routeFromHash(): View {
  const route = window.location.hash.replace(/^#\/?/, "");
  return route === "help" || route === "settings"
    ? route
    : "chat";
}

function recordToChat(record: ConversationRecord): ChatItem[] {
  const rows: ChatItem[] = [];

  for (const message of record.messages) {
    if (message.role === "user") {
      rows.push({
        id: message.id,
        role: "user",
        text: message.content,
      });
      continue;
    }

    if (message.role === "assistant") {
      const mission = message.metadata?.mission;
      if (mission) {
        rows.push({
          id: message.id,
          role: "maestro",
          text: message.content,
          mission,
        });
      }
    }
  }

  return rows;
}

function diffLineClass(line: string): string {
  if (line.startsWith("+++") || line.startsWith("---")) return "meta";
  if (line.startsWith("+")) return "add";
  if (line.startsWith("-")) return "remove";
  if (line.startsWith("@@")) return "hunk";
  return "context";
}

function changeStatusKey(status: ChangeProposal["status"]): string {
  switch (status) {
    case "AWAITING_APPROVAL":
      return "awaiting";
    case "APPROVED":
      return "approved";
    case "REJECTED":
      return "rejected";
    case "STALE":
      return "stale";
    case "APPLIED":
      return "applied";
    case "APPLY_FAILED":
      return "applyFailed";
    case "ROLLED_BACK":
      return "rolledBack";
    case "ROLLBACK_FAILED":
      return "rollbackFailed";
    case "INTEGRITY_ERROR":
      return "integrityError";
    default:
      return "stale";
  }
}

function conversationText(record: ConversationRecord): string {
  return record.messages
    .filter((item) => item.role === "user" || item.role === "assistant")
    .map((item) =>
      `${item.role === "user" ? "USER" : "MAESTRO"}:\n${item.content}`,
    )
    .join("\n\n");
}

const uiStrings: Record<UiLanguage, {
  pending: string; copy: string; copied: string; copyFailed: string;
  seconds: string; historyTitle: string; historyDetail: string;
  archiveAll: string; deleteAll: string; archiveConfirm: string;
  deleteConfirm: string; deletionPrompt: string; confirmWord: string;
  noConversations: string; bulkFailed: string;
}> = {
  en: { pending: "Responding", copy: "Copy message", copied: "Copied", copyFailed: "Unable to copy this message.", seconds: "s", historyTitle: "Conversation history", historyDetail: "Only chats are affected. Mission records, evidence, workspaces and logs stay untouched.", archiveAll: "Archive all conversations", deleteAll: "Delete all conversations", archiveConfirm: "Archive {n} conversations? You can still find them using search.", deleteConfirm: "Permanently delete {n} conversations, including archived ones? This cannot be undone.", deletionPrompt: "Type DELETE to confirm removal of conversation history:", confirmWord: "DELETE", noConversations: "No conversations to process.", bulkFailed: "The operation stopped. Completed: {done}/{total}." },
  fr: { pending: "Réponse en cours", copy: "Copier le message", copied: "Copié", copyFailed: "Impossible de copier ce message.", seconds: "s", historyTitle: "Historique des conversations", historyDetail: "Concerne uniquement les chats, sans toucher aux missions, preuves, espaces de travail ou journaux.", archiveAll: "Archiver toutes les conversations", deleteAll: "Effacer toutes les conversations", archiveConfirm: "Archiver {n} conversations ? Elles resteront accessibles via la recherche.", deleteConfirm: "Supprimer définitivement {n} conversations, y compris les archivées ? Cette opération est irréversible.", deletionPrompt: "Saisir EFFACER pour confirmer la suppression de l’historique des conversations :", confirmWord: "EFFACER", noConversations: "Aucune conversation à traiter.", bulkFailed: "Opération interrompue. Traité : {done}/{total}." },
  de: { pending: "Antwort wird erstellt", copy: "Nachricht kopieren", copied: "Kopiert", copyFailed: "Kopieren nicht möglich.", seconds: "s", historyTitle: "Unterhaltungsverlauf", historyDetail: "Nur Chats sind betroffen. Missionsnachweise, Arbeitsbereiche und Logs bleiben erhalten.", archiveAll: "Alle Unterhaltungen archivieren", deleteAll: "Alle Unterhaltungen löschen", archiveConfirm: "{n} Unterhaltungen archivieren? Sie bleiben in der Suche auffindbar.", deleteConfirm: "{n} Unterhaltungen samt Archiv endgültig löschen? Nicht rückgängig zu machen.", deletionPrompt: "Zum Bestätigen LÖSCHEN eingeben:", confirmWord: "LÖSCHEN", noConversations: "Keine Unterhaltungen vorhanden.", bulkFailed: "Vorgang unterbrochen. Fertig: {done}/{total}." },
  ar: { pending: "جارٍ إعداد الرد", copy: "نسخ الرسالة", copied: "تم النسخ", copyFailed: "تعذر النسخ.", seconds: "ث", historyTitle: "سجل المحادثات", historyDetail: "المحادثات فقط؛ لا تتأثر سجلات المهام أو الأدلة أو الملفات.", archiveAll: "أرشفة جميع المحادثات", deleteAll: "حذف جميع المحادثات", archiveConfirm: "أرشفة {n} محادثات؟ يمكن البحث عنها لاحقاً.", deleteConfirm: "حذف {n} محادثات نهائياً بما فيها المؤرشفة؟ لا يمكن التراجع.", deletionPrompt: "اكتب حذف للتأكيد:", confirmWord: "حذف", noConversations: "لا توجد محادثات.", bulkFailed: "توقفت العملية. المنجز: {done}/{total}." },
  pt: { pending: "A preparar resposta", copy: "Copiar mensagem", copied: "Copiado", copyFailed: "Não foi possível copiar.", seconds: "s", historyTitle: "Histórico de conversas", historyDetail: "Só as conversas são afetadas; missões, evidências e registos mantêm-se.", archiveAll: "Arquivar todas as conversas", deleteAll: "Apagar todas as conversas", archiveConfirm: "Arquivar {n} conversas? Continuam pesquisáveis.", deleteConfirm: "Eliminar permanentemente {n} conversas, incluindo as arquivadas? Irreversível.", deletionPrompt: "Escreva APAGAR para confirmar:", confirmWord: "APAGAR", noConversations: "Sem conversas.", bulkFailed: "Operação interrompida. Concluídas: {done}/{total}." },
  es: { pending: "Preparando respuesta", copy: "Copiar mensaje", copied: "Copiado", copyFailed: "No se pudo copiar.", seconds: "s", historyTitle: "Historial de conversaciones", historyDetail: "Solo se afectan los chats; se conservan misiones, pruebas y registros.", archiveAll: "Archivar todas las conversaciones", deleteAll: "Eliminar todas las conversaciones", archiveConfirm: "¿Archivar {n} conversaciones? Seguirán disponibles mediante búsqueda.", deleteConfirm: "¿Eliminar permanentemente {n} conversaciones, incluidas las archivadas? No se puede deshacer.", deletionPrompt: "Escribe ELIMINAR para confirmar:", confirmWord: "ELIMINAR", noConversations: "No hay conversaciones.", bulkFailed: "Operación detenida. Completadas: {done}/{total}." },
  hr: { pending: "Pripremam odgovor", copy: "Kopiraj poruku", copied: "Kopirano", copyFailed: "Kopiranje nije uspjelo.", seconds: "s", historyTitle: "Povijest razgovora", historyDetail: "Samo razgovori; misije, dokazi i zapisnici ostaju netaknuti.", archiveAll: "Arhiviraj sve razgovore", deleteAll: "Izbriši sve razgovore", archiveConfirm: "Arhivirati {n} razgovora? Ostaju dostupni putem pretrage.", deleteConfirm: "Trajno izbrisati {n} razgovora, uključujući arhivirane? Nema povrata.", deletionPrompt: "Unesite IZBRIŠI za potvrdu:", confirmWord: "IZBRIŠI", noConversations: "Nema razgovora.", bulkFailed: "Operacija prekinuta. Dovršeno: {done}/{total}." },
  it: { pending: "Risposta in corso", copy: "Copia messaggio", copied: "Copiato", copyFailed: "Impossibile copiare.", seconds: "s", historyTitle: "Cronologia conversazioni", historyDetail: "Solo chat: missioni, prove e registri restano invariati.", archiveAll: "Archivia tutte le conversazioni", deleteAll: "Elimina tutte le conversazioni", archiveConfirm: "Archiviare {n} conversazioni? Rimangono ricercabili.", deleteConfirm: "Eliminare definitivamente {n} conversazioni, comprese le archiviate? Irreversibile.", deletionPrompt: "Scrivi ELIMINA per confermare:", confirmWord: "ELIMINA", noConversations: "Nessuna conversazione.", bulkFailed: "Operazione interrotta. Completate: {done}/{total}." },
};

function fillCount(template: string, n: number): string {
  return template.replace("{n}", String(n));
}

export default function App() {
  const [view, setView] = useState<View>(routeFromHash());
  const [theme, setThemeState] = useState<"dark"|"light">(
    () => localStorage.getItem("maestro-theme") === "light" ? "light" : "dark",
  );
  const [language, setLanguageState] =
    useState<UiLanguage>(loadUiLanguage);
  const [mobile, setMobile] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [runtimeSettings, setRuntimeSettings] =
    useState<LocalRuntimeSettings>(loadLocalRuntimeSettings);
  const [gatewayStatus, setGatewayStatus] =
    useState<GatewayStatus>("checking");
  const [gatewayHealth, setGatewayHealth] =
    useState<GatewayHealth | null>(null);
  const [running, setRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState("");
  const startMsRef = useRef<number | null>(null);
  const cancelMissionRef = useRef<AbortController | null>(null);

  const [conversations, setConversations] =
    useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] =
    useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] =
    useState<ConversationSummary[]>([]);
  const [workspaces, setWorkspaces] =
    useState<WorkspaceRecord[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] =
    useState<string | null>(null);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [workspaceBusy, setWorkspaceBusy] = useState(false);
  const [changeProposals, setChangeProposals] =
    useState<ChangeProposal[]>([]);
  const [changesOpen, setChangesOpen] = useState(false);
  const [selectedChangeId, setSelectedChangeId] =
    useState<string | null>(null);
  const [changeBusy, setChangeBusy] = useState(false);

  const sessionTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!running || startMsRef.current === null) return;
    const update = () => setElapsedSeconds(
      Math.floor((performance.now() - startMsRef.current!) / 1000),
    );
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [running]);

  const copyChatMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(current => current === id ? null : current), 1600);
    } catch {
      window.alert(uiStrings[language].copyFailed);
    }
  };

  useEffect(() => {
    applyDocumentLanguage(language);
  }, [language]);

  useEffect(() => {
    const onHash = () => setView(routeFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const onSettings = (event: Event) => {
      const custom = event as CustomEvent<LocalRuntimeSettings>;
      if (custom.detail) {
        setRuntimeSettings(custom.detail);
        sessionTokenRef.current = null;
      }
    };
    window.addEventListener("maestro-runtime-settings", onSettings);
    return () =>
      window.removeEventListener("maestro-runtime-settings", onSettings);
  }, []);

  const setLanguage = (next: UiLanguage) => {
    localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, next);
    setLanguageState(next);
  };

  const go = (next: View) => {
    setView(next);
    setMobile(false);
    window.location.assign(next === "chat" ? "#/" : `#/${next}`);
  };

  const setTheme = (next: "dark"|"light") => {
    localStorage.setItem("maestro-theme", next);
    document.documentElement.style.colorScheme = next;
    setThemeState(next);
  };

  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionTokenRef.current) return sessionTokenRef.current;
    const session = await openGatewaySession(runtimeSettings.gatewayUrl);
    sessionTokenRef.current = session.session_token;
    return session.session_token;
  }, [runtimeSettings.gatewayUrl]);

  const withFreshSession = useCallback(async <T,>(
    fn: (token: string) => Promise<T>,
  ): Promise<T> => {
    let token = await ensureSession();

    try {
      return await fn(token);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.toLowerCase().includes("session")) throw error;

      sessionTokenRef.current = null;
      token = await ensureSession();
      return fn(token);
    }
  }, [ensureSession]);

  const refreshConversations = async () => {
    if (gatewayStatus === "offline") return;

    try {
      const rows = await withFreshSession((token) =>
        listConversations(runtimeSettings.gatewayUrl, token),
      );
      setConversations(rows);
    } catch {
      setConversations([]);
    }
  };

  const refreshWorkspaces = useCallback(async () => {
    if (gatewayStatus === "offline") return;

    try {
      const rows = await withFreshSession((token) =>
        listWorkspaces(runtimeSettings.gatewayUrl, token),
      );
      setWorkspaces(rows);

      setActiveWorkspaceId((current) =>
        current && !rows.some((item) => item.id === current && item.exists)
          ? null
          : current,
      );
    } catch {
      setWorkspaces([]);
    }
  }, [gatewayStatus, runtimeSettings.gatewayUrl, withFreshSession]);

  const refreshChanges = useCallback(async (
    workspaceId: string | null = activeWorkspaceId,
  ): Promise<ChangeProposal[]> => {
    if (gatewayStatus === "offline" || !workspaceId) {
      setChangeProposals([]);
      return [];
    }

    try {
      const rows = await withFreshSession((token) =>
        listChangeProposals(
          runtimeSettings.gatewayUrl,
          token,
          workspaceId,
        ),
      );
      setChangeProposals(rows);

      setSelectedChangeId((current) =>
        current && !rows.some((item) => item.id === current)
          ? rows[0]?.id ?? null
          : current,
      );

      return rows;
    } catch {
      setChangeProposals([]);
      return [];
    }
  }, [activeWorkspaceId, gatewayStatus, runtimeSettings.gatewayUrl, withFreshSession]);

  const openChanges = async () => {
    if (!activeWorkspaceId || gatewayStatus !== "online") return;
    setChangesOpen(true);

    const rows = await refreshChanges(activeWorkspaceId);
    setSelectedChangeId((current) =>
      current && rows.some((item) => item.id === current)
        ? current
        : rows[0]?.id ?? null,
    );
  };

  const actOnChange = async (
    action: "approve" | "reject" | "apply",
    changeId: string,
  ) => {
    if (changeBusy) return;

    const targetChange =
      changeProposals.find((item) => item.id === changeId) ?? null;

    const targetIsRelocation =
      targetChange?.operation === "rename" ||
      targetChange?.operation === "move";

    const targetIsDelete =
      targetChange?.operation === "delete";

    if (
      action === "approve" &&
      targetIsDelete &&
      !window.confirm(
        tch(language, "approveDeleteConfirm"),
      )
    ) {
      return;
    }

    if (
      action === "apply" &&
      !window.confirm(
        tch(
          language,
          targetIsDelete
            ? "applyDeleteConfirm"
            : targetIsRelocation
              ? "applyRelocationConfirm"
              : "applyConfirm",
        ),
      )
    ) {
      return;
    }

    setChangeBusy(true);

    try {
      const updated = await withFreshSession((token) => {
        if (action === "approve") {
          return approveChangeProposal(
            runtimeSettings.gatewayUrl,
            token,
            changeId,
            targetIsDelete,
          );
        }

        if (action === "reject") {
          return rejectChangeProposal(
            runtimeSettings.gatewayUrl,
            token,
            changeId,
          );
        }

        return applyChangeProposal(
          runtimeSettings.gatewayUrl,
          token,
          changeId,
        );
      });

      setChangeProposals((rows) =>
        rows.map((item) => item.id === updated.id ? updated : item),
      );
      setSelectedChangeId(updated.id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : tch(language, "actionFailed");
      window.alert(message);

      const rows = await refreshChanges(activeWorkspaceId);
      setSelectedChangeId((current) =>
        current && rows.some((item) => item.id === current)
          ? current
          : rows[0]?.id ?? null,
      );
    } finally {
      setChangeBusy(false);
    }
  };

  const chooseLocalWorkspace = async (kind: "file" | "folder") => {
    if (workspaceBusy || gatewayStatus !== "online") return;

    setWorkspaceBusy(true);

    try {
      const selected = await withFreshSession((token) =>
        chooseWorkspace(runtimeSettings.gatewayUrl, token, kind),
      );

      if (selected.cancelled || !selected.id) return;

      setActiveWorkspaceId(selected.id);
      await refreshWorkspaces();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : tw(language, "pickerFailed");
      window.alert(message);
    } finally {
      setWorkspaceBusy(false);
      setWorkspaceMenuOpen(false);
    }
  };

  const openConversation = async (conversationId: string) => {
    const record = await withFreshSession((token) =>
      getConversation(runtimeSettings.gatewayUrl, token, conversationId),
    );

    setActiveConversationId(record.id);
    setMessages(recordToChat(record));
    setOpenMenuId(null);
    setSearchOpen(false);
    go("chat");
  };

  useEffect(() => {
    let cancelled = false;

    const inspectRuntime = async () => {
      setGatewayStatus("checking");

      try {
        const health = await checkGateway(runtimeSettings.gatewayUrl);
        if (cancelled) return;

        setGatewayHealth(health);
        setGatewayStatus("online");

        try {
          const rows = await withFreshSession((token) =>
            listConversations(runtimeSettings.gatewayUrl, token),
          );
          if (!cancelled) setConversations(rows);
        } catch {
          if (!cancelled) setConversations([]);
        }
      } catch {
        if (cancelled) return;
        setGatewayHealth(null);
        setGatewayStatus("offline");
        setConversations([]);
        sessionTokenRef.current = null;
      }
    };

    void inspectRuntime();
    return () => { cancelled = true; };
  }, [runtimeSettings.gatewayUrl, withFreshSession]);

  useEffect(() => {
    if (gatewayStatus !== "online") return;
    let cancelled = false;
    const inspectWorkspaces = async () => {
      try {
        const rows = await withFreshSession((token) =>
          listWorkspaces(runtimeSettings.gatewayUrl, token),
        );
        if (cancelled) return;
        setWorkspaces(rows);
        setActiveWorkspaceId((current) =>
          current && !rows.some((item) => item.id === current && item.exists)
            ? null
            : current,
        );
      } catch {
        if (!cancelled) setWorkspaces([]);
      }
    };
    void inspectWorkspaces();
    return () => { cancelled = true; };
  }, [gatewayStatus, runtimeSettings.gatewayUrl, withFreshSession]);

  useEffect(() => {
    let cancelled = false;
    const inspectChanges = async () => {
      if (gatewayStatus !== "online" || !activeWorkspaceId) {
        // Keep state updates out of the synchronous effect lifecycle.
        await Promise.resolve();
        if (!cancelled) {
          setChangeProposals([]);
          setSelectedChangeId(null);
        }
        return;
      }
      try {
        const rows = await withFreshSession((token) =>
          listChangeProposals(runtimeSettings.gatewayUrl, token, activeWorkspaceId),
        );
        if (cancelled) return;
        setChangeProposals(rows);
        setSelectedChangeId((current) =>
          current && !rows.some((item) => item.id === current)
            ? rows[0]?.id ?? null
            : current,
        );
      } catch {
        if (!cancelled) setChangeProposals([]);
      }
    };
    void inspectChanges();
    return () => { cancelled = true; };
  }, [activeWorkspaceId, gatewayStatus, runtimeSettings.gatewayUrl, withFreshSession]);

  useEffect(() => {
    if (!searchOpen) return;

    const timer = window.setTimeout(async () => {
      try {
        const rows = await withFreshSession((token) =>
          listConversations(
            runtimeSettings.gatewayUrl,
            token,
            {
              includeArchived: true,
              query: searchQuery,
            },
          ),
        );
        setSearchResults(rows);
      } catch {
        setSearchResults([]);
      }
    }, 120);

    return () => window.clearTimeout(timer);
  }, [searchOpen, searchQuery, runtimeSettings.gatewayUrl, withFreshSession]);


  const startNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setPrompt("");
    setOpenMenuId(null);
    go("chat");
  };

  const send = async () => {
    const text = prompt.trim();
    if (!text || running) return;

    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", text },
    ]);
    setPrompt("");
    startMsRef.current = performance.now();
    setElapsedSeconds(0);
    setRunning(true);
    const cancellationController = new AbortController();
    cancelMissionRef.current = cancellationController;

    try {
      setGatewayStatus("checking");

      const health = await checkGateway(runtimeSettings.gatewayUrl);
      setGatewayHealth(health);
      setGatewayStatus("online");

      const mission = await withFreshSession((token) =>
        runGatewayMission(runtimeSettings.gatewayUrl, token, {
          prompt: text,
          model: null,
          max_tokens: 512,
          conversation_id: activeConversationId,
          workspace_id: activeWorkspaceId,
          ui_language: language,
        }, { signal: cancellationController.signal }),
      );

      setActiveConversationId(mission.conversation_id);

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "maestro",
          text: mission.output,
          mission,
          elapsedSeconds: startMsRef.current === null ? undefined : Math.max(0.1, (performance.now() - startMsRef.current) / 1000),
        },
      ]);

      await refreshConversations();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown MAESTRO Gateway error";

      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "error", kind: isQualityContractFailureMessage(message) ? "quality_contract" : "gateway", text: message },
      ]);
    } finally {
      if (cancelMissionRef.current === cancellationController) {
        cancelMissionRef.current = null;
      }
      setRunning(false);
      startMsRef.current = null;
    }
  };

  const patchConversation = async (
    conversation: ConversationSummary,
    patch: {
      title?: string;
      pinned?: boolean;
      archived?: boolean;
    },
  ) => {
    await withFreshSession((token) =>
      updateConversation(
        runtimeSettings.gatewayUrl,
        token,
        conversation.id,
        patch,
      ),
    );

    setOpenMenuId(null);
    await refreshConversations();
  };

  const renameConversation = async (conversation: ConversationSummary) => {
    const value = window.prompt(
      tc(language, "renamePrompt"),
      conversation.title,
    );

    if (!value?.trim()) return;

    await patchConversation(conversation, {
      title: value.trim(),
    });
  };

  const archiveConversation = async (conversation: ConversationSummary) => {
    await patchConversation(conversation, {
      archived: true,
    });

    if (activeConversationId === conversation.id) {
      startNewChat();
    }
  };

  const removeConversation = async (conversation: ConversationSummary) => {
    if (!window.confirm(tc(language, "confirmDelete"))) return;

    await withFreshSession((token) =>
      deleteConversation(
        runtimeSettings.gatewayUrl,
        token,
        conversation.id,
      ),
    );

    if (activeConversationId === conversation.id) {
      startNewChat();
    }

    setOpenMenuId(null);
    await refreshConversations();
  };

  const shareConversation = async (conversation: ConversationSummary) => {
    const record = await withFreshSession((token) =>
      getConversation(
        runtimeSettings.gatewayUrl,
        token,
        conversation.id,
      ),
    );

    const text = conversationText(record);

    if (navigator.share) {
      try {
        await navigator.share({
          title: record.title,
          text,
        });
        return;
      } catch {
        // User cancellation falls through to clipboard.
      }
    }

    await navigator.clipboard.writeText(text);
    window.alert(tc(language, "copied"));
  };

  // Scoped to ConversationStore via existing authenticated, per-conversation APIs.
  // No bulk delete endpoint, no filesystem history wipes, no bypass of user approval.
  const manageConversationHistory = async (action: "archive" | "delete") => {
    if (running || bulkBusy || gatewayStatus !== "online") return;
    const strings = uiStrings[language];
    try {
      const all = await withFreshSession(token =>
        listConversations(runtimeSettings.gatewayUrl, token, { includeArchived: true }),
      );
      const rows = action === "archive" ? all.filter(row => !row.archived) : all;
      if (!rows.length) {
        window.alert(strings.noConversations);
        return;
      }
      const message = fillCount(action === "archive" ? strings.archiveConfirm : strings.deleteConfirm, rows.length);
      if (!window.confirm(message)) return;
      if (action === "delete" && window.prompt(strings.deletionPrompt) !== strings.confirmWord) return;

      setBulkBusy(true);
      let done = 0;
      try {
        for (const row of rows) {
          await withFreshSession(token => action === "archive"
            ? updateConversation(runtimeSettings.gatewayUrl, token, row.id, { archived: true }).then(() => undefined)
            : deleteConversation(runtimeSettings.gatewayUrl, token, row.id));
          done += 1;
          setBulkProgress(`${done}/${rows.length}`);
        }
        setActiveConversationId(null);
        setMessages([]);
      } catch (error) {
        window.alert(strings.bulkFailed.replace("{done}", String(done)).replace("{total}", String(rows.length)) +
          " " + (error instanceof Error ? error.message : ""));
      } finally {
        await refreshConversations();
        setBulkProgress("");
        setBulkBusy(false);
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : strings.bulkFailed);
    }
  };

  const featureResults = [
    {
      key: "new-chat",
      label: t(language, "newChat"),
      action: startNewChat,
    },
    {
      key: "settings",
      label: t(language, "settings"),
      action: () => go("settings"),
    },
    {
      key: "help",
      label: t(language, "help"),
      action: () => go("help"),
    },
  ].filter((item) =>
    item.label.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );

  const pinned = conversations.filter((item) => item.pinned);
  const recent = conversations.filter((item) => !item.pinned);
  const activeWorkspace =
    workspaces.find((item) => item.id === activeWorkspaceId) ?? null;
  const pendingChanges = changeProposals.filter(
    (item) =>
      item.status === "AWAITING_APPROVAL" ||
      item.status === "APPROVED",
  ).length;
  const selectedChange =
    changeProposals.find((item) => item.id === selectedChangeId) ??
    changeProposals[0] ??
    null;

  const selectedIsRelocation =
    selectedChange?.operation === "rename" ||
    selectedChange?.operation === "move";

  const selectedIsDelete =
    selectedChange?.operation === "delete";

  const runtimeLabel =
    gatewayStatus === "online"
      ? t(language, "online")
      : gatewayStatus === "checking"
        ? t(language, "checking")
        : t(language, "offline");

  const renderConversation = (conversation: ConversationSummary) => (
    <div
      className={
        "conversationRow " +
        (activeConversationId === conversation.id ? "active" : "")
      }
      key={conversation.id}
    >
      <button
        className="conversationOpen"
        onClick={() => void openConversation(conversation.id)}
        title={conversation.title}
      >
        {conversation.pinned && <Pin size={12}/>}
        <span>{conversation.title}</span>
      </button>

      <div className="conversationMenuWrap">
        <button
          className="conversationMore"
          onClick={(event) => {
            event.stopPropagation();
            setOpenMenuId(
              openMenuId === conversation.id ? null : conversation.id,
            );
          }}
          aria-label="Conversation menu"
        >
          <MoreHorizontal size={16}/>
        </button>

        {openMenuId === conversation.id && (
          <div className="conversationMenu">
            <button onClick={() => void renameConversation(conversation)}>
              <Pencil size={14}/> {tc(language, "rename")}
            </button>
            <button
              onClick={() =>
                void patchConversation(conversation, {
                  pinned: !conversation.pinned,
                })
              }
            >
              <Pin size={14}/>
              {tc(language, conversation.pinned ? "unpin" : "pin")}
            </button>
            <button onClick={() => void shareConversation(conversation)}>
              <Share2 size={14}/> {tc(language, "share")}
            </button>
            <button onClick={() => void archiveConversation(conversation)}>
              <Archive size={14}/> {tc(language, "archive")}
            </button>
            <button
              className="danger"
              onClick={() => void removeConversation(conversation)}
            >
              <Trash2 size={14}/> {tc(language, "delete")}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="app" data-theme={theme}>
      <aside className={"sidebar " + (mobile ? "open" : "")}>
        <div className="brandRow">
          <button className="brand" onClick={() => go("chat")}>
            <span className="logo">M</span>
            <span>
              <b>MAESTRO</b>
              <small>{t(language, "sovereignControlPlane")}</small>
            </span>
          </button>

          <div className="brandActions">
            <button
              className="icon"
              onClick={() => {
                setSearchOpen(true);
                setSearchQuery("");
              }}
              aria-label={tc(language, "searchTitle")}
              title={tc(language, "searchTitle")}
            >
              <Search size={17}/>
            </button>

            <button
              className="icon mobileOnly"
              onClick={() => setMobile(false)}
            >
              <X size={18}/>
            </button>
          </div>
        </div>

        <button className="newChat" onClick={startNewChat}>
          <MessageSquarePlus size={17}/> {t(language, "newChat")}
        </button>

        <div className="sidebarConversations">
          <div className="conversationList">
            {pinned.length > 0 && (
              <div className="conversationSection">
                <span className="label">{tc(language, "pinned")}</span>
                {pinned.map(renderConversation)}
              </div>
            )}

            <div className="conversationSection">
              <span className="label">{tc(language, "recents")}</span>
              {recent.map(renderConversation)}
            </div>
          </div>
        </div>

        <nav>
          <button className={view==="help"?"active":""} onClick={() => go("help")}>
            <HelpCircle size={17}/> {t(language, "help")}
          </button>
          <a href={CORE} target="_blank" rel="noreferrer">
            <GitBranch size={17}/> GitHub <ExternalLink size={13}/>
          </a>
          <button className={view==="settings"?"active":""} onClick={() => go("settings")}>
            <Settings size={17}/> {t(language, "settings")}
          </button>
          <a className="maestroAttribution" href="https://github.com/eddarsglobal" target="_blank" rel="noopener noreferrer">
            by EddarsGlobal <ExternalLink size={12}/>
          </a>
        </nav>
      </aside>

      {mobile && <button className="scrim" onClick={() => setMobile(false)}/>}

      <main>
        <header>
          <div>
            <button className="icon mobileOnly" onClick={() => setMobile(true)}>
              <Menu size={18}/>
            </button>
            <button
              className={`runtime runtime-${gatewayStatus}`}
              onClick={() => go("settings")}
            >
              <i/>
              {t(language, "localRuntime")}
              <b>{runtimeLabel}</b>
            </button>
          </div>

          <div className="headerRight">
            {gatewayHealth?.version && (
              <span className="coreVersion">CORE {gatewayHealth.version}</span>
            )}
            <span className="local">
              <ShieldCheck size={15}/> {t(language, "localFirst")}
            </span>
            <button
              className="icon"
              onClick={() => setTheme(theme==="dark"?"light":"dark")}
            >
              {theme==="dark"?<Sun size={17}/>:<Moon size={17}/>}
            </button>
          </div>
        </header>

        {view==="chat" && (
          <section className="chat">

            {messages.length===0 ? (
              <div className="hero">
                <span className="heroLogo">M</span>
                <small>{t(language, "sovereignAI")}</small>
                <h1>{t(language, "heroTitle")}</h1>
                <p>{t(language, "heroText")}</p>
                <div className="actions">
                  <a href={CORE + "/blob/main/README.md"} target="_blank" rel="noreferrer">
                    <BookOpen size={16}/> {t(language, "coreSpecification")}
                  </a>
                </div>
              </div>
            ) : (
              <div className="missionConversation">
                {messages.map((message) => {
                  if (message.role==="user") {
                    return (
                      <div className="chatRow chatRowUser" key={message.id}>
                        <div className="chatBubble userBubble">
                          <div className="maestroMessageTop"><span className="chatRole">{t(language, "you")}</span>
                            <button className="maestroCopyButton" type="button" title={uiStrings[language].copy}
                              aria-label={uiStrings[language].copy} onClick={() => void copyChatMessage(message.id, message.text)}>
                              {copiedId === message.id ? <span>{uiStrings[language].copied}</span> : <Copy size={15}/>}
                            </button>
                          </div>
                          <p>{message.text}</p>
                        </div>
                      </div>
                    );
                  }

                  if (message.role==="error") {
                    return (
                      <div className="chatRow" key={message.id}>
                        <div className="chatAvatar errorAvatar"><X size={17}/></div>
                        <div className="chatBubble errorBubble">
                          <span className="chatRole">{t(language, message.kind === "quality_contract" ? "qualityFailure" : "gatewayError")}</span>
                          <p>{message.text}</p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="chatRow" key={message.id}>
                      <div className="chatAvatar maestroAvatar"><Bot size={17}/></div>
                      <div className="chatBubble maestroBubble">
                        <div className="answerHeader">
                          <span className="chatRole">{t(language, "maestro")}</span>
                          <div className="maestroAnswerActions">
                            {message.elapsedSeconds !== undefined && <span className="maestroResponseTime" title={uiStrings[language].seconds}>
                              {message.elapsedSeconds.toFixed(1)} {uiStrings[language].seconds}
                            </span>}
                            <button className="maestroCopyButton" type="button" title={uiStrings[language].copy}
                              aria-label={uiStrings[language].copy} onClick={() => void copyChatMessage(message.id, message.text)}>
                              {copiedId === message.id ? <span>{uiStrings[language].copied}</span> : <Copy size={15}/>}
                            </button>
                          </div>
                        </div>

                        <p className="maestroOutput">{message.text}</p>
                      </div>
                    </div>
                  );
                })}

                {running && (
                  <div className="chatRow">
                    <div className="chatAvatar maestroAvatar maestroActiveAvatar" aria-hidden="true"><Bot size={17}/></div>
                    <div className="chatBubble missionRunning maestroProgress" role="status" aria-live="off">
                      <div className="maestroMessageTop">
                        <span className="chatRole">MAESTRO</span>
                        <span className="maestroElapsed" aria-label={`${elapsedSeconds} ${uiStrings[language].seconds}`}>
                          {elapsedSeconds} {uiStrings[language].seconds}
                        </span>
                      </div>
                      <div className="maestroProgressLine">
                        <span>{uiStrings[language].pending}</span>
                        <span className="maestroActivityDots" aria-hidden="true"><i/><i/><i/></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

                        <div className="composerDock">
              <div className="composerWrap">
                <div className="workspaceToolbar">
                                  <div className="workspacePickerWrap">
                                    <button
                                      className={
                                        "workspaceTrigger " +
                                        (activeWorkspace ? "active" : "")
                                      }
                                      onClick={() => setWorkspaceMenuOpen((value) => !value)}
                                      disabled={running || gatewayStatus !== "online"}
                                      title={tw(language, "workspace")}
                                    >
                                      <FolderOpen size={15}/>
                                      <span>
                                        {activeWorkspace
                                          ? activeWorkspace.label
                                          : tw(language, "workspace")}
                                      </span>
                                      <ChevronDown size={13}/>
                                    </button>

                                    {workspaceMenuOpen && (
                                      <div className="workspaceMenu">
                                        <button
                                          onClick={() => void chooseLocalWorkspace("folder")}
                                          disabled={workspaceBusy}
                                        >
                                          <FolderOpen size={15}/>
                                          <span>{tw(language, "openFolder")}</span>
                                        </button>
                                        <button
                                          onClick={() => void chooseLocalWorkspace("file")}
                                          disabled={workspaceBusy}
                                        >
                                          <FileText size={15}/>
                                          <span>{tw(language, "openFile")}</span>
                                        </button>

                                        {workspaces.length > 0 && (
                                          <>
                                            <div className="workspaceMenuDivider"/>
                                            <span className="workspaceMenuLabel">
                                              {tw(language, "authorized")}
                                            </span>
                                            {workspaces.map((workspace) => (
                                              <button
                                                key={workspace.id}
                                                className={
                                                  workspace.id === activeWorkspaceId
                                                    ? "selected"
                                                    : ""
                                                }
                                                onClick={() => {
                                                  setActiveWorkspaceId(workspace.id);
                                                  setWorkspaceMenuOpen(false);
                                                }}
                                                disabled={!workspace.exists}
                                                title={workspace.path}
                                              >
                                                {workspace.kind === "file"
                                                  ? <FileText size={15}/>
                                                  : <FolderOpen size={15}/>}
                                                <span>
                                                  <b>{workspace.label}</b>
                                                  <small>
                                                    {workspace.exists
                                                      ? tw(language, "readOnly")
                                                      : tw(language, "missing")}
                                                  </small>
                                                </span>
                                              </button>
                                            ))}
                                          </>
                                        )}

                                        {activeWorkspace && (
                                          <>
                                            <div className="workspaceMenuDivider"/>
                                            <button
                                              onClick={() => {
                                                setActiveWorkspaceId(null);
                                                setWorkspaceMenuOpen(false);
                                              }}
                                            >
                                              <X size={15}/>
                                              <span>{tw(language, "detach")}</span>
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {activeWorkspace && (
                                    <div className="workspaceStatusGroup">
                                      <button
                                        className="changeTrigger"
                                        onClick={() => void openChanges()}
                                        disabled={gatewayStatus !== "online"}
                                        title={tch(language, "title")}
                                      >
                                        <FileText size={13}/>
                                        <span>{tch(language, "changes")}</span>
                                        {pendingChanges > 0 && (
                                          <span className="changeCount">
                                            {pendingChanges}
                                          </span>
                                        )}
                                      </button>

                                      <span
                                        className="workspaceReadChip"
                                        title={activeWorkspace.path}
                                      >
                                        <ShieldCheck size={13}/>
                                        {tw(language, "readOnly")}
                                      </span>
                                    </div>
                                  )}

                </div>

                <div className="composer">
                  <textarea
                                      value={prompt}
                                      disabled={running}
                                      onChange={(event) => setPrompt(event.target.value)}
                                      onKeyDown={(event) => {
                                        if (event.key==="Enter" && !event.shiftKey && !running) {
                                          event.preventDefault();
                                          void send();
                                        }
                                      }}
                                      placeholder={
                                        gatewayStatus==="offline"
                                          ? t(language,"connectGateway")
                                          : t(language,"askMaestro")
                                      }
                                      rows={1}
                                    />

                  <div className="composerBottom">


                                    {running ? (
                                      <button
                                        type="button"
                                        aria-label={t(language, "stopMission")}
                                        title={t(language, "stopMission")}
                                        onClick={() => cancelMissionRef.current?.abort()}
                                      >
                                        <X size={17}/>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => void send()}
                                        disabled={!prompt.trim() || gatewayStatus!=="online"}
                                      >
                                        <ArrowUp size={17}/>
                                      </button>
                                    )}
                                  </div>
                </div>

                <small>{t(language,"footerPrivacy")}</small>
              </div>
            </div>
          </section>
        )}

        {view==="help" && (
          <section className="page">
            <small>{t(language,"documentation")}</small>
            <h2>{t(language,"helpResources")}</h2>
            <div className="resourceGrid">
              <a href={CORE+"#quick-installation"} target="_blank" rel="noreferrer">
                <BookOpen/><b>{t(language,"gettingStarted")}</b>
                <span>{t(language,"installValidate")}</span>
              </a>
              <a href={CORE+"/blob/main/docs/LOCAL_AI.md"} target="_blank" rel="noreferrer">
                <ShieldCheck/><b>{t(language,"localAI")}</b>
                <span>{t(language,"ollamaLocal")}</span>
              </a>
              <a href={CORE+"/issues"} target="_blank" rel="noreferrer">
                <GitBranch/><b>{t(language,"issues")}</b>
                <span>{t(language,"reportImprove")}</span>
              </a>
            </div>
          </section>
        )}

        {view==="settings" && (
          <section className="page settingsPage">
            <small>{t(language,"localConfiguration")}</small>
            <h2>{t(language,"settings")}</h2>
            <p>{t(language,"settingsIntro")}</p>

            <div className="appearanceBar">
              <span>
                <b>{t(language,"appearance")}</b>
                <small>{t(language,"localUiTheme")}</small>
              </span>
              <div>
                <button
                  className={theme==="dark"?"selected":""}
                  onClick={() => setTheme("dark")}
                >
                  {t(language,"dark")}
                </button>
                <button
                  className={theme==="light"?"selected":""}
                  onClick={() => setTheme("light")}
                >
                  {t(language,"light")}
                </button>
              </div>
            </div>

            <LocalRuntimePanel
              language={language}
              onLanguageChange={setLanguage}
            />
            <section className="maestroHistorySettings" aria-label={uiStrings[language].historyTitle}>
              <h3>{uiStrings[language].historyTitle}</h3>
              <p>{uiStrings[language].historyDetail}</p>
              <div className="maestroHistoryActions">
                <button type="button" disabled={bulkBusy || running || gatewayStatus !== "online"}
                  onClick={() => void manageConversationHistory("archive")}>{<Archive size={16}/>} {uiStrings[language].archiveAll}</button>
                <button type="button" className="maestroDangerAction" disabled={bulkBusy || running || gatewayStatus !== "online"}
                  onClick={() => void manageConversationHistory("delete")}>{<Trash2 size={16}/>} {uiStrings[language].deleteAll}</button>
              </div>
              {bulkBusy && <p role="status">{bulkProgress}</p>}
            </section>
          </section>
        )}
      </main>

      {changesOpen && (
        <div className="changeBackdrop" onClick={() => setChangesOpen(false)}>
          <div className="changePanel" onClick={(event) => event.stopPropagation()}>
            <div className="changeHeader">
              <div className="changeHeaderTitle">
                <b>{tch(language, "title")}</b>
                <small>{tch(language, "subtitle")}</small>
                <span className="changeNoWrite">
                  <ShieldCheck size={13}/>
                  {tch(language, "executionGuard")}
                </span>
              </div>

              <button
                className="icon"
                onClick={() => setChangesOpen(false)}
                title={tch(language, "close")}
              >
                <X size={17}/>
              </button>
            </div>

            <div className="changeBody">
              <aside className="changeList">
                <span className="changeListLabel">
                  {tch(language, "recent")}
                </span>

                {changeProposals.length > 0 ? (
                  changeProposals.map((proposal) => (
                    <button
                      className={
                        "changeListItem " +
                        (selectedChange?.id === proposal.id ? "selected" : "")
                      }
                      key={proposal.id}
                      onClick={() => setSelectedChangeId(proposal.id)}
                    >
                      <span className="changeListItemTop">
                        <b>{proposal.path}</b>
                        <span
                          className={
                            "changeStatus " +
                            proposal.status.toLowerCase()
                          }
                        >
                          {tch(language, changeStatusKey(proposal.status))}
                        </span>
                      </span>
                      <small>
                        {proposal.operation.toUpperCase()} · {proposal.id}
                      </small>

                      {(proposal.operation === "rename" ||
                        proposal.operation === "move") &&
                        proposal.destination_path && (
                          <small className="changeListDestination">
                            → {proposal.destination_path}
                          </small>
                        )}

                      {proposal.operation === "delete" && (
                        <small className="changeListDelete">
                          <Trash2 size={11}/>
                          {tch(language, "riskHigh")} · {tch(language, "governedDelete")}
                        </small>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="changeEmpty">
                    {tch(language, "empty")}
                  </div>
                )}
              </aside>

              {selectedChange ? (
                <section className="changeViewer">
                  <div className="changeMeta">
                    <div>
                      <span>{tch(language, "proposal")}</span>
                      <b>{selectedChange.id}</b>
                    </div>
                    <div>
                      <span>{tch(language, "operation")}</span>
                      <b>{selectedChange.operation.toUpperCase()}</b>
                    </div>
                    <div>
                      <span>{tch(language, "effect")}</span>
                      <b>{selectedChange.effect}</b>
                    </div>
                    <div>
                      <span>Status</span>
                      <b>{tch(language, changeStatusKey(selectedChange.status))}</b>
                    </div>
                  </div>

                  {selectedIsRelocation &&
                    selectedChange.destination_path && (
                      <div className="changeRelocationPaths">
                        <div>
                          <span>{tch(language, "sourcePath")}</span>
                          <code>{selectedChange.path}</code>
                        </div>

                        <div className="changeRelocationArrow">
                          <span aria-hidden="true">→</span>
                        </div>

                        <div>
                          <span>{tch(language, "destinationPath")}</span>
                          <code>{selectedChange.destination_path}</code>
                        </div>
                      </div>
                    )}

                  {selectedIsDelete && (
                    <div className="changeDeleteRisk" role="alert">
                      <div className="changeDeleteRiskTop">
                        <span>
                          <Trash2 size={15}/>
                          {tch(language, "riskHigh")}
                        </span>
                        <b>{tch(language, "governedDelete")}</b>
                      </div>

                      <p>
                        {tch(language, "deleteWarning")}
                      </p>

                      <div className="changeDeleteFacts">
                        <div>
                          <span>{tch(language, "deleteTarget")}</span>
                          <code>{selectedChange.path}</code>
                        </div>

                        <div>
                          <span>{tch(language, "fileSize")}</span>
                          <code>{selectedChange.before_size} B</code>
                        </div>

                        <div>
                          <span>{tch(language, "recovery")}</span>
                          <b>
                            {selectedChange.recovery_required
                              ? tch(language, "recoveryRequired")
                              : tch(language, "recoveryUnavailable")}
                          </b>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="changeSha">
                    <div>
                      <span>{tch(language, "before")}</span>
                      <code>
                        {selectedChange.before_sha256 ?? "/dev/null"}
                      </code>
                    </div>
                    <div>
                      <span>{tch(language, "after")}</span>
                      <code>
                        {selectedChange.after_sha256 ?? "/dev/null"}
                      </code>
                    </div>
                  </div>

                  <pre className="changeDiff">
                    {selectedChange.diff.split("\n").map((line, index) => (
                      <span
                        className={"diffLine " + diffLineClass(line)}
                        key={`${selectedChange.id}-${index}`}
                      >
                        {line || " "}
                        {"\n"}
                      </span>
                    ))}
                  </pre>

                  {selectedChange.diff_truncated && (
                    <div className="changeTruncated">
                      {tch(language, "diffTruncated")}
                    </div>
                  )}

                  <div className="changeActions">
                    {selectedChange.status === "AWAITING_APPROVAL" && (
                      <>
                        <button
                          className="danger"
                          disabled={changeBusy}
                          onClick={() =>
                            void actOnChange("reject", selectedChange.id)
                          }
                        >
                          {tch(language, "reject")}
                        </button>
                        <button
                          className={selectedIsDelete ? "deleteApprove" : "primary"}
                          disabled={changeBusy}
                          onClick={() =>
                            void actOnChange("approve", selectedChange.id)
                          }
                        >
                          {changeBusy
                            ? <span className="maestroActivityDots" aria-hidden="true"><i/><i/><i/></span>
                            : <CheckCircle2 size={15}/>}
                          {tch(language, selectedIsDelete ? "approveDelete" : "approve")}
                        </button>
                      </>
                    )}

                    {selectedChange.status === "APPROVED" && (
                      <button
                        className={selectedIsDelete ? "apply deleteApply" : "apply"}
                        disabled={changeBusy}
                        onClick={() =>
                          void actOnChange("apply", selectedChange.id)
                        }
                      >
                        {changeBusy
                          ? <span className="maestroActivityDots" aria-hidden="true"><i/><i/><i/></span>
                          : <ShieldCheck size={15}/>}
                        {tch(language, selectedIsDelete ? "applyDelete" : "apply")}
                      </button>
                    )}
                  </div>

                  {(selectedChange.status === "APPLIED" ||
                    selectedChange.status === "APPLY_FAILED" ||
                    selectedChange.status === "ROLLED_BACK" ||
                    selectedChange.status === "ROLLBACK_FAILED" ||
                    selectedChange.status === "INTEGRITY_ERROR") && (
                    <div className="changeExecutionEvidence">
                      {selectedChange.applied_path && (
                        <div>
                          <span>{tch(language, "appliedPath")}</span>
                          <code>{selectedChange.applied_path}</code>
                        </div>
                      )}

                      {!selectedIsDelete &&
                        selectedChange.applied_sha256 && (
                        <div>
                          <span>{tch(language, "appliedSha")}</span>
                          <code>{selectedChange.applied_sha256}</code>
                        </div>
                      )}

                      {selectedIsDelete &&
                        selectedChange.deleted_path && (
                          <div>
                            <span>{tch(language, "deletedPath")}</span>
                            <code>{selectedChange.deleted_path}</code>
                          </div>
                        )}

                      {selectedIsDelete &&
                        selectedChange.deleted_sha256 && (
                          <div>
                            <span>{tch(language, "deletedSha")}</span>
                            <code>{selectedChange.deleted_sha256}</code>
                          </div>
                        )}

                      {selectedIsDelete &&
                        typeof selectedChange.recovery_available === "boolean" && (
                          <div>
                            <span>{tch(language, "recovery")}</span>
                            <b
                              className={
                                selectedChange.recovery_available
                                  ? "changeRecoveryReady"
                                  : "changeRecoveryMissing"
                              }
                            >
                              {tch(
                                language,
                                selectedChange.recovery_available
                                  ? "recoveryAvailable"
                                  : "recoveryUnavailable",
                              )}
                            </b>
                          </div>
                        )}

                      {selectedIsDelete &&
                        selectedChange.recovery_sha256 && (
                          <div>
                            <span>{tch(language, "recoverySha")}</span>
                            <code>{selectedChange.recovery_sha256}</code>
                          </div>
                        )}

                      {selectedIsDelete &&
                        selectedChange.recovery_size !== undefined && (
                          <div>
                            <span>{tch(language, "recoverySize")}</span>
                            <code>{selectedChange.recovery_size} B</code>
                          </div>
                        )}

                      {selectedIsDelete &&
                        selectedChange.recovery_staged_at && (
                          <div>
                            <span>{tch(language, "recoveryStagedAt")}</span>
                            <code>{selectedChange.recovery_staged_at}</code>
                          </div>
                        )}

                      {selectedChange.apply_error && (
                        <div>
                          <span>{tch(language, "executionError")}</span>
                          <code>{selectedChange.apply_error}</code>
                        </div>
                      )}

                      {selectedChange.workspace_state_restored === true && (
                        <div className="changeRestored">
                          <ShieldCheck size={14}/>
                          {tch(language, "workspaceRestored")}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              ) : (
                <div className="changeEmpty">
                  {tch(language, "empty")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {searchOpen && (
        <div className="globalSearchBackdrop" onClick={() => setSearchOpen(false)}>
          <div className="globalSearch" onClick={(event) => event.stopPropagation()}>
            <div className="globalSearchHeader">
              <Search size={18}/>
              <input
                autoFocus
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={tc(language, "searchPlaceholder")}
              />
              <button className="icon" onClick={() => setSearchOpen(false)}>
                <X size={17}/>
              </button>
            </div>

            <div className="globalSearchBody">
              {featureResults.length > 0 && (
                <section>
                  <span className="label">{tc(language, "features")}</span>
                  {featureResults.map((item) => (
                    <button
                      className="searchResult"
                      key={item.key}
                      onClick={() => {
                        setSearchOpen(false);
                        item.action();
                      }}
                    >
                      <Settings size={15}/>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </section>
              )}

              <section>
                <span className="label">{tc(language, "conversations")}</span>
                {searchResults.length > 0 ? (
                  searchResults.map((conversation) => (
                    <button
                      className="searchResult"
                      key={conversation.id}
                      onClick={() => void openConversation(conversation.id)}
                    >
                      <MessageSquarePlus size={15}/>
                      <span>
                        <b>{conversation.title}</b>
                        <small>
                          {conversation.archived
                            ? tc(language, "archived")
                            : conversation.preview}
                        </small>
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="searchEmpty">{tc(language, "noResults")}</div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
