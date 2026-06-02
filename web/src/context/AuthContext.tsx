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

  // Listen for Expo Push Token messages from React Native WebView
  useEffect(() => {
    const handleMessage = (event: any) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "expo_push_token" && data.token) {
          localStorage.setItem("expo_push_token", data.token);
          if (token && user) {
            apiFetch("/users/me/push-token", {
              method: "POST",
              body: JSON.stringify({ expo_push_token: data.token }),
            }).catch((err) => console.error("Error sending push token", err));
          }
        }
      } catch (e) {
        // Not a JSON message
      }
    };
    window.addEventListener("message", handleMessage);
    document.addEventListener("message", handleMessage as any);

    return () => {
      window.removeEventListener("message", handleMessage);
      document.removeEventListener("message", handleMessage as any);
    };
  }, [token, user]);

  // Auto upload push token from localStorage if user is authenticated
  useEffect(() => {
    const storedToken = localStorage.getItem("expo_push_token");
    if (token && user && storedToken) {
      // Avoid infinite upload loop
      if (user.expo_push_token !== storedToken) {
        apiFetch<UserOut>("/users/me/push-token", {
          method: "POST",
          body: JSON.stringify({ expo_push_token: storedToken }),
        })
          .then((updatedUser) => {
            setUser(updatedUser);
          })
          .catch((err) => console.error("Error uploading stored push token", err));
      }
    }
  }, [token, user]);

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
