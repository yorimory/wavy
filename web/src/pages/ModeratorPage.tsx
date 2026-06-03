import { useEffect, useState } from "react";
import { apiFetch } from "@/api/client";
import type { UserOut, SystemActionLogOut, SystemConfigOut, SupportTicketOut } from "@/types";

type Tab = "users" | "logs" | "config" | "tickets";

export function ModeratorPage() {
  const [activeTab, setActiveTab] = useState<Tab>("users");
  
  // Данные вкладок
  const [users, setUsers] = useState<UserOut[] | null>(null);
  const [logs, setLogs] = useState<SystemActionLogOut[] | null>(null);
  const [configs, setConfigs] = useState<SystemConfigOut[] | null>(null);
  const [tickets, setTickets] = useState<SupportTicketOut[] | null>(null);

  // Ошибки
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Загрузчики
  const loadUsers = async () => {
    try {
      const data = await apiFetch<UserOut[]>("/moderation/users");
      setUsers(data);
    } catch (e) {
      setError("Не удалось загрузить пользователей");
    }
  };

  const loadLogs = async () => {
    try {
      const data = await apiFetch<SystemActionLogOut[]>("/moderation/logs");
      setLogs(data);
    } catch (e) {
      setError("Не удалось загрузить логи");
    }
  };

  const loadConfigs = async () => {
    try {
      const data = await apiFetch<SystemConfigOut[]>("/moderation/config");
      setConfigs(data);
    } catch (e) {
      setError("Не удалось загрузить настройки");
    }
  };

  const loadTickets = async () => {
    try {
      const data = await apiFetch<SupportTicketOut[]>("/moderation/tickets");
      setTickets(data);
    } catch (e) {
      setError("Не удалось загрузить обращения");
    }
  };

  // Эффект первичной и фоновой загрузки по вкладкам
  useEffect(() => {
    setError(null);
    setSuccess(null);
    if (activeTab === "users") loadUsers();
    else if (activeTab === "logs") loadLogs();
    else if (activeTab === "config") loadConfigs();
    else if (activeTab === "tickets") loadTickets();
  }, [activeTab]);

  // ДЕЙСТВИЯ: Пользователи
  const handleRoleChange = async (userId: number, currentRole: string) => {
    const nextRole = currentRole === "moderator" ? "private_person" : "moderator";
    const ok = window.confirm(`Сменить роль пользователя на ${nextRole}?`);
    if (!ok) return;

    try {
      await apiFetch(`/moderation/users/${userId}/role`, {
        method: "POST",
        body: JSON.stringify({ role: nextRole }),
      });
      setSuccess("Роль успешно изменена");
      loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка изменения роли");
    }
  };

  const handleWarnUser = async (userId: number) => {
    const reason = window.prompt("Введите причину предупреждения:");
    if (reason === null) return; // Отмена
    if (!reason.trim()) {
      alert("Причина обязательна!");
      return;
    }

    try {
      await apiFetch(`/moderation/users/${userId}/warning`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      setSuccess("Предупреждение выдано");
      loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка отправки предупреждения");
    }
  };

  const handleBanUser = async (userId: number) => {
    const reason = window.prompt("Введите причину блокировки:");
    if (reason === null) return;
    if (!reason.trim()) {
      alert("Причина обязательна!");
      return;
    }

    try {
      await apiFetch(`/moderation/users/${userId}/ban`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      setSuccess("Пользователь заблокирован");
      loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка блокировки");
    }
  };

  const handleUnbanUser = async (userId: number) => {
    const ok = window.confirm("Разблокировать пользователя?");
    if (!ok) return;

    try {
      await apiFetch(`/moderation/users/${userId}/unban`, {
        method: "POST",
      });
      setSuccess("Пользователь разблокирован");
      loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка разблокировки");
    }
  };

  // ДЕЙСТВИЯ: Логи и откат
  const handleRollback = async (logId: number) => {
    const reason = window.prompt(
      "Введите извинение или обоснование отката (будет сохранено в системе):",
      "Извините, ложное срабатывание автоматической системы контроля качества."
    );
    if (reason === null) return;

    try {
      await apiFetch(`/moderation/rollback/${logId}`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      setSuccess("Действие отменено");
      loadLogs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка отмены действия");
    }
  };

  // ДЕЙСТВИЯ: Конфигурация
  const handleUpdateConfig = async (key: string, currentValue: string) => {
    const newValue = window.prompt(`Изменить значение для настройки "${key}":`, currentValue);
    if (newValue === null || newValue.trim() === currentValue) return;

    try {
      await apiFetch(`/moderation/config/${key}`, {
        method: "PUT",
        body: JSON.stringify({ value: newValue.trim() }),
      });
      setSuccess("Настройка обновлена");
      loadConfigs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения настройки");
    }
  };

  // ДЕЙСТВИЯ: Поддержка
  const handleReplyTicket = async (ticketId: number) => {
    const replyText = window.prompt("Введите ответ поддержки:");
    if (replyText === null) return;
    if (!replyText.trim()) {
      alert("Ответ не может быть пустым!");
      return;
    }

    try {
      await apiFetch(`/moderation/tickets/${ticketId}/reply`, {
        method: "POST",
        body: JSON.stringify({ reply: replyText.trim() }),
      });
      setSuccess("Ответ на обращение успешно отправлен");
      loadTickets();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка отправки ответа");
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Шапка страницы */}
      <div>
        <h2 className="text-3xl font-black text-on-surface tracking-tight mb-1">
          Администрирование & Модерация
        </h2>
        <p className="text-sm text-on-surface-variant">
          Управление правами пользователей, разбан, просмотр логов нарушений и тикеты поддержки.
        </p>
      </div>

      {/* Оповещения */}
      {error && (
        <div className="p-3 text-sm font-bold text-error bg-error/10 border border-error/20 rounded-2xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="material-symbols-outlined text-sm">close</button>
        </div>
      )}
      {success && (
        <div className="p-3 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="material-symbols-outlined text-sm">close</button>
        </div>
      )}

      {/* Вкладки */}
      <div className="flex gap-2 border-b border-outline-variant/15 pb-px overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-3 font-bold text-sm border-b-2 transition-all shrink-0 ${
            activeTab === "users"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Пользователи
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-3 font-bold text-sm border-b-2 transition-all shrink-0 ${
            activeTab === "logs"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Логи действий
        </button>
        <button
          onClick={() => setActiveTab("config")}
          className={`px-4 py-3 font-bold text-sm border-b-2 transition-all shrink-0 ${
            activeTab === "config"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Правила блокировки
        </button>
        <button
          onClick={() => setActiveTab("tickets")}
          className={`px-4 py-3 font-bold text-sm border-b-2 transition-all shrink-0 ${
            activeTab === "tickets"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Поддержка
        </button>
      </div>

      {/* Содержимое вкладок */}
      <div className="bg-white border border-outline-variant/15 rounded-3xl shadow-sm overflow-hidden">
        {/* Вкладка: Пользователи */}
        {activeTab === "users" && (
          <div className="overflow-x-auto scroll-touch">
            {users === null ? (
              <div className="p-8 space-y-4">
                <div className="h-10 skeleton rounded-xl" />
                <div className="h-10 skeleton rounded-xl" />
              </div>
            ) : (
              <table className="w-full min-w-[700px] text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/15 text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    <th className="p-4">ФИО / Email</th>
                    <th className="p-4">Роль</th>
                    <th className="p-4 text-center">Предупреждения</th>
                    <th className="p-4">Статус</th>
                    <th className="p-4 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 text-sm">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-surface-container-lowest/50">
                      <td className="p-4">
                        <div className="font-bold text-on-surface">{u.full_name}</div>
                        <div className="text-xs text-on-surface-variant">{u.email}</div>
                      </td>
                      <td className="p-4">
                        <span className={`badge ${
                          u.role === "moderator" 
                            ? "bg-purple-100 text-purple-700" 
                            : u.role === "client" 
                            ? "bg-blue-100 text-blue-700" 
                            : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {u.role === "moderator" ? "Модератор" : u.role === "client" ? "Клиент" : "Мастер"}
                        </span>
                      </td>
                      <td className="p-4 text-center font-bold">
                        {u.warning_count}
                      </td>
                      <td className="p-4">
                        {u.is_banned ? (
                          <span className="badge bg-red-100 text-red-700 font-bold" title={u.ban_reason || ""}>
                            Забанен
                          </span>
                        ) : (
                          <span className="badge bg-emerald-100 text-emerald-700 font-bold">
                            Активен
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleRoleChange(u.id, u.role)}
                          className="px-3 py-1.5 rounded-xl border border-outline-variant hover:bg-surface-container text-xs font-bold transition-all"
                        >
                          {u.role === "moderator" ? "Снять адм." : "Дать адм."}
                        </button>
                        <button
                          onClick={() => handleWarnUser(u.id)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all"
                        >
                          Варн
                        </button>
                        {u.is_banned ? (
                          <button
                            onClick={() => handleUnbanUser(u.id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all"
                          >
                            Разбан
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBanUser(u.id)}
                            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all"
                          >
                            Бан
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Вкладка: Логи */}
        {activeTab === "logs" && (
          <div className="overflow-x-auto scroll-touch">
            {logs === null ? (
              <div className="p-8 space-y-4">
                <div className="h-10 skeleton rounded-xl" />
                <div className="h-10 skeleton rounded-xl" />
              </div>
            ) : logs.length === 0 ? (
              <p className="p-8 text-center text-sm text-on-surface-variant">Логи нарушений отсутствуют.</p>
            ) : (
              <table className="w-full min-w-[800px] text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/15 text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    <th className="p-4">Дата / Время</th>
                    <th className="p-4">Действие</th>
                    <th className="p-4">Детали</th>
                    <th className="p-4 text-center">Статус</th>
                    <th className="p-4 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 text-sm">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-container-lowest/50">
                      <td className="p-4 whitespace-nowrap text-xs text-on-surface-variant">
                        {new Date(log.created_at).toLocaleString("ru-RU")}
                      </td>
                      <td className="p-4">
                        <span className={`badge ${
                          log.action === "ban" || log.action === "manual_ban"
                            ? "bg-red-100 text-red-700"
                            : log.action === "warning" || log.action === "manual_warning"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 max-w-xs truncate" title={log.details}>
                        {log.details}
                      </td>
                      <td className="p-4 text-center">
                        {log.is_active ? (
                          <span className="text-xs text-amber-600 font-bold">Активен</span>
                        ) : (
                          <span className="text-xs text-on-surface-variant/60">Отменен / Архив</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {log.is_active && (log.action.includes("ban") || log.action.includes("warning")) ? (
                          <button
                            onClick={() => handleRollback(log.id)}
                            className="px-3 py-1.5 rounded-xl border border-primary hover:bg-primary/5 text-primary text-xs font-bold transition-all"
                          >
                            Откатить с извинениями
                          </button>
                        ) : (
                          <span className="text-xs text-on-surface-variant/40">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Вкладка: Конфиг */}
        {activeTab === "config" && (
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-on-surface">Настройки автоматических правил</h3>
            {configs === null ? (
              <div className="space-y-2">
                <div className="h-12 skeleton rounded-xl" />
                <div className="h-12 skeleton rounded-xl" />
              </div>
            ) : (
              <div className="grid gap-4 max-w-xl">
                {configs.map((cfg) => (
                  <div
                    key={cfg.key}
                    className="p-4 bg-surface-container-low border border-outline-variant/15 rounded-2xl flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-on-surface">
                        {cfg.key === "warnings_limit" ? "Лимит предупреждений для бана" : ""}
                        {cfg.key === "low_rating_threshold" ? "Порог плохой оценки (включительно)" : ""}
                        {!["warnings_limit", "low_rating_threshold"].includes(cfg.key) && cfg.key}
                      </div>
                      <div className="text-xs text-on-surface-variant">Системный ключ: {cfg.key}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-black text-primary bg-primary/5 px-4 py-1.5 rounded-full border border-primary/20">
                        {cfg.value}
                      </span>
                      <button
                        onClick={() => handleUpdateConfig(cfg.key, cfg.value)}
                        className="btn-secondary py-2 px-4 rounded-xl text-xs"
                      >
                        Изменить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Вкладка: Тикеты поддержки */}
        {activeTab === "tickets" && (
          <div className="overflow-x-auto scroll-touch">
            {tickets === null ? (
              <div className="p-8 space-y-4">
                <div className="h-10 skeleton rounded-xl" />
                <div className="h-10 skeleton rounded-xl" />
              </div>
            ) : tickets.length === 0 ? (
              <p className="p-8 text-center text-sm text-on-surface-variant">Нет тикетов в поддержке.</p>
            ) : (
              <table className="w-full min-w-[900px] text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/15 text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    <th className="p-4">ID / Дата</th>
                    <th className="p-4">Пользователь (ID)</th>
                    <th className="p-4">Тема</th>
                    <th className="p-4">Сообщение</th>
                    <th className="p-4">Статус</th>
                    <th className="p-4 text-right">Решение</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 text-sm">
                  {tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-surface-container-lowest/50">
                      <td className="p-4 text-xs text-on-surface-variant">
                        #{t.id} <br />
                        {new Date(t.created_at).toLocaleDateString("ru-RU")}
                      </td>
                      <td className="p-4 font-bold">
                        User #{t.user_id}
                      </td>
                      <td className="p-4 font-bold text-on-surface">
                        {t.subject}
                      </td>
                      <td className="p-4 max-w-xs truncate" title={t.message}>
                        {t.message}
                      </td>
                      <td className="p-4">
                        <span className={t.status === "resolved" ? "badge-confirmed" : "badge-pending"}>
                          {t.status === "resolved" ? "Решено" : "Открыто"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {t.status === "open" ? (
                          <button
                            onClick={() => handleReplyTicket(t.id)}
                            className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition-all"
                          >
                            Ответить
                          </button>
                        ) : (
                          <div className="text-xs text-on-surface-variant/80 italic text-left max-w-xs" title={t.reply || ""}>
                            Ответ: {t.reply}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
