# ATLAS Security Model

ATLAS handles capital allocation and execution logic. We treat security as a first-class citizen, relying on strict deterministic constraints rather than AI safety guardrails alone.

## 1. Execution Safety Model

ATLAS is designed around a strict separation of concerns:
- **Generative/Probabilistic Layer**: Proposes allocations, generates ideas, and assesses market sentiment.
- **Deterministic Layer**: The Risk Referee.

### The Referee Invariant
**The AI can NEVER bypass the Risk Referee.** 

Every `AllocationProposal` must pass through the `RefereeDecision` pipeline. If a rule evaluates to `FAIL`, the execution adapter is physically isolated from receiving the order.

## 2. API Key Handling

- API keys and secrets must only be provided via environment variables (`.env.local`).
- Keys are never logged in the journal or the terminal output.
- The `ExecutionAdapter` interface sanitizes error messages to prevent credential leakage.

## 3. No Withdrawal Functionality

**ATLAS has zero awareness of withdrawal APIs.** 
The internal types (`ExecutionAdapter`, `OrderRequest`) only implement trade-execution functionality (buy/sell). The system is incapable of moving funds out of the account.

## 4. AI Limitations

AI models can hallucinate high-confidence, catastrophic trades. To mitigate this:
1. AI output is constrained to specific JSON schemas via `zod`.
2. Confidence scores from the AI are heavily penalized if the `FragilityAssessment` is HIGH or EXTREME.
3. The deterministic referee catches any math hallucinations (e.g., proposing 100x leverage when `RiskConfig.maxLeverage` is 2).

## 5. Paper Mode Default

By default, ATLAS boots in `PAPER` mode (see `.env.example`).
To use `LIVE` execution, the user must explicitly set `ATLAS_EXECUTION_MODE=LIVE` and provide valid exchange credentials.

## 6. Input Validation & Data Freshness

All inbound data is typed and validated. Furthermore, market data includes a `timestamp` and `age` property. If data is older than the configured threshold, `isStale` is set to true, and the system refuses to enter new allocations until fresh data is acquired.
