import { useAccount, useEnsName } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { WalletButton, UserBalance } from '@/components/wallet'
import { UserList } from '@/components/users'
import { FaucetDialog } from '@/components/faucet'
import { DepositDialog } from '@/components/deposit'
import { BalanceDisplay } from '@/components/balance'
import {
  ConversationList,
  MessageThread,
  MessageInput,
  NewConversationDialog,
  NewGroupDialog,
  RefreshConversationsButton,
} from '@/components/messaging'
import { MobileHeader } from '@/components/layout'
import { useXMTP, WALLET_USER_ID } from '@/contexts/XMTPContext'
import { XMTPStatus } from '@/components/xmtp'
import { useMessaging } from '@/contexts/MessagingContext'
import { useUsers } from '@/hooks/useUsers'
import { useENSName } from '@/hooks/useENSName'
import { APP_NAME } from '@/lib/constants'
import { Skeleton } from '@/components/ui/skeleton'
import { Send } from 'lucide-react'
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout'
import { cn } from '@/lib/utils'

// Developer sidebar content - extracted for reuse in Sheet
function DeveloperSidebar() {
  return (
    <>
      {/* Explainer */}
      <div className="p-3 border-b border-zinc-800/50">
        <p className="text-xs text-zinc-400 leading-relaxed">
          Connect your wallet to get testnet tokens and fund a gateway. Then send test messages to see fees in action.
        </p>
      </div>

      {/* Step 1: Get Tokens */}
      <div className="p-3 border-b border-zinc-800/50 space-y-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-5 h-5 rounded bg-zinc-700/50 text-zinc-300 text-[10px] font-mono font-bold ring-1 ring-zinc-600/50">1</span>
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Get Tokens
          </span>
        </div>

        {/* Your Wallet Card */}
        <div className="bg-gradient-to-b from-zinc-900 to-zinc-900/50 rounded-lg p-3 space-y-2 ring-1 ring-zinc-800/50">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
            Your Wallet
          </div>
          <WalletButton />
          <UserBalance />
          <FaucetDialog />
        </div>
      </div>

      {/* Step 2: Deposit to Payer */}
      <div className="p-3 border-b border-zinc-800/50 space-y-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-5 h-5 rounded bg-zinc-700/50 text-zinc-300 text-[10px] font-mono font-bold ring-1 ring-zinc-600/50">2</span>
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Deposit Tokens
          </span>
        </div>

        {/* Payer Wallet Card */}
        <div className="bg-gradient-to-b from-zinc-900 to-zinc-900/50 rounded-lg p-3 space-y-2 ring-1 ring-zinc-800/50">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
            {APP_NAME || 'Payer Wallet'}
          </div>
          <BalanceDisplay />
          <DepositDialog />
        </div>
      </div>

      {/* Step 3: Test Messaging Fees */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-3 pt-3 pb-2 space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-5 h-5 rounded bg-zinc-700/50 text-zinc-300 text-[10px] font-mono font-bold ring-1 ring-zinc-600/50">3</span>
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
              Test Messaging Fees
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 pl-7">Select a user</p>
        </div>
        <UserList />
      </div>
    </>
  )
}

// Helper to truncate address for display
function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Main app content - uses responsive layout context
function AppContent() {
  const { client, isConnecting, error: xmtpError, activeUserId: xmtpActiveUserId } = useXMTP()
  const { activePanel, isMobile } = useResponsiveLayout()
  const { peerAddress, groupName, conversationType } = useMessaging()
  const { activeUser } = useUsers()
  const { address: walletAddress } = useAccount()

  // Resolve ENS name for DM conversations
  const { ensName: peerEnsName } = useENSName(peerAddress)

  // Resolve ENS name for connected wallet (same as ConnectedWalletCard)
  const { data: walletEnsName } = useEnsName({
    address: walletAddress,
    chainId: mainnet.id,
  })

  // Get the display name for the active user (who we're "viewing as")
  const getActiveUserDisplayName = (): string => {
    if (xmtpActiveUserId === WALLET_USER_ID) {
      if (walletEnsName) return walletEnsName
      if (walletAddress) return truncateAddress(walletAddress)
      return 'Connected Wallet'
    }
    if (activeUser) {
      return activeUser.name
    }
    return 'Messages'
  }

  // Compute mobile header title based on panel and conversation state
  const getMobileTitle = (): string => {
    // On conversations panel, show who we're viewing as
    if (activePanel === 'conversations') {
      return getActiveUserDisplayName()
    }
    // On chat panel, show the conversation name
    if (activePanel === 'chat') {
      if (conversationType === 'group' && groupName) return groupName
      if (conversationType === 'dm') {
        if (peerEnsName) return peerEnsName
        if (peerAddress) return truncateAddress(peerAddress)
      }
    }
    return 'Messages'
  }

  // Mobile sidebar panel - shows DeveloperSidebar as main screen on mobile
  // On mobile: full viewport width when activePanel is 'sidebar'
  // On desktop: never shown as standalone panel (desktop uses fixed sidebar)
  const sidebarPanelClasses = cn(
    "flex flex-col bg-zinc-950 w-full",
    // Mobile: toggle visibility based on activePanel
    activePanel === 'sidebar' ? 'flex' : 'hidden',
    // Desktop: never show as standalone panel
    "md:hidden"
  )

  // Helper to determine if conversation panel should be visible
  // On mobile: only when activePanel is 'conversations', takes full width
  // On desktop: always visible (md: breakpoint handles this via CSS)
  const conversationPanelClasses = cn(
    "flex flex-col border-r",
    // Mobile: toggle visibility based on activePanel, full width when visible
    activePanel === 'conversations' ? 'flex flex-1' : 'hidden',
    // Desktop: always show with fixed width, don't grow
    "md:flex md:flex-none md:w-72 md:shrink-0"
  )

  // Helper to determine if chat panel should be visible
  // On mobile: only when activePanel is 'chat'
  // On desktop: always visible
  const chatPanelClasses = cn(
    "flex flex-col",
    // Mobile: toggle visibility based on activePanel
    activePanel === 'chat' ? 'flex flex-1' : 'hidden',
    // Desktop: always show and take remaining space
    "md:flex md:flex-1"
  )

  // Only show header padding when not on sidebar (sidebar is full-screen)
  const showMobileHeaderPadding = isMobile && activePanel !== 'sidebar'

  return (
    <div
      className="min-h-screen flex flex-col bg-black"
      style={showMobileHeaderPadding ? { paddingTop: 'var(--mobile-header-height)' } : undefined}
    >
      {/* Mobile Header - only shown when NOT on sidebar panel */}
      {activePanel !== 'sidebar' && <MobileHeader title={getMobileTitle()} />}

      {/* Gateway Console Header - hidden on mobile, shown on desktop */}
      <div className="relative px-4 py-2.5 bg-zinc-950 border-b border-zinc-800/50 hidden md:block">
        <div className="flex items-center gap-2.5">
          <img src="/x-mark-red.svg" alt="XMTP" className="h-5 w-5" />
          <span className="text-xs font-mono font-medium uppercase tracking-widest text-zinc-100">
            Gateway Console
          </span>
          {APP_NAME && (
            <>
              <span className="text-zinc-600 text-xs">/</span>
              <span className="text-xs text-zinc-400">{APP_NAME}</span>
            </>
          )}
        </div>
        {/* Subtle accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-zinc-500/30 via-zinc-600/10 to-transparent" />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex min-h-0">
        {/* Mobile Sidebar Panel - full screen on mobile when activePanel is 'sidebar' */}
        <div className={sidebarPanelClasses}>
          {/* Mobile sidebar header */}
          <div className="relative px-4 py-3 border-b border-zinc-800/50" style={{ paddingTop: 'calc(var(--safe-area-inset-top) + 0.75rem)' }}>
            <div className="flex items-center gap-2.5">
              <img src="/x-mark-red.svg" alt="XMTP" className="h-5 w-5" />
              <span className="text-xs font-mono font-medium uppercase tracking-widest text-zinc-100">
                Gateway Console
              </span>
              {APP_NAME && (
                <>
                  <span className="text-zinc-600 text-xs">/</span>
                  <span className="text-xs text-zinc-400">{APP_NAME}</span>
                </>
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-zinc-500/30 via-zinc-600/10 to-transparent" />
          </div>
          <DeveloperSidebar />
        </div>

        {/* Developer Context - Left sidebar (hidden on mobile, shown on desktop) */}
        <div className="hidden md:flex md:w-72 shrink-0 bg-zinc-950 flex-col">
          <DeveloperSidebar />
        </div>

        {/* User Context - Main app area with rounded top-left corner on desktop */}
        {/* Hidden on mobile when sidebar is active */}
        <div className={cn(
          "flex-1 flex flex-col bg-background overflow-hidden md:rounded-tl-xl",
          activePanel === 'sidebar' && "hidden md:flex"
        )}>
          {client ? (
            <div className="flex-1 flex overflow-hidden">
              {/* Conversation Sidebar - responsive visibility */}
              <div className={conversationPanelClasses}>
                <div className="p-3 border-b flex items-center justify-between">
                  <h1 className="font-semibold">Conversations</h1>
                  <div className="flex items-center gap-1">
                    <RefreshConversationsButton />
                    <NewConversationDialog />
                    <NewGroupDialog />
                  </div>
                </div>
                <ConversationList />
              </div>

              {/* Message Area - responsive visibility */}
              <div className={chatPanelClasses}>
                <MessageThread />
                <MessageInput />
              </div>
            </div>
          ) : isConnecting ? (
            <div className="flex-1 flex overflow-hidden">
              {/* Conversation Sidebar Skeleton - responsive */}
              <div className={conversationPanelClasses}>
                <div className="p-3 border-b flex items-center justify-between">
                  <Skeleton className="h-5 w-28" />
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </div>
                <div className="flex-1 p-2 space-y-2">
                  <Skeleton className="h-14 w-full rounded-lg" />
                  <Skeleton className="h-14 w-full rounded-lg" />
                  <Skeleton className="h-14 w-full rounded-lg" />
                </div>
              </div>

              {/* Message Area Skeleton - responsive */}
              <div className={chatPanelClasses}>
                <div className="p-3 border-b">
                  <Skeleton className="h-6 w-32" />
                </div>
                <div className="flex-1 p-4 space-y-3">
                  <Skeleton className="h-10 w-48 rounded-2xl" />
                  <Skeleton className="h-10 w-56 rounded-2xl ml-auto" />
                  <Skeleton className="h-10 w-40 rounded-2xl" />
                </div>
                <div className="p-3 border-t">
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              </div>
            </div>
          ) : (
            <main className="flex-1 flex items-center justify-center p-8">
              {xmtpError ? (
                <XMTPStatus />
              ) : (
                <div className="flex items-start gap-8 max-w-lg">
                  {/* Left: Visual element */}
                  <div className="shrink-0">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center ring-1 ring-zinc-700/50">
                      <Send className="h-8 w-8 text-zinc-500" />
                    </div>
                  </div>

                  {/* Right: Text content */}
                  <div className="flex flex-col gap-4 pt-2">
                    <div className="space-y-1.5">
                      <h3 className="text-base font-medium text-foreground">Start a test conversation</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Select a user from the list to send messages and see how XMTP fees work on Base Sepolia testnet.
                      </p>
                    </div>

                    {/* What you'll see */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">What you'll see</span>
                      <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                          Per-message cost calculations
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                          Storage + base fee breakdown
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                          Real-time balance updates
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </main>
          )}
        </div>
      </div>
    </div>
  )
}

// App component - ResponsiveLayoutProvider is in main.tsx
function App() {
  return <AppContent />
}

export default App
