/**
 * Hooks for managing XMTP conversations and messages
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Client,
  IdentifierKind,
  ConsentState,
  type Dm,
  type Group,
  type DecodedMessage,
  type CreateGroupOptions,
  type AsyncStreamProxy,
} from '@xmtp/browser-sdk'
import { useXMTP } from '@/contexts/XMTPContext'

// Stream connection status
export type StreamStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed'

// Stream configuration
const STREAM_CONFIG = {
  retryAttempts: 10,
  retryDelay: 15000, // 15 seconds
  consentStates: [ConsentState.Allowed, ConsentState.Unknown], // Stream allowed and unknown, not denied (spam)
}

// Union type for DM or Group conversations
export type Conversation = Dm | Group

/**
 * Extract displayable text from a message content for conversation preview
 * Returns null for non-text content (group updates, etc.) so they're skipped
 */
function getMessageText(content: unknown): string | null {
  if (typeof content === 'string') return content
  if (content && typeof content === 'object') {
    // Skip GroupUpdated messages in preview - we only want text messages
    if ('initiatedByInboxId' in content) return null
    // Try to get text property if it exists
    if ('text' in content && typeof (content as { text: unknown }).text === 'string') {
      return (content as { text: string }).text
    }
  }
  return null
}

export interface ConversationData {
  id: string
  type: 'dm' | 'group'
  name: string | null
  description: string | null // For groups
  imageUrl: string | null // For groups
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
  const { client, setIsLoadingConversations } = useXMTP()
  const [conversations, setConversations] = useState<ConversationData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('disconnected')

  // Store stream reference for proper cleanup
  const conversationStreamRef = useRef<AsyncStreamProxy<Dm | Group> | null>(null)

  const loadConversations = useCallback(async () => {
    if (!client) return

    setIsLoading(true)
    setError(null)

    try {
      // Use syncAll to sync welcomes AND messages for all conversations
      // This ensures lastMessage data is accurate
      // Filter by consent state to avoid syncing spam
      await client.conversations.syncAll(STREAM_CONFIG.consentStates)

      // List all DMs and Groups, filtered by consent state
      const dms = await client.conversations.listDms({
        consentStates: STREAM_CONFIG.consentStates,
      })
      const groups = await client.conversations.listGroups({
        consentStates: STREAM_CONFIG.consentStates,
      })

      // Map DMs to our data structure
      const dmData: ConversationData[] = await Promise.all(
        dms.map(async (dm) => {
          const members = await dm.members()
          const peer = members.find(m => m.inboxId !== client.inboxId)
          // Get recent messages and find the last TEXT message (skip group updates)
          const messages = await dm.messages({ limit: 10n })
          const lastTextMsg = [...messages].reverse().find(m => getMessageText(m.content) !== null)

          // Get all Ethereum addresses for the peer
          const peerAddresses = peer?.accountIdentifiers
            ?.filter(id => id.identifierKind === IdentifierKind.Ethereum)
            ?.map(id => id.identifier) ?? []

          // Debug logging for Unknown conversations
          if (peerAddresses.length === 0) {
            console.warn('[Conversations] DM with no peer addresses:', {
              dmId: dm.id,
              memberCount: members.length,
              members: members.map(m => ({
                inboxId: m.inboxId,
                identifierCount: m.accountIdentifiers?.length ?? 0,
                identifiers: m.accountIdentifiers,
              })),
              clientInboxId: client.inboxId,
              peer: peer ? {
                inboxId: peer.inboxId,
                identifiers: peer.accountIdentifiers,
              } : null,
            })
          }

          return {
            id: dm.id,
            type: 'dm' as const,
            name: null,
            description: null,
            imageUrl: null,
            peerInboxId: peer?.inboxId ?? null,
            peerAddress: peerAddresses[0] ?? null,
            peerAddresses,
            memberCount: 2,
            lastMessage: getMessageText(lastTextMsg?.content),
            lastMessageTime: lastTextMsg?.sentAtNs ? new Date(Number(lastTextMsg.sentAtNs) / 1_000_000) : null,
            conversation: dm,
          }
        })
      )

      // Map Groups to our data structure
      const groupData: ConversationData[] = await Promise.all(
        groups.map(async (group) => {
          const members = await group.members()
          // Get recent messages and find the last TEXT message (skip group updates)
          const messages = await group.messages({ limit: 10n })
          const lastTextMsg = [...messages].reverse().find(m => getMessageText(m.content) !== null)

          return {
            id: group.id,
            type: 'group' as const,
            name: group.name ?? null,
            description: group.description ?? null,
            imageUrl: group.imageUrl ?? null,
            peerInboxId: null,
            peerAddress: null,
            peerAddresses: [],
            memberCount: members.length,
            lastMessage: getMessageText(lastTextMsg?.content),
            lastMessageTime: lastTextMsg?.sentAtNs ? new Date(Number(lastTextMsg.sentAtNs) / 1_000_000) : null,
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
      setIsLoadingConversations(false)
    }
  }, [client, setIsLoadingConversations])

  // Load conversations and start streaming when client changes
  useEffect(() => {
    if (!client) {
      setConversations([])
      setStreamStatus('disconnected')
      return
    }

    loadConversations()

    // Start streaming new conversations with proper callbacks
    let isMounted = true
    setStreamStatus('connecting')

    const startStream = async () => {
      try {
        const stream = await client.conversations.stream({
          // Disable automatic sync since we already called syncAll
          disableSync: true,

          // Retry configuration for resilience
          retryAttempts: STREAM_CONFIG.retryAttempts,
          retryDelay: STREAM_CONFIG.retryDelay,
          retryOnFail: true,

          // Stream callbacks for monitoring
          onValue: (_conversation) => {
            if (!isMounted) return
            // Reload all conversations to get proper metadata
            loadConversations()
          },
          onError: (error) => {
            console.error('[Stream] Conversation stream error:', error)
          },
          onFail: () => {
            console.error('[Stream] Conversation stream failed after retries')
            if (isMounted) {
              setStreamStatus('failed')
            }
          },
          onRestart: () => {
            console.log('[Stream] Conversation stream restarted')
            if (isMounted) {
              setStreamStatus('connected')
            }
          },
          onRetry: (attempt, maxAttempts) => {
            console.log(`[Stream] Conversation stream retry ${attempt}/${maxAttempts}`)
            if (isMounted) {
              setStreamStatus('reconnecting')
            }
          },
        })

        // Store ref for cleanup
        conversationStreamRef.current = stream
        if (isMounted) {
          setStreamStatus('connected')
        }

        // Keep the stream alive (callbacks handle values, but we iterate to keep it open)
        // Wrap in try-catch to handle client closure during user switch
        try {
          for await (const _ of stream) {
            if (!isMounted) break
          }
        } catch (e) {
          // Stream may error when client is closed during user switch - this is expected
          if (isMounted) {
            console.log('[Stream] Conversation stream ended:', e)
          }
        }
      } catch (e) {
        // Only log as error if we're still mounted (not during user switch cleanup)
        if (isMounted) {
          console.error('[Stream] Conversation stream setup error:', e)
          setStreamStatus('failed')
        }
      }
    }

    startStream()

    // Cleanup: properly close the stream
    // Note: During user switch, client may already be closed, so handle errors gracefully
    return () => {
      isMounted = false
      if (conversationStreamRef.current) {
        conversationStreamRef.current.return().catch(() => {
          // Silently ignore - stream may already be closed if client was closed first
        })
        conversationStreamRef.current = null
      }
      setStreamStatus('disconnected')
    }
  }, [client, loadConversations])

  return { conversations, isLoading, error, streamStatus, refresh: loadConversations }
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
  // Only start in loading state if we have a conversation to load
  const [isLoading, setIsLoading] = useState(!!conversation)
  const [error, setError] = useState<Error | null>(null)
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('disconnected')

  // Store stream reference for proper cleanup
  const streamRef = useRef<AsyncStreamProxy<DecodedMessage> | null>(null)

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
      setStreamStatus('disconnected')
      return
    }

    loadMessages()

    // Start streaming new messages with proper callbacks
    let isMounted = true
    setStreamStatus('connecting')

    const startStream = async () => {
      try {
        const stream = await conversation.stream({
          // Disable automatic sync since we already called conversation.sync()
          disableSync: true,

          // Retry configuration for resilience
          retryAttempts: STREAM_CONFIG.retryAttempts,
          retryDelay: STREAM_CONFIG.retryDelay,
          retryOnFail: true,

          // Stream callbacks for monitoring
          onValue: (message) => {
            if (!isMounted) return
            // Deduplicate - only add if message doesn't already exist
            setMessages(prev => {
              if (prev.some(m => m.id === message.id)) {
                return prev
              }
              return [...prev, message]
            })
          },
          onError: (error) => {
            console.error('[Stream] Message stream error:', error)
          },
          onFail: () => {
            console.error('[Stream] Message stream failed after retries')
            if (isMounted) {
              setStreamStatus('failed')
            }
          },
          onRestart: () => {
            console.log('[Stream] Message stream restarted')
            if (isMounted) {
              setStreamStatus('connected')
            }
          },
          onRetry: (attempt, maxAttempts) => {
            console.log(`[Stream] Message stream retry ${attempt}/${maxAttempts}`)
            if (isMounted) {
              setStreamStatus('reconnecting')
            }
          },
        })

        // Store ref for cleanup
        streamRef.current = stream
        if (isMounted) {
          setStreamStatus('connected')
        }

        // Keep the stream alive (callbacks handle the messages)
        // Wrap in try-catch to handle client closure during user switch
        try {
          for await (const _ of stream) {
            if (!isMounted) break
          }
        } catch (e) {
          // Stream may error when client is closed during user switch - this is expected
          if (isMounted) {
            console.log('[Stream] Message stream ended:', e)
          }
        }
      } catch (e) {
        // Only log as error if we're still mounted (not during user switch cleanup)
        if (isMounted) {
          console.error('[Stream] Message stream setup error:', e)
          setStreamStatus('failed')
        }
      }
    }

    startStream()

    // Cleanup: properly close the stream
    // Note: During user switch, client may already be closed, so handle errors gracefully
    return () => {
      isMounted = false
      if (streamRef.current) {
        streamRef.current.return().catch(() => {
          // Silently ignore - stream may already be closed if client was closed first
        })
        streamRef.current = null
      }
      setStreamStatus('disconnected')
    }
  }, [conversation, loadMessages])

  return { messages, isLoading, error, streamStatus, refresh: loadMessages }
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

/**
 * Global message stream hook - streams all messages across all conversations
 * This is useful for updating the conversation list with latest messages
 * without requiring the user to have a conversation open.
 *
 * @param onNewMessage - Callback when a new message arrives (optional)
 * @returns Stream status and control
 */
export function useGlobalMessageStream(
  onNewMessage?: (message: DecodedMessage, conversationId: string) => void
) {
  const { client } = useXMTP()
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('disconnected')
  const [lastMessage, setLastMessage] = useState<DecodedMessage | null>(null)

  // Store stream reference for proper cleanup
  const streamRef = useRef<AsyncStreamProxy<DecodedMessage> | null>(null)

  useEffect(() => {
    if (!client) {
      setStreamStatus('disconnected')
      return
    }

    let isMounted = true
    setStreamStatus('connecting')

    const startStream = async () => {
      try {
        const stream = await client.conversations.streamAllMessages({
          // Filter by consent state to avoid streaming spam
          consentStates: STREAM_CONFIG.consentStates,

          // Disable automatic sync - caller should sync before using this hook
          disableSync: true,

          // Retry configuration for resilience
          retryAttempts: STREAM_CONFIG.retryAttempts,
          retryDelay: STREAM_CONFIG.retryDelay,
          retryOnFail: true,

          // Stream callbacks for monitoring
          onValue: (message) => {
            if (!isMounted) return

            setLastMessage(message)

            // Call the callback if provided
            if (onNewMessage) {
              onNewMessage(message, message.conversationId)
            }
          },
          onError: (error) => {
            console.error('[Stream] Global message stream error:', error)
          },
          onFail: () => {
            console.error('[Stream] Global message stream failed after retries')
            if (isMounted) {
              setStreamStatus('failed')
            }
          },
          onRestart: () => {
            console.log('[Stream] Global message stream restarted')
            if (isMounted) {
              setStreamStatus('connected')
            }
          },
          onRetry: (attempt, maxAttempts) => {
            console.log(`[Stream] Global message stream retry ${attempt}/${maxAttempts}`)
            if (isMounted) {
              setStreamStatus('reconnecting')
            }
          },
        })

        // Store ref for cleanup
        streamRef.current = stream
        if (isMounted) {
          setStreamStatus('connected')
        }

        // Keep the stream alive
        // Wrap in try-catch to handle client closure during user switch
        try {
          for await (const _ of stream) {
            if (!isMounted) break
          }
        } catch (e) {
          // Stream may error when client is closed during user switch - this is expected
          if (isMounted) {
            console.log('[Stream] Global message stream ended:', e)
          }
        }
      } catch (e) {
        // Only log as error if we're still mounted (not during user switch cleanup)
        if (isMounted) {
          console.error('[Stream] Global message stream setup error:', e)
          setStreamStatus('failed')
        }
      }
    }

    startStream()

    // Cleanup: properly close the stream
    // Note: During user switch, client may already be closed, so handle errors gracefully
    return () => {
      isMounted = false
      if (streamRef.current) {
        streamRef.current.return().catch(() => {
          // Silently ignore - stream may already be closed if client was closed first
        })
        streamRef.current = null
      }
      setStreamStatus('disconnected')
    }
  }, [client, onNewMessage])

  return { streamStatus, lastMessage }
}

/**
 * Group member information with role
 */
export interface GroupMemberInfo {
  inboxId: string
  addresses: string[]
  isAdmin: boolean
  isSuperAdmin: boolean
}

/**
 * Hook for group administration - managing members and roles
 */
export function useGroupAdmin(group: Group | null) {
  const { client } = useXMTP()
  const [members, setMembers] = useState<GroupMemberInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Check current user's permissions
  const currentUserInboxId = client?.inboxId ?? null

  // With default "All_Members" policy: all members can add, only admins can remove
  const canAddMembers = !!group
  const canRemoveMembers = isAdmin || isSuperAdmin

  const loadMembers = useCallback(async () => {
    if (!group) {
      setMembers([])
      setIsSuperAdmin(false)
      setIsAdmin(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await group.sync()
      const memberList = await group.members()

      // Check current user's admin status
      if (currentUserInboxId) {
        setIsSuperAdmin(await group.isSuperAdmin(currentUserInboxId))
        setIsAdmin(await group.isAdmin(currentUserInboxId))
      }

      // Build member info with admin status
      const memberInfo: GroupMemberInfo[] = await Promise.all(
        memberList.map(async (member) => ({
          inboxId: member.inboxId,
          addresses: member.accountIdentifiers
            ?.filter(id => id.identifierKind === IdentifierKind.Ethereum)
            ?.map(id => id.identifier) ?? [],
          isAdmin: await group.isAdmin(member.inboxId),
          isSuperAdmin: await group.isSuperAdmin(member.inboxId),
        }))
      )

      setMembers(memberInfo)
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to load members')
      console.error('Error loading group members:', err)
      setError(err)
    } finally {
      setIsLoading(false)
    }
  }, [group, currentUserInboxId])

  const addMember = useCallback(async (inboxId: string): Promise<boolean> => {
    if (!group) {
      setError(new Error('No group selected'))
      return false
    }

    setError(null)

    try {
      await group.addMembers([inboxId])
      await loadMembers() // Refresh member list
      return true
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to add member')
      console.error('Error adding member:', err)
      setError(err)
      return false
    }
  }, [group, loadMembers])

  const removeMember = useCallback(async (inboxId: string): Promise<boolean> => {
    if (!group) {
      setError(new Error('No group selected'))
      return false
    }

    if (!canRemoveMembers) {
      setError(new Error('You do not have permission to remove members'))
      return false
    }

    setError(null)

    try {
      await group.removeMembers([inboxId])
      await loadMembers() // Refresh member list
      return true
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to remove member')
      console.error('Error removing member:', err)
      setError(err)
      return false
    }
  }, [group, canRemoveMembers, loadMembers])

  const updateName = useCallback(async (name: string): Promise<boolean> => {
    if (!group) {
      setError(new Error('No group selected'))
      return false
    }

    setError(null)

    try {
      await group.updateName(name)
      return true
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to update group name')
      console.error('Error updating group name:', err)
      setError(err)
      return false
    }
  }, [group])

  const updateDescription = useCallback(async (description: string): Promise<boolean> => {
    if (!group) {
      setError(new Error('No group selected'))
      return false
    }

    setError(null)

    try {
      await group.updateDescription(description)
      return true
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to update group description')
      console.error('Error updating group description:', err)
      setError(err)
      return false
    }
  }, [group])

  const updateImageUrl = useCallback(async (imageUrl: string): Promise<boolean> => {
    if (!group) {
      setError(new Error('No group selected'))
      return false
    }

    setError(null)

    try {
      await group.updateImageUrl(imageUrl)
      return true
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to update group image')
      console.error('Error updating group image:', err)
      setError(err)
      return false
    }
  }, [group])

  // Load members when group changes
  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  return {
    members,
    isLoading,
    error,
    currentUserInboxId,
    isSuperAdmin,
    isAdmin,
    canAddMembers,
    canRemoveMembers,
    addMember,
    removeMember,
    updateName,
    updateDescription,
    updateImageUrl,
    refresh: loadMembers,
  }
}
