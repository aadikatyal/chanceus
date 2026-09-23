import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const chanceCardVariants = cva(
  [
    "flex flex-col text-[var(--chance-fg)]",
    "transition-[box-shadow,border-color,transform]",
    "duration-[var(--chance-duration-fast)] ease-[var(--chance-ease)]",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "rounded-[var(--chance-radius-lg)] border border-[var(--chance-border)] bg-[var(--chance-surface)] shadow-[var(--chance-shadow-xs)]",
        elevated:
          "rounded-[var(--chance-radius-lg)] border border-[var(--chance-border)] bg-[var(--chance-surface-raised)] shadow-[var(--chance-shadow-md)]",
        inset:
          "rounded-[var(--chance-radius-lg)] border border-[var(--chance-border)] bg-[var(--chance-surface-inset)]",
        outline:
          "rounded-[var(--chance-radius-lg)] border border-[var(--chance-border-strong)] bg-transparent",
        interactive:
          "rounded-[var(--chance-radius-lg)] border border-[var(--chance-border)] bg-[var(--chance-surface)] shadow-[var(--chance-shadow-xs)] hover:border-[var(--chance-border-strong)] hover:shadow-[var(--chance-shadow-sm)] cursor-pointer",
      },
      padding: {
        none: "",
        sm: "p-4 gap-4",
        md: "p-6 gap-5",
        lg: "p-8 gap-6",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "md",
    },
  }
)

function ChanceCard({
  className,
  variant,
  padding,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof chanceCardVariants>) {
  return (
    <div
      data-slot="chance-card"
      className={cn(chanceCardVariants({ variant, padding, className }))}
      {...props}
    />
  )
}

function ChanceCardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chance-card-header"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    />
  )
}

function ChanceCardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chance-card-title"
      className={cn("chance-text-h4 leading-none", className)}
      {...props}
    />
  )
}

function ChanceCardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chance-card-description"
      className={cn("chance-text-body text-[var(--chance-muted-fg)]", className)}
      {...props}
    />
  )
}

function ChanceCardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="chance-card-content" className={cn(className)} {...props} />
}

function ChanceCardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chance-card-footer"
      className={cn("flex items-center gap-3 pt-1", className)}
      {...props}
    />
  )
}

export {
  ChanceCard,
  ChanceCardHeader,
  ChanceCardTitle,
  ChanceCardDescription,
  ChanceCardContent,
  ChanceCardFooter,
  chanceCardVariants,
}
