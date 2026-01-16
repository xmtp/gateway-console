import { useState, useId } from 'react'
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
import { useIsMobile } from '@/hooks/useResponsiveLayout'
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
  Pencil,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { GasOperationCostBadge } from './GasOperationCostBadge'

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function truncateInboxId(inboxId: string): string {
  return `${inboxId.slice(0, 6)}...${inboxId.slice(-4)}`
}

// ============================================================================
// Reusable EditableField Component
// ============================================================================

interface EditableFieldProps {
  label: string
  value: string
  placeholder: string
  emptyText: string
  onSave: (value: string) => Promise<boolean>
  required?: boolean
}

function EditableField({
  label,
  value,
  placeholder,
  emptyText,
  onSave,
  required = false,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedValue, setEditedValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const inputId = useId()

  const handleStartEdit = () => {
    setEditedValue(value)
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedValue('')
  }

  const handleSave = async () => {
    if (required && !editedValue.trim()) return
    setIsSaving(true)
    const success = await onSave(editedValue.trim())
    if (success) {
      setIsEditing(false)
      setEditedValue('')
    }
    setIsSaving(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  const canSave = required ? editedValue.trim().length > 0 : true

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div
        className={cn(
          'transition-all duration-150',
          isEditing ? 'space-y-2' : ''
        )}
      >
        {isEditing ? (
          <>
            <Input
              id={inputId}
              value={editedValue}
              onChange={(e) => setEditedValue(e.target.value)}
              placeholder={placeholder}
              onKeyDown={handleKeyDown}
              autoFocus
              className="h-9"
            />
            <div className="flex items-center justify-between">
              <GasOperationCostBadge
                operation="updateMetadata"
                compact
                tooltipSide="right"
              />
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  className="h-8 px-3"
                  onClick={handleSave}
                  disabled={isSaving || !canSave}
                  aria-label={`Save ${label.toLowerCase()}`}
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Save
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3"
                  onClick={handleCancel}
                  aria-label="Cancel editing"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div
            className="group flex items-center gap-2 p-2 -m-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={handleStartEdit}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleStartEdit()}
            aria-label={`Edit ${label.toLowerCase()}`}
          >
            <span
              className={cn(
                'text-sm flex-1 truncate',
                !value && 'text-muted-foreground'
              )}
            >
              {value || emptyText}
            </span>
            <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Member Row Component
// ============================================================================

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
  isMobile: boolean
}

function MemberRow({
  member,
  isCurrentUser,
  canRemove,
  onRemove,
  isRemoving,
  isMobile,
}: MemberRowProps) {
  const displayName = member.addresses[0]
    ? truncateAddress(member.addresses[0])
    : truncateInboxId(member.inboxId)

  const showRemoveButton = canRemove && !isCurrentUser && !member.isSuperAdmin

  return (
    <div
      className={cn(
        'group flex items-center gap-2 p-2 rounded-md transition-colors',
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

      {/* Remove button - always visible on mobile, hover on desktop */}
      {showRemoveButton && (
        <div
          className={cn(
            'flex items-center gap-1.5 transition-opacity',
            !isMobile && 'opacity-0 group-hover:opacity-100'
          )}
        >
          <GasOperationCostBadge
            operation="removeMember"
            compact
            tooltipSide="left"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={onRemove}
            disabled={isRemoving}
            aria-label={`Remove ${displayName} from group`}
          >
            {isRemoving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserMinus className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Main Dialog Component
// ============================================================================

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

  const isMobile = useIsMobile()
  const addMemberInputId = useId()

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
    updateName,
    updateDescription,
    updateImageUrl,
  } = useGroupAdmin(group)

  // Get current metadata values from the group
  const currentDescription = group?.description || ''
  const currentImageUrl = group?.imageUrl || ''

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

  // Metadata update handlers
  const handleSaveName = async (value: string): Promise<boolean> => {
    setErrorMessage(null)
    const success = await updateName(value)
    if (!success) {
      setErrorMessage('Failed to update group name')
    }
    return success
  }

  const handleSaveDescription = async (value: string): Promise<boolean> => {
    setErrorMessage(null)
    const success = await updateDescription(value)
    if (!success) {
      setErrorMessage('Failed to update group description')
    }
    return success
  }

  const handleSaveImageUrl = async (value: string): Promise<boolean> => {
    setErrorMessage(null)
    const success = await updateImageUrl(value)
    if (!success) {
      setErrorMessage('Failed to update group image')
    }
    return success
  }

  const handleAddMember = async () => {
    const input = memberInput.trim()
    if (!input) return

    // Check if already a member
    const existingMember = members.find(
      (m) =>
        m.addresses.some((a) => a.toLowerCase() === input.toLowerCase()) ||
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
        setPendingMember((prev) =>
          prev
            ? {
                ...prev,
                address,
                isResolving: false,
                isReachable: false,
              }
            : null
        )
        setErrorMessage('Address is not reachable on XMTP')
        return
      }

      // Get inbox ID
      const inboxId = await getInboxId(address)
      if (!inboxId) {
        setPendingMember((prev) =>
          prev
            ? {
                ...prev,
                address,
                isResolving: false,
                isReachable: false,
              }
            : null
        )
        setErrorMessage('Could not get inbox ID')
        return
      }

      // Update pending member as ready
      setPendingMember((prev) =>
        prev
          ? {
              ...prev,
              address,
              inboxId,
              isResolving: false,
              isReachable: true,
            }
          : null
      )
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
          <ResponsiveDialogTitle>Group Settings</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Manage group details and members
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-5 py-2">
          {/* Group Details Section */}
          <div className="space-y-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Details
            </div>
            <div className="space-y-2 rounded-lg border p-3">
              <EditableField
                label="Name"
                value={groupName || ''}
                placeholder="Enter group name"
                emptyText="Unnamed Group"
                onSave={handleSaveName}
                required
              />
              <div className="border-t" />
              <EditableField
                label="Description"
                value={currentDescription}
                placeholder="Enter group description"
                emptyText="No description"
                onSave={handleSaveDescription}
              />
              <div className="border-t" />
              <EditableField
                label="Image URL"
                value={currentImageUrl}
                placeholder="https://example.com/image.png"
                emptyText="No image"
                onSave={handleSaveImageUrl}
              />
            </div>
          </div>

          {/* Members Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Members
              </div>
              <span className="text-xs text-muted-foreground">
                {members.length} member{members.length !== 1 ? 's' : ''}
              </span>
            </div>

            <ScrollArea className="h-[150px] sm:h-[180px] rounded-lg border">
              <div className="p-2">
                {isLoading ? (
                  <div className="flex items-center justify-center h-[120px]">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {members.map((member) => (
                      <MemberRow
                        key={member.inboxId}
                        member={member}
                        isCurrentUser={member.inboxId === currentUserInboxId}
                        canRemove={canRemoveMembers}
                        onRemove={() => handleRemoveMember(member.inboxId)}
                        isRemoving={removingMemberId === member.inboxId}
                        isMobile={isMobile}
                      />
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Add Member */}
            {canAddMembers && (
              <div className="space-y-2">
                <Label
                  htmlFor={addMemberInputId}
                  className="text-xs text-muted-foreground"
                >
                  Add member
                </Label>
                <div className="flex gap-2">
                  <Input
                    id={addMemberInputId}
                    value={memberInput}
                    onChange={(e) => setMemberInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="0x... or name.eth"
                    disabled={!!pendingMember}
                    className="h-9"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
                    onClick={handleAddMember}
                    disabled={!memberInput.trim() || !!pendingMember}
                    aria-label="Look up address"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Pending member */}
                {pendingMember && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/30 min-w-0 overflow-hidden transition-all duration-150 animate-in fade-in slide-in-from-top-1">
                    {pendingMember.isResolving ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0" />
                    ) : pendingMember.isReachable ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                    )}
                    <span className="text-sm truncate flex-1 min-w-0">
                      {pendingMember.displayName}
                    </span>

                    {pendingMember.isReachable && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <GasOperationCostBadge
                          operation="addMember"
                          compact
                          tooltipSide="top"
                        />
                        <Button
                          size="sm"
                          className="h-8"
                          onClick={confirmAddMember}
                          disabled={isAdding}
                        >
                          {isAdding && (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          )}
                          Add
                        </Button>
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={resetAddState}
                      aria-label="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md transition-all duration-150 animate-in fade-in slide-in-from-top-1">
              {errorMessage}
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
