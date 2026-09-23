import type { ReactNode } from "react"
import { Input } from "@/components/ui/input"

export function AuthPanel({ children }: { children: ReactNode }) {
  return <div className="chance-auth-panel">{children}</div>
}

export function AuthPanelHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="chance-auth-panel-header">
      <h1 className="chance-auth-panel-title">{title}</h1>
      <p className="chance-auth-panel-desc">{description}</p>
    </header>
  )
}

export function AuthDivider({ label = "Or continue with email" }: { label?: string }) {
  return (
    <div className="chance-auth-divider" role="separator" aria-label={label}>
      <span>{label}</span>
    </div>
  )
}

export function AuthField({
  id,
  name,
  label,
  type = "text",
  placeholder,
  required = true,
  autoComplete,
  hint,
}: {
  id: string
  name: string
  label: string
  type?: string
  placeholder?: string
  required?: boolean
  autoComplete?: string
  hint?: string
}) {
  return (
    <div className="chance-auth-field">
      <label htmlFor={id} className="chance-auth-label">
        {label}
      </label>
      <Input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className="chance-auth-input"
      />
      {hint ? <p className="chance-auth-hint">{hint}</p> : null}
    </div>
  )
}

export function AuthError({ message }: { message: string }) {
  return (
    <div className="chance-auth-alert chance-auth-alert--error" role="alert">
      {message}
    </div>
  )
}

export function AuthSuccess({ message }: { message: string }) {
  return (
    <div className="chance-auth-alert chance-auth-alert--success" role="status">
      {message}
    </div>
  )
}
