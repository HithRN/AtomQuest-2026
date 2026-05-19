import type {
  AdminOverview,
  BootstrapResponse,
  GoalFormInput,
  GoalPatchInput,
  GoalSheetDetail,
  GoalSheetSummary,
  SharedGoalCreateInput,
} from "./types";

export class ApiClientError extends Error {
  details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.details = details;
  }
}

async function request<T>(path: string, options?: { userId?: string; method?: string; body?: unknown }) {
  const response = await fetch(path, {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options?.userId ? { "x-demo-user": options.userId } : {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string; details?: unknown; issues?: unknown }
    | null;

  if (!response.ok) {
    throw new ApiClientError(payload?.message ?? "Request failed.", payload?.details ?? payload?.issues);
  }

  return payload as T;
}

export const api = {
  getBootstrap: () => request<BootstrapResponse>("/api/bootstrap"),
  getMyGoalSheet: (userId: string) => request<GoalSheetDetail>("/api/my/goal-sheet", { userId }),
  addGoal: (userId: string, input: GoalFormInput) =>
    request<GoalSheetDetail>("/api/my/goals", {
      userId,
      method: "POST",
      body: input,
    }),
  updateGoal: (userId: string, goalId: string, input: GoalPatchInput) =>
    request<GoalSheetDetail>(`/api/goals/${goalId}`, {
      userId,
      method: "PATCH",
      body: input,
    }),
  deleteGoal: (userId: string, goalId: string) =>
    request<GoalSheetDetail>(`/api/goals/${goalId}`, {
      userId,
      method: "DELETE",
    }),
  submitMyGoalSheet: (userId: string) =>
    request<GoalSheetDetail>("/api/my/submit", {
      userId,
      method: "POST",
    }),
  getManagerTeamSheets: (userId: string) =>
    request<GoalSheetSummary[]>("/api/manager/team-sheets", { userId }),
  getGoalSheet: (userId: string, sheetId: string) =>
    request<GoalSheetDetail>(`/api/goal-sheets/${sheetId}`, { userId }),
  approveGoalSheet: (userId: string, sheetId: string) =>
    request<GoalSheetDetail>(`/api/manager/goal-sheets/${sheetId}/approve`, {
      userId,
      method: "POST",
    }),
  returnGoalSheet: (userId: string, sheetId: string, comment: string) =>
    request<GoalSheetDetail>(`/api/manager/goal-sheets/${sheetId}/return`, {
      userId,
      method: "POST",
      body: { comment },
    }),
  getAdminOverview: (userId: string) =>
    request<AdminOverview>("/api/admin/overview", { userId }),
  unlockGoalSheet: (userId: string, sheetId: string, reason: string) =>
    request<GoalSheetDetail>(`/api/admin/goal-sheets/${sheetId}/unlock`, {
      userId,
      method: "POST",
      body: { reason },
    }),
  createSharedGoal: (userId: string, input: SharedGoalCreateInput) =>
    request<{ sharedGoalId: string; affectedSheets: GoalSheetDetail[] }>("/api/admin/shared-goals", {
      userId,
      method: "POST",
      body: input,
    }),
};
