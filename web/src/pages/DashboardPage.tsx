import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { WelcomeWizardModal } from "@/components/WelcomeWizardModal";
import type { AppointmentOut, ClientOut } from "@/types";

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfWeek(d: Date): Date {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 7);
  e.setMilliseconds(-1);
  return e;
}

function isSameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  draft:     { label: "Черновик",    color: "bg-surface-container text-on-surface-variant", dot: "bg-on-surface-variant/30" },
  pending:   { label: "Ожидает",     color: "bg-amber-50 text-amber-700",  dot: "bg-amber-400" },
  confirmed: { label: "Подтверждена", color: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  cancelled: { label: "Отменена",    color: "bg-red-50 text-red-600",      dot: "bg-red-400" },
  completed: { label: "Завершена",   color: "bg-blue-50 text-blue-700",    dot: "bg-blue-500" },
};

/* Stat card variants */
const STAT_CARDS = [
  {
    key: "clients",
    icon: "group",
    label: "Всего клиентов",
    bg: "bg-white",
    iconBg: "bg-secondary-container/50",
    iconColor: "text-secondary",
    textColor: "text-on-surface",
  },
  {
    key: "today",
    icon: "today",
    label: "Записей сегодня",
    bg: "bg-white",
    iconBg: "bg-tertiary-container/20",
    iconColor: "text-tertiary",
    textColor: "text-on-surface",
  },
  {
    key: "week",
    icon: "event_upcoming",
    label: "Записей на неделю",
    bg: "primary-gradient",
    iconBg: "bg-white/20",
    iconColor: "text-white",
    textColor: "text-white",
    labelColor: "text-white/70",
  },
];

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientOut[]>([]);
  const [appts, setAppts] = useState<AppointmentOut[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [workingHours, setWorkingHours] = useState<unknown[]>([]);

  const reloadAll = useCallback(async (alive = true) => {
    try {
      const [c, a, wh] = await Promise.all([
        apiFetch<ClientOut[]>("/clients"),
        apiFetch<AppointmentOut[]>("/appointments"),
        apiFetch<unknown[]>("/users/me/working-hours").catch(() => []),
      ]);
      if (!alive) return;
      setClients(c);
      setAppts(a);
      setWorkingHours(wh);
    } catch (e) {
      if (!alive) return;
      setErr(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      if (alive) setLoaded(true);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void reloadAll(alive);
    return () => {
      alive = false;
    };
  }, [reloadAll]);

  const now = new Date();
  const stats = useMemo(() => {
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    return {
      totalClients: clients.length,
      todayAppts: appts.filter((x) => isSameLocalDay(new Date(x.starts_at), now)).length,
      weekAppts: appts.filter((x) => {
        const t = new Date(x.starts_at);
        return t >= weekStart && t <= weekEnd;
      }).length,
    };
  }, [appts, clients.length]);

  const upcoming = useMemo(
    () =>
      [...appts]
        .filter((x) => new Date(x.starts_at) >= now)
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
        .slice(0, 8),
    [appts],
  );

  const statValues = [stats.totalClients, stats.todayAppts, stats.weekAppts];
  const displayName = user?.full_name?.trim().split(" ")[0] || user?.email?.split("@")[0] || "мастер";
  const greetingHour = now.getHours();
  const greeting =
    greetingHour < 12 ? "Доброе утро" : greetingHour < 18 ? "Добрый день" : "Добрый evening" === "Добрый evening" ? "Добрый вечер" : "";

  return (
    <>
      <div className="space-y-10 animate-fade-up">
        {/* ── Header ── */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="section-label mb-1">{greeting}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-3xl md:text-4xl font-black text-on-surface tracking-tight">
              {displayName}
              <span className="gradient-text">.</span>
            </h2>
            {user?.subscription_tier === "premium" && (
              <span className="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full"
                style={{ background: "linear-gradient(135deg,#ffdf93,#e7c365)", color: "#594400" }}>
                ✦ Premium
              </span>
            )}
          </div>
          <p className="text-on-surface-variant font-medium mt-1 text-sm">
            Обзор вашего кабинета WAVY CRM
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/calendar?new=1")}
          className="self-start sm:self-auto btn-primary"
        >
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
          Новая запись
        </button>
      </header>

      {err && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-error/6 border border-error/15 text-error text-sm font-semibold">
          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
          {err}
        </div>
      )}

      {/* ── Stat cards ── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {STAT_CARDS.map((card, i) => {
          const isGradient = card.bg === "primary-gradient";
          return (
            <div
              key={card.key}
              className={`p-5 sm:p-7 rounded-3xl border border-outline-variant/10 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5 ${card.bg}`}
              style={isGradient ? { background: "linear-gradient(135deg,#3a2470 0%,#4f378a 45%,#7c5fc4 100%)" } : undefined}
            >
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center mb-3.5 sm:mb-5 ${card.iconBg}`}>
                <span
                  className={`material-symbols-outlined text-lg sm:text-[22px] ${card.iconColor}`}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {card.icon}
                </span>
              </div>
              <p className={`font-bold text-[11px] sm:text-xs mb-1.5 ${card.labelColor ?? "text-on-surface-variant"}`}>
                {card.label}
              </p>
              {loaded ? (
                <h3 className={`text-3xl sm:text-4xl font-black tracking-tight ${card.textColor}`}>
                  {statValues[i]}
                </h3>
              ) : (
                <div className="h-8 sm:h-10 w-12 sm:w-16 rounded-xl skeleton" />
              )}
            </div>
          );
        })}
      </section>

      {/* ── Upcoming appointments ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-black text-on-surface">Ближайшие записи</h4>
          <Link to="/calendar" className="text-primary font-bold text-sm hover:underline flex items-center gap-1">
            Все записи
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>

        {!loaded ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-20 rounded-3xl skeleton" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="card p-10 text-center">
            <span className="material-symbols-outlined text-[44px] text-on-surface-variant/20 block mb-2">event_note</span>
            <p className="font-bold text-on-surface-variant">Пока нет предстоящих записей</p>
            <p className="text-sm text-on-surface-variant/60 mt-1">Нажмите «Новая запись» чтобы добавить</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((a) => {
              const t = new Date(a.starts_at);
              const time = t.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
              const dayLabel = isSameLocalDay(t, now)
                ? "Сегодня"
                : t.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" });
              const sc = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.draft!;

              return (
                <div
                  key={a.id}
                  className="card flex items-center gap-4 p-4 pr-5 group hover:shadow-card-hover hover:-translate-y-[1px] transition-all duration-200"
                >
                  {/* Time badge */}
                  <div className="flex flex-col items-center justify-center bg-gradient-warm rounded-2xl w-[60px] h-[60px] shrink-0 border border-primary/10">
                    <span className="text-sm font-black text-primary leading-none">{time}</span>
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase mt-1">{dayLabel}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-on-surface truncate">{a.title}</h5>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                    </div>
                  </div>

                  {/* Open link */}
                  <Link
                    to={`/calendar?edit=${a.id}`}
                    className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container text-on-surface-variant hover:bg-primary/8 hover:text-primary transition-all opacity-0 group-hover:opacity-100"
                  >
                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>

    {loaded && user?.role === "private_person" && workingHours.length === 0 && (
      <WelcomeWizardModal onCompleted={() => void reloadAll()} />
    )}
  </>
  );
}
