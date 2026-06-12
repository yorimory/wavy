import { type FormEvent, useEffect, useState, useRef } from "react";
import { apiFetch } from "@/api/client";
import { TimeSelect } from "@/components/ui/TimeSelect";
import type { WorkingHourOut } from "@/types";

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const PRESETS: { label: string; start: string; end: string }[] = [
  { label: "09:00–18:00", start: "09:00", end: "18:00" },
  { label: "10:00–19:00", start: "10:00", end: "19:00" },
  { label: "08:00–17:00", start: "08:00", end: "17:00" },
];

type Row = { weekday: number; start_time: string; end_time: string; enabled: boolean };

function defaultRows(): Row[] {
  return Array.from({ length: 7 }, (_, i) => ({
    weekday: i,
    start_time: i < 5 ? "09:00" : "10:00",
    end_time: i < 5 ? "18:00" : "14:00",
    enabled: i < 5,
  }));
}

export function WorkingHoursModal({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<Row[]>(defaultRows);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // --- Сенсорные жесты для закрытия свайпом вниз ---
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0]!.clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0]!.clientY;
    const deltaY = currentY - touchStartY.current;
    if (deltaY > 0) {
      setDragY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragY > 100) {
      onClose();
    } else {
      setDragY(0);
    }
  };


  useEffect(() => {
    void (async () => {
      try {
        const wh = await apiFetch<WorkingHourOut[]>("/users/me/working-hours");
        if (wh.length === 0) return;
        const map = new Map(wh.map((w) => [w.weekday, w]));
        setRows(
          Array.from({ length: 7 }, (_, i) => {
            const found = map.get(i);
            if (!found) return { weekday: i, start_time: "09:00", end_time: "18:00", enabled: false };
            return {
              weekday: i,
              start_time: found.start_time.slice(0, 5),
              end_time: found.end_time.slice(0, 5),
              enabled: true,
            };
          }),
        );
      } catch {
        /* defaults */
      }
    })();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const payload = rows
        .filter((r) => r.enabled && r.start_time && r.end_time)
        .map((r) => ({ weekday: r.weekday, start_time: r.start_time, end_time: r.end_time }));
      await apiFetch("/users/me/working-hours", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      onClose();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Ошибка сохранения");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 ">
      {/* Background overlay to close */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />

      <div
        className="w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] bg-surface-container-lowest shadow-2xl border-t sm:border border-outline-variant/30 p-5 pb-[calc(env(safe-area-inset-bottom)+36px)] sm:p-8 max-h-[92dvh] sm:max-h-[85dvh] overflow-y-auto animate-[slide-up_0.3s_cubic-bezier(0.16,1,0.3,1)] sm:animate-scale-in"
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: isDragging ? "none" : "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Swipe grab handle container for mobile with larger hit target */}
        <div
          className="w-full h-8 -mt-2 mb-2 flex items-center justify-center block sm:hidden cursor-grab touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-12 h-1.5 bg-outline-variant/30 rounded-full" />
        </div>

        <div className="flex justify-between items-start gap-4 mb-4">
          <div>
            <h3 className="text-xl font-black text-on-surface">Моё рабочее время</h3>
            <p className="text-sm text-on-surface-variant mt-1">Формат 24 ч (05:00–22:00)</p>
          </div>
          <button type="button" className="text-on-surface-variant w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className="text-xs font-bold px-3 py-1.5 rounded-full border border-outline-variant/40 hover:border-primary hover:text-primary transition-all"
              onClick={() =>
                setRows((prev) =>
                  prev.map((r) => (r.enabled ? { ...r, start_time: p.start, end_time: p.end } : r)),
                )
              }
            >
              {p.label}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="space-y-2.5">
          {rows.map((row, idx) => (
            <div
              key={row.weekday}
              className={`grid grid-cols-[64px_1fr_12px_1fr] sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border ${row.enabled ? "border-primary/20 bg-primary-container/5" : "border-outline-variant/30 opacity-60"}`}
            >
              <label className="flex items-center gap-2 w-auto sm:min-w-[72px] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...row, enabled: e.target.checked };
                    setRows(next);
                  }}
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
                <span className="font-bold text-sm text-on-surface">{DAY_NAMES[row.weekday]}</span>
              </label>
              <TimeSelect
                value={row.start_time}
                disabled={!row.enabled}
                onChange={(v) => {
                  const next = [...rows];
                  next[idx] = { ...row, start_time: v };
                  setRows(next);
                }}
              />
              <span className="text-on-surface-variant text-sm text-center font-bold">—</span>
              <TimeSelect
                value={row.end_time}
                disabled={!row.enabled}
                onChange={(v) => {
                  const next = [...rows];
                  next[idx] = { ...row, end_time: v };
                  setRows(next);
                }}
              />
            </div>
          ))}
          {err && <p className="text-error text-sm font-medium">{err}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" className="flex-1 px-5 py-4 rounded-2xl border border-outline-variant font-bold hover:bg-surface-container transition-colors text-sm active:scale-[0.98]" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" disabled={busy} className="flex-1 px-6 py-4 rounded-2xl primary-gradient text-white font-bold disabled:opacity-60 hover:opacity-95 transition-all text-sm active:scale-[0.98]">
              {busy ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
