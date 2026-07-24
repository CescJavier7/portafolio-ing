---
title: "How to know if your website is secure: scan it in 2 minutes"
date: "2026-07-23"
category: "Cybersecurity / Web"
description: "A practical guide to check your website's security without being an expert: HTTPS, security headers, SSL/TLS, SPF and DMARC. Learn what to look at and scan your domain free in seconds."
---

Most websites have security problems their owner **doesn't even suspect**. We're not talking about hackers breaking into databases: we're talking about invisible misconfigurations —a missing header, a certificate about to expire, a domain with no protection against spoofing— that leave the door ajar. The good news: you can review your **external security posture** in a couple of minutes, without installing anything and without being an expert.

## What "external security" of a website means

It's everything an attacker can see about your site **from the outside**, without entering your systems: how it encrypts traffic, which protection headers your server sends, how your DNS is configured, and whether your domain can be spoofed for phishing. It's the **first layer** reviewed in any audit, because it's the most exposed and the easiest to neglect.

## The 5 things you must check

### 1. HTTPS and TLS certificate
Your site must load over `https://` with a valid, current certificate. An expired or misconfigured certificate doesn't just scare visitors with a browser warning: it breaks trust and can expose data in transit. Also make sure you use **TLS 1.2 or 1.3** (the old versions, TLS 1.0/1.1, are insecure).

### 2. Security headers
These are instructions your server sends to the browser to protect it. The essential ones:

- **HSTS** (`Strict-Transport-Security`): forces HTTPS and prevents downgrade attacks.
- **Content-Security-Policy**: mitigates XSS attacks (malicious script injection).
- **X-Frame-Options**: prevents clickjacking (your site being embedded in another to trick users).
- **X-Content-Type-Options**: stops the browser from "guessing" file types.

Most sites pass **only two or three** of these. Each missing one is a known weakness.

### 3. SPF record
**SPF** tells the world which servers may send email on behalf of your domain. Without it, anyone can send fake emails that look like yours.

### 4. DMARC record
**DMARC** complements SPF: it defines what to do with emails that fail verification. It's your main defense against **phishing that impersonates your brand**.

### 5. Change over time
This is the point almost nobody looks at, and it's the most important. A site that's secure today can stop being secure tomorrow: a deploy removes a header, a certificate expires, someone opens a forgotten subdomain. Security **is not a photo, it's a film**.

## Scan your website free, right now

You don't need to do all this by hand. You can get a **Security Score (0–100)** for your domain in seconds, free and without signing up, with the **Sentra** scanner:

👉 **[Scan your domain for free](/en/sentinel/scan)**

It's 100% passive: it only observes public information, it **attacks nothing** and puts no load on your server. In seconds you see your grade (A–F) and exactly which controls fail and how to fix them.

## What your score means

- **A (90–100):** excellent posture. Keep watching so it doesn't drop.
- **B–C (70–89):** important controls are missing. Fixable in an afternoon.
- **D–F (below 70):** serious exposure. Prioritize HTTPS, HSTS and CSP today.

## From the photo to the film: continuous monitoring

A one-off scan gives you today's photo. But as we saw, what matters is **what changes over time**. That's where [Sentra](/en/sentinel) goes beyond a scanner: it watches your domain 24/7, keeps the history, and **emails you the moment your security worsens** — with clear reports and AI-backed explanations.

Start with the photo. Scan your website for free and find out where you stand. Fixing what you find usually takes less time than you think, and the impact on your users' trust is immediate.
