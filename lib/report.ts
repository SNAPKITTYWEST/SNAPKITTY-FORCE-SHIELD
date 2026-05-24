import { createHash } from 'crypto'
import { writeFileSync } from 'fs'
import type { ForceShieldResult } from './types.ts'

export function generateReport(results: ForceShieldResult[], target: string): void {
  const breaches      = results.filter(r => r.status === 'BREACHED')
  const held          = results.filter(r => r.status === 'HELD')
  const criticalCount = breaches.filter(r => r.severity === 'CRITICAL').length
  const ts            = new Date().toISOString()
  const reportSeal    = createHash('sha256')
    .update(results.map(r => r.seal).join(':'))
    .digest('hex')

  console.log('\n═══════════════════════════════════════════')
  console.log('  SNAPKITTY FORCE SHIELD — SECURITY REPORT')
  console.log('═══════════════════════════════════════════')
  console.log(`  Target:    ${target}`)
  console.log(`  Time:      ${ts}`)
  console.log(`  Vectors:   ${results.length} tested`)
  console.log(`  HELD:      ${held.length}`)
  console.log(`  BREACHED:  ${breaches.length} (${criticalCount} CRITICAL)`)
  console.log(`  Seal:      ${reportSeal.slice(0, 16)}...`)
  console.log('═══════════════════════════════════════════\n')

  if (breaches.length > 0) {
    console.log('BREACH REPORT:')
    for (const b of breaches) {
      console.log(`\n  [${b.severity}] ${b.vector}`)
      console.log(`  Evidence:       ${b.evidence}`)
      console.log(`  Recommendation: ${b.recommendation}`)
    }
    console.log()
  }

  const reportPath = `reports/report-${Date.now()}.json`
  writeFileSync(reportPath, JSON.stringify({ target, ts, reportSeal, results }, null, 2))
  console.log(`Full report saved: ${reportPath}`)

  if (criticalCount > 0) {
    console.error(`\nFORCE SHIELD: ${criticalCount} CRITICAL breach(es) detected. Immediate action required.`)
    process.exit(1)
  }
}
