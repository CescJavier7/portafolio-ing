// extension/adapters.js
// Funciones que corren DENTRO de la página (content script del badge y también
// inyectadas por el popup vía scripting.executeScript({files:['adapters.js']})).
// Sin efectos secundarios al cargar: solo define constantes y funciones globales
// (prefijo SENTRA_ para no chocar con la página). Fuente ÚNICA de extracción y
// autocompletado, así el popup y el badge nunca divergen.

// Selectores de campos por sitio. `firstName`/`lastName` tienen prioridad sobre
// `name` (Workday/Greenhouse piden nombre partido). Cae a heurística genérica.
var SENTRA_SITE_ADAPTERS = [
  {
    host: 'myworkdayjobs.com',
    firstName: "input[data-automation-id='legalNameSection_firstName'], input[data-automation-id*='firstName']",
    lastName: "input[data-automation-id='legalNameSection_lastName'], input[data-automation-id*='lastName']",
    email: "input[data-automation-id='email'], input[data-automation-id*='email']",
    phone: "input[data-automation-id='phone-number'], input[data-automation-id*='phone']",
  },
  {
    host: 'greenhouse.io',
    firstName: 'input#first_name',
    lastName: 'input#last_name',
    email: 'input#email',
    phone: 'input#phone',
  },
  {
    host: 'lever.co',
    name: "input[name='name']",
    email: "input[name='email']",
    phone: "input[name='phone']",
  },
  {
    host: 'linkedin.com',
    email: "input[id*='email' i], input[name*='email' i]",
    phone: "input[id*='phoneNumber' i], input[id*='phone' i]",
  },
];

function SENTRA_pickAdapter() {
  var h = location.hostname;
  for (var i = 0; i < SENTRA_SITE_ADAPTERS.length; i++) {
    if (h.indexOf(SENTRA_SITE_ADAPTERS[i].host) !== -1) return SENTRA_SITE_ADAPTERS[i];
  }
  return null;
}

function SENTRA_extractOffer() {
  var sel = ((window.getSelection && window.getSelection().toString()) || '').trim();
  var text = sel;
  if (text.length < 80) {
    var pick = document.querySelector("main, article, [role='main']") || document.body;
    text = ((pick && pick.innerText) || document.body.innerText || '').trim();
  }
  text = text.replace(/\n{3,}/g, '\n\n').slice(0, 12000);
  var m = (document.body.innerText || '').match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return { text: text, email: m ? m[0] : '', title: document.title, url: location.href };
}

// Heurística barata: ¿la página parece una oferta de empleo? (para auto-activar
// el badge en páginas corporativas genéricas). Requiere varias señales.
function SENTRA_looksLikeJob() {
  var t = (document.body.innerText || '').toLowerCase();
  if (t.length < 400) return false;
  var hits = 0;
  var kws = [
    'responsibilities', 'requirements', 'qualifications', 'apply now', 'job description',
    'requisitos', 'responsabilidades', 'postular', 'vacante', 'experiencia', 'ofrecemos',
    'buscamos', 'salary', 'salario', 'full-time', 'tiempo completo', 'seniority',
  ];
  for (var i = 0; i < kws.length; i++) if (t.indexOf(kws[i]) !== -1) hits++;
  return hits >= 3;
}

function SENTRA_fillForm(data) {
  var filled = 0;
  var setVal = function (selector, val) {
    if (!selector || !val) return;
    var n = document.querySelector(selector);
    if (!n) return;
    n.focus();
    n.value = val;
    n.dispatchEvent(new Event('input', { bubbles: true }));
    n.dispatchEvent(new Event('change', { bubbles: true }));
    filled++;
  };
  var a = SENTRA_pickAdapter();
  var parts = String(data.fullName || '').trim().split(/\s+/).filter(Boolean);
  var first = parts.shift() || '';
  var last = parts.join(' ');

  if (a && (a.firstName || a.lastName)) {
    setVal(a.firstName, first);
    setVal(a.lastName, last || first);
  } else {
    setVal(
      (a && a.name) ||
        "input[name*='name' i]:not([name*='user' i]):not([name*='company' i]):not([name*='last' i]), input[id*='fullname' i]",
      data.fullName,
    );
  }
  setVal((a && a.email) || "input[type='email'], input[name*='email' i], input[id*='email' i]", data.email);
  setVal((a && a.phone) || "input[type='tel'], input[name*='phone' i], input[name*='tel' i], input[id*='phone' i]", data.phone);
  return filled;
}
