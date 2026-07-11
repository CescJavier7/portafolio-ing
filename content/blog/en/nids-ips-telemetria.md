---
title: "NIDS/IPS System with High-Availability Telemetry and Multi-Layer Defense"
date: "2026-05-02"
category: "Cybersecurity"
description: "Implementation of a robust defensive security ecosystem: a NIDS that feeds an automated IPS, all monitored through a modern observability pipeline with Snort, Fail2ban, Iptables, and the Grafana-Loki-Promtail stack."
---

## The problem with static security

Traditional cybersecurity assumes a well-configured firewall is enough. That assumption is false. Modern networks are dynamic, attackers are persistent, and background noise —IPv6 traffic, diagnostic pings, ICMP scans— can hide real threats if it isn't filtered intelligently.

This project starts from a concrete question: can an infrastructure detect, analyze, and block an attack autonomously, without human intervention, while leaving forensic evidence of everything that happened?

The answer is yes, and the key lies in connecting specialized tools into a coherent chain where each component does exactly what it does best.

## Technology Stack and Responsibilities

The ecosystem is built on four clearly differentiated functional layers:

| Layer | Tool | Function |
|---|---|---|
| Detection (NIDS) | Snort 2 | Packet inspection and alert generation |
| Prevention (IPS) | Fail2ban | Log parsing and issuing block orders |
| Firewall | Iptables | Effective blocking at Layer 3 of the OSI model |
| Observability | Grafana + Loki + Promtail | Collection, aggregation, and visualization of events |

The test environment uses two machines: **Kali Linux** as the attacker and **Ubuntu Server** as the defense system.

## Architecture and Defensive Flow

The system operates in four chained phases:

**1. Interface monitoring.** Snort specifically watches the exposed network interface (`enp0s2`), ignoring internal management traffic. This maximizes performance and reduces analysis noise.

**2. Intelligent filtering.** Local rules use `itype:8` to distinguish between legitimate network control traffic and real discovery attacks (Ping/Nmap). Without this filter, every diagnostic ping would trigger a false alert.

**3. Automated response.** Fail2ban reads Snort's alerts in real time. Upon detecting a hostile pattern, it instructs Iptables to apply a full ban (`iptables-allports`) on the source IP. Response time is measured in milliseconds.

**4. Forensic telemetry.** Every event is fed into the PLG stack (Promtail → Loki → Grafana) for later analysis and visualization of attack spikes.

## Configuration: the files that make the system work

### Snort detection rules (`local.rules`)

The rules are the heart of the NIDS. They define what traffic is suspicious and what message triggers the alert:

```text
# ----------------
# LOCAL RULES
# ----------------
alert icmp any any -> any any (msg: "Deteccion de PING"; sid:1000001; rev:1;)
alert tcp any any -> any 22 (msg: "Intento de conexion SSH"; flags:S; sid:1000002; rev:1;)
alert tcp any any -> any any (msg:"ALERTA ROJA - Escaneo Nmap Detectado"; flags:S; sid:1000050; rev:1;)
alert icmp any any -> any any (msg:"ALERTA ROJA - ATAQUE PING DETECTADO"; itype:8; sid:1000055; rev:4;)
```

Each rule has a unique `sid` and a revision (`rev`) that allows changes to be versioned. The use of `itype:8` in the last rule is critical: it filters only ICMP Echo Request packets (the active ping), discarding replies and control messages that don't represent a threat.

### Fail2ban parsing filter (`snort-filter.conf`)

Fail2ban needs a regular expression that extracts the attacking IP from the Snort log:

```text
[Definition]
failregex = .* ALERTA ROJA .* <HOST> ->
ignoreregex =
```

The `<HOST>` pattern is the placeholder Fail2ban replaces with the detected IP. The `ALERTA ROJA` prefix acts as a discriminator: only critical events trigger the block, avoiding bans caused by noisy but harmless traffic.

### Ban jail configuration (`jail.local`)

The "jail" defines Fail2ban's behavior for the Snort service:

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

Three parameters matter most. `maxretry = 1` means zero tolerance: a single event triggers the block. `banaction = iptables-allports` applies the ban across all ports simultaneously, not just the attacked service. And `ignoreip` protects the administrator's own management IP from an accidental self-ban.

### Telemetry pipeline (`promtail-local-config.yaml`)

Promtail acts as the collection agent, shipping Snort logs to Loki:

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

The `job: snort-alerts` label allows filtering exclusively for Snort events in Grafana, separating them from any other system log. Loki receives the data on `localhost:3100` and indexes it for later queries.

## Evidence of Operation

### Real-time telemetry

The Grafana dashboard shows the alert flow with temporal granularity. It's possible to visually identify the exact moment of the attack, its duration, and the drop in events after the block.

### Dynamic defense and multi-IP blocking

The system was put through a stress test with multiple simultaneous attackers. Snort identified and Fail2ban independently banned several virtual IPs (`.10`, `.20`, `.99`), demonstrating the ability to respond to botnets or distributed scans.

### Confirmed mitigation: the attacker's perspective

After the automatic ban, any Nmap scan from Kali Linux returns a `filtered` state on every port. The attacker completely loses reconnaissance capability.

## Lessons Learned and Possible Improvements

The implementation reveals a few design decisions worth documenting for future iterations.

Using `maxretry = 1` is aggressive. It works well in controlled environments, but in production it could generate false positives if legitimate users behave unusually. Raising it to `maxretry = 3` with a short `findtime` offers a more robust balance.

The `bantime = 3600` (one hour) may be insufficient against persistent attackers. For advanced threats, it's advisable to implement escalating or permanent bans for repeat offenders.

Finally, the PLG stack could be extended with proactive alerts: Grafana can be configured to send notifications to Slack, email, or PagerDuty when events exceed a threshold, turning the system from passive to active in terms of communication.

## Conclusion

The integration of Snort, Fail2ban, Iptables, and the PLG stack shows that effective security isn't static or reactive in the human sense. The infrastructure defends itself.

The key to the design is a clear separation of responsibilities: Snort detects, Fail2ban decides, Iptables blocks, and Grafana narrates. No single tool tries to do everything; each one does exactly its job and hands off to the next.

The real value isn't in the block itself —any firewall can block— but in **full incident visibility**: who attacked, when, with what technique, and what the system did to respond. That's what turns a set of tools into a real security system.

---

## Configuration files

- `local.rules` — Snort rules optimized to avoid false positives
- `jail.local` — Ban jail configuration with persistence
- `snort-filter.conf` — High-precision regex filter for log parsing
- `promtail-local-config.yaml` — Log pipeline configuration toward Loki

---

## References

- Roesch, M. (1999). *Snort: Lightweight Intrusion Detection for Networks*. USENIX LISA Conference.
- Fail2ban Project. (2023). *Fail2ban Documentation*. https://www.fail2ban.org/wiki/
- Grafana Labs. (2024). *Loki Documentation: Log Aggregation System*. https://grafana.com/docs/loki/
- Nmap Project. (2024). *Nmap Network Scanning*. https://nmap.org/book/