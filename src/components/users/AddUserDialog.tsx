import { useState } from 'react'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { User } from 'lucide-react'

interface AddUserDialogProps {
  onAddUser: (name: string) => void
}

export function AddUserDialog({ onAddUser }: AddUserDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onAddUser(name.trim())
      setName('')
      setOpen(false)
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger asChild>
        <button className="w-full flex items-center gap-2.5 p-2 rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/30 transition-all duration-150 cursor-pointer">
          <div className="w-7 h-7 rounded-full border border-dashed border-zinc-700 flex items-center justify-center">
            <User className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs">Use ephemeral sender</span>
        </button>
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Create New User</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="Enter name (e.g., Alice)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Create
            </Button>
          </div>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
