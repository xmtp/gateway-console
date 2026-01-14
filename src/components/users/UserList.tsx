import { useEffect } from 'react'
import { useUsers } from '@/hooks/useUsers'
import { useXMTP } from '@/contexts'
import { UserCard } from './UserCard'
import { AddUserDialog } from './AddUserDialog'
import { XMTPStatus } from '@/components/xmtp'

export function UserList() {
  const { users, activeUser, activeUserId, createUser, deleteUser, selectUser } = useUsers()
  const { initializeClient, disconnect, activeUserId: xmtpActiveUserId } = useXMTP()

  // Initialize XMTP client when active user changes
  useEffect(() => {
    if (activeUser && activeUser.id !== xmtpActiveUserId) {
      initializeClient(activeUser)
    } else if (!activeUser && xmtpActiveUserId) {
      disconnect()
    }
  }, [activeUser, xmtpActiveUserId, initializeClient, disconnect])

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 p-3 space-y-1.5 overflow-auto">
        {users.length === 0 ? (
          <p className="text-xs text-zinc-500 font-mono py-2">
            No users yet
          </p>
        ) : (
          users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              isActive={user.id === activeUserId}
              onSelect={() => selectUser(user.id)}
              onDelete={() => deleteUser(user.id)}
            />
          ))
        )}
      </div>

      <div className="px-3 pb-3">
        <AddUserDialog onAddUser={createUser} />
      </div>

      <div className="px-3 py-2 border-t border-zinc-800">
        <XMTPStatus />
      </div>
    </div>
  )
}
