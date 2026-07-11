---
title: "Auditoría de Seguridad Web Ofensiva: Explotación y Mitigación de Vulnerabilidades OWASP Top 10"
date: "2026-05-03"
category: "Ciberseguridad / Pentesting"
description: "Análisis técnico exhaustivo de una aplicación moderna (Angular/Node.js). Se documenta la explotación de fallas lógicas mediante Inyección SQL, ejecución de código cliente vía DOM XSS y el análisis forense del tráfico de APIs REST."
---

## El problema de la confianza implícita en la capa de aplicación

La ciberseguridad tradicional asume que asegurar el perímetro de red protege los activos internos. En el desarrollo web moderno, esta suposición es peligrosa. Las aplicaciones web exponen la lógica de negocio y las bases de datos directamente a Internet a través del puerto 443. Si el código fuente confía ciegamente en la entrada del usuario, ni el firewall más avanzado podrá detener una brecha de datos.

Este proyecto nace de una premisa analítica: ¿Puede un atacante sin credenciales manipular la sintaxis subyacente de la aplicación para escalar privilegios, ejecutar código en navegadores de terceros y extraer telemetría sensible?

La respuesta es afirmativa. La investigación demuestra que las vulnerabilidades críticas no surgen de fallos criptográficos complejos, sino de la mezcla insegura de datos no confiables con instrucciones del sistema, rompiendo el aislamiento de la arquitectura.

## Ecosistema de Auditoría y Responsabilidades

El entorno de pruebas se diseñó utilizando una arquitectura aislada y herramientas estándar de la industria, estructuradas en capas funcionales:

| Capa | Herramienta | Función |
|---|---|---|
| Intercepción y Análisis | Burp Suite (Proxy/Repeater) | Manipulación de paquetes HTTP/HTTPS en tiempo real y reescritura de cabeceras. |
| Enrutamiento | FoxyProxy | Gestión dinámica de túneles de tráfico entre el navegador y el proxy. |
| Entorno Atacante | Kali Linux | Sistema operativo base con dependencias de red y ataque preconfiguradas. |
| Entorno Víctima | OWASP Juice Shop (Docker) | Aplicación vulnerable por diseño (Node.js/Angular/SQLite) alojada en un contenedor local en macOS. |

## Vectores de Explotación y Análisis Forense

La auditoría se dividió en tres fases de compromiso escalonado:

**1. Evaluación del perímetro de Autenticación.** Se interceptaron las peticiones `POST` dirigidas al endpoint `/rest/user/login`. El objetivo fue validar la integridad de la sanitización en el puente de comunicación entre Node.js y la base de datos SQLite.

**2. Manipulación del DOM (Document Object Model).** Se analizó la barra de búsqueda de la aplicación para identificar si el framework Front-end (Angular) filtraba correctamente las secuencias de escape HTML antes de renderizarlas en el navegador del cliente.

**3. Análisis de Telemetría en la API.** Se forzó la invalidación del caché HTTP para inspeccionar las respuestas puras (`JSON`) del servidor en el módulo de métodos de pago, verificando si el enmascaramiento de tarjetas se realizaba de forma segura en el Back-end o de forma insegura en el Front-end.

## Análisis de Payloads: La anatomía del ataque

### Salto de Autenticación (Authentication Bypass)

El formulario de inicio de sesión concatenaba cadenas de texto directamente en la instrucción SQL. Se inyectó el siguiente payload en el campo `email`:

```json
{
  "email": "' OR 1=1--",
  "password": "123"
}
```

Al inyectar la comilla simple ('), se cerró prematuramente la cadena original. La inyección de la cláusula booleana OR 1=1 forzó a que la evaluación condicional de la consulta fuera absoluta (Verdadera). Finalmente, el doble guion (--) anuló la validación posterior de la contraseña. Esto comprometió instantáneamente el principio de Integridad y Confidencialidad del sistema.

Ejecución de Código Arbitrario (DOM XSS)
Para evadir las protecciones básicas contra secuencias de comandos (scripts) del framework Angular, se utilizó un vector de ataque basado en la inyección de marcos (iframes) que ejecutan JavaScript en su atributo de origen:

```
<iframe src="javascript:alert(1)">
```

Dado que la aplicación procesó y reflejó esta cadena sin aplicar HTML Encoding (codificación de entidades), el navegador de la víctima interpretó el texto como un elemento estructural legítimo de la página, ejecutando el código malicioso en el contexto de seguridad del dominio.

## Evidencias de Compromiso (PoC)
### Captura de Sesión Privilegiada
A través de la herramienta Repeater de Burp Suite, se comprobó que el servidor respondió con un código HTTP/1.1 200 OK tras recibir el payload SQL. La respuesta incluyó un JSON Web Token (JWT) válido asociado a la cuenta admin@juice-sh.op, otorgando control administrativo total sobre la plataforma.

### Ejecución del lado del cliente
La inyección en la barra de búsqueda derivó en una alerta emergente generada directamente por el motor V8 del navegador, confirmando la vulnerabilidad de Cross-Site Scripting y demostrando la capacidad de un atacante para secuestrar sesiones de usuarios legítimos.
###Auditoría de Evasión de Caché (HTTP 304)
Al interceptar el tráfico de la API de pagos, el servidor inicialmente devolvió un 304 Not Modified. Al eliminar la cabecera condicional If-None-Match, se forzó al servidor a revelar el payload JSON. Se demostró que la aplicación aplica un Data Masking correcto en el servidor ("cardNum": "************4368"), mitigando la exposición directa de datos (CWE-200).

## Lecciones Aprendidas y Remediación Arquitectónica
La auditoría revela que las vulnerabilidades más críticas derivan de fallos arquitectónicos en el manejo de datos, no de errores criptográficos. Para blindar la infraestructura, se recomiendan las siguientes políticas de Security by Design:

**1. Prevención de Inyecciones (A03:2021-Injection):** Es imperativo erradicar la concatenación de variables en consultas a bases de datos. Se deben implementar Consultas Preparadas (Prepared Statements) o utilizar ORMs de forma segura para garantizar que la base de datos trate la entrada del usuario estrictamente como texto escalar, bloqueando cualquier alteración del Árbol de Sintaxis Abstracta (AST) de la consulta.

**2. Defensa contra XSS:** La mitigación requiere la aplicación de Context-Aware Output Encoding en el Back-end antes de reflejar cualquier dato en el Front-end. Adicionalmente, el servidor debe emitir cabeceras estrictas de Content Security Policy (CSP) que deshabiliten la ejecución de scripts en línea (unsafe-inline).

## Conclusión
El análisis técnico estructurado confirma que la seguridad de una aplicación web es tan fuerte como su punto de entrada más débil. La explotación exitosa del OWASP Top 10 en este entorno demuestra que los controles de red (firewalls, WAFs) son insuficientes si la lógica de la aplicación es intrínsecamente vulnerable.

La verdadera madurez en ciberseguridad se alcanza cuando las remediaciones no son "parches" aplicados tras un incidente, sino decisiones de arquitectura integradas en el ciclo de vida del desarrollo de software (SDLC).

## Referencias Académicas y Estándares

- OWASP Foundation. (2021). OWASP Top 10: Web Application Security Risks. https://owasp.org/Top10/

- MITRE Corporation. (2024). CWE-89: Improper Neutralization of Special Elements used in an SQL Command. https://cwe.mitre.org/data/definitions/89.html

- MITRE Corporation. (2024). CWE-79: Improper Neutralization of Input During Web Page Generation (Cross-site Scripting). https://cwe.mitre.org/data/definitions/79.html

- PortSwigger. (2024). Web Security Academy: SQL Injection & Cross-Site Scripting methodologies.