import { createHash } from 'crypto'

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type Status   = 'HELD' | 'BREACHED' | 'INCONCLUSIVE' | 'ERROR'

export interface ForceShieldResult {
  vector:         string
  status:         Status
  severity:       Severity
  evidence:       string
  recommendation: string
  timestamp:      string
  seal:           string
}

export function result(
  vector:         string,
  status:         Status,
  severity:       Severity,
  evidence:       string,
  recommendation: string,
): ForceShieldResult {
  const timestamp = new Date().toISOString()
  const seal = createHash('sha256')
    .update(`${vector}:${status}:${timestamp}`)
    .digest('hex')

  const r: ForceShieldResult = { vector, status, severity, evidence, recommendation, timestamp, seal }

  const icon = status === 'HELD' ? '✓' : status === 'BREACHED' ? '✗ BREACH' : '?'
  const sev  = severity === 'CRITICAL' ? '[CRITICAL]' : severity === 'HIGH' ? '[HIGH]' : `[${severity}]`
  console.log(`${icon} ${sev} ${vector}`)
  if (status === 'BREACHED') {
    console.log(`  EVIDENCE: ${evidence}`)
    console.log(`  FIX:      ${recommendation}`)
  }

  return r
}

export const TARGET = process.env.TARGET_URL ?? 'http://localhost:3000'
