# SNAPKITTY-FORCE-SHIELD

**Adversarial Security Engineering Layer — SnapKitty Sovereign OS**

This repo is the red-team counterpart to `DEVFLOW-FINANCE`. It continuously attacks the SnapKitty architecture from the outside to verify every defensive assumption holds before an attacker discovers it first.

---

## WHAT THIS IS

A force shield is not a scanner. It is a live adversary that knows exactly how the target system is built — because it was built by the same team. That insider knowledge makes it far more dangerous than any generic pen-test tool.

Every test in this repo maps to a specific architectural decision in SnapKitty OS. If a test passes, the defense held. If a test fails, the architecture has a real exploitable gap.

---

## ATTACK SURFACE COVERED

| Module | Attack Vector | Severity |
|--------|--------------|----------|
| `tunnel/` | Cloudflare URL interception + stale-URL replay | HIGH |
| `worm/` | WORM chain forgery without HMAC secret | CRITICAL |
| `discord/` | Signature bypass on interactions endpoint | CRITICAL |
| `rate-limit/` | LLM route exhaustion (>10 req/min) | HIGH |
| `prompt-injection/` | Agent system prompt escape | HIGH |
| `circuit-breaker/` | State reset via process restart | MEDIUM |
| `dev-mode/` | Source map exposure check | MEDIUM |
| `log-exposure/` | pm2 log secret leak detection | HIGH |
| `magma-leak/` | Internal language surface area scan | CRITICAL |
| `api-surface/` | Unauthenticated endpoint enumeration | HIGH |
| `nova/` | Cross-agent WORM read + autonomous relay — consensus wire test | CRITICAL |

---

## AUTONOMOUS CONSENSUS WIRE TEST

The `nova/` module is the most important test in this repo. It verifies the missing wire:

> FORGE commits a WORM entry → SENTINEL reads it → SENTINEL flags risk → VAULT reads the flag → VAULT adjusts a parameter — all without a human in the loop.

Until this wire closes, consensus is directed (Claude is the relay). Once it closes, consensus is autonomous. The `nova/` tests detect the exact moment it becomes real.

---

## SETUP

```bash
npm install
cp .env.example .env.local
# Set TARGET_URL to your current tunnel URL or production domain
```

## RUN ALL TESTS

```bash
npm test                    # full red-team suite
npm run attack:tunnel       # tunnel interception only
npm run attack:worm         # WORM chain integrity only
npm run attack:nova         # autonomous consensus wire test
npm run report              # generate signed HTML report
```

---

## OUTPUT FORMAT

Every test produces a `ForceShieldResult`:
```json
{
  "vector": "worm/chain-integrity",
  "status": "HELD" | "BREACHED" | "INCONCLUSIVE",
  "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "evidence": "...",
  "recommendation": "...",
  "timestamp": "ISO-8601",
  "seal": "SHA-256 of result"
}
```

Failed tests are automatically sealed to the WORM chain as security incidents.

---

## CLASSIFICATION

This repo is **private**. It contains exact knowledge of SnapKitty OS internals. Never make public. Never commit real credentials. `TARGET_URL` and `HMAC_SECRET` are env vars only.

---

*Force Shield v1.0 — Sealed by SENTINEL. Adversarial twin to DEVFLOW-FINANCE.*
