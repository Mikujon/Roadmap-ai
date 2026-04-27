"use client";
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProjectSummary {
  id:          string;
  name:        string;
  status:      string;
  healthScore: number;
  health:      string;
  progress:    number;
  budget:      { total: number; spent: number; forecast: number };
  schedule:    { startDate: string; endDate: string; daysLeft: number };
  spi:         number;
  cpi:         number;
  team:        number;
  openRisks:   number;
}

export interface AlertItem {
  id:        string;
  type:      string;
  level:     string;
  title:     string;
  detail?:   string;
  action?:   string;
  read:      boolean;
  createdAt: string;
  projectId?: string;
  project?:  { id: string; name: string } | null;
}

export interface UIConfig {
  primaryColor: string;
  theme:        string;
  language:     string;
  currency:     string;
  dateFormat:   string;
  defaultRole:  string;
  compactMode:  boolean;
}

const DEFAULT_UI_CONFIG: UIConfig = {
  primaryColor: "#006D6B",
  theme:        "light",
  language:     "en",
  currency:     "EUR",
  dateFormat:   "DD/MM/YYYY",
  defaultRole:  "PMO",
  compactMode:  false,
};

interface AppContextValue {
  projects:       ProjectSummary[];
  alerts:         AlertItem[];
  loading:        boolean;
  lastUpdated:    Date | null;
  unreadCount:    number;
  uiConfig:       UIConfig;
  refresh:        () => Promise<void>;
  refreshProject: (id: string) => Promise<void>;
  markAlertRead:  (id: string) => void;
  markAllRead:    () => void;
  dismissAlert:   (id: string) => void;
  updateUIConfig: (partial: Partial<UIConfig>) => Promise<void>;
  fetchUIConfig:  () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextValue | null>(null);

const REFRESH_MS = 30_000;

// ── CSS variable applier ──────────────────────────────────────────────────────

function applyCSSVars(config: UIConfig) {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--guardian", config.primaryColor);
  root.style.setProperty("--guardian-light", config.primaryColor + "15");
  root.style.setProperty("--guardian-border", config.primaryColor + "60");
  root.style.setProperty("--spacing-base", config.compactMode ? "10px" : "14px");
  root.style.setProperty("--card-padding", config.compactMode ? "10px 12px" : "14px 16px");
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AppProvider({
  children,
  initialRole = "PMO",
  initialUIConfig,
}: {
  children:         React.ReactNode;
  initialRole?:     string;
  initialUIConfig?: UIConfig;
}) {
  const [projects,    setProjects]    = useState<ProjectSummary[]>([]);
  const [alerts,      setAlerts]      = useState<AlertItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [uiConfig,    setUiConfig]    = useState<UIConfig>(initialUIConfig ?? DEFAULT_UI_CONFIG);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  void initialRole;

  // Apply CSS vars whenever uiConfig changes
  useEffect(() => {
    applyCSSVars(uiConfig);
  }, [uiConfig]);

  const fetchAll = useCallback(async () => {
    try {
      const [pRes, aRes] = await Promise.all([
        fetch("/api/v1/projects"),
        fetch("/api/alerts?limit=50"),
      ]);
      if (pRes.ok) {
        const pData = await pRes.json();
        setProjects(Array.isArray(pData.data) ? pData.data : []);
      }
      if (aRes.ok) {
        const aData = await aRes.json();
        setAlerts(Array.isArray(aData) ? aData : []);
      }
      setLastUpdated(new Date());
    } catch {
      // network error — keep stale data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    timerRef.current = setInterval(fetchAll, REFRESH_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchAll]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchAll();
  }, [fetchAll]);

  const refreshProject = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/v1/projects/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setProjects(prev =>
        prev.map(p => p.id === id ? { ...p, ...data } : p)
      );
      setLastUpdated(new Date());
    } catch {}
  }, []);

  const markAlertRead = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
    fetch("/api/alerts", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ alertId: id }),
    }).catch(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
    fetch("/api/alerts", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ markAllRead: true }),
    }).catch(() => {});
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    fetch("/api/alerts", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ alertId: id }),
    }).catch(() => {});
  }, []);

  const fetchUIConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/ui-config");
      if (!res.ok) return;
      const { config } = await res.json();
      if (!config) return;
      setUiConfig({
        primaryColor: config.uiPrimaryColor ?? DEFAULT_UI_CONFIG.primaryColor,
        theme:        config.uiTheme        ?? DEFAULT_UI_CONFIG.theme,
        language:     config.uiLanguage     ?? DEFAULT_UI_CONFIG.language,
        currency:     config.uiCurrency     ?? DEFAULT_UI_CONFIG.currency,
        dateFormat:   config.uiDateFormat   ?? DEFAULT_UI_CONFIG.dateFormat,
        defaultRole:  config.uiDefaultRole  ?? DEFAULT_UI_CONFIG.defaultRole,
        compactMode:  config.uiCompactMode  ?? DEFAULT_UI_CONFIG.compactMode,
      });
    } catch {}
  }, []);

  const updateUIConfig = useCallback(async (partial: Partial<UIConfig>) => {
    // Map clean names to DB field names
    const apiPayload: Record<string, unknown> = {};
    if (partial.primaryColor !== undefined) apiPayload.uiPrimaryColor = partial.primaryColor;
    if (partial.theme        !== undefined) apiPayload.uiTheme        = partial.theme;
    if (partial.language     !== undefined) apiPayload.uiLanguage     = partial.language;
    if (partial.currency     !== undefined) apiPayload.uiCurrency     = partial.currency;
    if (partial.dateFormat   !== undefined) apiPayload.uiDateFormat   = partial.dateFormat;
    if (partial.defaultRole  !== undefined) apiPayload.uiDefaultRole  = partial.defaultRole;
    if (partial.compactMode  !== undefined) apiPayload.uiCompactMode  = partial.compactMode;

    try {
      await fetch("/api/settings/ui-config", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(apiPayload),
      });
      setUiConfig(prev => ({ ...prev, ...partial }));
    } catch {}
  }, []);

  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <AppContext.Provider value={{
      projects,
      alerts,
      loading,
      lastUpdated,
      unreadCount,
      uiConfig,
      refresh,
      refreshProject,
      markAlertRead,
      markAllRead,
      dismissAlert,
      updateUIConfig,
      fetchUIConfig,
    }}>
      {children}
    </AppContext.Provider>
  );
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function useProjects() {
  const { projects, loading, refresh, refreshProject } = useApp();
  return { projects, loading, refresh, refreshProject };
}

export function useAlerts() {
  const { alerts, unreadCount, markAlertRead, markAllRead, dismissAlert } = useApp();
  return { alerts, unreadCount, markAlertRead, markAllRead, dismissAlert };
}

export function useUIConfig() {
  const { uiConfig, updateUIConfig, fetchUIConfig } = useApp();
  return { uiConfig, updateUIConfig, fetchUIConfig };
}

export function usePortfolioHealth() {
  const { projects } = useApp();
  const count     = projects.length;
  const avgHealth = count > 0
    ? Math.round(projects.reduce((s, p) => s + p.healthScore, 0) / count)
    : 100;
  const atRisk   = projects.filter(p => p.health === "AT_RISK").length;
  const offTrack = projects.filter(p => p.health === "OFF_TRACK").length;
  const onTrack  = projects.filter(p => p.health === "ON_TRACK").length;
  return { avgHealth, atRisk, offTrack, onTrack, total: count };
}
