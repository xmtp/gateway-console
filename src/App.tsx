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
} from '@/components/messaging'
import { useXMTP } from '@/contexts/XMTPContext'
import { ArrowDown } from 'lucide-react'

function App() {
  const { client } = useXMTP()

  return (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Dev Console Header - spans full width */}
      <div className="px-4 py-2.5 bg-zinc-950 border-b border-zinc-800 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-widest">
          Dev Console
        </span>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex min-h-0">
        {/* Developer Context - Left sidebar */}
        <div className="w-72 bg-zinc-950 flex flex-col border-r border-zinc-800">
          {/* Step 1: Fund the App */}
          <div className="p-3 border-b border-zinc-800 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded bg-zinc-800 text-emerald-400 text-xs font-mono font-bold">1</span>
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                Fund the App
              </span>
            </div>

            {/* Connected Wallet Card */}
            <div className="bg-zinc-900 rounded-lg p-3 space-y-2">
              <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
                Connected Wallet
              </div>
              <WalletButton />
              <UserBalance />
              <FaucetDialog />
            </div>

            {/* Arrow indicator */}
            <div className="flex justify-center py-1">
              <div className="flex flex-col items-center gap-0.5 text-zinc-600">
                <ArrowDown className="h-4 w-4" />
                <span className="text-[9px] font-mono uppercase tracking-wider">deposit</span>
              </div>
            </div>

            {/* App Wallet Card */}
            <div className="bg-zinc-900 rounded-lg p-3 space-y-2">
              <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
                App Wallet
              </div>
              <BalanceDisplay />
              <DepositDialog />
            </div>
          </div>

          {/* Step 2: Test Users */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-3 pt-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-zinc-800 text-emerald-400 text-xs font-mono font-bold">2</span>
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                  Test Users
                </span>
              </div>
            </div>
            <UserList />
          </div>
        </div>

        {/* User Context - Main app area with rounded top-left corner */}
        <div className="flex-1 flex flex-col bg-background rounded-tl-xl overflow-hidden">
          {client ? (
            <div className="flex-1 flex overflow-hidden">
              {/* Conversation Sidebar */}
              <div className="w-72 border-r flex flex-col">
                <div className="p-3 border-b flex items-center justify-between">
                  <h1 className="font-semibold">Messages</h1>
                  <div className="flex items-center gap-1">
                    <NewConversationDialog />
                    <NewGroupDialog />
                  </div>
                </div>
                <ConversationList />
              </div>

              {/* Message Area */}
              <div className="flex-1 flex flex-col">
                <MessageThread />
                <MessageInput />
              </div>
            </div>
          ) : (
            <main className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
              <div className="text-center space-y-2">
                <h1 className="text-xl font-semibold">Message With Tokens</h1>
                <p className="text-muted-foreground">
                  Select a user in the Developer Panel to start messaging
                </p>
              </div>
            </main>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
