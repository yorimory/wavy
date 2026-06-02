import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/* ─── Types ─── */
export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  show: (message: string, type?: ToastType, duration?: number) => void;
  dismiss: (id: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/* ─── Icons per type ─── */
const ICONS: Record<ToastType, string> = {
  success: "check_circle",
  error: "error",
  info: "info",
  warning: "warning",
};

const COLORS: Record<ToastType, { bg: string; icon: string; bar: string }> = {
  success: { bg: "bg-emerald-50 border-emerald-200", icon: "text-emerald-600", bar: "bg-emerald-500" },
  error:   { bg: "bg-red-50 border-red-200",         icon: "text-red-600",     bar: "bg-red-500" },
  info:    { bg: "bg-blue-50 border-blue-200",        icon: "text-blue-600",    bar: "bg-blue-500" },
  warning: { bg: "bg-amber-50 border-amber-200",      icon: "text-amber-600",   bar: "bg-amber-500" },
};

/* ─── Single Toast item ─── */
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const c = COLORS[toast.type];

  // Enter animation
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  function handleDismiss() {
    setLeaving(true);
    setTimeout(() => onDismiss(toast.id), 300);
  }

  return (
    <div
      role="alert"
      className={`
        relative flex items-start gap-3 px-4 py-3.5 rounded-2xl border shadow-elevated
        min-w-[280px] max-w-[380px] overflow-hidden
        transition-all duration-300
        ${c.bg}
        ${visible && !leaving ? "opacity-100 translate-x-0 scale-100" : "opacity-0 translate-x-8 scale-95"}
      `}
    >
      {/* Progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-[3px] ${c.bar} rounded-full`}
        style={{
          animation: `shrink ${toast.duration ?? 3500}ms linear forwards`,
        }}
      />

      <span
        className={`material-symbols-outlined text-[20px] shrink-0 mt-0.5 ${c.icon}`}
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        {ICONS[toast.type]}
      </span>

      <p className="flex-1 text-sm font-semibold text-on-surface leading-snug pr-2">{toast.message}</p>

      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-on-surface-variant/50 hover:text-on-surface hover:bg-black/5 transition-colors"
      >
        <span className="material-symbols-outlined text-[14px]">close</span>
      </button>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}

/* ─── Provider ─── */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, type: ToastType = "info", duration = 3500) => {
      const id = `toast-${++counterRef.current}`;
      setToasts((prev) => [...prev, { id, type, message, duration }]);
      setTimeout(() => dismiss(id), duration + 350);
    },
    [dismiss],
  );

  const success = useCallback((m: string) => show(m, "success"), [show]);
  const error   = useCallback((m: string) => show(m, "error", 5000), [show]);
  const info    = useCallback((m: string) => show(m, "info"), [show]);
  const warning = useCallback((m: string) => show(m, "warning"), [show]);

  return (
    <ToastContext.Provider value={{ toasts, show, dismiss, success, error, info, warning }}>
      {children}
      {/* Portal-like fixed container */}
      <div
        aria-live="polite"
        className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 items-end"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ─── Hook ─── */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
