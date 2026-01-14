import { WalletButton } from '@/components/wallet'
import { UserList } from '@/components/users'
import { FaucetDialog } from '@/components/faucet'

function App() {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <UserList />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Message With Tokens</h1>
          <WalletButton />
        </header>

        {/* Content */}
        <main className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
          <p className="text-muted-foreground">
            Learn how XMTP messaging fees work
          </p>
          <div className="flex gap-2">
            <FaucetDialog />
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            0 messages available
          </p>
        </main>
      </div>
    </div>
  )
}

export default App
