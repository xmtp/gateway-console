import { X } from 'lucide-react'
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
      className={`group flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all ${
        isActive
          ? 'bg-zinc-800 ring-1 ring-emerald-500/50'
          : 'hover:bg-zinc-800/50'
      }`}
      onClick={onSelect}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 ${getAvatarColor(
          user.address
        )}`}
      >
        {user.name.slice(0, 1).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-zinc-200 truncate">{user.name}</div>
        <div className="text-[10px] text-zinc-500 font-mono truncate">
          {truncateAddress(user.address)}
        </div>
      </div>

      {/* Delete */}
      <button
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-all"
        onClick={(e) => {
          e.stopPropagation()
          if (confirm(`Delete user "${user.name}"?`)) {
            onDelete()
          }
        }}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
