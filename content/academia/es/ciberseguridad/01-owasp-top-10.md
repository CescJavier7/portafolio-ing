---
title: "OWASP Top 10: el mapa del terreno"
module: "Fundamentos de seguridad web"
order: 1
duration: "16 min"
access: "free"
description: "Las 10 categorías de riesgo web más críticas según OWASP, con ejemplos que reconocerás en tu propio código."
---

La mayoría de las brechas no vienen de un hacker genial con un 0-day. Vienen de errores **conocidos, documentados y repetidos**. El **OWASP Top 10** es la lista de esos errores: las 10 categorías de riesgo más críticas en aplicaciones web, mantenida por miles de profesionales de seguridad.

Si aprendes a reconocer estas 10, evitas el 90% de los problemas reales. Ese es el criterio que buscamos: **seguridad desde el diseño, no parchada al final.**

## Por qué una lista y no una checklist de vulnerabilidades

Una vulnerabilidad concreta (un CVE) envejece: se parchea y desaparece. Una **categoría de riesgo** no: "inyección" seguirá existiendo mientras haya código que mezcle datos con instrucciones. Por eso OWASP piensa en categorías, no en bugs sueltos.

## Las 10 categorías (edición vigente)

| # | Categoría | En una frase |
|---|---|---|
| A01 | Broken Access Control | Un usuario accede a lo que NO le corresponde (IDOR, saltarse roles) |
| A02 | Cryptographic Failures | Datos sensibles expuestos: sin cifrar, mal cifrado o en tránsito claro |
| A03 | Injection | Datos no confiables interpretados como código (SQL, comandos, XSS) |
| A04 | Insecure Design | El fallo está en el diseño, no en la implementación |
| A05 | Security Misconfiguration | Defaults inseguros, cabeceras faltantes, puertos abiertos |
| A06 | Vulnerable Components | Dependencias con vulnerabilidades conocidas |
| A07 | Auth Failures | Login débil, sesiones mal manejadas, fuerza bruta sin freno |
| A08 | Data Integrity Failures | Deserialización insegura, updates sin firmar |
| A09 | Logging & Monitoring Failures | No te enteras de que te atacaron |
| A10 | Server-Side Request Forgery | El servidor hace peticiones que no debería (SSRF) |

## Cómo lo verás en tu propio código

No es teoría. Mira este endpoint — ¿ves el problema?

```python
@app.get("/api/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, user: User = Depends(current_user)):
    # Trae la factura por id... y la devuelve.
    return await db.get(Invoice, invoice_id)
```

Es **A01 (Broken Access Control)**, en su forma clásica: **IDOR**. Nada verifica que la factura `invoice_id` **pertenezca** a `user`. Cambio el id en la URL y leo las facturas de otro cliente.

El arreglo es una línea de criterio: **toda query se filtra por el dueño del token.**

```python
@app.get("/api/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, user: User = Depends(current_user)):
    inv = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id, Invoice.user_id == user.id)
    )
    inv = inv.scalar_one_or_none()
    if inv is None:
        raise HTTPException(404)  # 404, no 403: no revelamos que existe
    return inv
```

Ese mismo principio — *aislamiento por propietario* — es exactamente el que usa **Sentra** en cada endpoint (anti-IDOR por organización). No es casualidad: es el Top 10 aplicado.

## Lo que te llevas

- El Top 10 no son 10 bugs: son 10 **formas de pensar mal** la seguridad.
- **A01, A02 y A03** concentran la mayoría de las brechas reales — empieza por ahí.
- La seguridad se gana en el **diseño** (A04): un buen criterio evita categorías enteras de una sola vez.

En la próxima lección bajamos a la más famosa de todas — **inyección SQL** — y la explotamos y arreglamos con las manos.
