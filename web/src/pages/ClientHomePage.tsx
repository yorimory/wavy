import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { formatTime24 } from "@/utils/calendarUtils";
import type { AppointmentOut } from "@/types";

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  pending:   { label: "Ожидает",      dot: "bg-amber-400",   text: "text-amber-700" },
  confirmed: { label: "Подтверждена", dot: "bg-emerald-500", text: "text-emerald-700" },
  completed: { label: "Завершена",    dot: "bg-blue-500",    text: "text-blue-700" },
  cancelled: { label: "Отменена",     dot: "bg-red-400",     text: "text-red-600" },
  draft:     { label: "Черновик",     dot: "bg-outline",     text: "text-on-surface-variant" },
};

/* Feature tile */
function FeatureTile({
  icon,
  title,
  desc,
  gradient,
}: {
  icon: string;
  title: string;
  desc: string;
  gradient: string;
}) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/60 border border-outline-variant/10">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${gradient}`}>
        <span className="material-symbols-outlined text-white text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          {icon}
        </span>
      </div>
      <div>
        <p className="font-bold text-on-surface text-sm">{title}</p>
        <p className="text-xs text-on-surface-variant/70 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

export function ClientHomePage() {
  const { user } = useAuth();
  const [appts, setAppts] = useState<AppointmentOut[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void apiFetch<AppointmentOut[]>("/appointments")
      .then(setAppts)
      .catch(() => setAppts([]))
      .finally(() => setLoaded(true));
  }, []);

  const upcoming = useMemo(() => {
    const now = new Date();
    return appts
      .filter((a) => new Date(a.ends_at) >= now && a.status !== "cancelled")
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
      .slice(0, 3);
  }, [appts]);

  const firstName = user?.full_name ?? user?.email?.split("@")[0] ?? "";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Доброе утро" : hour < 18 ? "Добрый день" : "Добрый вечер";

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Hero ── */}
      <div
        className="relative rounded-[32px] overflow-hidden p-8 md:p-10"
        style={{
          background: "linear-gradient(135deg, #3a2470 0%, #4f378a 50%, #7c5fc4 100%)",
          boxShadow: "0 12px 48px rgba(79,55,138,0.28)",
        }}
      >
        {/* Decorative blobs inside card */}
        <div aria-hidden className="absolute top-[-40px] right-[-40px] w-[200px] h-[200px] rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div aria-hidden className="absolute bottom-[-30px] left-[30%] w-[150px] h-[150px] rounded-full bg-white/5 blur-xl pointer-events-none" />

        <div className="relative z-10">
          <p className="text-white/60 text-sm font-semibold mb-1">{greeting}</p>
          <h2 className="text-3xl font-black text-white tracking-tight">
            {firstName ? `Привет, ${firstName}!` : "Добро пожаловать!"}
          </h2>
          <p className="text-white/70 text-sm mt-2 mb-6 max-w-sm">
            Находите мастеров и записывайтесь на услуги за несколько кликов
          </p>

          <Link
            to="/search"
            className="inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-white text-primary font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.97]"
          >
            <span className="material-symbols-outlined text-[20px]">search</span>
            Найти услугу
          </Link>
        </div>

        {/* Floating decorative icon */}
        <div
          aria-hidden
          className="absolute right-8 top-1/2 -translate-y-1/2 hidden sm:flex w-20 h-20 rounded-3xl bg-white/10 items-center justify-center"
          style={{ animation: "float 3s ease-in-out infinite" }}
        >
          <span className="material-symbols-outlined text-white text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            spa
          </span>
        </div>
      </div>

      {/* ── Features row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FeatureTile
          icon="star"
          title="Лучшие мастера"
          desc="Рейтинг и отзывы"
          gradient="primary-gradient"
        />
        <FeatureTile
          icon="schedule"
          title="Онлайн-запись"
          desc="Выберите удобное время"
          gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
        />
        <FeatureTile
          icon="event_available"
          title="Быстрая отмена"
          desc="Управляйте записями"
          gradient="bg-gradient-to-br from-violet-500 to-purple-600"
        />
      </div>

      {/* ── Upcoming bookings ── */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-on-surface text-lg">Ближайшие записи</h3>
          <Link
            to="/my-bookings"
            className="text-sm font-bold text-primary flex items-center gap-1 hover:underline"
          >
            Все
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>

        {!loaded ? (
          <div className="space-y-3">
            {[1, 2].map((n) => (
              <div key={n} className="h-16 rounded-2xl skeleton" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="py-8 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[40px] text-on-surface-variant/20 block mb-2">event_note</span>
            <p className="font-bold text-sm">Нет предстоящих записей</p>
            <p className="text-xs mt-1 opacity-60">Запишитесь через поиск услуг</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((a) => {
              const t = new Date(a.starts_at);
              const sc = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.draft!;
              return (
                <li
                  key={a.id}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/10 hover:border-primary/20 hover:bg-white transition-all"
                >
                  {/* Date badge */}
                  <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl shrink-0"
                    style={{ background: "linear-gradient(135deg,#f3eeff,#ede7f6)" }}>
                    <span className="text-sm font-black text-primary leading-none">
                      {t.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-bold mt-0.5">
                      {formatTime24(t)}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-on-surface truncate">{a.service_title || a.title}</p>
                    <p className="text-xs text-on-surface-variant truncate mt-0.5">{a.provider_name}</p>
                  </div>

                  {/* Status */}
                  <span className={`shrink-0 flex items-center gap-1.5 text-[11px] font-bold ${sc.text}`}>
                    <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                    {sc.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
