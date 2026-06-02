import { type FormEvent, useMemo, useState } from "react";
import { apiFetch } from "@/api/client";
import { toLocalInput } from "@/utils/calendarUtils";
import type { AppointmentOut, ClientOut, ServiceOut } from "@/types";

const ic =
  "w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30 text-on-surface";

/** Преобразует строку datetime-local в формат понятный FastAPI (без timezone) */
function localToServer(local: string): string {
  // Убираем T → пробел для читаемости, FastAPI принимает оба формата
  // Главное — НЕ конвертировать в UTC, хранить как локальное время
  return local; // "2026-05-31T13:00" — FastAPI парсит как naive datetime
}

/** Преобразует Date → строку datetime-local без смещения */
function dateToLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function AppointmentModal({
  mode,
  appt,
  services,
  clients = [],
  defaultStart,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  appt?: AppointmentOut;
  services: ServiceOut[];
  clients?: ClientOut[];
  defaultStart?: Date;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  // ── начальные значения ──────────────────────────────────────────────────
  const { initStart, initEnd } = useMemo(() => {
    if (appt) {
      return {
        initStart: toLocalInput(appt.starts_at),
        initEnd: toLocalInput(appt.ends_at),
      };
    }
    // Для новой записи: берём дату из defaultStart (клик по ячейке) или текущее время +1ч
    const startDate = defaultStart
      ? new Date(defaultStart)
      : (() => {
          const d = new Date();
          d.setHours(d.getHours() + 1, 0, 0, 0);
          return d;
        })();
    startDate.setSeconds(0, 0);
    // endDate = startDate + 1 час (через миллисекунды — без строк)
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    return {
      initStart: dateToLocal(startDate),
      initEnd: dateToLocal(endDate),
    };
  }, []); // намеренно без deps — вычисляем один раз при открытии модала


  const [clientId, setClientId] = useState<string>(
    appt?.client_id ? String(appt.client_id) : "",
  );
  const [serviceId, setServiceId] = useState<string>(
    appt?.service_id ? String(appt.service_id) : "",
  );
  const [title, setTitle] = useState(appt?.title ?? "Запись");
  const [starts, setStarts] = useState(initStart);
  const [ends, setEnds] = useState(initEnd);
  const [notes, setNotes] = useState(appt?.notes ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // ── выбор услуги — автоматически заполняет название и конец ────────────
  function handleServiceChange(id: string) {
    setServiceId(id);
    const svc = services.find((s) => String(s.id) === id);
    if (!svc) return;
    setTitle(svc.title);
    const start = new Date(starts); // парсим как локальное время
    const end = new Date(start.getTime() + svc.duration_minutes * 60_000);
    setEnds(dateToLocal(end));
  }

  // ── изменение начала — сдвигаем конец пропорционально ─────────────────
  function handleStartChange(val: string) {
    setStarts(val);
    const svc = services.find((s) => String(s.id) === serviceId);
    if (svc) {
      const start = new Date(val);
      const end = new Date(start.getTime() + svc.duration_minutes * 60_000);
      setEnds(dateToLocal(end));
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!starts || !ends) {
      setErr("Укажите время начала и конца");
      return;
    }
    if (new Date(ends) <= new Date(starts)) {
      setErr("Конец должен быть после начала");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const body = {
        title: title.trim() || "Запись",
        client_id: clientId ? Number(clientId) : null,
        service_id: serviceId ? Number(serviceId) : null,
        starts_at: localToServer(starts),
        ends_at: localToServer(ends),
        status: "confirmed",
        notes: notes.trim() || null,
      };
      if (mode === "create") {
        await apiFetch("/appointments", { method: "POST", body: JSON.stringify(body) });
      } else if (appt) {
        await apiFetch(`/appointments/${appt.id}`, { method: "PATCH", body: JSON.stringify(body) });
      }
      await onSaved();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!appt) return;
    if (!window.confirm("Удалить запись?")) return;
    setBusy(true);
    try {
      await apiFetch(`/appointments/${appt.id}`, { method: "DELETE" });
      await onSaved();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  const activeServices = services.filter((s) => s.is_active);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] bg-surface-container-lowest shadow-2xl border border-outline-variant/20 p-5 sm:p-8 max-h-[85dvh] overflow-y-auto">
        {/* Заголовок */}
        <div className="flex justify-between items-center gap-4 mb-6">
          <h3 className="text-xl font-black text-on-surface">
            {mode === "create" ? "Новая запись" : "Редактирование записи"}
          </h3>
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container text-on-surface-variant transition-colors"
            onClick={onClose}
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">


          {/* Услуга */}
          {activeServices.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">
                Услуга
              </label>
              <select
                className={ic}
                value={serviceId}
                onChange={(e) => handleServiceChange(e.target.value)}
              >
                <option value="">— не выбрана —</option>
                {activeServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                    {s.duration_minutes ? ` · ${s.duration_minutes} мин` : ""}
                    {s.price != null ? ` · ${s.price} BYN` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Название */}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">
              Название записи
            </label>
            <input
              className={ic}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Стрижка"
            />
          </div>

          {/* Время */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">
                Начало
              </label>
              <input
                className={`${ic} px-3 text-xs sm:text-sm`}
                type="datetime-local"
                value={starts}
                onChange={(e) => handleStartChange(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">
                Конец
              </label>
              <input
                className={`${ic} px-3 text-xs sm:text-sm`}
                type="datetime-local"
                value={ends}
                onChange={(e) => setEnds(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Заметки */}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">
              Заметки (необязательно)
            </label>
            <textarea
              className={`${ic} min-h-[72px] resize-none`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Комментарий к записи…"
            />
          </div>

          {err && (
            <p className="text-error text-sm font-medium bg-error/5 px-3 py-2 rounded-lg">
              {err}
            </p>
          )}

          {/* Кнопки */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              className="flex-1 px-4 py-3 rounded-xl border border-outline-variant font-bold text-on-surface hover:bg-surface-container transition-colors"
              onClick={onClose}
            >
              Отмена
            </button>
            {mode === "edit" && (
              <button
                type="button"
                className="px-4 py-3 rounded-xl border border-error/50 text-error font-bold hover:bg-error/5 transition-colors"
                onClick={onDelete}
                disabled={busy}
              >
                Удалить
              </button>
            )}
            <button
              type="submit"
              disabled={busy}
              className="flex-1 px-4 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {busy ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
