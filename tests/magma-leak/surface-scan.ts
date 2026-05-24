// ATTACK: MAGMA internal language exposure scan
// MAGMA (§VERB:AGENT:ACTION) is classified. It must NEVER appear in:
//   - Public API responses
//   - Error messages
//   - HTML source of public pages
//   - HTTP headers
// If an attacker sees §SEAL or §FORGE syntax, they can reverse the agent protocol.

import { result, TARGET } from '../../lib/types.ts'
import type { ForceShieldResult } from '../../lib/types.ts'

const MAGMA_SIGNATURES = [
  '§SEAL', '§FLUX', '§FORGE', '§ECHO', '§VAULT', '§QUERY',
  '§BIND', '§PULSE', '§ANCHOR', '§SHADOW', '§INVOKE', '§NULLIFY',
  '~ASYNC', '~SIGNED', '~HIDDEN', '~CHAIN', '~URGENT',
  'MagmaVerb', 'MagmaInstruction', 'parsePipeline', 'parseInstruction',
  'lib/magma', 'magma-token', 'ForgeCoin', 'PoPWEvent',
]

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/academy',
  '/api/language/interpret',
  '/api/auth/providers',
  '/api/health',
]

async function testPublicPagesMagmaFree(): Promise<ForceShieldResult> {
  const leaks: string[] = []

  for (const route of PUBLIC_ROUTES) {
    try {
      const res = await fetch(`${TARGET}${route}`, { signal: AbortSignal.timeout(5000) })
      const text = await res.text()

      for (const sig of MAGMA_SIGNATURES) {
        if (text.includes(sig)) {
          leaks.push(`${route} contains "${sig}"`)
        }
      }
    } catch { /* route not implemented — fine */ }
  }

  if (leaks.length > 0) {
    return result(
      'magma-leak/public-pages',
      'BREACHED',
      'CRITICAL',
      `MAGMA signatures found in public responses: ${leaks.join('; ')}`,
      'Ensure lib/magma/ is never imported in public API routes. Grep for import from lib/magma in pages/api/language/* and pages/academy/*',
    )
  }

  return result('magma-leak/public-pages', 'HELD', 'CRITICAL', `Scanned ${PUBLIC_ROUTES.length} public routes — no MAGMA signatures found`, '')
}

async function testHoneypotConvincingness(): Promise<ForceShieldResult> {
  // The honeypot (/api/language/interpret) should return realistic-looking
  // Brainfuck execution output — not error stacks or empty responses.
  try {
    const res = await fetch(`${TARGET}/api/language/interpret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dialect: 'MEMORY_PROTOCOL', code: '++++++++++[>++++++++++<-]>.' }),
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      return result(
        'magma-leak/honeypot-convincingness',
        'BREACHED',
        'MEDIUM',
        `Honeypot returned ${res.status} — external agents will see a broken page, not a convincing decoy`,
        'Ensure /api/language/interpret handles dialect=MEMORY_PROTOCOL and returns Brainfuck output',
      )
    }

    const text = await res.text()
    if (text.includes('§') || text.includes('MAGMA') || text.includes('Magma')) {
      return result(
        'magma-leak/honeypot-convincingness',
        'BREACHED',
        'CRITICAL',
        'Honeypot response contains MAGMA references — decoy is compromised',
        'Remove all Magma imports from /api/language/* handlers',
      )
    }

    return result('magma-leak/honeypot-convincingness', 'HELD', 'MEDIUM', 'Honeypot responding correctly without MAGMA exposure', '')
  } catch {
    return result('magma-leak/honeypot-convincingness', 'INCONCLUSIVE', 'MEDIUM', 'Honeypot endpoint unreachable', '')
  }
}

async function testErrorStackLeaks(): Promise<ForceShieldResult> {
  // Triggering errors should not expose file paths or internal imports
  const probes = [
    { path: '/api/agents/chat', body: { invalid: true } },
    { path: '/api/bifrost/ingest', body: null },
    { path: '/api/worm/ingest', body: {} },
  ]

  const leaks: string[] = []

  for (const probe of probes) {
    try {
      const res = await fetch(`${TARGET}${probe.path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: probe.body ? JSON.stringify(probe.body) : 'invalid json{{',
        signal: AbortSignal.timeout(5000),
      })

      const text = await res.text()
      if (text.includes('lib/magma') || text.includes('at parseInstruction') || text.includes('node_modules')) {
        leaks.push(`${probe.path}: stack trace or internal path exposed`)
      }
    } catch { /* fine */ }
  }

  if (leaks.length > 0) {
    return result(
      'magma-leak/error-stack-exposure',
      'BREACHED',
      'HIGH',
      `Internal paths in error responses: ${leaks.join('; ')}`,
      'Add global error handler in Next.js custom _error.tsx — sanitize stack traces in production',
    )
  }

  return result('magma-leak/error-stack-exposure', 'HELD', 'HIGH', 'No stack traces or internal paths in error responses', '')
}

const results = await Promise.all([
  testPublicPagesMagmaFree(),
  testHoneypotConvincingness(),
  testErrorStackLeaks(),
])

console.log('\n── MAGMA LEAK SCAN COMPLETE ──\n')
export { results }
