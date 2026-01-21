import { useCallback, useSyncExternalStore } from 'react'

/**
 * Optimistic decrement for the message counter UI.
 *
 * Provides immediate visual feedback when messages are sent by decrementing
 * the counter client-side before the balance is confirmed on-chain.
 *
 * TODO: In testnet/mainnet mode, supplement this with actual unsettled usage
 * data from nodes. The optimistic decrement should still happen for immediate
 * feedback (since the unsettled usage API may have delays), but we should
 * reconcile with the real unsettled usage when it arrives rather than waiting
 * for the on-chain balance to update.
 */

// Simple event-based store for message count decrements
let pendingDecrement = 0
let listeners: Set<() => void> = new Set()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return pendingDecrement
}

function emitChange() {
  listeners.forEach((listener) => listener())
}

/**
 * Trigger an immediate visual decrement of the message counter
 */
export function decrementMessageCount() {
  pendingDecrement += 1
  emitChange()
}

/**
 * Reset the pending decrement (called when real balance updates)
 */
export function resetDecrement() {
  pendingDecrement = 0
  emitChange()
}

/**
 * Hook to get the current pending decrement count
 */
export function usePendingDecrement() {
  return useSyncExternalStore(subscribe, getSnapshot)
}

/**
 * Hook that provides the decrement function
 */
export function useDecrementMessageCount() {
  return useCallback(() => {
    decrementMessageCount()
  }, [])
}
