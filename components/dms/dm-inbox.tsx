"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, SquarePen } from "lucide-react"
import ChancePlayerAvatar from "@/components/dashboard/chance-player-avatar"
import { getFriends } from "@/lib/friends-actions"
import type { DmThread } from "@/lib/dm-threads"

function shortTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.max(1, Math.floor(diff / 60000))
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

type Person = { id: string; name: string; handle: string }

export default function DmInbox({
  threads,
  activeId,
  userId,
  children,
}: {
  threads: DmThread[]
  activeId?: string
  userId: string
  children?: React.ReactNode
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [composing, setComposing] = useState(false)
  const [people, setPeople] = useState<Person[]>([])
  const [peopleQuery, setPeopleQuery] = useState("")

  useEffect(() => {
    if (!composing) return
    let cancelled = false
    void getFriends().then(({ data }) => {
      if (cancelled) return
      const mapped =
        (data ?? []).map((row: any) => {
          const other = row.user_id === userId ? row.friend : row.user
          return {
            id: other?.id as string,
            name: (other?.display_name || other?.username || "Player") as string,
            handle: other?.username ? `@${other.username}` : "",
          }
        }).filter((person: Person) => person.id) || []
      setPeople(mapped)
    })
    return () => {
      cancelled = true
    }
  }, [composing, userId])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return threads
    return threads.filter((thread) => `${thread.name} ${thread.handle}`.toLowerCase().includes(q))
  }, [query, threads])

  const peopleVisible = people.filter((person) =>
    `${person.name} ${person.handle}`.toLowerCase().includes(peopleQuery.trim().toLowerCase())
  )

  return (
    <div className={`chance-dm-app ${activeId ? "chance-dm-app--open" : ""}`}>
      <aside className="chance-dm-list" aria-label="Conversations">
        <div className="chance-dm-list-head">
          <h1 className="text-xl font-semibold tracking-tight">Messages</h1>
          <button
            type="button"
            className="chance-focus-ring ml-auto rounded-full p-2 text-[var(--chance-fg)] hover:bg-[var(--chance-muted)]/60"
            aria-label="New conversation"
            onClick={() => setComposing(true)}
          >
            <SquarePen className="size-5 stroke-[1.75]" />
          </button>
        </div>
        <div className="chance-dm-search">
          <Search className="size-4 shrink-0 text-[var(--chance-muted-fg)]" aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Direct Messages"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--chance-muted-fg)]"
            aria-label="Search Direct Messages"
          />
        </div>
        <ul className="chance-dm-threads">
          {visible.length === 0 ? (
            <li className="chance-text-caption px-4 py-8 text-center text-sm">No conversations yet.</li>
          ) : (
            visible.map((thread) => {
              const active = thread.userId === activeId
              return (
                <li key={thread.userId}>
                  <Link
                    href={`/chat/dm/${thread.userId}`}
                    className={`chance-dm-thread-row ${active ? "is-active" : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <ChancePlayerAvatar name={thread.name} className="size-10 text-sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="truncate text-sm font-semibold">{thread.name}</p>
                        {thread.handle ? <p className="chance-text-caption truncate text-sm">{thread.handle}</p> : null}
                        <time className="chance-text-caption ml-auto shrink-0 text-xs">{shortTime(thread.at)}</time>
                      </div>
                      <p className="chance-text-caption truncate text-sm">{thread.preview}</p>
                    </div>
                  </Link>
                </li>
              )
            })
          )}
        </ul>
      </aside>
      <section className="chance-dm-pane">
        {children ?? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <h2 className="text-3xl font-semibold tracking-tight">Select a message</h2>
            <p className="chance-text-caption mt-2 max-w-sm text-sm">
              Choose from your existing conversations, or start a new one.
            </p>
            <button
              type="button"
              className="chance-hero-cta-primary chance-focus-ring mt-6 px-5 py-2.5 text-sm"
              onClick={() => setComposing(true)}
            >
              New message
            </button>
          </div>
        )}
      </section>

      {composing
        ? createPortal(
        <div
          className="chance-dm-compose"
          role="dialog"
          aria-label="New conversation"
          onClick={() => setComposing(false)}
        >
          <div className="chance-dm-compose-card" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--chance-border)] px-4 py-3">
              <h2 className="text-base font-semibold">New message</h2>
              <button type="button" className="chance-text-caption text-sm" onClick={() => setComposing(false)}>
                Close
              </button>
            </div>
            <div className="chance-dm-search m-3">
              <Search className="size-4 shrink-0 text-[var(--chance-muted-fg)]" aria-hidden />
              <input
                value={peopleQuery}
                onChange={(event) => setPeopleQuery(event.target.value)}
                placeholder="Search people"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--chance-muted-fg)]"
                aria-label="Search people"
                autoFocus
              />
            </div>
            <ul className="max-h-80 overflow-y-auto px-2 pb-3">
              {peopleVisible.length === 0 ? (
                <li className="chance-text-caption px-3 py-6 text-center text-sm">No friends match that search.</li>
              ) : (
                peopleVisible.map((person) => (
                  <li key={person.id}>
                    <button
                      type="button"
                      className="chance-dm-thread-row w-full text-left"
                      onClick={() => router.push(`/chat/dm/${person.id}`)}
                    >
                      <ChancePlayerAvatar name={person.name} className="size-9 text-xs" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{person.name}</p>
                        {person.handle ? <p className="chance-text-caption truncate text-xs">{person.handle}</p> : null}
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  )
}
