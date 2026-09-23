"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Loader2, Settings, Save } from "lucide-react"
import { updatePreferences } from "@/lib/settings-actions"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className="chance-hero-cta-primary chance-focus-ring">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Saving...
        </>
      ) : (
        <>
          <Save className="mr-2 h-4 w-4" />
          Save preferences
        </>
      )}
    </Button>
  )
}

export default function PreferencesSettings() {
  const [state, formAction] = useActionState(updatePreferences, null)

  return (
    <section className="chance-premium-card p-4 sm:p-6">
      <div className="mb-4">
        <h2 className="chance-section-title flex items-center gap-2">
          <Settings className="size-4 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />
          Preferences
        </h2>
        <p className="chance-text-caption">Customize your gaming experience</p>
      </div>
      <form action={formAction} className="space-y-6">
        {state?.error && (
          <div className="rounded-lg border border-[var(--chance-no)]/40 bg-[color-mix(in_srgb,var(--chance-no)_8%,transparent)] px-4 py-3 text-center text-sm text-[var(--chance-no)]">
            {state.error}
          </div>
        )}

        {state?.success && (
          <div className="rounded-lg border border-[var(--chance-yes)]/40 bg-[color-mix(in_srgb,var(--chance-yes)_8%,transparent)] px-4 py-3 text-center text-sm text-[var(--chance-yes)]">
            {state.success}
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--chance-fg)]">Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <label className="text-sm font-medium text-[var(--chance-fg)]">Email notifications</label>
                <p className="chance-text-caption">Match updates and promotions via email</p>
              </div>
              <Switch name="emailNotifications" defaultChecked />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <label className="text-sm font-medium text-[var(--chance-fg)]">Push notifications</label>
                <p className="chance-text-caption">Alerts when opponents make moves</p>
              </div>
              <Switch name="pushNotifications" defaultChecked />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--chance-fg)]">Game settings</h3>
          <div className="flex items-center justify-between gap-4">
            <div>
              <label className="text-sm font-medium text-[var(--chance-fg)]">Sound effects</label>
              <p className="chance-text-caption">Play sounds during gameplay</p>
            </div>
            <Switch name="soundEffects" defaultChecked />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--chance-fg)]">Privacy</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <label className="text-sm font-medium text-[var(--chance-fg)]">Show online status</label>
                <p className="chance-text-caption">Let other players see when you&apos;re online</p>
              </div>
              <Switch name="showOnlineStatus" defaultChecked />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <label className="text-sm font-medium text-[var(--chance-fg)]">Public match history</label>
                <p className="chance-text-caption">Allow others to view your match statistics</p>
              </div>
              <Switch name="publicMatchHistory" defaultChecked />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <SubmitButton />
        </div>
      </form>
    </section>
  )
}
