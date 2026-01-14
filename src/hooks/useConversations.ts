/**
 * Hooks for managing XMTP conversations and messages
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Client,
  IdentifierKind,
  type Dm,
  type Group,
  type DecodedMessage,
  type CreateGroupOptions,
} from '@xmtp/browser-sdk'
import { useXMTP } from '@/contexts/XMTPContext'

// Union type for DM or Group conversations
export type Conversation = Dm | Group

export interface ConversationData {
  id: string
  type: 'dm' | 'group'
  name: string | null
  peerInboxId: string | null // For DMs
  peerAddress: string | null // For DMs - primary address
  peerAddresses: string[] // For DMs - all linked addresses
  memberCount: number // For groups
  lastMessage: string | null
  lastMessageTime: Date | null
  conversation: Conversation
}

/**
 * Check if an address is reachable on XMTP
 */
export function useCanMessage() {
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const checkCanMessage = useCallback(async (address: string): Promise<boolean> => {
    setIsChecking(true)
    setError(null)

    try {
      const result = await Client.canMessage([
        { identifier: address.toLowerCase(), identifierKind: IdentifierKind.Ethereum }
      ])
      return result.get(address.toLowerCase()) ?? false
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to check reachability')
      setError(err)
      return false
    } finally {
      setIsChecking(false)
    }
  }, [])

  /**
   * Check multiple addresses at once
   */
  const checkCanMessageMultiple = useCallback(async (addresses: string[]): Promise<Map<string, boolean>> => {
    setIsChecking(true)
    setError(null)

    try {
      const identifiers = addresses.map(addr => ({
        identifier: addr.toLowerCase(),
        identifierKind: IdentifierKind.Ethereum,
      }))
      const result = await Client.canMessage(identifiers)
      return result
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to check reachability')
      setError(err)
      return new Map()
    } finally {
      setIsChecking(false)
    }
  }, [])

  return { checkCanMessage, checkCanMessageMultiple, isChecking, error }
}

/**
 * Get inbox ID for an address
 */
export function useGetInboxId() {
  const { client } = useXMTP()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const getInboxId = useCallback(async (address: string): Promise<string | null> => {
    if (!client) {
      setError(new Error('XMTP client not initialized'))
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const inboxId = await client.fetchInboxIdByIdentifier({
        identifier: address.toLowerCase(),
        identifierKind: IdentifierKind.Ethereum,
      })
      return inboxId ?? null
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to get inbox ID')
      setError(err)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [client])

  /**
   * Get inbox IDs for multiple addresses
   */
  const getInboxIds = useCallback(async (addresses: string[]): Promise<Map<string, string>> => {
    if (!client) {
      setError(new Error('XMTP client not initialized'))
      return new Map()
    }

    setIsLoading(true)
    setError(null)

    try {
      const results = new Map<string, string>()
      for (const address of addresses) {
        const inboxId = await client.fetchInboxIdByIdentifier({
          identifier: address.toLowerCase(),
          identifierKind: IdentifierKind.Ethereum,
        })
        if (inboxId) {
          results.set(address.toLowerCase(), inboxId)
        }
      }
      return results
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to get inbox IDs')
      setError(err)
      return new Map()
    } finally {
      setIsLoading(false)
    }
  }, [client])

  return { getInboxId, getInboxIds, isLoading, error }
}

/**
 * List all conversations (DMs and Groups)
 */
export function useConversations() {
  const { client } = useXMTP()
  const [conversations, setConversations] = useState<ConversationData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const loadConversations = useCallback(async () => {
    if (!client) return

    setIsLoading(true)
    setError(null)

    try {
      // Sync conversations first
      await client.conversations.sync()

      // List all DMs and Groups
      const dms = await client.conversations.listDms()
      const groups = await client.conversations.listGroups()

      // Map DMs to our data structure
      const dmData: ConversationData[] = await Promise.all(
        dms.map(async (dm) => {
          const members = await dm.members()
          const peer = members.find(m => m.inboxId !== client.inboxId)
          const messages = await dm.messages({ limit: 1n })
          const lastMsg = messages[0]

          // Get all Ethereum addresses for the peer
          const peerAddresses = peer?.accountIdentifiers
            ?.filter(id => id.identifierKind === IdentifierKind.Ethereum)
            ?.map(id => id.identifier) ?? []

          return {
            id: dm.id,
            type: 'dm' as const,
            name: null,
            peerInboxId: peer?.inboxId ?? null,
            peerAddress: peerAddresses[0] ?? null,
            peerAddresses,
            memberCount: 2,
            lastMessage: typeof lastMsg?.content === 'string' ? lastMsg.content : null,
            lastMessageTime: lastMsg?.sentAtNs ? new Date(Number(lastMsg.sentAtNs) / 1_000_000) : null,
            conversation: dm,
          }
        })
      )

      // Map Groups to our data structure
      const groupData: ConversationData[] = await Promise.all(
        groups.map(async (group) => {
          const members = await group.members()
          const messages = await group.messages({ limit: 1n })
          const lastMsg = messages[0]

          return {
            id: group.id,
            type: 'group' as const,
            name: group.name ?? null,
            peerInboxId: null,
            peerAddress: null,
            peerAddresses: [],
            memberCount: members.length,
            lastMessage: typeof lastMsg?.content === 'string' ? lastMsg.content : null,
            lastMessageTime: lastMsg?.sentAtNs ? new Date(Number(lastMsg.sentAtNs) / 1_000_000) : null,
            conversation: group,
          }
        })
      )

      // Combine and sort by last message time (newest first)
      const allConversations = [...dmData, ...groupData]
      allConversations.sort((a, b) => {
        if (!a.lastMessageTime) return 1
        if (!b.lastMessageTime) return -1
        return b.lastMessageTime.getTime() - a.lastMessageTime.getTime()
      })

      setConversations(allConversations)
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to load conversations')
      console.error('Error loading conversations:', err)
      setError(err)
    } finally {
      setIsLoading(false)
    }
  }, [client])

  // Load conversations when client changes
  useEffect(() => {
    if (client) {
      loadConversations()
    } else {
      setConversations([])
    }
  }, [client, loadConversations])

  return { conversations, isLoading, error, refresh: loadConversations }
}

/**
 * Create or find a DM conversation with an address
 */
export function useCreateDm() {
  const { client } = useXMTP()
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const createDm = useCallback(async (peerInboxId: string): Promise<Dm | null> => {
    if (!client) {
      setError(new Error('XMTP client not initialized'))
      return null
    }

    setIsCreating(true)
    setError(null)

    try {
      const dm = await client.conversations.createDm(peerInboxId)
      return dm
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to create DM')
      console.error('Error creating DM:', err)
      setError(err)
      return null
    } finally {
      setIsCreating(false)
    }
  }, [client])

  return { createDm, isCreating, error }
}

/**
 * Create a group conversation
 */
export function useCreateGroup() {
  const { client } = useXMTP()
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const createGroup = useCallback(async (
    memberInboxIds: string[],
    options?: CreateGroupOptions
  ): Promise<Group | null> => {
    if (!client) {
      setError(new Error('XMTP client not initialized'))
      return null
    }

    if (memberInboxIds.length === 0) {
      setError(new Error('At least one member required'))
      return null
    }

    setIsCreating(true)
    setError(null)

    try {
      const group = await client.conversations.createGroup(memberInboxIds, options)
      return group
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to create group')
      console.error('Error creating group:', err)
      setError(err)
      return null
    } finally {
      setIsCreating(false)
    }
  }, [client])

  return { createGroup, isCreating, error }
}

/**
 * Hook for messages in a specific conversation (DM or Group)
 */
export function useMessages(conversation: Conversation | null) {
  const [messages, setMessages] = useState<DecodedMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const streamRef = useRef<AsyncIterable<DecodedMessage> | null>(null)

  const loadMessages = useCallback(async () => {
    if (!conversation) {
      setMessages([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Sync conversation first
      await conversation.sync()

      // Load all messages
      const msgs = await conversation.messages()
      setMessages(msgs)
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to load messages')
      console.error('Error loading messages:', err)
      setError(err)
    } finally {
      setIsLoading(false)
    }
  }, [conversation])

  // Load messages and start streaming when conversation changes
  useEffect(() => {
    if (!conversation) {
      setMessages([])
      return
    }

    loadMessages()

    // Start streaming new messages
    const startStream = async () => {
      try {
        const stream = await conversation.stream()
        streamRef.current = stream

        for await (const message of stream) {
          // Deduplicate - only add if message doesn't already exist
          setMessages(prev => {
            if (prev.some(m => m.id === message.id)) {
              return prev
            }
            return [...prev, message]
          })
        }
      } catch (e) {
        console.error('Message stream error:', e)
      }
    }

    startStream()

    // Cleanup stream on unmount or conversation change
    return () => {
      streamRef.current = null
    }
  }, [conversation, loadMessages])

  return { messages, isLoading, error, refresh: loadMessages }
}

/**
 * Send a message to a conversation (DM or Group)
 */
export function useSendMessage() {
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const sendMessage = useCallback(async (conversation: Conversation, content: string): Promise<boolean> => {
    if (!conversation) {
      setError(new Error('No conversation selected'))
      return false
    }

    if (!content.trim()) {
      setError(new Error('Message cannot be empty'))
      return false
    }

    setIsSending(true)
    setError(null)

    try {
      await conversation.sendText(content)
      return true
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to send message')
      console.error('Error sending message:', err)
      setError(err)
      return false
    } finally {
      setIsSending(false)
    }
  }, [])

  return { sendMessage, isSending, error }
}
