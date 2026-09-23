import type { Metadata } from "next"
import LegalDocument from "@/components/legal/legal-document"

export const metadata: Metadata = {
  title: "Privacy · ChanceUS",
  description: "How ChanceUS collects, uses, and shares information.",
}

export default function PrivacyPage() {
  return (
    <LegalDocument title="Privacy" updated="September 23, 2026">
      <section>
        <h2>What this covers</h2>
        <p className="mt-2">
          ChanceUS is a skill-game platform. This page explains what we collect when you create an account, play, pay, or message other players, and what we do with it.
        </p>
      </section>
      <section>
        <h2>Information you give us</h2>
        <ul>
          <li>Account details: email, username, display name, and password or a sign-in through Google or Apple.</li>
          <li>Profile details you add, such as an avatar.</li>
          <li>Messages you send in global chat, match chat, or direct messages.</li>
          <li>Payment details needed to buy tokens. Card numbers are handled by our payment processor, not stored by ChanceUS.</li>
        </ul>
      </section>
      <section>
        <h2>Information from play</h2>
        <ul>
          <li>Matches you host, join, or finish, including game, stake, result, and token balance changes.</li>
          <li>Queue, tournament, and live-call participation.</li>
          <li>Friend connections and invites you send.</li>
        </ul>
      </section>
      <section>
        <h2>How we use it</h2>
        <ul>
          <li>To run accounts, matches, wallets, and leaderboards.</li>
          <li>To detect cheating, duplicate accounts, and payment abuse.</li>
          <li>To answer support requests and send account messages you opt into.</li>
        </ul>
      </section>
      <section>
        <h2>Who we share it with</h2>
        <p className="mt-2">
          We do not sell personal information. We share data with providers that host the product: authentication and database (Supabase) and payments (Stripe). We may also disclose information if the law requires it.
        </p>
      </section>
      <section>
        <h2>How long we keep it</h2>
        <p className="mt-2">
          Account and match records stay while your account is open, and for as long as we need them for disputes, fraud checks, and accounting. You can ask us to delete an account that is not tied to an open payment dispute.
        </p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p className="mt-2">
          You can update your profile in Settings. Sign-in with Google or Apple is controlled in that provider’s account as well as here. Browser notifications for invites stay off until you allow them.
        </p>
      </section>
      <section>
        <h2>Contact</h2>
        <p className="mt-2">
          Privacy questions go to <strong>privacy@chanceus.com</strong>.
        </p>
      </section>
    </LegalDocument>
  )
}
