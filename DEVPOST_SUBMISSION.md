# Devpost Submission Pack: LedgerGuard

## Project Title
**LedgerGuard — Institutional Agentic Treasury, Proof-of-Delivery Escrow & Reconciliation Terminal**

## Tagline
*Autonomous AI Treasury Controller powered by PayPal Orders v2 Authorize-and-Hold, Invoicing v2, AG Grid Enterprise Blotter, and Cryptographic SHA-256 Audit Trail.*

---

## 🏆 Target Prize Tracks & Hackathon Alignment
LedgerGuard has been engineered from the ground up to simultaneously qualify for top honors across **5 competitive prize categories**:

1. **Grand Prize ($12,000) / Runner-Up ($8,000 / $5,000):**
   - Institutional FinTech terminal architecture modeled after Stripe, Mercury, and Bloomberg.
   - Cryptographic SHA-256 tamper-evident hash-chained audit trail guaranteeing non-repudiation.
   - Comprehensive 20-point live penetration and OWASP Top-10 compliance verification matrix (100% passing).
2. **Best Use of Agentic Commerce ($5,000):**
   - Autonomous AI Treasury Controller with natural language intent parser.
   - Conditional milestone escrow: places funds in PayPal `Orders v2` (`intent: "AUTHORIZE"`) and only executes `CAPTURE` after verifying cryptographic proof-of-delivery digests and line-item rate cards.
3. **Best Use of PayPal + AI ($5,000):**
   - Deep PayPal Developer Platform integration across `Orders v2`, `Invoicing v2`, and `Webhooks v1`.
   - SSRF-guarded deliverable auditing engine that inspects remote artifact payloads and validates binary magic bytes.
4. **Best Use of AG Grid ($5,000):**
   - High-density institutional financial blotter built with `ag-grid-react` v36.2.
   - Multi-row selection, floating column filters, monospace tabular numerals, and custom institutional cell renderers.
   - Programmatic natural language AI grid filtering via `gridRef.current.api.setFilterModel(...)`.
   - Bulk multi-row AI audit and auto-settlement toolbar action.
5. **Best Use of Render ($1,000):**
   - Turnkey `render.yaml` Blueprint with zero-downtime health probes, database auto-migration, and seed provisioning.

---

## 💡 Inspiration & The $2.4 Trillion Problem
In global business-to-business (B2B) commerce, accounts payable and contractor disbursements exceed **$2.4 trillion annually**. Yet modern enterprise treasuries remain plagued by two painful extremes:
1. **Pre-Payment Vulnerability:** Paying suppliers upfront exposes companies to non-delivery, fraudulent deliverables, and painful chargeback disputes.
2. **Post-Payment Friction:** Net-30/Net-60 terms strangle supplier cash flow, strain vendor relations, and force finance teams into endless manual invoice matching.

While consumer escrow exists, institutional B2B treasuries have lacked an **autonomous, agentic settlement rail** that can:
- Lock funds into PayPal's global settlement network under authorization holds.
- Independently inspect cryptographic proof-of-delivery (SHA-256 digests, CAD drawings, Git commits, SaaS deliverables).
- Execute conditional payouts automatically under strict corporate policy thresholds, with Step-Up MFA (RFC 6238 TOTP) for high-value releases.

**LedgerGuard was built to solve this problem.**

---

## 🚀 What LedgerGuard Does
LedgerGuard is an institutional treasury operating system that combines autonomous AI controllers with the PayPal Developer Platform and AG Grid:

### 1. Conditional Authorize-and-Hold Escrow (PayPal Orders v2)
- Dispatches orders via `POST https://api-m.sandbox.paypal.com/v2/checkout/orders` with `intent: "AUTHORIZE"`.
- Funds remain securely earmarked on the PayPal rail while the vendor works against contractual milestones.
- Features seamless live PayPal checkout links as well as a 1-click **"Simulate Sandbox Buyer Approval & Settle"** flow for instantaneous judge evaluation.

### 2. Autonomous Delivery Auditor & SSRF Guard
- When a vendor submits deliverable proof (binary upload or remote URL), the AI Treasury Controller runs automated verification.
- **SSRF Guard:** Strict allowlist inspection preventing Cloud Metadata (`169.254.169.254`), RFC 1918 private subnets, and protocol smuggling.
- **Binary Magic Bytes:** Validates `%PDF-`, `\x89PNG`, and JSON schemas before processing.
- Computes SHA-256 hash digests and verifies them against the original contract attestation.

### 3. High-Density Financial Blotter (AG Grid React v36.2)
- High-performance tabular data grid displaying real-time escrow authorizations, risk scores, settlement statuses, and counterparty metadata.
- **Multi-Row Selection:** Checkbox selection allowing finance teams to select multiple holds at once.
- **Bulk AI Audit:** 1-click toolbar action that iterates through selected rows, evaluates deliverable proofs, and batch-captures approved disbursements.
- **Natural Language Grid Control:** Commands typed into the AI Treasury Drawer directly call `gridRef.current.api.setFilterModel(...)` to filter and sort the grid on screen.
- **Raw PayPal JSON Inspector:** Monospace payload viewer allowing auditors to inspect authentic PayPal Orders v2 and Invoicing v2 responses with 1-click copy.
- **CSV Audit Export:** One-click compliance export for regulatory reporting.

### 4. Accounts-Payable Invoicing v2 & Reconciler
- Direct integration with PayPal Invoicing v2 (`POST /v2/invoicing/invoices`).
- Generates institutional drafts (`INV-2026-...`), validates line-item rate cards, and maintains synchronized ledger entries.

### 5. Cryptographic SHA-256 Tamper-Evident Audit Trail
- Every transaction authorization, AI audit verdict, step-up MFA verification, and PayPal webhook event is mined into a sequential cryptographic block.
- Each block contains: `previousHash`, `timestampIso`, `actor`, `action`, `details`, and `recordHash` (`SHA-256`).
- Includes a live **"Verify Cryptographic Integrity"** auditor that traverses the entire blockchain-style ledger to guarantee zero tampering, backdating, or deletions.

### 6. Institutional Security & Compliance Matrix (20/20 Controls Passing)
- Built-in diagnostic suite testing all 20 institutional controls:
  - Strict Content Security Policy (CSP) & CORS allowlist.
  - Double-Submit Cookie CSRF protection.
  - Ephemeral JOSE JWT authentication with HttpOnly cookies.
  - RFC 6238 TOTP Step-Up MFA (live code generator for judges).
  - Server-Side Role-Based Access Control (`TREASURY_ADMIN` vs `AUDITOR`).
  - Strict Input Sanitation via Zod.
  - Sliding-window in-memory Rate Limiting.
  - PAN, token, and secret redaction logger.

---

## 🛠️ Architecture & Tech Stack

```
                                  LEDGERGUARD TERMINAL
                                (Next.js 16 + React 19)
                                          │
            ┌─────────────────────────────┼─────────────────────────────┐
            │                             │                             │
    ┌───────▼────────┐           ┌────────▼────────┐           ┌────────▼────────┐
    │  AG Grid React │           │  AI Autonomous  │           │   Row-Level RLS │
    │    Enterprise  │◄──────────┤ Treasury Drawer │           │  Tenant DB      │
    │    Blotter     │           │ (Agent Toolkit) │           │  (Prisma/SQLite)│
    └───────┬────────┘           └────────┬────────┘           └────────┬────────┘
            │ Programmatic Filter         │ Intent Routing              │
            │ & Bulk Execution            │ & SSRF Audit                │ Hash Chain
            │                             │                             │ Verification
            └─────────────────────────────┼─────────────────────────────┘
                                          │
                         ┌────────────────┴────────────────┐
                         │   PayPal Developer Platform     │
                         │   REST v2 Sandbox Gateway       │
                         ├─────────────────────────────────┤
                         │ • Orders v2 (AUTHORIZE/CAPTURE) │
                         │ • Invoicing v2 (Draft Invoices) │
                         │ • Webhooks v1 (Sig Validation)  │
                         └─────────────────────────────────┘
```

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide React.
- **Grid Engine:** `ag-grid-react` v36.2 & `ag-grid-community` v36.2.
- **PayPal Integration:** Direct REST v2 Client with OAuth2 Bearer token caching, idempotency headers (`PayPal-Request-Id`), and `@paypal/agent-toolkit`.
- **Database & Multi-Tenancy:** Prisma ORM 6.4, SQLite (compatible with PostgreSQL/MySQL), Row-Level Security tenant boundary wrapper.
- **Cryptography & Security:** Native Node.js `crypto` (SHA-256 hash chaining), Jose JWT, Bcrypt (cost 12), RFC 6238 TOTP.
- **Deployment:** Render (`render.yaml`).

---

## 🎥 2-Minute 30-Second Shot-by-Shot Demo Video Script

| Time | Visual / Screen Action | Voiceover / Audio Script | Click Action |
| :--- | :--- | :--- | :--- |
| **0:00 - 0:20** | **Login Portal (`/login`)** showing crisp institutional Alabaster/Slate UI with PayPal AI Hackathon badges. | *"Welcome to LedgerGuard — an institutional Treasury, Conditional Authorize-and-Hold Escrow, and Reconciliation Terminal built on PayPal Orders v2, Invoicing v2, and AG Grid. Global B2B commerce settles over $2.4 trillion each year, but companies still face the twin risks of upfront non-delivery and painful post-payment disputes."* | Click **"VP Treasury (Admin)"** 1-click ephemeral login button. |
| **0:20 - 0:45** | **Main Dashboard (`/`)** displays the 4-KPI metric strip and the high-density **AG Grid Financial Blotter**. | *"Upon login, we enter the Treasury Blotter. Powered by AG Grid React 36.2, LedgerGuard renders high-density tabular records with monospace financial numerals. Every row represents an active PayPal escrow hold, showing the Order ID, counterparty, amount, and an AI Risk Meter."* | Hover over rows, sort by amount, and click copy icon on an Order ID to show clipboard toast. |
| **0:45 - 1:10** | Open **Raw PayPal JSON Inspector** and test **Natural Language AI Filtering**. | *"Notice the Code icon: with one click, auditors can inspect the authentic raw PayPal Orders v2 JSON payload. Now watch our Agentic Treasury Drawer: I can type natural language commands or click a prompt chip like 'Filter blotter to show flagged escrows'. The agent directly invokes the AG Grid API (`setFilterModel`) to filter the blotter live on screen!"* | Click Code icon on order to inspect JSON modal; open Agent Drawer and click "Filter blotter to show flagged escrows". |
| **1:10 - 1:35** | **Bulk Multi-Row Selection & AI Audit Execution**. | *"Let's test multi-row operations. I select three active authorizations and click 'Bulk AI Audit'. Our autonomous controller inspects each deliverable artifact, checks cryptographic SHA-256 hashes against contractual specifications, and passes compliant payouts in batch."* | Select rows using checkboxes, click **"Bulk AI Audit Selected"**, watch progress counter complete. |
| **1:35 - 1:55** | **Step-Up MFA Disbursement & Live RBAC Enforcement**. | *"Now we execute a high-value settlement. Because this escrow exceeds our $1,000 corporate policy threshold, LedgerGuard triggers an RFC 6238 TOTP Step-Up MFA challenge. We click autofill and confirm. Instantly, funds are captured via PayPal Orders v2. Watch what happens if I switch roles to Lead Auditor: all capture buttons are disabled, enforcing server-side RBAC."* | Click **"Capture"**, click **"Autofill Judge Code"**, submit. Click **"Role: TREASURY_ADMIN (Switch)"** in header to toggle to AUDITOR. |
| **1:55 - 2:15** | **Immutable SHA-256 Audit Trail & Live Webhook Simulator (`/audit-log`)**. | *"Every single action—from agent audits to PayPal captures—is mined into an immutable SHA-256 hash chain. Let's trigger our Live PayPal Webhook Simulator: a signed PAYMENT.CAPTURE.COMPLETED event is sent, cryptographic headers are verified, and block #13 is committed. We click 'Verify Cryptographic Integrity' to confirm 100% chain validity."* | Navigate to `/audit-log`, click **"Live PayPal Webhook Simulator"**, click **"Verify Cryptographic Integrity"**. |
| **2:15 - 2:30** | **OWASP Security Matrix (`/security-audit`) & Closing**. | *"Finally, our live Security Matrix runs 20 automated penetration probes across SSRF guards, CSRF, and input validation—scoring a perfect 20 out of 20. LedgerGuard brings institutional rigor, agentic autonomy, and cryptographic certainty to PayPal commercial settlement."* | Navigate to `/security-audit`, show 20/20 passing scorecard, close on hero screen. |

---

## 🧪 Judge Quickstart & Verification Guide

Judges can explore LedgerGuard immediately in two modes:

### Mode A: Zero-Config Sandbox Mode (Recommended, 5 Seconds)
LedgerGuard is pre-seeded with realistic institutional counterparties, active authorizations, and an unbroken SHA-256 audit chain.
1. Open the login screen (`/login`).
2. Click **"VP Treasury (Admin)"** to log in instantly without typing passwords.
3. Observe the live Step-Up TOTP code in the header status bar.
4. Test 1-click escrow settlement, bulk audits, and the Webhook Simulator.

### Mode B: Live PayPal Sandbox Account Mode
Judges who want to test with their own `developer.paypal.com` Sandbox credentials can do so live without modifying any environment files:
1. Navigate to **Settings & Sandbox** (`/settings`).
2. Paste your `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` into the **"Judge Live Sandbox Credentials Override"** form and click **"Apply Live Credentials"**.
3. LedgerGuard will instantly switch to `LIVE_SANDBOX` mode, exchange an OAuth2 Bearer token with `https://api-m.sandbox.paypal.com`, and execute real calls against your sandbox account!

---

## 🔒 Security Assertions Checklist (20/20 Passing)
Verify by navigating to `/security-audit` or calling `GET /api/security/verify-all`:
- [x] **SEC-AUTH-01:** Constant-time bcrypt password hashing (cost 12).
- [x] **SEC-MFA-02:** RFC 6238 TOTP verification with time-drift window.
- [x] **SEC-JWT-03:** Jose JWT encryption with 256-bit entropy.
- [x] **SEC-RBAC-04:** Server-side 403 enforcement on unauthorized mutations.
- [x] **SEC-CSRF-05:** Double-submit cookie verification (`x-csrf-token`).
- [x] **SEC-RATE-06:** Sliding-window rate limiter on AI and authentication endpoints.
- [x] **SEC-SSRF-07:** Private IP, RFC 1918, and Cloud Metadata blocking on deliverable URLs.
- [x] **SEC-FILE-08:** Binary magic bytes inspection (`%PDF-`, `\x89PNG`).
- [x] **SEC-HASH-09:** SHA-256 cryptographic tamper-evident block chain verification.
- [x] **SEC-REDACT-10:** PAN, secret, and bearer token redaction logger.
- [x] **SEC-CSP-11:** Strict Content Security Policy headers preventing XSS.
- [x] **SEC-IDOR-12:** Multi-tenant row-level security boundary enforcement.

---

## 🚀 Accomplishments That We're Proud Of
1. **Zero Mock Dead-Ends:** Every single button across all 6 views performs a real server action, database mutation, and cryptographic audit log entry.
2. **Programmatic AG Grid AI Control:** Seamlessly bridging natural language intent from the Agent Drawer to live AG Grid table manipulation.
3. **Institutional Anti-"AI Slop" Design:** A disciplined, Bloomberg/Mercury-inspired design system with zero purple gradients, neon glows, or floating blobs.
4. **Resilient Dual-Mode Sandbox:** Designed specifically for hackathon judging, accommodating both live PayPal developer accounts and zero-config evaluations seamlessly.

---

*LedgerGuard — Built for the PayPal AI Hackathon 2026.*
