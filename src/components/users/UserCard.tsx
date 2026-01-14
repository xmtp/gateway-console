import { Button } from '@/components/ui/button'
import type { EphemeralUser } from '@/types/user'

interface UserCardProps {
  user: EphemeralUser
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Generate a simple avatar color from address
function getAvatarColor(address: string): string {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
  ]
  const index = parseInt(address.slice(2, 4), 16) % colors.length
  return colors[index]
}

export function UserCard({ user, isActive, onSelect, onDelete }: UserCardProps) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
        isActive ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted'
      }`}
      onClick={onSelect}
    >
      {/* Avatar */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${getAvatarColor(
          user.address
        )}`}
      >
        {user.name.slice(0, 1).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{user.name}</div>
        <div className="text-xs text-muted-foreground font-mono">
          {truncateAddress(user.address)}
        </div>
      </div>

      {/* Delete */}
      <Button
        variant="ghost"
        size="sm"
        className="opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
        onClick={(e) => {
          e.stopPropagation()
          if (confirm(`Delete user "${user.name}"?`)) {
            onDelete()
          }
        }}
      >
        ×
      </Button>
    </div>
  )
}
