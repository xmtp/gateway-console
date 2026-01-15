/**
 * Message cost calculation based on XMTP rate model
 *
 * Cost = (messageFee + storageFee * bytes * days + congestionFee) * gasOverhead
 *
 * All rates are in picodollars (10^-12 dollars).
 * Balances are in 6-decimal fee token units (like USDC).
 */

// Fee estimation constants
const FALLBACK_MESSAGE_BYTES = 1024
const FALLBACK_STORAGE_DAYS = 60
const FALLBACK_GAS_OVERHEAD_ESTIMATE = 1.25

// Picodollar scale factor (10^12)
const PICODOLLAR_SCALE = 1e12

// Fee token decimals
const FEE_TOKEN_DECIMALS = 6

// Fallback rates (in picodollars) when we can't fetch from chain
const FALLBACK_MESSAGE_FEE = 38_500_000n // ~$0.0000385
const FALLBACK_STORAGE_FEE = 22n // ~$0.000000000022 per byte per day
const FALLBACK_CONGESTION_FEE = 0n

export interface CostCalculationResult {
  /** Cost per message in dollars */
  costPerMessage: number
  /** Messages available given balance */
  messagesAvailable: number
  /** Formatted messages available (e.g., "20,000") */
  formattedMessages: string
  /** Formatted balance in dollars (e.g., "$1.00") */
  formattedBalance: string
}

/**
 * Calculate messages available from a balance.
 * Uses fallback rates - a production app would fetch from RateRegistry.
 *
 * @param balance - Payer balance in fee token units (6 decimals, like USDC)
 * @returns Calculation result with messages available and formatting
 */
export function calculateMessagesAvailable(
  balance: bigint | undefined | null
): CostCalculationResult {
  // Handle no balance
  if (!balance || balance <= 0n) {
    return {
      costPerMessage: 0,
      messagesAvailable: 0,
      formattedMessages: '0',
      formattedBalance: '$0.00',
    }
  }

  // Calculate storage component: storageFee * bytes * days
  const storageComponent =
    FALLBACK_STORAGE_FEE * BigInt(FALLBACK_MESSAGE_BYTES) * BigInt(FALLBACK_STORAGE_DAYS)

  // Calculate base cost: messageFee + storageComponent + congestionFee
  const baseCostPicodollars = FALLBACK_MESSAGE_FEE + storageComponent + FALLBACK_CONGESTION_FEE

  // Apply gas overhead estimate multiplier
  const totalCostPicodollars = BigInt(
    Math.round(Number(baseCostPicodollars) * FALLBACK_GAS_OVERHEAD_ESTIMATE)
  )

  // Convert picodollars to dollars
  const costPerMessage = Number(totalCostPicodollars) / PICODOLLAR_SCALE

  // Convert balance from fee token units to dollars
  // Balance is in 6-decimal units, so divide by 10^6 to get dollars
  const balanceDollars = Number(balance) / Math.pow(10, FEE_TOKEN_DECIMALS)

  // Calculate messages available
  const messagesAvailable = Math.floor(balanceDollars / costPerMessage)

  // Format messages with thousands separator
  const formattedMessages = messagesAvailable.toLocaleString()

  // Format balance as currency
  const formattedBalance = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(balanceDollars)

  return {
    costPerMessage,
    messagesAvailable,
    formattedMessages,
    formattedBalance,
  }
}

/**
 * Get warning level based on messages remaining
 */
export function getBalanceWarningLevel(
  messagesAvailable: number
): 'none' | 'low' | 'critical' {
  if (messagesAvailable < 10) return 'critical'
  if (messagesAvailable < 100) return 'low'
  return 'none'
}

export interface MessageCostResult {
  /** Cost in dollars */
  cost: number
  /** Cost formatted as currency (e.g., "$0.00005") */
  formattedCost: string
  /** Cost breakdown components */
  breakdown: {
    messageFee: number
    storageFee: number
    total: number
  }
}

/**
 * Calculate cost for a specific message based on its byte length.
 * Uses fallback rates - a production app would fetch from RateRegistry.
 *
 * @param messageBytes - Size of the message in bytes
 * @param storageDays - How long the message is stored (default: 60 days)
 * @returns Cost calculation result with breakdown
 */
export function calculateMessageCost(
  messageBytes: number,
  storageDays: number = FALLBACK_STORAGE_DAYS
): MessageCostResult {
  // Calculate storage component: storageFee * bytes * days
  const storageComponent = FALLBACK_STORAGE_FEE * BigInt(messageBytes) * BigInt(storageDays)

  // Convert to dollars
  const messageFee = Number(FALLBACK_MESSAGE_FEE) / PICODOLLAR_SCALE
  const storageFee = Number(storageComponent) / PICODOLLAR_SCALE
  // Total is just message fee + storage (gas overhead is charged separately)
  const total = messageFee + storageFee

  // Format cost - use more decimal places for small amounts
  const formattedCost = formatMicroCost(total)

  return {
    cost: total,
    formattedCost,
    breakdown: {
      messageFee,
      storageFee,
      total,
    },
  }
}

/**
 * Format very small dollar amounts (microdollars)
 * Shows appropriate precision based on magnitude
 */
export function formatMicroCost(amount: number): string {
  if (amount < 0.0001) {
    // For very small amounts, use scientific notation or fixed decimals
    return `$${amount.toFixed(7)}`
  } else if (amount < 0.01) {
    return `$${amount.toFixed(5)}`
  } else if (amount < 1) {
    return `$${amount.toFixed(4)}`
  } else {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }
}

/**
 * Get the byte length of a message text
 */
export function getMessageBytes(text: string): number {
  return new TextEncoder().encode(text).length
}

// Overhead estimate for input field cost estimation (Goal B)
// This is used when we only have the text being typed, not a full message
export const ENCODING_OVERHEAD_BYTES = 248

/**
 * Estimate payload size for a message being typed (before sending)
 * Uses a fixed overhead estimate since we don't have the full message structure yet
 */
export function estimatePayloadSize(text: string): number {
  return getMessageBytes(text) + ENCODING_OVERHEAD_BYTES
}

/**
 * Calculate actual payload size from a DecodedMessage
 * Uses real field values to compute accurate size
 */
export function getActualMessageSize(message: {
  id: string
  content: unknown
  contentType?: { authorityId: string; typeId: string; versionMajor: number; versionMinor: number }
  conversationId: string
  senderInboxId: string
  sentAtNs: bigint
}): number {
  // Content bytes (only for string content)
  const contentBytes = typeof message.content === 'string'
    ? getMessageBytes(message.content)
    : 0

  // EncodedContent overhead
  let encodedContentOverhead = 0

  // ContentTypeId (nested message)
  if (message.contentType) {
    const contentTypeSize =
      stringFieldSize(message.contentType.authorityId, 1) +
      stringFieldSize(message.contentType.typeId, 2) +
      1 + varintSize(message.contentType.versionMajor) +
      1 + varintSize(message.contentType.versionMinor)
    encodedContentOverhead += 1 + varintSize(contentTypeSize) + contentTypeSize
  }

  // Parameters (encoding: UTF-8 for text)
  const paramsSize = stringFieldSize('encoding', 1) + stringFieldSize('UTF-8', 2)
  encodedContentOverhead += 1 + varintSize(paramsSize) + paramsSize

  // Content field tag + length
  encodedContentOverhead += 1 + varintSize(contentBytes)

  // Message envelope overhead (using actual values)
  const messageEnvelopeOverhead =
    stringFieldSize(message.id, 1) +
    1 + 8 + // sentAtNs
    stringFieldSize(message.conversationId, 3) +
    stringFieldSize(message.senderInboxId, 4) +
    2 // kind + deliveryStatus

  // Encryption overhead (AES-GCM)
  const encryptionOverhead = 28

  return contentBytes + encodedContentOverhead + messageEnvelopeOverhead + encryptionOverhead
}

/**
 * Estimate protobuf varint encoding size
 */
function varintSize(value: number): number {
  if (value < 128) return 1
  if (value < 16384) return 2
  if (value < 2097152) return 3
  if (value < 268435456) return 4
  return 5
}

/**
 * Estimate protobuf string/bytes field size (tag + length + data)
 */
function stringFieldSize(str: string, fieldNumber: number): number {
  const bytes = new TextEncoder().encode(str).length
  const tagSize = varintSize(fieldNumber << 3) // wire type 2 for length-delimited
  const lengthSize = varintSize(bytes)
  return tagSize + lengthSize + bytes
}

/**
 * Measure the actual XMTP encoding overhead.
 * Run this from the browser console to determine the overhead constant.
 *
 * Usage: window.measureEncodingOverhead()
 */
export async function measureEncodingOverhead(): Promise<void> {
  const { encodeText } = await import('@xmtp/browser-sdk')

  console.log('Analyzing XMTP EncodedContent structure...\n')

  // Encode a sample message to inspect the structure
  const sampleText = 'Hello, world!'
  const encoded = await encodeText(sampleText)

  console.log('EncodedContent structure:')
  console.log('  type:', encoded.type)
  console.log('  parameters:', encoded.parameters)
  console.log('  fallback:', encoded.fallback)
  console.log('  compression:', encoded.compression)
  console.log('  content.length:', encoded.content.length)

  // Estimate EncodedContent protobuf size
  // Based on xmtp proto: https://github.com/xmtp/proto
  // message EncodedContent {
  //   ContentTypeId type = 1;
  //   map<string, string> parameters = 2;
  //   optional string fallback = 3;
  //   optional Compression compression = 4;
  //   bytes content = 5;
  // }
  // message ContentTypeId {
  //   string authority_id = 1;
  //   string type_id = 2;
  //   uint32 version_major = 3;
  //   uint32 version_minor = 4;
  // }

  let encodedContentOverhead = 0

  // ContentTypeId overhead (nested message)
  if (encoded.type) {
    const contentTypeSize =
      stringFieldSize(encoded.type.authorityId, 1) + // "xmtp.org"
      stringFieldSize(encoded.type.typeId, 2) + // "text"
      1 + varintSize(encoded.type.versionMajor) + // field 3
      1 + varintSize(encoded.type.versionMinor) // field 4
    // Nested message has tag + length prefix
    encodedContentOverhead += 1 + varintSize(contentTypeSize) + contentTypeSize
  }

  // Parameters map overhead (usually empty for text)
  const paramEntries = Object.entries(encoded.parameters || {})
  for (const [key, value] of paramEntries) {
    // Each map entry is a nested message with key=1, value=2
    const entrySize = stringFieldSize(key, 1) + stringFieldSize(value, 2)
    encodedContentOverhead += 1 + varintSize(entrySize) + entrySize
  }

  // Fallback field (if present)
  if (encoded.fallback) {
    encodedContentOverhead += stringFieldSize(encoded.fallback, 3)
  }

  // Compression field (if present) - usually 1 byte tag + 1 byte value
  if (encoded.compression !== undefined) {
    encodedContentOverhead += 2
  }

  // Content field tag + length (the actual content bytes are NOT overhead)
  encodedContentOverhead += 1 + varintSize(encoded.content.length)

  console.log('\n--- EncodedContent Overhead Estimate ---')
  console.log(`  ContentTypeId + framing: ~${encodedContentOverhead} bytes`)

  // Now estimate Message envelope overhead
  // message Message {
  //   string id = 1;  // UUID ~36 chars
  //   int64 sent_at_ns = 2;  // 8 bytes max
  //   string convo_id = 3;  // ~64 chars hex
  //   string sender_inbox_id = 4;  // ~64 chars hex
  //   EncodedContent content = 5;
  //   GroupMessageKind kind = 6;  // 1 byte
  //   DeliveryStatus delivery_status = 7;  // 1 byte
  // }

  const messageEnvelopeOverhead =
    stringFieldSize('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 1) + // id (~36 chars)
    1 + 8 + // sent_at_ns (tag + fixed64 or varint)
    stringFieldSize('x'.repeat(64), 3) + // convo_id
    stringFieldSize('x'.repeat(64), 4) + // sender_inbox_id
    2 // kind + delivery_status

  console.log(`  Message envelope: ~${messageEnvelopeOverhead} bytes`)

  // Encryption overhead (AES-GCM: 12-byte IV + 16-byte auth tag)
  const encryptionOverhead = 12 + 16
  console.log(`  Encryption (IV + auth tag): ~${encryptionOverhead} bytes`)

  const totalOverhead = encodedContentOverhead + messageEnvelopeOverhead + encryptionOverhead
  console.log(`\n  TOTAL ESTIMATED OVERHEAD: ~${totalOverhead} bytes`)

  // Test with various message sizes
  console.log('\n--- Size Estimates for Various Messages ---')
  console.log('| Text Bytes | + Overhead | Total Est. |')
  console.log('|------------|------------|------------|')

  const testSizes = [0, 1, 10, 50, 100, 500, 1000]
  for (const textBytes of testSizes) {
    const total = textBytes + totalOverhead
    console.log(
      `| ${String(textBytes).padStart(10)} | ${String(totalOverhead).padStart(10)} | ${String(total).padStart(10)} |`
    )
  }

  console.log(`\nRecommended ENCODING_OVERHEAD_BYTES constant: ${totalOverhead}`)
}

// Expose to window for console access
if (typeof window !== 'undefined') {
  ;(window as unknown as { measureEncodingOverhead: typeof measureEncodingOverhead }).measureEncodingOverhead = measureEncodingOverhead
}
