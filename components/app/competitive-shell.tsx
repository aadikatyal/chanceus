import type { User as UserType } from "@/lib/supabase/client"
import CompetitiveSidebar from "@/components/app/competitive-sidebar"
import CompetitiveTopbar from "@/components/app/competitive-topbar"
import CallInviteListener from "@/components/call/call-invite-listener"

type CompetitiveShellProps = {
  user: UserType
  children: React.ReactNode
  rail?: React.ReactNode
}

/** Three-column competitive client: sidebar · main · utility rail (lg+) */
export default function CompetitiveShell({ user, children, rail }: CompetitiveShellProps) {
  return (
    <div className="chance-competitive-theme chance-shell min-h-screen bg-[var(--chance-bg)] text-[var(--chance-fg)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-[var(--chance-surface)] focus:px-4 focus:py-2 focus:text-sm focus:shadow-[var(--chance-shadow-focus)]"
      >
        Skip to main content
      </a>
      <CompetitiveSidebar />
      <div className="chance-shell-body flex min-w-0 flex-1 flex-col">
        <CompetitiveTopbar user={user} />
        <div className="chance-shell-main-wrap flex min-h-0 flex-1 flex-col lg:flex-row">
          <main id="main-content" className="chance-shell-main min-w-0 flex-1 py-[var(--chance-page-pad-y,1rem)]">
            {children}
          </main>
          {rail ? (
            <aside className="chance-shell-rail flex w-full flex-col gap-6 border-t border-[var(--chance-border)] px-4 py-6 lg:w-[var(--chance-rail-w)] lg:shrink-0 lg:border-l lg:border-t-0 lg:px-5">
              {rail}
            </aside>
          ) : null}
        </div>
      </div>
      <CallInviteListener userId={user.id} />
    </div>
  )
}
