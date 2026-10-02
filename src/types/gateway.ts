export type GatewayStatus = "offline" | "checking" | "online";

export type GatewayHealth = {
  status?: string;
  version?: string;
  core?: string;
  councils?: number;
  gateway_version?: string;
  mission_protocol?: string;
  conversation_storage?: string;
  workspace?: string;
  workspace_write_execution?: boolean;
  workspace_delete_execution?: boolean;
  change_protocol?: string;
  native_workspace_picker?: string;
};

export type LocalProvider = "ollama" | "lmstudio" | "llamacpp" | "custom";

export type LocalRuntimeSettings = {
  gatewayUrl: string;
  provider: LocalProvider;
  providerUrl: string;
};

export type GatewaySession = {
  session_token: string;
  scope: string;
  mission_protocol: string;
};

export type ModelsResponse = {
  provider: string;
  status: string;
  models: string[];
};

export type MissionRequest = {
  prompt: string;
  model?: string | null;
  max_tokens?: number;
  conversation_id?: string | null;
  workspace_id?: string | null;
};

export type MissionResponse = {
  ok: boolean;
  protocol: string;
  mode: string;
  task_id: string;
  state: string;
  resource_id: string;
  output: string;
  metrics: Record<string, unknown>;
  evidence_id: string;
  ay_verdict: string;
  tx_authorized: boolean;
  tx_committed: boolean;
  verification_scope: string;
  semantic_truth_verified: boolean;
  stages: string[];
  error: string | null;
  conversation_id: string;
  conversation_title: string;
  workspace_id?: string | null;
  workspace_label?: string | null;
  tool_calls?: MissionToolCall[];
};

export type MissionToolCall = {
  name: string;
  arguments: Record<string, unknown>;
  ok: boolean;
  error?: string;
};

export type WorkspaceRecord = {
  id: string;
  path: string;
  label: string;
  kind: "file" | "directory";
  created_at: string;
  updated_at: string;
  permissions: string[];
  exists: boolean;
};

export type WorkspacePickerResult =
  | ({ cancelled: true; kind: "file" | "folder" } & Partial<WorkspaceRecord>)
  | (WorkspaceRecord & {
      cancelled: false;
      picker_kind: "file" | "folder";
    });

export type ConversationSummary = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  pinned: boolean;
  archived: boolean;
  message_count: number;
  preview: string;
};

export type ConversationMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
  metadata: {
    mission?: MissionResponse;
    [key: string]: unknown;
  };
};

export type ConversationRecord = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  pinned: boolean;
  archived: boolean;
  messages: ConversationMessage[];
};

export const RUNTIME_STORAGE_KEY = "maestro-local-runtime";

export const DEFAULT_LOCAL_RUNTIME_SETTINGS: LocalRuntimeSettings = {
  gatewayUrl: "http://127.0.0.1:8787",
  provider: "ollama",
  providerUrl: "http://127.0.0.1:11434",
};

export function loadLocalRuntimeSettings(): LocalRuntimeSettings {
  try {
    const raw = localStorage.getItem(RUNTIME_STORAGE_KEY);
    if (!raw) return DEFAULT_LOCAL_RUNTIME_SETTINGS;

    return {
      ...DEFAULT_LOCAL_RUNTIME_SETTINGS,
      ...JSON.parse(raw),
    };
  } catch {
    return DEFAULT_LOCAL_RUNTIME_SETTINGS;
  }
}

export type ChangeProposalStatus =
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "STALE"
  | "APPLIED"
  | "APPLY_FAILED"
  | "ROLLED_BACK"
  | "ROLLBACK_FAILED"
  | "INTEGRITY_ERROR";

export type ChangeHistoryEvent = {
  action: string;
  at: string;
  reason?: string;
};

export type ChangeProposal = {
  id: string;
  protocol: string;
  workspace_id: string;
  workspace_label: string;
  operation: "write" | "edit" | "patch" | "rename" | "move" | "delete";
  effect: "create" | "edit" | "rename" | "move" | "delete";
  path: string;
  destination_path?: string;
  before_exists: boolean;
  before_sha256: string | null;
  after_sha256: string | null;
  before_size: number;
  after_size: number;
  diff: string;
  diff_truncated: boolean;
  status: ChangeProposalStatus;
  approval_required: boolean;
  workspace_write_performed: boolean;
  created_at: string;
  updated_at: string;
  approval_source?: string;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  stale_reason?: string;

  apply_protocol?: string;
  apply_started_at?: string;
  apply_attempts?: number;

  applied_at?: string;
  applied_sha256?: string;
  applied_path?: string;

  deleted_path?: string;
  deleted_sha256?: string;

  before_inode?: number;
  before_device?: number;
  before_mode?: number;
  destination_before_exists?: boolean;

  risk_level?: string;
  delete_confirmation_required?: boolean;

  recovery_required?: boolean;
  recovery_available?: boolean;
  recovery_sha256?: string;
  recovery_size?: number;
  recovery_staged_at?: string;

  apply_error?: string;
  rollback_error?: string;

  workspace_state_restored?: boolean;
  recovered_after_restart?: boolean;

  history: ChangeHistoryEvent[];
};
