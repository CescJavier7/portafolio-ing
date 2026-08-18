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
  name: string | null;
  role: string;
  organization_id: string;
  organization_name: string | null;
  email_verified: boolean;
  plan: string;
}

export async function sentraUpdateProfile(data: {
  name?: string | null;
  organization_name?: string;
}): Promise<SentraUser> {
  return request('/api/v1/auth/profile', { method: 'PATCH', body: JSON.stringify(data) }, true);
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

// Extrae RIGUROSAMENTE el motivo de un error del backend, en este orden:
//   1) JSON `detail` string (HTTPException de FastAPI).
//   2) JSON `detail` array (validación 422: [{loc,msg,...}]) → se aplana.
//   3) JSON `error` string (rutas de Next.js, ej. /api/sentra/report).
//   4) Cuerpo de TEXTO plano (ej. HTML de 502/504 de Cloudflare/Traefik) → extracto.
//   5) Último recurso: el código HTTP, para que SIEMPRE se vea un porqué.
// Nunca devuelve vacío → el recuadro rojo jamás queda "ciego".
async function readErrorDetail(res: Response): Promise<string> {
  try {
    const body = await res.clone().json();
    if (typeof body?.detail === 'string') return body.detail;
    if (Array.isArray(body?.detail)) {
      const msg = body.detail.map((e: { msg?: string }) => e?.msg).filter(Boolean).join('. ');
      if (msg) return msg;
    }
    if (typeof body?.error === 'string') return body.error;
  } catch {
    /* no era JSON */
  }
  try {
    const txt = (await res.text())?.trim();
    if (txt) return txt.length > 300 ? `${txt.slice(0, 300)}…` : txt;
  } catch {
    /* sin cuerpo legible */
  }
  return `Error ${res.status} del servidor.`;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  withAuth = false,
  timeoutMs = 120000, // la generación con IA puede tardar; alineado con Traefik/uvicorn (120s)
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // El token se lee en CADA intento (tras un refresh silencioso hay uno nuevo).
  const doFetch = async (): Promise<Response> => {
    const h: Record<string, string> = { ...headers };
    if (withAuth) {
      const token = getToken();
      if (token) h['Authorization'] = `Bearer ${token}`;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: h,
        credentials: 'include',
        signal: controller.signal,
      });
    } catch (err) {
      // fetch RECHAZA (no responde) por: red caída, DNS, CORS, o abort (timeout).
      // Siempre lo convertimos en un SentraApiError con motivo concreto (no ciego).
      if ((err as Error)?.name === 'AbortError') {
        throw new SentraApiError(0, 'La solicitud tardó demasiado y se canceló. Inténtalo de nuevo.');
      }
      throw new SentraApiError(0, 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      clearTimeout(timer);
    }
  };

  let res = await doFetch();

  // Access token caducado (15 min): la sesión sigue viva vía la cookie de
  // refresh. Hacemos UN refresh silencioso y reintentamos. Esto elimina el
  // "No autorizado." que aparecía al pulsar "Mejorar con IA" tras editar un
  // rato (el token había expirado). Solo para peticiones autenticadas; el
  // propio /auth/refresh usa withAuth=false, así que no hay bucle.
  if (res.status === 401 && withAuth) {
    const refreshed = await sentraRefresh();
    if (refreshed) res = await doFetch();
  }

  if (!res.ok) {
    throw new SentraApiError(res.status, await readErrorDetail(res));
  }

  if (res.status === 204) return undefined as T; // DELETE sin cuerpo
  try {
    return (await res.json()) as T;
  } catch {
    throw new SentraApiError(res.status, 'El servidor devolvió una respuesta inválida.');
  }
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

// ── Escaneo público gratuito (el gancho, sin login ni verificación) ──

export interface SentraFreeScan {
  domain: string;
  score: number;
  grade: string;
  scanned_at: string;
  findings: SentraFinding[];
}

// No requiere sesión: es el escáner público. Solo información pública
// (headers, TLS, DNS/SPF/DMARC), sin verificación de dominio.
export async function sentraFreeScan(domain: string): Promise<SentraFreeScan> {
  return request('/api/v1/free/scan', { method: 'POST', body: JSON.stringify({ domain }) });
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

// Portal de cliente de Lemon Squeezy: gestionar método de pago / cancelar.
export async function sentraGetBillingPortal(): Promise<string> {
  const res = await request<{ portal_url: string }>('/api/v1/billing/portal', { method: 'GET' }, true);
  return res.portal_url;
}

// ── Cobros manuales (MVP Ecuador) ───────────────────────────────────
export interface SentraPayMethod {
  key: string;
  label: string;
  instructions: string;
  image?: string | null; // QR (De Una) u otra imagen para escanear/pagar
  url?: string | null; // enlace de pago (PayPhone/PayPal) → botón "Pagar"
}
export interface SentraManualConfig {
  price_pro: string;
  price_team: string;
  contact: string;
  methods: SentraPayMethod[];
  payphone_auto?: boolean; // cobro con tarjeta automático (PayPhone) activo
}
export interface SentraPaymentRequest {
  id: string;
  plan: string;
  method: string;
  reference: string;
  note: string;
  amount: string;
  status: string; // pending | approved | rejected
  created_at: string;
  reviewed_at: string | null;
}
export interface SentraPendingPayment extends SentraPaymentRequest {
  organization_id: string;
  organization_name: string;
  user_email: string;
}

export async function sentraManualConfig(): Promise<SentraManualConfig> {
  return request('/api/v1/billing/manual/config', { method: 'GET' }, true);
}
export async function sentraSubmitPayment(data: {
  plan: string;
  method: string;
  reference: string;
  note?: string;
}): Promise<SentraPaymentRequest> {
  return request('/api/v1/billing/manual/request', { method: 'POST', body: JSON.stringify(data) }, true);
}
export async function sentraMyPayments(): Promise<SentraPaymentRequest[]> {
  return request('/api/v1/billing/manual/mine', { method: 'GET' }, true);
}

// ── PayPhone (cobro con tarjeta automático) ──────────────────────────
export async function sentraPayphonePrepare(): Promise<{ pay_url: string; client_transaction_id: string }> {
  return request('/api/v1/billing/payphone/prepare', { method: 'POST' }, true);
}
// Confirmación tras la redirección de PayPhone. SIN auth: la identidad la da
// el par (id, clientTransactionId) verificado contra PayPhone (ver backend).
export async function sentraPayphoneConfirm(
  id: number,
  clientTransactionId: string
): Promise<{ status: string; plan?: string }> {
  return request('/api/v1/billing/payphone/confirm', {
    method: 'POST',
    body: JSON.stringify({ id, clientTransactionId }),
  });
}
export async function sentraPendingPayments(): Promise<SentraPendingPayment[]> {
  return request('/api/v1/billing/manual/pending', { method: 'GET' }, true);
}
export async function sentraApprovePayment(id: string): Promise<void> {
  await request(`/api/v1/billing/manual/${id}/approve`, { method: 'POST' }, true);
}
export async function sentraRejectPayment(id: string): Promise<void> {
  await request(`/api/v1/billing/manual/${id}/reject`, { method: 'POST' }, true);
}

// ── Targets (dominios a auditar) ────────────────────────────────────

export interface SentraTarget {
  id: string;
  domain: string;
  verified: boolean;
  verified_at: string | null;
  created_at: string;
  monitoring_enabled: boolean;
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

export async function sentraSetMonitoring(targetId: string, enabled: boolean): Promise<SentraTarget> {
  return request(
    `/api/v1/targets/${targetId}/monitoring`,
    { method: 'PATCH', body: JSON.stringify({ enabled }) },
    true,
  );
}

// ── Descubrimiento de superficie ────────────────────────────────────

export interface SentraSurface {
  domain: string;
  subdomains: { name: string; ip: string }[];
  ports: { port: number; service: string; risk: string }[];
  technologies: string[];
  id?: string | null;
  created_at?: string | null;
}

export async function sentraDiscoverSurface(targetId: string): Promise<SentraSurface> {
  return request(`/api/v1/targets/${targetId}/discover`, { method: 'POST' }, true);
}

// Última superficie persistida (o null si nunca se descubrió) — para
// mostrarla al instante al entrar a la sección, sin re-descubrir.
export async function sentraGetLatestSurface(targetId: string): Promise<SentraSurface | null> {
  return request(`/api/v1/targets/${targetId}/discover`, { method: 'GET' }, true);
}

// ── Inteligencia de exposición ──────────────────────────────────────

export interface SentraExposureRoute {
  id: string;
  title: string;
  severity: string; // critica | alta | media | baja
  evidence: string[];
  impact: string;
  recommendation: string;
  references: SentraReference[];
}

export interface SentraExposure {
  domain: string;
  routes: SentraExposureRoute[];
  counts: Record<string, number>;
  id?: string | null;
  created_at?: string | null;
}

export async function sentraAnalyzeExposure(targetId: string): Promise<SentraExposure> {
  return request(`/api/v1/targets/${targetId}/exposure`, { method: 'POST' }, true);
}

export async function sentraGetLatestExposure(targetId: string): Promise<SentraExposure | null> {
  return request(`/api/v1/targets/${targetId}/exposure`, { method: 'GET' }, true);
}

// ── Escaneos ────────────────────────────────────────────────────────

export interface SentraReference {
  framework: string;
  ref: string;
  title: string;
}

export interface SentraFinding {
  id: string;
  label: string;
  passed: boolean;
  weight: number;
  severity: string;
  recommendation: string | null;
  category?: string | null;
  references?: SentraReference[];
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
  ai_report?: SentraReport | null;
}

export async function sentraScanTarget(targetId: string): Promise<SentraScan> {
  return request(`/api/v1/targets/${targetId}/scan`, { method: 'POST' }, true);
}

export async function sentraListScans(targetId: string): Promise<SentraScan[]> {
  return request(`/api/v1/targets/${targetId}/scans`, { method: 'GET' }, true);
}

export interface SentraReport {
  executive: string;
  priorities: string;
  technical: string;
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

// Persiste el informe en el escaneo (best-effort): en la próxima visita se
// carga al instante. Va a la API de Sentra (no a la ruta de Groq).
export async function sentraSaveReport(targetId: string, scanId: string, report: SentraReport): Promise<void> {
  await request(`/api/v1/targets/${targetId}/scans/${scanId}/report`, { method: 'PUT', body: JSON.stringify(report) }, true);
}

// ── API keys (acceso programático a la API pública) ─────────────────

export interface SentraApiKey {
  id: string;
  name: string;
  key_prefix: string;
  revoked: boolean;
  last_used_at: string | null;
  created_at: string;
}

export interface SentraApiKeyCreated extends SentraApiKey {
  key: string; // valor crudo — solo viaja en la respuesta de creación
}

export async function sentraListApiKeys(): Promise<SentraApiKey[]> {
  return request('/api/v1/api-keys', { method: 'GET' }, true);
}

export async function sentraCreateApiKey(name: string): Promise<SentraApiKeyCreated> {
  return request('/api/v1/api-keys', { method: 'POST', body: JSON.stringify({ name }) }, true);
}

export async function sentraRevokeApiKey(keyId: string): Promise<void> {
  await request(`/api/v1/api-keys/${keyId}`, { method: 'DELETE' }, true);
}

// ── Equipo (RBAC) ─────────────────────────────────────────────────────

export interface SentraTeamMember {
  id: string;
  email: string;
  name: string | null;
  role: string;
  email_verified: boolean;
  created_at: string;
}

export async function sentraListTeam(): Promise<SentraTeamMember[]> {
  return request('/api/v1/team', { method: 'GET' }, true);
}

export async function sentraInviteMember(email: string, role: string): Promise<{ message: string }> {
  return request('/api/v1/team/invite', { method: 'POST', body: JSON.stringify({ email, role }) }, true);
}

export async function sentraChangeRole(userId: string, role: string): Promise<SentraTeamMember> {
  return request(`/api/v1/team/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }, true);
}

export async function sentraRemoveMember(userId: string): Promise<void> {
  await request(`/api/v1/team/${userId}`, { method: 'DELETE' }, true);
}

// Sin auth: se llama desde la página pública de aceptar invitación, antes
// de que la persona invitada tenga ninguna sesión.
export async function sentraAcceptInvite(data: {
  token: string;
  name: string;
  password: string;
}): Promise<{ message: string }> {
  return request('/api/v1/team/accept-invite', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Webhooks salientes ──────────────────────────────────────────────

export interface SentraWebhook {
  id: string;
  url: string;
  event_types: string[];
  enabled: boolean;
  last_triggered_at: string | null;
  last_status_code: number | null;
  created_at: string;
}

export interface SentraWebhookCreated extends SentraWebhook {
  secret: string; // valor crudo — solo viaja en la respuesta de creación/regeneración
}

export async function sentraListWebhooks(): Promise<SentraWebhook[]> {
  return request('/api/v1/webhooks', { method: 'GET' }, true);
}

export async function sentraCreateWebhook(url: string, eventTypes: string[]): Promise<SentraWebhookCreated> {
  return request(
    '/api/v1/webhooks',
    { method: 'POST', body: JSON.stringify({ url, event_types: eventTypes }) },
    true,
  );
}

export async function sentraToggleWebhook(webhookId: string, enabled: boolean): Promise<SentraWebhook> {
  return request(
    `/api/v1/webhooks/${webhookId}`,
    { method: 'PATCH', body: JSON.stringify({ enabled }) },
    true,
  );
}

export async function sentraRegenerateWebhookSecret(webhookId: string): Promise<SentraWebhookCreated> {
  return request(`/api/v1/webhooks/${webhookId}/regenerate-secret`, { method: 'POST' }, true);
}

export async function sentraDeleteWebhook(webhookId: string): Promise<void> {
  await request(`/api/v1/webhooks/${webhookId}`, { method: 'DELETE' }, true);
}

// ── Generador de CV ─────────────────────────────────────────────────

export interface CVExperienceItem {
  role: string;
  company: string;
  period: string;
  highlights: string[];
}

export interface CVContact {
  location: string;
  email: string;
  phone: string;
  website: string;
}

export interface CVCertification {
  name: string;
  issuer: string;
  year: string;
}

export interface CVEducation {
  degree: string;
  institution: string;
  period: string;
}

export interface CVLanguage {
  language: string;
  level: string;
}

export interface CVSkillGroup {
  category: string;
  items: string[];
}

export interface CVContent {
  full_name: string;
  headline: string;
  contact: CVContact;
  summary: string;
  experience: CVExperienceItem[];
  education: CVEducation[];
  certifications: CVCertification[];
  skills: CVSkillGroup[];
  languages: CVLanguage[];
  match_score: number;
  missing_requirements: string[];
  actionable_suggestions: string[];
  tips: string[];
}

export interface SentraCVDocument {
  id: string;
  title: string;
  job_posting: string;
  content: CVContent;
  match_score: number;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SentraCVListItem {
  id: string;
  title: string;
  match_score: number;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SentraCVFolder {
  id: string;
  name: string;
  created_at: string;
}

export async function sentraGenerateCV(data: {
  title?: string;
  profile_text: string;
  job_posting: string;
}): Promise<SentraCVDocument> {
  return request('/api/v1/cv', { method: 'POST', body: JSON.stringify(data) }, true);
}

// Subida multipart (OCR/PDF): NO pasa por request() (que fuerza Content-Type
// JSON; el navegador debe poner el boundary del form). Mismo blindaje de
// errores que request(): red/timeout/CORS → SentraApiError con motivo real.
async function uploadMultipart<T>(path: string, file: File, timeoutMs = 120000): Promise<T> {
  const token = getToken();
  const form = new FormData();
  form.append('file', file);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
      credentials: 'include',
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      throw new SentraApiError(0, 'El archivo tardó demasiado en procesarse. Inténtalo de nuevo.');
    }
    throw new SentraApiError(0, 'No se pudo subir el archivo. Revisa tu conexión.');
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) throw new SentraApiError(res.status, await readErrorDetail(res));
  try {
    return (await res.json()) as T;
  } catch {
    throw new SentraApiError(res.status, 'El servidor devolvió una respuesta inválida.');
  }
}

export async function sentraOcrJobPosting(file: File): Promise<{ text: string }> {
  return uploadMultipart('/api/v1/cv/ocr', file);
}

export interface SentraApplyEmail {
  subject: string;
  body: string;
  recipient: string;
}

// Extracción de texto de un PDF (perfil/CV): multipart.
export async function sentraExtractCVPdf(file: File): Promise<{ text: string }> {
  return uploadMultipart('/api/v1/cv/extract-pdf', file);
}

// Redacta el correo de postulación (IA) para un CV guardado.
export async function sentraApplyEmail(id: string): Promise<SentraApplyEmail> {
  return request(`/api/v1/cv/${id}/apply-email`, { method: 'POST' }, true);
}

export async function sentraListCVs(folderId?: string): Promise<SentraCVListItem[]> {
  const qs = folderId ? `?folder_id=${encodeURIComponent(folderId)}` : '';
  return request(`/api/v1/cv${qs}`, { method: 'GET' }, true);
}

export async function sentraGetCV(id: string): Promise<SentraCVDocument> {
  return request(`/api/v1/cv/${id}`, { method: 'GET' }, true);
}

// `folder_id` sólo se aplica si `set_folder` es true (null = quitar de la carpeta).
// Así distinguimos "no tocar la carpeta" de "quitarla".
export async function sentraUpdateCV(
  id: string,
  data: { title?: string; content?: CVContent; folder_id?: string | null; set_folder?: boolean },
): Promise<SentraCVDocument> {
  return request(`/api/v1/cv/${id}`, { method: 'PUT', body: JSON.stringify(data) }, true);
}

// Mueve un CV a una carpeta (folderId=null lo saca de toda carpeta).
export async function sentraMoveCV(id: string, folderId: string | null): Promise<SentraCVDocument> {
  return request(`/api/v1/cv/${id}`, { method: 'PATCH', body: JSON.stringify({ folder_id: folderId }) }, true);
}

// ── Carpetas de CV ──────────────────────────────────────────────────
export async function sentraListCVFolders(): Promise<SentraCVFolder[]> {
  return request('/api/v1/cv/folders', { method: 'GET' }, true);
}

export async function sentraCreateCVFolder(name: string): Promise<SentraCVFolder> {
  return request('/api/v1/cv/folders', { method: 'POST', body: JSON.stringify({ name }) }, true);
}

export async function sentraRenameCVFolder(id: string, name: string): Promise<SentraCVFolder> {
  return request(`/api/v1/cv/folders/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }, true);
}

export async function sentraDeleteCVFolder(id: string): Promise<void> {
  await request(`/api/v1/cv/folders/${id}`, { method: 'DELETE' }, true);
}

export async function sentraDeleteCV(id: string): Promise<void> {
  await request(`/api/v1/cv/${id}`, { method: 'DELETE' }, true);
}

// Regeneración interactiva con IA: reescribe el CV para subir el match.
// CONSUME 1 crédito y devuelve una versión NUEVA (el original queda en historial).
export async function sentraImproveCV(id: string, content: CVContent): Promise<SentraCVDocument> {
  return request(`/api/v1/cv/${id}/improve`, { method: 'POST', body: JSON.stringify({ content }) }, true);
}

export interface SentraCVQuota {
  limit: number;
  used: number;
  remaining: number | null; // null = ilimitado (planes de pago)
}

// Cuántas generaciones/mejoras con IA le quedan al usuario esta semana. El
// wizard lo usa para BLOQUEAR las varitas mágicas al agotarse (dejando el
// editor manual intacto). remaining=null → plan sin límite.
export async function sentraCVQuota(): Promise<SentraCVQuota> {
  return request('/api/v1/cv/quota', { method: 'GET' }, true);
}

// ── Registro de auditoría ───────────────────────────────────────────

export interface SentraAuditEntry {
  id: string;
  actor_email: string;
  action: string;
  target_label: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

export async function sentraListAudit(params?: {
  action?: string;
  limit?: number;
  offset?: number;
}): Promise<SentraAuditEntry[]> {
  const qs = new URLSearchParams();
  if (params?.action) qs.set('action', params.action);
  if (params?.limit != null) qs.set('limit', String(params.limit));
  if (params?.offset != null) qs.set('offset', String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return request(`/api/v1/audit${suffix}`, { method: 'GET' }, true);
}
