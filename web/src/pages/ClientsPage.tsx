import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "@/api/client";
import type { ClientOut } from "@/types";

/* ─── Avatar initials ─── */
function ClientAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Deterministic colour from name
  const hue = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  return (
    <div
      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-base shrink-0 shadow-sm"
      style={{ background: `linear-gradient(135deg, hsl(${hue},60%,50%), hsl(${(hue + 40) % 360},70%,45%))` }}
    >
      {initials}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card flex items-center gap-4 p-4">
      <div className="skeleton w-12 h-12 rounded-2xl shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-32 rounded-lg" />
        <div className="skeleton h-3 w-48 rounded-lg" />
      </div>
    </div>
  );
}

export function ClientsPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<ClientOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function reload(query: string) {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams({ booked_only: "true" });
      if (query.trim()) params.set("q", query.trim());
      const data = await apiFetch<ClientOut[]>(`/clients?${params}`);
      setItems(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => void reload(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-on-surface tracking-tight">Клиенты</h2>
          <p className="text-on-surface-variant mt-1 text-sm">
            {loading ? "Загрузка…" : `${items.length} клиентов, записавшихся через сервис`}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/50 text-[20px]">
          search
        </span>
        <input
          className="input-field pl-12"
          placeholder="Поиск по имени или телефону…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 hover:text-on-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {/* Error */}
      {err && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-error/6 border border-error/15 text-error text-sm font-semibold">
          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
          {err}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => <SkeletonCard key={n} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <span className="material-symbols-outlined text-[52px] text-on-surface-variant/20 block">group_off</span>
          <p className="font-bold text-on-surface-variant">
            {q ? "Клиентов не найдено" : "Пока нет клиентов"}
          </p>
          <p className="text-sm text-on-surface-variant/60 max-w-xs mx-auto">
            {q
              ? "Попробуйте изменить запрос"
              : "Клиенты появятся когда кто-то запишется к вам через поиск услуг"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((c) => (
            <Link
              key={c.id}
              to={`/clients/${c.id}`}
              className="card-hover flex items-center gap-4 p-4 group"
            >
              <ClientAvatar name={c.full_name} />

              <div className="flex-1 min-w-0">
                <p className="font-bold text-on-surface text-base truncate">{c.full_name}</p>
                <p className="text-sm text-on-surface-variant truncate mt-0.5">
                  {[c.phone, c.email].filter(Boolean).join(" · ") || "Без контактов"}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {c.last_visit_at && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/6 px-2 py-0.5 rounded-full">
                      <span className="material-symbols-outlined text-[11px]">history</span>
                      {new Date(c.last_visit_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  )}
                  {c.tags.map((tag) => (
                    <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-secondary-container/60 text-on-secondary-container font-bold">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <span className="material-symbols-outlined text-on-surface-variant/30 group-hover:text-primary transition-colors">
                chevron_right
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
