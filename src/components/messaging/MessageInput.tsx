import { useState, type KeyboardEvent } from 'react'
import { useSendMessage } from '@/hooks/useConversations'
import { useMessaging } from '@/contexts/MessagingContext'
import { usePayerBalance } from '@/hooks/usePayerBalance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MessageCostBadge } from './MessageCostBadge'
import { Send, Loader2 } from 'lucide-react'

export function MessageInput() {
  const [message, setMessage] = useState('')
  const { selectedConversation } = useMessaging()
  const { sendMessage, isSending, error } = useSendMessage()
  const { refetch: refetchBalance } = usePayerBalance()

  const handleSend = async () => {
    if (!selectedConversation || !message.trim() || isSending) return

    const success = await sendMessage(selectedConversation, message.trim())
    if (success) {
      setMessage('')
      // Refetch balance after sending to update messages available
      refetchBalance()
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!selectedConversation) {
    return null
  }

  return (
    <div
      className="p-3 border-t"
      style={{ paddingBottom: 'calc(0.75rem + var(--safe-area-inset-bottom))' }}
    >
      {error && (
        <p className="text-xs text-destructive mb-2">{error.message}</p>
      )}
      <div className="flex gap-2 items-center">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={isSending}
          className="flex-1 min-h-[44px]"
        />
        {/* Show cost estimate when there's message content */}
        {message.trim() && (
          <MessageCostBadge message={message} compact />
        )}
        <Button
          onClick={handleSend}
          disabled={!message.trim() || isSending}
          size="icon"
          className="min-h-[44px] min-w-[44px] touch-manipulation"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
