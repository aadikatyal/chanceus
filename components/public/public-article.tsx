import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"
import type { GuideSection } from "@/lib/public-content"

const NAV = [
  { href: "/guides", label: "How play works" },
  { href: "/guides/four-in-a-row", label: "Four in a Row" },
  { href: "/guides/math-blitz", label: "Math Blitz" },
  { href: "/guides/trivia-challenge", label: "Trivia Challenge" },
  { href: "/standings", label: "Standings" },
]

export default function PublicArticle({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string
  title: string
  lede?: string
  children: ReactNode
}) {
  return (
    <div className="chance-competitive-theme min-h-screen bg-[var(--chance-bg)] text-[var(--chance-fg)]">
      <header className="border-b border-[var(--chance-border)]">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="chance-focus-ring flex items-center gap-2 rounded-md">
            <Image src="/chanceus-eagle.png" alt="" width={32} height={32} className="size-8 object-contain" />
            <span className="text-sm font-semibold">ChanceUS</span>
          </Link>
          <Link href="/auth/sign-up" className="chance-hero-cta-primary chance-focus-ring px-3 py-2 text-sm">
            Play
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <nav aria-label="Guides" className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="chance-link-subtle">
              {item.label}
            </Link>
          ))}
        </nav>
        <p className="chance-text-caption mt-8 text-xs uppercase tracking-[0.12em]">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
        {lede ? <p className="mt-4 text-[1.0625rem] leading-relaxed text-[var(--chance-muted-fg)]">{lede}</p> : null}
        <div className="mt-10 space-y-10 text-[0.9375rem] leading-relaxed text-[var(--chance-muted-fg)]">{children}</div>
      </main>
    </div>
  )
}

export function GuideSections({ sections }: { sections: GuideSection[] }) {
  return (
    <>
      {sections.map((section) => (
        <section key={section.heading}>
          <h2 className="text-base font-semibold text-[var(--chance-fg)]">{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="mt-3">
              {paragraph}
            </p>
          ))}
          {section.bullets ? (
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              {section.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </>
  )
}
