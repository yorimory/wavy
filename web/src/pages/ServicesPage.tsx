import { type FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/api/client";
import { useToast } from "@/context/ToastContext";
import type { ServiceOut } from "@/types";

/* ─── Confirm delete dialog ─── */
function ConfirmDeleteDialog({
  title,
  onConfirm,
  onCancel,
  loading,
}: {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      style={{ animation: "fadeIn 0.15s ease" }}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white border border-outline-variant/20 shadow-modal p-6 space-y-5"
        style={{ animation: "scaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1) both" }}
      >
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-red-500 text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>delete</span>
          </div>
          <div>
            <h3 className="font-black text-on-surface text-base">Удалить услугу?</h3>
            <p className="text-sm text-on-surface-variant mt-1">
              «<span className="font-semibold text-on-surface">{title}</span>» будет удалена навсегда.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl border border-outline-variant/40 font-bold text-sm text-on-surface hover:bg-surface-container transition-all"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all disabled:opacity-60 active:scale-[0.97]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                Удаление…
              </span>
            ) : (
              "Да, удалить"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const CATEGORY_OPTIONS = [
  "Парикмахерские услуги",
  "Маникюр и педикюр",
  "Массаж и СПА",
  "Косметология",
  "Макияж и брови",
  "Обучение и консультации",
  "Другое",
];

const IMAGE_PRESETS = [
  { label: "Стрижка/Волосы", url: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&auto=format&fit=crop&q=80" },
  { label: "Ногти/Маникюр", url: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=500&auto=format&fit=crop&q=80" },
  { label: "Массаж/СПА", url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=500&auto=format&fit=crop&q=80" },
  { label: "Кожа/Лицо", url: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500&auto=format&fit=crop&q=80" },
  { label: "Макияж", url: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=500&auto=format&fit=crop&q=80" },
];

export function ServicesPage() {
  const toast = useToast();
  const [items, setItems] = useState<ServiceOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | { mode: "create" } | { mode: "edit"; item: ServiceOut }>(null);

  async function reload() {
    try {
      setItems(await apiFetch<ServiceOut[]>("/services"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-on-surface tracking-tight">Услуги</h2>
          <p className="text-on-surface-variant mt-1 text-sm">
            {loading ? "Загрузка…" : `${items.length} услуг в вашем каталоге`}
          </p>
        </div>
        <button
          type="button"
          className="btn-primary self-start"
          onClick={() => setModal({ mode: "create" })}
        >
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
          Новая услуга
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((n) => <div key={n} className="h-36 skeleton rounded-3xl" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <span className="material-symbols-outlined text-[52px] text-on-surface-variant/20 block">spa</span>
          <p className="font-bold text-on-surface-variant">Нет услуг</p>
          <p className="text-sm text-on-surface-variant/60">Добавьте первую услугу — клиенты увидят её в поиске</p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((s) => (
          <article
            key={s.id}
            className={`rounded-[24px] border p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] hover:scale-[1.015] hover:shadow-[0px_12px_30px_rgba(0,0,0,0.08)] transition-all duration-300 flex gap-4 ${s.is_active ? "bg-white border-outline-variant/20" : "bg-surface-container/50 border-dashed opacity-75"}`}
          >
            {s.image_url ? (
              <img
                src={s.image_url}
                alt={s.title}
                className="w-24 h-24 rounded-2xl object-cover shrink-0 bg-surface-container shadow-sm border border-outline-variant/10"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/30 flex items-center justify-center shrink-0 border border-outline-variant/10">
                <span className="material-symbols-outlined text-primary/50 text-[32px]">spa</span>
              </div>
            )}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start gap-2 mb-1">
                  <h3 className="text-lg font-bold text-on-surface truncate">{s.title}</h3>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${s.is_active ? "bg-primary-container/20 text-primary" : "bg-surface-container text-on-surface-variant"}`}>
                    {s.is_active ? "Активна" : "Скрыта"}
                  </span>
                </div>
                {s.category && (
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/5 px-2 py-0.5 rounded-md mb-2">
                    {s.category}
                  </span>
                )}
                {s.description && <p className="text-sm text-on-surface-variant line-clamp-2 mb-2 leading-relaxed">{s.description}</p>}
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-outline-variant/10">
                <span className="text-sm font-bold text-on-surface">
                  {s.duration_minutes} мин
                  {s.price != null ? ` · ${s.price} BYN` : ""}
                </span>
                <button type="button" className="text-sm font-bold text-primary hover:underline" onClick={() => setModal({ mode: "edit", item: s })}>
                  Изменить
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {modal && (
        <ServiceModal
          mode={modal.mode}
          item={modal.mode === "edit" ? modal.item : undefined}
          onClose={() => setModal(null)}
          onSaved={async (msg) => {
            if (msg) toast.success(msg);
            await reload();
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

function ServiceModal({
  mode,
  item,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  item?: ServiceOut;
  onClose: () => void;
  onSaved: (msg?: string) => void | Promise<void>;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [duration, setDuration] = useState(String(item?.duration_minutes ?? 60));
  const [price, setPrice] = useState(item?.price != null ? String(item.price) : "");
  const [isActive, setIsActive] = useState(item?.is_active ?? true);
  const [category, setCategory] = useState(item?.category ?? "");
  const [imageUrl, setImageUrl] = useState(item?.image_url ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const body = {
      title: title.trim(),
      description: description.trim() || null,
      duration_minutes: Number(duration) || 60,
      price: price.trim() ? Number(price) : null,
      is_active: isActive,
      image_url: imageUrl.trim() || null,
      category: category.trim() || null,
    };
    try {
      if (mode === "create") {
        await apiFetch("/services", { method: "POST", body: JSON.stringify(body) });
        await onSaved("Услуга создана");
      } else if (item) {
        await apiFetch(`/services/${item.id}`, { method: "PATCH", body: JSON.stringify(body) });
        await onSaved("Услуга обновлена");
      }
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    if (!item) return;
    setDeleting(true);
    try {
      await apiFetch(`/services/${item.id}`, { method: "DELETE" });
      await onSaved("Услуга удалена");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Ошибка удаления");
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  const ic = "w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30 text-on-surface";

  return (
    <>
    {confirmDelete && (
      <ConfirmDeleteDialog
        title={item?.title ?? ""}
        onConfirm={() => void doDelete()}
        onCancel={() => setConfirmDelete(false)}
        loading={deleting}
      />
    )}
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] bg-surface-container-lowest shadow-2xl border p-6 md:p-8 max-h-[92vh] overflow-y-auto">
        <h3 className="text-xl font-black mb-6">{mode === "create" ? "Новая услуга" : "Редактирование"}</h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Название</label>
            <input className={ic} value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Например: Маникюр с покрытием" />
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Категория</label>
            <select className={ic} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">— Не выбрана —</option>
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Описание</label>
            <textarea className={`${ic} min-h-[72px]`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Опишите услугу для ваших клиентов..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Длительность (мин)</label>
              <input className={ic} type="number" min={15} max={480} step={15} value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Цена (BYN)</label>
              <input className={ic} type="number" min={0} step={0.01} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="необяз." />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Ссылка на картинку (URL)</label>
            <input className={ic} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://images.unsplash.com/..." />
            
            {/* Пресеты изображений */}
            <div className="mt-2.5">
              <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Или выберите готовый пресет:</span>
              <div className="flex flex-wrap gap-2">
                {IMAGE_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setImageUrl(p.url)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${imageUrl === p.url ? "bg-primary-container/20 border-primary text-primary shadow-sm" : "border-outline-variant hover:bg-surface-container bg-white text-on-surface"}`}
                  >
                    <img src={p.url} className="w-5 h-5 rounded-full object-cover border border-outline-variant/30" />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded text-primary focus:ring-primary" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Показывать в поиске
          </label>
          
          {err && <p className="text-error text-sm bg-error/5 p-3 rounded-xl font-semibold">{err}</p>}
          
          <div className="flex gap-3 pt-2">
            <button type="button" className="flex-1 px-5 py-3 rounded-xl border font-bold hover:bg-surface-container transition-colors" onClick={onClose}>
              Отмена
            </button>
            {mode === "edit" && (
              <button type="button" className="px-5 py-3 rounded-xl border border-error text-error font-bold hover:bg-error/5 transition-colors" onClick={() => setConfirmDelete(true)} disabled={busy}>
                Удалить
              </button>
            )}
            <button type="submit" disabled={busy} className="flex-1 px-6 py-3 rounded-xl primary-gradient text-white font-bold hover:opacity-95 disabled:opacity-60 transition-all shadow-md">
              {busy ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}
