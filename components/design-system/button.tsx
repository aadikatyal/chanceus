import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const chanceButtonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium",
    "transition-[background-color,border-color,box-shadow,transform,color]",
    "duration-[var(--chance-duration-fast)] ease-[var(--chance-ease)]",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0",
    "outline-none focus-visible:shadow-[var(--chance-shadow-focus)]",
    "active:scale-[0.98]",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--chance-primary)] text-[var(--chance-primary-fg)] shadow-[var(--chance-shadow-xs)] hover:opacity-90",
        brand:
          "bg-[var(--chance-brand)] text-[var(--chance-brand-fg)] shadow-[var(--chance-shadow-xs)] hover:bg-[var(--chance-brand-hover)] focus-visible:shadow-[var(--chance-shadow-focus-brand)]",
        secondary:
          "bg-[var(--chance-muted)] text-[var(--chance-fg)] border border-[var(--chance-border)] hover:bg-[var(--chance-surface-inset)]",
        outline:
          "border border-[var(--chance-border-strong)] bg-[var(--chance-surface)] text-[var(--chance-fg)] hover:bg-[var(--chance-muted)]",
        ghost: "text-[var(--chance-fg)] hover:bg-[var(--chance-muted)]",
        destructive:
          "bg-[var(--chance-destructive)] text-[var(--chance-destructive-fg)] shadow-[var(--chance-shadow-xs)] hover:opacity-90",
        link: "text-[var(--chance-brand)] underline-offset-4 hover:underline px-0 h-auto active:scale-100",
        yes: "bg-[var(--chance-yes-muted)] text-[var(--chance-yes)] border border-[var(--chance-yes)]/25 hover:bg-[var(--chance-yes)]/15",
        no: "bg-[var(--chance-no-muted)] text-[var(--chance-no)] border border-[var(--chance-no)]/25 hover:bg-[var(--chance-no)]/15",
      },
      size: {
        sm: "h-8 rounded-[var(--chance-radius-md)] px-3 text-xs",
        default: "h-9 rounded-[var(--chance-radius-md)] px-4 text-sm",
        lg: "h-10 rounded-[var(--chance-radius-md)] px-5 text-sm",
        xl: "h-11 rounded-[var(--chance-radius-lg)] px-6 text-base",
        icon: "size-9 rounded-[var(--chance-radius-md)] p-0",
        "icon-sm": "size-8 rounded-[var(--chance-radius-md)] p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

function ChanceButton({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof chanceButtonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      data-slot="chance-button"
      className={cn(chanceButtonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { ChanceButton, chanceButtonVariants }
