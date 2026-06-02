import { TIME_OPTIONS } from "@/utils/calendarUtils";

const selectCls =
  "rounded-lg border border-outline-variant/50 bg-white px-3 py-2 text-sm font-medium min-w-[5.5rem]";

export function TimeSelect({
  value,
  onChange,
  disabled,
  placeholder = "—",
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <select
      className={selectCls}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {TIME_OPTIONS.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}
