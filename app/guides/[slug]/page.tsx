import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import PublicArticle, { GuideSections } from "@/components/public/public-article"
import { GAME_GUIDES, getGameGuide } from "@/lib/public-content"

type GuidePageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return GAME_GUIDES.map((guide) => ({ slug: guide.slug }))
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { slug } = await params
  const guide = getGameGuide(slug)
  if (!guide) return { title: "Guide · ChanceUS" }
  return {
    title: `${guide.title} rules · ChanceUS`,
    description: guide.description,
  }
}

export default async function GameGuidePage({ params }: GuidePageProps) {
  const { slug } = await params
  const guide = getGameGuide(slug)
  if (!guide) notFound()

  const others = GAME_GUIDES.filter((item) => item.slug !== guide.slug)

  return (
    <PublicArticle eyebrow="Game rules" title={guide.title} lede={guide.description}>
      <GuideSections sections={guide.sections} />
      <section>
        <h2 className="text-base font-semibold text-[var(--chance-fg)]">Also on ChanceUS</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          {others.map((item) => (
            <li key={item.slug}>
              <Link href={`/guides/${item.slug}`} className="text-[var(--chance-brand)] hover:underline">
                {item.title} rules
              </Link>
            </li>
          ))}
          <li>
            <Link href="/guides" className="text-[var(--chance-brand)] hover:underline">
              How matches, tokens, and records work
            </Link>
          </li>
          <li>
            <Link href="/standings" className="text-[var(--chance-brand)] hover:underline">
              Public standings
            </Link>
          </li>
        </ul>
      </section>
    </PublicArticle>
  )
}
