// lib/sentra/api.ts
//
// Cliente HTTP de Sentra (la API FastAPI en api.cescjavier.dev), pensado
// para ejecutarse SOLO en el navegador ('use client' components):
// - credentials: 'include' es obligatorio para que la cookie httpOnly de
//   refresh (dominio .cescjavier.dev) se guarde y viaje en cada request.
//   Si estas llamadas se hicieran desde el servidor de Next.js, la cookie
//   se quedaría en el servidor y el usuario nunca tendría sesión.
// - El access token (15 min) vive en sessionStorage: se pierde al cerrar
//   la pestaña, y se renueva silenciosamente vía /auth/refresh.

const API_BASE =
  process.env.NEXT_PUBLIC_SENTRA_API_URL ?? 'https://api.cescjavier.dev';

const TOKEN_KEY = 'sentra_access_token';

// Evento global de cambios de sesión: el NavBar (y cualquier componente
// montado en el layout) persiste entre navegaciones del App Router, así
// que un login/logout en una página NO lo remonta. Este evento avisa a
// todos los interesados para que re-verifiquen. Ver useSentraSession().
export const SENTRA_AUTH_EVENT = 'sentra:auth-changed';

function notifyAuthChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(SENTRA_AUTH_EVENT));
}

// Flag en localStorage (persiste entre pestañas/sesiones): "este navegador
// alguna vez inició sesión". Evita que el NavBar dispare un POST /refresh
// en CADA visita de un usuario anónimo que jamás se ha logueado.
const KNOWN_USER_KEY = 'sentra_known_user';

function setKnownUser(known: boolean) {
  if (typeof window === 'undefined') return;
  if (known) localStorage.setItem(KNOWN_USER_KEY, '1');
  else localStorage.removeItem(KNOWN_USER_KEY);
}

export function sentraIsKnownUser(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(KNOWN_USER_KEY) === '1';
}

export interface SentraUser {
  id: string;
  email: string;
  role: string;
  organization_id: string;
  email_verified: boolean;
  plan: string;
}

export class SentraApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  withAuth = false,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (withAuth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    let detail = 'Error inesperado.';
    try {
      const body = await res.json();
      // FastAPI da dos formas de `detail`:
      // - HTTPException: string (ej. "Credenciales inválidas.")
      // - Validación (422): array de objetos {loc, msg, type, ...}.
      // Renderizar ese objeto crudo en React revienta la página
      // (error #31). Aquí lo aplanamos SIEMPRE a un string legible.
      if (typeof body.detail === 'string') {
        detail = body.detail;
      } else if (Array.isArray(body.detail)) {
        detail =
          body.detail
            .map((e: { msg?: string }) => e?.msg)
            .filter(Boolean)
            .join('. ') || detail;
      }
    } catch {
      /* respuesta sin JSON (ej. 502 de Traefik) — se queda el genérico */
    }
    throw new SentraApiError(res.status, detail);
  }

  // 204 No Content (ej. DELETE) no trae body: no intentes parsearlo.
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function sentraRegister(data: {
  email: string;
  password: string;
  organization_name: string;
  marketing_consent?: boolean;
}): Promise<{ message: string }> {
  return request('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function sentraLogin(data: {
  email: string;
  password: string;
}): Promise<void> {
  const res = await request<{ access_token: string }>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  setToken(res.access_token);
  setKnownUser(true);
  notifyAuthChanged();
}

export async function sentraResendVerification(
  email: string,
): Promise<{ message: string }> {
  return request('/api/v1/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

// Intenta renovar el access token con la cookie de refresh. Devuelve true
// si hay sesión viva. Es el "¿sigo logueado?" al montar el panel.
export async function sentraRefresh(): Promise<boolean> {
  try {
    const res = await request<{ access_token: string }>('/api/v1/auth/refresh', {
      method: 'POST',
    });
    setToken(res.access_token);
    setKnownUser(true);
    return true;
  } catch {
    setToken(null);
    setKnownUser(false);
    return false;
  }
}

export async function sentraMe(): Promise<SentraUser> {
  return request('/api/v1/auth/me', { method: 'GET' }, true);
}

export async function sentraLogout(): Promise<void> {
  try {
    await request('/api/v1/auth/logout', { method: 'POST' });
  } finally {
    setToken(null);
    setKnownUser(false);
    notifyAuthChanged();
  }
}

// Cambio de contraseña: el backend revoca TODAS las sesiones y devuelve
// tokens nuevos para esta — actualizamos el access token para que el
// usuario no note el corte.
export async function sentraChangePassword(data: {
  current_password: string;
  new_password: string;
}): Promise<void> {
  const res = await request<{ access_token: string }>(
    '/api/v1/auth/change-password',
    { method: 'POST', body: JSON.stringify(data) },
    true,
  );
  setToken(res.access_token);
}

export function sentraHasToken(): boolean {
  return getToken() !== null;
}

// Para features del portafolio que quieran identificar al usuario logueado
// (ej. el chat de MekaSenku manda este token y el server lo valida contra
// /auth/me). Devuelve null si no hay sesión.
export function sentraGetAccessToken(): string | null {
  return getToken();
}

// ── Billing ─────────────────────────────────────────────────────────

export async function sentraGetSubscription(): Promise<{
  plan: string;
  subscription_status: string | null;
}> {
  return request('/api/v1/billing/subscription', { method: 'GET' }, true);
}

// Devuelve la URL del Checkout hosteado de Lemon Squeezy: el navegador
// debe navegar a ella (window.location.href), no abrirla con fetch.
export async function sentraCreateCheckout(): Promise<string> {
  const res = await request<{ checkout_url: string }>(
    '/api/v1/billing/checkout-session',
    { method: 'POST' },
    true,
  );
  return res.checkout_url;
}

// ── Targets (dominios a auditar) ────────────────────────────────────

export interface SentraTarget {
  id: string;
  domain: string;
  verified: boolean;
  verified_at: string | null;
  created_at: string;
}

export interface SentraTargetCreated extends SentraTarget {
  dns_record_name: string;
  dns_record_value: string;
}

export async function sentraListTargets(): Promise<SentraTarget[]> {
  return request('/api/v1/targets', { method: 'GET' }, true);
}

export async function sentraCreateTarget(domain: string): Promise<SentraTargetCreated> {
  return request(
    '/api/v1/targets',
    { method: 'POST', body: JSON.stringify({ domain }) },
    true,
  );
}

export async function sentraGetInstructions(targetId: string): Promise<SentraTargetCreated> {
  return request(`/api/v1/targets/${targetId}/instructions`, { method: 'GET' }, true);
}

export async function sentraVerifyTarget(
  targetId: string,
): Promise<{ verified: boolean; detail: string }> {
  return request(`/api/v1/targets/${targetId}/verify`, { method: 'POST' }, true);
}

export async function sentraDeleteTarget(targetId: string): Promise<void> {
  await request(`/api/v1/targets/${targetId}`, { method: 'DELETE' }, true);
}

// ── Escaneos ────────────────────────────────────────────────────────

export interface SentraFinding {
  id: string;
  label: string;
  passed: boolean;
  weight: number;
  severity: string;
  recommendation: string | null;
}

export interface SentraScan {
  id: string;
  target_id: string;
  domain: string;
  score: number;
  grade: string;
  created_at: string;
  findings: SentraFinding[] | null;
  detail_locked: boolean;
  scans_remaining: number | null;
}

export async function sentraScanTarget(targetId: string): Promise<SentraScan> {
  return request(`/api/v1/targets/${targetId}/scan`, { method: 'POST' }, true);
}

export async function sentraListScans(targetId: string): Promise<SentraScan[]> {
  return request(`/api/v1/targets/${targetId}/scans`, { method: 'GET' }, true);
}

export interface SentraReport {
  technical: string;
  executive: string;
}

// Reporte con IA: OJO, esta ruta es del PROPIO Next.js (mismo origen), no
// de la API de Sentra — reutiliza el Groq del portafolio. Por eso no pasa
// por `request` (que apunta a api.cescjavier.dev), sino fetch directo.
export async function sentraGenerateReport(payload: {
  domain: string;
  score: number;
  grade: string;
  findings: SentraFinding[];
  lang: string;
}): Promise<SentraReport> {
  const token = getToken();
  const res = await fetch('/api/sentra/report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = 'No se pudo generar el reporte.';
    try {
      detail = (await res.json()).error ?? detail;
    } catch {
      /* sin JSON */
    }
    throw new SentraApiError(res.status, detail);
  }
  return res.json() as Promise<SentraReport>;
}
