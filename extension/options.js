// extension/options.js
const FIELDS = ['apiKey', 'country', 'lang', 'apiBase', 'fullName', 'email', 'phone'];
const CHECKS = ['enableBadge', 'autoScan'];
const statusEl = document.getElementById('status');

function setStatus(msg, cls) {
  statusEl.textContent = msg;
  statusEl.className = cls || '';
}

async function restore() {
  const cfg = await loadConfig();
  for (const f of FIELDS) {
    const node = document.getElementById(f);
    if (node) node.value = cfg[f] ?? '';
  }
  for (const c of CHECKS) {
    const node = document.getElementById(c);
    if (node) node.checked = cfg[c] !== false; // default true
  }
}

async function save() {
  const patch = {};
  for (const f of FIELDS) {
    const node = document.getElementById(f);
    if (node) patch[f] = node.value.trim();
  }
  for (const c of CHECKS) {
    const node = document.getElementById(c);
    if (node) patch[c] = node.checked;
  }
  await saveConfig(patch);
  setStatus('✓ Guardado', 'ok');
  setTimeout(() => setStatus(''), 2500);
}

async function test() {
  // Guardamos primero para que apiFetch use la key recién pegada.
  await save();
  setStatus('Probando…');
  try {
    const cfg = await loadConfig();
    const fw = await apiFetch('/api/v1/agent/firewall', {
      method: 'POST',
      body: { job_posting: 'Vacante de prueba para verificar la conexión de la extensión.', country: cfg.country },
    });
    setStatus(`✓ Conectado — firewall responde (riesgo: ${fw.risk_level}).`, 'ok');
  } catch (e) {
    setStatus(`✗ ${e.message}`, 'err');
  }
}

document.getElementById('save').addEventListener('click', save);
document.getElementById('test').addEventListener('click', test);
restore();
