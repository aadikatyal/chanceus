import type { Metadata } from "next"
import Link from "next/link"
import LegalDocument from "@/components/legal/legal-document"

export const metadata: Metadata = {
  title: "Terms · ChanceUS",
  description: "Terms for playing skill games on ChanceUS.",
}

export default function TermsPage() {
  return (
    <LegalDocument title="Terms" updated="September 23, 2026">
      <section>
        <h2>Agreement</h2>
        <p className="mt-2">
          These terms cover use of ChanceUS, including accounts, matches, tokens, and live calls. Creating an account means you agree to them. If you do not agree, do not use the product.
        </p>
      </section>
      <section>
        <h2>What ChanceUS is</h2>
        <p className="mt-2">
          ChanceUS hosts head-to-head skill games. Outcomes come from play, not a house draw. Tokens are the stake and payout unit inside ChanceUS. They are not cash, securities, or a stored-value balance you can transfer to other people outside the rules of the wallet.
        </p>
      </section>
      <section>
        <h2>Who can play</h2>
        <p className="mt-2">
          You must be at least 18 and able to enter a contract. One person, one account. You are responsible for keeping your sign-in private.
        </p>
      </section>
      <section>
        <h2>Matches and stakes</h2>
        <ul>
          <li>Entering a queue or opening a lobby locks the stake shown before you confirm.</li>
          <li>The winner of a completed match receives the pot for that match. Abandoned or invalid matches can be voided and stakes returned.</li>
          <li>Cheating, automation, collusion, or exploiting a bug to change a result is forbidden. We can void the match and close the account.</li>
        </ul>
      </section>
      <section>
        <h2>Tokens and payments</h2>
        <p className="mt-2">
          Token packs are sold through the wallet. Purchases are processed by Stripe. Tokens you buy stay on your ChanceUS account. We can refuse a purchase that fails fraud checks. Chargebacks on a completed token credit can lead to a locked account until the dispute is resolved.
        </p>
      </section>
      <section>
        <h2>Conduct</h2>
        <p className="mt-2">
          Chat, invites, and live calls are for play. Do not harass other players, share illegal content, or use the service to move money between accounts outside of matches.
        </p>
      </section>
      <section>
        <h2>Suspension</h2>
        <p className="mt-2">
          We can suspend or close an account that breaks these terms, and we can freeze tokens tied to an open investigation. You can stop using ChanceUS at any time.
        </p>
      </section>
      <section>
        <h2>Changes</h2>
        <p className="mt-2">
          We can update these terms. The date at the top of this page changes when we do. Continuing to play after an update means you accept the new terms.
        </p>
      </section>
      <section>
        <h2>Privacy</h2>
        <p className="mt-2">
          How we handle account and match data is described in the <Link href="/privacy" className="text-[var(--chance-brand)] hover:underline">Privacy</Link> page.
        </p>
      </section>
    </LegalDocument>
  )
}
