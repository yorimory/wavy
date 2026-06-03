import { useEffect, useState } from "react";
import { apiFetch } from "@/api/client";
import type { SupportTicketOut } from "@/types";

export function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicketOut[] | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchTickets = async () => {
    try {
      const data = await apiFetch<SupportTicketOut[]>("/support/my-tickets");
      setTickets(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить обращения");
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await apiFetch<SupportTicketOut>("/support/tickets", {
        method: "POST",
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
        }),
      });
      setSubject("");
      setMessage("");
      setSuccess("Обращение успешно создано!");
      fetchTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка создания обращения");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-up">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Форма создания обращения */}
        <div className="flex-1 md:max-w-md">
          <div className="card p-6 bg-white shadow-sm border border-outline-variant/15">
            <h2 className="text-2xl font-black text-on-surface tracking-tight mb-2">Служба поддержки</h2>
            <p className="text-sm text-on-surface-variant mb-6">
              Столкнулись с проблемой или есть предложение? Напишите нам, и модераторы ответят вам в ближайшее время.
            </p>

            {error && (
              <div className="p-3 mb-4 text-xs font-bold text-error bg-error/10 border border-error/20 rounded-xl">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 mb-4 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="section-label" htmlFor="ticket-subject">
                  Тема обращения
                </label>
                <input
                  id="ticket-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="input-field"
                  placeholder="Например, ошибка оплаты"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="section-label" htmlFor="ticket-message">
                  Сообщение
                </label>
                <textarea
                  id="ticket-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="input-field min-h-[120px] resize-none"
                  placeholder="Опишите проблему подробно..."
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary"
              >
                {isSubmitting ? "Отправка..." : "Отправить обращение"}
              </button>
            </form>
          </div>
        </div>

        {/* Список обращений */}
        <div className="flex-1 space-y-4">
          <h3 className="text-xl font-bold text-on-surface">История обращений</h3>

          {tickets === null ? (
            <div className="space-y-3">
              <div className="h-24 skeleton rounded-2xl" />
              <div className="h-24 skeleton rounded-2xl" />
            </div>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Вы ещё не создавали обращений в поддержку.</p>
          ) : (
            <div className="space-y-4">
              {tickets.map((t) => (
                <div key={t.id} className="p-5 bg-white border border-outline-variant/15 rounded-3xl shadow-sm">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-bold text-on-surface">{t.subject}</span>
                    <span className={t.status === "resolved" ? "badge-confirmed" : "badge-pending"}>
                      {t.status === "resolved" ? "Решено" : "Открыто"}
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant mb-4 whitespace-pre-wrap">{t.message}</p>
                  
                  {t.reply && (
                    <div className="p-4 bg-primary/5 border-l-4 border-primary rounded-r-2xl text-sm">
                      <div className="font-bold text-primary mb-1">Ответ поддержки:</div>
                      <p className="text-on-surface-variant whitespace-pre-wrap">{t.reply}</p>
                    </div>
                  )}
                  
                  <div className="text-[10px] text-on-surface-variant/60 text-right mt-3">
                    {new Date(t.created_at).toLocaleString("ru-RU")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
