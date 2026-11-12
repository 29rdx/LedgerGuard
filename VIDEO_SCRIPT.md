# LedgerGuard — Official Demo Video & Submission Master Kit

> **Total Run Duration:** 2 minutes 35 seconds (Strictly under the 3:00 Devpost cutoff)  
> **Target Voice Style:** Calm, confident, documentary-style fintech narration (ElevenLabs "Adam", "Brian", "Josh" at Stability 65%, Clarity 80%, or OpenAI TTS `alloy` / `onyx`).  
> **Master Reference Audio:** Located at [`public/audio/voiceover-2m35s-master.m4a`](./public/audio/voiceover-2m35s-master.m4a) (Exact duration: 155.35s).

---

## 1. Direct Copy-Paste AI Voiceover Script (Natural Human Punctuation & Pauses)

Paste the block below directly into your AI voice synthesis tool. Commas, dashes, and ellipses are tuned for natural respiration and pacing:

```plaintext
In modern B-to-B commerce... paying an invoice too early is a massive financial risk. Businesses lose billions every year to premature payouts, unverified contractor milestones, and manual invoice reconciliation. And while A.I. agents can now initiate payments... giving an autonomous agent direct access to company funds—without strict verification—is a recipe for disaster.

Meet LedgerGuard... an institutional, agentic treasury and proof-of-delivery escrow terminal, built on the PayPal Developer Platform and A-G Grid.

Instead of sending irreversible payouts immediately... LedgerGuard uses PayPal Orders V-2 to place funds into an Authorized Hold. The capital remains locked in PayPal Sandbox escrow until our autonomous A.I. Auditor verifies cryptographic proof of delivery.

Let's walk through a live end-to-end transaction. 

From the login portal, judges can click the Instant Sandbox Session button to provision an isolated treasury workspace—secured by HTTP-only JWT cookies, strict C-S-R-F verification, and role-based access control.

Inside the main terminal, our financial blotter—powered by A-G Grid—tracks every active PayPal authorization, risk score, and settlement state in real time. 

Pressing Command-K opens the Agentic Treasury Command Bar. Let's instruct the agent, in plain English, to create a one-thousand-four-hundred-and-fifty-dollar escrow hold for Vertex Semiconductor.

Watch what happens behind the scenes. The agent invokes the PayPal Agent Toolkit... authenticates with PayPal's O-Auth-2 Sandbox API... and executes an Orders V-2 Authorize call. Within milliseconds, our Server-Sent Events stream catches the webhook and flashes the new row directly inside A-G Grid—with zero page reload.

Now... suppose the vendor uploads their delivery manifest and invoice. Before releasing a single dollar, we click Run A.I. Audit. 

First, our SSRF and magic-byte file guards validate the uploaded document. Next, the Treasury Auditor Agent cross-checks the line items against our organization's active Treasury Policy. If there is a discrepancy, a secondary Negotiator Agent flags the dispute automatically. 

Here, the delivery proof passes every policy rule with a compliance score of ninety-six percent. 

To release the funds, we trigger Step-Up Multi-Factor Authentication, enter our six-digit verification code, and execute the live PayPal Capture API. The held authorization is settled immediately in the PayPal Sandbox, and A-G Grid updates the ledger status to Captured.

We can also ask the agent to filter the A-G Grid table dynamically—such as isolating all high-value holds over one thousand dollars—or generate a live PayPal Sandbox Invoice using the Invoicing V-2 API in seconds.

Finally... institutional finance demands military-grade security. If we inspect the raw database, sensitive vendor records are encrypted at rest using A-E-S-256-G-C-M ciphertext. In the Audit Explorer, every single A.I. decision and PayPal API payload is chained together with SHA-256 hashes—making the ledger completely tamper-evident. And on our live Security Posture screen, we can run an automated twenty-point OWASP self-test across SQL injection, X-S-S, I-D-O-R, and webhook signature verification—passing twenty out of twenty checks live.

LedgerGuard turns PayPal into a programmable, verifiable escrow engine for the agentic economy. Thank you for watching.
```

---

## 2. Shot-by-Shot Screen Recording Sync Guide (2:35 Total)

Record at 1920x1080 (60fps) in dark mode while playing the audio:

| Timestamp | Audio Cue | Exact Screen Action to Perform | UI Focus Area |
| :--- | :--- | :--- | :--- |
| **0:00 – 0:22** | *"In modern B-to-B commerce... recipe for disaster."* | Start on `/login` split-screen portal. Show institutional aesthetic and security badges. | Hero title & security badge row |
| **0:22 – 0:48** | *"Meet LedgerGuard... walk through a live end-to-end transaction."* | Click **"VP Treasury (Admin)"** / **"1-Click Judge Sandbox Login"**. Smooth transition into `/` Treasury Terminal. | 4 KPI summary cards & AG Grid blotter |
| **0:48 – 1:18** | *"Pressing Command-K... flashes the new row directly inside AG Grid."* | Press `Cmd+K` or click **"Agent Drawer"**. Click prompt chip: *"Authorize $1,450.00 PayPal escrow hold..."*. Watch SSE live event flash new `AUTHORIZED_HOLD` row. | Agent drawer execution card & AG Grid green flash |
| **1:18 – 1:52** | *"Now... suppose the vendor uploads... updates the ledger status to Captured."* | Click **Run AI Audit** on the Vertex Semiconductor row. Inspect delivery proof modal, click **Capture via PayPal**, enter 6-digit TOTP code, and watch status flip to `CAPTURED`. | Escrow Audit Modal, Step-Up MFA, & Row Status Tag |
| **1:52 – 2:05** | *"We can also ask the agent to filter... Invoicing V-2 API in seconds."* | In Agent Drawer, click filter chip to isolate high-value escrows. Switch to `/invoices` to reveal generated PayPal `INV2-...` invoice. | AG Grid floating filter row & Invoicing Terminal |
| **2:05 – 2:35** | *"Finally... institutional finance demands... Thank you for watching."* | Navigate to `/audit-log`, click **"Verify Hash Chain Integrity"** (green verified banner). Then open `/security-audit`, click **"Run Live 20-Point Security Self-Test"** to show **20/20 PASSED**. | SHA-256 Merkle chain modal & OWASP defense matrix |

---

## 3. Prompt for AI Video Generator / Automated Editor

Use this prompt for automated video assembly tools, companion reels, or Antigravity video pipelines:

```markdown
Create a 2-minute 35-second technical product documentary walkthrough for "LedgerGuard" (PayPal AI Hackathon submission).
- Visual Style: Institutional fintech documentary (Stripe / Linear / Bloomberg terminal aesthetic). Strictly monochrome slate, alabaster white, deep carbon, and emerald accents. Zero neon purple/violet gradients, zero stock footage of people in offices, and zero background music (strictly voiceover only to comply with Devpost copyright rules).
- Pacing: 100% focused on live screen capture of the working software UI—specifically highlighting the Login Portal, the AG Grid Financial Blotter, the AI Treasury Command Drawer executing live PayPal Sandbox Orders v2 (Authorize & Capture) and Invoicing v2 calls, the SHA-256 Cryptographic Audit Log, and the 20/20 OWASP Security Verification Dashboard.
- Captions: Render clean, high-contrast bottom subtitles in Inter Medium (`16px`) synchronized to the voiceover script.
```

---

## 4. Ready-to-Send Submission & Judge Verification Email Template

```plaintext
Subject: PayPal AI Hackathon Submission — LedgerGuard (Agentic Treasury & Escrow Terminal)

Hello PayPal AI Hackathon Judging Team,

Please find the complete submission details for LedgerGuard—an institutional Agentic Treasury, Proof-of-Delivery Escrow, and Accounts-Payable Reconciliation Terminal built on the PayPal Developer Platform (Orders v2, Invoicing v2, Webhooks v1, and @paypal/agent-toolkit) and AG Grid.

1. Live Production Application URL:
[PASTE YOUR VERCEL / RENDER URL HERE]
(Note: Click the "1-Click Judge Sandbox Session" button on the login screen for instant, zero-friction access to an isolated Treasury Admin workspace).

2. Public GitHub Repository (MIT Licensed):
[PASTE YOUR GITHUB REPO URL HERE]

3. Official Demo Video (< 3 Minutes, Public YouTube):
[PASTE YOUR YOUTUBE URL HERE]

Key Architectural Highlights Verified in This Build:
- PayPal Orders v2 Conditional Escrow: Places funds in AUTHORIZE hold and autonomously executes CAPTURE only after AI verification of delivery evidence.
- PayPal Invoicing v2 & Real-Time Webhooks: Natural-language invoice generation and Server-Sent Events (SSE) streaming into AG Grid.
- 20-Point OWASP & FinTech Security Architecture: Includes AES-256-GCM field-level encryption at rest, SHA-256 tamper-evident audit hash chaining, SSRF-guarded proof inspection, magic-byte file validation, CSRF double-submit cookies, and Step-Up TOTP MFA.

Best regards,
Rupraj Datta
Software Engineer
GitHub: https://github.com/29rdx
```
