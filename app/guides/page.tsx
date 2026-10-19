import type { Metadata } from "next"
import Link from "next/link"
import PublicArticle, { GuideSections } from "@/components/public/public-article"
import { GAME_GUIDES, HOW_PLAY_WORKS } from "@/lib/public-content"

export const metadata: Metadata = {
  title: "How play works · ChanceUS",
  description: "How ChanceUS matches, stakes, tokens, scoring, and public standings work.",
}

export default function GuidesPage() {
  return (
    <PublicArticle
      eyebrow="Guides"
      title="How play works"
      lede="ChanceUS is a place to play another person at a skill game and keep the result. This page is the rules of the platform. Each game has its own page for the board, the clock, and the score."
    >
      <GuideSections sections={HOW_PLAY_WORKS} />
      <section>
        <h2 className="text-base font-semibold text-[var(--chance-fg)]">Game rules</h2>
        <ul className="mt-4 space-y-4">
          {GAME_GUIDES.map((guide) => (
            <li key={guide.slug}>
              <Link href={`/guides/${guide.slug}`} className="font-medium text-[var(--chance-fg)] hover:underline">
                {guide.title}
              </Link>
              <p className="mt-1">{guide.description}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6">
          Finished matches are listed on the <Link href="/standings" className="text-[var(--chance-brand)] hover:underline">standings</Link>.
          Accounts, payments, and conduct are in the <Link href="/terms" className="text-[var(--chance-brand)] hover:underline">terms</Link> and{" "}
          <Link href="/privacy" className="text-[var(--chance-brand)] hover:underline">privacy</Link> pages.
        </p>
      </section>
    </PublicArticle>
  )
}
