import { useGatewayStatus } from '@/hooks/useGatewayStatus'
import { Loader2, Server } from 'lucide-react'

export function GatewayStatus() {
  const { status, gatewayUrl } = useGatewayStatus()

  const statusColor = {
    connected: 'bg-emerald-500',
    disconnected: 'bg-red-500',
    checking: 'bg-amber-500 animate-pulse',
    unconfigured: 'bg-zinc-600',
  }[status]

  const statusText = {
    connected: 'Gateway Connected',
    disconnected: 'Gateway Offline',
    checking: 'Checking',
    unconfigured: 'Not configured',
  }[status]

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        {status === 'checking' ? (
          <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />
        ) : (
          <div className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
        )}
        <span className={`text-[10px] font-mono ${status === 'connected' ? 'text-emerald-400' : status === 'disconnected' ? 'text-red-400' : 'text-zinc-600'}`}>
          {statusText}
        </span>
      </div>
      <div className="text-[10px] font-mono text-zinc-600 pl-3.5">
        <div className="truncate opacity-75" title={gatewayUrl}>
          {gatewayUrl || 'No URL configured'}
        </div>
      </div>
    </div>
  )
}

export function GatewayStatusCompact() {
  const { status, gatewayUrl, isConnected } = useGatewayStatus()

  const statusColor = {
    connected: 'bg-emerald-500',
    disconnected: 'bg-red-500',
    checking: 'bg-amber-500 animate-pulse',
    unconfigured: 'bg-zinc-600',
  }[status]

  const statusText = {
    connected: 'Gateway Connected',
    disconnected: 'Gateway Offline',
    checking: 'Checking...',
    unconfigured: 'Not configured',
  }[status]

  return (
    <div className="flex items-center gap-2" title={gatewayUrl || 'No gateway URL configured'}>
      <Server className="h-3.5 w-3.5 text-zinc-500" />
      <div className={`w-2 h-2 rounded-full ${statusColor}`} />
      <span className={`text-xs font-mono ${isConnected ? 'text-emerald-400' : 'text-zinc-500'}`}>
        {statusText}
      </span>
    </div>
  )
}
