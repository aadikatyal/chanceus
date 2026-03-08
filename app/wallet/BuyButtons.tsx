'use client'

import { useState, useCallback } from 'react'
import { Coins } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import StripePaymentForm from '@/components/wallet/stripe-payment-form'

type Pack = { amount: 100 | 500 | 1000; label: string; note?: string }

const PACKS: Pack[] = [
  { amount: 100, label: '100 tokens', note: '$9.99' },
  { amount: 500, label: '500 tokens', note: '$49.99' },
  { amount: 1000, label: '1,000 tokens', note: '$99.99' },
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
      <div className="rounded-2xl border border-yellow-500/20 bg-gray-900/50 p-4 sm:p-5 shadow-lg shadow-black/20">
        <div className="mb-4 flex items-center gap-2">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-400">
            <Coins className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Add Tokens</h3>
            <p className="text-xs text-gray-400">
              Current balance: <span className="text-white">{current.toLocaleString()}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PACKS.map((p) => (
            <div
              key={p.amount}
              className="group rounded-xl border border-gray-800 bg-gray-900/60 p-4 transition-colors hover:border-yellow-500/30"
            >
              <div className="text-white font-semibold">{p.label}</div>
              {p.note && <div className="mt-1 text-xs text-gray-400">{p.note}</div>}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onBuy(p.amount)
                }}
                disabled={loading !== null || globalIsProcessing}
                aria-busy={loading !== null || globalIsProcessing}
                className="mt-3 w-full rounded-lg bg-yellow-500 px-3 py-2 text-sm font-semibold text-black shadow-md transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-70 disabled:pointer-events-none"
                style={{
                  pointerEvents: loading !== null || globalIsProcessing ? 'none' : 'auto',
                }}
              >
                {loading === p.amount ? 'Opening…' : 'Buy'}
              </button>
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={handleModalOpenChange}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Token checkout</DialogTitle>
          </DialogHeader>
          {clientSecret && paymentIntentId && selectedPack && (
            <StripePaymentForm
              clientSecret={clientSecret}
              paymentIntentId={paymentIntentId}
              packLabel={selectedPack.label}
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
