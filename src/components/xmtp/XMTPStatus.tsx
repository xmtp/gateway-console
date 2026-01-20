import { type ReactNode } from 'react'
import { useXMTP } from '@/contexts'
import { Loader2, ExternalLink, AlertTriangle, Smartphone } from 'lucide-react'

const INBOX_TOOLS_URL = 'https://xmtp.chat/inbox-tools'
const BASE_APP_URL = 'https://base.org/names'

// Color themes for error cards
const errorColors = {
  amber: {
    border: 'border-amber-500/30',
    shadow: 'shadow-amber-900/20',
    stripe: 'from-amber-400 via-amber-500 to-amber-400',
    iconBg: 'bg-amber-500/15 ring-amber-500/30',
    title: 'text-amber-200',
    button: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 hover:border-amber-400/50 text-amber-300 hover:text-amber-200',
  },
  blue: {
    border: 'border-blue-500/30',
    shadow: 'shadow-blue-900/20',
    stripe: 'from-blue-400 via-blue-500 to-blue-400',
    iconBg: 'bg-blue-500/15 ring-blue-500/30',
    title: 'text-blue-200',
    button: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 hover:border-blue-400/50 text-blue-300 hover:text-blue-200',
  },
} as const

interface ErrorCardProps {
  icon: ReactNode
  title: string
  description: ReactNode
  buttonText: string
  buttonUrl: string
  color: keyof typeof errorColors
}

function ErrorCard({ icon, title, description, buttonText, buttonUrl, color }: ErrorCardProps) {
  const c = errorColors[color]
  return (
    <div className={`relative overflow-hidden rounded-lg bg-zinc-900 border ${c.border} shadow-lg ${c.shadow}`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${c.stripe}`} />
      <div className="pl-4 pr-4 py-3 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className={`flex items-center justify-center w-6 h-6 rounded-md ${c.iconBg} ring-1`}>
            {icon}
          </div>
          <span className={`text-sm font-semibold ${c.title} tracking-tight`}>{title}</span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed pl-0.5">{description}</p>
        <a
          href={buttonUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`group flex items-center justify-center gap-2 w-full py-2 px-3 rounded-md border text-xs font-medium tracking-wide transition-all duration-150 ${c.button}`}
          onClick={(e) => e.stopPropagation()}
        >
          <span>{buttonText}</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}

export function InstallationLimitError() {
  return (
    <ErrorCard
      icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
      title="Installation limit reached"
      description={<>You have <span className="text-zinc-200 font-medium">10/10</span> XMTP installations registered. Revoke unused installations to continue.</>}
      buttonText="Open Inbox Tools"
      buttonUrl={INBOX_TOOLS_URL}
      color="amber"
    />
  )
}

export function CoinbaseSmartWalletError() {
  return (
    <ErrorCard
      icon={<Smartphone className="w-3.5 h-3.5 text-blue-400" />}
      title="Use the Base app"
      description="Coinbase Smart Wallet signatures are only compatible with XMTP in the Base app. Use a regular wallet (MetaMask, etc.) or message from Base."
      buttonText="Open Base App"
      buttonUrl={BASE_APP_URL}
      color="blue"
    />
  )
}

export function XMTPStatus() {
  const { client, isConnecting, error, inboxId } = useXMTP()

  const isInstallationLimitError = error?.message?.includes('10/10 installations')
  const isCoinbaseSmartWalletError = error?.message?.includes('COINBASE_SMART_WALLET_UNSUPPORTED')

  if (isConnecting) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />
        <span className="text-xs text-zinc-500 font-mono">Connecting...</span>
      </div>
    )
  }

  if (error) {
    if (isInstallationLimitError) {
      return <InstallationLimitError />
    }
    if (isCoinbaseSmartWalletError) {
      return <CoinbaseSmartWalletError />
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
