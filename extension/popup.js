// extension/popup.js
// Lógica del popup: extrae la oferta de la página activa, la pasa por el
// Application Firewall (gratis, sin IA) o por el evaluador (Score con IA), y
// ofrece "Adaptar CV" y autocompletar. Todo el texto dinámico se pinta con
// textContent (nunca innerHTML) → sin XSS aunque la oferta traiga etiquetas.

const FLAG_LABELS = {
  advance_fee: 'Te piden pagar por adelantado (inscripción, kit, material). Un empleo legítimo NUNCA cobra por contratarte.',
  crypto_payment: 'Mencionan pagos o inversiones en cripto. Señal habitual de fraude.',
  sensitive_data: 'Piden datos sensibles (tarjeta, contraseñas, cédula) antes de contratarte.',
  unreal_salary: 'Sueldo desproporcionado para el trabajo ofrecido. Si es demasiado bueno para ser verdad…',
  instant_hire: 'Contratación inmediata, sin entrevista ni requisitos. Táctica para no darte tiempo a dudar.',
  messaging_only: 'El único contacto es WhatsApp/Telegram. Las empresas serias usan canales oficiales.',
  free_email_only: 'El contacto es un correo gratuito (Gmail/Hotmail), no un dominio corporativo.',
  url_shortener: 'Usan enlaces acortados que ocultan el destino real (posible phishing).',
  anonymous_company: 'No nombran a la empresa. Desconfía de una "importante empresa" sin identidad.',
};
const FW_TITLE = { danger: '⚠ Alto riesgo de estafa', caution: '⚠ Señales sospechosas', safe: '✓ Sin señales de estafa' };
const FW_SUB = {
  danger: 'Esta oferta tiene marcas típicas de fraude laboral. No envíes dinero ni datos personales.',
  caution: 'Revisa estas señales antes de continuar.',
  safe: 'No detectamos patrones de fraude. Igual verifica la empresa.',
};
const VERDICT = { apply: 'Aplicar', maybe: 'Aplicar solo si…', avoid: 'No aplicar' };

const app = document.getElementById('app');
document.getElementById('openOptions').addEventListener('click', () => chrome.runtime.openOptionsPage());

// ── Helpers DOM (seguros) ──
function el(tag, opts = {}, children = []) {
  const n = document.createElement(tag);
  if (opts.class) n.className = opts.class;
  if (opts.text != null) n.textContent = opts.text;
  if (opts.title) n.title = opts.title;
  for (const [k, v] of Object.entries(opts.attrs || {})) n.setAttribute(k, v);
  for (const c of children) if (c) n.appendChild(c);
  return n;
}
function clear() { app.replaceChildren(); }

// ── Extracción / autocompletado en la pestaña activa ──
function pageExtractor() {
  const sel = ((window.getSelection && window.getSelection().toString()) || '').trim();
  let text = sel;
  if (text.length < 80) {
    const pick = document.querySelector('main, article, [role="main"]') || document.body;
    text = ((pick && pick.innerText) || document.body.innerText || '').trim();
  }
  text = text.replace(/\n{3,}/g, '\n\n').slice(0, 12000);
  const m = (document.body.innerText || '').match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return { text, email: m ? m[0] : '', title: document.title, url: location.href };
}

function pageAutofill(data) {
  let filled = 0;
  const setVal = (node, val) => {
    if (!node || !val) return;
    node.focus();
    node.value = val;
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
    filled++;
  };
  setVal(document.querySelector('input[type=email], input[name*=email i], input[id*=email i]'), data.email);
  setVal(document.querySelector('input[type=tel], input[name*=phone i], input[name*=tel i], input[id*=phone i]'), data.phone);
  setVal(
    document.querySelector('input[name*=name i]:not([name*=user i]):not([name*=company i]), input[id*=fullname i]'),
    data.fullName,
  );
  return filled;
}

async function activeTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ? tab.id : null;
}

async function extractActiveTab() {
  const tabId = await activeTabId();
  if (tabId == null) throw new Error('No hay pestaña activa.');
  const [res] = await chrome.scripting.executeScript({ target: { tabId }, func: pageExtractor });
  const data = res && res.result;
  if (!data || !data.text || data.text.length < 30) {
    throw new Error('No encontré una oferta en esta página. Selecciona el texto de la vacante e inténtalo de nuevo.');
  }
  return data;
}

// ── Render de resultados ──
function firewallBanner(fw) {
  const level = fw.risk_level || 'safe';
  const banner = el('div', { class: `banner ${level}` });
  banner.appendChild(el('div', { class: 'title', text: FW_TITLE[level] }));
  banner.appendChild(el('div', { class: 'hint', text: FW_SUB[level] }));
  if (fw.flags && fw.flags.length) {
    const ul = el('ul', { class: 'flags' });
    for (const f of fw.flags) {
      ul.appendChild(
        el('li', {}, [
          el('span', { class: `sev ${f.severity}` }),
          el('span', { text: FLAG_LABELS[f.code] || f.code }),
        ]),
      );
    }
    banner.appendChild(ul);
  }
  return banner;
}

function duplicateBanner(dup) {
  const b = el('div', { class: 'banner dup' });
  b.appendChild(el('div', { class: 'title', text: '↺ Ya te postulaste a algo casi idéntico' }));
  const role = [dup.role, dup.company].filter(Boolean).join(' · ');
  b.appendChild(el('div', { class: 'hint', text: `${dup.similarity}% similar a: ${role} (${dup.status || '—'})` }));
  return b;
}

function renderFirewall(fw, offer) {
  clear();
  app.appendChild(firewallBanner(fw));
  app.appendChild(actionsBar(offer));
  const evalBtn = el('button', { class: 'action primary', text: 'Evaluar oferta (IA) →' });
  evalBtn.addEventListener('click', () => doEvaluate(offer));
  app.appendChild(evalBtn);
  app.appendChild(el('p', { class: 'hint', text: 'El escaneo anti-estafa es gratis e instantáneo. “Evaluar” usa IA y consume 1 crédito.' }));
}

function renderEvaluation(ev, offer) {
  clear();
  if (ev.firewall && ev.firewall.risk_level !== 'safe') app.appendChild(firewallBanner(ev.firewall));
  if (ev.duplicate) app.appendChild(duplicateBanner(ev.duplicate));

  const v = ev.verdict || 'avoid';
  const card = el('div', { class: 'card' });
  const head = el('div', { class: 'verdict' });
  const left = el('div', {}, [el('span', { class: `badge ${v}`, text: VERDICT[v] })]);
  if (ev.company || ev.role) left.appendChild(el('div', { class: 'muted', text: [ev.role, ev.company].filter(Boolean).join(' · ') }));
  head.appendChild(left);
  head.appendChild(el('div', { class: `score ${v}`, text: String(ev.score) }));
  card.appendChild(head);

  if (!(ev.firewall && ev.firewall.risk_level === 'danger')) {
    if (ev.reasons_avoid && ev.reasons_avoid.length) {
      card.appendChild(el('div', { class: 'title', text: '¿Por qué NO aplicar?', attrs: { style: 'margin-top:10px;color:#fca5a5;font-size:11px;text-transform:uppercase' } }));
      const ul = el('ul', { class: 'list' });
      for (const r of ev.reasons_avoid) ul.appendChild(el('li', { text: r }));
      card.appendChild(ul);
    }
    if (ev.reasons_apply && ev.reasons_apply.length) {
      card.appendChild(el('div', { class: 'title', text: 'Lo que cumples', attrs: { style: 'margin-top:10px;color:#86efac;font-size:11px;text-transform:uppercase' } }));
      const ul = el('ul', { class: 'list' });
      for (const r of ev.reasons_apply) ul.appendChild(el('li', { text: r }));
      card.appendChild(ul);
    }
  }
  app.appendChild(card);
  app.appendChild(actionsBar(offer));
}

function actionsBar(offer) {
  const bar = el('div', { class: 'footlinks' });
  const adapt = el('button', { class: 'action', text: '📄 Adaptar CV' });
  adapt.addEventListener('click', () => adaptCV(offer));
  const fill = el('button', { class: 'action', text: '⌨ Autocompletar' });
  fill.addEventListener('click', () => autofill());
  bar.appendChild(adapt);
  bar.appendChild(fill);
  return bar;
}

// ── Acciones principales ──
async function withBusy(label, fn) {
  clear();
  const busy = el('div', { class: 'card' }, [el('span', { class: 'spin' }), el('span', { text: `  ${label}` })]);
  app.appendChild(busy);
  try {
    await fn();
  } catch (e) {
    renderError(e);
  }
}

async function doScan() {
  await withBusy('Escaneando la oferta…', async () => {
    const offer = await extractActiveTab();
    const cfg = await loadConfig();
    const fw = await apiFetch('/api/v1/agent/firewall', { method: 'POST', body: { job_posting: offer.text, country: cfg.country } });
    renderFirewall(fw, offer);
  });
}

async function doEvaluate(offerMaybe) {
  await withBusy('Evaluando con IA…', async () => {
    const offer = offerMaybe || (await extractActiveTab());
    const cfg = await loadConfig();
    const ev = await apiFetch('/api/v1/agent/evaluate', { method: 'POST', body: { job_posting: offer.text, country: cfg.country } });
    renderEvaluation(ev, offer);
  });
}

async function adaptCV(offer) {
  const cfg = await loadConfig();
  try {
    await navigator.clipboard.writeText(offer.text);
  } catch {
    /* si el portapapeles falla, igual abrimos la herramienta */
  }
  await chrome.tabs.create({ url: `${cfg.appBase}/${cfg.lang}/herramientas/cv` });
  clear();
  app.appendChild(el('div', { class: 'banner safe' }, [
    el('div', { class: 'title', text: '✓ Oferta copiada' }),
    el('div', { class: 'hint', text: 'Abrí el generador de CV en una pestaña nueva. Pega la oferta (Ctrl/Cmd+V) y genera tu CV adaptado.' }),
  ]));
}

async function autofill() {
  const cfg = await loadConfig();
  if (!cfg.fullName && !cfg.email && !cfg.phone) {
    renderError(new Error('Configura tu nombre, correo y teléfono en Opciones para autocompletar.'));
    return;
  }
  const tabId = await activeTabId();
  const [res] = await chrome.scripting.executeScript({
    target: { tabId },
    func: pageAutofill,
    args: [{ fullName: cfg.fullName, email: cfg.email, phone: cfg.phone }],
  });
  const n = (res && res.result) || 0;
  const b = el('div', { class: `banner ${n > 0 ? 'safe' : 'caution'}` }, [
    el('div', { class: 'title', text: n > 0 ? `✓ Rellené ${n} campo(s)` : 'No encontré campos' }),
    el('div', { class: 'hint', text: n > 0 ? 'Revisa el formulario antes de enviar.' : 'Este formulario no expone campos estándar; complétalo a mano.' }),
  ]);
  app.insertBefore(b, app.firstChild);
}

function renderError(e) {
  clear();
  const b = el('div', { class: 'banner danger' }, [
    el('div', { class: 'title', text: 'Error' }),
    el('div', { class: 'hint', text: e.message || 'Algo salió mal.' }),
  ]);
  app.appendChild(b);
  if (e.code === 'NO_KEY' || e.code === 'UNAUTHORIZED') {
    const btn = el('button', { class: 'action primary', text: 'Abrir opciones' });
    btn.addEventListener('click', () => chrome.runtime.openOptionsPage());
    app.appendChild(btn);
  } else {
    app.appendChild(mainButtons());
  }
}

function mainButtons() {
  const wrap = el('div', {}, []);
  const scan = el('button', { class: 'action primary', text: '🛡 Escanear esta oferta (gratis)' });
  scan.addEventListener('click', doScan);
  const ev = el('button', { class: 'action', text: '🎯 Evaluar oferta (IA)', attrs: { style: 'margin-top:8px' } });
  ev.addEventListener('click', () => doEvaluate());
  wrap.appendChild(scan);
  wrap.appendChild(ev);
  return wrap;
}

async function init() {
  const cfg = await loadConfig();
  clear();
  if (!cfg.apiKey) {
    app.appendChild(el('div', { class: 'card' }, [
      el('div', { class: 'title', text: 'Conecta tu cuenta Sentra', attrs: { style: 'font-size:13px;margin-bottom:6px' } }),
      el('p', { class: 'hint', text: 'Pega tu API key de Sentra (Panel → Ajustes → API keys) para escanear y evaluar ofertas. Es tu credencial revocable; no guardamos tu contraseña.' }),
    ]));
    const btn = el('button', { class: 'action primary', text: 'Configurar API key', attrs: { style: 'margin-top:10px' } });
    btn.addEventListener('click', () => chrome.runtime.openOptionsPage());
    app.appendChild(btn);
    return;
  }
  app.appendChild(mainButtons());
  app.appendChild(el('p', { class: 'country-pill', text: `País para umbral de sueldo: ${cfg.country}. Cámbialo en ⚙ Opciones.` }));
}

init();
