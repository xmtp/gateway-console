import { useLocalStorage } from '@mantine/hooks'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { STORAGE_KEYS } from '@/lib/constants'
import type { EphemeralUser } from '@/types/user'

export function useUsers() {
  const [users, setUsers] = useLocalStorage<EphemeralUser[]>({
    key: STORAGE_KEYS.users,
    defaultValue: [],
  })

  const [activeUserId, setActiveUserId] = useLocalStorage<string | null>({
    key: STORAGE_KEYS.activeUserId,
    defaultValue: null,
  })

  const activeUser = users.find(u => u.id === activeUserId) ?? null

  const createUser = (name: string): EphemeralUser => {
    const privateKey = generatePrivateKey()
    const account = privateKeyToAccount(privateKey)
    const newUser: EphemeralUser = {
      id: crypto.randomUUID(),
      name,
      privateKey,
      address: account.address,
      createdAt: Date.now(),
    }
    setUsers(prev => [...prev, newUser])
    // Auto-select if first user
    if (users.length === 0) {
      setActiveUserId(newUser.id)
    }
    return newUser
  }

  const deleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId))
    if (activeUserId === userId) {
      setActiveUserId(null)
    }
  }

  const selectUser = (userId: string) => {
    setActiveUserId(userId)
  }

  return {
    users,
    activeUser,
    activeUserId,
    createUser,
    deleteUser,
    selectUser,
  }
}
