"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MessageSquare, X } from "lucide-react"
import FeedbackModal from "./feedback-modal"

export default function FloatingFeedbackButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="chance-focus-ring fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--chance-brand)] text-[var(--chance-brand-fg)] shadow-[var(--chance-shadow-md)] transition-all duration-[var(--chance-duration-fast)] hover:opacity-90"
        size="icon"
      >
        <MessageSquare className="h-6 w-6" />
        <span className="sr-only">Leave feedback</span>
      </Button>

      <FeedbackModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}

