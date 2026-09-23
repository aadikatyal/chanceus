import type { ReactNode } from "react"
import Link from "next/link"
import Image from "next/image"

type AuthMarketingShellProps = {
  children: ReactNode
}

/** Logged-out auth surfaces — bible tokens, no competitive sidebar. */
export default function AuthMarketingShell({ children }: AuthMarketingShellProps) {
  return (
    <div className="chance-auth-marketing-shell chance-competitive-theme min-h-screen bg-[var(--chance-bg)] text-[var(--chance-fg)]">
      <header className="border-b border-[var(--chance-border)] px-4 py-4 sm:px-6">
        <Link href="/" className="chance-focus-ring inline-flex items-center gap-2">
          <Image src="/chanceus-logo-golden.svg" alt="ChanceUS" width={140} height={36} className="h-8 w-auto" priority />
        </Link>
      </header>
      <div className="flex min-h-[calc(100vh-4.5rem)] items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
