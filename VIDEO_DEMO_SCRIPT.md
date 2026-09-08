# ATLAS Video Recording & Live Presentation Guide

> **Target Duration:** 3 to 5 Minutes  
> **Target Audience:** Binance Agent OS Hackathon Judges  
> **App URL:** [http://localhost:3000](http://localhost:3000)

---

## 🎬 Quick Setup Before You Hit Record
1. Open **[http://localhost:3000](http://localhost:3000)** in full screen.
2. Ensure your dev server is running (`npm run dev`).
3. Have your recording tool ready (Loom, OBS, or QuickTime) with mic enabled.

---

## ⏱️ Video Breakdown & Word-for-Word Script

```
┌──────────────┬───────────────────────────────┬───────────────────────────────┐
│ Time         │ What to Click / Show          │ What You Will See on Screen   │
├──────────────┼───────────────────────────────┼───────────────────────────────┤
│ 0:00 - 0:40  │ Command Center (Home Page)    │ Capital cards, Pipeline, Mode │
│ 0:40 - 1:20  │ Normal Cycle & Execution Gate │ 6-Stage Stepper, Staged Trade │
│ 1:20 - 2:10  │ Risk Referee & Opportunities  │ Deterministic Limits, Hash    │
│ 2:10 - 3:00  │ Stress: Fragility & Cascade   │ Mode shift to DEFENSE & HUNT  │
│ 3:00 - 3:45  │ Audit Ledger & Agent OS (MCP) │ Hash Chain, Binance Protocol  │
│ 3:45 - 4:15  │ Conclusion & Outro            │ Command Center Dashboard      │
└──────────────┴───────────────────────────────┴───────────────────────────────┘
```

---

### Phase 1: The Problem & Introduction (0:00 - 0:40)
* **Where to be:** Home page (`/` Command Center).
* **Action:** Mouse hovering over the **Capital Summary Cards** and **Mode Pill**.
* **What you see on screen:** 
  - Header showing `ATLAS Command Center v2.6 PRODUCTION`
  - Total Capital `$100,000.00`, Available Capital, and Mode: `OPPORTUNITY` (Emerald badge)
  - Market Telemetry showing live price provenance (`FRESH`, `BINANCE_REST`)

🎙️ **What to say:**
> *"Hi everyone, this is **ATLAS** — an Autonomous Capital & Cascade Intelligence Engine built for the **Binance Agent OS Hackathon**.*
> 
> *Most AI trading bots fail for one simple reason: they predict prices, take unchecked leverage, and blow up during sudden market cascades. ATLAS is built completely differently. It is an autonomous capital operating system that doesn't just ask 'will the price go up?' It asks: **'Is this opportunity mathematically better than what this capital is doing right now, and will we survive if market fragility spikes?'**"*

---

### Phase 2: Autonomous Intelligence Pipeline & Execution Gate (0:40 - 1:20)
* **Action:** 
  1. Click **`Step Cycle`** button in the top right.
  2. Scroll to show the **Execution Gate** panel if a pending trade appears.
* **What you see on screen:**
  - The 6-Stage Autonomous Pipeline: `OBSERVE → DISCOVER → COMPARE → STRESS → REFEREE → ALLOCATE` lighting up.
  - Active Capital Directive explaining the AI's reasoning.
  - The **Execution Gate: Operator Authorization Required** box showing approved allocation, order preview, fee calculation, and liquidation distance.
* **Action:** Click **`CONFIRM & EXECUTE`** on the staged order (or click `Reject`).

🎙️ **What to say:**
> *"Here on the Command Center, ATLAS runs a continuous 6-stage decision pipeline. It observes real-time order books, discovers candidate trades, computes net expected returns against holding cash, stresses the trade under market fragility, and submits it to our deterministic Risk Referee.*
> 
> *Notice our **Execution Gate** safety protocol. In production mode, high-value executions are preflight-audited with exact fee previews, post-trade leverage impact, and liquidation distances before dispatching to Binance."*

---

### Phase 3: The Deterministic Risk Referee & Opportunity Engine (1:20 - 2:10)
* **Action:** 
  1. Click **`Risk Referee`** in the left sidebar (`/referee`).
  2. Scroll down to show the **Policy Registry** and **Immutable Risk Rules**.
  3. Click **`Opportunities`** in the left sidebar (`/opportunities`).
* **What you see on screen:**
  - **Risk Referee Page:** Shows the Active Policy version (e.g., `v2.6`), Policy SHA-256 Hash, Leverage Caps (max 3.0x), Concentration Limits, and Liquidation Distance Buffer (>15%).
  - **Opportunities Page:** Shows candidate opportunities ranked by **Net Opportunity Score** after accounting for cost of capital and slippage.

🎙️ **What to say:**
> *"Now let's look under the hood at our core safety innovation: the **Deterministic Risk Referee**.*
> 
> *While LLMs are great at generating trade ideas, they can hallucinate and take dangerous risks. In ATLAS, **the AI never executes directly**. Every proposal is intercepted by an immutable rule engine backed by a cryptographic policy hash.*
> 
> *If an AI proposes a 15x leverage trade, the referee automatically rejects it. If the liquidation distance is under 15%, it blocks it. The AI cannot override these rules.*
> 
> *Under **Opportunities**, ATLAS calculates the true Opportunity Cost — deducting borrow rates, slippage, and volatility penalties before deploying a single dollar."*

---

### Phase 4: Macro Stress Scenarios & Cascade Defense (2:10 - 3:00)
* **Action:** 
  1. Return to **Command Center** (`/`).
  2. In the bottom simulation bar, click **`FRAGILITY_SPIKE`**.
  3. Click **`CASCADE`**.
  4. Click **`EXHAUSTION`** then **`RECOVERY`**.
* **What you see on screen:**
  - When clicking `FRAGILITY_SPIKE`: Fragility Meter jumps to `HIGH / CRITICAL` (Red), Mode badge instantly flips to `MODE: DEFENSE` (Amber/Red).
  - When clicking `CASCADE`: Mode switches to `HUNT`, and the directive displays `HOLD (PRESERVE CAPITAL)`.
  - When clicking `RECOVERY`: Market fragility drops, ATLAS systematically takes profit.

🎙️ **What to say:**
> *"Now let's test how ATLAS handles extreme market crises using our Macro Stress simulator.*
> 
> *When I trigger a **Fragility Spike**, order book imbalances and funding volatility surge. The Fragility Engine detects this immediately, switching mode from `OPPORTUNITY` to `DEFENSE`, deleveraging risky assets into stablecoins.*
> 
> *When a full **Cascade** occurs, instead of blindly 'buying the dip' and getting liquidated, ATLAS enters `HUNT` mode but commands a `HOLD`. It waits patiently for **Exhaustion** — where forced sellers are tapped out — before executing controlled, low-risk entries at generational dislocations."*

---

### Phase 5: Cryptographic Audit Ledger & Binance Agent OS Integration (3:00 - 3:45)
* **Action:**
  1. Click **`Audit Journal`** in the left sidebar (`/journal`).
  2. Click **`Agent OS / MCP`** in the left sidebar (`/agent-os`).
* **What you see on screen:**
  - **Audit Journal Page:** Shows each lifecycle event with its **Event Hash**, **Previous Hash**, and a green **`CHAIN VERIFIED: VALID`** badge.
  - **Agent OS Page:** Shows the Binance Model Context Protocol (MCP) server integration, tool schemas (`binance_get_orderbook`, `binance_submit_order`), and active execution mode.

🎙️ **What to say:**
> *"Every single decision, rejection, and execution is recorded in our **Cryptographic Audit Journal**. Each log entry is hashed into a SHA-256 chain, guaranteeing a tamper-evident audit trail for institutional compliance.*
> 
> *Under **Agent OS**, ATLAS connects directly with the Binance Model Context Protocol (MCP), pulling real-time depth and ticker data and dispatching authenticated orders seamlessly across paper and live trading modes."*

---

### Phase 6: Conclusion & Wrap-Up (3:45 - 4:15)
* **Action:** Click back to **Command Center** (`/`).
* **What you see on screen:** Full dashboard operating cleanly.

🎙️ **What to say:**
> *"To summarize: ATLAS turns AI from a risky trading gamble into an institutional-grade, risk-constrained capital allocator. It optimizes for opportunity cost, defends against fragility, hunts cascades, and operates with deterministic safety.*
> 
> *The entire codebase is open-source, fully tested with over 90 automated tests, and ready on GitHub. Thank you for watching!"*

---

## 🎯 Quick Checklist For Your Video
- [ ] Record in 1080p or 1440p
- [ ] Keep mouse movements smooth and deliberate
- [ ] Highlight the 5 bottom simulation scenario buttons
- [ ] Point out the green `VERIFIED ✓` badge and deterministic referee
- [ ] Keep total video length between 3:00 and 4:30 minutes
