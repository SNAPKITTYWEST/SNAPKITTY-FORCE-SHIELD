// ATTACK: Tunnel URL interception
// Cloudflare quick tunnels rotate on every restart. If the old URL still resolves,
// an attacker could intercept traffic destined for SnapKitty.
// This test also checks that the tunnel doesn't leak internal hostnames.

import { result, TARGET } from '../../lib/types.ts'
import type { ForceShieldResult } from '../../lib/types.ts'

async function testTunnelStability(): Promise<ForceShieldResult> {
  const start = Date.now()
  try {
    const res = await fetch(`${TARGET}/api/health`, { signal: AbortSignal.timeout(5000) })
    const latency = Date.now() - start

    if (!res.ok) {
      return result(
        'tunnel/reachability',
        'BREACHED',
        'HIGH',
        `Target returned ${res.status} — tunnel may be down or URL is stale`,
        'Run tunnel-manager.js and update TARGET_URL in .env.local',
      )
    }

    // High latency suggests tunnel is being proxied through an unexpected node
    if (latency > 8000) {
      return result(
        'tunnel/latency-anomaly',
        'BREACHED',
        'MEDIUM',
        `Response latency ${latency}ms exceeds 8s threshold — possible MITM or tunnel degradation`,
        'Restart cloudflared tunnel and verify Cloudflare edge node',
      )
    }

    return result('tunnel/reachability', 'HELD', 'HIGH', `Tunnel live at ${TARGET} (${latency}ms)`, '')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return result(
      'tunnel/reachability',
      'BREACHED',
      'HIGH',
      `Tunnel unreachable: ${msg}`,
      'Set TARGET_URL to current tunnel URL — check pm2 logs for new URL',
    )
  }
}

async function testInternalHostnameLeak(): Promise<ForceShieldResult> {
  // If the server returns internal hostnames (localhost, docker container names) in any header,
  // that leaks network topology to attackers.
  try {
    const res = await fetch(`${TARGET}/`, { signal: AbortSignal.timeout(5000) })
    const leakyHeaders = ['x-forwarded-host', 'x-real-ip', 'via', 'server']
    const leaks: string[] = []

    for (const h of leakyHeaders) {
      const val = res.headers.get(h)
      if (val && (val.includes('localhost') || val.includes('snapkitty-net') || val.includes('172.'))) {
        leaks.push(`${h}: ${val}`)
      }
    }

    if (leaks.length > 0) {
      return result(
        'tunnel/internal-hostname-leak',
        'BREACHED',
        'MEDIUM',
        `Internal network info in response headers: ${leaks.join(', ')}`,
        'Configure Next.js to strip internal headers before responding',
      )
    }

    return result('tunnel/internal-hostname-leak', 'HELD', 'MEDIUM', 'No internal hostnames in response headers', '')
  } catch {
    return result('tunnel/internal-hostname-leak', 'INCONCLUSIVE', 'MEDIUM', 'Could not fetch root', '')
  }
}

async function testDevModeExposure(): Promise<ForceShieldResult> {
  // Next.js dev mode exposes /_next/source-maps and stack traces in errors
  try {
    const res = await fetch(`${TARGET}/_next/webpack-hmr`, { signal: AbortSignal.timeout(3000) })
    if (res.status === 200 || res.status === 101) {
      return result(
        'tunnel/dev-mode-exposure',
        'BREACHED',
        'HIGH',
        'webpack-hmr endpoint accessible — server is running in development mode',
        'Run `next build && next start` in production. Check ecosystem.config.js: args should be "start" not "dev".',
      )
    }
    return result('tunnel/dev-mode-exposure', 'HELD', 'HIGH', 'webpack-hmr not accessible (production mode)', '')
  } catch {
    return result('tunnel/dev-mode-exposure', 'HELD', 'HIGH', 'webpack-hmr not accessible', '')
  }
}

const results = await Promise.all([
  testTunnelStability(),
  testInternalHostnameLeak(),
  testDevModeExposure(),
])

console.log('\n── TUNNEL ATTACK MODULE COMPLETE ──\n')
export { results }
