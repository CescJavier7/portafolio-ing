---
title: "Inyección SQL: explotarla y matarla"
module: "Fundamentos de seguridad web"
order: 2
duration: "22 min"
access: "pro"
description: "Cómo funciona una inyección SQL de verdad, cómo se explota paso a paso, y la ÚNICA forma correcta de eliminarla: consultas parametrizadas."
quiz:
  - q: "¿Cuál es la ÚNICA solución correcta a la inyección SQL?"
    options: ["Escapar las comillas del input", "Consultas parametrizadas", "Poner un WAF delante", "Lista negra de palabras SQL"]
    answer: 1
    explain: "Parametrizar separa el dato de la instrucción por diseño. Lo demás son parches evadibles."
  - q: "En `' OR '1'='1' --`, ¿qué hace el `--` final?"
    options:
      - "Fuerza un error de sintaxis"
      - "Comenta el resto de la consulta, anulando la comprobación de la contraseña"
      - "Cierra la conexión a la base de datos"
      - "Escapa la comilla anterior"
    answer: 1
    explain: "Al comentar lo que sigue, la verificación de la contraseña desaparece de la consulta."
  - q: "Estás construyendo una consulta SQL con un f-string de Python. ¿Qué significa eso?"
    options:
      - "Que es más rápido que parametrizar"
      - "Que estás escribiendo un bug de seguridad"
      - "Que te falta un índice en la tabla"
      - "Nada: es equivalente a usar placeholders"
    answer: 1
    explain: "Concatenar datos dentro del SQL es exactamente la condición que hace posible la inyección."
  - q: "¿Por qué el principio de menor privilegio importa aunque parametrices?"
    options:
      - "Porque acelera las consultas"
      - "Porque es defensa en profundidad: si algo falla, limita el daño (sin DROP, sin leer otras tablas)"
      - "Porque lo exige el estándar SQL"
      - "Porque sustituye a la parametrización"
    answer: 1
    explain: "Ninguna capa es infalible. Un usuario de BD con permisos mínimos convierte una brecha total en un incidente contenido."
---

La inyección SQL lleva 25 años en la lista y sigue viva. La razón es simple y profunda: ocurre cada vez que **mezclamos datos con instrucciones**. Si entiendes esa frase, entiendes toda la categoría A03.

## El pecado original

```python
# NUNCA hagas esto:
query = f"SELECT * FROM users WHERE email = '{email}' AND pass = '{password}'"
db.execute(query)
```

El `email` lo escribe el usuario. Y lo estamos **pegando dentro de la instrucción SQL**. El motor no distingue "dato" de "código": ejecuta todo junto.

## La explotación, paso a paso

El atacante escribe como email:

```text
' OR '1'='1' --
```

La consulta resultante queda:

```sql
SELECT * FROM users WHERE email = '' OR '1'='1' -- ' AND pass = '...'
```

- `'' OR '1'='1'` es **siempre verdadero** → devuelve todas las filas.
- `--` comenta el resto → la verificación de contraseña **desaparece**.

Resultado: login sin contraseña, como el primer usuario de la tabla (a menudo el admin). Con un poco más de arte (`UNION SELECT`), el mismo agujero permite **leer cualquier tabla** de la base.

## Lo que NO funciona (y por qué)

- **"Escapar comillas"**: frágil. Hay decenas de formas de romper el escape (codificaciones, comentarios anidados). Estás jugando al gato y al ratón, y el ratón gana.
- **"Validar que no tenga palabras SQL"**: una lista negra siempre se puede evadir. Y bloqueas apellidos legítimos como *O'Brien*.
- **Un WAF**: ayuda como capa extra, pero es una curita sobre un diseño roto.

## La ÚNICA forma correcta: consultas parametrizadas

La solución no es limpiar el dato. Es **no mezclarlo nunca** con la instrucción. Le pasas la consulta y los datos por canales separados; el driver los mantiene aparte.

```python
# Consulta parametrizada — el driver NUNCA interpreta `email` como SQL:
row = await db.execute(
    select(User).where(User.email == email, User.pass_hash == pass_hash)
)
```

O en SQL crudo, con placeholders (nunca f-strings):

```python
await db.execute(
    text("SELECT * FROM users WHERE email = :email"),
    {"email": email},
)
```

La diferencia es de **arquitectura**, no de higiene: el `:email` viaja como *parámetro*, y el motor lo trata como un valor opaco. `' OR '1'='1'` se convierte en, literalmente, un email que no existe. La inyección deja de ser posible **por construcción**.

> Regla de oro: si estás construyendo una consulta con `+`, `f""` o `.format()`, estás escribiendo un bug de seguridad. Punto.

## Defensa en profundidad (lo que suma encima)

1. **Mínimo privilegio en la BD**: la cuenta de la app no debería poder `DROP TABLE` ni leer `pg_shadow`.
2. **ORM con parámetros por defecto** (SQLAlchemy, Prisma): te empuja al camino correcto.
3. **Errores genéricos**: nunca devuelvas el error SQL crudo al cliente — es un mapa para el atacante.

## Ejercicio

Toma este endpoint vulnerable y reescríbelo parametrizado. Luego intenta la inyección contra ambos y comprueba que la segunda versión trata `' OR '1'='1'` como un simple string.

```python
@app.get("/search")
def search(q: str):
    return db.execute(f"SELECT id, name FROM products WHERE name LIKE '%{q}%'")
```

## Lo que te llevas

- La inyección no es un bug de "limpiar datos": es un bug de **mezclar datos con código**.
- Las **consultas parametrizadas** la eliminan por diseño; todo lo demás son parches.
- Este mismo criterio se extiende a **toda** inyección (comandos del SO, LDAP, XSS): separa el dato de la instrucción y el problema desaparece.
