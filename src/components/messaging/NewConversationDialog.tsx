import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCanMessage, useGetInboxId, useCreateDm } from '@/hooks/useConversations'
import { useMessaging } from '@/contexts/MessagingContext'
import { useConversations } from '@/hooks/useConversations'
import { resolveAddressOrENS, isENSName } from '@/lib/ens'
import { isAddress } from 'viem'
import {
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ReachabilityStatus = 'idle' | 'checking' | 'reachable' | 'unreachable' | 'error'

export function NewConversationDialog() {
  const [open, setOpen] = useState(false)
  const [recipient, setRecipient] = useState('')
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null)
  const [status, setStatus] = useState<ReachabilityStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  // Track latest request to prevent race conditions
  const requestIdRef = useRef(0)

  const { checkCanMessage } = useCanMessage()
  const { getInboxId } = useGetInboxId()
  const { createDm } = useCreateDm()
  const { selectConversation, setPeerAddress } = useMessaging()
  const { refresh } = useConversations()

  const resetState = () => {
    setRecipient('')
    setResolvedAddress(null)
    setStatus('idle')
    setErrorMessage(null)
    setIsStarting(false)
  }

  const handleRecipientChange = async (value: string) => {
    setRecipient(value)
    setResolvedAddress(null)
    setStatus('idle')
    setErrorMessage(null)

    if (!value.trim()) return

    // Check if it's a valid address or ENS
    if (isAddress(value) || isENSName(value)) {
      // Increment request ID to track this specific request
      const currentRequestId = ++requestIdRef.current
      setStatus('checking')

      try {
        // Resolve address if ENS
        const address = await resolveAddressOrENS(value)

        // Ignore result if a newer request was made
        if (currentRequestId !== requestIdRef.current) return

        if (!address) {
          setStatus('error')
          setErrorMessage(isENSName(value) ? 'ENS name not found' : 'Invalid address')
          return
        }

        setResolvedAddress(address)

        // Check reachability on XMTP
        const canMessage = await checkCanMessage(address)

        // Ignore result if a newer request was made
        if (currentRequestId !== requestIdRef.current) return

        if (canMessage) {
          setStatus('reachable')
        } else {
          setStatus('unreachable')
          setErrorMessage('This address is not on XMTP')
        }
      } catch {
        // Ignore errors from stale requests
        if (currentRequestId !== requestIdRef.current) return
        setStatus('error')
        setErrorMessage('Failed to check address')
      }
    }
  }

  const handleStartConversation = async () => {
    if (!resolvedAddress || status !== 'reachable') return

    setIsStarting(true)
    setErrorMessage(null)

    try {
      // Get inbox ID for the address
      const inboxId = await getInboxId(resolvedAddress)
      if (!inboxId) {
        setErrorMessage('Could not find inbox for this address')
        setIsStarting(false)
        return
      }

      // Create or find DM
      const dm = await createDm(inboxId)
      if (!dm) {
        setErrorMessage('Failed to create conversation')
        setIsStarting(false)
        return
      }

      // Select the conversation
      selectConversation(dm)
      setPeerAddress(resolvedAddress)

      // Refresh conversation list
      await refresh()

      // Close dialog
      setOpen(false)
      resetState()
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Failed to start conversation')
    } finally {
      setIsStarting(false)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      resetState()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
          <DialogDescription>
            Enter an Ethereum address or ENS name to start a conversation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient</Label>
            <div className="relative">
              <Input
                id="recipient"
                value={recipient}
                onChange={(e) => handleRecipientChange(e.target.value)}
                placeholder="0x... or name.eth"
                className={cn(
                  'pr-10',
                  status === 'reachable' && 'border-green-500',
                  status === 'unreachable' && 'border-yellow-500',
                  status === 'error' && 'border-destructive'
                )}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {status === 'checking' && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {status === 'reachable' && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                {status === 'unreachable' && (
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                )}
                {status === 'error' && (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
              </div>
            </div>

            {/* Resolved address display */}
            {resolvedAddress && isENSName(recipient) && (
              <p className="text-xs text-muted-foreground">
                Resolved to: {resolvedAddress}
              </p>
            )}

            {/* Status messages */}
            {status === 'reachable' && (
              <p className="text-xs text-green-600">
                This address can receive XMTP messages
              </p>
            )}
            {errorMessage && (
              <p className="text-xs text-destructive">{errorMessage}</p>
            )}
          </div>

          {/* Demo addresses */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Try these:</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRecipientChange('hi.xmtp.eth')}
                className="text-xs"
              >
                hi.xmtp.eth
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleStartConversation}
            disabled={status !== 'reachable' || isStarting}
          >
            {isStarting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Starting...
              </>
            ) : (
              'Start Chat'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
