'use client';

import { supabase } from '@/lib/supabaseClient';

export type TransferResult = {
  sender_balance: number;
  recipient_balance: number;
};

export async function transferTokens(
  recipientUsername: string,
  amount: number
): Promise<TransferResult> {
  const username = recipientUsername.trim();
  if (!username) throw new Error('Recipient username is required.');
  if (!Number.isFinite(amount) || amount <= 0)
    throw new Error('Amount must be a positive number.');

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) throw new Error('You must be signed in.');

  throw new Error("Player transfers are disabled.")
  const { data, error } = await supabase.rpc('transfer_tokens', {
    p_recipient_username: username,
    p_amount: Math.floor(amount),
  });

  if (error) throw new Error(error.message);

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('No result returned from transfer.');

  return {
    sender_balance: row.sender_balance,
    recipient_balance: row.recipient_balance,
  };
}