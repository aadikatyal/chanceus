import Link from "next/link"

export default function LandingFooter() {
  return (
    <footer className="chance-landing-footer border-t border-[var(--chance-border)]">
      <div className="mx-auto flex max-w-[90rem] flex-col gap-8 px-4 py-12 sm:px-6 lg:flex-row lg:justify-between lg:px-8">
        <div>
          <p className="text-sm font-semibold">ChanceUS</p>
          <p className="chance-text-caption mt-2 max-w-xs">Skill-based competitive gaming. Your talent, your tokens.</p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-12">
          <div>
            <p className="chance-landing-footer-label">Company</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/auth/sign-up" className="chance-landing-footer-link">
                  Get started
                </Link>
              </li>
              <li>
                <a href="#games" className="chance-landing-footer-link">
                  Games
                </a>
              </li>
              <li>
                <a href="#community" className="chance-landing-footer-link">
                  Community
                </a>
              </li>
              <li>
                <a href="#tournaments" className="chance-landing-footer-link">
                  Tournaments
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="chance-landing-footer-label">Support</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href="https://discord.com" className="chance-landing-footer-link" target="_blank" rel="noreferrer">
                  Discord
                </a>
              </li>
              <li>
                <Link href="/auth/login" className="chance-landing-footer-link">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="chance-landing-footer-label">Legal</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="chance-landing-footer-link">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="chance-landing-footer-link">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-[var(--chance-border)] px-4 py-4 text-center sm:px-6">
        <p className="chance-text-caption text-xs">© {new Date().getFullYear()} ChanceUS</p>
      </div>
    </footer>
  )
}
