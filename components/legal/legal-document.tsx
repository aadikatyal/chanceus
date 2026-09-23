import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"

export default function LegalDocument({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
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
          <Link href="/" className="chance-link-subtle text-sm">
            Back home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="chance-text-caption text-xs uppercase tracking-[0.12em]">Legal</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="chance-text-caption mt-2">Last updated {updated}</p>
        <div className="mt-10 space-y-8 text-[0.9375rem] leading-relaxed text-[var(--chance-muted-fg)] [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-[var(--chance-fg)] [&_strong]:font-medium [&_strong]:text-[var(--chance-fg)] [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
          {children}
        </div>
      </main>
    </div>
  )
}
