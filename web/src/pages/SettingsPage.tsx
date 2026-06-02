import { type FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { TimeSelect } from "@/components/ui/TimeSelect";
import { isPrivatePerson } from "@/utils/roles";
import type { ModerationCheckOut, UserOut, WorkingHourOut } from "@/types";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const FULL_WEEKDAYS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`skeleton rounded-2xl ${className ?? ""}`} />;
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="card p-6 space-y-5">
      <div>
        <h3 className="text-lg font-black text-on-surface">{title}</h3>
        {subtitle && <p className="text-sm text-on-surface-variant mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const privatePerson = isPrivatePerson(user);

  const [me, setMe] = useState<UserOut | null>(null);
  const [fullName, setFullName] = useState("");
  const [modOn, setModOn] = useState(true);
  const [strict, setStrict] = useState<"low" | "medium" | "high">("medium");
  const [hours, setHours] = useState<{ weekday: number; start: string; end: string }[]>(() =>
    [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
      weekday,
      start: weekday < 5 ? "09:00" : "",
      end: weekday < 5 ? "18:00" : "",
    })),
  );
  const [modText, setModText] = useState("");
  const [modResult, setModResult] = useState<ModerationCheckOut | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setPageLoading(true);
    try {
      const [u, wh] = await Promise.all([
        apiFetch<UserOut>("/users/me"),
        apiFetch<WorkingHourOut[]>("/users/me/working-hours"),
      ]);
      setMe(u);
      setFullName(u.full_name ?? "");
      setModOn(u.moderation_enabled);
      setStrict(u.moderation_strictness);
      if (wh.length) {
        const map = new Map(wh.map((r) => [r.weekday, r]));
        setHours(
          [0, 1, 2, 3, 4, 5, 6].map((d) => {
            const row = map.get(d);
            return {
              weekday: d,
              start: row ? row.start_time.slice(0, 5) : "",
              end: row ? row.end_time.slice(0, 5) : "",
            };
          }),
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setPageLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await apiFetch<UserOut>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          full_name: fullName.trim(),
          moderation_enabled: modOn,
          moderation_strictness: strict,
        }),
      });
      setMe(u);
      await refreshUser();
      toast.success("Профиль сохранён");
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : "Ошибка сохранения");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveHours(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = hours
        .filter((h) => h.start && h.end)
        .map((h) => ({
          weekday: h.weekday,
          start_time: h.start.length === 5 ? `${h.start}:00` : h.start,
          end_time: h.end.length === 5 ? `${h.end}:00` : h.end,
        }));
      await apiFetch("/users/me/working-hours", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      toast.success("Часы работы сохранены");
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : "Ошибка сохранения");
    } finally {
      setBusy(false);
    }
  }

  async function onDevTier(tier: "free" | "premium") {
    setBusy(true);
    try {
      const u = await apiFetch<UserOut>(`/users/me/dev-set-tier?tier=${tier}`, { method: "POST" });
      setMe(u);
      await refreshUser();
      toast.success(`Тариф переключён: ${tier}`);
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function onModerationCheck(e: FormEvent) {
    e.preventDefault();
    setModResult(null);
    setBusy(true);
    try {
      const out = await apiFetch<ModerationCheckOut>("/moderation/check", {
        method: "POST",
        body: JSON.stringify({ text: modText, source: "note" }),
      });
      setModResult(out);
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : "Ошибка модерации");
    } finally {
      setBusy(false);
    }
  }

  /* ── Skeleton loading state ── */
  if (pageLoading) {
    return (
      <div className="max-w-3xl space-y-6 animate-fade-up">
        <div>
          <SkeletonBlock className="h-9 w-48 mb-2" />
          <SkeletonBlock className="h-4 w-64" />
        </div>
        <SkeletonBlock className="h-48 w-full" />
        {privatePerson && <SkeletonBlock className="h-72 w-full" />}
      </div>
    );
  }

  const ic = "input-field";

  /* ── Avatar initials ── */
  const initials = me?.full_name
    ? me.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : (me?.email?.[0] ?? "U").toUpperCase();

  return (
    <div className="max-w-3xl space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-3xl primary-gradient flex items-center justify-center text-white font-black text-xl shadow-glow-sm shrink-0">
          {initials}
        </div>
        <div>
          <h2 className="text-3xl font-black text-on-surface tracking-tight">
            {privatePerson ? "Настройки" : "Профиль"}
          </h2>
          <p className="text-on-surface-variant text-sm mt-0.5 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">mail</span>
            {me?.email}
          </p>
        </div>
      </div>

      {/* ── Profile card ── */}
      <SectionCard
        title={privatePerson ? "Профиль и модерация" : "Профиль"}
        subtitle="Публичная информация о вас"
      >
        <form onSubmit={onSaveProfile} className="space-y-4">
          <div className="space-y-1.5">
            <label className="section-label">Отображаемое имя</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/50 text-[18px]">badge</span>
              <input className={`${ic} pl-11`} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ваше имя" />
            </div>
          </div>

          {privatePerson && (
            <div className="space-y-3 pt-2 border-t border-outline-variant/10">
              <p className="section-label">Модерация текста</p>
              <label className="flex items-center justify-between gap-3 cursor-pointer p-4 rounded-2xl bg-surface-container-low border border-outline-variant/10 hover:border-primary/20 transition-all">
                <div>
                  <p className="font-bold text-on-surface text-sm">Модерация включена</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Проверять отзывы и заметки на спам</p>
                </div>
                {/* Toggle switch */}
                <div
                  onClick={() => setModOn((v) => !v)}
                  className={`relative w-11 h-6 rounded-full transition-all cursor-pointer shrink-0 ${modOn ? "bg-primary" : "bg-outline-variant/40"}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${modOn ? "left-6" : "left-1"}`} />
                </div>
              </label>

              <div className="space-y-1.5">
                <label className="section-label">Строгость проверки</label>
                <select className={ic} value={strict} onChange={(e) => setStrict(e.target.value as typeof strict)}>
                  <option value="low">Низкая — только очевидный спам</option>
                  <option value="medium">Средняя — баланс точности</option>
                  <option value="high">Высокая — максимальная фильтрация</option>
                </select>
              </div>
            </div>
          )}

          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? (
              <span className="flex items-center gap-2"><span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>Сохранение…</span>
            ) : (
              <><span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>save</span>Сохранить профиль</>
            )}
          </button>
        </form>
      </SectionCard>

      {/* ── Working hours ── */}
      {privatePerson && (
        <SectionCard
          title="Часы работы"
          subtitle="Задайте расписание — клиенты увидят только свободные слоты в это время"
        >
          <form onSubmit={onSaveHours} className="space-y-4">
            <div className="space-y-2">
              {hours.map((h, idx) => {
                const isWorkday = !!(h.start && h.end);
                return (
                  <div
                    key={h.weekday}
                    className={`flex flex-wrap items-center gap-3 p-3 rounded-2xl transition-all ${isWorkday ? "bg-primary/4 border border-primary/15" : "bg-surface-container/50 border border-outline-variant/10"}`}
                  >
                    {/* Day label */}
                    <div className="w-24 flex items-center gap-2">
                      <span className={`text-sm font-bold ${isWorkday ? "text-primary" : "text-on-surface-variant"}`}>
                        {FULL_WEEKDAYS[h.weekday]}
                      </span>
                    </div>

                    {/* Off toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...hours];
                        if (isWorkday) {
                          next[idx] = { ...h, start: "", end: "" };
                        } else {
                          next[idx] = { ...h, start: "09:00", end: "18:00" };
                        }
                        setHours(next);
                      }}
                      className={`text-[10px] font-black px-2.5 py-1 rounded-full transition-all ${isWorkday ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-outline-variant/20 text-on-surface-variant hover:bg-outline-variant/30"}`}
                    >
                      {isWorkday ? "Рабочий" : "Выходной"}
                    </button>

                    {/* Time selects */}
                    {isWorkday && (
                      <>
                        <TimeSelect
                          value={h.start}
                          placeholder="с"
                          onChange={(v) => {
                            const next = [...hours];
                            next[idx] = { ...h, start: v };
                            setHours(next);
                          }}
                        />
                        <span className="text-on-surface-variant/60 text-sm">—</span>
                        <TimeSelect
                          value={h.end}
                          placeholder="до"
                          onChange={(v) => {
                            const next = [...hours];
                            next[idx] = { ...h, end: v };
                            setHours(next);
                          }}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <button type="submit" disabled={busy} className="btn-secondary">
              {busy ? "Сохранение…" : "Сохранить расписание"}
            </button>
          </form>
        </SectionCard>
      )}

      {/* ── Moderation check ── */}
      {privatePerson && (
        <SectionCard title="Проверка модерации" subtitle="Проверьте любой текст через Premium-фильтр">
          <form onSubmit={onModerationCheck} className="space-y-4">
            <textarea
              className={`${ic} min-h-[100px] resize-none`}
              value={modText}
              onChange={(e) => setModText(e.target.value)}
              placeholder="Вставьте текст отзыва или заметки…"
            />
            {modResult && (
              <div className="space-y-2 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/15 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-on-surface">Вердикт:</span>
                  <span className={`font-black px-2 py-0.5 rounded-full text-xs ${modResult.verdict === "clean" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {modResult.verdict}
                  </span>
                </div>
                <p><span className="font-bold">Флаги:</span> <span className="text-on-surface-variant">{modResult.flags.join(", ") || "—"}</span></p>
                {modResult.sanitized_suggestion && (
                  <p><span className="font-bold">Подсказка:</span> <span className="text-on-surface-variant">{modResult.sanitized_suggestion}</span></p>
                )}
              </div>
            )}
            <button type="submit" disabled={busy || !modText.trim()} className="btn-secondary">
              <span className="material-symbols-outlined text-[16px]">policy</span>
              Проверить текст
            </button>
          </form>
        </SectionCard>
      )}

      {/* ── Dev mode ── */}
      {privatePerson && (
        <div className="p-6 rounded-3xl bg-tertiary-fixed/20 border border-outline-variant/15 space-y-4">
          <div>
            <h3 className="text-lg font-black text-on-surface">Режим разработки</h3>
            <p className="text-sm text-on-surface-variant mt-0.5">Переключение тарифа без оплаты (DEV_MODE).</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              className="px-5 py-3 rounded-2xl bg-white border border-outline-variant/30 font-bold text-sm text-on-surface hover:border-primary/30 hover:shadow-sm transition-all disabled:opacity-50"
              onClick={() => void onDevTier("free")}
            >
              Установить Free
            </button>
            <button
              type="button"
              disabled={busy}
              className="px-5 py-3 rounded-2xl primary-gradient text-white font-bold text-sm shadow-glow-sm hover:shadow-glow transition-all disabled:opacity-50"
              onClick={() => void onDevTier("premium")}
            >
              ✦ Установить Premium
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
