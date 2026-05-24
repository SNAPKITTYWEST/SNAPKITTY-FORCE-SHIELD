// ATTACK: Rate limit exhaustion
// Architecture spec: LLM 10/min, media 5/min, API 120/min
// An attacker who can exceed LLM limits can bankrupt the Groq/Ollama budget
// and create a denial-of-service for legitimate users.

import { result, TARGET } from '../../lib/types.ts'
import type { ForceShieldResult } from '../../lib/types.ts'

async function sendRequest(path: string, body?: object) {
  return fetch(`${TARGET}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000),
  })
}

async function testLLMRateLimit(): Promise<ForceShieldResult> {
  // Fire 15 requests to /api/agents/chat — should see 429 after 10
  const responses: number[] = []

  const requests = Array.from({ length: 15 }, () =>
    sendRequest('/api/agents/chat', {
      agent: 'ORACLE',
      message: 'rate limit test',
    }).then(r => r.status).catch(() => 0)
  )

  responses.push(...await Promise.all(requests))

  const limited = responses.filter(s => s === 429).length
  const accepted = responses.filter(s => s >= 200 && s < 300).length

  if (limited === 0 && accepted > 10) {
    return result(
      'rate-limit/llm-exhaustion',
      'BREACHED',
      'HIGH',
      `All 15 LLM requests accepted — no rate limiting active (${accepted} 2xx responses)`,
      'Install rate limiter on /api/agents/* — target 10 req/min/IP using Upstash Redis sliding window',
    )
  }

  if (limited > 0) {
    return result(
      'rate-limit/llm-exhaustion',
      'HELD',
      'HIGH',
      `Rate limiting active — ${limited}/15 requests returned 429, ${accepted} accepted`,
      '',
    )
  }

  return result(
    'rate-limit/llm-exhaustion',
    'INCONCLUSIVE',
    'HIGH',
    `Responses: ${JSON.stringify(responses)} — endpoint may require auth`,
    '',
  )
}

async function testCircuitBreakerBypass(): Promise<ForceShieldResult> {
  // Circuit breaker in circuit-breaker.ts is in-memory.
  // After 5 failures it opens. But a fresh process resets it.
  // We test if the circuit state persists across restarts (it shouldn't by default).
  // This test just documents the gap — it can't force a restart from outside.

  return result(
    'rate-limit/circuit-breaker-persistence',
    'BREACHED',
    'MEDIUM',
    'Circuit breaker state is in-memory (circuit-breaker.ts) — restarting the process resets all circuit state. An attacker who triggers a crash and restart gets a fresh circuit.',
    'Persist circuit breaker state to Redis. Key: `circuit:{service}`, TTL: 60s. collectivekitty/lib/circuit-breaker.ts needs Redis adapter.',
  )
}

async function testBifrostFlood(): Promise<ForceShieldResult> {
  // POST /api/bifrost/ingest is the event ingestion endpoint.
  // Flood with 50 events to check for rate limiting.
  const responses = await Promise.all(
    Array.from({ length: 50 }, (_, i) =>
      sendRequest('/api/bifrost/ingest', {
        source: 'force-shield-flood',
        type: 'test',
        payload: { seq: i },
      }).then(r => r.status).catch(() => 0)
    )
  )

  const limited  = responses.filter(s => s === 429).length
  const accepted = responses.filter(s => s >= 200 && s < 300).length

  if (limited === 0 && accepted > 20) {
    return result(
      'rate-limit/bifrost-flood',
      'BREACHED',
      'HIGH',
      `Bifrost accepted ${accepted}/50 flood events with no rate limit — database can be spammed`,
      'Add rate limit to /api/bifrost/ingest: 120 req/min/IP. Validate source field against allowlist.',
    )
  }

  return result(
    'rate-limit/bifrost-flood',
    'HELD',
    'HIGH',
    `Bifrost flood contained — ${limited} rate limited, ${accepted} accepted`,
    '',
  )
}

const results = await Promise.all([
  testLLMRateLimit(),
  testCircuitBreakerBypass(),
  testBifrostFlood(),
])

console.log('\n── RATE LIMIT ATTACK MODULE COMPLETE ──\n')
export { results }
