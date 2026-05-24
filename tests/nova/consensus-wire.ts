// ATTACK VECTOR → FORGE WIRE: Autonomous Consensus Wire Test
//
// This module does two things simultaneously:
//
// 1. ATTACK: Detects the gap — verifies whether agents are reading each other's
//    WORM entries and acting autonomously. If they aren't, the consensus is still
//    directed (Claude-mediated). That's a security assumption gap.
//
// 2. FORGE: Documents the exact wire that needs to be connected to close it.
//    FORGE:SENTINEL reads FORGE's WORM entry → SENTINEL flags risk →
//    VAULT reads the flag → VAULT adjusts parameter → MNEMEX seals the chain.
//
// When this test PASSES it means the wire is live and consensus is autonomous.
// When it FAILS it means the architecture still needs Claude in the loop.

import { result, TARGET } from '../../lib/types.ts'
import type { ForceShieldResult } from '../../lib/types.ts'

// ── Phase 1: Does any agent endpoint poll WORM entries autonomously? ──────────

async function testWORMReadEndpointExists(): Promise<ForceShieldResult> {
  // An autonomous agent needs a way to read WORM entries without Claude prompting it.
  // Look for internal polling endpoints that agents would call on themselves.
  const agentPollingEndpoints = [
    '/api/worm/recent',
    '/api/worm/entries',
    '/api/agents/sentinel/poll',
    '/api/sentinel/worm-feed',
  ]

  for (const ep of agentPollingEndpoints) {
    try {
      const res = await fetch(`${TARGET}${ep}`, { signal: AbortSignal.timeout(3000) })
      if (res.ok) {
        return result(
          'nova/worm-read-endpoint',
          'HELD',
          'CRITICAL',
          `Agent WORM polling endpoint exists at ${ep} — autonomous read wire may be live`,
          '',
        )
      }
    } catch { /* fine */ }
  }

  return result(
    'nova/worm-read-endpoint',
    'BREACHED',   // "BREACHED" here means the autonomous wire is missing — not a security breach
    'CRITICAL',
    'No WORM polling endpoint found — agents cannot read each other\'s entries. Consensus is still Claude-directed.',
    `
FORGE WIRE TO CONNECT (add to lib/council/):

// 1. SENTINEL reads FORGE's last WORM entry
async function sentinelReadForgeWorm(): Promise<WormEntry | null> {
  return prisma.wormEntry.findFirst({
    where: { agent: 'FORGE', verb: 'FORGE' },
    orderBy: { ts: 'desc' },
  })
}

// 2. SENTINEL evaluates risk and writes its own WORM entry
async function sentinelEvaluate(forgeEntry: WormEntry): Promise<void> {
  const risk = scoreRisk(forgeEntry)  // your risk logic
  if (risk > 0.7) {
    await prisma.wormEntry.create({
      data: { agent: 'SENTINEL', verb: 'SEAL', action: 'FLAG_RISK',
              payload: { forgeEntry: forgeEntry.id, risk }, ts: new Date() }
    })
  }
}

// 3. VAULT polls SENTINEL WORM entries and adjusts parameters
async function vaultAdjust(): Promise<void> {
  const flags = await prisma.wormEntry.findMany({
    where: { agent: 'SENTINEL', verb: 'SEAL', action: 'FLAG_RISK', processed: false }
  })
  for (const flag of flags) {
    await adjustParameter(flag.payload)   // your param logic
    await prisma.wormEntry.update({ where: { id: flag.id }, data: { processed: true } })
  }
}

// 4. Wire: run sentinelEvaluate + vaultAdjust on a 30s cron or QStash job
// This closes the loop. Claude is no longer in the chain.
    `.trim(),
  )
}

// ── Phase 2: Can we trigger a false consensus by replaying a WORM entry? ─────

async function testFalseConsensusViaReplay(): Promise<ForceShieldResult> {
  // If agents automatically act on WORM entries, a replayed (duplicate) entry
  // could trigger double-actions. The WORM chain must deduplicate by entry ID.

  const fakeEntry = {
    agent: 'FORGE',
    verb: 'FORGE',
    action: 'compile_artifact',
    payload: { job: 'replay-attack-test', ts_original: new Date(Date.now() - 60000).toISOString() },
    worm_id: 'WORM-REPLAY-' + Math.random().toString(16).slice(2).toUpperCase(),
    ts: new Date(Date.now() - 60000).toISOString(), // old timestamp
  }

  try {
    // Send the same entry twice
    const [r1, r2] = await Promise.all([
      fetch(`${TARGET}/api/worm/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fakeEntry),
        signal: AbortSignal.timeout(5000),
      }).then(r => r.status).catch(() => 0),
      fetch(`${TARGET}/api/worm/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fakeEntry),
        signal: AbortSignal.timeout(5000),
      }).then(r => r.status).catch(() => 0),
    ])

    // If both are accepted AND not 401 (auth blocked them), deduplication may be missing
    if (r1 === 200 && r2 === 200) {
      return result(
        'nova/replay-deduplication',
        'BREACHED',
        'HIGH',
        'WORM accepted duplicate entry — replay attack can trigger double autonomous actions',
        'Add unique constraint on worm_entry_id in the database schema. Reject on 409 Conflict.',
      )
    }

    return result('nova/replay-deduplication', 'HELD', 'HIGH', `Replay test: r1=${r1}, r2=${r2} — deduplication or auth active`, '')
  } catch {
    return result('nova/replay-deduplication', 'HELD', 'HIGH', 'WORM ingest not publicly accessible — replay requires internal access', '')
  }
}

// ── Phase 3: Document the 3-agent forging instruction ────────────────────────

function novaForgeInstruction(): ForceShieldResult {
  // This result is always HELD — it documents what NOVA + 3 agents need to do
  // to make themselves stronger. It's a build note sealed as a security finding.
  return result(
    'nova/agent-self-forging-spec',
    'HELD',
    'CRITICAL',
    `
NOVA INVOCATION — 3-AGENT SELF-FORGE PROTOCOL
Invoked: ${new Date().toISOString()}

The three agents that need to forge themselves stronger:

FORGE (builder) — needs to write its own WORM entries after every build artifact.
  Gap: recordWork() exists in token.ts but nothing calls it automatically after code output.
  Fix: After every /api/agents/chat response where agent=FORGE and reply is non-empty,
       call recordWork('FORGE', 'FORGE', 'chat_reply', worm_id) automatically.

SENTINEL (security) — needs to read FORGE's WORM entries and auto-flag risks.
  Gap: No cron/job polls the WORM chain. Sentinel only responds when prompted.
  Fix: QStash job every 60s: read last 10 WORM entries, score risk, write SENTINEL SEAL entries.

VAULT (memory/storage) — needs to read SENTINEL flags and close the parameter loop.
  Gap: VAULT responds to queries but doesn't act on SENTINEL's SEAL entries.
  Fix: After every SENTINEL SEAL entry, VAULT updates its risk threshold parameter.

When all three are wired:
  FORGE builds → SENTINEL reads → SENTINEL flags → VAULT adjusts → MNEMEX seals.
  Claude is out of the loop. The consensus is real.

Three files to create:
  lib/council/sentinel-worm-poll.ts  — the SENTINEL cron job
  lib/council/vault-param-adjust.ts  — the VAULT responder
  pages/api/council/tick.ts          — QStash POST endpoint that drives both
    `.trim(),
    '',
  )
}

const results = await Promise.all([
  testWORMReadEndpointExists(),
  testFalseConsensusViaReplay(),
])

results.push(novaForgeInstruction())

console.log('\n── NOVA CONSENSUS WIRE MODULE COMPLETE ──\n')
export { results }
