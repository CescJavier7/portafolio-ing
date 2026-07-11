---
title: "Offensive Web Security Audit: Exploitation and Mitigation of OWASP Top 10 Vulnerabilities"
date: "2026-05-03"
category: "Cybersecurity / Pentesting"
description: "In-depth technical analysis of a modern application (Angular/Node.js). Documents the exploitation of logic flaws through SQL Injection, client-side code execution via DOM XSS, and forensic analysis of REST API traffic."
---

## The problem of implicit trust at the application layer

Traditional cybersecurity assumes that securing the network perimeter protects internal assets. In modern web development, that assumption is dangerous. Web applications expose business logic and databases directly to the Internet over port 443. If the source code blindly trusts user input, not even the most advanced firewall can stop a data breach.

This project starts from an analytical premise: can an attacker without credentials manipulate the application's underlying syntax to escalate privileges, execute code in third-party browsers, and exfiltrate sensitive telemetry?

The answer is yes. The research shows that critical vulnerabilities don't come from complex cryptographic flaws, but from the insecure mixing of untrusted data with system instructions, breaking the architecture's isolation.

## Audit Ecosystem and Responsibilities

The test environment was designed with an isolated architecture and industry-standard tooling, organized into functional layers:

| Layer | Tool | Function |
|---|---|---|
| Interception & Analysis | Burp Suite (Proxy/Repeater) | Real-time manipulation of HTTP/HTTPS packets and header rewriting. |
| Routing | FoxyProxy | Dynamic management of traffic tunnels between browser and proxy. |
| Attacker Environment | Kali Linux | Base OS with network and attack dependencies pre-configured. |
| Victim Environment | OWASP Juice Shop (Docker) | Intentionally vulnerable application (Node.js/Angular/SQLite) hosted in a local container on macOS. |

## Attack Vectors and Forensic Analysis

The audit was divided into three escalating compromise phases:

**1. Authentication perimeter assessment.** `POST` requests to the `/rest/user/login` endpoint were intercepted, aiming to validate the integrity of sanitization at the bridge between Node.js and the SQLite database.

**2. DOM (Document Object Model) manipulation.** The application's search bar was analyzed to determine whether the front-end framework (Angular) properly filtered HTML escape sequences before rendering them in the client's browser.

**3. API telemetry analysis.** HTTP cache invalidation was forced to inspect the raw `JSON` responses from the server in the payment methods module, verifying whether card masking was applied securely on the back-end or insecurely on the front-end.

## Payload Analysis: Anatomy of the Attack

### Authentication Bypass

The login form concatenated text strings directly into the SQL statement. The following payload was injected into the `email` field:

```json
{
  "email": "' OR 1=1--",
  "password": "123"
}
```

Injecting the single quote (') prematurely closed the original string. Injecting the boolean clause `OR 1=1` forced the conditional evaluation of the query to always be true. Finally, the double dash (--) nullified the subsequent password check. This instantly compromised the system's Integrity and Confidentiality principles.

### Arbitrary Code Execution (DOM XSS)

To bypass Angular's basic script-injection protections, an attack vector based on injecting iframes that execute JavaScript through their origin attribute was used:

```
<iframe src="javascript:alert(1)">
```

Because the application processed and reflected this string without applying HTML Encoding, the victim's browser interpreted the text as a legitimate structural element of the page, executing the malicious code within the domain's security context.

## Proof of Compromise (PoC)

### Capturing a Privileged Session

Using Burp Suite's Repeater tool, it was confirmed that the server responded with an HTTP/1.1 200 OK after receiving the SQL payload. The response included a valid JSON Web Token associated with the `admin@juice-sh.op` account, granting full administrative control over the platform.

### Client-Side Execution

The injection in the search bar triggered a popup alert generated directly by the browser's V8 engine, confirming the Cross-Site Scripting vulnerability and demonstrating an attacker's ability to hijack legitimate user sessions.

### HTTP Cache Evasion Audit (HTTP 304)

While intercepting traffic to the payments API, the server initially returned a `304 Not Modified`. Removing the `If-None-Match` conditional header forced the server to reveal the JSON payload. It was confirmed that the application applies correct server-side Data Masking (`"cardNum": "************4368"`), mitigating direct data exposure (CWE-200).

## Lessons Learned and Architectural Remediation
The audit reveals that the most critical vulnerabilities stem from architectural flaws in data handling, not cryptographic errors. To harden the infrastructure, the following Security by Design policies are recommended:

**1. Injection Prevention (A03:2021-Injection):** Concatenating variables into database queries must be eradicated. Prepared Statements or securely used ORMs should be implemented to ensure the database treats user input strictly as scalar text, blocking any tampering with the query's Abstract Syntax Tree (AST).

**2. XSS Defense:** Mitigation requires applying Context-Aware Output Encoding on the back-end before reflecting any data to the front-end. Additionally, the server must emit strict Content Security Policy (CSP) headers that disable inline script execution (`unsafe-inline`).

## Conclusion
This structured technical analysis confirms that a web application's security is only as strong as its weakest entry point. The successful exploitation of the OWASP Top 10 in this environment shows that network controls (firewalls, WAFs) are insufficient if the application logic is intrinsically vulnerable.

True maturity in cybersecurity is achieved when remediations aren't "patches" applied after an incident, but architectural decisions built into the software development lifecycle (SDLC).

## Academic References and Standards

- OWASP Foundation. (2021). OWASP Top 10: Web Application Security Risks. https://owasp.org/Top10/

- MITRE Corporation. (2024). CWE-89: Improper Neutralization of Special Elements used in an SQL Command. https://cwe.mitre.org/data/definitions/89.html

- MITRE Corporation. (2024). CWE-79: Improper Neutralization of Input During Web Page Generation (Cross-site Scripting). https://cwe.mitre.org/data/definitions/79.html

- PortSwigger. (2024). Web Security Academy: SQL Injection & Cross-Site Scripting methodologies.