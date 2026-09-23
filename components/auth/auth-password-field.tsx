"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Input } from "@/components/ui/input"

type AuthPasswordFieldProps = {
  id: string
  name: string
  label: string
  autoComplete?: string
  required?: boolean
}

export default function AuthPasswordField({ id, name, label, autoComplete = "current-password", required = true }: AuthPasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="chance-auth-field">
      <label htmlFor={id} className="chance-auth-label">
        {label}
      </label>
      <div className="chance-auth-input-wrap">
        <Input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          placeholder="••••••••"
          required={required}
          autoComplete={autoComplete}
          className="chance-auth-input"
        />
        <button
          type="button"
          className="chance-auth-input-toggle chance-focus-ring"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>
    </div>
  )
}
