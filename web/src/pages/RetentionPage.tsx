import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "@/api/client";
import type { RetentionItemOut } from "@/types";

export function RetentionPage() {
  const [items, setItems] = useState<RetentionItemOut[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setErr(null);
      setItems(null);
      try {
        const data = await apiFetch<RetentionItemOut[]>("/recommendations/retention");
        if (alive) setItems(data);
      } catch (e) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : "Ошибка");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const isPaywall = err && (/premium/i.test(err) || /тариф/i.test(err));

  return (
    <div>
      <h2 className="text-3xl font-black text-on-surface tracking-tight mb-2">Smart Retention</h2>
      <p className="text-on-surface-variant mb-8 max-w-2xl">
        Рекомендации по возврату клиентов на основе ваших данных (доступно в тарифе Premium).
      </p>

      {isPaywall && (
        <div className="mb-8 p-6 rounded-[24px] bg-secondary-container/40 border border-outline-variant/30 max-w-xl">
          <p className="font-bold text-on-surface mb-2">Нужен Premium</p>
          <p className="text-sm text-on-surface-variant mb-4">{err}</p>
          <Link to="/pricing" className="inline-flex items-center gap-2 px-5 py-3 rounded-full primary-gradient text-white font-bold">
            Тарифы
          </Link>
        </div>
      )}

      {!isPaywall && err && <p className="text-error mb-4 font-medium">{err}</p>}

      {items && (
        <div className="grid gap-4">
          {items.length === 0 ? (
            <p className="text-on-surface-variant">Пока нет рекомендаций — добавьте клиентов и записи.</p>
          ) : (
            items.map((row) => (
              <div key={row.client_id} className="p-6 rounded-[24px] bg-white border border-outline-variant/20 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <Link to={`/clients/${row.client_id}`} className="text-lg font-black text-primary hover:underline">
                    {row.client_name}
                  </Link>
                  <span className="text-xs font-bold text-on-surface-variant">score: {row.score.toFixed(1)}</span>
                </div>
                <p className="text-on-surface font-medium mb-2">{row.reason}</p>
                <p className="text-sm text-on-surface-variant">{row.suggested_action}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
