---
title: "Sistema NIDS/IPS con Telemetría de Alta Disponibilidad y Defensa Multi-Capa"
date: "2026-05-02"
category: "Ciberseguridad"
description: "Implementación de un ecosistema de seguridad defensiva robusto: un NIDS que alimenta un IPS automatizado, todo monitorizado mediante un pipeline de observabilidad moderno con Snort, Fail2ban, Iptables y el stack Grafana-Loki-Promtail."
---

## El problema de la seguridad estática

La ciberseguridad tradicional asume que un firewall bien configurado es suficiente. Esta suposición es falsa. Las redes modernas son dinámicas, los atacantes son persistentes y el ruido de fondo —tráfico IPv6, pings de diagnóstico, escaneos ICMP— puede ocultar amenazas reales si no se filtra con inteligencia.

Este proyecto nace de una pregunta concreta: ¿puede una infraestructura detectar, analizar y bloquear un ataque de forma autónoma, sin intervención humana, y dejar evidencia forense de todo lo ocurrido?

La respuesta es sí, y la clave está en conectar herramientas especializadas en una cadena coherente donde cada componente hace exactamente lo que mejor sabe hacer.

## Stack tecnológico y responsabilidades

El ecosistema se construye con cuatro capas funcionales bien diferenciadas:

| Capa | Herramienta | Función |
|---|---|---|
| Detección (NIDS) | Snort 2 | Inspección de paquetes y generación de alertas |
| Prevención (IPS) | Fail2ban | Parseo de logs y emisión de órdenes de bloqueo |
| Firewall | Iptables | Aplicación efectiva del bloqueo en Capa 3 del modelo OSI |
| Observabilidad | Grafana + Loki + Promtail | Recolección, agregación y visualización de eventos |

El entorno de pruebas usa dos máquinas: **Kali Linux** como atacante y **Ubuntu Server** como sistema de defensa.

## Arquitectura y flujo defensivo

El sistema opera en cuatro fases encadenadas:

**1. Monitorización de interfaz.** Snort vigila específicamente la interfaz de red expuesta (`enp0s2`), ignorando el tráfico de gestión interna. Esto maximiza el rendimiento y reduce el ruido de análisis.

**2. Filtrado inteligente.** Las reglas locales usan `itype:8` para distinguir entre tráfico de control de red legítimo y ataques reales de descubrimiento (Ping/Nmap). Sin este filtro, cada ping diagnóstico generaría una alerta falsa.

**3. Respuesta automatizada.** Fail2ban lee las alertas de Snort en tiempo real. Al detectar un patrón hostil, instruye a Iptables para aplicar un baneo total (`iptables-allports`) sobre la IP origen. El tiempo de respuesta es de milisegundos.

**4. Telemetría forense.** Cada evento se inyecta en el stack PLG (Promtail → Loki → Grafana) para análisis posterior y visualización de picos de ataque.

## Configuración: los archivos que hacen funcionar el sistema

### Reglas de detección en Snort (`local.rules`)

Las reglas son el corazón del NIDS. Definen qué tráfico es sospechoso y qué mensaje genera la alerta:

```text
# ----------------
# LOCAL RULES
# ----------------
alert icmp any any -> any any (msg: "Deteccion de PING"; sid:1000001; rev:1;)
alert tcp any any -> any 22 (msg: "Intento de conexion SSH"; flags:S; sid:1000002; rev:1;)
alert tcp any any -> any any (msg:"ALERTA ROJA - Escaneo Nmap Detectado"; flags:S; sid:1000050; rev:1;)
alert icmp any any -> any any (msg:"ALERTA ROJA - ATAQUE PING DETECTADO"; itype:8; sid:1000055; rev:4;)
```

Cada regla tiene un `sid` único y una revisión (`rev`) que permite versionar los cambios. El uso de `itype:8` en la última regla es crítico: filtra únicamente los paquetes ICMP de tipo Echo Request (el ping activo), descartando respuestas y mensajes de control que no representan amenaza.

### Filtro de parseo para Fail2ban (`snort-filter.conf`)

Fail2ban necesita una expresión regular que extraiga la IP atacante del log de Snort:

```text
[Definition]
failregex = .* ALERTA ROJA .* <HOST> ->
ignoreregex =
```

El patrón `<HOST>` es el placeholder que Fail2ban reemplaza por la IP detectada. El prefijo `ALERTA ROJA` actúa como discriminador: solo los eventos críticos disparan el bloqueo, evitando baneos por tráfico ruidoso pero inofensivo.

### Configuración de la jaula de baneo (`jail.local`)

La "jaula" define el comportamiento de Fail2ban para el servicio Snort:

```ini
[snort]
enabled     = true
ignoreip    = 127.0.0.1/8 192.168.64.11
banaction   = iptables-allports
port        = all
filter      = snort
logpath     = /var/log/snort/alert
maxretry    = 1
bantime     = 3600
```

Los parámetros clave son tres. `maxretry = 1` significa tolerancia cero: un solo evento dispara el bloqueo. `banaction = iptables-allports` aplica el baneo en todos los puertos simultáneamente, no solo en el servicio atacado. Y `ignoreip` protege la IP de gestión del propio administrador de un auto-baneo accidental.

### Pipeline de telemetría (`promtail-local-config.yaml`)

Promtail actúa como agente de recolección, enviando los logs de Snort hacia Loki:

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

clients:
  - url: http://localhost:3100/loki/api/v1/push

scrape_configs:
  - job_name: snort
    static_configs:
      - targets:
          - localhost
        labels:
          job: snort-alerts
          __path__: /var/log/snort/alert
```

La etiqueta `job: snort-alerts` permite filtrar en Grafana exclusivamente los eventos de Snort, separándolos de cualquier otro log del sistema. Loki recibe los datos en `localhost:3100` y los indexa para consultas posteriores.

## Evidencias de funcionamiento

### Telemetría en tiempo real

El dashboard de Grafana muestra el flujo de alertas con granularidad temporal. Es posible identificar visualmente el momento exacto del ataque, la duración del intento y la caída de eventos tras el bloqueo.

![Telemetría Grafana](assets/grafana_dashboard.png)

### Defensa dinámica y bloqueo multi-IP

El sistema fue sometido a una prueba de resistencia con múltiples atacantes simultáneos. Snort identificó y Fail2ban baneó de forma independiente varias IPs virtuales (`.10`, `.20`, `.99`), demostrando capacidad de respuesta ante botnets o escaneos distribuidos.

![Bloqueo Fail2ban](assets/fail2ban_bloqueo.png)

### Mitigación confirmada: perspectiva del atacante

Tras el baneo automático, cualquier escaneo con Nmap desde Kali Linux devuelve estado `filtered` en todos los puertos. El atacante pierde completamente la capacidad de reconocimiento.

![Nmap Filtrado](assets/kali_nmap_filtrado.png)

## Lecciones aprendidas y posibles mejoras

La implementación revela algunas decisiones de diseño que vale la pena documentar para iteraciones futuras.

El uso de `maxretry = 1` es agresivo. Funciona bien en entornos controlados, pero en producción podría generar falsos positivos si hay usuarios legítimos con comportamiento inusual. Subir a `maxretry = 3` con un `findtime` corto ofrece un equilibrio más robusto.

El `bantime = 3600` (una hora) puede ser insuficiente ante atacantes persistentes. Para amenazas avanzadas, es recomendable implementar baneos escalonados o permanentes para IPs reincidentes.

Finalmente, el stack PLG podría extenderse con alertas proactivas: Grafana permite configurar notificaciones hacia Slack, correo o PagerDuty cuando los eventos superan un umbral, convirtiendo el sistema de pasivo a activo en términos de comunicación.

## Conclusión

La integración de Snort, Fail2ban, Iptables y el stack PLG demuestra que la seguridad efectiva no es estática ni reactiva en sentido humano. La infraestructura se defiende sola.

La clave del diseño es la separación clara de responsabilidades: Snort detecta, Fail2ban decide, Iptables bloquea y Grafana narra. Ninguna herramienta intenta hacer todo; cada una hace exactamente lo suyo y pasa el testigo a la siguiente.

El verdadero valor no está en el bloqueo en sí —cualquier firewall puede bloquear—, sino en la **visibilidad total del incidente**: quién atacó, cuándo, con qué técnica, y qué hizo el sistema para responder. Eso es lo que convierte un conjunto de herramientas en un sistema de seguridad real.

---

## Archivos de configuración

- `local.rules` — Reglas de Snort optimizadas para evitar falsos positivos
- `jail.local` — Configuración de la jaula de baneo con persistencia
- `snort-filter.conf` — Filtro Regex de alta precisión para parseo de logs
- `promtail-local-config.yaml` — Configuración del pipeline de logs hacia Loki

---

## Referencias

- Roesch, M. (1999). *Snort: Lightweight Intrusion Detection for Networks*. USENIX LISA Conference.
- Fail2ban Project. (2023). *Fail2ban Documentation*. https://www.fail2ban.org/wiki/
- Grafana Labs. (2024). *Loki Documentation: Log Aggregation System*. https://grafana.com/docs/loki/
- Nmap Project. (2024). *Nmap Network Scanning*. https://nmap.org/book/
