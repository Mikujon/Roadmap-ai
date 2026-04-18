"use client";
import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

type ToastVariant = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, variant?: ToastVariant, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const VARIANT_STYLES: Record<ToastVariant, { bg: string; border: string; icon: string; color: string }> = {
  success: { bg: "#ECFDF5", border: "#059669", icon: "✓", color: "#065F46" },
  error:   { bg: "#FEF2F2", border: "#DC2626", icon: "✕", color: "#991B1B" },
  warning: { bg: "#FFFBEB", border: "#D97706", icon: "⚠", color: "#92400E" },
  info:    { bg: "#EFF6FF", border: "#2563EB", icon: "ℹ", color: "#1E40AF" },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const s = VARIANT_STYLES[toast.variant];

  useEffect(() => {
    const show = requestAnimationFrame(() => setVisible(true));
    const hide = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, toast.duration ?? 3500);
    return () => { cancelAnimationFrame(show); clearTimeout(hide); };
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "11px 14px",
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderLeft: `4px solid ${s.border}`,
        borderRadius: 10,
        boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
        minWidth: 260, maxWidth: 380,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.28s ease, transform 0.28s ease",
        pointerEvents: "auto",
        cursor: "default",
      }}
      onClick={() => { setVisible(false); setTimeout(() => onRemove(toast.id), 300); }}
    >
      <span style={{ width: 20, height: 20, borderRadius: "50%", background: s.border, color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {s.icon}
      </span>
      <span style={{ fontSize: 13, color: s.color, fontWeight: 500, lineHeight: 1.4 }}>{toast.message}</span>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const toast = useCallback((message: string, variant: ToastVariant = "info", duration?: number) => {
    const id = String(++idRef.current);
    setToasts(prev => [...prev, { id, message, variant, duration }]);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{
        position: "fixed", bottom: 24, right: 24,
        display: "flex", flexDirection: "column", gap: 8,
        zIndex: 9999,
        pointerEvents: "none",
      }}>
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
