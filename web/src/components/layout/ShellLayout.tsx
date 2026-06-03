import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { isClient, isPrivatePerson, isModerator, ROLE_LABELS } from "@/utils/roles";
import { ReviewModal } from "@/components/ReviewModal";
import { getAvatarUrl } from "@/api/client";

/* ── Desktop sidebar nav class ── */
const NAV_CLS_BASE =
  "flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 cursor-pointer relative";

function navCls({ isActive }: { isActive: boolean }) {
  return isActive
    ? `${NAV_CLS_BASE} text-primary bg-primary/10 font-bold`
    : `${NAV_CLS_BASE} text-on-surface-variant hover:bg-primary/5 hover:text-primary`;
}

/* ── Icons: filled when active ── */
function NavIcon({ icon, active }: { icon: string; active?: boolean }) {
  return (
    <span
      className="material-symbols-outlined text-[20px] shrink-0"
      style={{ fontVariationSettings: active ? "'FILL' 1, 'wght' 600" : "'FILL' 0, 'wght' 300" }}
    >
      {icon}
    </span>
  );
}

/* ── Avatar initials or image ── */
function Avatar({ name, email, avatarUrl }: { name?: string | null; email?: string | null; avatarUrl?: string | null }) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : (email?.[0] ?? "U").toUpperCase();
  return (
    <div className="w-9 h-9 rounded-none primary-gradient flex items-center justify-center text-white font-black text-sm shrink-0 shadow-glow-sm overflow-hidden border border-outline-variant/15">
      {avatarUrl ? (
        <img src={getAvatarUrl(avatarUrl)} alt={name || "Avatar"} className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}

/* ── Mobile bottom tab item ── */
function MobileTab({
  to,
  end,
  icon,
  label,
}: {
  to: string;
  end?: boolean;
  icon: string;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all ${
          isActive ? "text-primary" : "text-on-surface-variant/60"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className="material-symbols-outlined text-[24px] transition-transform duration-200"
            style={{
              fontVariationSettings: isActive
                ? "'FILL' 1, 'wght' 600"
                : "'FILL' 0, 'wght' 300",
              transform: isActive ? "scale(1.1)" : "scale(1)",
            }}
          >
            {icon}
          </span>
          <span className={`text-[10px] font-bold leading-none ${isActive ? "text-primary" : "text-on-surface-variant/60"}`}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

export function ShellLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const privatePerson = isPrivatePerson(user);
  const client = isClient(user);
  const moderator = isModerator(user);
  const calendarFullBleed = privatePerson && location.pathname === "/calendar";

  /* Mobile tabs */
  const mobileTabs = moderator
    ? [
        { to: "/moderator", end: true, icon: "shield", label: "Панель" },
        { to: "/messages", icon: "chat", label: "Чат" },
        { to: "/settings", icon: "settings", label: "Настройки" },
      ]
    : privatePerson
    ? [
        { to: "/", end: true, icon: "dashboard", label: "Главная" },
        { to: "/services", icon: "spa", label: "Услуги" },
        { to: "/calendar", icon: "calendar_month", label: "Календарь" },
        { to: "/clients", icon: "group", label: "Клиенты" },
        { to: "/settings", icon: "settings", label: "Настройки" },
      ]
    : [
        { to: "/home", end: true, icon: "home", label: "Главная" },
        { to: "/search", icon: "search", label: "Поиск" },
        { to: "/my-bookings", icon: "event_note", label: "Записи" },
        { to: "/settings", icon: "person", label: "Профиль" },
      ];

  return (
    <div className="flex min-h-screen bg-background flex-col lg:flex-row">
      {client && <ReviewModal />}

      {/* ─────────────── Mobile top bar (logo only) ─────────────── */}
      <header
        className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 shrink-0"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(203,196,210,0.25)",
          boxShadow: "0 1px 12px rgba(79,55,138,0.06)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl primary-gradient flex items-center justify-center shadow-glow-sm">
            <span
              className="material-symbols-outlined text-white text-[17px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              waves
            </span>
          </div>
          <span className="font-black text-primary text-lg tracking-tight">WAVY</span>
        </div>

        {/* Right side: user avatar + role + logout */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-on-surface-variant/60 font-semibold hidden xs:block">
            {user ? ROLE_LABELS[user.role] : ""}
          </span>
          {user && (
            <button
              type="button"
              className="w-9 h-9 flex items-center justify-center rounded-xl text-on-surface-variant/70 hover:bg-surface-container active:scale-95 transition-all mr-1"
              onClick={() => navigate("/messages")}
              title="Сообщения"
            >
              <span className="material-symbols-outlined text-[20px]">forum</span>
            </button>
          )}
          <Avatar name={user?.full_name} email={user?.email} avatarUrl={user?.avatar_url} />
          <button
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-on-surface-variant/70 hover:text-error hover:bg-error/10 active:scale-95 transition-all"
            onClick={() => { logout(); navigate("/login"); }}
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </header>

      {/* ─────────────── Desktop Sidebar ─────────────── */}
      <aside
        className="hidden lg:flex flex-col h-screen sticky top-0 w-64 shrink-0 z-40 border-r border-outline-variant/15"
        style={{
          background: "linear-gradient(180deg, #fdfaff 0%, #f8f3ff 100%)",
          boxShadow: "4px 0 32px rgba(79,55,138,0.07)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3.5 px-6 pt-7 pb-6">
          <div className="w-11 h-11 rounded-2xl primary-gradient flex items-center justify-center shadow-glow-sm shrink-0">
            <span
              className="material-symbols-outlined text-white text-[22px]"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}
            >
              waves
            </span>
          </div>
          <div>
            <h1 className="text-xl font-black text-on-surface tracking-tight leading-none">WAVY</h1>
            <p className="text-[10px] text-on-surface-variant/60 uppercase tracking-[0.14em] font-bold mt-0.5">
              {user ? ROLE_LABELS[user.role] : "CRM"}
            </p>
          </div>
        </div>

        <div className="mx-5 mb-4 h-px bg-outline-variant/15" />
        <p className="section-label px-6 mb-2">Навигация</p>

        <nav className="flex-1 flex flex-col gap-0.5 px-3 overflow-y-auto">
          {privatePerson && (
            <>
              <NavLink to="/" end className={navCls}>
                {({ isActive }) => (<><NavIcon icon="dashboard" active={isActive} />Главная</>)}
              </NavLink>
              <NavLink to="/services" className={navCls}>
                {({ isActive }) => (<><NavIcon icon="spa" active={isActive} />Услуги</>)}
              </NavLink>
              <NavLink to="/calendar" className={navCls}>
                {({ isActive }) => (<><NavIcon icon="calendar_month" active={isActive} />Календарь</>)}
              </NavLink>
              <NavLink to="/clients" className={navCls}>
                {({ isActive }) => (<><NavIcon icon="group" active={isActive} />Клиенты</>)}
              </NavLink>
            </>
          )}
          {client && (
            <>
              <NavLink to="/home" end className={navCls}>
                {({ isActive }) => (<><NavIcon icon="home" active={isActive} />Главная</>)}
              </NavLink>
              <NavLink to="/search" className={navCls}>
                {({ isActive }) => (<><NavIcon icon="search" active={isActive} />Поиск услуг</>)}
              </NavLink>
              <NavLink to="/my-bookings" className={navCls}>
                {({ isActive }) => (<><NavIcon icon="event_note" active={isActive} />Мои записи</>)}
              </NavLink>
            </>
          )}
          {moderator && (
            <NavLink to="/moderator" end className={navCls}>
              {({ isActive }) => (<><NavIcon icon="shield" active={isActive} />Панель модератора</>)}
            </NavLink>
          )}
          
          <div className="mt-2 mx-2 h-px bg-outline-variant/10" />
          
          <NavLink to="/messages" className={navCls}>
            {({ isActive }) => (<><NavIcon icon="chat" active={isActive} />Сообщения</>)}
          </NavLink>
          <NavLink to="/support" className={navCls}>
            {({ isActive }) => (<><NavIcon icon="help" active={isActive} />Поддержка</>)}
          </NavLink>
          <NavLink to="/settings" className={navCls}>
            {({ isActive }) => (<><NavIcon icon="settings" active={isActive} />{client ? "Профиль" : "Настройки"}</>)}
          </NavLink>
        </nav>

        {/* New appointment CTA */}
        {privatePerson && (
          <div className="px-4 pb-4">
            <button
              type="button"
              className="w-full py-3.5 px-5 primary-gradient text-white rounded-2xl font-bold text-sm
                         shadow-glow-sm hover:shadow-glow transition-all duration-200
                         hover:opacity-95 active:scale-[0.97] flex items-center justify-center gap-2"
              onClick={() => navigate("/calendar?new=1")}
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                add_circle
              </span>
              Новая запись
            </button>
          </div>
        )}

        {/* User info + logout */}
        <div className="mx-4 mb-5 pt-4 border-t border-outline-variant/15">
          <div className="flex items-center gap-3 px-2 py-2 rounded-2xl hover:bg-primary/5 transition-all group">
            <Avatar name={user?.full_name} email={user?.email} avatarUrl={user?.avatar_url} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-on-surface truncate leading-tight">
                {user?.full_name ?? "Пользователь"}
              </p>
              <p className="text-[11px] text-on-surface-variant/70 truncate">{user?.email}</p>
            </div>
            <button
              type="button"
              title="Выйти"
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl
                         text-on-surface-variant/40 hover:text-error hover:bg-error/10
                         transition-all opacity-0 group-hover:opacity-100"
              onClick={() => { logout(); navigate("/login"); }}
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ─────────────── Main content ─────────────── */}
      <main
        className={
          (calendarFullBleed || location.pathname === "/messages")
            ? "flex-1 h-[calc(100dvh-112px)] lg:h-screen w-full p-0 lg:p-8 overflow-hidden"
            : `flex-1 min-h-screen w-full ${
                privatePerson
                  ? "px-4 pt-4 pb-24 md:px-8 md:pt-8 md:pb-8 lg:p-10 max-w-6xl mx-auto"
                  : "px-4 pt-4 pb-24 md:px-8 md:pt-8 md:pb-8 lg:p-10 max-w-4xl mx-auto"
              }`
        }
      >
        <Outlet />
      </main>

      {/* ─────────────── Mobile bottom tab bar ─────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(20px) saturate(1.8)",
          WebkitBackdropFilter: "blur(20px) saturate(1.8)",
          borderTop: "1px solid rgba(203,196,210,0.25)",
          boxShadow: "0 -4px 24px rgba(79,55,138,0.08)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {mobileTabs.map((tab) => (
          <MobileTab
            key={tab.to}
            to={tab.to}
            end={tab.end}
            icon={tab.icon}
            label={tab.label}
          />
        ))}
      </nav>
    </div>
  );
}
