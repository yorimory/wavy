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
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Ошибка сохранения");
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
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link to="/clients" className="text-primary font-bold text-sm">
          ← Клиенты
        </Link>
      </div>
      <h2 className="text-3xl font-black text-on-surface mb-2">{client.full_name}</h2>
      {err && <p className="text-error mb-4 font-medium">{err}</p>}

      <form onSubmit={onSave} className="space-y-4 mb-10 max-w-2xl">
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
        </div>
        <Field label="Заметки">
          <textarea className={`${ic} min-h-[100px]`} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Field label="Теги (через запятую)">
          <input className={ic} value={tags} onChange={(e) => setTags(e.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={busy} className="px-6 py-3 rounded-full primary-gradient text-white font-bold disabled:opacity-60">
            Сохранить
          </button>
          <button type="button" disabled={busy} className="px-6 py-3 rounded-full border border-error text-error font-bold" onClick={onDelete}>
            Удалить клиента
          </button>
        </div>
      </form>

      <section className="max-w-2xl">
        <h3 className="text-lg font-black text-on-surface mb-3">История</h3>
        <form onSubmit={onAddNote} className="flex flex-col md:flex-row gap-2 mb-6">
          <input
            className={`${ic} flex-1`}
            placeholder="Новая заметка в историю…"
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
          />
          <button type="submit" disabled={busy || !noteBody.trim()} className="px-5 py-3 rounded-xl bg-secondary-container text-on-secondary-container font-bold disabled:opacity-50">
            Добавить
          </button>
        </form>
        <ul className="space-y-3">
          {history.map((h) => (
            <li key={h.id} className="p-4 rounded-2xl bg-white border border-outline-variant/20">
              <div className="text-xs text-on-surface-variant font-bold uppercase">{h.event_type}</div>
              <div className="text-sm text-on-surface mt-1 whitespace-pre-wrap">{h.body || "—"}</div>
              <div className="text-[11px] text-outline mt-2">{new Date(h.created_at).toLocaleString("ru-RU")}</div>
            </li>
          ))}
        </ul>
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
