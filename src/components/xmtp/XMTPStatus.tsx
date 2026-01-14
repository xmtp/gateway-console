import { useXMTP } from '@/contexts'
import { Loader2 } from 'lucide-react'

export function XMTPStatus() {
  const { client, isConnecting, error, inboxId } = useXMTP()

  if (isConnecting) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />
        <span className="text-xs text-zinc-500 font-mono">Connecting...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-xs text-red-400 font-mono" title={error.message}>
          Disconnected
        </span>
      </div>
    )
  }

  if (client && inboxId) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs text-emerald-400 font-mono">XMTP Connected</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-zinc-600" />
      <span className="text-xs text-zinc-500 font-mono">No user selected</span>
    </div>
  )
}
