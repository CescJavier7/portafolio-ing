---
title: "¿Cómo saber si tu página web es segura? Escanéala en 2 minutos"
date: "2026-07-23"
category: "Ciberseguridad / Web"
description: "Guía práctica para revisar la seguridad de tu sitio web sin ser experto: HTTPS, cabeceras de seguridad, SSL/TLS, SPF y DMARC. Aprende qué mirar y escanea tu dominio gratis en segundos."
---

La mayoría de los sitios web tienen problemas de seguridad que su dueño **ni sospecha**. No hablamos de hackers rompiendo bases de datos: hablamos de configuraciones invisibles —una cabecera que falta, un certificado a punto de expirar, un dominio sin protección contra suplantación— que dejan la puerta entreabierta. La buena noticia: puedes revisar tu **postura de seguridad externa** en un par de minutos, sin instalar nada y sin ser experto.

## Qué significa "seguridad externa" de una web

Es todo lo que un atacante puede ver de tu sitio **desde afuera**, sin entrar a tus sistemas: cómo cifra el tráfico, qué cabeceras de protección envía tu servidor, cómo está configurado tu DNS y si tu dominio se puede suplantar para hacer phishing. Es la **primera capa** que se revisa en cualquier auditoría, porque es la más expuesta y la más fácil de descuidar.

## Los 5 puntos que debes revisar

### 1. HTTPS y certificado TLS
Tu web debe cargar por `https://` con un certificado válido y vigente. Un certificado vencido o mal configurado no solo asusta al visitante con una alerta del navegador: rompe la confianza y puede exponer datos en tránsito. Revisa también que uses **TLS 1.2 o 1.3** (las versiones viejas, TLS 1.0/1.1, son inseguras).

### 2. Cabeceras de seguridad
Son instrucciones que tu servidor envía al navegador para protegerlo. Las esenciales:

- **HSTS** (`Strict-Transport-Security`): fuerza HTTPS y evita ataques de *downgrade*.
- **Content-Security-Policy**: mitiga ataques XSS (inyección de scripts maliciosos).
- **X-Frame-Options**: evita el *clickjacking* (que tu web se incruste en otra para engañar al usuario).
- **X-Content-Type-Options**: evita que el navegador "adivine" tipos de archivo.

La mayoría de webs pasa **solo dos o tres** de estas. Cada una que falta es una debilidad conocida.

### 3. Registro SPF
El **SPF** le dice al mundo qué servidores pueden enviar correo en nombre de tu dominio. Sin él, cualquiera puede enviar correos falsos que parezcan tuyos.

### 4. Registro DMARC
El **DMARC** es el complemento del SPF: define qué hacer con los correos que no pasan la verificación. Es tu principal defensa contra el **phishing que suplanta tu marca**.

### 5. La evolución en el tiempo
Este es el punto que casi nadie mira, y es el más importante. Una web segura hoy puede dejar de serlo mañana: un despliegue elimina una cabecera, un certificado se vence, alguien abre un subdominio olvidado. La seguridad **no es una foto, es una película**.

## Escanea tu web gratis, ahora mismo

No necesitas hacer todo esto a mano. Puedes obtener un **Security Score (0–100)** de tu dominio en segundos, gratis y sin registrarte, con el escáner de **Sentra**:

👉 **[Escanea tu dominio gratis](/es/sentinel/scan)**

Es 100% pasivo: solo observa información pública, **no ataca nada** ni genera carga sobre tu servidor. En segundos ves tu nota (A–F) y exactamente qué controles fallan y cómo corregirlos.

## Qué significa tu puntaje

- **A (90–100):** excelente postura. Mantente vigilando que no baje.
- **B–C (70–89):** faltan controles importantes. Corregibles en una tarde.
- **D–F (menos de 70):** exposición seria. Prioriza HTTPS, HSTS y CSP hoy.

## De la foto a la película: monitoreo continuo

Un escaneo puntual te da la foto de hoy. Pero como vimos, lo que importa es **qué cambia con el tiempo**. Ahí es donde [Sentra](/es/sentinel) va más allá de un escáner: vigila tu dominio 24/7, guarda el historial y te **avisa por correo en cuanto tu seguridad empeora** — con reportes claros y explicaciones respaldadas por IA.

Empieza por la foto. Escanea tu web gratis y descubre en qué punto estás. Corregir lo que encuentres suele tomar menos tiempo del que crees, y el impacto en la confianza de tus usuarios es inmediato.
