// Type-safe API client for use in frontend components
// Replaces raw fetch() calls everywhere

import type { Project, Feature, Risk, Alert } from "@prisma/client";

type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: { code: string; message: string; status: number } };

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    const json = await res.json();

    if (!res.ok) {
      return { data: null, error: json.error };
    }

    return { data: json.data, error: null };
  } catch (error) {
    return {
      data: null,
      error: { code: "NETWORK_ERROR", message: String(error), status: 0 },
    };
  }
}

// ── Projects ────────────────────────────────────────────────
export const projects = {
  list: () =>
    request<Project[]>("/api/projects"),

  get: (id: string) =>
    request<Project>(`/api/projects/${id}`),

  create: (body: {
    name: string;
    startDate: string;
    endDate: string;
    brief?: string;
    budgetTotal?: number;
  }) =>
    request<{ project: Project }>("/api/projects", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  update: (id: string, body: Partial<{
    name: string;
    status: string;
    budgetTotal: number;
    endDate: string;
  }>) =>
    request<{ project: Project }>(`/api/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  health: (id: string) =>
    request<unknown>(`/api/projects/${id}/health`),
};

// ── Features ────────────────────────────────────────────────
export const features = {
  update: (id: string, body: Partial<{
    status: string;
    priority: string;
    actualHours: number;
    assignedToId: string;
  }>) =>
    request<{ feature: Feature }>(`/api/features/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};

// ── Risks ────────────────────────────────────────────────────
export const risks = {
  list: (projectId: string) =>
    request<Risk[]>(`/api/projects/${projectId}/risks`),

  create: (projectId: string, body: {
    title: string;
    probability: number;
    impact: number;
    category: string;
    mitigation?: string;
  }) =>
    request<{ risk: Risk }>(`/api/projects/${projectId}/risks`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

// ── Alerts ──────────────────────────────────────────────────
export const alerts = {
  list: (params?: { unread?: boolean; level?: string; projectId?: string }) => {
    const q = new URLSearchParams();
    if (params?.unread) q.set("unread", "true");
    if (params?.level) q.set("level", params.level);
    if (params?.projectId) q.set("projectId", params.projectId);
    return request<Alert[]>(`/api/alerts?${q.toString()}`);
  },

  markAllRead: () =>
    request<{ ok: boolean }>("/api/alerts/mark-all-read", { method: "PATCH" }),
};

// ── Settings ─────────────────────────────────────────────────
export const settings = {
  getUIConfig: () =>
    request<Record<string, unknown>>("/api/settings/ui-config"),

  updateUIConfig: (body: Record<string, unknown>) =>
    request<{ ok: boolean }>("/api/settings/ui-config", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};

// ── Users ────────────────────────────────────────────────────
export const users = {
  updateMe: (body: { preferredView?: string }) =>
    request<{ ok: boolean }>("/api/users/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};

// ── Export unified client ────────────────────────────────────
export const apiClient = {
  projects,
  features,
  risks,
  alerts,
  settings,
  users,
};
