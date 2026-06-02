import { type FormEvent, useState } from "react";
import { apiFetch } from "@/api/client";
import { TimeSelect } from "@/components/ui/TimeSelect";

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

interface WelcomeWizardModalProps {
  onCompleted: () => void;
}

export function WelcomeWizardModal({ onCompleted }: WelcomeWizardModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // --- Шаг 1: Основная услуга ---
  const [serviceTitle, setServiceTitle] = useState("");
  const [duration, setDuration] = useState("60");
  const [price, setPrice] = useState("");

  // --- Шаг 2: Расписание ---
  const [scheduleType, setScheduleType] = useState<"standard" | "everyday" | "custom">("standard");
  const [customDays, setCustomDays] = useState(() =>
    Array.from({ length: 7 }, (_, i) => ({
      weekday: i,
      start_time: "09:00",
      end_time: "18:00",
      enabled: i < 5, // Пн-Пт по умолчанию
    })),
  );

  function handleToggleDay(idx: number) {
    setCustomDays((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, enabled: !d.enabled } : d)),
    );
  }

  function handleDayTimeChange(idx: number, field: "start_time" | "end_time", value: string) {
    setCustomDays((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)),
    );
  }

  async function handleFinish(e: FormEvent) {
    e.preventDefault();
    if (step === 1) {
      if (!serviceTitle.trim()) {
        setErr("Пожалуйста, введите название вашей первой услуги");
        return;
      }
      setErr(null);
      setStep(2);
      return;
    }

    setBusy(true);
    setErr(null);

    // Подготовка расписания
    let whPayload: { weekday: number; start_time: string; end_time: string }[] = [];
    if (scheduleType === "standard") {
      // Пн-Пт 09:00–18:00
      whPayload = Array.from({ length: 5 }, (_, i) => ({
        weekday: i,
        start_time: "09:00",
        end_time: "18:00",
      }));
    } else if (scheduleType === "everyday") {
      // Каждый день 10:00–19:00
      whPayload = Array.from({ length: 7 }, (_, i) => ({
        weekday: i,
        start_time: "10:00",
        end_time: "19:00",
      }));
    } else {
      // Свой вариант
      whPayload = customDays
        .filter((d) => d.enabled)
        .map((d) => ({
          weekday: d.weekday,
          start_time: d.start_time,
          end_time: d.end_time,
        }));
      if (whPayload.length === 0) {
        setErr("Пожалуйста, выберите хотя бы один рабочий день");
        setBusy(false);
        return;
      }
    }

    try {
      // 1. Сохраняем рабочие часы
      await apiFetch("/users/me/working-hours", {
        method: "PUT",
        body: JSON.stringify(whPayload),
      });

      // 2. Создаем первую услугу
      await apiFetch("/services", {
        method: "POST",
        body: JSON.stringify({
          title: serviceTitle.trim(),
          description: "Ваша первая услуга, созданная при первоначальной настройке",
          duration_minutes: Number(duration) || 60,
          price: price.trim() ? Number(price) : null,
          is_active: true,
          image_url: null,
          category: "Другое",
        }),
      });

      onCompleted();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Произошла ошибка при настройке");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-2xl border border-outline-variant/60 bg-surface-container-low px-4 py-3.5 outline-none focus:ring-2 focus:ring-primary/30 text-on-surface transition-all placeholder:text-on-surface-variant/40";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div
        className="w-full max-w-xl rounded-[32px] bg-surface-container-lowest shadow-2xl border border-outline-variant/20 p-6 md:p-10 max-h-[90dvh] overflow-y-auto"
        style={{ animation: "scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both" }}
      >
        {/* Шапка приветствия */}
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl primary-gradient items-center justify-center text-white mb-3 shadow-glow-sm">
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          </div>
          <h3 className="text-2xl font-black text-on-surface tracking-tight">
            Добро пожаловать в Wavy CRM!
          </h3>
          <p className="text-sm text-on-surface-variant mt-1.5 max-w-sm mx-auto">
            Давайте настроим ваш профиль за пару простых шагов, чтобы вы могли сразу начать работу.
          </p>

          {/* Индикатор шагов */}
          <div className="flex items-center justify-center gap-2 mt-5">
            <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 1 ? "w-8 bg-primary" : "w-1.5 bg-outline-variant/40"}`} />
            <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 2 ? "w-8 bg-primary" : "w-1.5 bg-outline-variant/40"}`} />
          </div>
        </div>

        <form onSubmit={handleFinish} className="space-y-6">
          {step === 1 ? (
            <div className="space-y-5" style={{ animation: "fadeIn 0.2s ease" }}>
              <div className="border-b border-outline-variant/10 pb-2">
                <h4 className="font-extrabold text-on-surface text-base">Шаг 1: Ваша первая услуга</h4>
                <p className="text-xs text-on-surface-variant mt-0.5">Добавьте услугу, на которую клиенты смогут записываться.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                  Название услуги <span className="text-error">*</span>
                </label>
                <input
                  className={inputClass}
                  value={serviceTitle}
                  onChange={(e) => setServiceTitle(e.target.value)}
                  placeholder="Например: Мужская стрижка, Маникюр, Массаж спины"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                    Длительность
                  </label>
                  <select
                    className={inputClass}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  >
                    <option value="30">30 минут</option>
                    <option value="45">45 минут</option>
                    <option value="60">1 час</option>
                    <option value="90">1.5 часа</option>
                    <option value="120">2 часа</option>
                    <option value="180">3 часа</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                    Стоимость (BYN)
                  </label>
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    step={0.5}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="необязательно"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5" style={{ animation: "fadeIn 0.2s ease" }}>
              <div className="border-b border-outline-variant/10 pb-2">
                <h4 className="font-extrabold text-on-surface text-base">Шаг 2: График работы</h4>
                <p className="text-xs text-on-surface-variant mt-0.5">Укажите, в какие дни и часы вы принимаете клиентов.</p>
              </div>

              {/* Выбор пресетов графика */}
              <div className="grid grid-cols-3 gap-3">
                {(["standard", "everyday", "custom"] as const).map((type) => {
                  const titles = {
                    standard: "Будни (5/2)",
                    everyday: "Каждый день",
                    custom: "Свой вариант",
                  };
                  const subtext = {
                    standard: "Пн-Пт 9:00-18:00",
                    everyday: "Пн-Вс 10:00-19:00",
                    custom: "Настройка по дням",
                  };
                  const active = scheduleType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setScheduleType(type)}
                      className={`p-3.5 rounded-2xl border-2 font-bold transition-all text-center flex flex-col items-center justify-center gap-1 min-h-[82px] ${
                        active
                          ? "border-primary bg-primary/5 text-primary shadow-sm"
                          : "border-outline-variant/40 bg-white/60 text-on-surface hover:border-primary/30"
                      }`}
                    >
                      <span className="text-xs">{titles[type]}</span>
                      <span className="text-[10px] text-on-surface-variant/75 font-medium leading-tight">
                        {subtext[type]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Детальная настройка (если выбран Свой вариант) */}
              {scheduleType === "custom" && (
                <div className="space-y-2 border border-outline-variant/25 rounded-2xl p-4 bg-surface-container-lowest max-h-[30vh] overflow-y-auto">
                  {customDays.map((d, idx) => (
                    <div
                      key={d.weekday}
                      className={`flex items-center justify-between py-1.5 border-b border-outline-variant/10 last:border-b-0 ${
                        !d.enabled ? "opacity-50" : ""
                      }`}
                    >
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-on-surface">
                        <input
                          type="checkbox"
                          checked={d.enabled}
                          onChange={() => handleToggleDay(idx)}
                          className="w-4 h-4 rounded text-primary focus:ring-primary"
                        />
                        {DAY_NAMES[idx]}
                      </label>
                      {d.enabled && (
                        <div className="flex items-center gap-1.5 shrink-0 scale-90 origin-right">
                          <TimeSelect
                            value={d.start_time}
                            onChange={(val) => handleDayTimeChange(idx, "start_time", val)}
                          />
                          <span className="text-on-surface-variant/40 text-xs">—</span>
                          <TimeSelect
                            value={d.end_time}
                            onChange={(val) => handleDayTimeChange(idx, "end_time", val)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {err && (
            <p className="text-error text-sm font-semibold bg-error/5 p-3.5 rounded-2xl border border-error/10">
              {err}
            </p>
          )}

          <div className="flex gap-3 pt-3 border-t border-outline-variant/10">
            {step === 2 && (
              <button
                type="button"
                className="flex-1 py-4 rounded-2xl border font-bold hover:bg-surface-container text-sm transition-colors"
                onClick={() => setStep(1)}
                disabled={busy}
              >
                Назад
              </button>
            )}
            <button
              type="submit"
              disabled={busy}
              className="flex-[2] py-4 rounded-2xl primary-gradient text-white font-bold text-sm hover:opacity-95 disabled:opacity-60 transition-all shadow-glow active:scale-[0.98]"
            >
              {busy ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                  Сохранение…
                </span>
              ) : step === 1 ? (
                "Продолжить"
              ) : (
                "Начать работу с Wavy CRM"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
