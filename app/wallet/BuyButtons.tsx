'use client'

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import StripePaymentForm from '@/components/wallet/stripe-payment-form'

type Pack = { amount: 100 | 500 | 1000; label: string; note?: string }

const PACKS: Pack[] = [
  { amount: 100, label: '100', note: '$9.99' },
  { amount: 500, label: '500', note: '$49.99' },
  { amount: 1000, label: '1,000', note: '$99.99' },
]

let globalIsProcessing = false

export default function BuyButtons({ current }: { current: number }) {
  const [loading, setLoading] = useState<100 | 500 | 1000 | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null)

  const onBuy = useCallback(async (amt: 100 | 500 | 1000) => {
    if (globalIsProcessing || loading !== null) return

    globalIsProcessing = true
    setError(null)
    setLoading(amt)
    setClientSecret(null)
    setPaymentIntentId(null)
    setSelectedPack(PACKS.find((p) => p.amount === amt) ?? null)

    try {
      const res = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed')
      if (data.clientSecret && data.paymentIntentId) {
        setClientSecret(data.clientSecret)
        setPaymentIntentId(data.paymentIntentId)
        setModalOpen(true)
      } else {
        throw new Error('No payment details returned')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(null)
      globalIsProcessing = false
    }
  }, [loading])

  const handlePaymentSuccess = useCallback(() => {
    setModalOpen(false)
    setClientSecret(null)
    setPaymentIntentId(null)
    setSelectedPack(null)
    window.location.reload()
  }, [])

  const handlePaymentError = useCallback((msg: string) => {
    setError(msg)
  }, [])

  const handleModalOpenChange = useCallback((open: boolean) => {
    setModalOpen(open)
    if (!open) {
      setClientSecret(null)
      setPaymentIntentId(null)
      setSelectedPack(null)
    }
  }, [])

  return (
    <>
      <div className="chance-premium-card p-4 sm:p-5">
        <p className="chance-text-caption">
          Balance after purchase updates automatically · currently{' '}
          <span className="chance-text-mono font-semibold tabular-nums text-[var(--chance-fg)]">
            {current.toLocaleString()}
          </span>
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PACKS.map((p) => (
            <button
              key={p.amount}
              type="button"
              onClick={() => onBuy(p.amount)}
              disabled={loading !== null || globalIsProcessing}
              aria-busy={loading === p.amount}
              className="chance-wallet-pack chance-focus-ring group text-left disabled:pointer-events-none disabled:opacity-60"
            >
              <span className="chance-text-mono text-2xl font-bold tabular-nums tracking-tight">{p.label}</span>
              <span className="chance-text-caption mt-0.5 block">tokens</span>
              {p.note ? (
                <span className="chance-text-caption mt-2 block text-[var(--chance-muted-fg)]">{p.note}</span>
              ) : null}
              <span className="mt-4 block w-full rounded-[var(--chance-radius-md)] bg-[var(--chance-brand)] py-2 text-center text-sm font-semibold text-[var(--chance-brand-fg)] group-hover:opacity-95">
                {loading === p.amount ? 'Opening…' : 'Buy'}
              </span>
            </button>
          ))}
        </div>

        {error ? (
          <div
            className="mt-4 rounded-[var(--chance-radius-md)] border border-[color-mix(in_srgb,var(--chance-no)_40%,var(--chance-border))] bg-[color-mix(in_srgb,var(--chance-no)_8%,var(--chance-surface))] px-3 py-2 text-sm text-[var(--chance-no)]"
            role="alert"
          >
            {error}
          </div>
        ) : null}
      </div>

      <Dialog open={modalOpen} onOpenChange={handleModalOpenChange}>
        <DialogContent className="border-[var(--chance-border)] bg-[var(--chance-surface-raised)] text-[var(--chance-fg)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Token checkout</DialogTitle>
          </DialogHeader>
          {clientSecret && paymentIntentId && selectedPack && (
            <StripePaymentForm
              clientSecret={clientSecret}
              paymentIntentId={paymentIntentId}
              packLabel={`${selectedPack.label} tokens`}
              packPrice={selectedPack.note}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
