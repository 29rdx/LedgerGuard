# LedgerGuard — Institutional Agentic Treasury, Proof-of-Delivery Escrow & Reconciliation Terminal

[![PayPal AI Hackathon](https://img.shields.io/badge/PayPal%20AI%20Hackathon-Devpost%202026-003087?style=flat&logo=paypal)](https://paypalaihackathon.devpost.com)
[![AG Grid](https://img.shields.io/badge/AG%20Grid-React%20v36.2-blue?style=flat)](https://www.ag-grid.com)
[![Next.js](https://img.shields.io/badge/Next.js-v16%20Turbopack-black?style=flat&logo=next.js)](https://nextjs.org)
[![OWASP Matrix](https://img.shields.io/badge/Security%20Matrix-20%2F20%20Controls%20Passing-059669?style=flat)](/security-audit)
[![License: MIT](https://img.shields.io/badge/License-MIT-slate?style=flat)](LICENSE)

> **LedgerGuard** is an institutional B2B Treasury, Conditional Authorize-and-Hold Escrow, and Accounts-Payable Reconciliation Terminal built on the **PayPal Developer Platform (`Orders v2`, `Invoicing v2`, `Webhooks v1`, and `@paypal/agent-toolkit`)** and **AG Grid**.

---

## 1. Prize-Stacking Strategy & Hackathon Alignment

1. **Grand Prize ($12,000) / Runner-Up ($8,000 / $5,000):**
   - Institutional FinTech terminal architecture modeled after Stripe, Mercury, and Bloomberg.
   - Cryptographic SHA-256 tamper-evident hash-chained audit trail.
   - Comprehensive 20-point security hardening and OWASP Top-10 compliance verification matrix.
2. **Best Use of Agentic Commerce ($5,000) & Best Use of PayPal + AI ($5,000):**
   - Autonomous AI Treasury Controller placing funds under PayPal `Orders v2` with `intent: "AUTHORIZE"`.
   - Executes `CAPTURE` only upon cryptographic proof-of-delivery verification and invoice rate-card compliance.
   - Integrated with `@paypal/agent-toolkit` and SSRF-guarded deliverable auditing.
3. **Best Use of AG Grid ($5,000):**
   - High-density institutional financial blotter (`ag-grid-react`) with tabular monospace numerals (`tabular-nums`).
   - Natural language AI-driven grid filtering (dispatched from agent console).
   - Inline escrow actions (Capture, Audit, Void) and regulatory CSV audit exports.
4. **Best Use of Render ($1,000):**
   - Production-hardened `render.yaml` Blueprint for 1-click cloud deployment.

---

## 2. Institutional Architecture

```text
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      LedgerGuard Command Terminal                      │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │
           ┌─────────────────────────┴────────────────────────┐
           ▼                                                  ▼
 ┌──────────────────────┐                           ┌───────────────────┐
 │ AG Grid Real-Time    │                           │ Autonomous AI     │
 │ Financial Blotter    │ ◄─── (Natural Language) ─┤ Treasury Agent    │
 │ (ag-grid-react 36.2) │                           │ Controller        │
 └─────────┬────────────┘                           └─────────┬─────────┘
           │                                                  │
           │                                                  │ SSRF-Guarded
           │ [Capture / Void]                                 │ Delivery Audit
           ▼                                                  ▼
 ┌──────────────────────────────────────────────────────────────────────┐
 │                      PayPal Developer Platform                       │
 │  • Orders v2 (intent: "AUTHORIZE" ──► "CAPTURE")                     │
 │  • Invoicing v2 (AP Drafts, Sync, Rate Card Reconciliation)          │
 │  • Webhooks v1 (Cryptographic Transmission Signature Verification)   │
 │  • @paypal/agent-toolkit                                             │
 └───────────────────────────────────┬──────────────────────────────────┘
                                     │
                                     ▼
 ┌──────────────────────────────────────────────────────────────────────┐
 │             Multi-Tenant SQLite / PostgreSQL Database               │
 │  • Row-Level Tenant Isolation (Organization Scoped getTenantDb)     │
 │  • SHA-256 Tamper-Evident Hash Chain Audit Log (H_i = H(H_{i-1}...))│
 └──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Mandatory 20-Point Security Hardening Matrix

| # | Control Code | Security Control | OWASP Reference | Enforcement Mechanism |
|---|---|---|---|---|
| 1 | `SEC-SQLI-01` | SQL Injection Prevention | A03:2021-Injection | Strictly parameterized Prisma ORM queries; Zod runtime input schema validation. |
| 2 | `SEC-XSS-02` | Cross-Site Scripting Prevention | A03:2021-Injection | Strict Content-Security-Policy (CSP) header in `src/middleware.ts`; zero `dangerouslySetInnerHTML`. |
| 3 | `SEC-CSRF-03` | Cross-Site Request Forgery | A01:2021-Broken Access Control | Double-Submit CSRF token (`x-csrf-token` header vs `lg_csrf` cookie) + Origin verification. |
| 4 | `SEC-UPLOAD-04` | Secure File Upload Validation | A04:2021-Insecure Design | Binary magic-byte inspection (`%PDF-`, `\x89PNG`, JSON), 2MB ceiling, UUIDv4 randomized filenames. |
| 5 | `SEC-IDOR-05` | IDOR / BOLA Prevention | A01:2021-Broken Access Control | Non-sequential UUIDv4 IDs; `organizationId` ownership asserted on every endpoint. |
| 6 | `SEC-RATELIMIT-06`| API Sliding-Window Rate Limiting | A04:2021-Insecure Design | Sliding-window limiter in `src/lib/rate-limit.ts` returning standard HTTP 429 + `Retry-After`. |
| 7 | `SEC-JWT-07` | High-Entropy JWT Secret | A02:2021-Cryptographic Failures | Minimum 256-bit (32+ byte) secret; `crypto.randomBytes(64)` ephemeral fallback for sandbox runs. |
| 8 | `SEC-SECRETS-08` | Zero Exposed API Secrets | A05:2021-Security Misconfiguration | Zero `NEXT_PUBLIC_` secret leaks; PayPal OAuth & LLM calls restricted to server API routes. |
| 9 | `SEC-BCRYPT-09` | Strong Password Hashing | A02:2021-Cryptographic Failures | `bcryptjs` with cost factor 12 rounds on all authentication credentials. |
| 10| `SEC-MFA-10` | Step-Up MFA Confirmation | A07:2021-Auth Failures | RFC 6238 TOTP 6-digit confirmation required for high-value PayPal captures (≥ $10,000). |
| 11| `SEC-CORS-11` | Strict CORS Configuration | A05:2021-Security Misconfiguration | Explicit origin allowlisting in middleware (wildcard `*` strictly prohibited). |
| 12| `SEC-STORAGE-12`| Zero Web Storage Auth Tokens | A01:2021-Broken Access Control | JWT session tokens stored exclusively in `HttpOnly`, `Secure`, `SameSite=Strict` cookies. |
| 13| `SEC-RBAC-13` | Server-Side RBAC Enforcement | A01:2021-Broken Access Control | Mutating disbursement routes independently verify `session.role === 'TREASURY_ADMIN'`. |
| 14| `SEC-TENANT-14` | Row-Level Multi-Tenant Isolation | A01:2021-Broken Access Control | `getTenantDb(organizationId)` wrapper injects organization scope on all queries. |
| 15| `SEC-WEBHOOK-15`| Webhook Signature Verification | A08:2021-Software/Data Integrity | PayPal transmission headers verified via `/v1/notifications/verify-webhook-signature`. |
| 16| `SEC-SSRF-16` | SSRF Prevention Guard | A10:2021-SSRF | Strict HTTPS, certified host allowlist, and block on RFC1918 and cloud metadata (`169.254.169.254`). |
| 17| `SEC-SOURCEMAPS-17`| Disabled Production Source Maps | A05:2021-Security Misconfiguration | `productionBrowserSourceMaps: false` and `poweredByHeader: false` in `next.config.mjs`. |
| 18| `SEC-CREDENTIALS-18`| Zero Hardcoded Weak Credentials | A07:2021-Auth Failures | High-entropy salted passwords; rate-limited ephemeral judge sandbox provisioning endpoint. |
| 19| `SEC-REDACTION-19`| PII & Secret Redaction in Logs | A09:2021-Security Logging Failures | `secureLogger` scrubs Authorization headers, client secrets, card PANs, and emails. |
| 20| `SEC-DEPENDENCIES-20`| Dependency Hygiene | A06:2021-Vulnerable Components | Certified, actively maintained packages; zero known vulnerabilities. |

Judges can inspect and run live automated assertions on all 20 controls at [`/security-audit`](/security-audit) or via [`/api/security/verify-all`](/api/security/verify-all).

---

## 4. Quick Start & Judge Evaluation

### Prerequisites
- Node.js 20.9+ (v22 / v26 supported)
- npm 10+

### 1. Installation & Database Setup
```bash
# Clone the repository
git clone https://github.com/paypaldev/hackathon-paypal-ag-grid-boilerplate.git
cd payp

# Install dependencies
npm install

# Push schema and seed institutional test data
npm run db:push
npm run db:seed
```

### 2. Start the Application
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 3. Instant 1-Click Judge Access
On the login screen, click either:
- **"Enter as VP Treasury (Admin)"** (`treasury@apexcapital.io`) — Full escrow placement, capture, and void rights.
- **"Enter as Lead Auditor (Read-Only)"** (`auditor@apexcapital.io`) — Compliance view and audit trail analysis.

---

## 5. Live PayPal Sandbox Credentials Configuration (Optional)
LedgerGuard operates out of the box in zero-config sandbox simulation mode. To connect your live PayPal Developer Sandbox account:
1. Open `.env.local` (or configure via **Settings & Sandbox** page):
   ```ini
   PAYPAL_CLIENT_ID=your_sandbox_client_id
   PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
   PAYPAL_WEBHOOK_ID=your_sandbox_webhook_id
   PAYPAL_ENVIRONMENT=sandbox
   ```
2. Restart the dev server or refresh the page. The status bar will immediately transition to **Live PayPal Sandbox REST API** with live latency metrics.

---

## 6. Cloud Deployment (Render Blueprint)
LedgerGuard is packaged for 1-click zero-downtime deployment on Render via the included [`render.yaml`](render.yaml):
```bash
# Deploy with Render CLI or connect Git repository in Render Dashboard
git push origin main
```

---

## 7. License
Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.
