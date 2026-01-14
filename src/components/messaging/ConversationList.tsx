import { useConversations, type ConversationData } from '@/hooks/useConversations'
import { useMessaging } from '@/contexts/MessagingContext'
import { useXMTP } from '@/contexts/XMTPContext'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, MessageSquare, Users, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

function truncateAddress(address: string | null): string {
  if (!address) return 'Unknown'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function formatPeerAddresses(addresses: string[]): string {
  if (addresses.length === 0) return 'Unknown'
  if (addresses.length === 1) return truncateAddress(addresses[0])
  // Show first address + count of others
  return `${truncateAddress(addresses[0])} +${addresses.length - 1}`
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

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full p-3 text-left hover:bg-muted/50 transition-colors',
        'border-b border-border last:border-b-0',
        isSelected && 'bg-muted'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
          isGroup ? 'bg-purple-500/10' : 'bg-primary/10'
        )}>
          {isGroup ? (
            <Users className="h-5 w-5 text-purple-500" />
          ) : (
            <MessageSquare className="h-5 w-5 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm truncate">
              {isGroup
                ? (conversation.name || 'Unnamed Group')
                : formatPeerAddresses(conversation.peerAddresses)}
            </span>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatTime(conversation.lastMessageTime)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isGroup && (
              <span className="text-xs text-muted-foreground">
                {conversation.memberCount} members
              </span>
            )}
            {conversation.lastMessage && (
              <p className="text-sm text-muted-foreground truncate mt-0.5">
                {conversation.lastMessage}
              </p>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

export function ConversationList() {
  const { client } = useXMTP()
  const { conversations, isLoading, refresh } = useConversations()
  const {
    selectedConversation,
    selectConversation,
    setConversationType,
    setPeerAddress,
    setPeerAddresses,
    setGroupName,
  } = useMessaging()

  if (!client) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        Select a user to start messaging
      </div>
    )
  }

  if (isLoading && conversations.length === 0) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
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
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b flex items-center justify-between">
        <span className="text-sm font-medium px-2">Conversations</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={refresh}
          disabled={isLoading}
          className="h-8 w-8"
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
      </div>

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
