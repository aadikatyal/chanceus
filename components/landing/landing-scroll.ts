import type { MouseEvent } from "react"

export function scrollToLandingSection(hash: string) {
  const id = hash.replace(/^#/, "")
  if (!id) return

  const target = document.getElementById(id)
  if (!target) return

  const header =
    document.querySelector(".chance-landing-mobile-header") ??
    document.querySelector(".chance-landing-header")
  const headerBottom = header ? header.getBoundingClientRect().bottom : 72
  const top = target.getBoundingClientRect().top + window.scrollY - headerBottom - 12

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  window.scrollTo({ top: Math.max(0, top), behavior: reducedMotion ? "auto" : "smooth" })
  window.history.pushState(null, "", `#${id}`)
}

export function onLandingHashClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
  if (!href.startsWith("#")) return
  event.preventDefault()
  scrollToLandingSection(href)
}
