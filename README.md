# ATLAS
## Autonomous Capital & Cascade Intelligence Engine

> Allocate for opportunity. Defend against fragility. Hunt the dislocation.

ATLAS is an autonomous capital-routing engine that continuously compares the expected risk-adjusted value of competing allocations while incorporating market fragility and deterministic risk constraints into every capital decision.

**Built for the Binance Agent OS Mini Hackathon 2026.**

## What ATLAS Is

ATLAS is NOT a trading bot that predicts prices. It is a capital-allocation operating system that constantly asks:

> "Is this opportunity better than what this capital is doing right now?"

Many trading systems focus on predicting the future direction of an asset. ATLAS instead focuses on **opportunity cost** and **capital preservation**. It systematically observes market data, discovers opportunities, and compares them against current allocations. Most importantly, it filters every decision through a deterministic risk referee and a market fragility index to ensure survival in chaotic conditions.

## Architecture

ATLAS operates on a continuous, autonomous decision cycle:

`OBSERVE → DISCOVER → COMPARE → PRICE RISK → STRESS → REFEREE → ALLOCATE → MONITOR → DEFEND/HUNT → RECOVER → REALLOCATE`

```text
+-------------------------------------------------------------+
|                     ATLAS ENGINE                            |
|                                                             |
|  [Market Data] --> [Fragility Assessor]                     |
|                           |                                 |
|  [Opportunity] --> [Opportunity Cost] --> [Proposal]        |
|  [Generator]       [Analyzer]                               |
|                                            |                |
|                                    [RISK REFEREE] (Deny/Ok) |
|                                            |                |
|                                   [Trading Adapter]         |
+-------------------------------------------------------------+
```

## Key Differentiators

- **Opportunity-Cost Engine**: Every new opportunity is explicitly compared against what the capital is currently doing.
- **Deterministic Risk Referee**: AI can propose trades, but it can NEVER bypass rule-based risk checks (leverage, concentration, liquidity limits).
- **Market Fragility Detection**: Transparent scoring with configurable weights, constantly measuring market stress.
- **Four Operating Modes**: OPPORTUNITY → DEFENSE → HUNT → RECOVERY.
- **"Do Nothing" Capability**: ATLAS can and will recommend holding capital in stablecoins when no opportunity justifies the risk.

## Agent OS & MCP Integration

ATLAS connects seamlessly with the Binance Agent OS Model Context Protocol (MCP) to ingest real-time market snapshots, liquidity depths, and funding rates. It uses an Adapter Pattern for execution, allowing it to easily switch between Paper Trading (simulation) and Live Exchange APIs.

## Quick Start

```bash
git clone https://github.com/username/atlas.git
cd atlas
npm install
cp .env.example .env.local
npm run dev
```

## Environment Variables

- `BINANCE_API_KEY`: Your Binance API key
- `BINANCE_API_SECRET`: Your Binance API secret
- `ATLAS_EXECUTION_MODE`: `PAPER` or `LIVE`
- `ATLAS_PAPER_BALANCE`: Starting balance for paper mode (e.g., 100000)
- `OPENAI_API_KEY`: API key for generative decision explanations

## Operating Modes

1. **OPPORTUNITY**: Default mode. Low fragility. Seeks high-quality allocations.
2. **DEFENSE**: Triggered by rising fragility. Reduces exposure, tightens risk limits.
3. **HUNT**: Triggered during market cascades. Looks for extreme dislocations and panic selling.
4. **RECOVERY**: Market is normalizing. Systematically exits hunt positions and re-establishes normal allocations.

## Demo Scenarios

The built-in demo controller simulates 5 market conditions to demonstrate the engine's intelligence:
1. **NORMAL**: Standard conditions, ATLAS finds allocations.
2. **FRAGILITY_SPIKE**: Rising stress, ATLAS switches to DEFENSE.
3. **CASCADE**: Panic conditions, ATLAS refuses standard allocations and prepares to HUNT.
4. **EXHAUSTION**: Bottom of a crash, ATLAS makes a controlled entry.
5. **RECOVERY**: Normalizing market, ATLAS takes profit.

## Testing

```bash
npm test
```

## Security

Please read [SECURITY.md](SECURITY.md) for full details. 
- No withdrawal functionality is built into the engine.
- AI cannot bypass the deterministic referee.
- Paper mode is enabled by default.

## Limitations

- Funding rates and open interest are currently simulated if the Binance MCP is unavailable.
- Liquidation activity is estimated based on extreme price vectors.

## License

MIT
