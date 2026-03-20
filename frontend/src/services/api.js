// All API calls go through this file
// The Anthropic key NEVER touches the frontend

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ── Auth helpers ─────────────────────────────────────────────
function getToken() { return localStorage.getItem("token"); }
function setToken(t) { localStorage.setItem("token", t); }
function clearToken() { localStorage.removeItem("token"); }

async function req(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Auth ─────────────────────────────────────────────────────
export const auth = {
  register: (name, email, password) => req("POST", "/api/auth/register", { name, email, password }),
  login:    (email, password)        => req("POST", "/api/auth/login",    { email, password }),
  me:       ()                       => req("GET",  "/api/auth/me"),
  logout:   ()                       => clearToken(),
};

// ── AI Streaming ─────────────────────────────────────────────
// Returns a ReadableStream — the backend proxies to Anthropic
// Your API key never leaves the server
export async function streamAI({ feature, context, onToken, onDone, onError }) {
  const token = getToken();
  const res = await fetch(`${BASE}/api/ai/stream`, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ feature, context }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "AI request failed" }));
    onError?.(err.error || "AI request failed");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const lines = decoder.decode(value).split("\n");
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.text)                    onToken?.(data.text);
        if (data.feature || data.creditsUsed) onDone?.(data);
      } catch {}
    }
  }
}

// ── Credits ──────────────────────────────────────────────────
export const credits = {
  get:   () => req("GET", "/api/ai/credits"),
  costs: () => req("GET", "/api/ai/costs"),
};

// ── Campaigns ────────────────────────────────────────────────
export const campaigns = {
  list:       ()           => req("GET",    "/api/campaigns"),
  create:     (data)       => req("POST",   "/api/campaigns", data),
  get:        (id)         => req("GET",    `/api/campaigns/${id}`),
  update:     (id, data)   => req("PATCH",  `/api/campaigns/${id}`, data),
  delete:     (id)         => req("DELETE", `/api/campaigns/${id}`),
  saveOutput: (id, stage, output) => req("POST", `/api/campaigns/${id}/output`, { stage, output }),
};

// ── Platforms ─────────────────────────────────────────────────
export const platforms = {
  list:       ()           => req("GET",    "/api/platforms"),
  connect:    (data)       => req("POST",   "/api/platforms/connect", data),
  disconnect: (platform)   => req("DELETE", `/api/platforms/${platform}`),
  stats:      (platform)   => req("GET",    `/api/platforms/${platform}/stats`),
};

// ── PayPal ───────────────────────────────────────────────────
export const paypal = {
  checkout: (plan)           => req("POST", "/api/paypal/checkout", { plan }),
  verify:   (subscriptionId) => req("POST", "/api/paypal/verify",   { subscriptionId }),
};

// ── User ─────────────────────────────────────────────────────
export const user = {
  profile:    ()     => req("GET",   "/api/user/profile"),
  usage:      ()     => req("GET",   "/api/user/usage"),
  updateName: (name) => req("PATCH", "/api/user/profile", { name }),
};

export { getToken, setToken, clearToken };
