import { useCallback, useEffect, useRef, useState } from "react";
import {
  Archive, ArrowUp, BookOpen, Bot, CheckCircle2, ChevronDown, CircleAlert,
  ExternalLink, FileText, FolderOpen, GitBranch, HelpCircle, LoaderCircle, Menu,
  MessageSquarePlus, MoreHorizontal, Moon, Pencil, Pin, Search,
  Settings, Share2, ShieldCheck, Sun, Trash2, Users, X,
} from "lucide-react";
import "./styles/maestro.css";
import LocalRuntimePanel from "./features/settings/LocalRuntimePanel";
import {
  applyChangeProposal, approveChangeProposal, checkGateway, chooseWorkspace, deleteConversation,
  getConversation, listChangeProposals, listConversations, listGatewayModels,
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

const councils = [
  ["EX","Executive","Direction, routing & mission lifecycle"],
  ["AY","Acceptance","Acceptance contracts & final validation"],
  ["IT","Technology","Engineering & implementation"],
  ["JR","Legal","Legal & compliance interpretation"],
  ["MK","Market","Market & marketing strategy"],
  ["CM","Creation & Media","Content, communication & media"],
  ["OP","Operations","Operations, releases & recovery"],
  ["FN","Finance","Financial analysis & constraints"],
  ["AD","Administration","Administrative & jurisdictional processes"],
  ["DA","Design","Design quality & experience"],
  ["PM","Product","Product scope & management"],
  ["CS","Customer Success","User success & usability"],
  ["DT","Data & Telemetry","Measurement & data truth"],
  ["SC","Security","Security architecture & independent audit"],
  ["TX","Traceability","Durable state & traceability"],
  ["PR","Performance","Performance & real-world evidence"],
  ["AI","Artificial Intelligence","AI architecture & model policy"],
  ["RX","Research","External research & evidence"],
];

type View = "chat" | "councils" | "help" | "settings";

type ChatItem =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "maestro"; text: string; mission: MissionResponse }
  | { id: string; role: "error"; kind: "quality_contract" | "gateway"; text: string };

function routeFromHash(): View {
  const route = window.location.hash.replace(/^#\/?/, "");
  return route === "councils" || route === "help" || route === "settings"
    ? route
    : "chat";
}

function shortResource(
  resourceId: string | null | undefined,
): string {
  if (!resourceId) {
    return "MAESTRO Core · Deterministic";
  }

  return resourceId.replace(/^[^:]+::/, "");
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
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("AUTO");
  const acceptModelInventory = useCallback((nextModels: string[]) => {
    setModels(nextModels);
    setSelectedModel((current) =>
      current !== "AUTO" && !nextModels.includes(current) ? "AUTO" : current,
    );
  }, []);
  const [running, setRunning] = useState(false);
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
          const modelData = await listGatewayModels(runtimeSettings.gatewayUrl);
          if (!cancelled) acceptModelInventory(modelData.models || []);
        } catch {
          if (!cancelled) acceptModelInventory([]);
        }

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
        acceptModelInventory([]);
        setConversations([]);
        sessionTokenRef.current = null;
      }
    };

    void inspectRuntime();
    return () => { cancelled = true; };
  }, [runtimeSettings.gatewayUrl, withFreshSession, acceptModelInventory]);

  // Models are discovered from the live Gateway, never pre-listed in UI code.
  useEffect(() => {
    if (gatewayStatus !== "online") return;
    let active = true;
    const refresh = async () => {
      try {
        const result = await listGatewayModels(runtimeSettings.gatewayUrl);
        if (active) acceptModelInventory(Array.isArray(result.models) ? result.models : []);
      } catch {
        if (active) acceptModelInventory([]);
      }
    };
    const timer = window.setInterval(() => void refresh(), 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, [gatewayStatus, runtimeSettings.gatewayUrl, acceptModelInventory]);

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
          model: selectedModel === "AUTO" ? null : selectedModel,
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

  const featureResults = [
    {
      key: "new-chat",
      label: t(language, "newChat"),
      action: startNewChat,
    },
    {
      key: "councils",
      label: t(language, "councils"),
      action: () => go("councils"),
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
          <button className={view==="councils"?"active":""} onClick={() => go("councils")}>
            <Users size={17}/> {t(language, "councils")} <em>18</em>
          </button>
          <button className={view==="help"?"active":""} onClick={() => go("help")}>
            <HelpCircle size={17}/> {t(language, "help")}
          </button>
          <a href={CORE} target="_blank" rel="noreferrer">
            <GitBranch size={17}/> GitHub <ExternalLink size={13}/>
          </a>
          <button className={view==="settings"?"active":""} onClick={() => go("settings")}>
            <Settings size={17}/> {t(language, "settings")}
          </button>
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
                  <button onClick={() => go("councils")}>
                    <Users size={16}/> {t(language, "exploreCouncils")}
                  </button>
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
                          <span className="chatRole">{t(language, "you")}</span>
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

                          <div className="answerTools">
                            <span className="verifiedChip">
                              <CheckCircle2 size={13}/>
                              {t(language, "ayDelivery", {
                                verdict: message.mission.ay_verdict,
                              })}
                            </span>

                            <details className="missionInfo">
                              <summary
                                title={t(language, "missionDetails")}
                                aria-label={t(language, "missionDetails")}
                              >
                                <CircleAlert size={16}/>
                              </summary>

                              <div className="missionInfoPanel">
                                <div className="missionStages">
                                  {message.mission.stages.map((stage) => (
                                    <span key={stage}>{stage}</span>
                                  ))}
                                </div>

                                <div className="missionMetaGrid">
                                  <div><span>{t(language,"mode")}</span><b>{message.mission.mode}</b></div>
                                  <div><span>{t(language,"model")}</span><b>{shortResource(message.mission.resource_id)}</b></div>
                                  {message.mission.workspace_label && (
                                    <div>
                                      <span>{tw(language,"workspace")}</span>
                                      <b>{message.mission.workspace_label}</b>
                                    </div>
                                  )}
                                  {message.mission.tool_calls && (
                                    <div>
                                      <span>{tw(language,"tools")}</span>
                                      <b>{message.mission.tool_calls.length}</b>
                                    </div>
                                  )}
                                  <div><span>{t(language,"task")}</span><b>{message.mission.task_id}</b></div>
                                  <div><span>{t(language,"evidence")}</span><b>{message.mission.evidence_id}</b></div>
                                  <div>
                                    <span>{t(language,"tx")}</span>
                                    <b>{message.mission.tx_committed
                                      ? t(language,"committed")
                                      : t(language,"notCommitted")}</b>
                                  </div>
                                  <div>
                                    <span>{t(language,"latency")}</span>
                                    <b>{typeof message.mission.metrics.wall_ms==="number" || typeof message.mission.metrics.total_ms==="number"
                                      ? `${(Number(typeof message.mission.metrics.wall_ms === "number" ? message.mission.metrics.wall_ms : message.mission.metrics.total_ms)/1000).toFixed(1)}s`
                                      : "—"}</b>
                                  </div>
                                  <div>
                                    <span>{t(language,"truthScope")}</span>
                                    <b>{message.mission.semantic_truth_verified
                                      ? t(language,"semanticVerified")
                                      : t(language,"deliveryOnly")}</b>
                                  </div>
                                </div>
                              </div>
                            </details>
                          </div>
                        </div>

                        <p className="maestroOutput">{message.text}</p>
                      </div>
                    </div>
                  );
                })}

                {running && (
                  <div className="chatRow">
                    <div className="chatAvatar maestroAvatar">
                      <LoaderCircle className="spin" size={17}/>
                    </div>
                    <div className="chatBubble missionRunning">
                      <span className="chatRole">MAESTRO</span>
                      <div className="runningLine">
                        <LoaderCircle className="spin" size={15}/>
                        {t(language, "governedMission")}
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

                  <div className="composerControls">
                                                        <select
                                                          value={selectedModel}
                                                          onChange={(event) => setSelectedModel(event.target.value)}
                                                          disabled={running || gatewayStatus!=="online"}
                                                        >
                                                          <option value="AUTO">{t(language,"autoModel")}</option>
                                                          {models.map((model) => (
                                                            <option value={model} key={model}>{model}</option>
                                                          ))}
                                                        </select>

                                                        <span>
                                                          {gatewayStatus==="online"
                                                            ? t(language,"localModels",{count:models.length})
                                                            : t(language,"gatewayNotConnected")}
                                                        </span>
                                                      </div>
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

        {view==="councils" && (
          <section className="page">
            <small>{t(language,"governedDomains")}</small>
            <h2>{t(language,"genesisCouncils")}</h2>
            <p>{t(language,"councilsIntro")}</p>
            <div className="grid">
              {councils.map(([code,name,domain]) => (
                <a
                  key={code}
                  className="council"
                  href={`${CORE}/blob/main/blueprints/Council-${code.toLowerCase()}.md`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <strong>{code}</strong>
                  <span><b>{name}</b><small>{domain}</small></span>
                  <ExternalLink size={14}/>
                </a>
              ))}
            </div>
            <div className="principle">
              MAESTRO COMMANDS MODELS. MODELS DO NOT COMMAND MAESTRO.
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
              <a href={CORE+"/blob/main/docs/COUNCILS.md"} target="_blank" rel="noreferrer">
                <Users/><b>{t(language,"councils")}</b>
                <span>{t(language,"explore18")}</span>
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
                            ? <LoaderCircle className="spin" size={15}/>
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
                          ? <LoaderCircle className="spin" size={15}/>
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
