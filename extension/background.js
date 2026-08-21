// extension/background.js — service worker (MV3).
// Proxy de red para el CONTENT SCRIPT: los content scripts SÍ están sujetos al
// CORS de la página, así que el badge no puede llamar a la API directamente. El
// service worker (contexto de la extensión, con host_permissions) sí puede →
// el badge le envía mensajes y este hace el fetch. Reutiliza common.js (apiFetch).
importScripts('common.js');

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      switch (msg && msg.type) {
        case 'sentra-config': {
          const c = await loadConfig();
          sendResponse({
            ok: true,
            data: {
              hasKey: !!c.apiKey,
              country: c.country,
              appBase: c.appBase,
              lang: c.lang,
              enableBadge: c.enableBadge !== false,
              autoScan: c.autoScan !== false,
            },
          });
          return;
        }
        case 'sentra-scan': {
          const data = await apiFetch('/api/v1/agent/firewall', {
            method: 'POST',
            body: { job_posting: msg.jobPosting, country: msg.country },
          });
          sendResponse({ ok: true, data });
          return;
        }
        case 'sentra-evaluate': {
          const data = await apiFetch('/api/v1/agent/evaluate', {
            method: 'POST',
            body: { job_posting: msg.jobPosting, country: msg.country },
          });
          sendResponse({ ok: true, data });
          return;
        }
        case 'sentra-capture': {
          const data = await apiFetch('/api/v1/agent/inbox', {
            method: 'POST',
            body: { text: msg.jobPosting, source_url: msg.sourceUrl || null, title: msg.title || null },
          });
          sendResponse({ ok: true, data });
          return;
        }
        case 'sentra-open-cv': {
          const c = await loadConfig();
          await chrome.tabs.create({ url: `${c.appBase}/${c.lang}/herramientas/cv` });
          sendResponse({ ok: true });
          return;
        }
        case 'sentra-open-options': {
          chrome.runtime.openOptionsPage();
          sendResponse({ ok: true });
          return;
        }
        default:
          sendResponse({ ok: false, error: 'Mensaje desconocido.' });
      }
    } catch (e) {
      sendResponse({ ok: false, error: e.message, code: e.code });
    }
  })();
  return true; // respuesta asíncrona
});
