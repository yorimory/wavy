import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/api/client";
import { formatTime24 } from "@/utils/calendarUtils";
import type { CatalogServiceOut, DaySlotsOut, ProviderOut, ServiceOut } from "@/types";

/* ─────────────────────────── constants ─────────────────────────── */

const CATEGORY_ICONS: Record<string, string> = {
  "Парикмахерские услуги": "💇‍♀️",
  "Маникюр и педикюр": "💅",
  "Массаж и СПА": "💆‍♂️",
  "Косметология": "✨",
  "Макияж и брови": "💄",
  "Обучение и консультации": "🎓",
  "Другое": "🛠️",
};

/* ─────────────────────────── BookingModal ─────────────────────────── */

interface BookingModalProps {
  service: CatalogServiceOut;
  days: DaySlotsOut[];
  loading: boolean;
  booking: boolean;
  err: string | null;
  ok: string | null;
  onBook: (startsAt: string) => void;
  onClose: () => void;
}

function BookingModal({ service, days, loading, booking, err, ok, onBook, onClose }: BookingModalProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(
    days.length > 0 ? days[0]!.date : null,
  );
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  /* Если загрузились дни — авто-выбираем первый */
  useEffect(() => {
    if (days.length > 0 && !selectedDate) {
      setSelectedDate(days[0]!.date);
    }
  }, [days, selectedDate]);

  const slotsForDate = useMemo(
    () => days.find((d) => d.date === selectedDate)?.slots ?? [],
    [days, selectedDate],
  );

  /* Закрыть по клику на оверлей */
  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  const formatDate = (iso: string) =>
    new Date(iso + "T12:00:00").toLocaleDateString("ru-RU", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

  const formatFullDate = (iso: string) =>
    new Date(iso + "T12:00:00").toLocaleDateString("ru-RU", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
      style={{ animation: "fadeIn 0.2s ease" }}
    >
      <div
        className="w-full sm:max-w-2xl rounded-t-[32px] sm:rounded-[32px] bg-surface-container-lowest border border-outline-variant/20 shadow-2xl overflow-hidden flex flex-col max-h-[88dvh]"
        style={{ animation: "slideUp 0.3s cubic-bezier(.32,1.2,.42,1) both" }}
      >
        {/* ── Шапка ── */}
        <div className="relative flex items-start gap-4 p-6 pb-4 shrink-0">
          {/* Drag handle на мобильном */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-outline-variant/40 rounded-full sm:hidden" />

          {service.image_url ? (
            <img
              src={service.image_url}
              alt={service.title}
              className="w-20 h-20 rounded-2xl object-cover shrink-0 shadow-md border border-outline-variant/10"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center shrink-0 shadow-md">
              <span className="material-symbols-outlined text-white/80 text-[32px]">spa</span>
            </div>
          )}

          <div className="flex-1 min-w-0 pt-1">
            <h3 className="text-xl font-black text-on-surface leading-tight">{service.title}</h3>
            <p className="text-sm text-primary font-bold mt-0.5">{service.provider_name}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-full">
                <span className="material-symbols-outlined text-[13px]">schedule</span>
                {service.duration_minutes} мин
              </span>
              {service.price != null && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  <span className="material-symbols-outlined text-[13px]">payments</span>
                  {service.price} BYN
                </span>
              )}
              {service.category && (
                <span className="inline-flex items-center text-xs font-bold text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-full">
                  {CATEGORY_ICONS[service.category] ?? "🛠️"} {service.category}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container text-on-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="h-px bg-outline-variant/15 mx-6 shrink-0" />

        {/* ── Тело ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-on-surface-variant">
            <span className="material-symbols-outlined animate-spin text-[36px] text-primary">progress_activity</span>
            <span className="text-sm font-medium">Загружаем свободное время…</span>
          </div>
        ) : days.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-on-surface-variant">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant/25">event_busy</span>
            <p className="font-bold text-on-surface">Нет свободных слотов</p>
            <p className="text-sm text-center max-w-xs">Специалист ещё не указал рабочее время или все слоты на ближайшие 14 дней заняты.</p>
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* ── Горизонтальный скролл дат ── */}
            <div className="px-6 pt-4 pb-2 shrink-0">
              <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">Выберите дату</p>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-none">
                {days.map((d) => {
                  const isActive = d.date === selectedDate;
                  const dayObj = new Date(d.date + "T12:00:00");
                  return (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => { setSelectedDate(d.date); setSelectedSlot(null); }}
                      className={`shrink-0 flex flex-col items-center justify-center px-4 py-3 rounded-2xl border font-bold transition-all min-w-[64px] ${
                        isActive
                          ? "bg-primary border-primary text-white shadow-lg shadow-primary/25 scale-105"
                          : "bg-white border-outline-variant/30 text-on-surface hover:border-primary/40 hover:shadow-sm"
                      }`}
                    >
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? "text-white/70" : "text-on-surface-variant"}`}>
                        {dayObj.toLocaleDateString("ru-RU", { weekday: "short" })}
                      </span>
                      <span className={`text-xl font-black leading-none mt-0.5 ${isActive ? "text-white" : "text-on-surface"}`}>
                        {dayObj.getDate()}
                      </span>
                      <span className={`text-[10px] mt-0.5 ${isActive ? "text-white/70" : "text-on-surface-variant"}`}>
                        {dayObj.toLocaleDateString("ru-RU", { month: "short" })}
                      </span>
                      <span className={`mt-1.5 text-[10px] font-black px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>
                        {d.slots.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="h-px bg-outline-variant/10 mx-6 shrink-0" />

            {/* ── Сетка слотов ── */}
            <div className="flex-1 overflow-y-auto px-6 pt-4 pb-4 min-h-0">
              {selectedDate && (
                <>
                  <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">
                    {formatFullDate(selectedDate)}
                  </p>
                  {slotsForDate.length === 0 ? (
                    <p className="text-on-surface-variant text-sm py-4">Нет слотов на этот день</p>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
                      {slotsForDate.map((slot) => {
                        const isChosen = selectedSlot === slot.starts_at;
                        return (
                          <button
                            key={slot.starts_at}
                            type="button"
                            disabled={booking}
                            onClick={() => setSelectedSlot(isChosen ? null : slot.starts_at)}
                            className={`py-2.5 rounded-2xl border font-bold text-sm text-center transition-all disabled:opacity-40 ${
                              isChosen
                                ? "bg-primary border-primary text-white shadow-md shadow-primary/25 scale-[1.04]"
                                : "bg-white border-outline-variant/30 text-on-surface hover:border-primary/50 hover:bg-primary/4 hover:shadow-sm active:scale-95"
                            }`}
                          >
                            {formatTime24(new Date(slot.starts_at))}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Подвал: сообщения + кнопка ── */}
        {!loading && days.length > 0 && (
          <div className="px-6 pb-6 pt-3 shrink-0 space-y-3 border-t border-outline-variant/10">
            {err && (
              <p className="text-error text-sm font-semibold bg-error/5 px-4 py-2.5 rounded-xl border border-error/15">
                {err}
              </p>
            )}
            {ok && (
              <p className="text-primary text-sm font-bold bg-primary/5 px-4 py-2.5 rounded-xl border border-primary/15 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                {ok}
              </p>
            )}
            <button
              type="button"
              disabled={!selectedSlot || booking}
              onClick={() => selectedSlot && onBook(selectedSlot)}
              className={`w-full py-4 rounded-2xl font-black text-base transition-all ${
                selectedSlot && !booking
                  ? "primary-gradient text-white shadow-lg shadow-primary/30 hover:opacity-95 active:scale-[0.98]"
                  : "bg-surface-container text-on-surface-variant cursor-not-allowed"
              }`}
            >
              {booking ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  Оформляем запись…
                </span>
              ) : selectedSlot ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>event_available</span>
                  Записаться на {formatTime24(new Date(selectedSlot))}
                </span>
              ) : (
                "Выберите время"
              )}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  );
}

/* ─────────────────────────── Main Page ─────────────────────────── */

export function ServiceSearchPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"services" | "specialists">("services");

  // Tab 1
  const [q, setQ] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [services, setServices] = useState<CatalogServiceOut[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking modal
  const [modalService, setModalService] = useState<CatalogServiceOut | null>(null);
  const [modalDays, setModalDays] = useState<DaySlotsOut[]>([]);
  const [modalSlotsLoading, setModalSlotsLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [bookingErr, setBookingErr] = useState<string | null>(null);
  const [bookingOk, setBookingOk] = useState<string | null>(null);

  // Tab 2
  const [providers, setProviders] = useState<ProviderOut[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [providerServices, setProviderServices] = useState<ServiceOut[]>([]);
  const [selectedProviderServiceId, setSelectedProviderServiceId] = useState<string>("");
  const [providerDays, setProviderDays] = useState<DaySlotsOut[]>([]);
  const [providerSlotsLoading, setProviderSlotsLoading] = useState(false);
  const [activeDateIndex, setActiveDateIndex] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const categories = useMemo(() => Object.keys(CATEGORY_ICONS), []);

  // Загрузка каталога услуг
  useEffect(() => {
    if (activeTab !== "services") return;
    const t = setTimeout(() => {
      setLoading(true);
      const qs = q.trim() ? `q=${encodeURIComponent(q.trim())}` : "";
      void apiFetch<CatalogServiceOut[]>(`/catalog/services?${qs}`)
        .then(setServices)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q, activeTab]);

  const filteredServices = useMemo(() => {
    if (!selectedCategory) return services;
    return services.filter((s) => s.category === selectedCategory);
  }, [services, selectedCategory]);

  // Открыть модалку и загрузить слоты
  async function openBookingModal(s: CatalogServiceOut) {
    setModalService(s);
    setModalDays([]);
    setBookingErr(null);
    setBookingOk(null);
    setModalSlotsLoading(true);
    try {
      const data = await apiFetch<DaySlotsOut[]>(
        `/catalog/providers/${s.provider_id}/slots?service_id=${s.id}&days=14`,
      );
      setModalDays(data);
    } catch (e) {
      setBookingErr(e instanceof Error ? e.message : "Не удалось загрузить время");
    } finally {
      setModalSlotsLoading(false);
    }
  }

  function closeModal() {
    setModalService(null);
    setModalDays([]);
    setBookingErr(null);
    setBookingOk(null);
    setBooking(false);
  }

  // Бронирование
  async function handleBook(startsAt: string) {
    if (!modalService) return;
    setBooking(true);
    setBookingErr(null);
    try {
      await apiFetch("/catalog/book", {
        method: "POST",
        body: JSON.stringify({
          provider_id: modalService.provider_id,
          service_id: modalService.id,
          starts_at: startsAt,
        }),
      });
      setBookingOk("Запись успешно оформлена!");
      setTimeout(() => {
        closeModal();
        navigate("/my-bookings");
      }, 1400);
    } catch (e) {
      setBookingErr(e instanceof Error ? e.message : "Ошибка бронирования");
    } finally {
      setBooking(false);
    }
  }

  // Tab 2 — специалисты
  useEffect(() => {
    if (activeTab === "specialists" && providers.length === 0) {
      void apiFetch<ProviderOut[]>("/catalog/providers")
        .then(setProviders)
        .catch((e) => setErr(e instanceof Error ? e.message : "Ошибка"));
    }
  }, [activeTab, providers.length]);

  useEffect(() => {
    if (!selectedProviderId) {
      setProviderServices([]);
      setSelectedProviderServiceId("");
      setProviderDays([]);
      return;
    }
    void apiFetch<ServiceOut[]>(`/catalog/providers/${selectedProviderId}/services`)
      .then(setProviderServices)
      .catch(() => setProviderServices([]));
  }, [selectedProviderId]);

  useEffect(() => {
    if (!selectedProviderId || !selectedProviderServiceId) {
      setProviderDays([]);
      return;
    }
    setProviderSlotsLoading(true);
    setErr(null);
    void apiFetch<DaySlotsOut[]>(
      `/catalog/providers/${selectedProviderId}/slots?service_id=${selectedProviderServiceId}&days=14`,
    )
      .then((data) => {
        setProviderDays(data);
        setActiveDateIndex(data.length > 0 ? 0 : null);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setProviderSlotsLoading(false));
  }, [selectedProviderId, selectedProviderServiceId]);

  async function bookSpecialistSlot(startsAt: string) {
    if (!selectedProviderId || !selectedProviderServiceId) return;
    setBooking(true);
    setErr(null);
    try {
      await apiFetch("/catalog/book", {
        method: "POST",
        body: JSON.stringify({
          provider_id: Number(selectedProviderId),
          service_id: Number(selectedProviderServiceId),
          starts_at: startsAt,
        }),
      });
      setErr(null);
      setTimeout(() => navigate("/my-bookings"), 900);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка бронирования");
    } finally {
      setBooking(false);
    }
  }

  const ic =
    "w-full rounded-2xl border border-outline-variant/40 bg-white px-5 py-3 outline-none focus:ring-2 focus:ring-primary/30 text-on-surface";

  return (
    <>
      {/* ── Booking Modal ── */}
      {modalService && (
        <BookingModal
          service={modalService}
          days={modalDays}
          loading={modalSlotsLoading}
          booking={booking}
          err={bookingErr}
          ok={bookingOk}
          onBook={handleBook}
          onClose={closeModal}
        />
      )}

      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-3xl font-black text-on-surface tracking-tight">Поиск и бронирование</h2>
          <p className="text-on-surface-variant mt-1">
            Выбирайте удобные услуги или записывайтесь по свободным датам специалистов.
          </p>
        </div>

        {/* Переключатель вкладок */}
        <div className="flex bg-surface-container rounded-full p-1 border border-outline-variant/20 w-full sm:w-fit">
          <button
            type="button"
            onClick={() => { setActiveTab("services"); }}
            className={`flex-1 sm:flex-none px-6 py-2.5 text-sm rounded-full transition-all font-bold ${
              activeTab === "services"
                ? "bg-white text-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Поиск услуг
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("specialists"); }}
            className={`flex-1 sm:flex-none px-6 py-2.5 text-sm rounded-full transition-all font-bold ${
              activeTab === "specialists"
                ? "bg-white text-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            По специалистам
          </button>
        </div>

        {err && (
          <p className="text-error font-semibold bg-error/5 px-4 py-3 rounded-2xl border border-error/10">
            {err}
          </p>
        )}

        {/* ───── Вкладка 1: Поиск по услугам ───── */}
        {activeTab === "services" && (
          <div className="space-y-5">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/50 text-[20px]">
                  search
                </span>
                <input
                  className="w-full rounded-2xl border border-outline-variant/40 bg-white pl-11 pr-5 py-3.5 outline-none focus:ring-2 focus:ring-primary/30 text-on-surface placeholder:text-on-surface-variant/50"
                  placeholder="Название услуги или имя специалиста…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>

              {/* Фильтр по категориям */}
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-6 px-6 md:-mx-10 md:px-10 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className={`shrink-0 px-4 py-2 rounded-full border text-xs font-bold whitespace-nowrap transition-all ${
                    !selectedCategory
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-white border-outline-variant/30 text-on-surface-variant hover:border-primary/30"
                  }`}
                >
                  Все услуги
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`shrink-0 px-4 py-2 rounded-full border text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      selectedCategory === cat
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-white border-outline-variant/30 text-on-surface-variant hover:border-primary/30"
                    }`}
                  >
                    <span>{CATEGORY_ICONS[cat]}</span>
                    <span>{cat}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Список услуг */}
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-on-surface-variant">
                <span className="material-symbols-outlined animate-spin text-[24px] text-primary">progress_activity</span>
                <span className="font-medium">Поиск услуг…</span>
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="text-center py-16 text-on-surface-variant">
                <span className="material-symbols-outlined text-[48px] text-on-surface-variant/20 block mb-2">search_off</span>
                <p className="font-bold">Ничего не найдено</p>
                <p className="text-sm mt-1">Попробуйте другой запрос или категорию</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredServices.map((s) => (
                  <button
                    key={`${s.provider_id}-${s.id}`}
                    type="button"
                    onClick={() => void openBookingModal(s)}
                    className="text-left p-4 rounded-[24px] border border-outline-variant/20 bg-white hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 flex gap-4 group active:scale-[0.98]"
                  >
                    {s.image_url ? (
                      <img
                        src={s.image_url}
                        alt={s.title}
                        className="w-20 h-20 rounded-2xl object-cover shrink-0 group-hover:scale-[1.03] transition-transform"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/25 flex items-center justify-center shrink-0 group-hover:from-primary/15 group-hover:to-primary/35 transition-all">
                        <span className="material-symbols-outlined text-primary/50 text-[28px]">spa</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <div className="font-bold text-base text-on-surface leading-tight">{s.title}</div>
                        <p className="text-xs text-primary font-semibold mt-0.5">{s.provider_name}</p>
                        {s.category && (
                          <span className="inline-block text-[9px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-md mt-1.5">
                            {CATEGORY_ICONS[s.category] ?? ""} {s.category}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-outline-variant/10">
                        <span className="text-xs font-bold text-on-surface-variant">
                          {s.duration_minutes} мин{s.price != null ? ` · ${s.price} BYN` : ""}
                        </span>
                        <span className="text-xs font-black text-primary flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          Записаться
                          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ───── Вкладка 2: По специалистам ───── */}
        {activeTab === "specialists" && (
          <div className="bg-white border border-outline-variant/20 rounded-[32px] p-6 shadow-sm space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">
                  Специалист
                </label>
                <select
                  className={ic}
                  value={selectedProviderId}
                  onChange={(e) => setSelectedProviderId(e.target.value)}
                >
                  <option value="">— не выбран —</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.services_count} услуг)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">
                  Услуга
                </label>
                <select
                  className={ic}
                  value={selectedProviderServiceId}
                  onChange={(e) => setSelectedProviderServiceId(e.target.value)}
                  disabled={!selectedProviderId}
                >
                  <option value="">— не выбрана —</option>
                  {providerServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} · {s.duration_minutes} мин
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedProviderId && selectedProviderServiceId ? (
              <div className="border-t border-outline-variant/10 pt-5">
                {providerSlotsLoading ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-on-surface-variant">
                    <span className="material-symbols-outlined animate-spin text-[24px] text-primary">progress_activity</span>
                    <span>Загрузка расписания…</span>
                  </div>
                ) : providerDays.length === 0 ? (
                  <div className="text-center py-10 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[48px] text-on-surface-variant/20 block mb-2">event_busy</span>
                    <p className="font-bold">Нет свободных дат на 14 дней</p>
                  </div>
                ) : (
                  <div className="grid gap-5 md:grid-cols-5">
                    {/* Список дат */}
                    <div className="md:col-span-2 space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                        Доступные даты
                      </p>
                      {providerDays.map((day, idx) => {
                        const isActive = activeDateIndex === idx;
                        const dObj = new Date(day.date + "T12:00:00");
                        return (
                          <button
                            key={day.date}
                            type="button"
                            onClick={() => setActiveDateIndex(idx)}
                            className={`w-full text-left p-3.5 rounded-xl border text-sm flex justify-between items-center transition-all ${
                              isActive
                                ? "bg-primary/5 border-primary text-primary font-bold"
                                : "bg-surface-container-lowest border-outline-variant/20 text-on-surface hover:border-primary/30"
                            }`}
                          >
                            <div className="flex flex-col">
                              <span className="font-bold">
                                {dObj.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                              </span>
                              <span className="text-xs text-on-surface-variant">
                                {dObj.toLocaleDateString("ru-RU", { weekday: "long" })}
                              </span>
                            </div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isActive ? "bg-primary text-white" : "bg-surface-container text-on-surface-variant"}`}>
                              {day.slots.length}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Слоты */}
                    <div className="md:col-span-3 bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-5">
                      {activeDateIndex !== null && providerDays[activeDateIndex] ? (
                        <div className="space-y-4">
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                            Выберите время
                          </p>
                          <p className="text-base font-black text-on-surface">
                            {new Date(providerDays[activeDateIndex]!.date + "T12:00:00").toLocaleDateString("ru-RU", {
                              day: "numeric",
                              month: "long",
                              weekday: "long",
                            })}
                          </p>
                          <div className="grid grid-cols-3 gap-2.5 max-h-[35vh] overflow-y-auto">
                            {providerDays[activeDateIndex]!.slots.map((slot) => (
                              <button
                                key={slot.starts_at}
                                type="button"
                                disabled={booking}
                                onClick={() => void bookSpecialistSlot(slot.starts_at)}
                                className="py-2.5 rounded-xl border border-outline-variant/30 bg-white hover:border-primary hover:bg-primary/5 font-bold text-sm text-center transition-all disabled:opacity-40 hover:shadow-sm active:scale-95"
                              >
                                {formatTime24(new Date(slot.starts_at))}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant">
                          <span className="material-symbols-outlined text-[32px] text-on-surface-variant/20 mb-2">
                            touch_app
                          </span>
                          <p className="text-sm font-medium">Выберите дату слева</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-on-surface-variant">
                <span className="material-symbols-outlined text-[48px] text-on-surface-variant/20 block mb-2">
                  person_search
                </span>
                <p className="font-bold">Выберите специалиста и услугу</p>
                <p className="text-sm mt-1 max-w-xs mx-auto">
                  Откроется расписание всех свободных дней для записи
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
