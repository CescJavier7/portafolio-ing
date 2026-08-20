// extension/common.js
// Configuración compartida (popup + options) y cliente HTTP de la API de Sentra.
// Todo cliente: la API key vive en chrome.storage.local (revocable desde el panel).

const DEFAULTS = {
  apiBase: 'https://api.cescjavier.dev',
  apiKey: '',
  country: 'EC',
  appBase: 'https://cescjavier.dev',
  lang: 'es',
  // Badge inyectado in-page (FASE 2.1)
  enableBadge: true, // mostrar el badge flotante en sitios de empleo
  autoScan: true, // escaneo anti-estafa automático (gratis) al abrir la oferta
  // Datos para autocompletar formularios (opcionales)
  fullName: '',
  email: '',
  phone: '',
};

async function loadConfig() {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULTS));
  return { ...DEFAULTS, ...stored };
}

async function saveConfig(patch) {
  await chrome.storage.local.set(patch);
}

// Fetch a la API de Sentra con la API key como Bearer. Se llama SIEMPRE desde el
// contexto de la extensión (popup/options), que con host_permissions no está
// sujeto al CORS de la página → funciona sin tocar el backend.
async function apiFetch(path, { method = 'GET', body } = {}) {
  const cfg = await loadConfig();
  if (!cfg.apiKey) {
    const err = new Error('Falta la API key. Configúrala en Opciones.');
    err.code = 'NO_KEY';
    throw err;
  }
  let res;
  try {
    res = await fetch(`${cfg.apiBase}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const err = new Error('Sin conexión con la API. Revisa tu internet o la URL en Opciones.');
    err.code = 'NETWORK';
    throw err;
  }
  if (res.status === 401) {
    const err = new Error('API key inválida o revocada. Genera una nueva en el panel.');
    err.code = 'UNAUTHORIZED';
    throw err;
  }
  if (res.status === 402) {
    const err = new Error('Alcanzaste tu límite mensual de generaciones/evaluaciones con IA.');
    err.code = 'QUOTA';
    throw err;
  }
  if (!res.ok) {
    let detail = `Error ${res.status}`;
    try {
      const j = await res.json();
      if (j && j.detail) detail = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail);
    } catch {
      /* respuesta sin JSON */
    }
    const err = new Error(detail);
    err.code = 'HTTP';
    throw err;
  }
  return res.json();
}
