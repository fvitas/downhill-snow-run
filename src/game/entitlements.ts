export type Product = 'revive' | 'looks'

// Valid on both stores: Play ids allow lowercase, digits, underscores and periods.
export const PRODUCT_IDS: Record<Product, string> = {
  revive: 'com.filipvitas.downhill.secondchance',
  looks: 'com.filipvitas.downhill.looks',
}

export const PRODUCTS = Object.keys(PRODUCT_IDS) as Product[]

const OWNED_KEY = 'ski:owned'

// The fields both stores hand back that the decision turns on.
export type PurchaseRow = {
  productIdentifier: string
  revocationDate?: string
  purchaseState?: string
  isAcknowledged?: boolean
  purchaseToken?: string
}

// Play lists pending purchases too, and only state "1" is paid for. StoreKit leaves the field out.
export const isPaid = (row: PurchaseRow): boolean =>
  !row.revocationDate && (row.purchaseState === undefined || row.purchaseState === '1')

export const ownedProducts = (rows: readonly PurchaseRow[]): Set<Product> =>
  new Set(PRODUCTS.filter((product) => rows.some((row) => row.productIdentifier === PRODUCT_IDS[product] && isPaid(row))))

// Play refunds a purchase nobody acknowledges within three days, and one that went through while the
// app was closed is never acknowledged by the purchase call.
export const needsAcknowledging = (row: PurchaseRow): boolean =>
  row.purchaseState === '1' && row.isAcknowledged === false && Boolean(row.purchaseToken)

export const readCachedOwned = (storage: Storage): Set<Product> => {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(OWNED_KEY) ?? '[]')
    return new Set(PRODUCTS.filter((product) => Array.isArray(parsed) && parsed.includes(product)))
  } catch {
    return new Set()
  }
}

export const writeCachedOwned = (storage: Storage, owned: ReadonlySet<Product>): void => {
  try {
    storage.setItem(OWNED_KEY, JSON.stringify([...owned]))
  } catch {
    /* private mode or quota — the store is asked again next launch */
  }
}

export type PurchaseOutcome = 'bought' | 'cancelled' | 'pending' | 'failed'

// @capgo/native-purchases 8.7.0 rejects with a bare message and no code, so the message is all there
// is to sort on. Play reports a cancel and a real billing error with the same string.
const CANCELLED = ['user cancelled', 'purchase is not purchased']
const PENDING = ['transaction pending', 'purchase is pending']

const messageOf = (error: unknown): string => {
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) return String(error.message)
  return ''
}

export const classifyPurchaseError = (error: unknown): Exclude<PurchaseOutcome, 'bought'> => {
  const message = messageOf(error).toLowerCase()
  if (CANCELLED.some((known) => message.includes(known))) return 'cancelled'
  if (PENDING.some((known) => message.includes(known))) return 'pending'
  return 'failed'
}

export const purchaseNotice = (outcome: PurchaseOutcome): string => {
  if (outcome === 'pending') return 'Waiting for approval'
  if (outcome === 'failed') return 'Store unavailable. No charge made.'
  return ''
}
