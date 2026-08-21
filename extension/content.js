// extension/content.js — badge flotante in-page (FASE 2.1).
// Muestra el riesgo/score de Sentra SOBRE la propia oferta, sin abrir el popup.
// Corre junto a adapters.js (mismo mundo aislado) → usa SENTRA_extractOffer /
// SENTRA_fillForm directamente. La red va por el service worker (sin CORS).
// UI en Shadow DOM → los estilos de la página no la tocan y viceversa.
(() => {
  if (window.__sentraBadgeLoaded) return;
  window.__sentraBadgeLoaded = true;

  const FLAG_LABELS = {
    advance_fee: 'Te piden pagar por adelantado. Un empleo legítimo NUNCA cobra por contratarte.',
    crypto_payment: 'Mencionan pagos o inversiones en cripto. Señal habitual de fraude.',
    sensitive_data: 'Piden datos sensibles (tarjeta, contraseñas, cédula) antes de contratarte.',
    unreal_salary: 'Sueldo desproporcionado para el trabajo ofrecido.',
    instant_hire: 'Contratación inmediata sin entrevista. Táctica para no darte tiempo a dudar.',
    messaging_only: 'El único contacto es WhatsApp/Telegram. Las empresas serias usan canales oficiales.',
    free_email_only: 'El contacto es un correo gratuito, no un dominio corporativo.',
    url_shortener: 'Usan enlaces acortados que ocultan el destino real (posible phishing).',
    anonymous_company: 'No nombran a la empresa.',
  };
  const FW_TITLE = { danger: 'Alto riesgo de estafa', caution: 'Señales sospechosas', safe: 'Sin señales de estafa' };
  const VERDICT = { apply: 'Aplicar', maybe: 'Aplicar solo si…', avoid: 'No aplicar' };
  const RISK_COLOR = { danger: '#ef4444', caution: '#f59e0b', safe: '#22c55e' };

  const sendBg = (type, extra) =>
    new Promise((resolve) => chrome.runtime.sendMessage({ type, ...(extra || {}) }, (r) => resolve(r || { ok: false, error: 'Sin respuesta.' })));

  let cfg = null;
  let host, shadow, badge, panel;

  function el(tag, opts = {}, kids = []) {
    const n = document.createElement(tag);
    if (opts.class) n.className = opts.class;
    if (opts.text != null) n.textContent = opts.text;
    if (opts.html != null) n.innerHTML = opts.html; // solo para íconos estáticos internos
    for (const [k, v] of Object.entries(opts.style || {})) n.style[k] = v;
    for (const c of kids) if (c) n.appendChild(c);
    return n;
  }

  function styles() {
    return `
      :host { all: initial; }
      .wrap { position: fixed; right: 16px; bottom: 16px; z-index: 2147483000;
        font-family: -apple-system, "Segoe UI", Roboto, sans-serif; }
      .badge { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none;
        background: #0b0f0e; color: #e7f0ed; border: 1px solid #1f2a27; border-left-width: 4px;
        border-radius: 12px; padding: 9px 12px; box-shadow: 0 8px 30px rgba(0,0,0,.35);
        font-size: 13px; font-weight: 700; }
      .badge .dot { width: 9px; height: 9px; border-radius: 50%; }
      .badge small { color: #8aa39b; font-weight: 600; }
      .spin { width: 13px; height: 13px; border: 2px solid #33403c; border-top-color: #22c55e;
        border-radius: 50%; animation: s .7s linear infinite; }
      @keyframes s { to { transform: rotate(360deg); } }
      .panel { margin-top: 8px; width: 320px; max-height: 60vh; overflow-y: auto;
        background: #0b0f0e; color: #e7f0ed; border: 1px solid #1f2a27; border-radius: 14px;
        box-shadow: 0 12px 40px rgba(0,0,0,.5); padding: 12px; display: none; }
      .panel.open { display: block; }
      .ph { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
      .ph b { font-size: 13px; } .ph .x { cursor: pointer; color: #8aa39b; background: none; border: 0; font-size: 15px; }
      .sub { color: #8aa39b; font-size: 11.5px; line-height: 1.5; }
      ul { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
      li { display: flex; gap: 8px; font-size: 12px; }
      .sev { width: 7px; height: 7px; border-radius: 50%; margin-top: 5px; flex: none; }
      .row { display: flex; gap: 7px; margin-top: 10px; flex-wrap: wrap; }
      button.act { flex: 1; min-width: 88px; cursor: pointer; border: 1px solid #1f2a27; background: #121917;
        color: #e7f0ed; border-radius: 9px; padding: 8px; font-size: 11.5px; font-weight: 700; }
      button.act:hover { border-color: #22c55e; }
      button.primary { background: #22c55e; color: #04120a; border-color: #22c55e; }
      .verdict { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
      .vbadge { font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 3px 9px; border-radius: 999px; }
      .score { font-size: 26px; font-weight: 900; letter-spacing: -.03em; }
      .note { color: #8aa39b; font-size: 10.5px; margin-top: 8px; }
      .dupe { border: 1px solid rgba(167,139,250,.35); background: rgba(167,139,250,.08); border-radius: 9px; padding: 8px; margin-bottom: 8px; }
      .dupe b { color: #a78bfa; font-size: 11px; text-transform: uppercase; }
    `;
  }

  function mount() {
    host = document.createElement('div');
    host.id = '__sentra_badge_host';
    (document.body || document.documentElement).appendChild(host);
    shadow = host.attachShadow({ mode: 'open' });
    const st = document.createElement('style');
    st.textContent = styles();
    shadow.appendChild(st);

    const wrap = el('div', { class: 'wrap' });
    badge = el('div', { class: 'badge' });
    panel = el('div', { class: 'panel' });
    wrap.appendChild(panel);
    wrap.appendChild(badge);
    shadow.appendChild(wrap);
    setBadge('#8aa39b', 'Sentra', 'listo');
    badge.addEventListener('click', onBadgeClick);
  }

  function setBadge(color, title, sub, busy) {
    badge.style.borderLeftColor = color;
    badge.replaceChildren();
    if (busy) badge.appendChild(el('span', { class: 'spin' }));
    else badge.appendChild(el('span', { class: 'dot', style: { background: color } }));
    badge.appendChild(el('span', { text: title }));
    if (sub) badge.appendChild(el('small', { text: sub }));
  }

  let lastFirewall = null;
  let lastOffer = null;

  async function onBadgeClick() {
    if (!cfg.hasKey) {
      await sendBg('sentra-open-options');
      return;
    }
    if (lastFirewall) {
      panel.classList.toggle('open');
      return;
    }
    await runScan();
  }

  async function runScan() {
    const offer = SENTRA_extractOffer();
    if (!offer.text || offer.text.length < 40) {
      setBadge('#8aa39b', 'Sentra', 'no es oferta');
      return;
    }
    lastOffer = offer;
    setBadge('#8aa39b', 'Analizando…', '', true);
    const r = await sendBg('sentra-scan', { jobPosting: offer.text, country: cfg.country });
    if (!r.ok) {
      setBadge('#ef4444', 'Sentra', 'error');
      renderError(r);
      panel.classList.add('open');
      return;
    }
    lastFirewall = r.data;
    const lvl = r.data.risk_level || 'safe';
    setBadge(RISK_COLOR[lvl], FW_TITLE[lvl], lvl === 'safe' ? 'ver detalle' : `${r.data.flags.length} señal(es)`);
    renderFirewall(r.data);
    if (lvl !== 'safe') panel.classList.add('open'); // abre solo si hay algo que avisar
  }

  function flagList(fw) {
    const ul = el('ul');
    for (const f of fw.flags || []) {
      ul.appendChild(
        el('li', {}, [
          el('span', { class: 'sev', style: { background: f.severity === 'high' ? '#ef4444' : f.severity === 'medium' ? '#f59e0b' : '#8aa39b' } }),
          el('span', { text: FLAG_LABELS[f.code] || f.code }),
        ]),
      );
    }
    return ul;
  }

  function header(titleText) {
    const h = el('div', { class: 'ph' });
    h.appendChild(el('b', { text: titleText }));
    const x = el('button', { class: 'x', text: '✕' });
    x.addEventListener('click', () => panel.classList.remove('open'));
    h.appendChild(x);
    return h;
  }

  function actionsRow() {
    const row = el('div', { class: 'row' });
    const ev = el('button', { class: 'act primary', text: '🎯 Evaluar (IA)' });
    ev.addEventListener('click', runEvaluate);
    const inbox = el('button', { class: 'act', text: '➕ Añadir a Sentra' });
    inbox.addEventListener('click', () => captureToInbox(inbox));
    const cv = el('button', { class: 'act', text: '📄 Adaptar CV' });
    cv.addEventListener('click', adaptCV);
    const fill = el('button', { class: 'act', text: '⌨ Autocompletar' });
    fill.addEventListener('click', autofill);
    row.appendChild(ev);
    row.appendChild(inbox);
    row.appendChild(cv);
    row.appendChild(fill);
    return row;
  }

  async function captureToInbox(btn) {
    if (!lastOffer) lastOffer = SENTRA_extractOffer();
    if (!lastOffer.text || lastOffer.text.length < 20) return;
    if (btn) btn.textContent = '⏳ Añadiendo…';
    const r = await sendBg('sentra-capture', {
      jobPosting: lastOffer.text,
      sourceUrl: lastOffer.url,
      title: lastOffer.title,
    });
    if (btn) btn.textContent = r.ok ? '✓ En tu bandeja' : '✗ Error';
    if (!r.ok) renderError(r);
  }

  function renderFirewall(fw) {
    panel.replaceChildren();
    panel.appendChild(header('Escudo de Empleo'));
    const lvl = fw.risk_level || 'safe';
    panel.appendChild(el('div', { class: 'sub', style: { color: RISK_COLOR[lvl], fontWeight: '700' }, text: FW_TITLE[lvl] }));
    if (fw.flags && fw.flags.length) panel.appendChild(flagList(fw));
    panel.appendChild(actionsRow());
    panel.appendChild(el('div', { class: 'note', text: 'Escaneo anti-estafa gratis. “Evaluar” usa IA y consume 1 crédito.' }));
  }

  async function runEvaluate() {
    if (!lastOffer) lastOffer = SENTRA_extractOffer();
    panel.replaceChildren();
    panel.appendChild(header('Evaluando…'));
    panel.appendChild(el('div', { class: 'sub' }, [el('span', { class: 'spin' })]));
    const r = await sendBg('sentra-evaluate', { jobPosting: lastOffer.text, country: cfg.country });
    if (!r.ok) return renderError(r);
    renderEvaluation(r.data);
  }

  function renderEvaluation(ev) {
    panel.replaceChildren();
    panel.appendChild(header('Application Score'));
    if (ev.duplicate) {
      const d = el('div', { class: 'dupe' });
      d.appendChild(el('b', { text: '↺ Ya aplicaste a algo similar' }));
      d.appendChild(el('div', { class: 'sub', text: `${ev.duplicate.similarity}% — ${[ev.duplicate.role, ev.duplicate.company].filter(Boolean).join(' · ')}` }));
      panel.appendChild(d);
    }
    const v = ev.verdict || 'avoid';
    const vc = RISK_COLOR[v === 'apply' ? 'safe' : v === 'maybe' ? 'caution' : 'danger'];
    const vrow = el('div', { class: 'verdict' });
    vrow.appendChild(el('span', { class: 'vbadge', style: { background: vc, color: v === 'avoid' ? '#fff' : '#04120a' }, text: VERDICT[v] }));
    vrow.appendChild(el('span', { class: 'score', style: { color: vc }, text: String(ev.score) }));
    panel.appendChild(vrow);

    const notScam = !(ev.firewall && ev.firewall.risk_level === 'danger');
    if (notScam && ev.reasons_avoid && ev.reasons_avoid.length) {
      panel.appendChild(el('div', { class: 'sub', style: { color: '#fca5a5', marginTop: '6px', fontWeight: '700' }, text: '¿Por qué NO aplicar?' }));
      const ul = el('ul');
      for (const r of ev.reasons_avoid) ul.appendChild(el('li', {}, [el('span', { class: 'sev', style: { background: '#ef4444' } }), el('span', { text: r })]));
      panel.appendChild(ul);
    }
    panel.appendChild(actionsRow());
    panel.classList.add('open');
  }

  async function adaptCV() {
    try {
      if (lastOffer) await navigator.clipboard.writeText(lastOffer.text);
    } catch {
      /* portapapeles bloqueado: igual abrimos la herramienta */
    }
    await sendBg('sentra-open-cv');
  }

  async function autofill() {
    const data = await chrome.storage.local.get(['fullName', 'email', 'phone']);
    if (!data.fullName && !data.email && !data.phone) {
      await sendBg('sentra-open-options');
      return;
    }
    const n = SENTRA_fillForm(data);
    const note = el('div', { class: 'note', text: n > 0 ? `✓ Rellené ${n} campo(s). Revisa antes de enviar.` : 'No hallé campos estándar en esta página.' });
    panel.appendChild(note);
  }

  function renderError(r) {
    panel.replaceChildren();
    panel.appendChild(header('Error'));
    panel.appendChild(el('div', { class: 'sub', text: r.error || 'Algo salió mal.' }));
    if (r.code === 'NO_KEY' || r.code === 'UNAUTHORIZED') {
      const b = el('button', { class: 'act primary', style: { marginTop: '10px' }, text: 'Abrir opciones' });
      b.addEventListener('click', () => sendBg('sentra-open-options'));
      panel.appendChild(b);
    }
    panel.classList.add('open');
  }

  let mounted = false;

  function resetForNav() {
    lastFirewall = null;
    lastOffer = null;
    setBadge('#8aa39b', 'Sentra', 'listo');
    if (panel) {
      panel.replaceChildren();
      panel.classList.remove('open');
    }
    if (cfg.hasKey) maybeAutoScan();
    else setBadge('#8aa39b', 'Conecta Sentra', 'clic para configurar');
  }

  let autoScanTimer = null;
  function maybeAutoScan() {
    if (!cfg.hasKey || !cfg.autoScan) return;
    clearTimeout(autoScanTimer);
    autoScanTimer = setTimeout(() => {
      if (!lastFirewall && SENTRA_looksLikeJob()) runScan();
    }, 1200); // deja que la SPA pinte el contenido
  }

  // Controlador: monta el badge SOLO cuando la página parece una oferta (no en
  // el feed/mensajes de LinkedIn), y lo reinicia al navegar en una SPA.
  let lastHref = location.href;
  function tick() {
    if (mounted && location.href !== lastHref) {
      lastHref = location.href;
      resetForNav();
      return;
    }
    if (!mounted && SENTRA_looksLikeJob()) {
      mount();
      mounted = true;
      lastHref = location.href;
      if (!cfg.hasKey) setBadge('#8aa39b', 'Conecta Sentra', 'clic para configurar');
      else maybeAutoScan();
    }
  }

  async function init() {
    const r = await sendBg('sentra-config');
    if (!r.ok) return;
    cfg = r.data;
    if (!cfg.enableBadge) return;
    tick();
    setInterval(tick, 1300);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
