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
  const [clientSearch, setClientSearch] = useState("");
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientOut | null>(() => {
    if (appt?.client_id && clients) {
      return clients.find((c) => c.id === appt.client_id) || null;
    }
    return null;
  });
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q))
    );
  }, [clients, clientSearch]);

  const handleSelectClient = (c: ClientOut | null) => {
    setSelectedClient(c);
    setClientId(c ? String(c.id) : "");
    setClientSearch("");
    setIsClientDropdownOpen(false);
  };

  const handleCreateClientQuickly = async () => {
    if (!clientSearch.trim()) return;
    setIsCreatingClient(true);
    setErr(null);
    try {
      const newClient = await apiFetch<ClientOut>("/clients", {
        method: "POST",
        body: JSON.stringify({
          full_name: clientSearch.trim(),
        }),
      });
      setSelectedClient(newClient);
      setClientId(String(newClient.id));
      setClientSearch("");
      setIsClientDropdownOpen(false);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Не удалось создать клиента");
    } finally {
      setIsCreatingClient(false);
    }
  };

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
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      {/* Background overlay to close */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />

      <div className="w-full max-w-md rounded-t-[32px] sm:rounded-[32px] bg-surface-container-lowest shadow-2xl border-t sm:border border-outline-variant/20 p-4 pb-safe sm:p-8 max-h-[92dvh] sm:max-h-[85dvh] overflow-y-auto animate-[slide-up_0.3s_cubic-bezier(0.16,1,0.3,1)] sm:animate-scale-in">
        {/* Swipe indicator for mobile */}
        <div
          className="w-12 h-1.5 bg-outline-variant/30 rounded-full mx-auto mb-4 block sm:hidden cursor-pointer active:bg-outline-variant/50 transition-colors"
          onClick={onClose}
        />

        {/* Заголовок */}
        <div className="flex justify-between items-center gap-4 mb-5">
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

        <form onSubmit={onSubmit} className="space-y-3.5">
          {/* Клиент */}
          <div className="relative">
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">
              Клиент
            </label>
            {selectedClient ? (
              <div className="flex items-center justify-between w-full rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-on-surface">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">person</span>
                  <div>
                    <div className="font-bold text-sm leading-snug">{selectedClient.full_name}</div>
                    {selectedClient.phone && (
                      <div className="text-[11px] text-on-surface-variant">{selectedClient.phone}</div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectClient(null)}
                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-primary/10 text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            ) : (
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/40 text-[20px]">
                  search
                </span>
                <input
                  type="text"
                  className={`${ic} pl-10`}
                  placeholder="Поиск или добавление клиента…"
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setIsClientDropdownOpen(true);
                  }}
                  onFocus={() => setIsClientDropdownOpen(true)}
                />
                {clientSearch && (
                  <button
                    type="button"
                    onClick={() => setClientSearch("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 hover:text-on-surface"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                )}

                {isClientDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsClientDropdownOpen(false)}
                    />
                    <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-xl z-20 scroll-touch py-1">
                      {filteredClients.length > 0 ? (
                        filteredClients.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full text-left px-4 py-2 hover:bg-surface-container/60 transition-colors flex items-center justify-between"
                            onClick={() => handleSelectClient(c)}
                          >
                            <div>
                              <div className="font-semibold text-sm text-on-surface">{c.full_name}</div>
                              {c.phone && (
                                <div className="text-xs text-on-surface-variant">{c.phone}</div>
                              )}
                            </div>
                            <span className="material-symbols-outlined text-on-surface-variant/30 text-[18px]">chevron_right</span>
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-center text-xs text-on-surface-variant">
                          Клиенты не найдены
                        </div>
                      )}

                      {clientSearch.trim() && (
                        <div className="border-t border-outline-variant/10 mt-1 pt-1 px-2 pb-1">
                          <button
                            type="button"
                            disabled={isCreatingClient}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-primary/10 hover:bg-primary/15 text-primary text-xs font-bold transition-all disabled:opacity-50"
                            onClick={handleCreateClientQuickly}
                          >
                            <span className="material-symbols-outlined text-[16px]">person_add</span>
                            {isCreatingClient ? "Создание…" : `Добавить "${clientSearch}"`}
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

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
