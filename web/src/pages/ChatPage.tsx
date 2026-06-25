import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch } from "@/api/client";
import { Avatar } from "@/components/ui/Avatar";
import type { ContactOut, MessageOut, UserOut } from "@/types";

// ─── Chat panel JSX inline (НЕ отдельный компонент чтобы не терять фокус) ───

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
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  const fetchContacts = async (selectTargetId?: number) => {
    try {
      const data = await apiFetch<ContactOut[]>("/messages/contacts");
      setContacts(data);
      if (selectTargetId) {
        const found = data.find((c) => c.id === selectTargetId);
        if (found) {
          setActiveContact(found);
        } else {
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

  useEffect(() => {
    const timer = setInterval(() => {
      (async () => {
        try {
          const data = await apiFetch<ContactOut[]>("/messages/contacts");
          setContacts((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(data)) return data;
            return prev;
          });
        } catch (e) {
          console.error("Background contacts fetch failed", e);
        }
      })();
      if (activeContact) fetchMessages(activeContact.id);
    }, 5000);
    return () => clearInterval(timer);
  }, [activeContact]);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
        body: JSON.stringify({ receiver_id: activeContact.id, body: bodyText }),
      });
      setMessages((prev) => [...prev, sent]);
      fetchContacts(activeContact.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить сообщение");
      setNewMessage(bodyText);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // ─── JSX шапки + сообщений + инпута — инлайн, не компонент ───────────────
  const chatHeaderJSX = activeContact && (
    <div
      style={{ flexShrink: 0 }}
      className="px-4 py-3 border-b border-outline-variant/15 bg-white flex items-center gap-3 shadow-sm z-10"
    >
      <button
        onClick={() => setActiveContact(null)}
        className="p-2 -ml-1 rounded-full text-on-surface-variant hover:bg-surface-container md:hidden transition-all active:scale-90"
        title="Назад"
      >
        <span className="material-symbols-outlined block text-[22px]">arrow_back</span>
      </button>
      <Avatar name={activeContact.full_name} avatarUrl={activeContact.avatar_url} sizeClass="w-10 h-10" />
      <div className="min-w-0">
        <p className="text-sm font-bold text-on-surface truncate">{activeContact.full_name}</p>
        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
          {activeContact.role === "private_person" ? "Мастер" : "Клиент"}
        </p>
      </div>
    </div>
  );

  const chatMessagesJSX = (
    <div
      style={{ flex: "1 1 0%", overflowY: "auto", overscrollBehavior: "contain" }}
      className="p-4 space-y-3 bg-surface-container-low/70"
    >
      {messages.length === 0 && (
        <div className="h-full flex items-center justify-center">
          <p className="text-sm text-on-surface-variant">Начните переписку!</p>
        </div>
      )}
      {messages.map((m) => {
        const isMe = m.sender_id === currentUser?.id;
        return (
          <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] p-3.5 rounded-[20px] shadow-sm text-sm whitespace-pre-wrap ${
                isMe
                  ? "bg-primary text-white rounded-tr-none"
                  : "bg-white text-on-surface border border-outline-variant/10 rounded-tl-none"
              }`}
            >
              <p className="pb-2">{m.body}</p>
              <div className={`text-[9px] text-right font-semibold select-none ${isMe ? "text-white/70" : "text-on-surface-variant/60"}`}>
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
  );

  const chatInputJSX = (
    <div style={{ flexShrink: 0 }} className="bg-white border-t border-outline-variant/15 shadow-[0_-2px_8px_rgba(0,0,0,0.04)] z-10">
      {error && <div className="px-4 pt-2 text-xs text-error font-bold">{error}</div>}
      <form onSubmit={handleSendMessage} className="p-3 flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Напишите сообщение..."
          className="input-field py-2.5 rounded-full flex-1"
          disabled={isSending}
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
    </div>
  );

  return (
    <>
      {/* ── МОБИЛЬНЫЙ fixed-overlay при открытом чате ── */}
      {activeContact && (
        <div
          className="md:hidden"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: "56px",
            display: "flex",
            flexDirection: "column",
            zIndex: 200,
            backgroundColor: "white",
          }}
        >
          {chatHeaderJSX}
          {chatMessagesJSX}
          {chatInputJSX}
        </div>
      )}

      {/* ── Основной layout (список контактов + десктопный чат) ── */}
      <div className="flex-1 min-h-0 w-full flex overflow-hidden bg-surface-container-lowest border-t lg:border-t-0 border-outline-variant/15 animate-fade-up">

        {/* Список контактов */}
        <div
          className={`w-full md:w-80 border-r border-outline-variant/15 flex flex-col ${
            activeContact ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="p-4 border-b border-outline-variant/15 shrink-0">
            <h2 className="text-xl font-black text-on-surface tracking-tight">Сообщения</h2>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
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
                    <Avatar name={c.full_name} avatarUrl={c.avatar_url} sizeClass="w-10 h-10" />
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

        {/* Десктопная панель чата */}
        {activeContact ? (
          <div className="hidden md:flex flex-col flex-1 min-h-0 overflow-hidden bg-surface-container-low/30">
            {chatHeaderJSX}
            {chatMessagesJSX}
            {chatInputJSX}
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-surface-container-low/30">
            <div className="text-center p-6 max-w-sm">
              <span className="material-symbols-outlined text-5xl text-outline-variant block mb-3">chat_bubble</span>
              <h3 className="text-lg font-black text-on-surface mb-1">Выберите диалог</h3>
              <p className="text-sm text-on-surface-variant">Выберите контакт из списка слева, чтобы начать переписку.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
