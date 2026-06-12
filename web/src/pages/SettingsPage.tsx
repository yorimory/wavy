import { type FormEvent, useEffect, useState } from "react";
import { apiFetch, getAvatarUrl } from "@/api/client";
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
  const [me, setMe] = useState<UserOut | null>(null);
  const privatePerson = isPrivatePerson(me || user);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [notificationTime, setNotificationTime] = useState("");
  const [hours, setHours] = useState<{ weekday: number; start: string; end: string }[]>(() =>
    [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
      weekday,
      start: weekday < 5 ? "09:00" : "",
      end: weekday < 5 ? "18:00" : "",
    })),
  );
  const [pageLoading, setPageLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  function formatPhone(raw: string): string {
    const digits = raw.replace(/\D/g, "");
    if (digits.startsWith("375")) {
      const code = digits.slice(3, 5);
      const part1 = digits.slice(5, 8);
      const part2 = digits.slice(8, 10);
      const part3 = digits.slice(10, 12);
      let formatted = "+375";
      if (code) formatted += ` (${code}`;
      if (digits.length > 5) formatted += `) ${part1}`;
      if (digits.length > 8) formatted += `-${part2}`;
      if (digits.length > 10) formatted += `-${part3}`;
      return formatted;
    }
    if (digits.startsWith("7") || digits.startsWith("8")) {
      const cleanDigits = digits.startsWith("8") ? "7" + digits.slice(1) : digits;
      const code = cleanDigits.slice(1, 4);
      const part1 = cleanDigits.slice(4, 7);
      const part2 = cleanDigits.slice(7, 9);
      const part3 = cleanDigits.slice(9, 11);
      let formatted = "+7";
      if (code) formatted += ` (${code}`;
      if (cleanDigits.length > 4) formatted += `) ${part1}`;
      if (cleanDigits.length > 7) formatted += `-${part2}`;
      if (cleanDigits.length > 9) formatted += `-${part3}`;
      return formatted;
    }
    if (digits.length > 0) {
      return "+" + digits.slice(0, 15);
    }
    return raw;
  }

  const handlePhoneChange = (val: string) => {
    setPhone(formatPhone(val));
  };

  async function load() {
    setPageLoading(true);
    try {
      const u = await apiFetch<UserOut>("/users/me");
      setMe(u);
      setFullName(u.full_name ?? "");
      setPhone(u.phone ?? "");
      setAddress(u.address ?? "");
      setAvatarUrl(u.avatar_url ?? "");
      setNotificationTime(u.settings_json?.notification_time ?? "");

      const isPP = isPrivatePerson(u);
      if (isPP) {
        try {
          const wh = await apiFetch<WorkingHourOut[]>("/users/me/working-hours");
          if (wh && wh.length) {
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
        } catch (whError) {
          console.error("Failed to load working hours", whError);
        }
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
      const updatedSettings = {
        ...(me?.settings_json ?? {}),
        notification_time: notificationTime || null,
      };
      const u = await apiFetch<UserOut>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          address: privatePerson ? (address.trim() || null) : null,
          avatar_url: avatarUrl.trim() || null,
          settings_json: privatePerson ? updatedSettings : me?.settings_json,
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
        {me?.avatar_url ? (
          <img
            src={getAvatarUrl(me.avatar_url)}
            alt="Аватар"
            className="w-16 h-16 rounded-none object-cover shadow-glow-sm shrink-0 border border-outline-variant/15"
          />
        ) : (
          <div className="w-16 h-16 rounded-none primary-gradient flex items-center justify-center text-white font-black text-xl shadow-glow-sm shrink-0">
            {initials}
          </div>
        )}
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
        title="Профиль"
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

          <div className="space-y-2">
            <label className="section-label">Аватар (изображение)</label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                id="avatar-upload"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  const formData = new FormData();
                  formData.append("file", file);
                  
                  setBusy(true);
                  try {
                    const u = await apiFetch<UserOut>("/users/me/avatar", {
                      method: "POST",
                      body: formData,
                    });
                    setMe(u);
                    setAvatarUrl(u.avatar_url ?? "");
                    await refreshUser();
                    toast.success("Аватар успешно загружен");
                  } catch (ex) {
                    toast.error(ex instanceof Error ? ex.message : "Ошибка загрузки файла");
                  } finally {
                    setBusy(false);
                  }
                }}
              />
              <label
                htmlFor="avatar-upload"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-outline-variant hover:bg-surface-container text-sm font-semibold cursor-pointer transition-all active:scale-95 bg-white"
              >
                <span className="material-symbols-outlined text-[18px]">upload</span>
                Выбрать файл
              </label>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const u = await apiFetch<UserOut>("/users/me", {
                        method: "PATCH",
                        body: JSON.stringify({ avatar_url: null }),
                      });
                      setMe(u);
                      setAvatarUrl("");
                      await refreshUser();
                      toast.success("Аватар удалён");
                    } catch (ex) {
                      toast.error(ex instanceof Error ? ex.message : "Ошибка удаления");
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-error/30 text-error hover:bg-error/5 text-sm font-semibold transition-all active:scale-95 bg-white"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  Удалить
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="section-label">Номер телефона</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/50 text-[18px]">phone</span>
              <input
                className={`${ic} pl-11`}
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="+375 (29) 123-45-67"
              />
            </div>
          </div>

          {privatePerson && (
            <div className="space-y-1.5">
              <label className="section-label">Адрес места работы</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/50 text-[18px]">location_on</span>
                <input
                  className={`${ic} pl-11`}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Например: ул. Ленина, 5, оф. 10"
                />
              </div>
            </div>
          )}

          {privatePerson && (
            <div className="space-y-1.5">
              <label className="section-label">Ежедневное напоминание о записях на сегодня</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/50 text-[18px]">notifications_active</span>
                <select
                  className={`${ic} pl-11`}
                  value={notificationTime}
                  onChange={(e) => setNotificationTime(e.target.value)}
                >
                  <option value="">— Отключено —</option>
                  {Array.from({ length: 30 }, (_, i) => {
                    const h = Math.floor(i / 2) + 8;
                    const m = (i % 2) * 30;
                    const val = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
                    return (
                      <option key={val} value={val}>
                        {val}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-4 border-t border-outline-variant/15">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const res = await apiFetch<{ status: string; message: string }>("/users/me/test-push", { method: "POST" });
                  toast.success(res.message || "Тестовое пуш-уведомление отправлено!");
                } catch (ex) {
                  toast.error(ex instanceof Error ? ex.message : "Не удалось отправить пуш-уведомление");
                } finally {
                  setBusy(false);
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold transition-all border border-amber-500/20"
            >
              <span className="material-symbols-outlined text-[16px]">notifications_active</span>
              Тестировать Пуш
            </button>

            {privatePerson && (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const res = await apiFetch<{ status: string; message: string }>("/users/me/push-schedule", { method: "POST" });
                    toast.success(res.message || "Расписание отправлено в пуш-уведомлении!");
                  } catch (ex) {
                    toast.error(ex instanceof Error ? ex.message : "Не удалось отправить пуш-уведомление с расписанием");
                  } finally {
                    setBusy(false);
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all border border-primary/20"
              >
                <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                Расписание на сегодня
              </button>
            )}
          </div>

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
                    className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-2xl transition-all ${isWorkday ? "bg-primary/4 border border-primary/15" : "bg-surface-container/50 border border-outline-variant/10"}`}
                  >
                    {/* Day row header: holds Day Name and Status Toggle */}
                    <div className="flex items-center justify-between w-full sm:w-auto sm:gap-4">
                      <span className={`text-sm font-bold sm:w-24 ${isWorkday ? "text-primary" : "text-on-surface-variant"}`}>
                        {FULL_WEEKDAYS[h.weekday]}
                      </span>
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
                    </div>

                    {/* Time selects */}
                    {isWorkday && (
                      <div className="flex items-center gap-2.5 w-full sm:w-auto pt-2 sm:pt-0 border-t border-outline-variant/5 sm:border-t-0">
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
                      </div>
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

    </div>
  );
}
