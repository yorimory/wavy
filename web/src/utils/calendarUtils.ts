export function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function toLocalInput(iso: string): string {
  // Input: "2026-05-31T13:00:00" -> "2026-05-31T13:00"
  return iso.slice(0, 16);
}

export function parseNaive(s: string): Date {
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!match) return new Date(s);
  return new Date(
    parseInt(match[1]!, 10),
    parseInt(match[2]!, 10) - 1,
    parseInt(match[3]!, 10),
    parseInt(match[4]!, 10),
    parseInt(match[5]!, 10)
  );
}

export function fromLocalInput(s: string): string {
  return s;
}

export const HOUR_HEIGHT = 80;
export const GRID_START_HOUR = 5;
export const GRID_END_HOUR = 22;

/** Варианты времени 05:00–22:00 с шагом 15 мин (24-часовой формат). */
export const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = GRID_START_HOUR; h <= GRID_END_HOUR; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === GRID_END_HOUR && m > 0) break;
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
})();

export function formatHourLabel(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

export function formatTime24(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}
