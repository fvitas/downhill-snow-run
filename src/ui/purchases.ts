import { Capacitor } from '@capacitor/core'
import { NativePurchases } from '@capgo/native-purchases'
import {
  classifyPurchaseError,
  needsAcknowledging,
  ownedProducts,
  PRODUCT_IDS,
  PRODUCTS,
  readCachedOwned,
  writeCachedOwned,
  type Product,
  type PurchaseOutcome,
} from '../game/entitlements.ts'
import { isFreeLook, wonLook, type Look } from '../game/unlocks.ts'

const native = Capacitor.isNativePlatform()
let owned = readCachedOwned(localStorage)
const prices = new Map<Product, string>()
const listeners = new Set<() => void>()
// Bumped by every completed purchase, so a reconcile that started earlier stands down.
let bought = 0

const settle = (next: Set<Product>): void => {
  owned = next
  writeCachedOwned(localStorage, owned)
  for (const listener of listeners) listener()
}

export const owns = (product: Product): boolean => owned.has(product)

export const ownsLook = (look: Look): boolean => isFreeLook(look) || owns('looks') || wonLook(look)

// The store's localized price, or '' until it answers.
export const priceOf = (product: Product): string => prices.get(product) ?? ''

export const watchPurchases = (listener: () => void): void => {
  listeners.add(listener)
}

// null means the store could not answer, which is "unknown", never "unowned".
const fetchOwned = async (): Promise<Set<Product> | null> => {
  try {
    const { purchases } = await NativePurchases.getPurchases({ onlyCurrentEntitlements: true })
    for (const row of purchases) {
      if (needsAcknowledging(row) && row.purchaseToken) {
        void NativePurchases.acknowledgePurchase({ purchaseToken: row.purchaseToken }).catch(() => undefined)
      }
    }
    return ownedProducts(purchases)
  } catch {
    return null
  }
}

const reconcile = async (): Promise<void> => {
  const seen = bought
  const next = await fetchOwned()
  if (next === null || bought !== seen) return
  settle(next)
}

const loadPrices = async (): Promise<void> => {
  try {
    const { products } = await NativePurchases.getProducts({ productIdentifiers: Object.values(PRODUCT_IDS) })
    for (const product of PRODUCTS) {
      const found = products.find((entry) => entry.identifier === PRODUCT_IDS[product])
      if (found) prices.set(product, found.priceString)
    }
    for (const listener of listeners) listener()
  } catch {
    /* the buttons fall back to their priceless labels */
  }
}

export const initPurchases = (): void => {
  if (!native) return
  void reconcile()
  void loadPrices()
  // iOS delivers Ask to Buy approvals and refunds here. Play has no such event, so coming back to
  // the app asks again.
  void NativePurchases.addListener('transactionUpdated', () => void reconcile())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void reconcile()
  })
}

const grant = (product: Product): PurchaseOutcome => {
  bought += 1
  settle(new Set([...owned, product]))
  return 'bought'
}

export const buy = async (product: Product): Promise<PurchaseOutcome> => {
  // No store in the browser: the dev build hands it over so the flow can be tried.
  if (!native) return import.meta.env.DEV ? grant(product) : 'failed'
  try {
    await NativePurchases.purchaseProduct({ productIdentifier: PRODUCT_IDS[product] })
    return grant(product)
  } catch (error) {
    const outcome = classifyPurchaseError(error)
    // A rejection is not proof of not owning it: Play reports an owned product as a failed purchase,
    // and a StoreKit sheet can go through after the promise has rejected.
    if ((await fetchOwned())?.has(product)) return grant(product)
    return outcome
  }
}
