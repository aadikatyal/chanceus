'use client';

import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { transferTokens } from '@/lib/transferTokens';

interface TransferTokensFormProps {
  userBalance: number;
}

export default function TransferTokensForm({ userBalance }: TransferTokensFormProps) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const prettyError = (raw: string) => {
    if (/recipient_not_found/i.test(raw)) return 'Recipient not found.';
    if (/insufficient_funds/i.test(raw)) return 'You don’t have enough tokens.';
    if (/cannot_transfer_to_self/i.test(raw)) return 'You cannot transfer tokens to yourself.';
    if (/invalid_amount/i.test(raw)) return 'Amount must be a positive number.';
    if (/unauthorized/i.test(raw)) return 'Please sign in.';
    return raw;
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg(null);

    const fd = new FormData(e.currentTarget);
    const recipient = String(fd.get('recipient') || '').trim();
    const amountNum = Number(fd.get('amount'));

    if (!recipient) {
      setMsg({ type: 'error', text: 'Enter a recipient username.' });
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setMsg({ type: 'error', text: 'Enter a valid amount.' });
      return;
    }

    setLoading(true);
    try {
      const res = await transferTokens(recipient, amountNum);
      setMsg({
        type: 'success',
        text: `Sent ${amountNum.toLocaleString()} tokens to ${recipient}. Your new balance: ${res.sender_balance.toLocaleString()}.`,
      });
      window.location.reload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setMsg({ type: 'error', text: prettyError(message) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chance-premium-card p-4 sm:p-5">
      <form onSubmit={onSubmit} className="space-y-5">
        {msg ? (
          <div
            role="alert"
            className={`rounded-[var(--chance-radius-md)] border px-4 py-3 text-center text-sm ${
              msg.type === 'error'
                ? 'border-[color-mix(in_srgb,var(--chance-no)_40%,var(--chance-border))] bg-[color-mix(in_srgb,var(--chance-no)_8%,var(--chance-surface))] text-[var(--chance-no)]'
                : 'border-[color-mix(in_srgb,var(--chance-yes)_40%,var(--chance-border))] bg-[color-mix(in_srgb,var(--chance-yes)_8%,var(--chance-surface))] text-[var(--chance-yes)]'
            }`}
          >
            {msg.text}
          </div>
        ) : null}

        <div className="space-y-2">
          <label htmlFor="recipient" className="chance-text-label text-[var(--chance-muted-fg)]">
            Recipient username
          </label>
          <input
            id="recipient"
            name="recipient"
            type="text"
            placeholder="username"
            autoCapitalize="none"
            autoCorrect="off"
            required
            className="chance-focus-ring h-11 w-full rounded-[var(--chance-radius-md)] border border-[var(--chance-border)] bg-[var(--chance-surface-inset)] px-3 text-[var(--chance-fg)] placeholder:text-[var(--chance-muted-fg)]"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="amount" className="chance-text-label text-[var(--chance-muted-fg)]">
            Amount
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            min={1}
            max={userBalance}
            placeholder="0"
            required
            className="chance-text-mono chance-focus-ring h-11 w-full rounded-[var(--chance-radius-md)] border border-[var(--chance-border)] bg-[var(--chance-surface-inset)] px-3 tabular-nums text-[var(--chance-fg)] placeholder:text-[var(--chance-muted-fg)]"
          />
          <p className="chance-text-caption">
            Available:{' '}
            <span className="chance-text-mono font-semibold tabular-nums">{userBalance.toLocaleString()}</span>{' '}
            tokens
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="chance-hero-cta-primary chance-focus-ring flex w-full items-center justify-center gap-2 py-3 text-sm disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Sending…
            </>
          ) : (
            <>
              <Send className="size-4 stroke-[1.75]" aria-hidden />
              Send tokens
            </>
          )}
        </button>

        <p className="chance-text-caption text-center">Instant transfer · cannot be reversed · double-check the username</p>
      </form>
    </div>
  );
}
