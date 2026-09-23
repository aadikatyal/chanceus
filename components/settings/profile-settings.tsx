"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import ChancePlayerAvatar from "@/components/dashboard/chance-player-avatar"
import { Loader2, User, Save } from "lucide-react"
import { updateProfile } from "@/lib/settings-actions"
import type { User as UserType } from "@/lib/supabase/client"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending}
      className="chance-hero-cta-primary chance-focus-ring"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Saving...
        </>
      ) : (
        <>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </>
      )}
    </Button>
  )
}

interface ProfileSettingsProps {
  user: UserType
}

export default function ProfileSettings({ user }: ProfileSettingsProps) {
  const [state, formAction] = useActionState(updateProfile, null)

  return (
    <section className="chance-premium-card p-4 sm:p-6">
      <div className="mb-4">
        <h2 className="chance-section-title flex items-center gap-2">
          <User className="size-4 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />
          Profile
        </h2>
        <p className="chance-text-caption">Update your profile information</p>
      </div>
      <div>
        <form action={formAction} className="space-y-6">
          {state?.error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-center">
              {state.error}
            </div>
          )}

          {state?.success && (
            <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg text-center">
              {state.success}
            </div>
          )}

          {/* Avatar Section */}
          <div className="flex items-center space-x-6">
            <ChancePlayerAvatar name={user.display_name || user.username} className="size-20 text-xl" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-[var(--chance-fg)] mb-1">Profile picture</h3>
              <p className="chance-text-caption mb-3">Upload a new avatar to personalize your profile</p>
              <div className="flex justify-center">
                <Input
                  id="avatar"
                  name="avatar"
                  type="file"
                  accept="image/*"
                  className="chance-input w-full cursor-pointer file:mr-4 file:rounded-lg file:border-0 file:bg-[var(--chance-brand)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--chance-brand-fg)]"
                />
              </div>
              <p className="chance-text-caption mt-1 text-center">Max file size: 5MB</p>
            </div>
          </div>

          {/* Profile Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="displayName" className="chance-text-label block">
                Display Name
              </label>
              <Input
                id="displayName"
                name="displayName"
                type="text"
                defaultValue={user.display_name || ""}
                required
                className="chance-input h-11"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="username" className="chance-text-label block">
                Username
              </label>
              <Input
                id="username"
                name="username"
                type="text"
                defaultValue={user.username}
                required
                className="chance-input h-11"
              />
              <p className="chance-text-caption">Your unique gaming identity</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="chance-text-label block">
                Email Address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={user.email}
                disabled
                className="chance-input h-11 opacity-70"
              />
              <p className="chance-text-caption">Email cannot be changed from this page</p>
            </div>

            <div className="space-y-2">
              <label className="chance-text-label block">Member since</label>
              <div className="chance-input flex h-11 items-center opacity-80">
                {new Date(user.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </form>
      </div>
    </section>
  )
}
