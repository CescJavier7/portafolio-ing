---
title: "Autenticación y sesiones: dónde se rompen los logins"
module: "Fundamentos de seguridad web"
order: 4
duration: "24 min"
access: "pro"
description: "Hashing de contraseñas, tokens de alta entropía, rotación de refresh y mensajes anti-enumeración: las decisiones reales de un login serio."
quiz:
  - q: "¿Por qué NO se usa SHA-256 para guardar contraseñas?"
    options:
      - "Porque es un algoritmo roto"
      - "Porque es demasiado rápido: permite miles de millones de intentos por segundo si se filtra la base"
      - "Porque no produce siempre la misma salida"
      - "Porque no está estandarizado"
    answer: 1
    explain: "La velocidad, que es una virtud en un hash normal, es el defecto fatal aquí. Argon2/bcrypt son lentos y con memoria a propósito."
  - q: "Para un token de sesión de 256 bits generado al azar, ¿qué guardas en la base?"
    options:
      - "El token en claro, para poder compararlo"
      - "Su hash SHA-256 (rápido e indexable): al ser aleatorio, no hay diccionario que atacar"
      - "Su hash Argon2, igual que una contraseña"
      - "Nada: los tokens no se guardan"
    answer: 1
    explain: "Argon2 es para secretos de baja entropía (contraseñas). Un token aleatorio de 256 bits no se puede adivinar, así que basta SHA-256 — y encima se puede indexar para buscarlo."
  - q: "El login responde 'ese correo no existe'. ¿Qué problema hay?"
    options:
      - "Ninguno: ayuda al usuario"
      - "Permite ENUMERAR cuentas: el atacante descubre qué correos están registrados"
      - "Hace la respuesta más lenta"
      - "Rompe el estándar OAuth"
    answer: 1
    explain: "La respuesta debe ser idéntica exista o no la cuenta: 'Credenciales inválidas'. Lo mismo aplica a 'recuperar contraseña'."
  - q: "¿Para qué sirve ROTAR el refresh token en cada uso?"
    options:
      - "Para que el usuario tenga que volver a entrar cada día"
      - "Para detectar el robo: si un token ya usado reaparece, alguien lo copió y se revoca toda la familia"
      - "Para ahorrar espacio en la base de datos"
      - "Para cumplir con GDPR"
    answer: 1
    explain: "Un refresh de un solo uso convierte el robo silencioso en una señal detectable."
  - q: "¿Qué atributo de cookie mitiga el CSRF?"
    options: ["HttpOnly", "Secure", "SameSite", "Path"]
    answer: 2
    explain: "SameSite frena que otro sitio dispare peticiones autenticadas contra el tuyo. HttpOnly es contra XSS y Secure exige HTTPS."
---

Todo lo demás da igual si la puerta de entrada cede. Y los logins no se rompen por criptografía exótica: se rompen por **decisiones aburridas tomadas a la ligera**.

Vamos a recorrer esas decisiones una por una, con las que se tomaron de verdad al construir Sentra.

## 1. La contraseña nunca se guarda

Ni cifrada. Se guarda un **hash**, y el hash tiene que ser **lento a propósito**.

```python
# MAL: SHA-256 es rapidísimo. Si te filtran la base, una GPU prueba
# miles de millones de candidatas por segundo.
hashed = hashlib.sha256(password.encode()).hexdigest()

# BIEN: Argon2id — lento y con coste de MEMORIA, que es lo que
# ahoga a las GPUs. El salt va dentro del propio hash.
from argon2 import PasswordHasher
ph = PasswordHasher()
hashed = ph.hash(password)
```

La regla que hay debajo: **el coste de verificar UNA contraseña es despreciable para ti (una vez por login) y ruinoso para quien prueba millones**. Esa asimetría es toda la defensa.

## 2. Los tokens no son contraseñas

Y por eso **no se hashean igual**. Aquí es donde mucha gente aplica la receta equivocada.

| | Contraseña | Token de sesión / API key |
|---|---|---|
| Entropía | Baja (la eligió un humano) | Alta (256 bits aleatorios) |
| Amenaza | Diccionario, fuerza bruta | Ninguna: no se adivina |
| Hash correcto | **Argon2id** (lento) | **SHA-256** (rápido) |
| ¿Indexable? | No hace falta | **Sí**, y se necesita para buscarlo |

Un token de 256 bits generado con un CSPRNG no tiene diccionario que valga. Aplicarle Argon2 solo te costaría latencia en cada petición — y como Argon2 lleva salt aleatorio, **ni siquiera podrías indexarlo** para encontrarlo.

```python
token = secrets.token_urlsafe(32)                        # se lo damos al usuario UNA vez
digest = hashlib.sha256(token.encode()).hexdigest()      # esto es lo que guardamos
```

Si te filtran la tabla, el atacante tiene digests inútiles: no puede revertirlos ni adivinar el original.

## 3. Access corto + refresh rotativo

Un access token que vive 15 minutos limita el daño de un robo. Pero pedirle al usuario que entre cada 15 minutos es inaceptable — para eso está el **refresh token**, de larga vida y **de un solo uso**:

1. El cliente usa el refresh para pedir un access nuevo.
2. El servidor **invalida ese refresh** y emite uno nuevo (rotación).
3. Si alguna vez reaparece un refresh **ya usado** → o hay un ladrón o hubo una copia: se **revoca toda la familia** y se obliga a re-autenticar.

Sin rotación, un refresh robado da acceso indefinido y en silencio. Con rotación, **el robo se delata solo**. Es el mecanismo que convierte un incidente invisible en una alarma.

## 4. Anti-enumeración: no confirmes nada

```python
# MAL: acabas de decirle al atacante qué correos existen.
if user is None:
    raise HTTPException(404, "Ese correo no está registrado")
if not verify(password, user.password_hash):
    raise HTTPException(401, "Contraseña incorrecta")

# BIEN: misma respuesta en ambos casos.
if user is None or not verify(password, user.password_hash):
    raise HTTPException(401, "Credenciales inválidas")
```

Y ojo con el **canal lateral del tiempo**: si cuando el usuario no existe respondes al instante y cuando existe tardas 300 ms (lo que cuesta Argon2), el atacante enumera igual, midiendo. La solución es **verificar siempre contra un hash señuelo** aunque el usuario no exista.

Lo mismo en "recuperar contraseña": la respuesta es siempre *"si ese correo está registrado, te enviamos un enlace"*. Nunca confirmes ni niegues.

## 5. Frenos y cookies

- **Rate limiting** en login, registro y recuperación: sin freno, la fuerza bruta es cuestión de tiempo.
- **Cookies**: `HttpOnly` (invisible a JS → un XSS no la roba), `Secure` (solo HTTPS), `SameSite` (frena CSRF). Tres atributos, tres amenazas distintas: no son intercambiables.

## Lo que te llevas

- Contraseñas: **Argon2id**, lento a propósito. Tokens: **SHA-256**, rápido e indexable. No los mezcles.
- **Access corto + refresh rotativo de un solo uso**: el robo deja de ser silencioso.
- **Mismo mensaje y mismo tiempo** existan o no las credenciales: enumerar cuentas es el primer paso de todo ataque dirigido.
- Rate limiting y atributos de cookie: baratos de poner, carísimos de olvidar.

Con esto cierras la ruta de **Fundamentos de seguridad web**: reconoces las categorías (OWASP), sabes por qué ocurre la inyección, cómo se convierte un dato en código en el navegador, y cómo se sostiene una sesión sin regalarla.
