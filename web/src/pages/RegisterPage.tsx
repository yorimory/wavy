import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { homePathForRole, ROLE_LABELS } from "@/utils/roles";
import type { UserRole } from "@/types";

const ROLES: { value: UserRole; icon: string; desc: string; color: string }[] = [
  {
    value: "private_person",
    icon: "work",
    desc: "Веду клиентов, расписание и CRM",
    color: "from-violet-500 to-purple-600",
  },
  {
    value: "client",
    icon: "event_available",
    desc: "Записываюсь к специалистам",
    color: "from-blue-500 to-indigo-600",
  },
];

function PasswordStrength({ password }: { password: string }) {
  const len = password.length;
  const hasNum = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const score = len === 0 ? 0 : len < 6 ? 1 : len < 10 && !hasNum ? 2 : hasNum && hasSpecial ? 4 : 3;
  const labels = ["", "Слабый", "Средний", "Хороший", "Отличный"];
  const colors = ["", "bg-red-400", "bg-amber-400", "bg-emerald-400", "bg-emerald-500"];
  if (!password) return null;
  return (
    <div className="space-y-1.5 mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? colors[score] : "bg-outline-variant/30"}`}
          />
        ))}
      </div>
      <p className={`text-xs font-semibold ${score >= 3 ? "text-emerald-600" : score === 2 ? "text-amber-600" : "text-red-500"}`}>
        {labels[score]}
      </p>
    </div>
  );
}

function Blob({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      aria-hidden
      className={`absolute rounded-full blur-3xl opacity-50 pointer-events-none ${className ?? ""}`}
      style={style}
    />
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!role) { setErr("Выберите роль"); return; }
    if (password.length < 6) { setErr("Пароль должен быть минимум 6 символов"); return; }
    setErr(null);
    setBusy(true);
    try {
      await register(email.trim(), password, fullName.trim(), role);
      navigate(homePathForRole(role));
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Ошибка регистрации");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-bg min-h-screen flex items-center justify-center p-4 overflow-hidden relative">
      <Blob className="w-[500px] h-[500px] bg-violet-300/50" style={{ top: "-100px", right: "-100px" }} />
      <Blob className="w-[400px] h-[400px] bg-indigo-300/40" style={{ bottom: "-80px", left: "-80px" }} />
      <Blob className="w-[300px] h-[300px] bg-purple-300/30" style={{ top: "40%", left: "55%" }} />

      <div
        className="relative w-full max-w-[480px] rounded-[32px] p-8 md:p-10"
        style={{
          background: "rgba(255,255,255,0.78)",
          backdropFilter: "blur(24px) saturate(1.8)",
          WebkitBackdropFilter: "blur(24px) saturate(1.8)",
          boxShadow: "0 24px 64px rgba(79,55,138,0.15), 0 2px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
          border: "1px solid rgba(255,255,255,0.6)",
          animation: "scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
        }}
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-7 text-center">
          <div className="w-14 h-14 rounded-[20px] primary-gradient flex items-center justify-center mb-3 shadow-glow-sm">
            <span className="material-symbols-outlined text-white text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              person_add
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight" style={{ background: "linear-gradient(135deg,#3a2470,#6750a4,#9c6fde)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Регистрация
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">Создайте аккаунт в WAVY CRM</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Role selector */}
          <fieldset>
            <legend className="section-label mb-2 block">
              Я хочу… <span className="text-error">*</span>
            </legend>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map((r) => (
                <label
                  key={r.value}
                  className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 cursor-pointer transition-all text-center ${
                    role === r.value
                      ? "border-primary bg-primary/5 shadow-glow-sm"
                      : "border-outline-variant/30 hover:border-primary/40 bg-white/60"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={role === r.value}
                    onChange={() => setRole(r.value)}
                    className="sr-only"
                  />
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${r.color}`}>
                    <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {r.icon}
                    </span>
                  </div>
                  <div>
                    <p className={`font-bold text-sm ${role === r.value ? "text-primary" : "text-on-surface"}`}>
                      {ROLE_LABELS[r.value]}
                    </p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5 leading-tight">{r.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="border-t border-outline-variant/15 pt-4 space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="section-label">Имя</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/50 text-[18px]">badge</span>
                <input
                  className="input-field pl-11"
                  placeholder={role === "client" ? "Ваше имя" : "Как вас представлять"}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="section-label">Email</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/50 text-[18px]">mail</span>
                <input
                  className="input-field pl-11"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="section-label">Пароль (мин. 6 символов)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/50 text-[18px]">lock</span>
                <input
                  className="input-field pl-11 pr-12"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 hover:text-on-surface-variant transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">{showPw ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>
          </div>

          {err && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-error/6 border border-error/15 text-error text-sm font-semibold">
              <span className="material-symbols-outlined text-[16px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !role}
            className="w-full py-4 rounded-2xl primary-gradient text-white font-bold text-sm shadow-glow hover:opacity-95
                       transition-all duration-200 active:scale-[0.98]
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                Создаём аккаунт…
              </span>
            ) : role ? (
              `Зарегистрироваться как «${ROLE_LABELS[role]}»`
            ) : (
              "Выберите роль выше"
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-on-surface-variant">
          Уже есть аккаунт?{" "}
          <Link to="/login" className="text-primary font-bold hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
