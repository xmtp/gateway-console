import { useConversations, type ConversationData } from '@/hooks/useConversations'
import { useMessaging } from '@/contexts/MessagingContext'
import { useXMTP } from '@/contexts/XMTPContext'
import { useFirstENSName } from '@/hooks/useENSName'
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { User, Users, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

function truncateAddress(address: string | null): string {
  if (!address) return 'Unknown'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function formatTime(date: Date | null): string {
  if (!date) return ''
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = diff / (1000 * 60 * 60)

  if (hours < 24) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

interface ConversationItemProps {
  conversation: ConversationData
  isSelected: boolean
  onSelect: () => void
}

function ConversationItem({ conversation, isSelected, onSelect }: ConversationItemProps) {
  const isGroup = conversation.type === 'group'
  const { ensName, ensAvatar } = useFirstENSName(
    isGroup ? [] : conversation.peerAddresses
  )

  // Format display name for DMs - prefer ENS, fall back to truncated address
  const formatDisplayName = () => {
    if (isGroup) return conversation.name || 'Unnamed Group'

    // If we have an ENS name, show it
    if (ensName) return ensName

    // Fall back to truncated address
    if (conversation.peerAddresses.length === 0) return 'Unknown'
    return truncateAddress(conversation.peerAddresses[0])
  }

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full p-3 text-left hover:bg-muted/50 transition-colors touch-manipulation',
        'border-b border-border last:border-b-0 min-h-[64px]',
        isSelected && 'bg-muted'
      )}
    >
      <div className="flex items-start gap-3">
        {isGroup ? (
          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-purple-500/10">
            <Users className="h-5 w-5 text-purple-500" />
          </div>
        ) : ensAvatar ? (
          <img
            src={ensAvatar}
            alt=""
            className="flex-shrink-0 w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm truncate">
              {formatDisplayName()}
            </span>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatTime(conversation.lastMessageTime)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {conversation.lastMessage || (isGroup ? `${conversation.memberCount} members` : 'No messages yet')}
          </p>
        </div>
      </div>
    </button>
  )
}

export function RefreshConversationsButton() {
  const { isLoading, refresh } = useConversations()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={refresh}
      disabled={isLoading}
      className="h-11 w-11 min-h-[44px] min-w-[44px] touch-manipulation"
    >
      <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
    </Button>
  )
}

export function ConversationList() {
  const { client } = useXMTP()
  const { conversations, isLoading } = useConversations()
  const {
    selectedConversation,
    selectConversation,
    setConversationType,
    setPeerAddress,
    setPeerAddresses,
    setGroupName,
  } = useMessaging()
  const { showChat } = useResponsiveLayout()

  if (!client) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        Select a user to start messaging
      </div>
    )
  }

  if (isLoading && conversations.length === 0) {
    return (
      <div className="flex-1 p-2 space-y-2">
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
      </div>
    )
  }

  const handleSelect = (conv: ConversationData) => {
    selectConversation(conv.conversation)
    setConversationType(conv.type)
    if (conv.type === 'dm') {
      setPeerAddress(conv.peerAddress)
      setPeerAddresses(conv.peerAddresses)
      setGroupName(null)
    } else {
      setPeerAddress(null)
      setPeerAddresses([])
      setGroupName(conv.name)
    }
    // Navigate to chat panel (safe to call on desktop too)
    showChat(conv.id)
  }

  return (
    <div className="flex-1 flex flex-col">
      {conversations.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground text-sm">
          No conversations yet
        </div>
      ) : (
        <ScrollArea className="flex-1">
          {conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isSelected={selectedConversation?.id === conv.id}
              onSelect={() => handleSelect(conv)}
            />
          ))}
        </ScrollArea>
      )}
    </div>
  )
}
