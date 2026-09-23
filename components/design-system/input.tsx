import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const chanceInputVariants = cva(
  [
    "flex h-9 w-full min-w-0 rounded-[var(--chance-radius-md)] border bg-[var(--chance-surface)] px-3 py-1",
    "chance-text-body text-[var(--chance-fg)] shadow-[var(--chance-shadow-xs)]",
    "placeholder:text-[var(--chance-muted-fg)]",
    "transition-[border-color,box-shadow]",
    "duration-[var(--chance-duration-fast)] ease-[var(--chance-ease)]",
    "outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
    "file:border-0 file:bg-transparent file:text-sm file:font-medium",
    "focus-visible:border-[var(--chance-border-strong)] focus-visible:shadow-[var(--chance-shadow-focus)]",
  ].join(" "),
  {
    variants: {
      inputSize: {
        sm: "h-8 px-2.5 text-xs",
        default: "h-9 px-3 text-sm",
        lg: "h-10 px-3.5 text-sm",
      },
      state: {
        default: "border-[var(--chance-border)]",
        error:
          "border-[var(--chance-destructive)] focus-visible:shadow-[0_0_0_3px_rgb(220_38_38/0.2)]",
        success:
          "border-[var(--chance-success)] focus-visible:shadow-[var(--chance-shadow-focus-brand)]",
      },
    },
    defaultVariants: {
      inputSize: "default",
      state: "default",
    },
  }
)

function ChanceInput({
  className,
  inputSize,
  state,
  type = "text",
  ...props
}: React.ComponentProps<"input"> & VariantProps<typeof chanceInputVariants>) {
  return (
    <input
      type={type}
      data-slot="chance-input"
      className={cn(chanceInputVariants({ inputSize, state, className }))}
      {...props}
    />
  )
}

function ChanceTextarea({
  className,
  state = "default",
  ...props
}: React.ComponentProps<"textarea"> & Pick<VariantProps<typeof chanceInputVariants>, "state">) {
  return (
    <textarea
      data-slot="chance-textarea"
      className={cn(
        chanceInputVariants({ state }),
        "min-h-[5rem] py-2 resize-y",
        className
      )}
      {...props}
    />
  )
}

function ChanceField({
  className,
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  className?: string
  label?: string
  hint?: string
  error?: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <label htmlFor={htmlFor} className="chance-text-label">
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="chance-text-caption text-[var(--chance-destructive)]">{error}</p>
      ) : hint ? (
        <p className="chance-text-caption">{hint}</p>
      ) : null}
    </div>
  )
}

export { ChanceInput, ChanceTextarea, ChanceField, chanceInputVariants }
