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

interface AppContextValue {
  projects:       ProjectSummary[];
  alerts:         AlertItem[];
  loading:        boolean;
  lastUpdated:    Date | null;
  unreadCount:    number;
  refresh:        () => Promise<void>;
  refreshProject: (id: string) => Promise<void>;
  markAlertRead:  (id: string) => void;
  markAllRead:    () => void;
  dismissAlert:   (id: string) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextValue | null>(null);

const REFRESH_MS = 30_000;

// ── Provider ──────────────────────────────────────────────────────────────────

export function AppProvider({
  children,
  initialRole = "PMO",
}: {
  children:     React.ReactNode;
  initialRole?: string;
}) {
  const [projects,    setProjects]    = useState<ProjectSummary[]>([]);
  const [alerts,      setAlerts]      = useState<AlertItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // suppress TS unused-var for initialRole (kept for future per-role filtering)
  void initialRole;

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

  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <AppContext.Provider value={{
      projects,
      alerts,
      loading,
      lastUpdated,
      unreadCount,
      refresh,
      refreshProject,
      markAlertRead,
      markAllRead,
      dismissAlert,
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
