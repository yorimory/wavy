import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { AppointmentModal } from "@/components/AppointmentModal";
import { WorkingHoursModal } from "@/components/WorkingHoursModal";
import {
  addDays,
  formatHourLabel,
  isSameDay,
  startOfWeek,
  parseNaive,
} from "@/utils/calendarUtils";
import type { AppointmentOut, ClientOut, ServiceOut, WorkingHourOut } from "@/types";

const WEEKDAY_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const EVENT_PALETTE = [
  { bg: "bg-secondary-container/50", border: "border-secondary", label: "text-secondary", accent: false },
  { bg: "bg-tertiary-container/30", border: "border-tertiary", label: "text-tertiary", accent: false },
  { bg: "bg-primary-container", border: "border-primary", label: "text-on-primary-container", accent: true },
];

function clientName(clients: ClientOut[], clientId: number | null): string {
  if (!clientId) return "";
  return clients.find((c) => c.id === clientId)?.full_name ?? "";
}

function apptOverlapsHour(appt: AppointmentOut, day: Date, hour: number): boolean {
  const s = parseNaive(appt.starts_at);
  const e = parseNaive(appt.ends_at);
  
  const hourStart = new Date(day);
  hourStart.setHours(hour, 0, 0, 0);
  
  const hourEnd = new Date(day);
  hourEnd.setHours(hour + 1, 0, 0, 0);
  
  return s < hourEnd && e > hourStart;
}

export function PrivatePersonCalendar() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [anchor, setAnchor] = useState(() => new Date());
  const [view, setView] = useState<"week" | "day">(() => {
    return window.innerWidth < 768 ? "day" : "week";
  });
  const [appts, setAppts] = useState<AppointmentOut[]>([]);
  const [clients, setClients] = useState<ClientOut[]>([]);
  const [services, setServices] = useState<ServiceOut[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHourOut[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [whOpen, setWhOpen] = useState(false);
  const [modal, setModal] = useState<null | { mode: "create"; start?: Date } | { mode: "edit"; appt: AppointmentOut }>(null);

  const today = useMemo(() => new Date(), []);
  const weekStart = useMemo(() => startOfWeek(anchor), [anchor]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const displayDays = view === "day" ? [new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())] : weekDays;
  const colCount = displayDays.length;

  const hours = useMemo(() => {
    let minStart = 8;
    let maxEnd = 19;
    
    if (workingHours.length > 0) {
      let whMin = 24;
      let whMax = 0;
      let hasWorkingDays = false;
      for (const wh of workingHours) {
        const startH = parseInt(wh.start_time.slice(0, 2), 10);
        const endH = parseInt(wh.end_time.slice(0, 2), 10);
        if (startH < whMin) whMin = startH;
        if (endH > whMax) whMax = endH;
        hasWorkingDays = true;
      }
      if (hasWorkingDays && whMin < whMax) {
        minStart = Math.max(0, whMin - 1);
        maxEnd = Math.min(24, whMax + 1);
      }
    }
    
    // Проверяем, чтобы существующие записи (Appointments) не пропадали, если они вне рабочих часов
    if (appts.length > 0) {
      for (const appt of appts) {
        const s = parseNaive(appt.starts_at);
        const e = parseNaive(appt.ends_at);
        
        // Проверяем, пересекается ли запись с отображаемым диапазоном дней
        const isVisible = displayDays.some(day => isSameDay(s, day));
        if (isVisible) {
          const startH = s.getHours();
          const endH = Math.ceil(e.getHours() || 24);
          if (startH < minStart) minStart = startH;
          if (endH > maxEnd) maxEnd = endH;
        }
      }
    }
    
    minStart = Math.max(0, minStart);
    maxEnd = Math.min(24, maxEnd);
    
    return Array.from({ length: maxEnd - minStart }, (_, i) => minStart + i);
  }, [workingHours, appts, displayDays]);

  async function reload() {
    setErr(null);
    try {
      const [a, c, wh, svcs] = await Promise.all([
        apiFetch<AppointmentOut[]>("/appointments"),
        apiFetch<ClientOut[]>("/clients").catch(() => [] as ClientOut[]),
        apiFetch<WorkingHourOut[]>("/users/me/working-hours").catch(() => [] as WorkingHourOut[]),
        apiFetch<ServiceOut[]>("/services").catch(() => [] as ServiceOut[]),
      ]);
      setAppts(a);
      setClients(c);
      setWorkingHours(wh);
      setServices(svcs);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  useEffect(() => {
    if (searchParams.get("new") === "1") setModal({ mode: "create" });
    const editId = searchParams.get("edit");
    if (editId && appts.length) {
      const found = appts.find((a) => String(a.id) === editId);
      if (found) setModal({ mode: "edit", appt: found });
    }
  }, [searchParams, appts]);

  const visibleAppts = useMemo(() => {
    const rangeStart = view === "day" ? displayDays[0]! : weekStart;
    const rangeEnd = addDays(rangeStart, view === "day" ? 1 : 7);
    return appts.filter((a) => {
      const t = parseNaive(a.starts_at);
      return t >= rangeStart && t < rangeEnd;
    });
  }, [appts, weekStart, view, displayDays]);

  function closeModal() {
    setModal(null);
    setSearchParams({});
  }

  function isWeekend(day: Date) {
    const d = day.getDay();
    return d === 0 || d === 6;
  }

  function isWorkingCell(day: Date, hour: number): boolean {
    if (workingHours.length === 0) return !isWeekend(day);
    const wd = (day.getDay() + 6) % 7;
    const wh = workingHours.find((w) => w.weekday === wd);
    if (!wh) return false;
    const startH = parseInt(wh.start_time.slice(0, 2), 10);
    const endH = parseInt(wh.end_time.slice(0, 2), 10);
    return hour >= startH && hour < endH;
  }

  function getCellAppt(day: Date, hour: number): AppointmentOut | undefined {
    return visibleAppts.find((a) => apptOverlapsHour(a, day, hour));
  }

  function paletteFor(appt: AppointmentOut, idx: number) {
    if (appt.status === "cancelled") {
      return { bg: "bg-on-surface/5", border: "border-on-surface/30", label: "text-on-surface-variant italic", accent: false };
    }
    return EVENT_PALETTE[idx % EVENT_PALETTE.length]!;
  }

  const monthLabel = weekStart.toLocaleDateString("ru-RU", { month: "long" }).toUpperCase();

  return (
    <div className="flex flex-col min-h-full bg-surface -m-6 md:-m-10 lg:-m-10">
      <header className="hidden md:flex justify-between items-center w-full px-8 lg:px-12 py-6 bg-surface sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-6">
          <h2 className="text-2xl font-extrabold text-on-surface tracking-tight">Календарь</h2>
          <div className="flex bg-surface-container rounded-full p-1 border border-outline-variant/20">
            <button
              type="button"
              onClick={() => setView("day")}
              className={`px-6 py-1.5 text-sm rounded-full transition-colors ${view === "day" ? "font-bold bg-surface-container-lowest shadow-sm text-primary" : "font-medium text-on-surface-variant hover:text-on-surface"}`}
            >
              День
            </button>
            <button
              type="button"
              onClick={() => setView("week")}
              className={`px-6 py-1.5 text-sm rounded-full transition-colors ${view === "week" ? "font-bold bg-surface-container-lowest shadow-sm text-primary" : "font-medium text-on-surface-variant hover:text-on-surface"}`}
            >
              Неделя
            </button>
          </div>
          <div className="flex bg-surface-container rounded-full p-0.5 border border-outline-variant/20 items-center">
            <button
              type="button"
              onClick={() => setAnchor(addDays(anchor, view === "week" ? -7 : -1))}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-lowest text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button
              type="button"
              onClick={() => setAnchor(new Date())}
              className="px-3 py-1 text-xs font-bold rounded-full hover:bg-surface-container-lowest text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Сегодня
            </button>
            <button
              type="button"
              onClick={() => setAnchor(addDays(anchor, view === "week" ? 7 : 1))}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-lowest text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-outline-variant text-sm font-semibold hover:bg-surface-container transition-all"
            onClick={() => setWhOpen(true)}
          >
            <span className="material-symbols-outlined text-[18px]">schedule</span>
            Моё рабочее время
          </button>
          <div className="flex items-center gap-3 ml-2">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20 bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm">
              {(user?.full_name || user?.email || "?").charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <header className="md:hidden flex flex-col gap-2.5 px-4 py-3 bg-surface border-b border-outline-variant/20">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-on-surface tracking-tight">Календарь</h2>
          <div className="flex bg-surface-container rounded-full p-0.5 border border-outline-variant/20">
            <button
              type="button"
              onClick={() => setView("day")}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${view === "day" ? "bg-white text-primary font-bold shadow-sm" : "text-on-surface-variant font-medium"}`}
            >
              День
            </button>
            <button
              type="button"
              onClick={() => setView("week")}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${view === "week" ? "bg-white text-primary font-bold shadow-sm" : "text-on-surface-variant font-medium"}`}
            >
              Неделя
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex bg-surface-container rounded-full p-0.5 border border-outline-variant/20 items-center">
            <button
              type="button"
              onClick={() => setAnchor(addDays(anchor, view === "week" ? -7 : -1))}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-lowest text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button
              type="button"
              onClick={() => setAnchor(new Date())}
              className="px-2.5 py-1 text-xs font-bold rounded-full hover:bg-surface-container-lowest text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Сегодня
            </button>
            <button
              type="button"
              onClick={() => setAnchor(addDays(anchor, view === "week" ? 7 : 1))}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-lowest text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
          <button
            type="button"
            className="text-xs font-bold px-3 py-2 border border-outline-variant rounded-full text-on-surface-variant bg-white hover:bg-surface-container transition-all flex items-center gap-1.5"
            onClick={() => setWhOpen(true)}
          >
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            Рабочее время
          </button>
        </div>
      </header>

      {err && <p className="text-error font-medium px-8">{err}</p>}

      <section className="flex-1 px-4 md:px-8 lg:px-12 pb-12 min-h-0 flex flex-col">
        <div className="bg-surface-container-lowest rounded-[32px] shadow-[0px_4px_20px_rgba(0,0,0,0.04)] overflow-hidden border border-outline-variant/10 flex flex-col flex-1 min-h-[480px]">
          <div className="overflow-x-auto no-scrollbar flex-1 flex flex-col">
            <div className={`${view === "week" ? "min-w-[700px] md:min-w-0" : "w-full"} flex flex-col flex-1`}>
              
              {/* Header Grid */}
              <div
                className="calendar-grid border-b border-outline-variant/30"
                style={colCount !== 7 ? { gridTemplateColumns: `80px repeat(${colCount}, minmax(0, 1fr))` } : undefined}
              >
                <div className="p-4 flex flex-col items-center justify-center border-r border-outline-variant/30 sticky left-0 z-20 bg-surface-container-lowest">
                  <span className="text-xs font-bold text-on-surface-variant">{monthLabel}</span>
                  <span className="text-xl font-black text-primary">{weekStart.getFullYear()}</span>
                </div>
                {displayDays.map((day, i) => {
                  const isToday = isSameDay(day, today);
                  const weekend = isWeekend(day);
                  const wdLabel = view === "week" ? WEEKDAY_SHORT[i] : day.toLocaleDateString("ru-RU", { weekday: "short" });
                  return (
                    <div
                      key={day.toISOString()}
                      className={[
                        "p-4 flex flex-col items-center justify-center border-r border-outline-variant/20 last:border-r-0",
                        isToday ? "bg-primary-container/10" : weekend ? "bg-surface-container" : i === 0 && view === "week" ? "bg-surface-container-low/30" : "",
                      ].join(" ")}
                    >
                      <span className={`text-xs font-medium ${isToday ? "text-primary font-bold" : weekend ? "text-error/60" : "text-on-surface-variant"}`}>
                        {wdLabel}
                      </span>
                      <span className={`text-lg font-bold ${isToday ? "text-primary font-extrabold" : weekend ? "text-error/60" : ""}`}>
                        {day.getDate()}
                      </span>
                      {isToday && <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1" />}
                    </div>
                  );
                })}
              </div>

              {/* Body Scrollable Grid */}
              <div className="flex-1 overflow-y-auto min-h-0">
                <div
                  className="calendar-grid"
                  style={colCount !== 7 ? { gridTemplateColumns: `80px repeat(${colCount}, minmax(0, 1fr))` } : undefined}
                >
                  {hours.flatMap((hour) => [
                    <div
                      key={`time-${hour}`}
                      className="h-14 flex items-start justify-center pt-2 text-[11px] font-bold text-on-surface-variant/50 border-r border-outline-variant/30 sticky left-0 z-10 bg-surface-container-lowest"
                    >
                      {formatHourLabel(hour)}
                    </div>,
                    ...displayDays.map((day) => {
                      const isToday = isSameDay(day, today);
                      const weekend = isWeekend(day);
                      const working = isWorkingCell(day, hour);
                      const cellAppt = getCellAppt(day, hour);
                      const apptIdx = cellAppt ? visibleAppts.indexOf(cellAppt) : -1;
                      const pal = cellAppt ? paletteFor(cellAppt, apptIdx) : null;
                      const name = cellAppt ? clientName(clients, cellAppt.client_id) : "";

                      let cellPadding = "p-2";
                      let roundedClass = "rounded-lg";
                      let isStart = true;
                      
                      if (cellAppt) {
                        const s = parseNaive(cellAppt.starts_at);
                        const e = parseNaive(cellAppt.ends_at);
                        const cellStart = new Date(day);
                        cellStart.setHours(hour, 0, 0, 0);
                        const cellEnd = new Date(day);
                        cellEnd.setHours(hour + 1, 0, 0, 0);
                        
                        isStart = s >= cellStart && s < cellEnd;
                        const isEnd = e > cellStart && e <= cellEnd;
                        
                        if (isStart && isEnd) {
                          cellPadding = "px-2 py-1";
                          roundedClass = "rounded-lg";
                        } else if (isStart) {
                          cellPadding = "px-2 pt-1 pb-0";
                          roundedClass = "rounded-t-lg border-b-0";
                        } else if (isEnd) {
                          cellPadding = "px-2 pt-0 pb-1";
                          roundedClass = "rounded-b-lg border-t-0";
                        } else {
                          cellPadding = "px-2 py-0";
                          roundedClass = "rounded-none border-y-0";
                        }
                      }

                      return (
                        <div
                          key={`${day.toISOString()}-${hour}`}
                          role="button"
                          tabIndex={0}
                          className={[
                            "h-14 border-b border-outline-variant/20 border-r last:border-r-0 transition-colors",
                            cellAppt ? `bg-surface-variant/40 flex flex-col ${cellPadding}` : "group flex items-center justify-center cursor-pointer",
                            !cellAppt && working && "hover:bg-primary-container/5",
                            !cellAppt && !working && (weekend ? "bg-surface-container/50" : ""),
                            !cellAppt && isToday && working && "bg-primary-container/5",
                          ].join(" ")}
                          onClick={() => {
                            if (cellAppt) {
                              setModal({ mode: "edit", appt: cellAppt });
                              setSearchParams({ edit: String(cellAppt.id) });
                            } else {
                              const start = new Date(day);
                              start.setHours(hour, 0, 0, 0);
                              setModal({ mode: "create", start });
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              const start = new Date(day);
                              start.setHours(hour, 0, 0, 0);
                              if (cellAppt) {
                                setModal({ mode: "edit", appt: cellAppt });
                              } else {
                                setModal({ mode: "create", start });
                              }
                            }
                          }}
                        >
                          {cellAppt && pal ? (
                            <div
                              className={`h-full ${pal.bg} border-l-4 ${pal.border} ${roundedClass} p-2 flex flex-col justify-center ${pal.accent ? "shadow-lg" : ""}`}
                            >
                              {isStart ? (
                                <>
                                  <span className={`text-[10px] font-bold uppercase tracking-tight truncate ${pal.label}`}>
                                    {cellAppt.title}
                                  </span>
                                  {name ? (
                                    <span className={`text-xs font-bold truncate ${pal.accent ? "text-white" : "text-on-surface"}`}>
                                      {name}
                                    </span>
                                  ) : null}
                                </>
                              ) : null}
                            </div>
                          ) : (
                            <span className="opacity-0 group-hover:opacity-100 material-symbols-outlined text-primary/40">
                              add_circle
                            </span>
                          )}
                        </div>
                      );
                    }),
                  ])}
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      <button
        type="button"
        className="fixed bottom-8 right-8 w-16 h-16 bg-primary text-white rounded-[24px] shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-30"
        onClick={() => {
          setModal({ mode: "create" });
          setSearchParams({ new: "1" });
        }}
      >
        <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          add
        </span>
      </button>

      {whOpen && <WorkingHoursModal onClose={() => { setWhOpen(false); void reload(); }} />}
      {modal && (
        <AppointmentModal
          mode={modal.mode}
          appt={modal.mode === "edit" ? modal.appt : undefined}
          defaultStart={modal.mode === "create" ? modal.start : undefined}
          services={services}
          clients={clients}
          onClose={closeModal}
          onSaved={async () => {
            await reload();
            closeModal();
          }}
        />
      )}
    </div>
  );
}
