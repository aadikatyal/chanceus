"use client"

import { useState, useEffect, useRef } from "react"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Send, MessageSquare } from "lucide-react"
import { submitFeedback } from "@/lib/feedback-actions"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending}
      className="chance-hero-cta-primary chance-focus-ring w-full"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Submitting...
        </>
      ) : (
        <>
          <Send className="mr-2 h-4 w-4" />
          Submit Feedback
        </>
      )}
    </Button>
  )
}

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [state, formAction] = useActionState(submitFeedback, null)
  const [feedbackType, setFeedbackType] = useState<"general" | "bug" | "feature" | "improvement">("general")
  const [pageUrl, setPageUrl] = useState("")
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPageUrl(window.location.href)
    }
  }, [])

  useEffect(() => {
    if (state?.success) {
      // Close modal after successful submission
      const timer = setTimeout(() => {
        formRef.current?.reset()
        setFeedbackType("general")
        onClose()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [state?.success, onClose])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      formRef.current?.reset()
      setFeedbackType("general")
      if (typeof window !== "undefined") {
        setPageUrl(window.location.href)
      }
    }
  }, [isOpen])

  // FormData will be automatically passed to the action

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[var(--chance-brand)]" />
            Leave Feedback
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Help us improve ChanceUS! Share your thoughts, report bugs, or suggest features.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="space-y-4">
          {state?.error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
              {state.error}
            </div>
          )}

          {state?.success && (
            <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg text-sm">
              Thank you for your feedback! We appreciate your input.
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="feedbackType" className="block text-sm font-medium text-gray-300">
              Feedback Type
            </label>
            <Select value={feedbackType} onValueChange={(value: any) => setFeedbackType(value)}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="general" className="text-white hover:bg-gray-700">
                  General Feedback
                </SelectItem>
                <SelectItem value="bug" className="text-white hover:bg-gray-700">
                  Report a Bug
                </SelectItem>
                <SelectItem value="feature" className="text-white hover:bg-gray-700">
                  Feature Request
                </SelectItem>
                <SelectItem value="improvement" className="text-white hover:bg-gray-700">
                  Improvement Suggestion
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <input type="hidden" name="feedbackType" value={feedbackType} />
          <input type="hidden" name="pageUrl" value={pageUrl} />
          
          <div className="space-y-2">
            <label htmlFor="content" className="block text-sm font-medium text-gray-300">
              Your Feedback
            </label>
            <Textarea
              id="content"
              name="content"
              placeholder="Tell us what you think..."
              required
              rows={5}
              className="resize-none rounded-lg border-[var(--chance-border)] bg-[var(--chance-surface-inset)] text-[var(--chance-fg)] placeholder:text-[var(--chance-muted-fg)] focus:border-[var(--chance-brand)] focus:ring-[color-mix(in_srgb,var(--chance-brand)_25%,transparent)]"
            />
          </div>

          <SubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  )
}

