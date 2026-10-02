import type {
  ChangeProposal,
  ConversationRecord,
  ConversationSummary,
  GatewayHealth,
  GatewaySession,
  MissionRequest,
  MissionResponse,
  ModelsResponse,
  WorkspacePickerResult,
  WorkspaceRecord,
} from "../../types/gateway";

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & {
    message?: string;
    error?: string;
  };

  if (!response.ok) {
    const message =
      data.message ||
      data.error ||
      `Gateway returned HTTP ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export async function checkGateway(
  baseUrl: string,
  timeoutMs = 1800,
): Promise<GatewayHealth> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${normalizeBaseUrl(baseUrl)}/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });

    return await readJson<GatewayHealth>(response);
  } finally {
    window.clearTimeout(timer);
  }
}

export async function openGatewaySession(
  baseUrl: string,
): Promise<GatewaySession> {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/session`, {
    method: "POST",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  return readJson<GatewaySession>(response);
}

export async function listGatewayModels(
  baseUrl: string,
): Promise<ModelsResponse> {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/models`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  return readJson<ModelsResponse>(response);
}

export async function runGatewayMission(
  baseUrl: string,
  sessionToken: string,
  request: MissionRequest,
): Promise<MissionResponse> {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/mission`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Maestro-Session": sessionToken,
    },
    body: JSON.stringify(request),
    cache: "no-store",
  });

  return readJson<MissionResponse>(response);
}

export async function listConversations(
  baseUrl: string,
  sessionToken: string,
  options?: {
    includeArchived?: boolean;
    query?: string;
  },
): Promise<ConversationSummary[]> {
  const params = new URLSearchParams();

  if (options?.includeArchived) {
    params.set("archived", "1");
  }

  if (options?.query?.trim()) {
    params.set("q", options.query.trim());
  }

  const suffix = params.size ? `?${params.toString()}` : "";

  const response = await fetch(
    `${normalizeBaseUrl(baseUrl)}/conversations${suffix}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Maestro-Session": sessionToken,
      },
      cache: "no-store",
    },
  );

  const data = await readJson<{
    conversations: ConversationSummary[];
  }>(response);

  return data.conversations;
}

export async function getConversation(
  baseUrl: string,
  sessionToken: string,
  conversationId: string,
): Promise<ConversationRecord> {
  const response = await fetch(
    `${normalizeBaseUrl(baseUrl)}/conversations/${encodeURIComponent(conversationId)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Maestro-Session": sessionToken,
      },
      cache: "no-store",
    },
  );

  return readJson<ConversationRecord>(response);
}

export async function updateConversation(
  baseUrl: string,
  sessionToken: string,
  conversationId: string,
  patch: Partial<
    Pick<ConversationRecord, "title" | "pinned" | "archived">
  >,
): Promise<ConversationRecord> {
  const response = await fetch(
    `${normalizeBaseUrl(baseUrl)}/conversations/${encodeURIComponent(conversationId)}`,
    {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Maestro-Session": sessionToken,
      },
      body: JSON.stringify(patch),
      cache: "no-store",
    },
  );

  return readJson<ConversationRecord>(response);
}

export async function deleteConversation(
  baseUrl: string,
  sessionToken: string,
  conversationId: string,
): Promise<void> {
  const response = await fetch(
    `${normalizeBaseUrl(baseUrl)}/conversations/${encodeURIComponent(conversationId)}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "X-Maestro-Session": sessionToken,
      },
      cache: "no-store",
    },
  );

  await readJson<{ deleted: boolean }>(response);
}


export async function listWorkspaces(
  baseUrl: string,
  sessionToken: string,
): Promise<WorkspaceRecord[]> {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/workspaces`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-Maestro-Session": sessionToken,
    },
    cache: "no-store",
  });

  const data = await readJson<{
    workspaces: WorkspaceRecord[];
  }>(response);

  return data.workspaces;
}

export async function chooseWorkspace(
  baseUrl: string,
  sessionToken: string,
  kind: "file" | "folder",
): Promise<WorkspacePickerResult> {
  const response = await fetch(
    `${normalizeBaseUrl(baseUrl)}/workspaces/choose`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Maestro-Session": sessionToken,
      },
      body: JSON.stringify({ kind }),
      cache: "no-store",
    },
  );

  return readJson<WorkspacePickerResult>(response);
}

export async function listChangeProposals(
  baseUrl: string,
  sessionToken: string,
  workspaceId?: string | null,
): Promise<ChangeProposal[]> {
  const params = new URLSearchParams();

  if (workspaceId) {
    params.set("workspace_id", workspaceId);
  }

  const suffix = params.size ? `?${params.toString()}` : "";

  const response = await fetch(
    `${normalizeBaseUrl(baseUrl)}/changes${suffix}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Maestro-Session": sessionToken,
      },
      cache: "no-store",
    },
  );

  const data = await readJson<{
    changes: ChangeProposal[];
  }>(response);

  return data.changes;
}

export async function getChangeProposal(
  baseUrl: string,
  sessionToken: string,
  changeId: string,
): Promise<ChangeProposal> {
  const response = await fetch(
    `${normalizeBaseUrl(baseUrl)}/changes/${encodeURIComponent(changeId)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Maestro-Session": sessionToken,
      },
      cache: "no-store",
    },
  );

  return readJson<ChangeProposal>(response);
}

export async function approveChangeProposal(
  baseUrl: string,
  sessionToken: string,
  changeId: string,
  confirmDelete = false,
): Promise<ChangeProposal> {
  const response = await fetch(
    `${normalizeBaseUrl(baseUrl)}/changes/${encodeURIComponent(changeId)}/approve`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Maestro-Session": sessionToken,
      },
      body: JSON.stringify(
        confirmDelete
          ? { confirm_delete: true }
          : {},
      ),
      cache: "no-store",
    },
  );

  return readJson<ChangeProposal>(response);
}

export async function rejectChangeProposal(
  baseUrl: string,
  sessionToken: string,
  changeId: string,
  reason?: string,
): Promise<ChangeProposal> {
  const response = await fetch(
    `${normalizeBaseUrl(baseUrl)}/changes/${encodeURIComponent(changeId)}/reject`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Maestro-Session": sessionToken,
      },
      body: JSON.stringify(reason?.trim() ? { reason: reason.trim() } : {}),
      cache: "no-store",
    },
  );

  return readJson<ChangeProposal>(response);
}


export async function applyChangeProposal(
  baseUrl: string,
  sessionToken: string,
  changeId: string,
): Promise<ChangeProposal> {
  const response = await fetch(
    `${normalizeBaseUrl(baseUrl)}/changes/${encodeURIComponent(changeId)}/apply`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Maestro-Session": sessionToken,
      },
      body: JSON.stringify({}),
      cache: "no-store",
    },
  );

  return readJson<ChangeProposal>(response);
}
