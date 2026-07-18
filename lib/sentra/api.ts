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
      detail = body.detail ?? detail;
    } catch {
      /* respuesta sin JSON (ej. 502 de Traefik) — se queda el genérico */
    }
    throw new SentraApiError(res.status, detail);
  }

  return res.json() as Promise<T>;
}

export async function sentraRegister(data: {
  email: string;
  password: string;
  organization_name: string;
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
