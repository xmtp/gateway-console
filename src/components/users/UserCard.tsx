import { useState } from 'react'
import { X, Copy, Check } from 'lucide-react'
import type { EphemeralUser } from '@/types/user'

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

interface UserCardProps {
  user: EphemeralUser
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
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
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(user.address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div
      className={`group flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all duration-150 ${
        isActive
          ? 'bg-zinc-800/80 ring-1 ring-zinc-500/40'
          : 'hover:bg-zinc-800/40'
      }`}
      onClick={onSelect}
    >
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 shadow-sm ${getAvatarColor(
          user.address
        )}`}
      >
        {user.name.slice(0, 1).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col items-start">
        <div className="text-sm font-medium text-zinc-300 truncate">{user.name}</div>
        <div className="text-[10px] font-mono text-zinc-600">
          {truncateAddress(user.address)}
        </div>
      </div>

      {/* Copy */}
      <button
        className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-600 hover:bg-zinc-700/50 hover:text-zinc-400 active:scale-95 transition-all duration-150"
        onClick={handleCopy}
        title="Copy address"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Delete */}
      <button
        className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-600 hover:bg-red-500/20 hover:text-red-400 active:bg-red-500/30 active:text-red-300 active:scale-95 transition-all duration-150"
        onClick={(e) => {
          e.stopPropagation()
          if (confirm(`Delete user "${user.name}"?`)) {
            onDelete()
          }
        }}
        title="Delete user"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
