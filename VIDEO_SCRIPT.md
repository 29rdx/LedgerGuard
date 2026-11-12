# LedgerGuard — 3-Minute Video Demo Script (Solo Developer)

**Total Duration:** 2 minutes 50 seconds (Target: Strictly under the 3:00 Devpost limit)  
**Host / Presenter:** Solo Developer & Lead Architect  
**Visual Style:** Institutional, high-contrast desktop recording at 1080p/60fps. Zero fluff, brisk pacing, crisp clicks.

---

## ⏱️ Second-by-Second Production Breakdown

| Time Window | Screen Action / Visual Cue | Click / Keyboard Action | Spoken Audio Voiceover Script (Exact Words) |
| :--- | :--- | :--- | :--- |
| **0:00 - 0:12** | **Split-Screen Login Portal (`/login`)**.<br>Left panel shows clean white Inter login; right panel shows deep obsidian architectural mesh with animated SHA-256 hash chain blocks. | Mouse hovers over the emerald **"VP Treasury (Admin)"** 1-click judge button. | *"Welcome to LedgerGuard. In global B2B commerce, over $2.4 trillion is lost each year to premature vendor payouts and painful invoice disputes. LedgerGuard solves this with an autonomous AI Treasury Controller powered by PayPal Orders v2 authorize-and-hold escrow, AG Grid, and hardware-accelerated AES-256 encryption."* |
| **0:12 - 0:30** | Click **"VP Treasury (Admin)"**.<br>Instant transition into the main **Treasury Blotter (`/`)** dashboard. Metric strip and high-density AG Grid table load with tabular monospace numerals. | Click **"VP Treasury (Admin)"**.<br>Scroll smoothly down the AG Grid table. | *"We begin at our split-screen portal. With one click, judges can provision an isolated sandbox session with pre-seeded data—zero typing required. Here is the Treasury Blotter, built on AG Grid React 36.2. Notice the monospace financial numerals and live risk scores. Every row represents an active PayPal authorization hold."* |
| **0:30 - 0:52** | Press **Cmd+K** on macOS (or Ctrl+K). The Spotlight Command Palette floats into view. Type: `Authorize $1500 escrow for Cloudflare edge routing` and hit Enter. | Press `Cmd+K`.<br>Type prompt.<br>Press `Enter`. | *"Let's test agentic execution. I press Command-K to open our Spotlight Command Palette and instruct our AI Treasury Agent: 'Authorize $1,500 escrow for Cloudflare edge routing.' The agent interprets the intent, selects the contractor category, and calls PayPal Orders v2 with intent: AUTHORIZE."* |
| **0:52 - 1:15** | Command Palette closes. The AG Grid table flashes green on the top row via Server-Sent Events (SSE). The new $1,500 Cloudflare escrow row appears in `AUTHORIZED_HOLD` state. | Click row to highlight.<br>Point cursor to live green cell flash and SSE indicator. | *"Watch the grid: without a page reload, our Server-Sent Events stream updates the blotter in real time, smoothly flashing the row cells green. The funds are now securely earmarked on PayPal's sandbox network under order authorization, awaiting cryptographic proof of delivery."* |
| **1:15 - 1:38** | Click the **"Audit & Capture"** button on an active escrow hold. The Escrow Audit Modal opens, showing the contractor deliverable, SHA-256 hash matching, and AI Risk Score of 12/100. | Click **"Audit & Capture"** button.<br>Hover over Deliverable Proof and Risk Score (12/100). | *"Now, the contractor submits their deliverable. I open the Escrow Audit Modal. LedgerGuard's autonomous auditor runs binary magic-byte inspection, verifies the deliverable against our strict SSRF allowlist, and calculates a SHA-256 proof hash. Because the risk score is a safe 12 out of 100 and passes our Treasury Policy, it authorizes capture."* |
| **1:38 - 2:00** | Click **"Confirm & Capture in PayPal Sandbox"**.<br>Step-Up MFA modal appears; click **"Auto-Fill Judge Code"** and submit.<br>Status flips to `CAPTURED` with PayPal Capture ID `CAP-...`. | Click **"Confirm & Capture"**.<br>Click **"Auto-Fill Judge Code"**.<br>Click **"Verify & Settle"**. | *"Because this disbursement exceeds our policy threshold, LedgerGuard triggers an RFC 6238 TOTP Step-Up MFA challenge. We click autofill and confirm. Instantly, funds are captured via the PayPal REST v2 API, updating the status to CAPTURED with a verifiable settlement receipt."* |
| **2:00 - 2:15** | **The Cyber Security Flex:** Split screen to terminal or VS Code, run `sqlite3 prisma/dev.db "SELECT vendorEmail, deliverableSummary FROM LedgerTransaction LIMIT 1;"`. The output shows raw `enc_v1_...` ciphertext. | Show terminal with `sqlite3` query.<br>Highlight the `enc_v1_` AES-256-GCM ciphertext on disk. | *"Now, for the cybersecurity proof. Let's inspect the raw database on disk. Notice these fields: vendorEmail and deliverableSummary are completely unreadable. LedgerGuard implements field-level AES-256-GCM Application-Level Encryption with 96-bit IVs and 128-bit authentication tags before writing to disk."* |
| **2:15 - 2:30** | Switch back to browser. Navigate to **Security Posture (`/security-audit`)**.<br>Show the live 20/20 Security Scorecard with all green checkmarks. | Click **"Security Posture"** in the sidebar navigation.<br>Scroll through the 20 passing controls. | *"Switching back to the terminal UI, we open our Security Posture Suite. LedgerGuard runs 20 automated live penetration probes across SSRF defenses, double-submit CSRF, parameter sanitization, and timing-safe comparisons—scoring a perfect 20 out of 20."* |
| **2:30 - 2:50** | Navigate to **Audit Trail (`/audit-log`)**.<br>Click **"Verify Cryptographic Integrity"** button. The modal shows 100% mathematical integrity across all blocks. | Click **"Audit Trail"**.<br>Click **"Verify Cryptographic Integrity"**.<br>Show green modal: `All 18 blocks verified with 100% mathematical integrity`. | *"Finally, our Audit Trail. Every single agent decision, proof validation, and PayPal API call is mined into a SHA-256 Merkle hash chain. We click 'Verify Cryptographic Integrity': every block traverses back to the genesis block with 100% mathematical certainty. LedgerGuard brings institutional rigor, agentic autonomy, and cryptographic defense to PayPal commercial settlement. Thank you."* |

---

## 🎬 Recording Checklist & Pro-Tips for Solo Dev

1. **Window Setup:** Clean browser window open at `http://localhost:3000/login` in dark mode.
2. **Pre-Seeded State:** Run `npm run db:reset` right before recording so the database is in a clean, perfect state with unbroken genesis blocks.
3. **Cursor Pacing:** Move the cursor deliberately. Avoid erratic mouse wiggling.
4. **Terminal Window:** Keep a split terminal window pre-typed with:
   ```bash
   sqlite3 prisma/dev.db "SELECT vendorEmail, deliverableSummary FROM LedgerTransaction LIMIT 1;"
   ```
   So switching to it takes exactly 2 seconds during the 2:00 mark.
5. **Command Palette Shortcut:** Use `Cmd+K` (Mac) or click the spotlight search icon in the top header.
6. **Timing Target:** 
   - 0:00 - 0:30 (30s)
   - 0:30 - 1:15 (45s)
   - 1:15 - 2:00 (45s)
   - 2:00 - 2:30 (30s)
   - 2:30 - 2:50 (20s)
   - **Total:** 2 minutes 50 seconds. Leaves a comfortable 10-second buffer under YouTube / Devpost's 3:00 hard ceiling.

