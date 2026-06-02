import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "@/api/client";
import type { ClientOut, HistoryOut } from "@/types";

export function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const clientId = Number(id);
  const [client, setClient] = useState<ClientOut | null>(null);
  const [history, setHistory] = useState<HistoryOut[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  async function load() {
    if (!Number.isFinite(clientId)) return;
    setErr(null);
    try {
      const [c, h] = await Promise.all([
        apiFetch<ClientOut>(`/clients/${clientId}`),
        apiFetch<HistoryOut[]>(`/clients/${clientId}/history`),
      ]);
      setClient(c);
      setHistory(h);
      setFullName(c.full_name);
      setPhone(c.phone ?? "");
      setEmail(c.email ?? "");
      setNotes(c.notes ?? "");
      setTags(c.tags.join(", "));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    }
  }

  useEffect(() => {
    void load();
  }, [clientId]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!client) return;
    setBusy(true);
    setErr(null);
    try {
      const tagList = tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const updated = await apiFetch<ClientOut>(`/clients/${client.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          notes: notes.trim() || null,
          tags: tagList,
        }),
      });
      setClient(updated);
      setIsEditingInfo(false);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Ошибка сохранения");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveNotes(e: FormEvent) {
    e.preventDefault();
    if (!client) return;
    setBusy(true);
    setErr(null);
    try {
      const updated = await apiFetch<ClientOut>(`/clients/${client.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          full_name: client.full_name,
          phone: client.phone,
          email: client.email,
          notes: notes.trim() || null,
          tags: client.tags,
        }),
      });
      setClient(updated);
      setNotesSaved(true);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Ошибка сохранения заметок");
    } finally {
      setBusy(false);
    }
  }

  async function onAddNote(e: FormEvent) {
    e.preventDefault();
    if (!client || !noteBody.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/clients/${client.id}/history`, {
        method: "POST",
        body: JSON.stringify({ event_type: "note", body: noteBody.trim() }),
      });
      setNoteBody("");
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!client) return;
    if (!window.confirm("Удалить клиента и всю историю?")) return;
    setBusy(true);
    try {
      await apiFetch(`/clients/${client.id}`, { method: "DELETE" });
      navigate("/clients");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Ошибка удаления");
    } finally {
      setBusy(false);
    }
  }

  if (!Number.isFinite(clientId)) {
    return <p className="text-error">Некорректный id</p>;
  }

  if (!client && !err) {
    return <p className="text-on-surface-variant">Загрузка…</p>;
  }

  if (!client) {
    return (
      <div>
        <p className="text-error mb-4">{err}</p>
        <Link to="/clients" className="text-primary font-bold">
          ← К списку
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <Link to="/clients" className="text-primary font-bold text-sm flex items-center gap-1 hover:underline">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Клиенты
        </Link>
      </div>

      {err && <p className="text-error mb-4 font-medium">{err}</p>}

      {/* ── Client Card (Read-only / Edit mode toggled) ── */}
      {!isEditingInfo ? (
        <div className="card p-6 max-w-2xl bg-surface-container-lowest border border-outline-variant/15 rounded-[28px] shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <h2 className="text-2xl font-black text-on-surface leading-tight">{client.full_name}</h2>
              
              <div className="flex flex-col gap-2 text-sm text-on-surface-variant">
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="flex items-center gap-2 hover:text-primary transition-colors font-medium">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant/60">phone</span>
                    {client.phone}
                  </a>
                )}
                {client.email && (
                  <a href={`mailto:${client.email}`} className="flex items-center gap-2 hover:text-primary transition-colors font-medium">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant/60">mail</span>
                    {client.email}
                  </a>
                )}
                {!client.phone && !client.email && (
                  <p className="text-on-surface-variant/40 italic text-xs">Нет контактной информации</p>
                )}
              </div>

              {client.tags && client.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {client.tags.map((t) => (
                    <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary-container/60 text-on-secondary-container">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsEditingInfo(true)}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-full border border-outline-variant/40 bg-white hover:border-primary/30 text-xs font-bold text-on-surface-variant hover:text-primary transition-all duration-200"
            >
              <span className="material-symbols-outlined text-[15px]">edit</span>
              Контакты
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSave} className="card p-6 max-w-2xl bg-surface-container-lowest border border-outline-variant/15 rounded-[28px] space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-outline-variant/10">
            <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Редактирование профиля</h3>
            <button
              type="button"
              onClick={() => {
                setFullName(client.full_name);
                setPhone(client.phone ?? "");
                setEmail(client.email ?? "");
                setTags(client.tags.join(", "));
                setIsEditingInfo(false);
              }}
              className="text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Имя">
              <input className={ic} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </Field>
            <Field label="Телефон">
              <input className={ic} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="Email">
              <input className={ic} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Теги (через запятую)">
              <input className={ic} value={tags} onChange={(e) => setTags(e.target.value)} />
            </Field>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button type="submit" disabled={busy} className="px-5 py-2.5 rounded-full primary-gradient text-white text-xs font-bold disabled:opacity-60 transition-all active:scale-95 flex items-center gap-1.5 shadow-sm">
              <span className="material-symbols-outlined text-[14px]">save</span>
              Сохранить
            </button>
            <button type="button" disabled={busy} className="px-5 py-2.5 rounded-full border border-outline-variant/40 bg-white hover:bg-surface-container text-on-surface-variant text-xs font-bold transition-all active:scale-95" onClick={() => setIsEditingInfo(false)}>
              Отмена
            </button>
            <button type="button" disabled={busy} className="px-5 py-2.5 rounded-full border border-error/30 text-error hover:bg-error/5 text-xs font-bold transition-all active:scale-95 ml-auto" onClick={onDelete}>
              Удалить клиента
            </button>
          </div>
        </form>
      )}

      {/* ── General Client Notes (Card Notebook Style) ── */}
      <form onSubmit={onSaveNotes} className="card p-6 max-w-2xl bg-white border border-outline-variant/15 rounded-[28px] space-y-4 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/10">
          <div className="flex items-center gap-2 text-primary font-bold">
            <span className="material-symbols-outlined text-[20px]">sticky_note_2</span>
            <span className="text-xs uppercase tracking-wider font-black">Заметки о клиенте</span>
          </div>
          {notesSaved && (
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 animate-fade-in">
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              Сохранено
            </span>
          )}
        </div>
        <textarea
          className={`${ic} min-h-[120px] resize-none text-sm placeholder:text-on-surface-variant/30`}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setNotesSaved(false);
          }}
          placeholder="Напишите здесь особенности клиента, предпочтения, формулы окрашивания или другую общую информацию..."
        />
        <div className="flex justify-end">
          <button type="submit" disabled={busy} className="px-5 py-2.5 rounded-full primary-gradient text-white text-xs font-bold disabled:opacity-60 transition-all active:scale-95 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">save</span>
            Сохранить заметки
          </button>
        </div>
      </form>

      {/* ── Visit History Timeline ── */}
      <section className="max-w-2xl space-y-4 pt-2">
        <div className="flex items-center gap-2 font-bold text-on-surface">
          <span className="material-symbols-outlined text-[20px] text-on-surface-variant/80">history</span>
          <h3 className="text-lg font-black tracking-tight">Хронология визитов и заметок</h3>
        </div>
        
        <form onSubmit={onAddNote} className="flex gap-2">
          <input
            className={`${ic} flex-1 text-sm`}
            placeholder="Добавить новую заметку к визиту..."
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
          />
          <button type="submit" disabled={busy || !noteBody.trim()} className="px-5 py-3 rounded-2xl bg-secondary-container text-on-secondary-container text-xs font-black disabled:opacity-50 flex items-center gap-1 hover:bg-secondary-container/85 transition-colors">
            <span className="material-symbols-outlined text-[16px]">add</span>
            Добавить
          </button>
        </form>

        {history.length === 0 ? (
          <div className="p-8 text-center bg-surface-container-lowest border border-outline-variant/10 rounded-2xl">
            <p className="text-sm text-on-surface-variant/40 italic">Хронология пока пуста. Добавьте первую заметку выше.</p>
          </div>
        ) : (
          <ul className="relative pl-6 border-l-2 border-outline-variant/15 space-y-5 ml-3.5 py-1">
            {history.map((h) => (
              <li key={h.id} className="relative space-y-2">
                {/* Timeline dot */}
                <div className="absolute -left-[32px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background shadow-sm" />
                
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-surface-container text-on-surface-variant tracking-wider">
                    {h.event_type === "note" ? "Заметка" : h.event_type}
                  </span>
                  <span className="text-[10px] text-on-surface-variant/60 font-semibold">
                    {new Date(h.created_at).toLocaleString("ru-RU", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                
                <div className="text-sm text-on-surface bg-white p-4 rounded-[20px] border border-outline-variant/15 shadow-sm whitespace-pre-wrap leading-relaxed">
                  {h.body || "—"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const ic =
  "w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-1">{label}</label>
      {children}
    </div>
  );
}
