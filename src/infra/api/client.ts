/** URL base da API Fastify + MySQL */
export const TOKEN_KEY = "agro_sara_token";

export function getApiBase(): string {
  const v = import.meta.env.VITE_API_URL as string | undefined;
  return (v && v.replace(/\/$/, "")) || "http://127.0.0.1:4000";
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json; charset=utf-8");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${getApiBase()}${path}`, { ...init, headers });
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new CustomEvent("agro-auth-expired"));
    throw new Error("Sessão expirada ou inválida. Faça login novamente.");
  }
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = (await res.json()) as { message?: string; issues?: unknown };
      msg = j.message ?? JSON.stringify(j);
    } catch {
      try {
        msg = await res.text();
      } catch {
        /* ignore */
      }
    }
    throw new Error(msg || `Erro ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function clearAuthStorage(): void {
  localStorage.removeItem(TOKEN_KEY);
}
