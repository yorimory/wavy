import { TIME_OPTIONS } from "@/utils/calendarUtils";

const selectCls =
  "rounded-lg border border-outline-variant/50 bg-white px-3 py-2 text-sm font-medium w-full sm:w-auto sm:min-w-[5.5rem]";

export function TimeSelect({
  value,
  onChange,
  disabled,
  placeholder = "—",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <select
      className={`${selectCls} ${className}`}
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

