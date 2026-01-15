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
import { useXMTP } from '@/contexts/XMTPContext'
import { useMessaging } from '@/contexts/MessagingContext'
import { useENSName } from '@/hooks/useENSName'
import { APP_NAME } from '@/lib/constants'
import { ArrowDown } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout'
import { cn } from '@/lib/utils'

// Developer sidebar content - extracted for reuse in Sheet
function DeveloperSidebar() {
  return (
    <>
      {/* Step 1: Fund App */}
      <div className="p-3 border-b border-zinc-800/50 space-y-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-5 h-5 rounded bg-zinc-700/50 text-zinc-300 text-[10px] font-mono font-bold ring-1 ring-zinc-600/50">1</span>
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Fund App
          </span>
        </div>

        {/* Connected Wallet Card */}
        <div className="bg-gradient-to-b from-zinc-900 to-zinc-900/50 rounded-lg p-3 space-y-2 ring-1 ring-zinc-800/50">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
            Connected Wallet
          </div>
          <WalletButton />
          <UserBalance />
          <FaucetDialog />
        </div>

        {/* Arrow indicator */}
        <div className="flex justify-center py-1">
          <ArrowDown className="h-3.5 w-3.5 text-zinc-600" />
        </div>

        {/* Payer Wallet Card */}
        <div className="bg-gradient-to-b from-zinc-900 to-zinc-900/50 rounded-lg p-3 space-y-2 ring-1 ring-zinc-800/50">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
            Payer Wallet
          </div>
          <BalanceDisplay />
          <DepositDialog />
        </div>
      </div>

      {/* Step 2: Test As User */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-3 pt-3">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-5 h-5 rounded bg-zinc-700/50 text-zinc-300 text-[10px] font-mono font-bold ring-1 ring-zinc-600/50">2</span>
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
              Test As User
            </span>
          </div>
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
  const { client, isConnecting } = useXMTP()
  const { activePanel, isMobile } = useResponsiveLayout()
  const { peerAddress, groupName, conversationType } = useMessaging()

  // Resolve ENS name for DM conversations
  const { ensName } = useENSName(peerAddress)

  // Compute mobile header title based on conversation state
  const getMobileTitle = (): string | undefined => {
    if (activePanel !== 'chat') return undefined // use default title
    if (conversationType === 'group' && groupName) return groupName
    if (conversationType === 'dm') {
      if (ensName) return ensName
      if (peerAddress) return truncateAddress(peerAddress)
    }
    return 'Chat'
  }

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

  return (
    <div className={cn("min-h-screen flex flex-col bg-black", isMobile && "pt-14")}>
      {/* Mobile Header - fixed position, conditionally rendered via isMobile */}
      <MobileHeader menuContent={<DeveloperSidebar />} title={getMobileTitle()} />

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
        {/* Developer Context - Left sidebar (hidden on mobile, shown on desktop) */}
        <div className="hidden md:flex md:w-72 shrink-0 bg-zinc-950 flex-col">
          <DeveloperSidebar />
        </div>

        {/* User Context - Main app area with rounded top-left corner on desktop */}
        <div className="flex-1 flex flex-col bg-background overflow-hidden md:rounded-tl-xl">
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
            <main className="flex-1 flex flex-col items-center justify-center p-8">
              <p className="text-muted-foreground">
                Select a user to start messaging
              </p>
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
