# LedgerGuard — Demo Day Presentation & Live Walkthrough Script

> **Focus Topic:** How the Autonomous Agent Securely Verifies Proof-of-Delivery Before Releasing Funds  
> **Duration:** 2 to 3 Minutes  
> **Live Demo URL:** [https://ledgerguard-kappa.vercel.app](https://ledgerguard-kappa.vercel.app)  
> **Failsafe Keybind:** Press `Ctrl + Shift + K` if Wi-Fi or sandbox rate limits spike.

---

## 🎬 Live Screen Action & Spoken Script

### Act 1: The Problem & The Solution (0:00 - 0:30)
* **Screen:** Open [`https://ledgerguard-kappa.vercel.app/login`](https://ledgerguard-kappa.vercel.app/login). Hover over the **"VP Treasury (Admin)"** button.
* **Spoken Script:**
  > *"Judges, in B2B commerce, over $2.4 trillion is lost each year to premature vendor payouts, unverified contractor milestones, and invoice disputes. Autonomous AI agents are emerging to execute transactions, but handing an LLM unrestricted treasury access without cryptographic verification is a recipe for disaster.*
  > 
  > *Meet **LedgerGuard**—an institutional agentic treasury and proof-of-delivery escrow terminal built on the PayPal Developer Platform and AG Grid. Instead of sending irreversible payouts upfront, LedgerGuard places buyer funds into an authorized escrow hold using PayPal Orders v2, releasing them only after our autonomous auditor mathematically validates deliverable evidence."*

---

### Act 2: Earmarking the Escrow on PayPal Sandbox (0:30 - 1:00)
* **Screen:** Click **"VP Treasury (Admin)"**. Smooth entry to the main Treasury Blotter. Open the **Agent Drawer** (`Cmd + K` or top-right button). Click the prompt chip: *"Authorize a $1,450.00 PayPal escrow hold for Vertex Semiconductor"*.
* **Spoken Script:**
  > *"With one click, we provision an isolated sandbox session. In our AG Grid blotter, every row represents an active transaction with live risk scoring.*
  > 
  > *I open the Agent Drawer and instruct the agent: 'Authorize a $1,450 escrow hold for Vertex Semiconductor.' The agent invokes the PayPal Agent Toolkit, calls the Orders v2 Authorize API, and earmarks the funds in custody. Within milliseconds, our Server-Sent Events stream catches the webhook and flashes the new row live in AG Grid—with zero page refresh."*

---

### Act 3: The Climax — Proof-of-Delivery Cryptographic Verification (1:00 - 1:55)
* **Screen:** On the Vertex Semiconductor row, click **"Run AI Audit"** (or click row to inspect delivery proof). Show the modal with the uploaded manifest, SHA-256 hash match, and 96% compliance score. Click **"Capture & Settle via PayPal"**.
* **Spoken Script:**
  > *"Now for the core innovation: how does the agent verify delivery before releasing a single dollar?*
  > 
  > *When the contractor submits their milestone manifest or invoice:*
  > 1. *First, our binary magic-byte parser reads the raw buffer—authenticating genuine `%PDF-` and `PNG` headers while rejecting renamed Windows executables and polyglots.*
  > 2. *Second, our SSRF defense resolver verifies all external URLs, strictly blocking private subnets, loopbacks, and AWS/GCP cloud metadata endpoints.*
  > 3. *Third, the agent digests the document into a SHA-256 hash, cross-checking line items against our active Treasury Policy.*
  > 
  > *Here, the audit passes with an AI Risk Score of 12 out of 100 and a 96% policy compliance rating."*

---

### Act 4: Step-Up TOTP MFA & Atomic Capture (1:55 - 2:25)
* **Screen:** Step-Up MFA modal opens. Click **"Auto-Fill Demo Code"** (or enter the 6-digit TOTP from top status bar: `337474`), then click **"Verify & Settle"**. Watch the row status flip to green `CAPTURED` with receipt ID.
* **Spoken Script:**
  > *"Because this disbursement exceeds our policy threshold, LedgerGuard triggers an RFC 6238 Step-Up Multi-Factor challenge. We submit our six-digit TOTP verification code. Instantly, the server dispatches an atomic call to PayPal's Orders v2 Capture API. The escrow is settled, and AG Grid flashes green to mark the funds as Captured."*

---

### Act 5: The Enterprise Security & Audit Flex (2:25 - 2:50)
* **Screen:** Switch to `/audit-log` and click **"Verify Hash Chain Integrity"** (show green 100% integrity banner). Then switch to `/security-audit` and click **"Run Live 20-Point Security Self-Test"** (show 20/20 PASSED).
* **Spoken Script:**
  > *"Finally, enterprise finance requires bulletproof compliance. In the Audit Explorer, every single agent prompt, delivery hash, and PayPal API payload is chained together into a SHA-256 Merkle chain—guaranteeing tamper-evidence. On disk, all vendor data is protected by hardware-accelerated AES-256-GCM encryption. And on our Security Posture screen, judges can run a live 20-point automated penetration test across SQLi, CSRF, and SSRF—scoring a perfect 20 out of 20 live.*
  > 
  > *LedgerGuard turns PayPal into a programmable, verifiable escrow engine for the agentic economy. Thank you."*

---

## 💡 Top 3 Judge Defense Q&A

1. **Q: "What happens if a vendor submits a malicious script renamed as a PDF invoice?"**  
   * **Answer:** *"LedgerGuard inspects binary magic bytes on the first 8 bytes of the file buffer (requiring `%PDF-` or `\x89PNG`). File extensions are ignored. Our test suite includes an automated test asserting rejection of Windows PE executables disguised as PDFs."*

2. **Q: "What if the LLM hallucinates and approves an unauthorized release?"**  
   * **Answer:** *"The LLM cannot release funds directly. Releases are strictly gated by server-side policy code: if risk exceeds 40 or amount exceeds $1,000, hardcoded RFC 6238 TOTP Step-Up MFA is enforced. Even if the LLM outputs approval, the PayPal Capture endpoint rejects requests lacking valid signed MFA tokens."*

3. **Q: "How does the app stay responsive when PayPal Sandbox experiences latency?"**  
   * **Answer:** *"We wrapped all external calls in an institutional Circuit Breaker pattern with deterministic fallbacks. Plus, judges can press `Ctrl + Shift + K` to toggle our zero-latency 'God Mode' failsafe interceptor for offline demo assurance."*
