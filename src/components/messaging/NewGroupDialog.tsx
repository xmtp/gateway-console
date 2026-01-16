import { useState } from 'react'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useCanMessage, useGetInboxId, useCreateGroup, useConversations } from '@/hooks/useConversations'
import { useMessaging } from '@/contexts/MessagingContext'
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout'
import { resolveAddressOrENS, isENSName } from '@/lib/ens'
import { isAddress } from 'viem'
import {
  UserPlus,
  Loader2,
  CheckCircle2,
  XCircle,
  X,
  Plus,
} from 'lucide-react'
import { GasOperationCostBadge } from './GasOperationCostBadge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface MemberInfo {
  address: string
  displayName: string
  inboxId: string | null
  isReachable: boolean
  isResolving: boolean
}

export function NewGroupDialog() {
  const [open, setOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [memberInput, setMemberInput] = useState('')
  const [members, setMembers] = useState<MemberInfo[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { checkCanMessage } = useCanMessage()
  const { getInboxId } = useGetInboxId()
  const { createGroup } = useCreateGroup()
  const { selectConversation, setConversationType, setGroupName: setContextGroupName } = useMessaging()
  const { refresh } = useConversations()
  const { showChat } = useResponsiveLayout()

  const resetState = () => {
    setGroupName('')
    setMemberInput('')
    setMembers([])
    setIsCreating(false)
    setErrorMessage(null)
  }

  const addMember = async () => {
    const input = memberInput.trim()
    if (!input) return

    // Check if already added
    if (members.some(m => m.address.toLowerCase() === input.toLowerCase() || m.displayName.toLowerCase() === input.toLowerCase())) {
      setErrorMessage('Member already added')
      return
    }

    // Start resolving
    const newMember: MemberInfo = {
      address: input,
      displayName: input,
      inboxId: null,
      isReachable: false,
      isResolving: true,
    }
    setMembers(prev => [...prev, newMember])
    setMemberInput('')
    setErrorMessage(null)

    try {
      // Resolve address if ENS
      let address = input
      if (isENSName(input)) {
        const resolved = await resolveAddressOrENS(input)
        if (!resolved) {
          setMembers(prev => prev.filter(m => m.displayName !== input))
          setErrorMessage('ENS name not found')
          return
        }
        address = resolved
      } else if (!isAddress(input)) {
        setMembers(prev => prev.filter(m => m.displayName !== input))
        setErrorMessage('Invalid address')
        return
      }

      // Check reachability
      const canMessage = await checkCanMessage(address)
      if (!canMessage) {
        setMembers(prev => prev.map(m =>
          m.displayName === input
            ? { ...m, address, isResolving: false, isReachable: false }
            : m
        ))
        return
      }

      // Get inbox ID
      const inboxId = await getInboxId(address)
      if (!inboxId) {
        setMembers(prev => prev.map(m =>
          m.displayName === input
            ? { ...m, address, isResolving: false, isReachable: false }
            : m
        ))
        return
      }

      // Update member with resolved info
      setMembers(prev => prev.map(m =>
        m.displayName === input
          ? { ...m, address, inboxId, isResolving: false, isReachable: true }
          : m
      ))
    } catch {
      setMembers(prev => prev.filter(m => m.displayName !== input))
      setErrorMessage('Failed to check member')
    }
  }

  const removeMember = (displayName: string) => {
    setMembers(prev => prev.filter(m => m.displayName !== displayName))
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setErrorMessage('Group name is required')
      return
    }

    const reachableMembers = members.filter(m => m.isReachable && m.inboxId)
    if (reachableMembers.length === 0) {
      setErrorMessage('At least one reachable member required')
      return
    }

    setIsCreating(true)
    setErrorMessage(null)

    try {
      const memberInboxIds = reachableMembers.map(m => m.inboxId!)
      const group = await createGroup(memberInboxIds, { groupName: groupName.trim() })

      if (!group) {
        setErrorMessage('Failed to create group')
        setIsCreating(false)
        return
      }

      // Select the new group
      selectConversation(group)
      setConversationType('group')
      setContextGroupName(groupName.trim())

      // Navigate to chat panel (safe to call on desktop too)
      showChat(group.id)

      // Refresh conversation list
      await refresh()

      // Close dialog
      setOpen(false)
      resetState()
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Failed to create group')
    } finally {
      setIsCreating(false)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      resetState()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addMember()
    }
  }

  const reachableCount = members.filter(m => m.isReachable).length
  const canCreate = groupName.trim() && reachableCount > 0 && !isCreating

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <ResponsiveDialogTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 touch-manipulation">
              <UserPlus className="h-4 w-4" />
            </Button>
          </ResponsiveDialogTrigger>
        </TooltipTrigger>
        <TooltipContent>New Group</TooltipContent>
      </Tooltip>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Create Group</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Start a group chat. You can add more members later.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-4 py-4">
          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name</Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="My Group"
            />
          </div>

          {/* Add Members */}
          <div className="space-y-2">
            <Label htmlFor="member">Add Members</Label>
            <div className="flex gap-2">
              <Input
                id="member"
                value={memberInput}
                onChange={(e) => setMemberInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="0x... or name.eth"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={addMember}
                disabled={!memberInput.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Member List */}
          {members.length > 0 && (
            <div className="space-y-2">
              <Label>Members ({reachableCount} reachable)</Label>
              <div className="flex flex-wrap gap-2">
                {members.map((member) => (
                  <Badge
                    key={member.displayName}
                    variant={member.isReachable ? 'default' : 'secondary'}
                    className={cn(
                      'flex items-center gap-1 pl-2 pr-1',
                      !member.isReachable && !member.isResolving && 'opacity-50'
                    )}
                  >
                    {member.isResolving ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : member.isReachable ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-destructive" />
                    )}
                    <span className="max-w-[100px] truncate text-xs">
                      {member.displayName}
                    </span>
                    <button
                      onClick={() => removeMember(member.displayName)}
                      className="rounded p-0.5 hover:bg-muted active:bg-muted/80 active:scale-90 transition-all"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <p className="text-xs text-destructive">{errorMessage}</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <GasOperationCostBadge operation="createGroup" tooltipSide="right" />
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={!canCreate}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Group'
              )}
            </Button>
          </div>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
