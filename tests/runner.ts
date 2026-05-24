// Full red-team suite runner
import { generateReport } from '../lib/report.ts'
import type { ForceShieldResult } from '../lib/types.ts'
import { TARGET } from '../lib/types.ts'

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
    allResults.push(...results)
  } catch (e) {
    console.error(`  ERROR in ${name}:`, e)
  }
}

await runModule('TUNNEL', './tunnel/url-intercept.ts')
await runModule('WORM', './worm/chain-integrity.ts')
await runModule('DISCORD', './discord/sig-bypass.ts')
await runModule('RATE LIMIT', './rate-limit/exhaustion.ts')
await runModule('MAGMA LEAK', './magma-leak/surface-scan.ts')
await runModule('NOVA / CONSENSUS', './nova/consensus-wire.ts')

generateReport(allResults, TARGET)
