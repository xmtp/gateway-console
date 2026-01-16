import { useXMTP } from '@/contexts'
import { Loader2, ExternalLink, AlertTriangle } from 'lucide-react'

const INBOX_TOOLS_URL = 'https://xmtp.chat/inbox-tools'

// Standalone component to preview the installation limit error UI
export function InstallationLimitError() {
  return (
    <div className="relative overflow-hidden rounded-lg bg-zinc-900 border border-amber-500/30 shadow-lg shadow-amber-900/20">
      {/* Animated warning stripe accent */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-400" />

      <div className="pl-4 pr-4 py-3 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-amber-500/15 ring-1 ring-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <span className="text-sm font-semibold text-amber-200 tracking-tight">
            Installation limit reached
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-zinc-400 leading-relaxed pl-0.5">
          You have <span className="text-zinc-200 font-medium">10/10</span> XMTP installations registered.
          Revoke unused installations to continue.
        </p>

        {/* CTA Button */}
        <a
          href={INBOX_TOOLS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-center gap-2 w-full py-2 px-3 rounded-md
                     bg-amber-500/10 hover:bg-amber-500/20
                     border border-amber-500/30 hover:border-amber-400/50
                     text-amber-300 hover:text-amber-200
                     text-xs font-medium tracking-wide
                     transition-all duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <span>Open Inbox Tools</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}

export function XMTPStatus() {
  const { client, isConnecting, error, inboxId } = useXMTP()

  const isInstallationLimitError = error?.message?.includes('10/10 installations')

  if (isConnecting) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />
        <span className="text-xs text-zinc-500 font-mono">Connecting...</span>
      </div>
    )
  }

  if (error) {
    // Show a more helpful error for installation limit
    if (isInstallationLimitError) {
      return <InstallationLimitError />
    }

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
