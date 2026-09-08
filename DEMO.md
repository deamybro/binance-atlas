# ATLAS Demo Script (5 Minutes)

This script is designed for the Binance Agent OS Hackathon judges to demonstrate the core capabilities of the ATLAS intelligence engine.

## Prerequisites
- Have the frontend running (`npm run dev`)
- Ensure `.env.local` is configured with `ATLAS_EXECUTION_MODE=PAPER`
- Open the Demo Controller panel in the UI

---

## Step 1: Normal Conditions (0:00 - 1:00)
**Action:** Set demo scenario to `NORMAL`.
**What happens:** 
- ATLAS observes standard market data.
- It finds a solid directional opportunity.
- The Opportunity Cost Analyzer compares it against holding USD.
- The Risk Referee approves the allocation.
**What to highlight:** "Notice how ATLAS doesn't just buy because the price is going up. It explicitly proves that the expected return outweighs the execution cost and slippage of moving capital."

## Step 2: The "Wow" Moment - Denied by Fragility (1:00 - 2:00)
**Action:** Keep market normal, but inject a highly lucrative, high-leverage proposal.
**What happens:** 
- The AI proposes a massive 15x leverage trade because the setup looks "perfect".
- **The Risk Referee blocks it.**
**What to highlight:** "This is our deterministic safety layer. The AI hallucinates a 'sure thing', but the immutable Risk Referee denies it based on concentration limits. The AI cannot bypass this."

## Step 3: Defense Mode (2:00 - 3:00)
**Action:** Trigger `FRAGILITY_SPIKE` scenario.
**What happens:** 
- Order book imbalances and funding rates spike.
- Fragility Engine score jumps to EXTREME.
- ATLAS immediately shifts mode from `OPPORTUNITY` to `DEFENSE`.
- It begins deleveraging and liquidating marginal positions to cash.
**What to highlight:** "ATLAS doesn't wait for price to drop; it senses market stress through funding and liquidity metrics and moves capital to safety."

## Step 4: The Cascade (3:00 - 4:00)
**Action:** Trigger `CASCADE` scenario.
**What happens:** 
- Widespread panic selling simulated.
- ATLAS switches to `HUNT` mode but proposes `HOLD` (do nothing).
**What to highlight:** "In a cascading market, the best allocation is often doing nothing. ATLAS successfully overrides the urge to 'buy the dip' too early because the volatility penalty is too high."

## Step 5: Exhaustion & Recovery (4:00 - 5:00)
**Action:** Trigger `EXHAUSTION`, then `RECOVERY` scenarios.
**What happens:** 
- In EXHAUSTION, ATLAS detects sellers are tapped out. It makes a highly controlled, low-leverage entry into a structurally critical asset.
- In RECOVERY, as fragility drops, ATLAS systematically takes profit and reverts to `OPPORTUNITY` mode.
**What to highlight:** "ATLAS hunted the dislocation, protected the capital during the crash, and seamlessly reverted to standard operations once the threat passed."
