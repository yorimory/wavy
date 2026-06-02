import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

/* Floating blob decoration */
function Blob({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden
      className={`absolute rounded-full blur-3xl opacity-60 pointer-events-none ${className ?? ""}`}
      style={style}
    />
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate("/");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Неверный логин или пароль");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-bg min-h-screen flex items-center justify-center p-4 overflow-hidden relative">
      {/* Background blobs */}
      <Blob className="w-[500px] h-[500px] bg-violet-300/50" style={{ top: "-120px", left: "-100px" }} />
      <Blob className="w-[400px] h-[400px] bg-purple-400/30" style={{ bottom: "-80px", right: "-80px" }} />
      <Blob className="w-[300px] h-[300px] bg-indigo-300/40" style={{ top: "40%", left: "60%" }} />

      {/* Decorative floating rings */}
      <div
        aria-hidden
        className="absolute w-[700px] h-[700px] rounded-full border border-primary/8 pointer-events-none"
        style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
      />
      <div
        aria-hidden
        className="absolute w-[900px] h-[900px] rounded-full border border-primary/5 pointer-events-none"
        style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-[420px] rounded-[32px] p-8 md:p-10"
        style={{
          background: "rgba(255,255,255,0.75)",
          backdropFilter: "blur(24px) saturate(1.8)",
          WebkitBackdropFilter: "blur(24px) saturate(1.8)",
          boxShadow: "0 24px 64px rgba(79,55,138,0.16), 0 2px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
          border: "1px solid rgba(255,255,255,0.6)",
          animation: "scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div
            className="w-16 h-16 rounded-[22px] primary-gradient flex items-center justify-center mb-4 shadow-glow"
            style={{ animation: "glowPulse 2.5s ease-in-out infinite" }}
          >
            <span
              className="material-symbols-outlined text-white text-[32px]"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}
            >
              waves
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight" style={{ background: "linear-gradient(135deg,#3a2470,#6750a4,#9c6fde)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            WAVY CRM
          </h1>
          <p className="text-sm text-on-surface-variant mt-1 font-medium">
            Войдите в свой кабинет
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label className="section-label">Email</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/50 text-[18px]">
                mail
              </span>
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
            <label className="section-label">Пароль</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/50 text-[18px]">
                lock
              </span>
              <input
                className="input-field pl-11 pr-12"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 hover:text-on-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPw ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          {/* Error */}
          {err && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-error/6 border border-error/15 text-error text-sm font-semibold">
              <span className="material-symbols-outlined text-[16px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
              {err}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-4 rounded-2xl primary-gradient text-white font-bold text-base shadow-glow
                       hover:shadow-glow transition-all duration-200 active:scale-[0.98]
                       disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none mt-2"
          >
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                Входим…
              </span>
            ) : (
              "Войти"
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-on-surface-variant">
          Нет аккаунта?{" "}
          <Link to="/register" className="text-primary font-bold hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}
