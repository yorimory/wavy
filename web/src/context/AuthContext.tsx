import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, getStoredToken, setStoredToken } from "@/api/client";
import type { TokenOut, UserOut, UserRole } from "@/types";

type AuthState = {
  token: string | null;
  user: UserOut | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<UserOut | null>(null);
  const [loading, setLoading] = useState(!!getStoredToken());

  const refreshUser = useCallback(async () => {
    const t = getStoredToken();
    if (!t) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await apiFetch<UserOut>("/users/me");
      setUser(me);
    } catch {
      setStoredToken(null);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const out = await apiFetch<TokenOut>("/auth/login", {
      method: "POST",
      skipAuth: true,
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(out.access_token);
    setToken(out.access_token);
    setLoading(true);
    await refreshUser();
  }, [refreshUser]);

  const register = useCallback(async (email: string, password: string, fullName: string, role: UserRole) => {
    const out = await apiFetch<TokenOut>("/auth/register", {
      method: "POST",
      skipAuth: true,
      body: JSON.stringify({ email, password, full_name: fullName || "", role }),
    });
    setStoredToken(out.access_token);
    setToken(out.access_token);
    setLoading(true);
    await refreshUser();
  }, [refreshUser]);

  const logout = useCallback(() => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ token, user, loading, login, register, logout, refreshUser }),
    [token, user, loading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth вне AuthProvider");
  return ctx;
}
