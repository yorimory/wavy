import { type FormEvent, useEffect, useState } from "react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] bg-surface-container-lowest shadow-2xl border border-outline-variant/30 p-6 md:p-8 max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-start gap-4 mb-4">
          <div>
            <h3 className="text-xl font-black text-on-surface">Моё рабочее время</h3>
            <p className="text-sm text-on-surface-variant mt-1">Формат 24 ч (05:00–22:00)</p>
          </div>
          <button type="button" className="text-on-surface-variant" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className="text-xs font-bold px-3 py-1.5 rounded-full border border-outline-variant/40 hover:border-primary hover:text-primary"
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

        <form onSubmit={onSubmit} className="space-y-3">
          {rows.map((row, idx) => (
            <div
              key={row.weekday}
              className={`flex flex-wrap items-center gap-3 p-3 rounded-xl border ${row.enabled ? "border-primary/20 bg-primary-container/5" : "border-outline-variant/30 opacity-70"}`}
            >
              <label className="flex items-center gap-2 min-w-[72px]">
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...row, enabled: e.target.checked };
                    setRows(next);
                  }}
                />
                <span className="font-bold text-sm">{DAY_NAMES[row.weekday]}</span>
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
              <span className="text-on-surface-variant text-sm">—</span>
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
            <button type="button" className="px-5 py-3 rounded-xl border border-outline-variant font-bold" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" disabled={busy} className="px-6 py-3 rounded-xl primary-gradient text-white font-bold disabled:opacity-60">
              {busy ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
