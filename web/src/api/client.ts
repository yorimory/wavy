const TOKEN_KEY = "wavy_access_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function apiBase(): string {
  const fromEnv = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (import.meta.env.DEV) return "/api";
  return "http://localhost:8000";
}

function joinUrl(path: string): string {
  const base = apiBase();
  if (!path.startsWith("/")) return `${base}/${path}`;
  return `${base}${path}`;
}

async function parseError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { detail?: unknown };
    const d = j.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return d.map((x) => JSON.stringify(x)).join("; ");
    return res.statusText || "Ошибка запроса";
  } catch {
    return res.statusText || "Ошибка запроса";
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (!init.skipAuth) {
    const t = getStoredToken();
    if (t) headers.set("Authorization", `Bearer ${t}`);
  }
  const res = await fetch(joinUrl(path), { ...init, headers });
  if (res.status === 204) return undefined as T;
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as T;
}

export { apiBase };
