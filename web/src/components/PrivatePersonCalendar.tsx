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

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const EVENT_PALETTE = [
  { bg: "bg-secondary-container/50", border: "border-secondary", label: "text-secondary", accent: false },
  { bg: "bg-tertiary-container/30", border: "border-tertiary", label: "text-tertiary", accent: false },
  { bg: "bg-primary-container", border: "border-primary", label: "text-on-primary-container", accent: true },
];

function clientName(clients: ClientOut[], clientId: number | null): string {
  if (!clientId) return "";
  return clients.find((c) => c.id === clientId)?.full_name ?? "";
}

function apptStartsInHour(appt: AppointmentOut, day: Date, hour: number): boolean {
  const s = parseNaive(appt.starts_at);
  return isSameDay(s, day) && s.getHours() === hour;
}

export function PrivatePersonCalendar() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [anchor, setAnchor] = useState(() => new Date());
  const [view, setView] = useState<"week" | "day">("week");
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
    if (workingHours.length === 0) {
      return Array.from({ length: 12 }, (_, i) => 8 + i);
    }
    let minStart = 24;
    let maxEnd = 0;
    let hasWorkingDays = false;
    for (const wh of workingHours) {
      const startH = parseInt(wh.start_time.slice(0, 2), 10);
      const endH = parseInt(wh.end_time.slice(0, 2), 10);
      if (startH < minStart) minStart = startH;
      if (endH > maxEnd) maxEnd = endH;
      hasWorkingDays = true;
    }
    if (!hasWorkingDays || minStart >= maxEnd) {
      return Array.from({ length: 12 }, (_, i) => 8 + i);
    }
    const startHour = Math.max(0, minStart - 1);
    const endHour = Math.min(24, maxEnd + 1);
    return Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  }, [workingHours]);

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
    return visibleAppts.find((a) => apptStartsInHour(a, day, hour));
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
            <button type="button" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant">search</span>
            </button>
            <button type="button" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors relative">
              <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-error rounded-full border-2 border-surface" />
            </button>
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20 bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm">
              {(user?.full_name || user?.email || "?").charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <header className="md:hidden flex flex-col gap-3 px-4 py-4 bg-surface border-b border-outline-variant/20 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Календарь</h2>
          <div className="flex bg-surface-container rounded-full p-1 border border-outline-variant/20">
            <button type="button" onClick={() => setView("day")} className={`px-4 py-1 text-xs rounded-full ${view === "day" ? "bg-white text-primary font-bold shadow-sm" : ""}`}>
              День
            </button>
            <button type="button" onClick={() => setView("week")} className={`px-4 py-1 text-xs rounded-full ${view === "week" ? "bg-white text-primary font-bold shadow-sm" : ""}`}>
              Неделя
            </button>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button type="button" className="text-sm font-bold px-3 py-1.5 border rounded-lg" onClick={() => setAnchor(addDays(anchor, view === "week" ? -7 : -1))}>
            ←
          </button>
          <button type="button" className="text-sm font-bold px-3 py-1.5 border rounded-lg" onClick={() => setAnchor(new Date())}>
            Сегодня
          </button>
          <button type="button" className="text-sm font-bold px-3 py-1.5 border rounded-lg" onClick={() => setAnchor(addDays(anchor, view === "week" ? 7 : 1))}>
            →
          </button>
          <button type="button" className="text-sm font-semibold px-3 py-1.5 border rounded-full ml-auto" onClick={() => setWhOpen(true)}>
            Рабочее время
          </button>
        </div>
      </header>

      {err && <p className="text-error font-medium px-8">{err}</p>}

      <section className="flex-1 px-4 md:px-8 lg:px-12 pb-12 min-h-0 flex flex-col">
        <div className="bg-surface-container-lowest rounded-[32px] shadow-[0px_4px_20px_rgba(0,0,0,0.04)] overflow-hidden border border-outline-variant/10 flex flex-col flex-1 min-h-[480px]">
          <div
            className="calendar-grid border-b border-outline-variant/30"
            style={colCount !== 7 ? { gridTemplateColumns: `80px repeat(${colCount}, minmax(0, 1fr))` } : undefined}
          >
            <div className="p-4 flex flex-col items-center justify-center border-r border-outline-variant/30">
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

          <div className="flex-1 overflow-y-auto min-h-0">
            <div
              className="calendar-grid"
              style={colCount !== 7 ? { gridTemplateColumns: `80px repeat(${colCount}, minmax(0, 1fr))` } : undefined}
            >
              {hours.flatMap((hour) => [
                <div
                  key={`time-${hour}`}
                  className="h-14 flex items-start justify-center pt-2 text-[11px] font-bold text-on-surface-variant/50 border-r border-outline-variant/30"
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

                  return (
                    <div
                      key={`${day.toISOString()}-${hour}`}
                      role="button"
                      tabIndex={0}
                      className={[
                        "h-14 border-b border-outline-variant/20 border-r last:border-r-0 transition-colors",
                        cellAppt ? "bg-surface-variant/40 flex flex-col p-2" : "group flex items-center justify-center cursor-pointer",
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
                          className={`h-full ${pal.bg} border-l-4 ${pal.border} rounded-lg p-2 flex flex-col justify-center ${pal.accent ? "shadow-lg" : ""}`}
                        >
                          <span className={`text-[10px] font-bold uppercase tracking-tight truncate ${pal.label}`}>
                            {cellAppt.title}
                          </span>
                          {name ? (
                            <span className={`text-xs font-bold truncate ${pal.accent ? "text-white" : "text-on-surface"}`}>
                              {name}
                            </span>
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
