import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const chanceBadgeVariants = cva(
  [
    "inline-flex items-center justify-center gap-1 rounded-[var(--chance-radius-sm)]",
    "border px-2 py-0.5 text-xs font-semibold tracking-[0.02em] w-fit whitespace-nowrap shrink-0",
    "[&>svg]:size-3 [&>svg]:pointer-events-none",
    "transition-colors duration-[var(--chance-duration-fast)]",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--chance-primary)] text-[var(--chance-primary-fg)]",
        brand:
          "border-transparent bg-[var(--chance-brand-muted)] text-[var(--chance-brand)]",
        secondary:
          "border-[var(--chance-border)] bg-[var(--chance-muted)] text-[var(--chance-fg)]",
        outline: "border-[var(--chance-border-strong)] bg-transparent text-[var(--chance-fg)]",
        success:
          "border-transparent bg-[var(--chance-success-muted)] text-[var(--chance-success)]",
        warning:
          "border-transparent bg-[var(--chance-warning-muted)] text-[var(--chance-warning)]",
        destructive:
          "border-transparent bg-[var(--chance-no-muted)] text-[var(--chance-destructive)]",
        yes: "border-[var(--chance-yes)]/20 bg-[var(--chance-yes-muted)] text-[var(--chance-yes)]",
        no: "border-[var(--chance-no)]/20 bg-[var(--chance-no-muted)] text-[var(--chance-no)]",
        live: "border-[var(--chance-brand)]/30 bg-[var(--chance-brand-muted)] text-[var(--chance-brand)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function ChanceBadge({
  className,
  variant,
  asChild = false,
  showLiveDot,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof chanceBadgeVariants> & {
    asChild?: boolean
    showLiveDot?: boolean
  }) {
  const Comp = asChild ? Slot : "span"
  return (
    <Comp
      data-slot="chance-badge"
      className={cn(chanceBadgeVariants({ variant }), className)}
      {...props}
    >
      {showLiveDot ? (
        <span
          className="size-1.5 rounded-full bg-current animate-[chance-pulse-dot_1.4s_ease-in-out_infinite]"
          aria-hidden
        />
      ) : null}
      {props.children}
    </Comp>
  )
}

export { ChanceBadge, chanceBadgeVariants }
