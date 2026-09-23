import { flushSync } from "react-dom"

/** Applies a theme update with a crossfade when View Transitions are supported. */
export function startThemeTransition(applyTheme: () => void) {
  if (typeof document === "undefined") {
    applyTheme()
    return
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const startViewTransition = document.startViewTransition

  if (reduceMotion || !startViewTransition) {
    applyTheme()
    return
  }

  startViewTransition.call(document, () => {
    flushSync(applyTheme)
  })
}
