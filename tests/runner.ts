// Full red-team suite runner
import { generateReport } from '../lib/report.ts'
import type { ForceShieldResult } from '../lib/types.ts'
import { TARGET, result } from '../lib/types.ts'

console.log('┌─────────────────────────────────────────┐')
console.log('│  SNAPKITTY FORCE SHIELD — RED TEAM RUN  │')
console.log('│  Adversarial Security Engineering Layer │')
console.log('└─────────────────────────────────────────┘')
console.log(`\nTarget: ${TARGET}\n`)

const allResults: ForceShieldResult[] = []

async function runModule(name: string, path: string) {
  console.log(`\n▶ ${name}`)
  try {
    const mod = await import(path)
    const results: ForceShieldResult[] = mod.results ?? []
    if (results.length === 0) {
      // Module loaded but produced no results — treat as execution error
      const r = result(
        `${name}/no-results`,
        'ERROR',
        'HIGH',
        `Module ${name} (${path}) executed but returned 0 results. Check exports.`,
        'Ensure the module exports a non-empty `results` array before the runner imports it.',
      )
      allResults.push(r)
    } else {
      allResults.push(...results)
    }
  } catch (e) {
    // Module failed to load or threw — record as ERROR, do not swallow
    const r = result(
      `${name}/execution-error`,
      'ERROR',
      'CRITICAL',
      `Module ${name} (${path}) threw: ${String(e)}`,
      'Fix the module so it can execute. An errored module leaves its attack vectors untested.',
    )
    allResults.push(r)
  }
}

await runModule('TUNNEL', './tunnel/url-intercept.ts')
await runModule('WORM', './worm/chain-integrity.ts')
await runModule('DISCORD', './discord/sig-bypass.ts')
await runModule('RATE LIMIT', './rate-limit/exhaustion.ts')
await runModule('MAGMA LEAK', './magma-leak/surface-scan.ts')
await runModule('NOVA / CONSENSUS', './nova/consensus-wire.ts')

generateReport(allResults, TARGET)

// CI exit code — fail on any BREACHED critical/high or any ERROR
const criticalBreaches = allResults.filter(
  r => r.status === 'BREACHED' && (r.severity === 'CRITICAL' || r.severity === 'HIGH')
)
const errors = allResults.filter(r => r.status === 'ERROR')
const inconclusive = allResults.filter(r => r.status === 'INCONCLUSIVE')

const inconclusiveRate = inconclusive.length / allResults.length

console.log('\n── SUMMARY ───────────────────────────────')
console.log(`  HELD:         ${allResults.filter(r => r.status === 'HELD').length}`)
console.log(`  BREACHED:     ${allResults.filter(r => r.status === 'BREACHED').length}`)
console.log(`  INCONCLUSIVE: ${inconclusive.length}`)
console.log(`  ERROR:        ${errors.length}`)
console.log('──────────────────────────────────────────')

if (criticalBreaches.length > 0) {
  console.error(`\n✗ FAIL — ${criticalBreaches.length} critical/high breach(es)`)
  process.exit(1)
}
if (errors.length > 0) {
  console.error(`\n✗ FAIL — ${errors.length} module error(s) — attack vectors untested`)
  process.exit(1)
}
if (inconclusiveRate > 0.3) {
  console.error(`\n✗ FAIL — ${Math.round(inconclusiveRate * 100)}% inconclusive (threshold: 30%)`)
  process.exit(1)
}

console.log('\n✓ PASS — no critical breaches, no execution errors')
