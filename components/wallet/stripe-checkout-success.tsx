'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function StripeCheckoutSuccess() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const paymentIntentId = searchParams.get('payment_intent')
  const redirectStatus = searchParams.get('redirect_status')
  const [status, setStatus] = useState<'idle' | 'fulfilling' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (status !== 'idle') return

    if (paymentIntentId && redirectStatus === 'succeeded') {
      setStatus('fulfilling')
      fetch('/api/fulfill-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_intent_id: paymentIntentId }),
      })
        .then(async (res) => {
          const data = await res.json()
          if (!res.ok) throw new Error(data.error ?? 'Failed to add tokens')
          setStatus('done')
          setMessage('Tokens added! Refreshing…')
          window.history.replaceState({}, '', '/wallet')
          window.location.reload()
        })
        .catch((e) => {
          setStatus('error')
          setMessage(e instanceof Error ? e.message : 'Something went wrong')
        })
      return
    }

    if (!sessionId) return

    setStatus('fulfilling')
    fetch('/api/fulfill-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to add tokens')
        setStatus('done')
        setMessage('Tokens added! Refreshing…')
        window.history.replaceState({}, '', '/wallet')
        window.location.reload()
      })
      .catch((e) => {
        setStatus('error')
        setMessage(e instanceof Error ? e.message : 'Something went wrong')
      })
  }, [sessionId, paymentIntentId, redirectStatus, status])

  const hasPending = sessionId || (paymentIntentId && redirectStatus === 'succeeded')
  if (!hasPending) return null
  if (status === 'error') {
    return (
      <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        {message}
      </div>
    )
  }
  if (status === 'fulfilling' || status === 'done') {
    return (
      <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
        {status === 'fulfilling' ? 'Completing your purchase…' : message}
      </div>
    )
  }
  return null
}
