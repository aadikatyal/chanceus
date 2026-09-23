"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Building } from "lucide-react"
import { toast } from "sonner"
import { createBar } from "@/lib/bar-actions"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@/lib/supabase/client"
import VenuesPageChrome from "@/components/venues/venues-page-chrome"
import VenuesHero from "@/components/venues/venues-hero"

export default function CreateBarPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) return
      supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single()
        .then(({ data }) => data && setUser(data))
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const formData = new FormData(e.currentTarget)
      const bar = await createBar(formData)

      toast.success("Venue created!")
      router.push(`/bars/${bar.id}`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create venue"
      toast.error(message)
      console.error("Error creating bar:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <VenuesPageChrome user={user} host className="mx-auto max-w-2xl space-y-6">
      <button type="button" onClick={() => router.back()} className="chance-hero-cta-ghost chance-focus-ring inline-flex items-center gap-2 px-3 py-2 text-sm">
        <ArrowLeft className="size-4" aria-hidden />
        Back
      </button>
      <VenuesHero
        kicker="Host mode"
        title="Launch a venue"
        subtitle="Set the stage for live competitive nights — online rank meets the room."
      />

      <section className="chance-premium-card p-4 sm:p-6">
        <h2 className="chance-section-title mb-4 flex items-center gap-2 text-base">
          <Building className="size-4" aria-hidden />
          Venue profile
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Venue name *</Label>
            <Input id="name" name="name" required placeholder="The Competitive Room" className="chance-input" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">What happens here?</Label>
            <Textarea id="description" name="description" placeholder="Weekly trivia battles, prizes, and local bragging rights." className="chance-input min-h-[5rem]" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" className="chance-input" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" className="chance-input" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" name="state" className="chance-input" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip_code">ZIP</Label>
              <Input id="zip_code" name="zip_code" className="chance-input" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" className="chance-input" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" className="chance-input" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" name="website" type="url" placeholder="https://" className="chance-input" />
          </div>
          <Button type="submit" disabled={isSubmitting} className="chance-hero-cta-primary chance-focus-ring w-full sm:w-auto">
            {isSubmitting ? "Creating…" : "Open venue"}
          </Button>
        </form>
      </section>
    </VenuesPageChrome>
  )
}
