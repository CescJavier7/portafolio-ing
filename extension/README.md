# Sentra — Escudo de Empleo (extensión de navegador)

FASE 2 del Job Agent: lleva el **Application Firewall** (anti-estafa) y el
**Application Score** a **cualquier** oferta de la web (LinkedIn, Computrabajo,
Workday, Greenhouse, Lever, páginas corporativas…), sin copiar y pegar en el panel.

## Qué hace

Dos formas de usarla: el **badge flotante** (aparece solo sobre la oferta) y el
**popup** (clic en el ícono, funciona en cualquier página).

- **🛡 Escanear (gratis, sin IA):** detecta señales de estafa laboral en la oferta
  de la pestaña activa (pago por adelantado, cripto, datos sensibles, sueldo absurdo
  ajustado a tu país, contacto solo WhatsApp, correo gratuito, acortadores, empresa
  anónima). Instantáneo y determinista — no gasta créditos.
- **🎯 Evaluar (IA):** puntúa la oferta contra tu perfil de búsqueda (Application
  Score + veredicto + "¿por qué NO aplicar?") y avisa si ya te postulaste a algo
  casi idéntico (Duplicate Killer). Consume 1 crédito de tu cuota mensual.
- **➕ Añadir a Sentra:** encola la oferta en tu **Bandeja del agente** en
  cescjavier.dev (persistida en tu cuenta) para evaluarla y prepararla en lote
  después — el puente descubrimiento → decisión.
- **📄 Adaptar CV:** copia la oferta y abre el generador de CV para adaptarlo.
- **⌨ Autocompletar:** rellena nombre/correo/teléfono en formularios, con
  **selectores por sitio** (Workday/Greenhouse/Lever/LinkedIn) y fallback genérico.

### Badge flotante in-page (FASE 2.1)

En sitios de empleo (LinkedIn, Computrabajo, Workday, Greenhouse, Lever, Indeed,
getonbrd, occ, multitrabajos…) aparece un badge abajo a la derecha **solo cuando
la página parece una oferta**. Con "escaneo automático" activo, corre el firewall
(gratis) al abrir la vacante y colorea el badge por riesgo (verde/ámbar/rojo). Un
clic despliega el detalle y los botones Evaluar / Adaptar CV / Autocompletar.
Funciona en SPAs (reevalúa al navegar dentro de LinkedIn). La UI vive en un
**Shadow DOM** → no choca con los estilos del sitio ni al revés.

Se apaga o ajusta desde **Opciones → Badge in-page** (mostrar badge / escaneo
automático). "Evaluar (IA)" siempre es manual: nunca gasta crédito sin tu clic.

### Arquitectura (MV3)

`content.js` (badge, Shadow DOM) + `adapters.js` (extracción y autofill por sitio,
compartidos con el popup) → mensajes a `background.js` (service worker) que hace el
fetch a la API (contexto de extensión con `host_permissions` → sin CORS; los content
scripts sí sufren el CORS de la página, por eso el proxy). El popup usa `activeTab`
+ `scripting` e inyecta `adapters.js` para reutilizar la misma extracción/autofill.

## Instalar (modo desarrollador)

1. Abre `chrome://extensions` (o `edge://extensions`, `brave://extensions`).
2. Activa **Modo de desarrollador** (arriba a la derecha).
3. **Cargar descomprimida** → selecciona esta carpeta `extension/`.
4. Fija el ícono de Sentra en la barra.

## Configurar

1. Panel de Sentra → **Ajustes → API keys** → crea una llave (plan Pro). Cópiala
   (empieza con `sentra_…`; solo se muestra una vez).
2. Clic derecho en el ícono → **Opciones** (o el ⚙ del popup) → pega la API key,
   elige tu **país** y (opcional) tus datos para autocompletar → **Probar conexión**.

La API key es tu credencial revocable: no se guarda tu contraseña, y puedes
anularla desde el panel cuando quieras. Se almacena solo en este navegador.

## Cómo funciona la auth (para el que mantiene el código)

La extensión llama a `POST /api/v1/agent/firewall` y `POST /api/v1/agent/evaluate`
con `Authorization: Bearer <API key>`. El backend usa `get_current_user_flex`
(`services/api/app/api/v1/deps.py`): si el token es un JWT lo resuelve como sesión;
si es una API key, resuelve al **usuario OWNER** de la organización dueña de la
llave. Así la extensión reutiliza el perfil de búsqueda y el historial del dueño
sin sesiones de 15 min ni cookies cross-site (la de refresh es `SameSite=Strict`).

Las peticiones salen del contexto de la extensión (popup), que con
`host_permissions` sobre `api.cescjavier.dev` no está sujeto al CORS de la página.
