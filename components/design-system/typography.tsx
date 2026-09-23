import * as React from "react"
import { cn } from "@/lib/utils"

type TypographyProps<T extends React.ElementType> = {
  as?: T
  className?: string
  children?: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "className" | "children">

const variantClass = {
  display: "chance-text-display text-[var(--chance-fg)]",
  h1: "chance-text-h1 text-[var(--chance-fg)]",
  h2: "chance-text-h2 text-[var(--chance-fg)]",
  h3: "chance-text-h3 text-[var(--chance-fg)]",
  h4: "chance-text-h4 text-[var(--chance-fg)]",
  bodyLg: "chance-text-body-lg text-[var(--chance-fg)]",
  body: "chance-text-body text-[var(--chance-fg)]",
  caption: "chance-text-caption",
  label: "chance-text-label",
  mono: "chance-text-mono text-[var(--chance-fg)]",
  muted: "chance-text-body text-[var(--chance-muted-fg)]",
} as const

export type ChanceTextVariant = keyof typeof variantClass

export function ChanceText<T extends React.ElementType = "p">({
  as,
  variant = "body",
  className,
  children,
  ...props
}: TypographyProps<T> & { variant?: ChanceTextVariant }) {
  const Comp = as ?? defaultElement[variant]
  return (
    <Comp className={cn(variantClass[variant], className)} {...props}>
      {children}
    </Comp>
  )
}

const defaultElement: Record<ChanceTextVariant, React.ElementType> = {
  display: "h1",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  bodyLg: "p",
  body: "p",
  caption: "p",
  label: "span",
  mono: "span",
  muted: "p",
}

export function ChanceDisplay(props: Omit<TypographyProps<"h1">, "variant">) {
  return <ChanceText as="h1" variant="display" {...props} />
}

export function ChanceHeading({
  level = 2,
  ...props
}: Omit<TypographyProps<"h2">, "variant"> & { level?: 1 | 2 | 3 | 4 }) {
  const variantMap = { 1: "h1", 2: "h2", 3: "h3", 4: "h4" } as const
  const variant = variantMap[level]
  const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4"
  return <ChanceText as={Tag} variant={variant} {...props} />
}
