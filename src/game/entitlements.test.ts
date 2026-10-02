import { describe, expect, it } from 'vitest'
import { classifyPurchaseError, isPaid, needsAcknowledging, ownedProducts, PRODUCT_IDS } from './entitlements.ts'

describe('isPaid', () => {
  it('takes a StoreKit row, which has no purchase state', () => {
    expect(isPaid({ productIdentifier: PRODUCT_IDS.looks })).toBe(true)
  })

  it('takes only a purchased Play row', () => {
    expect(isPaid({ productIdentifier: PRODUCT_IDS.looks, purchaseState: '1' })).toBe(true)
    expect(isPaid({ productIdentifier: PRODUCT_IDS.looks, purchaseState: '2' })).toBe(false)
  })

  it('drops a refunded purchase', () => {
    expect(isPaid({ productIdentifier: PRODUCT_IDS.looks, revocationDate: '2026-09-01' })).toBe(false)
  })
})

describe('ownedProducts', () => {
  it('maps paid rows to products and ignores the rest', () => {
    const owned = ownedProducts([
      { productIdentifier: PRODUCT_IDS.revive, purchaseState: '1' },
      { productIdentifier: PRODUCT_IDS.looks, purchaseState: '2' },
      { productIdentifier: 'com.other.app.thing' },
    ])
    expect([...owned]).toEqual(['revive'])
  })
})

describe('needsAcknowledging', () => {
  it('flags a paid, unacknowledged Play purchase with a token', () => {
    const row = { productIdentifier: PRODUCT_IDS.looks, purchaseState: '1', isAcknowledged: false, purchaseToken: 't' }
    expect(needsAcknowledging(row)).toBe(true)
    expect(needsAcknowledging({ ...row, isAcknowledged: true })).toBe(false)
    expect(needsAcknowledging({ ...row, purchaseState: '2' })).toBe(false)
    expect(needsAcknowledging({ ...row, purchaseToken: undefined })).toBe(false)
  })

  it('leaves StoreKit rows alone', () => {
    expect(needsAcknowledging({ productIdentifier: PRODUCT_IDS.looks })).toBe(false)
  })
})

describe('classifyPurchaseError', () => {
  it('sorts the plugin messages', () => {
    expect(classifyPurchaseError(new Error('User cancelled the purchase'))).toBe('cancelled')
    expect(classifyPurchaseError({ message: 'Purchase is not purchased' })).toBe('cancelled')
    expect(classifyPurchaseError('Transaction pending')).toBe('pending')
    expect(classifyPurchaseError(new Error('Purchase is pending'))).toBe('pending')
    expect(classifyPurchaseError(new Error('Network unavailable'))).toBe('failed')
    expect(classifyPurchaseError(undefined)).toBe('failed')
  })
})
