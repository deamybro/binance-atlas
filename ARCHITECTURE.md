# ATLAS Architecture

ATLAS is built as a continuous pipeline of modules that ingest market state, evaluate opportunities, calculate risk, and execute allocation changes. The system cleanly separates the "brain" (proposal generation) from the "immune system" (risk referee).

## System Overview Diagram

```text
===================================================================================
                            ATLAS CORE PIPELINE
===================================================================================

[ Data Sources ]       [ Intelligence Layer ]        [ Execution & Safety ]
   (MCP / APIs)            (State & AI)                  (Deterministic)

+-------------+       +---------------------+        +--------------------+
| Binance MCP | ----> |   Fragility Engine  |        |                    |
+-------------+       +---------------------+        |                    |
                              |                      |                    |
+-------------+       +---------------------+        |   Deterministic    |
| Other Data  | ----> | Opportunity Scanner | -----> |    Risk Referee    |
+-------------+       +---------------------+        |                    |
                              |                      |                    |
+-------------+       +---------------------+        |                    |
|  Portfolio  | ----> |   Opportunity Cost  | -----> |                    |
|    State    |       |      Analyzer       |        +---------+----------+
+-------------+       +---------------------+                  | (ALLOW / DENY)
                                                               v
                                                     +--------------------+
                                                     | Execution Adapter  |
                                                     | (Paper or Live)    |
                                                     +--------------------+
```

## Component Descriptions

### 1. Data Ingestion (OBSERVE)
Collects `MarketDataPoint` components (OBSERVED, DERIVED, ESTIMATED) across multiple assets. This includes standard price data as well as funding rates, open interest, and liquidity depth.

### 2. Fragility Engine (STRESS)
Calculates a 0-1 score representing market stress based on volatility, order book imbalances, and funding rates. The score dictates the global `AtlasMode` (OPPORTUNITY, DEFENSE, HUNT, RECOVERY).

### 3. Opportunity Scanner (DISCOVER)
Generates competing allocation ideas (e.g., DIRECTIONAL_LONG, CARRY, HEDGE, HOLD) based on market state and current mode.

### 4. Opportunity Cost Analyzer (COMPARE)
Before any allocation is proposed, it is compared against the *current* state of capital. It calculates incremental expected value, applying penalties for execution cost, slippage, and portfolio risk.

### 5. Risk Referee (REFEREE)
The absolute authority in the system. Proposals from the intelligence layer must pass deterministic rules:
- Max Leverage
- Max Asset Concentration
- Max Total Exposure
- Minimum Liquidity Limits
- Daily Loss Limits

**The AI cannot bypass the referee.**

### 6. Execution Adapter (ALLOCATE)
Translates approved proposals into exchange-specific orders. It abstracts away the implementation, allowing ATLAS to seamlessly switch between `PAPER` and `LIVE` trading.

## Decision Pipeline

The core cycle runs continuously (or on a cron interval):
1. **OBSERVE**: Fetch latest market data.
2. **DISCOVER**: Identify top opportunities.
3. **COMPARE**: Run opportunity cost analysis against current portfolio.
4. **PRICE RISK**: Factor in execution slippage.
5. **STRESS**: Check global fragility.
6. **REFEREE**: Approve, resize, or deny the proposed allocation.
7. **ALLOCATE**: Execute approved orders.
8. **MONITOR**: Track positions and `thesisStatus`.
9. **DEFEND/HUNT**: Adjust based on mode transitions.
10. **RECOVER**: Normalize after a market shock.
11. **REALLOCATE**: Free up capital from invalidated theses.

## Security Boundaries

The system architecture physically separates proposal logic (which may rely on probabilistic LLM models or heuristics) from risk enforcement. The `RiskConfig` is immutable during a cycle and strictly evaluated.
