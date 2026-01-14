import { WalletButton } from '@/components/wallet'
import { UserList } from '@/components/users'
import { FaucetDialog } from '@/components/faucet'
import { DepositDialog } from '@/components/deposit'
import { BalanceDisplay } from '@/components/balance'

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
        <main className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
          <p className="text-muted-foreground">
            Learn how XMTP messaging fees work
          </p>

          {/* Balance Display */}
          <BalanceDisplay />

          {/* Action Buttons */}
          <div className="flex gap-2">
            <FaucetDialog />
            <DepositDialog />
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
