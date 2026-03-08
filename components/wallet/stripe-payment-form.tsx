'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

type PaymentFormInnerProps = {
  paymentIntentId: string
  packLabel: string
  packPrice?: string
  returnUrl: string
  onSuccess: () => void
  onError: (msg: string) => void
}

function PaymentFormInner({
  paymentIntentId,
  packLabel,
  packPrice,
  returnUrl,
  onSuccess,
  onError,
}: PaymentFormInnerProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setSubmitting(true)
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
          receipt_email: undefined,
          payment_method_data: {},
        },
      })
      if (error) {
        onError(error.message ?? 'Payment failed')
        setSubmitting(false)
        return
      }
      const res = await fetch('/api/fulfill-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_intent_id: paymentIntentId }),
      })
      const data = await res.json()
      if (!res.ok) {
        onError(data.error ?? 'Failed to add tokens')
        setSubmitting(false)
        return
      }
      onSuccess()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {packPrice && (
        <p className="text-sm text-gray-400">
          <span className="text-white font-medium">{packLabel}</span>
          <span className="text-yellow-400 font-semibold"> — {packPrice}</span>
        </p>
      )}
      <PaymentElement
        options={{
          layout: 'tabs',
          defaultCollapsed: false,
          radios: true,
          spacedAccordionItems: false,
        }}
      />
      <Button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className="w-full bg-yellow-500 text-black hover:bg-yellow-400 font-semibold"
      >
        {submitting ? 'Processing…' : 'Pay now'}
      </Button>
    </form>
  )
}

type StripePaymentFormProps = {
  clientSecret: string
  paymentIntentId: string
  packLabel: string
  packPrice?: string
  onSuccess: () => void
  onError: (msg: string) => void
}

export default function StripePaymentForm({
  clientSecret,
  paymentIntentId,
  packLabel,
  packPrice,
  onSuccess,
  onError,
}: StripePaymentFormProps) {
  const returnUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/wallet` : '/wallet'

  if (!stripePromise) {
    return (
      <p className="text-sm text-amber-400">
        Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to .env.local for in-page payment.
      </p>
    )
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'night',
          variables: { colorPrimary: '#eab308', borderRadius: '8px' },
        },
      }}
    >
      <PaymentFormInner
        paymentIntentId={paymentIntentId}
        packLabel={packLabel}
        packPrice={packPrice}
        returnUrl={returnUrl}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  )
}
