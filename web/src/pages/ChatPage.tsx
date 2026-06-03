import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch, getAvatarUrl } from "@/api/client";
import type { ContactOut, MessageOut, UserOut } from "@/types";

export function ChatPage() {
  const [searchParams] = useSearchParams();
  const targetUserIdStr = searchParams.get("userId");
  const targetUserName = searchParams.get("name") || "Собеседник";
  const targetUserAvatar = searchParams.get("avatarUrl") || null;

  const [contacts, setContacts] = useState<ContactOut[] | null>(null);
  const [activeContact, setActiveContact] = useState<ContactOut | null>(null);
  const [messages, setMessages] = useState<MessageOut[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<UserOut | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Скролл вниз при обновлении сообщений
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Получаем текущего юзера
  useEffect(() => {
    (async () => {
      try {
        const u = await apiFetch<UserOut>("/users/me");
        setCurrentUser(u);
      } catch (e) {
        console.error("Failed to load user info", e);
      }
    })();
  }, []);

  // Первичная загрузка списка контактов
  const fetchContacts = async (selectTargetId?: number) => {
    try {
      const data = await apiFetch<ContactOut[]>("/messages/contacts");
      setContacts(data);

      if (selectTargetId) {
        const found = data.find((c) => c.id === selectTargetId);
        if (found) {
          setActiveContact(found);
        } else {
          // Если собеседника нет в контактах, создаем виртуальный контакт
          setActiveContact({
            id: selectTargetId,
            full_name: targetUserName,
            email: "",
            role: currentUser?.role === "client" ? "private_person" : "client",
            unread_count: 0,
            avatar_url: targetUserAvatar,
          });
        }
      }
    } catch (e) {
      console.error("Failed to load contacts", e);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    const targetId = targetUserIdStr ? parseInt(targetUserIdStr, 10) : undefined;
    fetchContacts(targetId);
  }, [targetUserIdStr, currentUser]);

  // Загрузка истории сообщений
  const fetchMessages = async (partnerId: number) => {
    try {
      const data = await apiFetch<MessageOut[]>(`/messages/chat/${partnerId}`);
      setMessages(data);
    } catch (e) {
      console.error("Failed to load chat history", e);
    }
  };

  useEffect(() => {
    if (activeContact) {
      fetchMessages(activeContact.id);
    } else {
      setMessages([]);
    }
  }, [activeContact]);

  // Автоматический опрос (polling) каждые 5 секунд
  useEffect(() => {
    const timer = setInterval(() => {
      // Обновляем список контактов в фоне
      (async () => {
        try {
          const data = await apiFetch<ContactOut[]>("/messages/contacts");
          setContacts((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(data)) {
              return data;
            }
            return prev;
          });
        } catch (e) {
          console.error("Background contacts fetch failed", e);
        }
      })();

      // Обновляем сообщения активного чата
      if (activeContact) {
        fetchMessages(activeContact.id);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [activeContact]);

  // Скролл вниз при изменении сообщений
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeContact || isSending) return;

    setIsSending(true);
    setError(null);
    const bodyText = newMessage.trim();
    setNewMessage("");

    try {
      const sent = await apiFetch<MessageOut>("/messages", {
        method: "POST",
        body: JSON.stringify({
          receiver_id: activeContact.id,
          body: bodyText,
        }),
      });

      setMessages((prev) => [...prev, sent]);

      // Обновляем список контактов, чтобы переместить текущего наверх
      fetchContacts(activeContact.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить сообщение");
      setNewMessage(bodyText); // Возвращаем текст назад при ошибке
    } finally {
      setIsSending(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div className="h-[calc(100dvh-180px)] md:h-[calc(100vh-140px)] flex flex-col md:flex-row bg-surface-container-lowest rounded-[32px] border border-outline-variant/15 shadow-sm overflow-hidden animate-fade-up">
      {/* Список контактов */}
      <div
        className={`w-full md:w-80 border-r border-outline-variant/15 flex flex-col ${
          activeContact ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="p-4 border-b border-outline-variant/15">
          <h2 className="text-xl font-black text-on-surface tracking-tight">Сообщения</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 scroll-touch">
          {contacts === null ? (
            <div className="p-4 space-y-2">
              <div className="h-12 skeleton rounded-2xl" />
              <div className="h-12 skeleton rounded-2xl" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="p-6 text-center text-sm text-on-surface-variant">
              У вас пока нет переписок. Напишите мастеру или клиенту для начала общения!
            </div>
          ) : (
            contacts.map((c) => {
              const isActive = activeContact?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveContact(c)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all ${
                    isActive
                      ? "bg-primary/10 text-primary font-bold"
                      : "hover:bg-surface-container/50 text-on-surface-variant"
                  }`}
                >
                  <div className="w-10 h-10 rounded-none primary-gradient text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden border border-outline-variant/15">
                    {c.avatar_url ? (
                      <img src={getAvatarUrl(c.avatar_url)} alt={c.full_name} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(c.full_name)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-sm font-bold text-on-surface truncate">{c.full_name}</p>
                      {c.unread_count > 0 && (
                        <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold shrink-0">
                          {c.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant truncate">
                      {c.role === "private_person" ? "Мастер" : "Клиент"}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Окно переписки */}
      <div
        className={`flex-1 flex flex-col bg-surface-container-low/30 ${
          activeContact ? "flex" : "hidden md:flex items-center justify-center"
        }`}
      >
        {activeContact ? (
          <>
            {/* Шапка чата */}
            <div className="p-4 border-b border-outline-variant/15 bg-surface-container-lowest flex items-center gap-3 shrink-0">
              <button
                onClick={() => setActiveContact(null)}
                className="p-2 -ml-2 rounded-full text-on-surface-variant hover:bg-surface-container md:hidden transition-all"
                title="Назад к контактам"
              >
                <span className="material-symbols-outlined block">arrow_back</span>
              </button>
              <div className="w-10 h-10 rounded-none primary-gradient text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden border border-outline-variant/15">
                {activeContact.avatar_url ? (
                  <img src={getAvatarUrl(activeContact.avatar_url)} alt={activeContact.full_name} className="w-full h-full object-cover" />
                ) : (
                  getInitials(activeContact.full_name)
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface">{activeContact.full_name}</p>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                  {activeContact.role === "private_person" ? "Мастер" : "Клиент"}
                </p>
              </div>
            </div>

            {/* Сообщения */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-touch">
              {messages.map((m) => {
                const isMe = m.sender_id === currentUser?.id;
                return (
                  <div
                    key={m.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] p-3.5 rounded-[20px] shadow-sm text-sm whitespace-pre-wrap relative group ${
                        isMe
                          ? "bg-primary text-white rounded-tr-none"
                          : "bg-surface-container-lowest text-on-surface border border-outline-variant/10 rounded-tl-none"
                      }`}
                    >
                      <p className="pb-2">{m.body}</p>
                      <div
                        className={`text-[9px] text-right font-semibold select-none ${
                          isMe ? "text-white/70" : "text-on-surface-variant/60"
                        }`}
                      >
                        {formatTime(m.created_at)}
                        {isMe && (
                          <span className="ml-1 text-[10px] font-bold inline-block">
                            {m.is_read ? "✓✓" : "✓"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Ошибка отправки */}
            {error && (
              <div className="px-4 py-1.5 text-xs text-error font-bold bg-error/10 border-y border-error/20 shrink-0">
                {error}
              </div>
            )}

            {/* Поле ввода */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 border-t border-outline-variant/15 bg-surface-container-lowest flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Напишите сообщение..."
                className="input-field py-2.5 rounded-full flex-1"
                disabled={isSending}
                required
              />
              <button
                type="submit"
                disabled={isSending || !newMessage.trim()}
                className="w-10 h-10 rounded-full primary-gradient text-white flex items-center justify-center shrink-0 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                title="Отправить"
              >
                <span className="material-symbols-outlined block text-lg font-bold">send</span>
              </button>
            </form>
          </>
        ) : (
          <div className="text-center p-6 max-w-sm">
            <span className="material-symbols-outlined text-5xl text-outline-variant block mb-3">
              chat_bubble
            </span>
            <h3 className="text-lg font-black text-on-surface mb-1">Выберите диалог</h3>
            <p className="text-sm text-on-surface-variant">
              Выберите контакт из списка слева, чтобы начать переписку.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
