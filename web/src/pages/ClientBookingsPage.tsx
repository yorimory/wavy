import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "@/api/client";
import { useToast } from "@/context/ToastContext";
import { addDays, formatTime24, startOfWeek } from "@/utils/calendarUtils";
import type { AppointmentOut } from "@/types";

/* ─── Status config ─── */
const STATUS: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  draft:     { label: "Черновик",     dot: "bg-outline",      text: "text-on-surface-variant", bg: "bg-surface-container" },
  pending:   { label: "Ожидает",      dot: "bg-amber-400",    text: "text-amber-700",           bg: "bg-amber-50" },
  confirmed: { label: "Подтверждена", dot: "bg-emerald-500",  text: "text-emerald-700",         bg: "bg-emerald-50" },
  cancelled: { label: "Отменена",     dot: "bg-red-400",      text: "text-red-600",             bg: "bg-red-50" },
  completed: { label: "Завершена",    dot: "bg-blue-500",     text: "text-blue-700",            bg: "bg-blue-50" },
};

/* ─── Confirm cancel dialog ─── */
function CancelDialog({
  apptTitle,
  onConfirm,
  onCancel,
  loading,
}: {
  apptTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 "
      style={{ animation: "fadeIn 0.15s ease" }}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white border border-outline-variant/20 shadow-modal p-6 space-y-5"
        style={{ animation: "scaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1) both" }}
      >
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-red-500 text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              event_busy
            </span>
          </div>
          <div>
            <h3 className="font-black text-on-surface text-base">Отменить запись?</h3>
            <p className="text-sm text-on-surface-variant mt-1">
              «<span className="font-semibold text-on-surface">{apptTitle}</span>» будет отменена. Это действие нельзя отменить.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl border border-outline-variant/40 font-bold text-sm text-on-surface hover:bg-surface-container transition-all"
          >
            Нет, оставить
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all disabled:opacity-60 active:scale-[0.97]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                Отмена…
              </span>
            ) : (
              "Да, отменить"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Appointment Card ─── */
function ApptCard({
  a,
  canCancel,
  onCancelClick,
}: {
  a: AppointmentOut;
  canCancel: boolean;
  onCancelClick: (a: AppointmentOut) => void;
}) {
  const sc = STATUS[a.status] ?? STATUS.draft!;
  const t = new Date(a.starts_at);
  return (
    <li className="card flex items-center gap-4 p-4 group">
      {/* Date badge */}
      <div
        className="flex flex-col items-center justify-center w-[60px] h-[60px] rounded-2xl shrink-0 border border-primary/10"
        style={{ background: "linear-gradient(135deg,#f3eeff,#ede7f6)" }}
      >
        <span className="text-[11px] font-bold text-on-surface-variant">
          {t.toLocaleDateString("ru-RU", { month: "short" })}
        </span>
        <span className="text-xl font-black text-primary leading-none">{t.getDate()}</span>
        <span className="text-[11px] font-black text-primary">{formatTime24(t)}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-on-surface truncate">{a.service_title || a.title}</p>
        {a.provider_name && (
          <p className="text-sm text-on-surface-variant truncate mt-0.5 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">person</span>
            {a.provider_name}
          </p>
        )}
        <span className={`inline-flex items-center gap-1.5 mt-2 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
          {sc.label}
        </span>
      </div>

      {/* Cancel button */}
      {canCancel && (
        <button
          type="button"
          onClick={() => onCancelClick(a)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-red-500/70 hover:text-red-600 hover:bg-red-50 font-bold text-xs transition-all opacity-0 group-hover:opacity-100"
          title="Отменить запись"
        >
          <span className="material-symbols-outlined text-[16px]">event_busy</span>
          <span className="hidden sm:inline">Отменить</span>
        </button>
      )}
    </li>
  );
}

/* ─── Main Page ─── */
export function ClientBookingsPage() {
  const toast = useToast();
  const [appts, setAppts] = useState<AppointmentOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "all" | "week">("upcoming");
  const [anchor, setAnchor] = useState(() => new Date());
  const [cancelTarget, setCancelTarget] = useState<AppointmentOut | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const weekStart = useMemo(() => startOfWeek(anchor), [anchor]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<AppointmentOut[]>("/appointments");
      setAppts(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка загрузки записей");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const now = new Date();

  const upcoming = useMemo(
    () => appts.filter((a) => new Date(a.ends_at) >= now && a.status !== "cancelled")
              .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at)),
    [appts],
  );

  const past = useMemo(
    () => appts.filter((a) => new Date(a.ends_at) < now || a.status === "cancelled")
              .sort((a, b) => +new Date(b.starts_at) - +new Date(a.starts_at)),
    [appts],
  );

  const weekAppts = useMemo(() => {
    const end = addDays(weekStart, 7);
    return appts.filter((a) => {
      const t = new Date(a.starts_at);
      return t >= weekStart && t < end;
    });
  }, [appts, weekStart]);

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await apiFetch(`/appointments/${cancelTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      });
      toast.success("Запись отменена");
      setAppts((prev) =>
        prev.map((a) => (a.id === cancelTarget.id ? { ...a, status: "cancelled" } : a)),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось отменить запись");
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  }

  function tabBtn(t: typeof tab, label: string, count?: number) {
    return (
      <button
        type="button"
        onClick={() => setTab(t)}
        className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-1.5 ${
          tab === t ? "bg-primary text-white shadow-glow-sm" : "text-on-surface-variant hover:bg-surface-container"
        }`}
      >
        {label}
        {count !== undefined && count > 0 && (
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${tab === t ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>
            {count}
          </span>
        )}
      </button>
    );
  }

  return (
    <>
      {cancelTarget && (
        <CancelDialog
          apptTitle={cancelTarget.service_title || cancelTarget.title}
          onConfirm={() => void confirmCancel()}
          onCancel={() => setCancelTarget(null)}
          loading={cancelling}
        />
      )}

      <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-on-surface tracking-tight">Мои записи</h2>
            <p className="text-on-surface-variant mt-1 text-sm">
              {loading ? "Загрузка…" : `Всего ${appts.length} записей · ${upcoming.length} предстоящих`}
            </p>
          </div>
          <Link to="/search" className="btn-primary text-sm">
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
            Записаться
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-surface-container rounded-full p-1 w-fit">
          {tabBtn("upcoming", "Предстоящие", upcoming.length)}
          {tabBtn("all", "Все", appts.length)}
          {tabBtn("week", "Неделя")}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-[84px] rounded-3xl skeleton" />
            ))}
          </div>
        ) : (
          <>
            {/* ── Предстоящие ── */}
            {tab === "upcoming" && (
              <div className="space-y-3">
                {upcoming.length === 0 ? (
                  <div className="card p-10 text-center space-y-3">
                    <span className="material-symbols-outlined text-[52px] text-on-surface-variant/20 block">event_note</span>
                    <p className="font-bold text-on-surface-variant">Нет предстоящих записей</p>
                    <Link to="/search" className="inline-flex items-center gap-1.5 text-primary font-bold text-sm hover:underline">
                      Найти услугу и записаться
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </Link>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {upcoming.map((a) => (
                      <ApptCard
                        key={a.id}
                        a={a}
                        canCancel={new Date(a.starts_at) > now}
                        onCancelClick={setCancelTarget}
                      />
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* ── Все записи ── */}
            {tab === "all" && (
              <div className="space-y-5">
                {appts.length === 0 ? (
                  <div className="card p-10 text-center space-y-2">
                    <span className="material-symbols-outlined text-[52px] text-on-surface-variant/20 block">calendar_today</span>
                    <p className="font-bold text-on-surface-variant">У вас пока нет записей</p>
                    <Link to="/search" className="inline-block text-primary font-bold text-sm hover:underline">
                      Найти услугу →
                    </Link>
                  </div>
                ) : (
                  <>
                    {upcoming.length > 0 && (
                      <div>
                        <p className="section-label mb-3">Предстоящие</p>
                        <ul className="space-y-3">
                          {upcoming.map((a) => (
                            <ApptCard key={a.id} a={a} canCancel={new Date(a.starts_at) > now} onCancelClick={setCancelTarget} />
                          ))}
                        </ul>
                      </div>
                    )}
                    {past.length > 0 && (
                      <div>
                        <p className="section-label mb-3">Прошедшие</p>
                        <ul className="space-y-3 opacity-70">
                          {past.map((a) => (
                            <ApptCard key={a.id} a={a} canCancel={false} onCancelClick={setCancelTarget} />
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Неделя ── */}
            {tab === "week" && (
              <div className="card overflow-hidden">
                {/* Week nav */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
                  <h3 className="font-black text-on-surface">
                    {weekStart.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
                  </h3>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      className="w-8 h-8 flex items-center justify-center rounded-xl border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container transition-all"
                      onClick={() => setAnchor(addDays(anchor, -7))}
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                    <button
                      type="button"
                      className="px-3 text-xs font-bold rounded-xl border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container transition-all"
                      onClick={() => setAnchor(new Date())}
                    >
                      Сегодня
                    </button>
                    <button
                      type="button"
                      className="w-8 h-8 flex items-center justify-center rounded-xl border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container transition-all"
                      onClick={() => setAnchor(addDays(anchor, 7))}
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                  </div>
                </div>

                {/* Days */}
                <div className="divide-y divide-outline-variant/8">
                  {Array.from({ length: 7 }).map((_, i) => {
                    const day = addDays(weekStart, i);
                    const list = weekAppts.filter((a) => {
                      const d = new Date(a.starts_at);
                      return d.getFullYear() === day.getFullYear() && d.getMonth() === day.getMonth() && d.getDate() === day.getDate();
                    });
                    const isToday = day.toDateString() === now.toDateString();
                    return (
                      <div key={day.toISOString()} className={`flex gap-4 px-5 py-4 ${isToday ? "bg-primary/4" : ""}`}>
                        {/* Day label */}
                        <div className="w-12 shrink-0 text-center">
                          <span className={`text-[10px] block font-bold uppercase tracking-wide ${isToday ? "text-primary" : "text-on-surface-variant/60"}`}>
                            {day.toLocaleDateString("ru-RU", { weekday: "short" })}
                          </span>
                          <span className={`text-xl font-black leading-tight mt-0.5 block ${isToday ? "text-primary" : "text-on-surface"}`}>
                            {day.getDate()}
                          </span>
                        </div>

                        {/* Slots */}
                        <div className="flex-1 flex flex-col gap-2 justify-center min-w-0">
                          {list.length === 0 ? (
                            <span className="text-sm text-on-surface-variant/40">—</span>
                          ) : (
                            list.map((a) => {
                              const sc = STATUS[a.status];
                              return (
                                <div key={a.id} className="flex items-center gap-2.5 text-sm">
                                  <span className="font-black text-primary w-12 shrink-0 tabular-nums">
                                    {formatTime24(new Date(a.starts_at))}
                                  </span>
                                  <span className="font-semibold text-on-surface truncate">{a.service_title || a.title}</span>
                                  {a.provider_name && (
                                    <span className="text-on-surface-variant text-xs truncate hidden sm:block">· {a.provider_name}</span>
                                  )}
                                  {sc && (
                                    <span className={`ml-auto shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                                      {sc.label}
                                    </span>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
