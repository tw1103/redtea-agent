export type ModelProvider = "openai" | "deepseek";
export type SessionModelConfig = {
  apiKey: string;
  model: string;
  provider: ModelProvider;
  baseUrl?: string;
  proxyUrl?: string;
  updatedAt: number;
};

const SESSION_COOKIE = "ea_model_session";
const MAX_AGE_SECONDS = 60 * 60 * 12;
const configs = new Map<string, SessionModelConfig>();

function cleanupExpired() {
  const cutoff = Date.now() - MAX_AGE_SECONDS * 1000;
  for (const [id, config] of configs) if (config.updatedAt < cutoff) configs.delete(id);
}

export function readSessionId(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  return cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
}

export function getSessionModelConfig(request: Request) {
  cleanupExpired();
  const id = readSessionId(request);
  return id ? configs.get(id) : undefined;
}

export function saveSessionModelConfig(sessionId: string, config: Omit<SessionModelConfig, "updatedAt">) {
  cleanupExpired();
  configs.set(sessionId, { ...config, updatedAt: Date.now() });
}

export function removeSessionModelConfig(request: Request) {
  const id = readSessionId(request);
  if (id) configs.delete(id);
}

export const sessionCookie = { name: SESSION_COOKIE, maxAge: MAX_AGE_SECONDS };
