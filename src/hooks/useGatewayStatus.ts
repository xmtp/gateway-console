import { useState, useEffect, useCallback, useRef } from 'react'
import { GATEWAY_URL, GATEWAY_HEALTH_URL } from '@/lib/constants'

export type GatewayStatus = 'connected' | 'disconnected' | 'checking' | 'unconfigured'

/**
 * Hook to check if the XMTP gateway service is running
 * Pings the gateway health endpoint periodically to determine connectivity
 */
export function useGatewayStatus() {
  const [status, setStatus] = useState<GatewayStatus>(
    GATEWAY_URL ? 'checking' : 'unconfigured'
  )
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const consecutiveFailures = useRef(0)

  const checkGateway = useCallback(async (isBackgroundCheck = false) => {
    if (!GATEWAY_URL) {
      setStatus('unconfigured')
      return
    }

    // Show checking state unless this is a background re-check while already connected
    setStatus((current) =>
      isBackgroundCheck && current === 'connected' ? current : 'checking'
    )

    try {
      const response = await fetch(GATEWAY_HEALTH_URL, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      })

      if (response.ok) {
        consecutiveFailures.current = 0
        setStatus('connected')
      } else {
        consecutiveFailures.current++
        if (!isBackgroundCheck || consecutiveFailures.current >= 2) {
          setStatus('disconnected')
        }
      }
      setLastChecked(new Date())
    } catch {
      consecutiveFailures.current++
      // On background checks, require 2+ consecutive failures to avoid flaky UI
      // On initial/manual checks, show disconnected immediately
      if (!isBackgroundCheck || consecutiveFailures.current >= 2) {
        setStatus('disconnected')
      }
      setLastChecked(new Date())
    }
  }, [])

  // Check on mount and periodically
  useEffect(() => {
    checkGateway()

    // Re-check every 30 seconds
    const interval = setInterval(() => checkGateway(true), 30_000)
    return () => clearInterval(interval)
  }, [checkGateway])

  return {
    status,
    isConnected: status === 'connected',
    isConfigured: status !== 'unconfigured',
    lastChecked,
    refresh: checkGateway,
    gatewayUrl: GATEWAY_URL,
  }
}
