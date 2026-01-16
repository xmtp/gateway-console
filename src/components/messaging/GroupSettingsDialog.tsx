import { useState } from 'react'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  useCanMessage,
  useGetInboxId,
  useGroupAdmin,
  type GroupMemberInfo,
} from '@/hooks/useConversations'
import { resolveAddressOrENS, isENSName } from '@/lib/ens'
import { isAddress } from 'viem'
import type { Group } from '@xmtp/browser-sdk'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  X,
  Plus,
  UserMinus,
  Shield,
  ShieldCheck,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { GasOperationCostBadge } from './GasOperationCostBadge'

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function truncateInboxId(inboxId: string): string {
  return `${inboxId.slice(0, 6)}...${inboxId.slice(-4)}`
}

interface PendingMember {
  address: string
  displayName: string
  inboxId: string | null
  isReachable: boolean
  isResolving: boolean
}

interface MemberRowProps {
  member: GroupMemberInfo
  isCurrentUser: boolean
  canRemove: boolean
  onRemove: () => void
  isRemoving: boolean
}

function MemberRow({ member, isCurrentUser, canRemove, onRemove, isRemoving }: MemberRowProps) {
  const displayName = member.addresses[0]
    ? truncateAddress(member.addresses[0])
    : truncateInboxId(member.inboxId)

  return (
    <div
      className={cn(
        'group flex items-center gap-2 p-2 rounded-md',
        isCurrentUser && 'bg-muted'
      )}
    >
      {/* Role icon */}
      <div className="w-6 h-6 rounded-full flex items-center justify-center bg-muted flex-shrink-0">
        {member.isSuperAdmin ? (
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        ) : member.isAdmin ? (
          <Shield className="h-3.5 w-3.5 text-blue-500" />
        ) : (
          <User className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>

      {/* Name and role */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm truncate">{displayName}</span>
          {isCurrentUser && (
            <span className="text-[10px] text-muted-foreground">(you)</span>
          )}
          {member.isSuperAdmin && (
            <span className="text-[10px] text-primary font-medium">Owner</span>
          )}
          {member.isAdmin && !member.isSuperAdmin && (
            <span className="text-[10px] text-blue-500 font-medium">Admin</span>
          )}
        </div>
      </div>

      {/* Remove button */}
      {canRemove && !isCurrentUser && !member.isSuperAdmin && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
          <GasOperationCostBadge operation="removeMember" compact tooltipSide="left" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={onRemove}
            disabled={isRemoving}
          >
            {isRemoving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <UserMinus className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

interface GroupSettingsDialogProps {
  group: Group | null
  groupName: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GroupSettingsDialog({
  group,
  groupName,
  open,
  onOpenChange,
}: GroupSettingsDialogProps) {
  const [memberInput, setMemberInput] = useState('')
  const [pendingMember, setPendingMember] = useState<PendingMember | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { checkCanMessage } = useCanMessage()
  const { getInboxId } = useGetInboxId()
  const {
    members,
    isLoading,
    currentUserInboxId,
    canAddMembers,
    canRemoveMembers,
    addMember,
    removeMember,
  } = useGroupAdmin(group)

  const resetAddState = () => {
    setMemberInput('')
    setPendingMember(null)
    setIsAdding(false)
    setErrorMessage(null)
  }

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen)
    if (!isOpen) {
      resetAddState()
    }
  }

  const handleAddMember = async () => {
    const input = memberInput.trim()
    if (!input) return

    // Check if already a member
    const existingMember = members.find(m =>
      m.addresses.some(a => a.toLowerCase() === input.toLowerCase()) ||
      m.inboxId.toLowerCase() === input.toLowerCase()
    )
    if (existingMember) {
      setErrorMessage('Already a member of this group')
      return
    }

    // Start resolving
    setPendingMember({
      address: input,
      displayName: input,
      inboxId: null,
      isReachable: false,
      isResolving: true,
    })
    setMemberInput('')
    setErrorMessage(null)

    try {
      // Resolve address if ENS
      let address = input
      if (isENSName(input)) {
        const resolved = await resolveAddressOrENS(input)
        if (!resolved) {
          setPendingMember(null)
          setErrorMessage('ENS name not found')
          return
        }
        address = resolved
      } else if (!isAddress(input)) {
        setPendingMember(null)
        setErrorMessage('Invalid address')
        return
      }

      // Check reachability
      const canMessage = await checkCanMessage(address)
      if (!canMessage) {
        setPendingMember(prev => prev ? {
          ...prev,
          address,
          isResolving: false,
          isReachable: false,
        } : null)
        setErrorMessage('Address is not reachable on XMTP')
        return
      }

      // Get inbox ID
      const inboxId = await getInboxId(address)
      if (!inboxId) {
        setPendingMember(prev => prev ? {
          ...prev,
          address,
          isResolving: false,
          isReachable: false,
        } : null)
        setErrorMessage('Could not get inbox ID')
        return
      }

      // Update pending member as ready
      setPendingMember(prev => prev ? {
        ...prev,
        address,
        inboxId,
        isResolving: false,
        isReachable: true,
      } : null)
    } catch {
      setPendingMember(null)
      setErrorMessage('Failed to resolve address')
    }
  }

  const confirmAddMember = async () => {
    if (!pendingMember?.inboxId || !pendingMember.isReachable) return

    setIsAdding(true)
    setErrorMessage(null)

    const success = await addMember(pendingMember.inboxId)
    if (success) {
      resetAddState()
    } else {
      setErrorMessage('Failed to add member')
    }
    setIsAdding(false)
  }

  const handleRemoveMember = async (inboxId: string) => {
    setRemovingMemberId(inboxId)
    setErrorMessage(null)

    const success = await removeMember(inboxId)
    if (!success) {
      setErrorMessage('Failed to remove member')
    }
    setRemovingMemberId(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddMember()
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{groupName || 'Group Settings'}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {members.length} member{members.length !== 1 ? 's' : ''}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-4 py-2">
          {/* Member List */}
          <div className="space-y-2">
            <Label>Members</Label>
            <ScrollArea className="h-[200px] rounded-md border p-2">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-1">
                  {members.map((member) => (
                    <MemberRow
                      key={member.inboxId}
                      member={member}
                      isCurrentUser={member.inboxId === currentUserInboxId}
                      canRemove={canRemoveMembers}
                      onRemove={() => handleRemoveMember(member.inboxId)}
                      isRemoving={removingMemberId === member.inboxId}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Add Member Section */}
          {canAddMembers && (
            <div className="space-y-2">
              <Label>Add Member</Label>
              <div className="flex gap-2">
                <Input
                  value={memberInput}
                  onChange={(e) => setMemberInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="0x... or name.eth"
                  disabled={!!pendingMember}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleAddMember}
                  disabled={!memberInput.trim() || !!pendingMember}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Pending member */}
              {pendingMember && (
                <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
                  {pendingMember.isResolving ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : pendingMember.isReachable ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="text-sm truncate flex-1">
                    {pendingMember.displayName}
                  </span>

                  {pendingMember.isReachable && (
                    <div className="flex items-center gap-2">
                      <GasOperationCostBadge operation="addMember" compact tooltipSide="top" />
                      <Button
                        size="sm"
                        onClick={confirmAddMember}
                        disabled={isAdding}
                      >
                        {isAdding && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                        Add
                      </Button>
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={resetAddState}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Done
          </Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
